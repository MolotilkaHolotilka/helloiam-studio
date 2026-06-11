import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadCompositionProps} from './load-composition-props.mjs';

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
 */
export async function renderComposition(studioRoot, compositionId, propsOverride = {}) {
  const loaded = await loadCompositionProps(studioRoot, compositionId);
  const props = {...loaded.defaultProps, ...propsOverride};

  const outDir = path.join(studioRoot, 'out', 'renders', compositionId);
  await mkdir(outDir, {recursive: true});

  const propsPath = path.join(outDir, 'props.json');
  await writeFile(propsPath, `${JSON.stringify(props, null, 2)}\n`);

  const stillPath = path.join(outDir, 'still.png');
  const videoPath = path.join(outDir, 'video.mp4');

  await runRemotion(studioRoot, [
    'still',
    ENTRY,
    compositionId,
    stillPath,
    `--props=${propsPath}`,
  ]);

  await runRemotion(studioRoot, [
    'render',
    ENTRY,
    compositionId,
    videoPath,
    `--props=${propsPath}`,
  ]);

  return {
    compositionId,
    stillPath,
    videoPath,
    stillUrl: `/renders/${compositionId}/still.png`,
    videoUrl: `/renders/${compositionId}/video.mp4`,
  };
}
