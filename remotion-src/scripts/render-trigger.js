#!/usr/bin/env node
/**
 * Render trigger — validates Zod schema, then runs npx remotion render via CLI.
 * Use as a one-off trigger or wrap in a queue worker.
 */
const { exec } = require('child_process');
const { PromoVideoSchema, DEFAULT_PROPS } = require('../src/schema');

function triggerRender(compId, inputProps, outPath = 'out/render.mp4') {
  // 1. Validate against Zod schema (rejects malformed inputs)
  const validated = PromoVideoSchema.parse({ ...DEFAULT_PROPS, ...inputProps });
  const propsString = JSON.stringify(validated);

  const command = `npx remotion render src/index.ts ${compId} ${outPath} --props='${propsString}'`;
  console.log(`[triggerRender] ${compId} -> ${outPath}`);
  console.log(`[command] ${command}`);

  return new Promise((resolve, reject) => {
    exec(
      command,
      { maxBuffer: 1024 * 1024 * 100 },  // 100MB buffer for verbose logs
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[FAIL] ${error.message}`);
          return reject(error);
        }
        if (stderr) console.error(`[chrome/ffmpeg] ${stderr}`);
        console.log(`[OK] Saved to ${outPath}`);
        resolve(outPath);
      }
    );
  });
}

// CLI usage: node render-trigger.js '{"titleText":"Hi"}'
if (require.main === module) {
  const propsArg = process.argv[2] || '{}';
  let props;
  try {
    props = JSON.parse(propsArg);
  } catch (e) {
    console.error('Invalid JSON props:', e.message);
    process.exit(1);
  }
  triggerRender('PromoVideo', props).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { triggerRender };
