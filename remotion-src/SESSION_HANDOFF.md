# Remotion Platform — Session Handoff Summary
> Generated: 2026-07-29 06:20 WIB by Crabs (group session)
> Previous DM session archived (746M tokens, MiniMax-M3 context pollution)

## Project Location
`/home/agentadmin/.opencrabs/projects/remotion-platform/files/`

## What This Project Is
Programmatic video generation with Remotion 4.0. Two compositions:

| Composition | Duration | Description |
|-------------|----------|-------------|
| `PromoVideo` | 5s default (dynamic via audio) | Generic promo with Zod schema, BullMQ queue, audio sync |
| `OpenCrabsShowcase` | 60s (1800 frames @ 30fps) | **RETRO CRT-style showcase** — 10 scenes × 6s, screen shake, scanlines, VS flashes |

## Current State (as of 2026-07-29 05:00 WIB)

### ✅ DONE
- Full project scaffold: Remotion + Zod + BullMQ + Docker + QA scripts
- `OpenCrabsShowcase` component: 10 scenes (intro, channels, browser, code, research, automation, agents, vision, self-improve, outro)
- Retro visual style: CRT scanlines, screen shake, VS flash transitions, per-scene color palette
- **Last successful render:** `out/showcase-retro-full.mp4` — **60.0s, 14.8MB, 1800/1800 frames** ✅
- Audio SFX generated: `public/audio/` — coin.wav, hit.wav, pop.wav, power.wav, slam.wav, slide.wav, tick.wav, whoosh.wav + bgm-retro.wav (5.3MB)
- Audio generation script: `scripts/generate-audio.py`
- Git: 3 commits (latest: `4833597 feat: add OpenCrabs showcase composition`)

### ⚠️ UNCOMMITTED CHANGES
```
 M src/OpenCrabsShowcase.tsx    ← modified since last commit
?? public/audio/                ← untracked (SFX files)
?? scripts/generate-audio.py    ← untracked
```

### 🔧 WHAT WAS BEING WORKED ON (when session broke)
- **SFX integration into OpenCrabsShowcase** — adding `<Audio>` elements for scene transitions (whoosh, slam, coin, etc.)
- Test render for SFX (`showcase-sfx-test.mp4` exists, 670KB) — was checking if SFX plays correctly
- Bot was debugging `cd` in `setsid nohup bash -c` subshell (render commands not finding project dir)
- **Then the session got polluted with `[Model changed...]` system messages and started hallucinating render progress**

### ❌ NOT YET DONE
- SFX not yet integrated into OpenCrabsShowcase.tsx (audio files exist in public/audio/ but not wired into component)
- BGM (bgm-retro.wav) not yet muxed into final render
- Uncommitted changes not committed
- No final "production" render with audio

## Key Config Lessons (HARD RULES)
1. **NO `Config.setBrowserExecutable('/usr/bin/google-chrome')`** — spawns GPU process that deadlocks on GPU-less VPS. Use bundled chrome-headless-shell (default).
2. **NO `Config.setChromiumOpenGlRenderer('swangle')`** — same GPU hang issue.
3. **`Config.setConcurrency(1)`** — VPS has 3.8GB RAM. Concurrency 2 = OOM.
4. **Render DETACHED:** `setsid nohup npx remotion render ... > render.log 2>&1 &` — bash tool timeout kills inline renders.
5. **Test render first:** `--frames=0-30` before committing to 1800 frames.
6. **Verify render:** ALWAYS `ps aux | grep remotion` + `tail render.log` before claiming progress. NEVER fabricate PIDs or frame counts.

## How to Continue
1. `cd /home/agentadmin/.opencrabs/projects/remotion-platform/files/`
2. Check `git diff src/OpenCrabsShowcase.tsx` to see what was modified
3. Wire SFX from `public/audio/` into OpenCrabsShowcase scenes (whoosh on scene transitions, slam on VS flashes, coin on item reveals)
4. Test render: `npm run render:smoke` (30 frames)
5. Full render: `npm run render:full` (1800 frames, ~4-5 min)
6. Mux audio: `bash scripts/mux-audio.sh out/promo-full.mp4 public/audio/bgm-retro.wav out/final.mp4 0.5`
7. QA: `python3 scripts/review-render.py out/final.mp4 config/qa-reference.json`
8. Commit: `git add -A && git commit -m "feat: integrate SFX + BGM into OpenCrabsShowcase"`

## File Reference
```
src/
├── index.ts              # registerRoot
├── Root.tsx              # 2 compositions (PromoVideo + OpenCrabsShowcase)
├── OpenCrabsShowcase.tsx # 60s retro showcase (MODIFIED, uncommitted)
├── PromoVideo.tsx        # Generic promo
└── schema.ts             # Zod schema

scripts/
├── generate-audio.py     # SFX generator (untracked)
├── mux-audio.sh          # Post-render audio mux
├── render-worker.js      # BullMQ consumer
├── render-trigger.js     # CLI trigger
├── review-render.py      # QA validation
└── monitor-vps.sh        # CPU/RAM guard

public/audio/             # SFX files (untracked)
├── bgm-retro.wav (5.3MB)
├── coin.wav, hit.wav, pop.wav, power.wav
├── slam.wav, slide.wav, tick.wav, whoosh.wav

out/
├── showcase-retro-full.mp4   # ✅ Last good render (60s, 14.8MB)
├── showcase-sfx-test.mp4     # SFX test (670KB)
├── showcase-retro-test.mp4   # Retro test (690KB)
└── *.log                     # Render logs
```
