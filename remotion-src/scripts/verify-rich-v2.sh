#!/usr/bin/env bash
# Verify rendered v2: duration, size, md5, frame probes
# Usage: ./scripts/verify-rich-v2.sh [mp4_path]
set -u

MP4="${1:-/home/agentadmin/.opencrabs/projects/remotion-platform/files/out/showcase-rich-v2.mp4}"

if [ ! -f "$MP4" ]; then
  echo "MISSING: $MP4"
  exit 1
fi

echo "== $MP4 =="
ls -la "$MP4"
md5sum "$MP4"
echo
echo "== probe =="
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -show_entries format=duration,bit_rate,size -of default=nw=1 "$MP4"
echo
echo "== mid frame (45s) =="
mkdir -p /tmp/rich-v2-verify
rm -f /tmp/rich-v2-verify/frame-mid.png /tmp/rich-v2-verify/frame-end.png
ffmpeg -hide_banner -loglevel error -i "$MP4" -vf "select=eq(n\,1350)" -vframes 1 /tmp/rich-v2-verify/frame-mid.png -y
ffmpeg -hide_banner -loglevel error -i "$MP4" -vf "select=eq(n\,2620)" -vframes 1 /tmp/rich-v2-verify/frame-end.png -y
ls -la /tmp/rich-v2-verify/
