#!/usr/bin/env python3
"""Move browser YouTube downloads into /srv/tank/YouTube, grouped by their old folder.

Only files whose names start with "videoplayback" are moved. Named movies and
shows stay where they are. A title stored inside the file is used when one exists.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess

ROOT = "/srv/tank/Media/Plex/YouTube"
LINK = "/srv/tank/YouTube"
SOURCES = (
    "/srv/tank/Media/TV",
    "/srv/tank/To Sort/TV",
    "/srv/tank/Videos/Downloads",
    "/srv/tank/To Sort/Downloads",
    "/srv/tank/Media/Plex/Clips",
    "/srv/tank/Clips",
)
VIDEO_EXT = {".mp4", ".mkv", ".webm", ".m4v", ".mov"}


def fstab_path(path: str) -> str:
    return path.replace(" ", "\\040")


def bind_mount() -> None:
    os.makedirs(ROOT, exist_ok=True)
    os.makedirs(LINK, exist_ok=True)
    if not os.path.ismount(LINK):
        subprocess.check_call(["mount", "--bind", ROOT, LINK])
        print(f"BIND {ROOT} -> {LINK}")
    else:
        print(f"MOUNTED {LINK}")
    spec = f"{fstab_path(ROOT)} {fstab_path(LINK)} none bind 0 0"
    with open("/etc/fstab", encoding="utf-8") as handle:
        current = handle.read()
    if spec not in current:
        with open("/etc/fstab", "a", encoding="utf-8") as handle:
            handle.write(spec + "\n")


def group_for(path: str) -> str:
    parent = os.path.dirname(path)
    base = os.path.basename(parent)
    grand = os.path.basename(os.path.dirname(parent))
    if base in {"Pt 2", "7a"}:
        return os.path.join(grand, base)
    return base or "Loose"


def embedded_title(path: str) -> str:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format_tags=title",
                "-of",
                "default=nw=1:nk=1",
                path,
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    title = result.stdout.strip()
    if not title or title.lower().startswith("videoplayback"):
        return ""
    title = re.sub(r'[\\/:*?"<>|]+', " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title[:120]


def destination(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    title = embedded_title(path)
    name = f"{title}{ext}" if title else os.path.basename(path)
    folder = os.path.join(ROOT, group_for(path))
    candidate = os.path.join(folder, name)
    if os.path.exists(candidate):
        candidate = os.path.join(folder, os.path.basename(path))
    return candidate


def videos():
    for source in SOURCES:
        if not os.path.isdir(source):
            continue
        for dirpath, dirnames, filenames in os.walk(source):
            if os.path.commonpath([dirpath, ROOT]) == ROOT:
                continue
            for name in filenames:
                ext = os.path.splitext(name)[1].lower()
                if ext not in VIDEO_EXT:
                    continue
                if not name.lower().startswith("videoplayback"):
                    continue
                yield os.path.join(dirpath, name)


def main() -> None:
    bind_mount()
    moved = 0
    for src in videos():
        dest = destination(src)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.exists(dest):
            print("EXISTS", dest)
            continue
        shutil.move(src, dest)
        print("MOVED", dest)
        moved += 1
    subprocess.call(["chown", "-R", "1000:1000", ROOT])
    print(f"{moved} YouTube videos filed under {LINK}")
    for dirpath, dirnames, filenames in os.walk(ROOT):
        clips = [name for name in filenames if os.path.splitext(name)[1].lower() in VIDEO_EXT]
        if clips:
            print(f"{len(clips):4d}  {dirpath}")


if __name__ == "__main__":
    main()
