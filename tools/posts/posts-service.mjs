import {mkdir, readdir, readFile, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {listStudioAssets} from '../assets/studio-assets-service.mjs';
import {RUBRIC_META_PROP_KEY_SET} from '../rubric-meta-props.mjs';
import {loadStoryTemplate} from '../story-templates-service.mjs';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function postsDir(studioRoot) {
  return path.join(studioRoot, 'data', 'posts');
}

function postPath(studioRoot, postId) {
  return path.join(postsDir(studioRoot), `${postId}.json`);
}

/**
 * @param {Record<string, string>} props
 * @param {Array<{ key: string, type: string }>} fields
 * @param {Set<string>} assetPaths
 * @param {string[]} [metaPropKeys]
 */
export function validateCardProps(props, fields, assetPaths, metaPropKeys = []) {
  const errors = [];
  const allowedKeys = new Set(fields.map((f) => f.key));
  const internalKeys = new Set([...RUBRIC_META_PROP_KEY_SET, ...metaPropKeys]);

  for (const field of fields) {
    const value = props[field.key];
    if (value === undefined || value === '') {
      errors.push(`Заполните поле: ${field.label || field.key}`);
      continue;
    }
    switch (field.type) {
      case 'string':
      case 'textarea':
        if (typeof value !== 'string') errors.push(`${field.key}: должно быть строкой`);
        break;
      case 'color':
        if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
          errors.push(`${field.key}: цвет в формате #RRGGBB`);
        }
        break;
      case 'image':
        if (typeof value !== 'string' || !assetPaths.has(value)) {
          errors.push(`${field.key}: выберите изображение из загруженных`);
        }
        break;
      default:
        break;
    }
  }

  for (const key of Object.keys(props)) {
    if (internalKeys.has(key)) continue;
    if (!allowedKeys.has(key)) errors.push(`Неизвестное поле: ${key}`);
  }

  return errors;
}

/**
 * @param {string} studioRoot
 * @param {string} templateId
 */
export async function createPost(studioRoot, templateId) {
  const template = await loadStoryTemplate(studioRoot, templateId);
  const now = new Date().toISOString();
  const id = randomUUID();

  const post = {
    id,
    templateId: template.id,
    templateName: template.name,
    createdAt: now,
    updatedAt: now,
    cards: template.cards.map((card) => ({
      cardIndex: card.cardIndex,
      compositionId: card.compositionId,
      label: card.label,
      fields: card.fields,
      metaPropKeys: card.metaPropKeys ?? [],
      props: {...card.defaultProps},
      durationFrames: card.durationFrames,
    })),
  };

  await mkdir(postsDir(studioRoot), {recursive: true});
  await writeFile(postPath(studioRoot, id), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  return post;
}

/**
 * @param {string} studioRoot
 */
export async function listPosts(studioRoot) {
  const dir = postsDir(studioRoot);
  try {
    const files = await readdir(dir);
    const posts = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const post = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
        posts.push({
          id: post.id,
          templateId: post.templateId,
          templateName: post.templateName,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          cardCount: post.cards?.length ?? 0,
          hasRender: Boolean(post.lastRender?.cards?.length),
          lastRender: post.lastRender ?? null,
        });
      } catch {
        // skip corrupt
      }
    }
    posts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return posts;
  } catch {
    return [];
  }
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function getPost(studioRoot, postId) {
  try {
    return JSON.parse(await readFile(postPath(studioRoot, postId), 'utf8'));
  } catch {
    throw new Error(`Пост не найден: ${postId}`);
  }
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {number} cardIndex
 * @param {Record<string, string>} props
 * @param {{ strict?: boolean }} [options]
 */
export async function updatePostCard(studioRoot, postId, cardIndex, props, options = {}) {
  const post = await getPost(studioRoot, postId);
  const card = post.cards.find((c) => c.cardIndex === cardIndex);
  if (!card) {
    throw new Error(`Карточка ${cardIndex} не найдена`);
  }

  if (options.strict) {
    const assets = await listStudioAssets(studioRoot);
    const assetPaths = new Set(assets.map((a) => a.path));
    const errors = validateCardProps(props, card.fields || [], assetPaths, card.metaPropKeys);
    if (errors.length > 0) {
      const err = new Error('Validation failed');
      err.details = errors;
      throw err;
    }
  }

  card.props = {...(card.props || {}), ...props};
  post.updatedAt = new Date().toISOString();
  await writeFile(postPath(studioRoot, postId), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  return post;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function deletePost(studioRoot, postId) {
  try {
    await unlink(postPath(studioRoot, postId));
    return {id: postId};
  } catch {
    throw new Error(`Пост не найден: ${postId}`);
  }
}
