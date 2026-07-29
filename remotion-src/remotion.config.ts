import { Config } from '@remotion/cli/config';

// CRITICAL (Lesson A — 2026-07-21 CrabMotion GPU hang):
// Do NOT call Config.setBrowserExecutable() with full google-chrome.
// Do NOT call Config.setChromiumOpenGlRenderer('swangle').
// Both spawn a --type=gpu-process that deadlocks on GPU-less VPS.
// Remotion's bundled chrome-headless-shell is the safe default.
//
// If you MUST set the browser (e.g., custom path), verify with:
//   ps aux | grep gpu-process
// during a test render. If you see gpu-process pegging CPU, REMOVE the setting.

Config.setVideoImageFormat('jpeg');
// concurrency=1 for low-memory VPS (3.8GB total). With concurrency=2
// each render spawns 2 chrome instances × GPU/renderer/compositor
// subprocesses (~500MB-1GB peak per instance), easily OOMing the box.
// Stick to 1 unless the host has 8GB+. Tune with: npx remotion benchmark
Config.setConcurrency(1);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('mp3');  // faster 'Combining videos' stage than AAC
