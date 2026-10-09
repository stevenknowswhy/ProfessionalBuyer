#!/usr/bin/env python3
"""Read-only inventory of video files on the Mac mini.

Writes JSON the Plex Library Organizer can load. It does not move or rename files.
"""

from __future__ import annotations

import argparse
import json
import os
import time

VIDEO_EXT = {
    ".mp4",
    ".mkv",
    ".avi",
    ".m4v",
    ".mov",
    ".webm",
    ".mpg",
    ".mpeg",
    ".wmv",
    ".m2ts",
}
# .ts is both MPEG transport stream and TypeScript. Keep only large files.
TS_MIN_BYTES = 5_000_000
SKIP_DIR_NAMES = {
    ".git",
    ".venv",
    "node_modules",
    "site-packages",
    "__pycache__",
    ".pnpm",
}
SKIP_PATH_PARTS = (
    "/Archives/",
    "/Workspace/",
    "/Codex/",
    "/Inbox/",
)


def library_for(path: str) -> str:
    if "/Media/Plex/Training" in path:
        return "Training"
    if "/Media/Plex/Movies" in path:
        return "Movies"
    if "/Media/Plex/TV Shows" in path:
        return "TV Shows"
    if "/Media/Plex/Home Videos" in path:
        return "Home Videos"
    if "/Media/Plex/Phone Videos" in path:
        return "Phone Videos"
    if "/Media/Plex/Clips" in path:
        return "Clips"
    if path.startswith("/srv/tank/Videos"):
        return "Videos"
    if path.startswith("/srv/tank/Media"):
        return "Media"
    return "Other"


def should_skip_dir(path: str, name: str) -> bool:
    if name in SKIP_DIR_NAMES or name.startswith("."):
        return True
    full = path + "/" + name + "/"
    return any(part in full for part in SKIP_PATH_PARTS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="/srv/tank")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    files = []
    for dirpath, dirnames, filenames in os.walk(args.root):
        dirnames[:] = [name for name in dirnames if not should_skip_dir(dirpath, name)]
        if any(part.strip("/") in dirpath.split("/") for part in ("Archives", "Workspace", "Codex", "Inbox")):
            continue
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            path = os.path.join(dirpath, name)
            try:
                size = os.path.getsize(path)
                mtime = os.path.getmtime(path)
            except OSError:
                continue
            if ext == ".ts":
                if size < TS_MIN_BYTES or "/apps/" in path:
                    continue
            elif ext not in VIDEO_EXT:
                continue
            files.append(
                {
                    "path": path,
                    "folder": dirpath,
                    "name": name,
                    "bytes": size,
                    "ext": ext,
                    "mtime": int(mtime),
                    "library": library_for(path),
                }
            )

    files.sort(key=lambda item: item["path"].lower())
    payload = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "root": args.root,
        "count": len(files),
        "files": files,
    }
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle)
    print(f"wrote {len(files)} videos to {args.out}")


if __name__ == "__main__":
    main()
