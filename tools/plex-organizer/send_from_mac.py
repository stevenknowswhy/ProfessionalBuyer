#!/usr/bin/env python3
"""Run this on the MacBook. Open http://127.0.0.1:8780 and send videos to Tank."""

from __future__ import annotations

import os
import re
import shutil
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8780
TANK = os.environ.get("TANK", "/Volumes/Tank")
DATE_FOLDER = re.compile(r"^\d{1,2}-\d{1,2}[a-z]?$")
LIBRARIES = {
    "YouTube": ["Reactions", "Politics", "International", "Tech", "Science", "Culture", "Other"],
    "Movies": ["US", "Korean", "China", "Japan"],
    "TV Shows": ["Korean", "US", "China", "Japan"],
    "Training": ["ESOP"],
    "Home Videos": [],
}

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Send to Tank</title>
<style>
body { margin: 0; background: #f3ead7; color: #1c140c; font: 18px/1.4 "Avenir Next", sans-serif; }
main { max-width: 820px; margin: 0 auto; padding: 28px 18px 40px; }
h1 { font-family: Palatino, serif; font-size: 40px; margin: 0 0 8px; }
#status { background: white; border: 1px solid #d9cbb3; border-radius: 12px; padding: 12px 14px; margin: 12px 0 18px; }
.drop { border: 2px dashed #b9a88a; border-radius: 16px; min-height: 140px; display: grid; place-items: center; background: rgba(255,255,255,.5); }
.drop.hot { background: #fff4e4; border-color: #b86a2a; }
h2 { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #7a6a55; }
.pills, .files { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: inherit; border-radius: 999px; border: 1px solid #c8b59a; background: white; padding: 10px 16px; cursor: pointer; }
button[aria-pressed="true"] { background: #b86a2a; color: white; border-color: #8a4b16; }
button.send { background: #1c140c; color: #f3ead7; border: 0; margin-top: 22px; }
button.send:disabled { opacity: .35; }
.file { background: white; border-radius: 999px; padding: 6px 12px; }
</style>
</head>
<body>
<main>
  <h1>Send to Tank</h1>
  <div id="status">Ready.</div>
  <div class="drop" id="drop"><div><strong>Drop videos here</strong><br><button type="button" id="browse">or choose files</button></div></div>
  <input id="picker" type="file" multiple hidden>
  <div class="files" id="files"></div>
  <h2>Location</h2>
  <div class="pills" id="libraries"></div>
  <h2>Collection</h2>
  <div class="pills" id="collections"></div>
  <button class="send" id="send" disabled>Send</button>
</main>
<script>
const LIBRARIES = __LIBRARIES__;
let files = [];
let library = null;
let collection = null;
const statusEl = document.getElementById("status");
function paint(items, selected, target, onPick) {
  target.innerHTML = "";
  items.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.setAttribute("aria-pressed", String(name === selected));
    button.onclick = () => onPick(name);
    target.appendChild(button);
  });
}
function refresh() {
  const names = library ? LIBRARIES[library] : [];
  document.getElementById("send").disabled = !(files.length && library && (names.length === 0 || collection));
}
function showLibraries() {
  paint(Object.keys(LIBRARIES), library, document.getElementById("libraries"), (name) => {
    library = name; collection = null; showLibraries(); showCollections();
  });
}
function showCollections() {
  const names = library ? LIBRARIES[library] : [];
  paint(names.length ? names : ["Library folder"], collection || (names.length ? null : "Library folder"), document.getElementById("collections"), (name) => {
    collection = name === "Library folder" ? "" : name; showCollections();
  });
  if (!names.length) collection = "";
  refresh();
}
function addFiles(list) {
  files = files.concat(Array.from(list));
  const box = document.getElementById("files");
  box.innerHTML = "";
  files.forEach((file) => {
    const chip = document.createElement("div");
    chip.className = "file";
    chip.textContent = file.name;
    box.appendChild(chip);
  });
  refresh();
}
const drop = document.getElementById("drop");
drop.ondragover = (event) => { event.preventDefault(); drop.classList.add("hot"); };
drop.ondragleave = () => drop.classList.remove("hot");
drop.ondrop = (event) => { event.preventDefault(); drop.classList.remove("hot"); addFiles(event.dataTransfer.files); };
document.getElementById("browse").onclick = () => document.getElementById("picker").click();
document.getElementById("picker").onchange = (event) => addFiles(event.target.files);
document.getElementById("send").onclick = async () => {
  document.getElementById("send").disabled = true;
  const lines = [];
  for (const file of files) {
    statusEl.textContent = "Copying " + file.name + "…";
    const response = await fetch("/api/send?library=" + encodeURIComponent(library) + "&collection=" + encodeURIComponent(collection || "") + "&filename=" + encodeURIComponent(file.name), {
      method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file
    });
    const payload = await response.json();
    lines.push((response.ok ? "Sent " : "Failed ") + file.name + " — " + payload.message);
    if (!response.ok) break;
  }
  statusEl.textContent = lines.join("\\n");
  if (!lines.some((line) => line.startsWith("Failed"))) files = [];
  addFiles([]);
};
fetch("/api/libraries").then((response) => response.json()).then((fresh) => {
  Object.assign(LIBRARIES, fresh);
  showLibraries(); showCollections();
  statusEl.textContent = "Ready.";
}).catch(() => { statusEl.textContent = "Ready. Using the built-in locations."; });
showLibraries(); showCollections();
</script>
</body>
</html>
"""


def tank_dir(name: str) -> str:
    short = os.path.join(TANK, name)
    nested = os.path.join(TANK, "Media", "Plex", name)
    if os.path.isdir(short):
        return short
    return nested


def collections(library: str) -> list[str]:
    found = set(LIBRARIES.get(library, []))
    folder = tank_dir(library)
    if os.path.isdir(folder):
        for name in os.listdir(folder):
            if os.path.isdir(os.path.join(folder, name)) and name not in {"Downloads", "Pt 2", "7a"} and not DATE_FOLDER.match(name):
                found.add(name)
    return sorted(found)


def destination(library: str, collection: str, filename: str) -> str:
    if library not in LIBRARIES:
        raise ValueError("unknown library")
    if collection and (collection not in collections(library) or "/" in collection):
        raise ValueError("unknown collection")
    name = os.path.basename(urllib.parse.unquote(filename))
    if not name or name in {".", ".."}:
        raise ValueError("bad filename")
    folder = tank_dir(library) if not collection else os.path.join(tank_dir(library), collection)
    os.makedirs(folder, exist_ok=True)
    dest = os.path.join(folder, name)
    stem, ext = os.path.splitext(name)
    number = 2
    while os.path.exists(dest):
        dest = os.path.join(folder, f"{stem} ({number}){ext}")
        number += 1
    return dest


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(fmt % args)

    def _json(self, code: int, payload: dict) -> None:
        body = __import__("json").dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if self.path.startswith("/api/libraries"):
            self._json(200, {name: collections(name) for name in LIBRARIES})
            return
        if self.path.split("?", 1)[0] == "/":
            body = PAGE.replace("__LIBRARIES__", __import__("json").dumps(LIBRARIES)).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
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
        if not os.path.isdir(TANK):
            self._json(400, {"message": "Tank is not mounted. Open Finder and connect Tank, then try again."})
            return
        query = urllib.parse.parse_qs(parsed.query)
        try:
            dest = destination(query.get("library", [""])[0], query.get("collection", [""])[0], query.get("filename", [""])[0])
            remaining = int(self.headers.get("Content-Length", "0"))
            temporary = dest + ".partial"
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
            self._json(200, {"message": dest})
        except Exception as exc:
            self._json(400, {"message": str(exc)})


if __name__ == "__main__":
    print(f"Open http://127.0.0.1:{PORT}")
    if not os.path.isdir(TANK):
        print(f"Tank is not mounted at {TANK}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
