# Remotion Platform — Production-Ready Video Generation

Programmatic video generation with Remotion + Zod validation + dynamic metadata + audio sync + BullMQ queue.

## Stack

- **Remotion 4.0** — React-based video framework
- **Zod** — input validation + Studio sliders
- **Mediabunny (@remotion/media)** — microsecond-precise audio sync
- **BullMQ + Redis** — render queue with concurrency control
- **Python QA** — post-render validation (duration, audio loudness)
- **Docker** — reproducible SSR environment

## Project Structure

```
remotion-platform/
├── src/
│   ├── index.ts          # registerRoot entry
│   ├── Root.tsx          # Composition + calculateMetadata
│   ├── PromoVideo.tsx    # Main video component
│   └── schema.ts         # Zod schema (shared with backend)
├── scripts/
│   ├── render-trigger.js # One-off CLI trigger
│   ├── render-worker.js  # BullMQ consumer
│   ├── monitor-vps.sh    # CPU/RAM guard (pauses queue on overload)
│   └── review-render.py  # Post-render QA
├── config/
│   └── qa-reference.json # QA target metrics
├── out/                  # Render output (gitignored)
├── public/               # Static assets (audio, fonts, images)
├── remotion.config.ts    # Remotion config (no GPU-process)
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Audio Handling

Audio sources (sfxUrl, bgmUrl) accept EITHER:
- Full URL: `https://cdn.example.com/bgm.mp3` (fetched at render time)
- Relative path: `bgm/bgm.wav` (resolved via `staticFile()`, which maps to `public/bgm/bgm.wav`)

If the field is left undefined or the URL is empty, the corresponding `<Audio>` element is omitted entirely (no 404 noise, no placeholder fetch). Default props ship with local files in `public/sfx/` and `public/bgm/` so the scaffold renders with audio out-of-the-box.

`audioUrl` (used by `calculateMetadata` to derive `durationInFrames` from audio length) is URL-only — local paths require an explicit `durationInFrames` in the composition.

> **Audio file convention**: place assets under `public/<category>/<filename>`. The category prefix becomes the `staticFile()` path. Default scaffold ships with `public/sfx/pop.wav` (SFX) and `public/bgm/bgm.wav` (loop). Override via Zod props.

## Quick Start

```bash
# Install
npm install

# Studio (interactive sliders)
npm run dev

# Quick test render (90 frames)
npx remotion render src/index.ts PromoVideo out/test.mp4 --frames=0-90

# Full render with props
npx remotion render src/index.ts PromoVideo out/promo.mp4 \
  --props='{"titleText":"Halo","titleColor":"#ff0000"}'

# QA check
npm run qa -- out/promo.mp4

# Docker build
docker build -t remotion-renderer .
docker run --rm -v $(pwd)/out:/app/out remotion-renderer
```

## Backend Integration

```js
// scripts/render-trigger.js — validate + render
const { PromoVideoSchema } = require('../src/schema');
const props = PromoVideoSchema.parse(userInput);  // throws on bad data
await triggerRender('PromoVideo', props);
```

## Queue Mode (Production)

```bash
# Terminal 1: monitor
npm run monitor

# Terminal 2: Redis
redis-server

# Terminal 3: worker (concurrency: 1 for VPS safety)
npm run worker

# Terminal 4: enqueue
node -e "require('./scripts/render-worker').enqueue('PromoVideo', {titleText:'Hi'})"
```

## Critical Lessons (from CrabMotion 2026-07-21)

🚨 **NEVER** add to `remotion.config.ts`:
```ts
Config.setBrowserExecutable('/usr/bin/google-chrome');  // GPU-process deadlock
Config.setChromiumOpenGlRenderer('swangle');           // GPU-process deadlock
```

✅ Use Remotion's bundled `chrome-headless-shell` (no GPU process, safe for GPU-less VPS).

Other lessons in `~/.opencrabs/knowledge/BRAND/remotion-expert.md`:
- FontFace + delayRender module-scope throws → use `<style>` + component-scope
- pkill -f self-frag → kill by PID
- Detached renders → `setsid nohup ... > log 2>&1 &` + poll separately

## Docs

Full framework reference: `~/.opencrabs/knowledge/BRAND/remotion-expert.md`
