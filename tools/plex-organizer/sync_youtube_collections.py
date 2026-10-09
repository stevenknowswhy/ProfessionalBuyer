#!/usr/bin/env python3
"""Move YouTube files into the Tank folder that matches their Plex collection.

Dry-run is the default. --apply stops Plex, moves each collected file into
Reactions, Politics, International, Tech, Science, Culture, or Other, updates
the path Plex has stored, and starts Plex again.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import subprocess

CATEGORIES = ("Reactions", "Politics", "International", "Tech", "Science", "Culture", "Other")
DB = "/srv/plex/config/Library/Application Support/Plex Media Server/Plug-in Support/Databases/com.plexapp.plugins.library.db"
YOUTUBE_HOST = "/srv/tank/Media/Plex/YouTube"
YOUTUBE_PLEX = "/media/library/Plex/YouTube"

QUERY = """
SELECT mp.id, mp.file, t.tag, t.tag_type
FROM media_parts mp
JOIN media_items mi ON mi.id = mp.media_item_id
JOIN taggings tg ON tg.metadata_item_id = mi.metadata_item_id
JOIN tags t ON t.id = tg.tag_id
WHERE t.tag_type = 2 AND t.tag IN ({placeholders})
"""


def host_path(plex_path: str) -> str:
    if plex_path.startswith("/media/library/"):
        return "/srv/tank/Media/" + plex_path[len("/media/library/") :]
    if plex_path.startswith("/media/videos/"):
        return "/srv/tank/Videos/" + plex_path[len("/media/videos/") :]
    if plex_path.startswith("/srv/tank/"):
        return plex_path
    raise ValueError(f"unrecognized Plex path: {plex_path}")


def plex_path(host: str) -> str:
    prefix = "/srv/tank/Media/"
    if not host.startswith(prefix):
        raise ValueError(f"path is outside the Plex media folder: {host}")
    return "/media/library/" + host[len(prefix) :]


def plan(connection: sqlite3.Connection) -> list[dict]:
    placeholders = ",".join("?" for _ in CATEGORIES)
    rows = connection.execute(QUERY.format(placeholders=placeholders), CATEGORIES).fetchall()
    by_part: dict[int, dict] = {}
    for part_id, stored, tag, tag_type in rows:
        if tag not in CATEGORIES:
            continue
        try:
            current = host_path(stored)
        except ValueError:
            continue
        if not current.startswith(YOUTUBE_HOST + os.sep) and current != YOUTUBE_HOST:
            continue
        item = by_part.setdefault(part_id, {"part_id": part_id, "stored": stored, "host": current, "tags": []})
        item["tags"].append((tag, tag_type))
    moves = []
    for item in by_part.values():
        names = sorted({tag for tag, _tag_type in item["tags"]})
        if len(names) != 1:
            moves.append({**item, "action": "skip", "reason": "in more than one category: " + ", ".join(names)})
            continue
        category = names[0]
        dest_host = os.path.join(YOUTUBE_HOST, category, os.path.basename(item["host"]))
        if os.path.dirname(item["host"]) == os.path.join(YOUTUBE_HOST, category):
            moves.append({**item, "action": "ready", "category": category, "dest": dest_host})
            continue
        moves.append({**item, "action": "move", "category": category, "dest": dest_host, "dest_plex": plex_path(dest_host)})
    return moves


def apply_moves(connection: sqlite3.Connection, moves: list[dict]) -> None:
    for move in moves:
        if move["action"] != "move":
            continue
        os.makedirs(os.path.dirname(move["dest"]), exist_ok=True)
        if os.path.exists(move["dest"]):
            raise SystemExit(f"destination already exists: {move['dest']}")
        if not os.path.isfile(move["host"]):
            raise SystemExit(f"source missing: {move['host']}")
        shutil.move(move["host"], move["dest"])
        connection.execute("UPDATE media_parts SET file = ? WHERE id = ?", (move["dest_plex"], move["part_id"]))
    connection.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--db", default=DB)
    args = parser.parse_args()
    connection = sqlite3.connect(args.db)
    moves = plan(connection)
    counts = {}
    for move in moves:
        counts[move["action"]] = counts.get(move["action"], 0) + 1
        if move["action"] == "move":
            print(f"MOVE {move['category']}: {move['host']} -> {move['dest']}")
        elif move["action"] == "skip":
            print(f"SKIP {move['host']} ({move['reason']})")
        else:
            print(f"READY {move['category']}: {move['host']}")
    print(" ".join(f"{key}={value}" for key, value in sorted(counts.items())) or "no collected YouTube videos yet")
    if not args.apply:
        connection.close()
        return
    subprocess.check_call(["docker", "stop", "plex"])
    try:
        apply_moves(connection, moves)
    finally:
        connection.close()
        subprocess.check_call(["docker", "start", "plex"])
    print("Plex is starting. Scan the YouTube library when it is back.")


if __name__ == "__main__":
    main()
