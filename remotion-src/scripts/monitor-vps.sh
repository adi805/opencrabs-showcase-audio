#!/bin/bash
# VPS CPU/RAM monitor — touches render_pause.lock when overloaded.
# Worker (render-worker.js) waits while this file exists.
# Run in background: ./monitor-vps.sh &

set -e
THRESHOLD_CPU=85
THRESHOLD_RAM=90
LOCK_FILE="$(dirname "$0")/../render_pause.lock"

while true; do
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
  RAM_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')

  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIMESTAMP] CPU: ${CPU_USAGE}% | RAM: ${RAM_USAGE}%"

  # Compare with awk (POSIX-safe, no bc dependency)
  if awk "BEGIN{exit !($CPU_USAGE > $THRESHOLD_CPU || $RAM_USAGE > $THRESHOLD_RAM)}" 2>/dev/null; then
    if [ ! -f "$LOCK_FILE" ]; then
      echo "[$TIMESTAMP] OVERLOAD — pausing queue (touching $LOCK_FILE)"
      touch "$LOCK_FILE"
    fi
  else
    if [ -f "$LOCK_FILE" ]; then
      echo "[$TIMESTAMP] OK — releasing queue"
      rm -f "$LOCK_FILE"
    fi
  fi

  sleep 10
done
