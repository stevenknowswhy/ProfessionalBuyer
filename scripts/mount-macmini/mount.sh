#!/bin/bash
# Keep Tank and Server mounted while the mini answers on Tailscale.
set -u
USER_NAME="stefano"
SHARES=(Tank Server)
HOST="macmini-server.tail0de4d9.ts.net"
HOST_IP="100.123.66.110"
BASE="$HOME/Library/Application Support/mount-macmini"
LOG="$HOME/Library/Logs/mount-macmini.log"
LOCK="$BASE/lock"
STATE="$BASE/state"
MISSES="$BASE/misses"
BACKOFF=120

mkdir -p "$BASE"
touch "$STATE" "$MISSES"

if [[ -f "$LOG" ]] && [[ "$(stat -f %z "$LOG" 2>/dev/null || echo 0)" -gt 262144 ]]; then
  mv "$LOG" "$LOG.1"
fi

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

if ! mkdir "$LOCK" 2>/dev/null; then
  if [[ -f "$LOCK/pid" ]] && kill -0 "$(cat "$LOCK/pid")" 2>/dev/null; then
    exit 0
  fi
  rm -rf "$LOCK"
  mkdir "$LOCK" 2>/dev/null || exit 0
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

set_status() {
  local share="$1" status="$2" prev
  prev=$(awk -v s="$share" '$1 == s { print $2; exit }' "$STATE")
  awk -v s="$share" '$1 != s' "$STATE" > "$STATE.tmp" || true
  printf '%s %s\n' "$share" "$status" >> "$STATE.tmp"
  mv "$STATE.tmp" "$STATE"
  [[ "$prev" == "$status" ]] || log "$share $status"
}

miss_count() { awk -v s="$1" '$1 == s { print $2; exit }' "$MISSES"; }
set_miss() {
  local share="$1" count="$2"
  awk -v s="$share" '$1 != s' "$MISSES" > "$MISSES.tmp" || true
  printf '%s %s\n' "$share" "$count" >> "$MISSES.tmp"
  mv "$MISSES.tmp" "$MISSES"
}

our_mount() {
  mount | grep -F " on /Volumes/$1 " | grep -F "(smbfs" \
    | grep -F -e "@${HOST}/" -e "@${HOST_IP}/" >/dev/null
}

volume_alive() {
  local pid i
  df "/Volumes/$1" >/dev/null 2>&1 &
  pid=$!
  for i in 1 2 3 4 5; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid"
      return $?
    fi
    sleep 1
  done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  return 1
}

release_ours() {
  if our_mount "$1"; then
    diskutil unmount force "/Volumes/$1" >/dev/null 2>&1 || true
  fi
}

mount_share() {
  local share="$1" stamp="$BASE/fail-$share" age
  if [[ -f "$stamp" ]]; then
    age=$(( $(date +%s) - $(stat -f %m "$stamp") ))
    if (( age < BACKOFF )); then
      set_status "$share" "mount-backoff"
      return
    fi
  fi
  if osascript -e "mount volume \"smb://${USER_NAME}@${HOST}/${share}\""; then
    set_miss "$share" 0
    rm -f "$stamp"
    set_status "$share" "mounted"
  else
    touch "$stamp"
    set_status "$share" "mount-failed"
  fi
}

if nc -z -G 2 "$HOST_IP" 445 >/dev/null 2>&1 || nc -z -G 2 "$HOST" 445 >/dev/null 2>&1; then
  for share in "${SHARES[@]}"; do
    if our_mount "$share" && volume_alive "$share"; then
      set_miss "$share" 0
      rm -f "$BASE/fail-$share"
      set_status "$share" "healthy"
      continue
    fi
    if mount | grep -F " on /Volumes/$share " >/dev/null && ! our_mount "$share"; then
      set_status "$share" "name-in-use"
      continue
    fi
    if our_mount "$share"; then
      count=$(miss_count "$share")
      count=$(( ${count:-0} + 1 ))
      set_miss "$share" "$count"
      if (( count < 2 )); then
        set_status "$share" "holding"
        continue
      fi
      release_ours "$share"
    fi
    mount_share "$share"
  done
else
  for share in "${SHARES[@]}"; do
    if ! our_mount "$share"; then
      set_status "$share" "waiting"
      continue
    fi
    count=$(miss_count "$share")
    count=$(( ${count:-0} + 1 ))
    set_miss "$share" "$count"
    if (( count >= 2 )) && ! volume_alive "$share"; then
      release_ours "$share"
      set_status "$share" "released"
    else
      set_status "$share" "holding"
    fi
  done
fi
