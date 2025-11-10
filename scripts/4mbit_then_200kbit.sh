#!/bin/bash
set -e

echo "=== (4mbit-200kbit, 100ms latency, 1min) profile ==="

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
toxiproxy-cli create --listen 0.0.0.0:9009 --upstream localhost:15441 video || {
    echo "[WARN] Proxy 'video' may already exist, continuing..."
}

# --- (4) Apply initial toxics (4 mbit + 100 ms latency) ---
echo "[SETUP] Applying initial latency and bandwidth toxics (500kbit, 100ms)..."
toxiproxy-cli toxic add --upstream   --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --downstream --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --upstream   --type bandwidth --attribute rate=500 video
toxiproxy-cli toxic add --downstream --type bandwidth --attribute rate=500 video

# --- (5) Show initial configuration ---
echo "[INFO] Active proxies:"
toxiproxy-cli list
echo "[INFO] Initial detailed settings:"
toxiproxy-cli inspect video

# --- (6) Keep high bandwidth for 10 s ---
echo "[PHASE 1] Keeping 4mbit bandwidth for 10 seconds..."
sleep 10

# --- (7) Remove bandwidth limits to make link unrestricted ---
echo "[PHASE 2] Add 200kbit bandwidth limits ..."
toxiproxy-cli toxic update --toxicName bandwidth_upstream   --attribute rate=25 video
toxiproxy-cli toxic update --toxicName bandwidth_downstream --attribute rate=25 video
toxiproxy-cli inspect video

# --- (8) Keep unrestricted for another 50 s ---
echo "[INFO] Keeping 200kbit bandwidth for 50 seconds..."
sleep 55

# --- (9) Cleanup ---
echo "[CLEANUP] Removing proxy..."
toxiproxy-cli delete video || true
pkill -9 -f toxiproxy || true
echo "=== (4mbit-200kbit, 100ms latency, 1min) finished ==="
