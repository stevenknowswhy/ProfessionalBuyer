#!/usr/bin/env python3
"""Play unlabeled YouTube clips in a browser and file each one with a button.

Open http://127.0.0.1:8765 on the Mac mini, or http://192.168.4.32:8765 from
another computer on the home network. The process keeps running until you stop it.
"""

from __future__ import annotations

import json
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.environ.get("YOUTUBE_ROOT", "/srv/tank/Media/Plex/YouTube")
PORT = int(os.environ.get("YOUTUBE_SORTER_PORT", "8765"))
CATEGORIES = ["Reactions", "Politics", "International", "Tech", "Science", "Culture", "Other"]
EXTS = {".mp4": "video/mp4", ".mkv": "video/x-matroska", ".webm": "video/webm", ".m4v": "video/mp4", ".mov": "video/quicktime"}
LOG = os.path.join(ROOT, "sort-log.jsonl")

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YouTube sorter</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; font: 16px/1.4 "IBM Plex Sans", sans-serif; background: #14110e; color: #f4ecdf; }
main { max-width: 1100px; margin: 0 auto; padding: 16px; }
video { width: 100%%; max-height: 62vh; background: #000; border-radius: 10px; }
.meta { color: #b3a38d; margin: 10px 0; }
.buttons { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: inherit; border: 0; border-radius: 8px; padding: 14px 16px; background: #e4a15a; color: #24180c; cursor: pointer; }
button.ghost { background: #2c241c; color: #f4ecdf; }
h1 { font-size: 28px; margin: 0 0 8px; }
</style>
</head>
<body>
<main>
  <h1>YouTube sorter</h1>
  <p class="meta" id="progress">Loading…</p>
  <video id="player" controls autoplay></video>
  <p class="meta" id="name"></p>
  <div class="buttons" id="categories"></div>
  <p><button class="ghost" id="skip">Skip for now</button> <button class="ghost" id="undo">Undo last move</button></p>
</main>
<script>
const categories = %s;
const player = document.getElementById("player");
const progress = document.getElementById("progress");
const nameEl = document.getElementById("name");
let queue = [];
let index = 0;

function current() { return queue[index]; }

async function loadQueue() {
  queue = await (await fetch("/api/queue")).json();
  index = 0;
  show();
}

function show() {
  const item = current();
  progress.textContent = item ? (index + 1) + " of " + queue.length + " still in a day folder" : "Every clip is in a category.";
  nameEl.textContent = item ? item.folder + " / " + item.name : "";
  player.src = item ? "/video?path=" + encodeURIComponent(item.path) : "";
  if (item) player.play().catch(() => {});
}

async function fileCurrent(category) {
  const item = current();
  if (!item) return;
  const response = await fetch("/api/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: item.path, category }) });
  if (!response.ok) { alert(await response.text()); return; }
  queue.splice(index, 1);
  if (index >= queue.length) index = 0;
  show();
}

document.getElementById("categories").innerHTML = categories.map((category, number) =>
  "<button data-category='" + category + "'>" + (number + 1) + " " + category + "</button>").join("");
document.getElementById("categories").addEventListener("click", (event) => {
  const category = event.target.dataset.category;
  if (category) fileCurrent(category);
});
document.getElementById("skip").addEventListener("click", () => { if (queue.length) { index = (index + 1) %% queue.length; show(); } });
document.getElementById("undo").addEventListener("click", async () => { await fetch("/api/undo", { method: "POST" }); await loadQueue(); });
document.addEventListener("keydown", (event) => {
  const number = Number(event.key);
  if (number >= 1 && number <= categories.length) fileCurrent(categories[number - 1]);
  if (event.key === "n") document.getElementById("skip").click();
});
loadQueue();
</script>
</body>
</html>
""" % (json.dumps(CATEGORIES),)


def safe_path(rel: str) -> str:
    rel = urllib.parse.unquote(rel).lstrip("/")
    if not rel or ".." in rel.split("/"):
        raise ValueError("bad path")
    full = os.path.realpath(os.path.join(ROOT, rel))
    root = os.path.realpath(ROOT)
    if full != root and not full.startswith(root + os.sep):
        raise ValueError("bad path")
    return full


def queue() -> list[dict]:
    items = []
    root = os.path.realpath(ROOT)
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        top = "" if rel_dir == "." else rel_dir.split(os.sep)[0]
        if top in CATEGORIES:
            dirnames.clear()
            continue
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext not in EXTS:
                continue
            full = os.path.join(dirpath, name)
            items.append({"path": os.path.relpath(full, root), "name": name, "folder": rel_dir if rel_dir != "." else "Loose"})
    items.sort(key=lambda item: item["path"].lower())
    return items


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(fmt % args)

    def _send(self, code: int, body: bytes, content_type: str, extra: dict | None = None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/":
            self._send(200, PAGE.encode(), "text/html; charset=utf-8")
            return
        if parsed.path == "/api/queue":
            self._send(200, json.dumps(queue()).encode(), "application/json")
            return
        if parsed.path == "/video":
            self.serve_video(urllib.parse.parse_qs(parsed.query).get("path", [""])[0])
            return
        self._send(404, b"not found", "text/plain")

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        if self.path == "/api/undo":
            self.undo()
            return
        if self.path != "/api/move":
            self._send(404, b"not found", "text/plain")
            return
        try:
            payload = json.loads(raw.decode() or "{}")
            category = payload["category"]
            if category not in CATEGORIES:
                raise ValueError("unknown category")
            src = safe_path(payload["path"])
            if not os.path.isfile(src):
                raise ValueError("missing file")
            folder = os.path.join(os.path.realpath(ROOT), category)
            os.makedirs(folder, exist_ok=True)
            dest = os.path.join(folder, os.path.basename(src))
            if os.path.exists(dest):
                raise ValueError("destination already exists")
            os.rename(src, dest)
            with open(LOG, "a", encoding="utf-8") as handle:
                handle.write(json.dumps({"src": os.path.relpath(src, ROOT), "dest": os.path.relpath(dest, ROOT)}) + "\n")
        except Exception as exc:
            self._send(400, str(exc).encode(), "text/plain")
            return
        self._send(200, b"ok", "text/plain")

    def undo(self) -> None:
        if not os.path.isfile(LOG):
            self._send(400, b"nothing to undo", "text/plain")
            return
        with open(LOG, encoding="utf-8") as handle:
            lines = handle.readlines()
        if not lines:
            self._send(400, b"nothing to undo", "text/plain")
            return
        last = json.loads(lines[-1])
        src = safe_path(last["dest"])
        dest = safe_path(last["src"])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        os.rename(src, dest)
        with open(LOG, "w", encoding="utf-8") as handle:
            handle.writelines(lines[:-1])
        self._send(200, b"ok", "text/plain")

    def serve_video(self, rel: str) -> None:
        try:
            path = safe_path(rel)
        except ValueError:
            self._send(400, b"bad path", "text/plain")
            return
        if not os.path.isfile(path):
            self._send(404, b"missing", "text/plain")
            return
        ext = os.path.splitext(path)[1].lower()
        content_type = EXTS.get(ext, "application/octet-stream")
        size = os.path.getsize(path)
        start, end = 0, size - 1
        status = 200
        range_header = self.headers.get("Range")
        if range_header and range_header.startswith("bytes="):
            spec = range_header.split("=", 1)[1].split("-", 1)
            if spec[0]:
                start = int(spec[0])
            if len(spec) > 1 and spec[1]:
                end = int(spec[1])
            end = min(end, size - 1)
            status = 206
        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        with open(path, "rb") as handle:
            handle.seek(start)
            remaining = length
            while remaining:
                chunk = handle.read(min(1024 * 256, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)
    for category in CATEGORIES:
        os.makedirs(os.path.join(ROOT, category), exist_ok=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"YouTube sorter at http://192.168.4.32:{PORT} and http://100.123.66.110:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
