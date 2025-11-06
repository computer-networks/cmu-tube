#!/bin/bash
set -e

echo "=== (unrestricted) profile ==="

# --- (1) Kill existing toxiproxy-server processes ---
echo "[CLEANUP] Killing any existing toxiproxy-server processes..."
if pgrep -f toxiproxy >/dev/null 2>&1; then
    pkill -9 -f toxiproxy || true
    echo "[CLEANUP] Old toxiproxy-server processes killed."
else
    echo "[CLEANUP] No running toxiproxy-server found."
fi

# --- (2) Start toxiproxy-server in background ---
echo "[START] Launching toxiproxy-server..."
toxiproxy-server > toxiproxy.log 2>&1 &
sleep 3  # give time to start

# --- (3) Create proxy ---
echo "[SETUP] Creating proxy: video → localhost:15441"
toxiproxy-cli create --listen 0.0.0.0:9001 --upstream localhost:15441 video || {
    echo "[WARN] Proxy 'video' may already exist, continuing..."
}

# --- (4) Keep mapping for another 60 s ---
echo "[INFO] Keeping unrestricted bandwidth for 60 seconds..."
sleep 65

# --- (5) Cleanup ---
echo "[CLEANUP] Removing proxy..."
toxiproxy-cli delete video || true
pkill -9 -f toxiproxy || true
echo "=== (unrestricted) finished ==="
