#!/bin/bash
set -e

echo "=== (5Mbps ↔ 1Mbps alternating every 10s, 100ms latency, 60s total) profile ==="

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
toxiproxy-cli create --listen 0.0.0.0:9008 --upstream localhost:15441 video || {
    echo "[WARN] Proxy 'video' may already exist, continuing..."
}

# --- (4) Apply initial toxics (1 Mbps + 100 ms latency) ---
echo "[SETUP] Applying initial latency and bandwidth toxics (1Mbps, 100ms)..."
toxiproxy-cli toxic add --upstream   --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --downstream --type latency   --attribute latency=100 video
toxiproxy-cli toxic add --upstream   --type bandwidth --attribute rate=625 video   # 5 Mbps ≈ 625 KB/s
toxiproxy-cli toxic add --downstream --type bandwidth --attribute rate=625 video  # 5 Mbps ≈ 625 KB/s

# --- (5) Show initial configuration ---
echo "[INFO] Initial settings:"
toxiproxy-cli inspect video

# --- (6) Alternating bandwidth pattern every 10s ---
for i in {1..6}; do
    if (( i % 2 == 0 )); then
        echo "[${i}] Setting bandwidth = 1 Mbps (125 KB/s)"
        toxiproxy-cli toxic update --toxicName bandwidth_upstream   --attribute rate=125 video
        toxiproxy-cli toxic update --toxicName bandwidth_downstream --attribute rate=125 video
    else
        echo "[${i}] Setting bandwidth = 5 Mbps (625 KB/s)"
        toxiproxy-cli toxic update --toxicName bandwidth_upstream   --attribute rate=625 video
        toxiproxy-cli toxic update --toxicName bandwidth_downstream --attribute rate=625 video
    fi

    toxiproxy-cli inspect video | grep "bandwidth"
    sleep 10
done

sleep 5

# --- (7) Cleanup ---
echo "[CLEANUP] Removing proxy..."
toxiproxy-cli delete video || true
pkill -9 -f toxiproxy || true
echo "=== (5Mbps ↔ 1Mbps alternating every 10s, 100ms latency, 60s total) finished ==="
