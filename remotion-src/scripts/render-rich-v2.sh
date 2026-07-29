#!/bin/bash
# Full render for showcase-rich-v2
# - 2700 frames @ 30fps = 90s
# - Concurrency=4 (4-core VPS)
# - Logs to out/render-rich-v2.log
set -uo pipefail

cd /home/agentadmin/.opencrabs/projects/remotion-platform/files

OUT="out/showcase-rich-v2.mp4"
LOG="out/render-rich-v2.log"
rm -f "$OUT" "$LOG"

echo "[full] starting at $(date '+%H:%M:%S')" | tee "$LOG"
npx remotion render src/index.ts OpenCrabsShowcase "$OUT" --concurrency=4 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}
echo "[full] done rc=$RC at $(date '+%H:%M:%S')" | tee -a "$LOG"
ls -la "$OUT" 2>&1 | tee -a "$LOG"
exit $RC
