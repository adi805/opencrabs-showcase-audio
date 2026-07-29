#!/usr/bin/env bash
# mux-audio.sh — combine silent Remotion render with audio file via ffmpeg.
#
# Why this exists: Remotion 4's headless static server returns 404 for
# /public/ assets (it serves from the bundle dir, not from public/).
# Any <Audio> element with a staticFile() src 404s. The clean workaround
# is to render the video SILENT and mux the audio track in here, post-render.
#
# Usage:
#   scripts/mux-audio.sh <video.mp4> <audio.wav|mp3> [output.mp4] [volume]
#
# Examples:
#   scripts/mux-audio.sh out/promo-silent.mp4 public/bgm/bgm.wav
#   scripts/mux-audio.sh out/promo-silent.mp4 public/bgm/bgm.wav out/promo.mp4 0.5
#
# Defaults:
#   output = <video-stem>-muxed.mp4 in same dir as <video>
#   volume = 1.0 (pass-through)
#   video codec = copy (no re-encode, fast)
#   audio codec = aac 192k (broad compatibility)
#   -shortest (truncate to the shorter of the two streams)

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <video.mp4> <audio.wav|mp3> [output.mp4] [volume]" >&2
  exit 1
fi

VIDEO="$1"
AUDIO="$2"
OUTPUT="${3:-${VIDEO%.mp4}-muxed.mp4}"
VOL="${4:-1.0}"

if [ ! -f "$VIDEO" ]; then
  echo "ERROR: video not found: $VIDEO" >&2
  exit 1
fi
if [ ! -f "$AUDIO" ]; then
  echo "ERROR: audio not found: $AUDIO" >&2
  exit 1
fi

# Quick probes so we fail fast with a useful message
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" 2>/dev/null || echo "0")
AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO" 2>/dev/null || echo "0")

echo "=== mux-audio.sh ==="
echo "  video:  $VIDEO  (${VIDEO_DUR}s)"
echo "  audio:  $AUDIO  (${AUDIO_DUR}s)"
echo "  output: $OUTPUT"
echo "  volume: $VOL"
echo

# Use filter_complex to: trim audio to video duration, apply volume, set PTS.
# This avoids the silent-output bug where ffmpeg's automatic stream mapping
# doesn't always include the audio from the second input.
ffmpeg -y \
  -i "$VIDEO" \
  -i "$AUDIO" \
  -filter_complex "[1:a]volume=${VOL},atrim=0:${VIDEO_DUR},asetpts=PTS-STARTPTS[aud]" \
  -map "0:v" -map "[aud]" \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -shortest -movflags +faststart \
  "$OUTPUT" </dev/null

OUT_SIZE=$(du -h "$OUTPUT" | cut -f1)
OUT_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null || echo "?")
echo
echo "✓ muxed: $OUTPUT  (${OUT_SIZE}, ${OUT_DUR}s)"

# Final loudness check so we know audio is actually present
FINAL_VOL=$(ffmpeg -i "$OUTPUT" -af volumedetect -f null - 2>&1 | grep -E "mean_volume" | awk '{print $5}' || echo "?")
echo "  final mean_volume: ${FINAL_VOL} dB"
