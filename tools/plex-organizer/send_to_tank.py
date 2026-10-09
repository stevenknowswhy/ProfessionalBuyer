#!/usr/bin/env python3
"""Send videos from a browser into the Tank folder for a Plex library and collection.

Open http://192.168.4.32:8780 from the MacBook. Drag in a file, pick the library
pill, pick the collection pill, and press Send.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("SEND_PORT", "8780"))
DB = os.environ.get(
    "SEND_DB",
    "/srv/plex/config/Library/Application Support/Plex Media Server/Plug-in Support/Databases/com.plexapp.plugins.library.db",
)
MEDIA_ROOT = os.environ.get("SEND_MEDIA_ROOT", "/srv/tank/Media")
VIDEOS_ROOT = os.environ.get("SEND_VIDEOS_ROOT", "/srv/tank/Videos")
PREFERENCES = os.environ.get(
    "SEND_PREFERENCES",
    "/srv/plex/config/Library/Application Support/Plex Media Server/Preferences.xml",
)
DATE_FOLDER = re.compile(r"^\d{1,2}-\d{1,2}[a-z]?$")
SKIP_FOLDERS = {"Downloads", "Pt 2", "7a"}

PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Send to Tank</title>
<style>
:root {
  --ink: #1c140c;
  --paper: #f3ead7;
  --brass: #b86a2a;
  --brass-deep: #8a4b16;
  --line: #d9cbb3;
  --good: #2d6a4f;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background:
    radial-gradient(1200px 400px at 10% -10%, #fff8ea, transparent 50%),
    var(--paper);
  color: var(--ink);
  font: 17px/1.4 "Avenir Next", "Segoe UI", sans-serif;
}
main { max-width: 920px; margin: 0 auto; padding: 28px 20px 48px; }
h1 {
  font-family: "Iowan Old Style", Palatino, "Palatino Linotype", serif;
  font-size: 42px;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin: 0 0 6px;
}
.lede { margin: 0 0 22px; color: #5c4d3a; }
.drop {
  border: 2px dashed #b9a88a;
  background: rgba(255,255,255,0.45);
  border-radius: 18px;
  min-height: 160px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 22px;
  transition: border-color 0.15s, background 0.15s;
}
.drop.hot { border-color: var(--brass); background: #fff4e4; }
.drop strong { display: block; font-size: 20px; }
.files { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.file {
  background: white;
  border-radius: 999px;
  padding: 6px 12px;
  border: 1px solid var(--line);
}
h2 { font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #7a6a55; margin: 26px 0 10px; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
button.pill, button.send, button.link {
  font: inherit;
  border-radius: 999px;
  border: 1px solid #c8b59a;
  background: white;
  padding: 10px 16px;
  cursor: pointer;
}
button.pill[aria-pressed="true"] {
  background: var(--brass);
  border-color: var(--brass-deep);
  color: white;
}
button.send {
  margin-top: 28px;
  background: var(--ink);
  color: var(--paper);
  border: 0;
  padding: 14px 28px;
  font-size: 18px;
}
button.send:disabled { opacity: 0.35; cursor: default; }
button.link { margin-left: 8px; }
.status { margin-top: 18px; white-space: pre-wrap; }
.status.ok { color: var(--good); }
.status.err { color: #8d2b1f; }
</style>
</head>
<body>
<main>
  <h1>Send to Tank</h1>
  <p class="lede">Drop a video from this Mac. Pick where it belongs. Send puts it in that Tank folder and asks Plex to file the collection.</p>
  <div class="drop" id="drop">
    <div>
      <strong>Drop videos here</strong>
      or <button class="link" id="browse" type="button">choose files</button>
    </div>
  </div>
  <input id="picker" type="file" multiple hidden>
  <div class="files" id="files"></div>
  <h2>Location</h2>
  <div class="pills" id="libraries"></div>
  <h2>Collection</h2>
  <div class="pills" id="collections"></div>
  <button class="send" id="send" disabled>Send</button>
  <div class="status" id="status"></div>
</main>
<script>
const drop = document.getElementById("drop");
const filesEl = document.getElementById("files");
const librariesEl = document.getElementById("libraries");
const collectionsEl = document.getElementById("collections");
const send = document.getElementById("send");
const statusEl = document.getElementById("status");
let files = [];
let libraries = [];
let libraryId = null;
let collection = null;

function renderFiles() {
  filesEl.innerHTML = "";
  files.forEach((file) => {
    const chip = document.createElement("div");
    chip.className = "file";
    chip.textContent = file.name + " · " + Math.max(1, Math.round(file.size / 1048576)) + " MB";
    filesEl.appendChild(chip);
  });
  refreshSend();
}
function pills(container, items, selected, onPick) {
  container.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.textContent = item.label;
    button.setAttribute("aria-pressed", String(item.value === selected));
    button.addEventListener("click", () => onPick(item.value));
    container.appendChild(button);
  });
}
function selectedLibrary() {
  return libraries.find((item) => item.id === libraryId);
}
function renderLibraries() {
  pills(librariesEl, libraries.map((item) => ({ label: item.name, value: item.id })), libraryId, (id) => {
    libraryId = id;
    collection = null;
    renderLibraries();
    renderCollections();
  });
}
function renderCollections() {
  const library = selectedLibrary();
  const names = library ? library.collections : [];
  const items = names.length ? names.map((name) => ({ label: name, value: name })) : [{ label: "Library folder", value: "" }];
  if (!names.length) collection = "";
  pills(collectionsEl, items, collection, (value) => {
    collection = value;
    renderCollections();
  });
  refreshSend();
}
function refreshSend() {
  const needsCollection = selectedLibrary() && selectedLibrary().collections.length > 0;
  send.disabled = !(files.length && libraryId !== null && (!needsCollection || collection));
}
function addFiles(list) {
  files = files.concat(Array.from(list).filter((file) => file.size || file.name));
  renderFiles();
}
drop.addEventListener("dragover", (event) => { event.preventDefault(); drop.classList.add("hot"); });
drop.addEventListener("dragleave", () => drop.classList.remove("hot"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("hot");
  addFiles(event.dataTransfer.files);
});
document.getElementById("browse").addEventListener("click", () => document.getElementById("picker").click());
document.getElementById("picker").addEventListener("change", (event) => addFiles(event.target.files));
send.addEventListener("click", async () => {
  send.disabled = true;
  statusEl.className = "status";
  const lines = [];
  for (const file of files) {
    statusEl.textContent = "Sending " + file.name + "…";
    const url = "/api/send?library=" + libraryId + "&collection=" + encodeURIComponent(collection || "") + "&filename=" + encodeURIComponent(file.name);
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
    const payload = await response.json().catch(() => ({ message: "Send failed" }));
    lines.push((response.ok ? "Sent " : "Failed ") + file.name + " — " + (payload.message || ""));
    if (!response.ok) break;
  }
  statusEl.textContent = lines.join("\n");
  statusEl.className = "status " + (lines.some((line) => line.startsWith("Failed")) ? "err" : "ok");
  if (!lines.some((line) => line.startsWith("Failed"))) files = [];
  renderFiles();
  refreshSend();
});
async function loadLibraries() {
  libraries = await (await fetch("/api/libraries")).json();
  renderLibraries();
  renderCollections();
}
loadLibraries();
</script>
</body>
</html>
"""


def db_connection() -> sqlite3.Connection:
    uri = Path(DB).resolve().as_uri() + "?mode=ro"
    return sqlite3.connect(uri, uri=True, timeout=8)


def host_path(plex_path: str) -> str:
    if plex_path.startswith("/media/library/"):
        return os.path.join(MEDIA_ROOT, plex_path[len("/media/library/") :])
    if plex_path.startswith("/media/videos/"):
        return os.path.join(VIDEOS_ROOT, plex_path[len("/media/videos/") :])
    if plex_path.startswith("/srv/tank/"):
        return plex_path
    raise ValueError(f"unrecognized library path: {plex_path}")


def to_plex_path(host: str) -> str:
    media_root = os.path.realpath(MEDIA_ROOT)
    videos_root = os.path.realpath(VIDEOS_ROOT)
    real = os.path.realpath(host)
    if real == media_root or real.startswith(media_root + os.sep):
        return "/media/library/" + os.path.relpath(real, media_root)
    if real == videos_root or real.startswith(videos_root + os.sep):
        return "/media/videos/" + os.path.relpath(real, videos_root)
    raise ValueError("file is outside Tank media folders")


def clean_name(filename: str) -> str:
    name = os.path.basename(urllib.parse.unquote(filename)).replace("\x00", "").strip()
    if not name or name in {".", ".."} or "/" in name or "\\" in name:
        raise ValueError("bad filename")
    return name


def folder_pills(root: str) -> list[str]:
    if not os.path.isdir(root):
        return []
    names = []
    for name in sorted(os.listdir(root)):
        if not os.path.isdir(os.path.join(root, name)):
            continue
        if name in SKIP_FOLDERS or DATE_FOLDER.match(name):
            continue
        names.append(name)
    return names


def libraries() -> list[dict]:
    connection = db_connection()
    try:
        sections = connection.execute(
            "SELECT s.id, s.name, l.root_path FROM library_sections s "
            "JOIN section_locations l ON l.library_section_id = s.id ORDER BY s.name"
        ).fetchall()
        collection_rows = connection.execute(
            "SELECT DISTINCT m.library_section_id, t.tag FROM tags t "
            "JOIN taggings tg ON tg.tag_id = t.id "
            "JOIN metadata_items m ON m.id = tg.metadata_item_id "
            "WHERE t.tag_type = 2"
        ).fetchall()
    finally:
        connection.close()
    by_section: dict[int, set[str]] = {}
    for section_id, tag in collection_rows:
        by_section.setdefault(section_id, set()).add(tag)
    found = []
    for section_id, name, root_path in sections:
        try:
            root = host_path(root_path)
        except ValueError:
            continue
        names = set(by_section.get(section_id, set()))
        names.update(folder_pills(root))
        found.append({"id": section_id, "name": name, "path": root, "collections": sorted(names)})
    return found


def destination(library_id: int, collection: str, filename: str) -> tuple[str, dict]:
    chosen = next((item for item in libraries() if item["id"] == library_id), None)
    if chosen is None:
        raise ValueError("unknown library")
    if collection and (collection not in chosen["collections"] or "/" in collection or collection in {".", ".."}):
        raise ValueError("unknown collection")
    folder = chosen["path"] if not collection else os.path.join(chosen["path"], collection)
    root = os.path.realpath(chosen["path"])
    os.makedirs(folder, exist_ok=True)
    target_dir = os.path.realpath(folder)
    if target_dir != root and not target_dir.startswith(root + os.sep):
        raise ValueError("destination escaped the library")
    name = clean_name(filename)
    dest = os.path.join(target_dir, name)
    stem, ext = os.path.splitext(name)
    number = 2
    while os.path.exists(dest):
        dest = os.path.join(target_dir, f"{stem} ({number}){ext}")
        number += 1
    return dest, chosen


def plex_token() -> str:
    if not os.path.isfile(PREFERENCES):
        return ""
    text = Path(PREFERENCES).read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'PlexOnlineToken="([^"]+)"', text)
    return match.group(1) if match else ""


def attach_collection(library_id: int, host_file: str, collection: str) -> bool:
    if not collection:
        return False
    token = plex_token()
    if not token:
        return False
    refresh = f"http://127.0.0.1:32400/library/sections/{library_id}/refresh?X-Plex-Token={urllib.parse.quote(token)}"
    try:
        urllib.request.urlopen(refresh, timeout=8).read()
    except Exception:
        return False
    plex_file = to_plex_path(host_file)
    rating_key = None
    connection = db_connection()
    try:
        for _ in range(12):
            row = connection.execute(
                "SELECT mi.metadata_item_id FROM media_parts mp "
                "JOIN media_items mi ON mi.id = mp.media_item_id WHERE mp.file = ?",
                (plex_file,),
            ).fetchone()
            if row:
                rating_key = row[0]
                break
            import time
            time.sleep(1)
    finally:
        connection.close()
    if rating_key is None:
        return False
    update = (
        f"http://127.0.0.1:32400/library/metadata/{rating_key}"
        f"?collection[0].tag.tag={urllib.parse.quote(collection)}&X-Plex-Token={urllib.parse.quote(token)}"
    )
    request = urllib.request.Request(update, method="PUT")
    urllib.request.urlopen(request, timeout=8).read()
    return True


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(fmt % args)

    def _json(self, code: int, payload) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.startswith("/api/libraries"):
            try:
                self._json(200, libraries())
            except Exception as exc:
                self._json(500, {"message": str(exc)})
            return
        if self.path.split("?", 1)[0] == "/":
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self._json(404, {"message": "not found"})

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/send":
            self._json(404, {"message": "not found"})
            return
        query = urllib.parse.parse_qs(parsed.query)
        try:
            library_id = int(query.get("library", ["0"])[0])
            collection = query.get("collection", [""])[0]
            filename = query.get("filename", [""])[0]
            dest, chosen = destination(library_id, collection, filename)
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                raise ValueError("empty file")
            temporary = dest + ".partial"
            remaining = length
            with open(temporary, "wb") as handle:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    handle.write(chunk)
                    remaining -= len(chunk)
            if remaining:
                os.remove(temporary)
                raise ValueError("upload ended early")
            os.replace(temporary, dest)
            attached = False
            try:
                attached = attach_collection(library_id, dest, collection)
            except Exception:
                attached = False
            message = f"{chosen['name']} / {collection}" if collection else chosen["name"]
            if collection and not attached:
                message += ". Saved in that folder. Scan the library if the collection pill is empty in Plex."
            self._json(200, {"ok": True, "path": dest, "collectionAttached": attached, "message": message})
        except Exception as exc:
            self._json(400, {"message": str(exc)})


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Send to Tank at http://192.168.4.32:{PORT} and http://100.123.66.110:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
