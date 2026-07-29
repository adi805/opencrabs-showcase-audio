cd /home/agentadmin/.opencrabs/projects/remotion-platform/files
rm -f out/showcase-rich-v2-smoke.mp4 out/render-rich-v2-smoke.log
npx remotion render src/index.ts OpenCrabsShowcase out/showcase-rich-v2-smoke.mp4 --frames=0-30 --concurrency=1 > out/render-rich-v2-smoke.log 2>&1
echo "EXIT_CODE=$?"
