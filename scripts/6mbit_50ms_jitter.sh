#!/bin/bash
set -e

echo "=== (6mbit, 50±25ms jitter, 1min) profile ==="

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
toxiproxy-cli create --listen 0.0.0.0:9002 --upstream localhost:15441 video || {
    echo "[WARN] Proxy 'video' may already exist, continuing..."
}

# --- (4) Apply toxics (latency, jitter, bandwidth) ---
echo "[SETUP] Applying latency + jitter + bandwidth toxics..."

# latency + jitter: add random ±25ms jitter around 50ms base delay
toxiproxy-cli toxic add --upstream   --type latency   --attribute latency=50 --attribute jitter=25 video
toxiproxy-cli toxic add --downstream --type latency   --attribute latency=50 --attribute jitter=25 video

# bandwidth: 6 Mbit/s = 750 KB/s
toxiproxy-cli toxic add --upstream   --type bandwidth --attribute rate=750 video
toxiproxy-cli toxic add --downstream --type bandwidth --attribute rate=750 video

# --- (5) Print configuration ---
echo "[INFO] Active proxies:"
toxiproxy-cli list
echo "[INFO] Detailed settings:"
toxiproxy-cli inspect video

# --- (6) Keep conditions active for 60 s ---
echo "[INFO] Keeping conditions active for 60 seconds..."
sleep 65

# --- (7) Cleanup ---
echo "[CLEANUP] Removing proxy..."
toxiproxy-cli delete video || true
pkill -9 -f toxiproxy || true
echo "=== (6mbit, 50±25ms jitter, 1min) finished ==="
