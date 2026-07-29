import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  spring,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolateColors,
} from 'remotion';
import { PromoVideoProps } from './schema';

const FPS = 30;
const INTRO_FRAMES = 30;
const HOLD_FRAMES = 60;
const OUTRO_FRAMES = 30;

/**
 * Audio src resolver. The schema defaults sfxUrl/bgmUrl to bare relative
 * paths like "sfx/pop.wav" — these are NOT URLs and won't be resolved
 * automatically by <Audio>. We wrap them in staticFile() so the bundler
 * picks up the asset from public/ and the renderer can fetch it.
 *
 * Rules:
 *   - http(s)://  → pass through (remote URL fetched directly)
 *   - already absolute (starts with "/") → pass through (pre-resolved)
 *   - relative path (e.g. "sfx/pop.wav") → staticFile() so the bundler
 *     copies public/<path> into the bundle and resolves to a real URL.
 */
const resolveAudioSrc = (src: string): string => {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) return src;
  return staticFile(src);
};

export const PromoVideo: React.FC<PromoVideoProps> = ({
  titleText,
  subtitleText,
  titleColor,
  backgroundColor,
  accentColor,
  fontSize,
  animationStyle,
  bgmVolume,
  sfxVolume,
  sfxUrl,
  bgmUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Spring configs per animation style
  const springConfig = {
    bouncy: { damping: 10, stiffness: 100, mass: 1 },
    smooth: { damping: 100, stiffness: 100, mass: 1, overshootClamping: true },
    dramatic: { damping: 5, stiffness: 150, mass: 0.8 },
  }[animationStyle];

  // Title scale: spring entrance
  const titleScale = spring({
    frame: frame - INTRO_FRAMES,
    fps: FPS,
    config: springConfig,
  });

  // Title opacity: fade in
  const titleOpacity = interpolate(
    frame,
    [INTRO_FRAMES, INTRO_FRAMES + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtitle: slides in after title settles
  const subtitleFrame = frame - INTRO_FRAMES - 15;
  const subtitleY = interpolate(subtitleFrame, [0, 20], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtitleOpacity = interpolate(subtitleFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Background color: subtle Oklch-like shift via interpolateColors
  const bgColor = interpolateColors(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [backgroundColor, accentColor, backgroundColor]
  );

  // BGM ducking: lower volume during outro
  const bgmDuckingVolume = (f: number) =>
    interpolate(
      f,
      [durationInFrames - OUTRO_FRAMES, durationInFrames],
      [bgmVolume, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
      {/* Title with spring entrance */}
      <Sequence from={INTRO_FRAMES}>
        <div
          style={{
            color: titleColor,
            fontSize,
            fontWeight: 800,
            textAlign: 'center',
            transform: `scale(${titleScale})`,
            opacity: titleOpacity,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {titleText}
        </div>
        {sfxUrl ? <Audio src={resolveAudioSrc(sfxUrl)} volume={sfxVolume} /> : null}
      </Sequence>

      {/* Subtitle slide-in */}
      <Sequence from={INTRO_FRAMES + 15}>
        <div
          style={{
            color: titleColor,
            fontSize: fontSize / 2.5,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontFamily: 'system-ui, sans-serif',
            marginTop: 20,
          }}
        >
          {subtitleText}
        </div>
      </Sequence>

      {/* BGM throughout, with ducking */}
      {bgmUrl ? <Audio src={resolveAudioSrc(bgmUrl)} volume={bgmDuckingVolume} /> : null}
    </AbsoluteFill>
  );
};
