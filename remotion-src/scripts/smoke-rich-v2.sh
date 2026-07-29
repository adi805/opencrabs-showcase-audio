#!/bin/bash
# Clean smoke render for showcase-rich-v2
# - Renders frames 0-90 (3s, enough for valid MP4 container)
# - Logs to out/render-rich-v2-smoke.log
# - Exits non-zero on any error
set -euo pipefail

cd /home/agentadmin/.opencrabs/projects/remotion-platform/files

OUT="out/showcase-rich-v2-smoke.mp4"
LOG="out/render-rich-v2-smoke.log"
rm -f "$OUT" "$LOG"

echo "[smoke] starting at $(date '+%H:%M:%S')" | tee "$LOG"
npx remotion render src/index.ts OpenCrabsShowcase "$OUT" --frames=0-90 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}
echo "[smoke] done rc=$RC at $(date '+%H:%M:%S')" | tee -a "$LOG"
ls -la "$OUT" 2>&1 | tee -a "$LOG"
exit $RC
