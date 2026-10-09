#!/bin/bash
# Arrange /srv/tank so Finder shows one folder per Plex library.
# Already sorted files stay in the Plex folders. Unsorted video piles move to To Sort.
set -eu

move_if() {
  src=$1
  dest=$2
  if [ -e "$src" ] && [ ! -e "$dest" ]; then
    mkdir -p "$(dirname "$dest")"
    mv "$src" "$dest"
    echo "MOVED $src -> $dest"
  elif [ -e "$dest" ]; then
    echo "EXISTS $dest"
  else
    echo "MISSING $src"
  fi
}

fstab_path() {
  printf '%s' "$1" | sed 's/ /\\040/g'
}

bind_folder() {
  src=$1
  dest=$2
  mkdir -p "$src" "$dest"
  if mountpoint -q "$dest"; then
    echo "MOUNTED $dest"
  else
    mount --bind "$src" "$dest"
    echo "BIND $src -> $dest"
  fi
  spec="$(fstab_path "$src") $(fstab_path "$dest") none bind 0 0"
  if ! grep -qF "$spec" /etc/fstab; then
    printf '%s\n' "$spec" >> /etc/fstab
  fi
}

plex=/srv/tank/Media/Plex
mkdir -p \
  "$plex/Movies/US" "$plex/Movies/Korean" "$plex/Movies/China" "$plex/Movies/Japan" \
  "$plex/TV Shows/Korean" "$plex/TV Shows/US" "$plex/TV Shows/China" "$plex/TV Shows/Japan" \
  "$plex/Training/ESOP" "$plex/Home Videos" "$plex/Phone Videos" "$plex/Clips" \
  /srv/tank/Documents /srv/tank/Photos /srv/tank/Subtitles /srv/tank/Code

for dir in "$plex/Movies"/*; do
  [ -d "$dir" ] || continue
  base=$(basename "$dir")
  case "$base" in
    US|Korean|China|Japan) continue ;;
  esac
  mv "$dir" "$plex/Movies/US/$base"
  echo "FILED $base -> Movies/US"
done

move_if "$plex/TV Shows/No Tail to Tell" "$plex/TV Shows/Korean/No Tail to Tell"
move_if "$plex/TV Shows/The Boondocks" "$plex/TV Shows/US/The Boondocks"

move_if /srv/tank/Media/TV /srv/tank/To\ Sort/TV
move_if "/srv/tank/Media/Home Videos" "/srv/tank/To Sort/Home Videos"
move_if /srv/tank/Media/Music "/srv/tank/To Sort/Music"
move_if /srv/tank/Videos/Mine "/srv/tank/To Sort/Phone"
move_if /srv/tank/Videos/Downloads "/srv/tank/To Sort/Downloads"
move_if /srv/tank/Videos/ESOP /srv/tank/To\ Sort/ESOP

bind_folder "$plex/Movies" /srv/tank/Movies
bind_folder "$plex/TV Shows" "/srv/tank/TV Shows"
bind_folder "$plex/Training" /srv/tank/Training
bind_folder "$plex/Home Videos" "/srv/tank/Home Videos"
bind_folder "$plex/Phone Videos" "/srv/tank/Phone Videos"
bind_folder "$plex/Clips" /srv/tank/Clips

chown -R 1000:1000 "$plex" /srv/tank/To\ Sort || true

cat > /srv/tank/WHERE.txt << 'EOF'
Open these folders at the top of Tank.

Movies          Films already in Plex. Use US, Korean, China, or Japan.
TV Shows        Series already in Plex. Use Korean, US, China, or Japan.
Training        Lessons. ESOP is inside this folder.
Home Videos     Personal videos you have decided belong in Plex.
Phone Videos    Phone clips you have decided belong in Plex.
Clips           Short clips you have decided belong in Plex.
To Sort         Videos that still need a destination.
Documents       Papers, spreadsheets, and notes.
Photos          Pictures.
Subtitles       Subtitle files that do not have a video yet.
Code            Project backups, including Forhemit.

Drag a file from To Sort into one of the library folders, then scan that library in Plex.
EOF

echo "=== TANK ==="
ls -la /srv/tank
echo "=== MOVIES ==="
find "$plex/Movies" -mindepth 1 -maxdepth 2 -type d | sort
echo "=== TV ==="
find "$plex/TV Shows" -mindepth 1 -maxdepth 2 -type d | sort
echo "=== TO SORT ==="
find "/srv/tank/To Sort" -mindepth 1 -maxdepth 2 -type d | sort
