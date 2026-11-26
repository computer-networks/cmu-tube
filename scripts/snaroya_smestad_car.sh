#!/bin/bash
set -e

CSV_FILE="${1:-./traces/snaroya_smestad_car.csv}"   # default input CSV
PROXY_NAME="video"

if [ ! -f "$CSV_FILE" ]; then
    echo "[ERROR] CSV file '$CSV_FILE' not found!"
    exit 1
fi

echo "=== (CSV-driven bandwidth profile) ==="

# --- (1) Cleanup any running toxiproxy-server ---
echo "[CLEANUP] Killing existing toxiproxy-server..."
pkill -9 -f toxiproxy || true

# --- (2) Start toxiproxy-server ---
echo "[START] Launching toxiproxy-server..."
toxiproxy-server > toxiproxy.log 2>&1 &
sleep 3

# --- (3) Create proxy ---
echo "[SETUP] Creating proxy: ${PROXY_NAME} → localhost:15441"
toxiproxy-cli create --listen 0.0.0.0:9012 --upstream localhost:15441 "$PROXY_NAME" || {
    echo "[WARN] Proxy '${PROXY_NAME}' may already exist."
}

# --- (4) Add constant latency toxics ---
LAT_MS=100
echo "[SETUP] Adding latency toxics (${LAT_MS}ms)..."
toxiproxy-cli toxic add --upstream   --type latency --attribute latency=$LAT_MS "$PROXY_NAME" || true
toxiproxy-cli toxic add --downstream --type latency --attribute latency=$LAT_MS "$PROXY_NAME" || true

# --- (5) Add initial bandwidth toxic (will be updated dynamically) ---
INIT_RATE=100
toxiproxy-cli toxic add --upstream   --type bandwidth --attribute rate=$INIT_RATE "$PROXY_NAME" || true
toxiproxy-cli toxic add --downstream --type bandwidth --attribute rate=$INIT_RATE "$PROXY_NAME" || true

echo "[INFO] Starting dynamic bandwidth adjustment from ${CSV_FILE}..."
echo "[INFO] Format: timestamp,linkrate_kbps"

# --- (6) Iterate CSV lines and apply rates ---
MAX_STEPS=65
count=0
prev_ts=""

tail -n +2 "$CSV_FILE" | while IFS=',' read -r ts kbps; do
# Process substitution (not a pipe) keeps the loop in the main shell;
# `|| [[ -n $kbps ]]` handles a final line without a trailing newline.
while IFS=',' read -r ts kbps || [[ -n "$kbps" ]]; do
    kbps="${kbps//$'\r'/}"
    if [[ -z "$kbps" ]]; then continue; fi
    rate_kBps=$(awk -v k="$kbps" 'BEGIN { printf "%d", k/8 }')

    # Hold the previous rate for the real gap between timestamps (trace has gaps).
    if [[ -n "$prev_ts" ]]; then
        gap=$(awk -v a="$prev_ts" -v b="$ts" 'BEGIN { d = b - a; printf "%s", (d > 0 ? d : 0) }')
        sleep "$gap"
    fi
    prev_ts="$ts"

    # Toxiproxy treats rate<=0 as UNLIMITED, so clamp to at least 1 KB/s.
    rate_kBps=$(awk -v k="$kbps" 'BEGIN { r = int(k/8); if (r < 1) r = 1; printf "%d", r }')
    echo "[UPDATE] t=${ts}s  linkrate=${kbps} kbps → ${rate_kBps} KB/s"

    toxiproxy-cli toxic update --toxicName bandwidth_upstream   --attribute rate="$rate_kBps" "$PROXY_NAME" || true
    toxiproxy-cli toxic update --toxicName bandwidth_downstream --attribute rate="$rate_kBps" "$PROXY_NAME" || true
    toxiproxy-cli inspect video

    count=$((count + 1))
    if [[ $count -ge $MAX_STEPS ]]; then
        echo "[INFO] Reached ${MAX_STEPS} updates — stopping early."
        break
    fi
done < <(tail -n +2 "$CSV_FILE")

echo "[DONE] Completed all updates from ${CSV_FILE}"

# --- (7) Final cleanup ---
echo "[CLEANUP] Deleting proxy..."
toxiproxy-cli delete "$PROXY_NAME" || true
pkill -9 -f toxiproxy || true
echo "=== Finished CSV-driven bandwidth profile ==="
