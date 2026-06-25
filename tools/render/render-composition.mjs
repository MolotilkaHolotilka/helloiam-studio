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
 * @param {{ outRelative?: string, urlBase?: string, propsOnly?: boolean, video?: boolean, still?: boolean, durationFrames?: number, stillFrame?: number }} [options]
 */
export async function renderComposition(studioRoot, compositionId, propsOverride = {}, options = {}) {
  return withRenderLock(async () => {
    const loaded = await loadCompositionProps(studioRoot, compositionId);
    const props = options.propsOnly
      ? {...propsOverride}
      : {...loaded.defaultProps, ...propsOverride};

    const durationFrames = options.durationFrames ?? loaded.durationFrames ?? 90;
    const settledFrame = options.stillFrame ?? 0;

    const outRelative = options.outRelative ?? compositionId;
    const outDir = path.join(studioRoot, 'out', 'renders', outRelative);
    await mkdir(outDir, {recursive: true});

    const videoPropsPath = path.join(outDir, 'props.json');
    const stillPropsPath = path.join(outDir, 'props.still.json');
    await writeFile(videoPropsPath, `${JSON.stringify(props, null, 2)}\n`);
    await writeFile(
      stillPropsPath,
      `${JSON.stringify({...props, __staticStill: true}, null, 2)}\n`,
    );

    const stillPath = path.join(outDir, 'still.png');
    const videoPath = path.join(outDir, 'video.mp4');
    const urlBase = options.urlBase ?? `/renders/${String(outRelative).replace(/\\/g, '/')}`;
    const includeVideo = options.video !== false;
    const includeStill = options.still !== false;

    // PNG is rendered as a true static card. The __staticStill flag lets
    // templates bypass enter/float/scale animation instead of freezing a
    // random animated frame from the MP4 timeline.
    if (includeStill) {
      await runRemotion(studioRoot, [
        'still',
        ENTRY,
        compositionId,
        stillPath,
        `--frame=${settledFrame}`,
        `--props=${stillPropsPath}`,
      ]);
    }

    if (includeVideo) {
      await runRemotion(studioRoot, [
        'render',
        ENTRY,
        compositionId,
        videoPath,
        `--props=${videoPropsPath}`,
      ]);
    }

    return {
      compositionId,
      stillPath: includeStill ? stillPath : null,
      videoPath: includeVideo ? videoPath : null,
      stillFrame: settledFrame,
      stillUrl: includeStill ? `${urlBase}/still.png` : null,
      videoUrl: includeVideo ? `${urlBase}/video.mp4` : null,
    };
  });
}
