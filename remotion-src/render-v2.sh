#!/usr/bin/env bash
# v2 full render: silent video + mux bgm-rich.wav
set -euo pipefail
cd /home/agentadmin/.opencrabs/projects/remotion-platform/files

echo "=== 1. FULL RENDER (silent) ==="
rm -f out/showcase-rich-v2.mp4
npx remotion render src/index.ts OpenCrabsShowcase out/showcase-rich-v2.mp4

echo
echo "=== 2. MUX AUDIO ==="
bash scripts/mux-audio.sh out/showcase-rich-v2.mp4 public/audio/bgm/bgm-rich.wav out/showcase-rich-v2-muxed.mp4 0.55

echo
echo "=== 3. VERIFY ==="
ls -la out/showcase-rich-v2*.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 out/showcase-rich-v2-muxed.mp4
md5sum out/showcase-rich-v2-muxed.mp4
