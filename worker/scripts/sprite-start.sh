#!/bin/sh
# Sources worker.env (written at deploy time, not committed) and runs the bundled worker.
set -a
. "$(dirname "$0")/worker.env"
set +a
exec node "$(dirname "$0")/index.js"
