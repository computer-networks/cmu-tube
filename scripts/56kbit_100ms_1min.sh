#!/bin/bash
set -e

echo "=== (56kbit, 100ms, 1min) profile ==="

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
toxiproxy-cli create --listen 0.0.0.0:9006 --upstream localhost:15441 video || {
    echo "[WARN] Proxy 'video' may already exist, continuing..."
}

# --- (4) Apply toxics ---
echo "[SETUP] Applying latency and bandwidth toxics..."
toxiproxy-cli toxic add --upstream   --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --downstream --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --upstream   --type bandwidth --attribute rate=7 video 
toxiproxy-cli toxic add --downstream --type bandwidth --attribute rate=7 video 

# --- (5) Print configuration ---
echo "[INFO] Active proxies:"
toxiproxy-cli list
echo "[INFO] Detailed settings:"
toxiproxy-cli inspect video

# --- (6) Run for 60 s ---
echo "[INFO] Keeping conditions active for 60 seconds..."
# sudo iftop -i lo -nNP -f "port 9003"
sleep 65

# --- (7) Cleanup ---
echo "[CLEANUP] Removing proxy..."
toxiproxy-cli delete video || true
pkill -9 -f toxiproxy || true
echo "=== (56kbit, 100ms, 1min) finished ==="
