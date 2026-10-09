#!/usr/bin/env python3
"""Apply an approved Plex organizer move manifest.

Dry-run is the default. Pass --apply to rename files on the same disk.
Moves stay under /srv/tank and are recorded in a rollback log.
"""

from __future__ import annotations

import argparse
import json
import os
import time

ALLOWED_DEST_PREFIXES = (
    "/srv/tank/Media/Plex/",
    "/srv/tank/Movies/",
    "/srv/tank/TV Shows/",
    "/srv/tank/Training/",
    "/srv/tank/Home Videos/",
    "/srv/tank/Phone Videos/",
    "/srv/tank/Clips/",
    "/srv/tank/YouTube/",
    "/srv/tank/To Sort/",
    "/srv/tank/Documents/",
    "/srv/tank/Photos/",
    "/srv/tank/Subtitles/",
    "/srv/tank/Code/",
)
LOG_PATH = "/srv/tank/Media/Plex/organizer-moves.jsonl"


def resolve_under(root: str, path: str) -> str:
    real = os.path.realpath(path)
    root_real = os.path.realpath(root)
    if real != root_real and not real.startswith(root_real + os.sep):
        raise ValueError(f"path escapes {root}: {path}")
    return real


def dest_allowed(path: str) -> bool:
    if ".." in path.split("/"):
        return False
    return any(path.startswith(prefix) for prefix in ALLOWED_DEST_PREFIXES)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest")
    parser.add_argument("--apply", action="store_true", help="perform the moves")
    args = parser.parse_args()

    with open(args.manifest, encoding="utf-8") as handle:
        payload = json.load(handle)
    moves = payload.get("moves", [])
    ok = 0
    for move in moves:
        src = move["src"]
        dest = move["dest"]
        try:
            src_real = resolve_under("/srv/tank", src)
            if not dest_allowed(dest):
                raise ValueError("destination is outside the organizer folders")
            dest_real = os.path.realpath(dest) if os.path.exists(os.path.dirname(dest)) else dest
            if os.path.exists(os.path.dirname(dest)):
                parent = resolve_under("/srv/tank", os.path.dirname(dest))
                dest_real = os.path.join(parent, os.path.basename(dest))
            if not os.path.isfile(src_real):
                raise ValueError("source file is missing")
            if os.path.exists(dest_real):
                raise ValueError("destination already exists")
            if src_real == dest_real:
                raise ValueError("source and destination are the same file")
            print(("MOVE" if args.apply else "PLAN"), src_real, "->", dest_real)
            if args.apply:
                os.makedirs(os.path.dirname(dest_real), exist_ok=True)
                os.rename(src_real, dest_real)
                os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
                with open(LOG_PATH, "a", encoding="utf-8") as log:
                    log.write(
                        json.dumps(
                            {
                                "time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                                "src": src_real,
                                "dest": dest_real,
                            }
                        )
                        + "\n"
                    )
            ok += 1
        except Exception as exc:
            print("SKIP", src, exc)
    print(f"{ok} of {len(moves)} {'moved' if args.apply else 'planned'}")


if __name__ == "__main__":
    main()
