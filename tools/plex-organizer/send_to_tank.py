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
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
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
.status {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  margin: 18px 0;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
  white-space: pre-wrap;
}
.status.working::before, .status.err::before {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: var(--brass);
}
.status.working::before { animation: pulse 1s infinite; }
.status.err { color: #8d2b1f; border-color: #e3b2ab; }
.status.err::before { background: #8d2b1f; }
.status.ok { color: var(--good); }
.status.ok::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: var(--good); flex: 0 0 auto; }
@keyframes pulse { 50% { opacity: 0.25; } }
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
  <div class="status working" id="status">Connecting to the server…</div>
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
let activity = null;
function beginActivity(message) {
  if (activity) clearInterval(activity.timer);
  activity = { message, changed: Date.now(), started: Date.now(), timer: null };
  const paint = () => {
    const step = Math.round((Date.now() - activity.changed) / 1000);
    const total = Math.round((Date.now() - activity.started) / 1000);
    statusEl.textContent = activity.message + "\n" + step + "s on this step · " + total + "s total";
    statusEl.className = step >= 8 ? "status err" : "status working";
  };
  paint();
  activity.timer = setInterval(paint, 500);
}
function note(message) {
  if (!activity) beginActivity(message);
  activity.message = message;
  activity.changed = Date.now();
}
function finishActivity(message, ok) {
  if (activity) clearInterval(activity.timer);
  activity = null;
  statusEl.className = ok ? "status ok" : "status err";
  statusEl.textContent = message;
}
send.addEventListener("click", async () => {
  send.disabled = true;
  beginActivity("Sending " + files[0].name);
  const lines = [];
  let failed = false;
  for (const file of files) {
    note("Sending " + file.name);
    const url = "/api/send?library=" + libraryId + "&collection=" + encodeURIComponent(collection || "") + "&filename=" + encodeURIComponent(file.name);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
      const payload = await response.json().catch(() => ({ message: "Send failed" }));
      lines.push((response.ok ? "Sent " : "Failed ") + file.name + " — " + (payload.message || ""));
      if (!response.ok) { failed = true; break; }
    } catch (error) {
      lines.push("Failed " + file.name + " — " + error.message);
      failed = true;
      break;
    }
  }
  finishActivity(lines.join("\n"), !failed);
  if (!failed) files = [];
  renderFiles();
  refreshSend();
});
async function loadLibraries() {
  beginActivity("Connecting to the server");
  try {
    const response = await fetch("/api/libraries");
    if (!response.ok || !response.body) throw new Error("Library request failed");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "progress") note(event.message);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "ready") {
          libraries = event.libraries;
          finishActivity(libraries.length ? "Ready. " + libraries.length + " libraries." : "Plex returned no video libraries.", true);
          renderLibraries();
          renderCollections();
        }
      }
    }
  } catch (error) {
    finishActivity(error.message, false);
  }
}
loadLibraries();
</script>
</body>
</html>
"""


def db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB, timeout=3)
    connection.execute("PRAGMA busy_timeout=3000")
    connection.execute("PRAGMA query_only=ON")
    return connection


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


def run_bounded(func, seconds: float):
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        return pool.submit(func).result(timeout=seconds)
    except FutureTimeout:
        return None
    finally:
        pool.shutdown(wait=False, cancel_futures=True)


def folder_pills(root: str) -> list[str] | None:
    if not os.path.isdir(root):
        return []
    names = run_bounded(lambda: os.listdir(root), 5)
    if names is None:
        return None
    kept = []
    for name in sorted(names):
        if not os.path.isdir(os.path.join(root, name)):
            continue
        if name in SKIP_FOLDERS or DATE_FOLDER.match(name):
            continue
        kept.append(name)
    return kept


def iter_libraries():
    yield {"type": "progress", "message": "Opening the Plex database"}
    try:
        connection = db_connection()
    except Exception as exc:
        yield {"type": "error", "message": "Could not open the Plex database. " + str(exc)}
        return
    try:
        yield {"type": "progress", "message": "Reading the library list"}
        sections = connection.execute(
            "SELECT s.id, s.name, l.root_path FROM library_sections s "
            "JOIN section_locations l ON l.library_section_id = s.id ORDER BY s.name"
        ).fetchall()
        found = []
        for section_id, name, root_path in sections:
            try:
                root = host_path(root_path)
            except ValueError:
                yield {"type": "progress", "message": name + " skipped. Its folder is outside Tank."}
                continue
            yield {"type": "progress", "message": "Checking folders for " + name}
            pills = folder_pills(root)
            names = set()
            if pills is None:
                yield {"type": "progress", "message": "Stuck listing folders for " + name + ". Skipping that list."}
            else:
                names.update(pills)
            yield {"type": "progress", "message": "Reading collections for " + name}
            started = time.time()

            def progress() -> int:
                return 1 if time.time() - started > 8 else 0

            connection.set_progress_handler(progress, 10000)
            try:
                rows = connection.execute(
                    "SELECT DISTINCT t.tag FROM tags t "
                    "JOIN taggings tg ON tg.tag_id = t.id "
                    "JOIN metadata_items m ON m.id = tg.metadata_item_id "
                    "WHERE t.tag_type = 2 AND m.library_section_id = ?",
                    (section_id,),
                ).fetchall()
                names.update(tag for (tag,) in rows)
            except sqlite3.OperationalError as exc:
                yield {"type": "progress", "message": "Collections for " + name + " did not finish. " + str(exc)}
            finally:
                connection.set_progress_handler(None, 0)
            found.append({"id": section_id, "name": name, "path": root, "collections": sorted(names)})
        yield {"type": "ready", "libraries": found}
    except Exception as exc:
        yield {"type": "error", "message": str(exc)}
    finally:
        connection.close()


def libraries() -> list[dict]:
    for event in iter_libraries():
        if event["type"] == "error":
            raise RuntimeError(event["message"])
        if event["type"] == "ready":
            return event["libraries"]
    return []


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
        if self.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if self.path.startswith("/api/libraries"):
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            try:
                for event in iter_libraries():
                    print(event.get("message") or event["type"], flush=True)
                    self.wfile.write((json.dumps(event) + "\n").encode())
                    self.wfile.flush()
            except Exception as exc:
                self.wfile.write((json.dumps({"type": "error", "message": str(exc)}) + "\n").encode())
                self.wfile.flush()
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
