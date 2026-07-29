import { z } from 'zod';

// Single source of truth for video input validation.
// Imported by:
//   - Root.tsx (Remotion Studio + render)
//   - scripts/render-worker.js (backend trigger, before CLI)
//   - scripts/render-trigger.js (one-off CLI trigger)

export const PromoVideoSchema = z.object({
  // Text content
  titleText: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(80, 'Title too long (max 80 chars)')
    .default('Promo Video'),

  subtitleText: z
    .string()
    .min(1)
    .max(120)
    .default('Generated with Remotion + Zod'),

  // Visual style
  titleColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex like #ff0000')
    .default('#ffffff'),

  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#0a0a0a'),

  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#3b82f6'),

  fontSize: z
    .number()
    .min(40, 'Too small to read')
    .max(200, 'Too large for canvas')
    .step(2)
    .default(96),

  // Animation
  animationStyle: z
    .enum(['bouncy', 'smooth', 'dramatic'])
    .default('bouncy'),

  // Audio
  bgmVolume: z
    .number()
    .min(0, 'Volume cannot be negative')
    .max(1, 'Volume cannot exceed 1')
    .step(0.05)
    .default(0.5),

  sfxVolume: z
    .number()
    .min(0)
    .max(1)
    .step(0.05)
    .default(0.8),

  // Dynamic duration (optional).
  // If provided, calculateMetadata derives duration from this URL via
  // getAudioDurationInSeconds(). Must be a URL (http/https) — local paths
  // require you to set durationInFrames explicitly in the composition.
  audioUrl: z
    .string()
    .url()
    .optional(),

  // Optional audio sources. Accept EITHER:
  //   - a full URL (http/https) — fetched at render time
  //   - a relative path (e.g. "sfx/pop.wav") — resolved via staticFile()
  //     which maps to /public/<path> in the project
  // If not set, the corresponding <Audio> element is omitted entirely
  // (no 404 noise, no placeholder fetch).
  //
  // NOTE: In Remotion 4 headless renders, public/ files are sometimes
  // missing from the bundle (see https://remotion.dev issues). To get
  // audio reliably, we ship the video silent and mux the audio in with
  // ffmpeg post-render. See scripts/mux-audio.sh (TODO).
  sfxUrl: z.string().min(1).optional(),

  bgmUrl: z.string().min(1).optional(),
});

export type PromoVideoProps = z.infer<typeof PromoVideoSchema>;

// Default props matching schema defaults.
// NOTE: sfxUrl/bgmUrl are intentionally NOT set here — in Remotion 4
// headless renders, public/ assets are not reliably served to the renderer
// (static server returns 404 because it serves from the bundle dir, not
// from public/). We render the video SILENT and mux audio in with ffmpeg
// post-render. See scripts/mux-audio.sh.
export const DEFAULT_PROPS: PromoVideoProps = {
  titleText: 'Promo Video',
  subtitleText: 'Generated with Remotion + Zod',
  titleColor: '#ffffff',
  backgroundColor: '#0a0a0a',
  accentColor: '#3b82f6',
  fontSize: 96,
  animationStyle: 'bouncy',
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  // sfxUrl / bgmUrl omitted → <Audio> elements skipped → silent render
  // sfxUrl: 'sfx/pop.wav',
  // bgmUrl: 'bgm/bgm.wav',
};
