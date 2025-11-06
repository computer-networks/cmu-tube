#!/bin/bash
set -e

echo "=== (500kbit→unrestricted, 100ms latency, 1min) profile ==="

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
toxiproxy-cli create --listen 0.0.0.0:9005 --upstream localhost:15441 video || {
    echo "[WARN] Proxy 'video' may already exist, continuing..."
}

# --- (4) Apply initial toxics (500 kbit + 100 ms latency) ---
echo "[SETUP] Applying initial latency and bandwidth toxics (500kbit, 100ms)..."
toxiproxy-cli toxic add --upstream   --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --downstream --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --upstream   --type bandwidth --attribute rate=62 video   # 500 kbit/s ≈ 62 KB/s
toxiproxy-cli toxic add --downstream --type bandwidth --attribute rate=62 video


# --- (5) Show initial configuration ---
echo "[INFO] Active proxies:"
toxiproxy-cli list
echo "[INFO] Initial detailed settings:"
toxiproxy-cli inspect video

# --- (6) Keep low bandwidth for 30 s ---
echo "[PHASE 1] Keeping 500 kbit bandwidth for 30 seconds..."
sleep 30

# --- (7) Remove bandwidth limits to make link unrestricted ---
echo "[PHASE 2] Removing bandwidth limits (unrestricted bandwidth)..."
toxiproxy-cli toxic remove --toxicName bandwidth_upstream video || true
toxiproxy-cli toxic remove --toxicName bandwidth_downstream video || true

echo "[INFO] After removing bandwidth toxics:"
toxiproxy-cli inspect video

# --- (8) Keep unrestricted for another 30 s ---
echo "[INFO] Keeping unrestricted bandwidth for 30 seconds..."
sleep 35

# --- (9) Cleanup ---
echo "[CLEANUP] Removing proxy..."
toxiproxy-cli delete video || true
pkill -9 -f toxiproxy || true
echo "=== (500kbit→unrestricted, 100ms latency, 1min) finished ==="
