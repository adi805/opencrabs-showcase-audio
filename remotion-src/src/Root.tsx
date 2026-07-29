import { Composition } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { PromoVideo } from './PromoVideo';
import { OpenCrabsShowcase } from './OpenCrabsShowcase';
import { PromoVideoSchema, DEFAULT_PROPS } from './schema';

// Local sfx/bgm audio is muxed in post-render via scripts/mux-audio.sh,
// so we don't bake it into the render. The schema's audioUrl field, if
// provided, is a remote URL — no staticFile() needed in this file.

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={150}  // default 5s @ 30fps; overridden by calculateMetadata
        fps={30}
        width={1920}
        height={1080}
        schema={PromoVideoSchema}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={async ({ props }) => {
          // Dynamic duration: if audioUrl provided, fit video to audio length
          if (props.audioUrl) {
            try {
              const audioSeconds = await getAudioDurationInSeconds(props.audioUrl);
              return {
                durationInFrames: Math.ceil(audioSeconds * 30),
                props,
              };
            } catch (e) {
              console.warn(`Failed to fetch audio duration, using default: ${e}`);
            }
          }
          return {
            durationInFrames: 150,
            props,
          };
        }}
      />
      <Composition
        id="OpenCrabsShowcase"
        component={OpenCrabsShowcase}
        durationInFrames={2700}  // 15 scenes × 6s × 30fps = 90s
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
