import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Audio,
  staticFile,
} from 'remotion';

/* ── retro palette ───────────────────────────────────── */
const BG = '#0a0a12';
const WHITE = '#ffffff';
const BLACK = '#000000';
const ACCENT = '#ff4400'; // hot orange-red
const YELLOW = '#ffd700';
const CYAN = '#00ffff';
const RED = '#ff0033';
const GREEN = '#00ff66';
const PURPLE = '#cc00ff';
const BLUE = '#0066ff';

const SCENE_COLORS = [
  ACCENT,    // 0  intro
  CYAN,      // 1  channels
  GREEN,     // 2  browser
  PURPLE,    // 3  code
  BLUE,      // 4  research
  YELLOW,    // 5  automation
  RED,       // 6  agents
  '#ff66aa', // 7  vision
  '#00ccff', // 8  memory
  ACCENT,    // 9  outro
  // v2 additions (5 new info-rich scenes):
  RED,       // 10 THE PROBLEM (red = warning/pain)
  GREEN,     // 11 THE SOLUTION (green = relief/win)
  CYAN,      // 12 USE CASES (cool, neutral)
  YELLOW,    // 13 GET STARTED (energy, action)
  '#ff66aa', // 14 BY THE NUMBERS (pink = data pop)
];

/* ── scene data ──────────────────────────────────────── */
interface SceneData {
  title: string;
  subtitle: string;
  items: string[];
  color: string;
}

const SCENES: SceneData[] = [
  // 0 — intro
  { title: 'OPENCRABS', subtitle: 'AI AGENT OPERATING SYSTEM', items: [], color: SCENE_COLORS[0] },
  // 1 — NEW: THE PROBLEM
  { title: 'THE PROBLEM', subtitle: 'BUILDING AI AGENTS IS HARD', items: ['WEEKS OF SETUP', 'INFRA NIGHTMARES', 'CHANNEL MESS', 'MEMORY FRAGILE'], color: SCENE_COLORS[10] },
  // 2 — NEW: THE SOLUTION
  { title: 'THE SOLUTION', subtitle: 'ONE BINARY, EVERYTHING INCLUDED', items: ['ZERO CONFIG', 'PRODUCTION READY', '100% OPEN SOURCE', 'BUILT IN RUST'], color: SCENE_COLORS[11] },
  // 3 — multi-channel
  { title: 'MULTI-CHANNEL', subtitle: 'SATU AGENT SEMUA PLATFORM', items: ['TELEGRAM', 'WHATSAPP', 'DISCORD', 'SLACK', 'TRELLO'], color: SCENE_COLORS[1] },
  // 4 — browser
  { title: 'BROWSER', subtitle: 'HEADLESS CHROME VIA CDP', items: ['NAVIGATE', 'CLICK', 'TYPE', 'SCREENSHOT', 'EVALUATE JS'], color: SCENE_COLORS[2] },
  // 5 — code & files
  { title: 'CODE & FILES', subtitle: 'FULL FILESYSTEM ACCESS', items: ['READ', 'WRITE', 'EDIT', 'EXECUTE', 'GIT OPS'], color: SCENE_COLORS[3] },
  // 6 — web research
  { title: 'WEB RESEARCH', subtitle: 'SEARCH → SCRAPE → SYNTHESIZE', items: ['EXA NEURAL', 'BRAVE SEARCH', 'WEB SCRAPE', 'HTTP API'], color: SCENE_COLORS[4] },
  // 7 — 24/7 auto
  { title: '24/7 AUTO', subtitle: 'CRON JOBS & BACKGROUND TASKS', items: ['SCHEDULED', 'BG RENDERS', 'SELF-HEAL', 'AUTO-REPORT'], color: SCENE_COLORS[5] },
  // 8 — multi-agent
  { title: 'MULTI-AGENT', subtitle: 'ORCHESTRATE AGENT TEAMS', items: ['SUB-AGENTS', 'TEAM BROADCAST', 'A2A PROTOCOL', 'AGENT-TO-AGENT'], color: SCENE_COLORS[6] },
  // 9 — vision & media
  { title: 'VISION & MEDIA', subtitle: 'SEE ANALYZE GENERATE', items: ['IMAGE ANALYSIS', 'VIDEO PROCESS', 'IMAGE GEN', 'DOC PARSE'], color: SCENE_COLORS[7] },
  // 10 — self-improve
  { title: 'SELF-IMPROVE', subtitle: 'GETS SMARTER EVERY SESSION', items: ['PERSISTENT MEMORY', 'BRAIN FILES', 'RSI LOOPS', 'FEEDBACK'], color: SCENE_COLORS[8] },
  // 11 — NEW: USE CASES
  { title: 'USE CASES', subtitle: 'WHAT YOU CAN BUILD', items: ['DEV TEAM', 'CONTENT PIPELINE', 'CUSTOMER SUPPORT', 'OPS AUTOMATION', 'RESEARCH'], color: SCENE_COLORS[12] },
  // 12 — NEW: GET STARTED
  { title: 'GET STARTED', subtitle: 'RUN IN UNDER 5 MINUTES', items: ['GIT CLONE', 'CARGO BUILD', 'CONFIGURE', 'DEPLOY'], color: SCENE_COLORS[13] },
  // 13 — NEW: BY THE NUMBERS (real upstream stats from adolfousier/opencrabs)
  { title: 'BY THE NUMBERS', subtitle: 'OPEN SOURCE PRODUCTION', items: ['844 STARS', '88 FORKS', '8 CONTRIBUTORS', '100+ RELEASES', 'MIT LICENSE'], color: SCENE_COLORS[14] },
  // 14 — outro (real canonical links)
  { title: 'OPENCRABS', subtitle: 'YOUR AI OPERATING SYSTEM', items: ['OPENCRABS.COM', 'GITHUB.COM/ADOLFOUSIER/OPENCRABS'], color: SCENE_COLORS[9] },
];

const SCENE_DUR = 180; // 6s per scene at 30fps
const FLASH_DUR = 15;  // VS flash frames
const TOTAL_DUR = SCENES.length * SCENE_DUR; // 2700 (15 scenes × 6s × 30fps = 90s)

/* ── deterministic screen shake ──────────────────────── */
const shake = (frame: number, intensity: number, decay = 0.92) => {
  const amp = intensity * Math.pow(decay, frame);
  if (amp < 0.5) return { x: 0, y: 0 };
  const x = Math.sin(frame * 13.7) * amp;
  const y = Math.cos(frame * 17.3) * amp;
  return { x, y };
};

/* ── CRT overlays ────────────────────────────────────── */
const ScanLines: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      pointerEvents: 'none',
      zIndex: 100,
    }}
  />
);

const CRTVignette: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)',
      pointerEvents: 'none',
      zIndex: 101,
    }}
  />
);

/* ── VS flash transition ─────────────────────────────── */
const VSFlash: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // White flash → colored → fade
  const flashOpacity = interpolate(frame, [0, 3, 8, FLASH_DUR], [1, 1, 0.9, 0], {
    extrapolateRight: 'clamp',
  });

  const vsScale = spring({ frame, fps, config: { damping: 8, stiffness: 300 } });
  const vsRotate = interpolate(vsScale, [0, 1], [-15, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: WHITE,
        opacity: flashOpacity,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          fontSize: 160,
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontWeight: 900,
          color: color,
          transform: `scale(${interpolate(vsScale, [0, 1], [3, 1])}) rotate(${vsRotate}deg)`,
          textShadow: `0 0 40px ${color}, 0 0 80px ${color}44`,
          letterSpacing: 20,
        }}
      >
        VS
      </div>
    </AbsoluteFill>
  );
};

/* ── retro scene component ───────────────────────────── */
const RetroScene: React.FC<{ data: SceneData; sceneIndex: number }> = ({ data, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isIntro = sceneIndex === 0;
  const isOutro = sceneIndex === SCENES.length - 1;

  // Screen shake on entry
  const { x: sx, y: sy } = shake(frame, isIntro ? 25 : 15);

  // Title slam: scale from 3x → 1x with spring
  const titleSpring = spring({ frame, fps, config: { damping: 10, stiffness: 250 } });
  const titleScale = interpolate(titleSpring, [0, 1], [3, 1]);
  const titleOpacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

  // Subtitle slide
  const subSpring = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 180 } });
  const subY = interpolate(subSpring, [0, 1], [60, 0]);
  const subOpacity = interpolate(frame, [10, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Exit fade
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Accent bar wipe
  const barScale = interpolate(frame, [3, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Item pop-in
  const itemBase = 25;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: exitOpacity,
        transform: `translate(${sx}px, ${sy}px)`,
        fontFamily: 'Impact, "Arial Black", sans-serif',
      }}
    >
      {/* Background grid (retro) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${data.color}11 1px, transparent 1px), linear-gradient(90deg, ${data.color}11 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.5,
        }}
      />

      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: data.color,
          transform: `scaleX(${barScale})`,
          transformOrigin: 'left',
          boxShadow: `0 0 30px ${data.color}`,
        }}
      />

      {/* Bottom accent bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: data.color,
          transform: `scaleX(${barScale})`,
          transformOrigin: 'right',
          boxShadow: `0 0 30px ${data.color}`,
        }}
      />

      {/* Title — SLAM */}
      <div
        style={{
          fontSize: isIntro || isOutro ? 120 : 90,
          fontWeight: 900,
          color: WHITE,
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: 'center',
          letterSpacing: 6,
          textShadow: `0 0 20px ${data.color}, 0 0 60px ${data.color}66, 4px 4px 0 ${BLACK}`,
          padding: '0 60px',
          textTransform: 'uppercase',
        }}
      >
        {data.title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: isIntro || isOutro ? 36 : 30,
          color: data.color,
          marginTop: 20,
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          textAlign: 'center',
          letterSpacing: 4,
          fontWeight: 700,
          textShadow: `0 0 15px ${data.color}88`,
        }}
      >
        {data.subtitle}
      </div>

      {/* Items — pop in with hit */}
      {data.items.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 20,
            marginTop: 50,
            padding: '0 100px',
          }}
        >
          {data.items.map((item, i) => {
            const delay = itemBase + i * 10;
            const itemSpring = spring({ frame: frame - delay, fps, config: { damping: 8, stiffness: 300 } });
            const itemScale = interpolate(itemSpring, [0, 1], [2.5, 1]);
            const itemOpacity = interpolate(frame, [delay, delay + 4], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={item}
                style={{
                  opacity: itemOpacity,
                  transform: `scale(${itemScale})`,
                  background: `${data.color}22`,
                  border: `3px solid ${data.color}`,
                  padding: '16px 32px',
                  fontSize: 28,
                  color: WHITE,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textShadow: `0 0 10px ${data.color}88`,
                  boxShadow: `0 0 20px ${data.color}33, inset 0 0 20px ${data.color}11`,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      )}

      {/* Watermark (outro) */}
      {isOutro && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div style={{ fontSize: 36, color: ACCENT, fontWeight: 900, letterSpacing: 4, textShadow: `0 0 20px ${ACCENT}` }}>
            🦀 CRABS AGENT 🦀
          </div>
          <div style={{ fontSize: 26, color: YELLOW, fontWeight: 700, letterSpacing: 2 }}>
            HTTPS://OPENCRABS.COM
          </div>
        </div>
      )}

      {/* Scene counter */}
      {!isOutro && (
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            right: 70,
            fontSize: 22,
            color: `${data.color}66`,
            fontWeight: 900,
            letterSpacing: 3,
          }}
        >
          {String(sceneIndex + 1).padStart(2, '0')}/{String(SCENES.length).padStart(2, '0')}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ── health bar (retro fighter style progress) ───────── */
const HealthBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <div
      style={{
        position: 'absolute',
        top: 30,
        left: 60,
        right: 60,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.3)',
        zIndex: 150,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${RED}, ${YELLOW}, ${GREEN})`,
          boxShadow: `0 0 15px ${GREEN}88`,
        }}
      />
    </div>
  );
};

/* ── main composition ────────────────────────────────── */
export const OpenCrabsShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* BGM — continuous chiptune bed */}
      <Audio src={staticFile('audio/bgm/bgm-rich.wav')} volume={0.55} />

      {/* Scenes with per-element SFX */}
      {SCENES.map((scene, i) => {
        const sceneStart = i * SCENE_DUR;
        return (
          <React.Fragment key={i}>
            {/* VS flash + power-up SFX before each scene (except first) */}
            {i > 0 && (
              <Sequence from={sceneStart - FLASH_DUR} durationInFrames={FLASH_DUR} name={`VS-${i}`}>
                <VSFlash color={scene.color} />
                <Audio src={staticFile('audio/power.wav')} volume={0.6} />
              </Sequence>
            )}

            {/* Scene */}
            <Sequence from={sceneStart} durationInFrames={SCENE_DUR} name={scene.title}>
              <RetroScene data={scene} sceneIndex={i} />

              {/* SFX: SLAM on title (frame 0) */}
              <Audio src={staticFile('audio/slam.wav')} volume={0.6} />

              {/* SFX: SLIDE on subtitle (frame 10) */}
              <Sequence from={10} durationInFrames={20}>
                <Audio src={staticFile('audio/slide.wav')} volume={0.35} />
              </Sequence>

              {/* SFX: WHOOSH on accent bar wipe (frame 3) */}
              <Sequence from={3} durationInFrames={20}>
                <Audio src={staticFile('audio/whoosh.wav')} volume={0.3} />
              </Sequence>

              {/* SFX: individual POP per item (staggered) */}
              {scene.items.map((item, j) => {
                const itemFrame = 25 + j * 10;
                return (
                  <Sequence key={`sfx-${item}`} from={itemFrame} durationInFrames={12}>
                    <Audio src={staticFile('audio/pop.wav')} volume={0.45} />
                  </Sequence>
                );
              })}

              {/* SFX: HIT accent on last item (impact) */}
              {scene.items.length > 0 && (
                <Sequence from={25 + (scene.items.length - 1) * 10} durationInFrames={15}>
                  <Audio src={staticFile('audio/hit.wav')} volume={0.5} />
                </Sequence>
              )}
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* Outro watermark: COIN + SLIDE */}
      <Sequence from={(SCENES.length - 1) * SCENE_DUR + 40} durationInFrames={30}>
        <Audio src={staticFile('audio/coin.wav')} volume={0.55} />
      </Sequence>
      <Sequence from={(SCENES.length - 1) * SCENE_DUR + 55} durationInFrames={20}>
        <Audio src={staticFile('audio/slide.wav')} volume={0.3} />
      </Sequence>

      {/* Overlays */}
      <ScanLines />
      <CRTVignette />
      <HealthBar />
    </AbsoluteFill>
  );
};
