import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {renderComposition} from '../render/render-composition.mjs';
import {getPostAssetPathSet} from './post-assets-service.mjs';
import {getPost, validateCardProps} from './posts-service.mjs';

function postPath(studioRoot, postId) {
  return path.join(studioRoot, 'data', 'posts', `${postId}.json`);
}

/**
 * @param {object} post
 * @param {Set<string>} assetPaths
 */
export function collectPostValidationErrors(post, assetPaths) {
  const validationErrors = [];
  for (const card of post.cards) {
    const errors = validateCardProps(card.props || {}, card.fields || [], assetPaths, card.metaPropKeys);
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
  const post = await getPost(studioRoot, postId);
  const card = post.cards.find((c) => c.cardIndex === cardIndex);
  if (!card) {
    throw new Error(`Карточка ${cardIndex} не найдена`);
  }

  const assetPaths = await getPostAssetPathSet(studioRoot, postId);
  const errors = validateCardProps(card.props || {}, card.fields || [], assetPaths, card.metaPropKeys);
  if (errors.length > 0) {
    const err = new Error('Заполните все поля карточки');
    err.details = [{cardIndex, label: card.label, errors}];
    throw err;
  }

  const outRelative = path.join('posts', postId, String(card.cardIndex));
  const urlBase = `/renders/posts/${postId}/${card.cardIndex}`;

  const includeVideo = options.video !== false;
  const rendered = await renderComposition(studioRoot, card.compositionId, card.props, {
    propsOnly: true,
    outRelative,
    urlBase,
    durationFrames: card.durationFrames,
    video: includeVideo,
  });

  const prevCards = post.lastRender?.cards ?? [];
  const prevCard = prevCards.find((c) => c.cardIndex === cardIndex);

  const result = {
    cardIndex: card.cardIndex,
    label: card.label,
    compositionId: card.compositionId,
    stillFrame: rendered.stillFrame,
    stillUrl: rendered.stillUrl,
    videoUrl: rendered.videoUrl ?? prevCard?.videoUrl ?? null,
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
