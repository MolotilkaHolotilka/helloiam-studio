import path from 'node:path';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {renderComposition} from '../render/render-composition.mjs';
import {syncEmojiToImageCards} from '../generation/format-03-04-emoji.mjs';
import {getPostAssetPathSet} from './post-assets-service.mjs';
import {getPost, validateCardProps} from './posts-service.mjs';
import {resolveRubricCardRenderProps} from './post-settings.mjs';
import {isRubric01Template, isRubric02Template} from '../rubric/rubric-ids.mjs';

function postPath(studioRoot, postId) {
  return path.join(studioRoot, 'data', 'posts', `${postId}.json`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe'], ...options});
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function writePromo01TextOverlay(studioRoot, postId, card, props) {
  const lines = String(props.title || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;

  const overlayDir = path.join(studioRoot, 'out', 'renders', 'posts', postId, String(card.cardIndex), '_overlay');
  await mkdir(overlayDir, {recursive: true});
  const propsPath = path.join(overlayDir, 'props.overlay.json');
  const pngPath = path.join(overlayDir, 'text.png');
  await writeFile(
    propsPath,
    `${JSON.stringify({
      ...props,
      image: '',
      video: '',
      background: '#00FF00',
      __staticStill: true,
    }, null, 2)}\n`,
    'utf8',
  );
  await runCommand('npx', [
    'remotion',
    'still',
    'src/gallery/index.ts',
    String(card.compositionId),
    pngPath,
    '--frame=30',
    `--props=${propsPath}`,
  ], {cwd: studioRoot});
  return pngPath;
}

async function renderRubric01VideoOverlay(studioRoot, postId, generatedVideo, outPath, card, props) {
  const inputPath = path.join(studioRoot, 'public', generatedVideo);
  const overlayPath = await writePromo01TextOverlay(studioRoot, postId, card, props);
  if (!overlayPath) return;
  const darken = String(card.compositionId || '') === 'Post95Css' ? ',eq=brightness=-0.18' : '';
  const filter = `[0:v]scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,setsar=1${darken}[base];[1:v]chromakey=0x00FF00:0.18:0.12[overlay];[base][overlay]overlay=0:0:format=auto`;
  await runCommand('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-i', overlayPath,
    '-an',
    '-filter_complex', filter,
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264',
    '-movflags', '+faststart',
    outPath,
  ], {cwd: studioRoot});
}

/**
 * @param {object} post
 * @param {Set<string>} assetPaths
 */
export function collectPostValidationErrors(post, assetPaths) {
  const validationErrors = [];
  for (const card of post.cards) {
    const generatedVideo = post.generation?.videoAssets?.[card.cardIndex];
    const hasGeneratedVideo = assetPaths.has(generatedVideo);
    const errors = filterImageFieldErrors(
      validateCardProps(card.props || {}, card.fields || [], assetPaths, card.metaPropKeys),
      hasGeneratedVideo ? card.fields || [] : [],
    );
    if (errors.length > 0) {
      validationErrors.push({
        cardIndex: card.cardIndex,
        label: card.label,
        errors,
      });
    }
  }
  return validationErrors;
}

/**
 * A generated video can replace the source image for media cards, but the rest
 * of the card props still need validation because Remotion renders the overlay.
 * @param {string[]} errors
 * @param {Array<{key: string, type?: string, label?: string}>} fields
 */
function filterImageFieldErrors(errors, fields) {
  if (!errors.length || !fields.length) return errors;
  const imageFields = fields.filter((field) => field.type === 'image');
  if (!imageFields.length) return errors;
  return errors.filter((error) => !imageFields.some((field) => (
    error === `Заполните поле: ${field.label || field.key}`
    || error === `${field.key}: выберите изображение из загруженных`
  )));
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function validatePostForRender(studioRoot, postId) {
  const post = await getPost(studioRoot, postId);
  const assetPaths = await getPostAssetPathSet(studioRoot, postId);
  return collectPostValidationErrors(post, assetPaths);
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {number} cardIndex
 */
/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {number} cardIndex
 * @param {{ video?: boolean }} [options]
 */
export async function renderPostCard(studioRoot, postId, cardIndex, options = {}) {
  await syncEmojiToImageCards(studioRoot, postId);
  const post = await getPost(studioRoot, postId);
  const card = post.cards.find((c) => c.cardIndex === cardIndex);
  if (!card) {
    throw new Error(`Карточка ${cardIndex} не найдена`);
  }

  const assetPaths = await getPostAssetPathSet(studioRoot, postId);
  const generatedVideo = post.generation?.videoAssets?.[card.cardIndex];
  const hasGeneratedVideo = assetPaths.has(generatedVideo);
  const errors = filterImageFieldErrors(
    validateCardProps(card.props || {}, card.fields || [], assetPaths, card.metaPropKeys),
    hasGeneratedVideo ? card.fields || [] : [],
  );
  if (errors.length > 0) {
    const err = new Error('Заполните все поля карточки');
    err.details = [{cardIndex, label: card.label, errors}];
    throw err;
  }

  const isGeneratedVideoCard =
    isRubric02Template(/** @type {string} */ (post.templateId))
    && generatedVideo
    && hasGeneratedVideo;
  if (isGeneratedVideoCard) {
    const prevCards = post.lastRender?.cards ?? [];
    const result = {
      cardIndex: card.cardIndex,
      label: card.label,
      compositionId: card.compositionId,
      stillFrame: null,
      stillUrl: null,
      videoUrl: `/public/${generatedVideo}`,
      source: 'generated-video',
    };

    const nextCards = [...prevCards.filter((c) => c.cardIndex !== cardIndex), result].sort(
      (a, b) => a.cardIndex - b.cardIndex,
    );

    post.lastRender = {
      at: new Date().toISOString(),
      cards: nextCards,
    };
    post.updatedAt = post.lastRender.at;
    await writeFile(postPath(studioRoot, postId), `${JSON.stringify(post, null, 2)}\n`, 'utf8');

    return {post, result};
  }

  const outRelative = path.join('posts', postId, String(card.cardIndex));
  const urlBase = `/renders/posts/${postId}/${card.cardIndex}`;

  const includeVideo = options.video !== false;
  const includeStill = options.still !== false;
  const renderProps = resolveRubricCardRenderProps(post, card);
  const rendered = await renderComposition(studioRoot, card.compositionId, renderProps, {
    propsOnly: true,
    outRelative,
    urlBase,
    durationFrames: card.durationFrames,
    video: includeVideo,
    still: includeStill,
  });

  if (
    includeVideo
    && hasGeneratedVideo
    && isRubric01Template(/** @type {string} */ (post.templateId))
    && rendered.videoPath
  ) {
    await renderRubric01VideoOverlay(studioRoot, postId, generatedVideo, rendered.videoPath, card, renderProps);
  }

  const prevCards = post.lastRender?.cards ?? [];
  const prevCard = prevCards.find((c) => c.cardIndex === cardIndex);

  const result = {
    cardIndex: card.cardIndex,
    label: card.label,
    compositionId: card.compositionId,
    stillFrame: rendered.stillFrame,
    stillUrl: includeStill ? (rendered.stillUrl ?? prevCard?.stillUrl ?? null) : null,
    videoUrl: includeVideo
      ? (rendered.videoUrl ?? prevCard?.videoUrl ?? null)
      : (isRubric02Template(post.templateId) ? null : (prevCard?.videoUrl ?? null)),
  };

  const nextCards = [...prevCards.filter((c) => c.cardIndex !== cardIndex), result].sort(
    (a, b) => a.cardIndex - b.cardIndex,
  );

  post.lastRender = {
    at: new Date().toISOString(),
    cards: nextCards,
  };
  post.updatedAt = post.lastRender.at;
  await writeFile(postPath(studioRoot, postId), `${JSON.stringify(post, null, 2)}\n`, 'utf8');

  return {post, result};
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function renderPost(studioRoot, postId) {
  const post = await getPost(studioRoot, postId);
  const assetPaths = await getPostAssetPathSet(studioRoot, postId);
  const validationErrors = collectPostValidationErrors(post, assetPaths);

  if (validationErrors.length > 0) {
    const err = new Error('Заполните все поля перед рендером');
    err.details = validationErrors;
    throw err;
  }

  const results = [];
  for (const card of post.cards) {
    const {result} = await renderPostCard(studioRoot, postId, card.cardIndex);
    results.push(result);
  }

  const updated = await getPost(studioRoot, postId);
  return {post: updated, results};
}
