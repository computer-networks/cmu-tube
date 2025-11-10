#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="/15441-project3/cmu-tube/http_server/data"
HTTP_ROOT="/15441-project3/cmu-tube/http_server"
ARCHIVE_URL="https://cmu.box.com/shared/static/wkawkp9ilijmokduf3vui2jin6s6o7ta.tar"
ARCHIVE_NAME="video.tar"

# Ensure data exists
if [ ! -d "$DATA_DIR" ] || [ -z "$(ls -A "$DATA_DIR" 2>/dev/null || true)" ]; then
  echo "[startup] ====================================================="
  echo "[startup] Data directory missing or empty — downloading dataset..."
  echo "[startup] Target directory: $HTTP_ROOT"
  echo "[startup] Downloading from: $ARCHIVE_URL"
  echo "[startup] ====================================================="

  mkdir -p "$HTTP_ROOT"
  cd "$HTTP_ROOT"

  # Download with visible progress
  echo "[startup] >>> Running: wget $ARCHIVE_URL -O $ARCHIVE_NAME"
  wget --show-progress "$ARCHIVE_URL" -O "$ARCHIVE_NAME"

  # Extract with visible output
  echo "[startup] >>> Extracting: $ARCHIVE_NAME"
  tar -xvf "$ARCHIVE_NAME"

  echo "[startup] >>> Cleaning up archive"
  rm -f "$ARCHIVE_NAME"

  # Ensure files are under data/
  if [ ! -d "$DATA_DIR" ]; then
    echo "[startup] 'data/' directory not found in archive — organizing files..."
    mkdir -p "$DATA_DIR"
    shopt -s dotglob
    for f in "$HTTP_ROOT"/*; do
      [ "$f" = "$DATA_DIR" ] && continue
      case "$f" in
        */scripts|*/nginx.conf) continue ;;
      esac
      mv "$f" "$DATA_DIR"/ 2>/dev/null || true
    done
    shopt -u dotglob
  fi

  echo "[startup] ====================================================="
  echo "[startup] Dataset successfully prepared at $DATA_DIR"
  echo "[startup] ====================================================="

  # Return to the project root
  echo "[startup] Returning to project root directory..."
  cd /15441-project3
else
  echo "[startup] Data directory already exists and is non-empty. Skipping download."
  cd /15441-project3
fi

if [ ! -d "/15441-project3/cmu-tube/node_modules" ]; then
    echo '[COPY] node_modules not found, copying from /tmp/cmu-tube'
    cp -r /tmp/cmu-tube/node_modules /15441-project3/cmu-tube/
else
    echo '[SKIP] node_modules already exists'
fi

# Start nginx using your mapped config
echo "[startup] Starting nginx with custom config..."
nginx -c /15441-project3/cmu-tube/scripts/nginx.conf

# Brief wait and smoke test
sleep 1
curl -I http://localhost:15441/index.html || echo "[startup] Nginx failed to start or index.html missing"

# Keep interactive shell
echo "[startup] Container is ready. Dropping into interactive shell."
exec /bin/bash
