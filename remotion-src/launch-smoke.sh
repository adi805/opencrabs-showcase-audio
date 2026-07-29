#!/bin/bash
cd /home/agentadmin/.opencrabs/projects/remotion-platform/files
mkdir -p out
rm -f out/showcase-rich-v2-smoke.mp4 out/render-rich-v2-smoke.log
setsid nohup npx remotion render src/index.ts OpenCrabsShowcase out/showcase-rich-v2-smoke.mp4 --frames=0-30 > out/render-rich-v2-smoke.log 2>&1 < /dev/null &
echo $! > out/render-smoke-direct.pid
echo "LAUNCHED PID=$(cat out/render-smoke-direct.pid)"
exit 0
