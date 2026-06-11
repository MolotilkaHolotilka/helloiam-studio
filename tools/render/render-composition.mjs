import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadCompositionProps} from './load-composition-props.mjs';
import {withRenderLock} from './render-lock.mjs';

const ENTRY = 'src/gallery/index.ts';

function runRemotion(studioRoot, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['remotion', ...args], {
      cwd: studioRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr.trim() || `remotion exited with code ${code}`));
    });
  });
}

/**
 * @param {string} studioRoot
 * @param {string} compositionId
 * @param {Record<string, unknown>} [propsOverride]
 * @param {{ outRelative?: string, urlBase?: string, propsOnly?: boolean, video?: boolean, durationFrames?: number }} [options]
 */
export async function renderComposition(studioRoot, compositionId, propsOverride = {}, options = {}) {
  return withRenderLock(async () => {
    const loaded = await loadCompositionProps(studioRoot, compositionId);
    const props = options.propsOnly
      ? {...propsOverride}
      : {...loaded.defaultProps, ...propsOverride};

    const durationFrames = options.durationFrames ?? loaded.durationFrames ?? 90;
    const stillFrame =
      options.stillFrame ??
      Math.min(durationFrames - 1, Math.max(30, Math.round(durationFrames * 0.85)));

    const outRelative = options.outRelative ?? compositionId;
    const outDir = path.join(studioRoot, 'out', 'renders', outRelative);
    await mkdir(outDir, {recursive: true});

    const propsPath = path.join(outDir, 'props.json');
    await writeFile(propsPath, `${JSON.stringify(props, null, 2)}\n`);

    const stillPath = path.join(outDir, 'still.png');
    const videoPath = path.join(outDir, 'video.mp4');
    const urlBase = options.urlBase ?? `/renders/${String(outRelative).replace(/\\/g, '/')}`;
    const includeVideo = options.video !== false;

    await runRemotion(studioRoot, [
      'still',
      ENTRY,
      compositionId,
      stillPath,
      `--frame=${stillFrame}`,
      `--props=${propsPath}`,
    ]);

    if (includeVideo) {
      await runRemotion(studioRoot, [
        'render',
        ENTRY,
        compositionId,
        videoPath,
        `--props=${propsPath}`,
      ]);
    }

    return {
      compositionId,
      stillPath,
      videoPath: includeVideo ? videoPath : null,
      stillFrame,
      stillUrl: `${urlBase}/still.png`,
      videoUrl: includeVideo ? `${urlBase}/video.mp4` : null,
    };
  });
}
