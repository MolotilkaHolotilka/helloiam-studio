import {mkdir, readdir, readFile, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getPostAssetPathSet, deleteAllPostAssets} from './post-assets-service.mjs';
import {
  applyPostSettingsToCards,
  normalizePostSettings,
  syncPostName,
  validatePostSettingsPatch,
} from './post-settings.mjs';
import {applyRubric01TitlesToPost} from '../generation/rubric-01-titles.mjs';
import {applyFormat05FixedToPost} from '../generation/format-05-news.mjs';
import {LEGACY_TEMPLATE_ALIASES, normalizeTemplateId, RUBRIC05_ID, RUBRIC06_ID} from '../rubric/rubric-ids.mjs';
import {migratePostCardProps, syncCardPropAliases} from '../card-props.mjs';
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
 * @param {Record<string, unknown>} props
 * @param {{ fields?: Array<{ key: string }>, metaPropKeys?: string[] }} card
 */
export function pickCardProps(props, card) {
  const allowed = new Set((card.fields || []).map((f) => f.key));
  const aliasKeys = new Set(['quote', 'titleAccent']);
  const meta = new Set([...RUBRIC_META_PROP_KEY_SET, ...(card.metaPropKeys || [])]);
  const out = /** @type {Record<string, unknown>} */ ({});
  for (const [key, value] of Object.entries(props || {})) {
    if (allowed.has(key) || meta.has(key) || aliasKeys.has(key)) out[key] = value;
  }
  syncCardPropAliases(out);
  return out;
}

/**
 * @param {Record<string, unknown>} post
 */
function sanitizePostCardProps(post) {
  for (const card of post.cards || []) {
    card.props = pickCardProps(card.props, card);
  }
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
  const aliasKeys = new Set(['quote', 'titleAccent']);
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
    if (aliasKeys.has(key)) continue;
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
    name: template.name,
    category: template.id === RUBRIC05_ID ? 'news' : 'food',
    colorStyleId: 'gray-blue',
    themeColor: '#D9DDE0',
    presetId: 'soft-float',
    subject: '',
    generation: {status: 'draft'},
    createdAt: now,
    updatedAt: now,
    assets: [],
    cards: template.cards.map((card) => ({
      cardIndex: card.cardIndex,
      compositionId: card.compositionId,
      label: card.label,
      fields: card.fields,
      metaPropKeys: card.metaPropKeys ?? [],
      props: (() => {
        const props = {...card.defaultProps};
        for (const field of card.fields || []) {
          if (field.type === 'image') props[field.key] = '';
        }
        return props;
      })(),
      durationFrames: card.durationFrames,
    })),
  };

  normalizePostSettings(post);
  applyPostSettingsToCards(post);
  applyRubric01TitlesToPost(post);
  applyFormat05FixedToPost(post);

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
        const firstCard = post.cards?.[0];
        normalizePostSettings(post);
        posts.push({
          id: post.id,
          templateId: post.templateId,
          templateName: post.templateName,
          name: post.name,
          subject: post.subject,
          category: post.category,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          cardCount: post.cards?.length ?? 0,
          hasRender: Boolean(post.lastRender?.cards?.length),
          lastRender: post.lastRender ?? null,
          firstCard: firstCard
            ? {
                compositionId: firstCard.compositionId,
                props: firstCard.props ?? {},
                label: firstCard.label,
              }
            : null,
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
    const post = JSON.parse(await readFile(postPath(studioRoot, postId), 'utf8'));
    if (LEGACY_TEMPLATE_ALIASES[post.templateId]) {
      post.templateId = normalizeTemplateId(post.templateId);
    }
    migratePostCardProps(post);
    normalizePostSettings(post);
    applyPostSettingsToCards(post);
    sanitizePostCardProps(post);
    applyRubric01TitlesToPost(post);
    applyFormat05FixedToPost(post);
    sanitizePostCardProps(post);
    return post;
  } catch {
    throw new Error(`Post not found: ${postId}`);
  }
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {Record<string, unknown>} patch
 * @param {{ admin?: boolean }} [options]
 */
export async function updatePostSettings(studioRoot, postId, patch, options = {}) {
  const post = await getPost(studioRoot, postId);
  const {errors, patch: validated} = validatePostSettingsPatch(patch, options);
  if (errors.length > 0) {
    const err = new Error('Validation failed');
    err.details = errors;
    throw err;
  }

  if (validated.category !== undefined) post.category = validated.category;
  if (validated.colorStyleId !== undefined) post.colorStyleId = validated.colorStyleId;
  if (validated.themeColor !== undefined) {
    /* themeColor derived from colorStyleId in normalizePostSettings */
  }
  if (validated.presetId !== undefined) post.presetId = validated.presetId;
  if (validated.subject !== undefined) {
    post.subject = validated.subject;
  }
  if (validated.name !== undefined) post.name = validated.name;

  normalizePostSettings(post);
  applyPostSettingsToCards(post);
  applyRubric01TitlesToPost(post);
  syncPostName(post);
  post.updatedAt = new Date().toISOString();
  await writeFile(postPath(studioRoot, postId), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  return post;
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
    const assetPaths = await getPostAssetPathSet(studioRoot, postId);
    const errors = validateCardProps(props, card.fields || [], assetPaths, card.metaPropKeys);
    if (errors.length > 0) {
      const err = new Error('Validation failed');
      err.details = errors;
      throw err;
    }
  }

  card.props = pickCardProps({...(card.props || {}), ...props}, card);
  applyPostSettingsToCards(post);
  applyRubric01TitlesToPost(post);
  post.updatedAt = new Date().toISOString();
  await writeFile(postPath(studioRoot, postId), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  return post;
}

/**
 * @param {string} studioRoot
 */
export async function listAllPostsFull(studioRoot) {
  const dir = postsDir(studioRoot);
  try {
    const files = await readdir(dir);
    const posts = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        posts.push(JSON.parse(await readFile(path.join(dir, file), 'utf8')));
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
 */
export async function listAssetBindings(studioRoot) {
  const posts = await listAllPostsFull(studioRoot);
  /** @type {Array<{ path: string, postId: string, postLabel: string, formatId: string, formatName: string, cardIndex: number, cardLabel: string, fieldKey: string, updatedAt: string }>} */
  const bindings = [];

  for (const post of posts) {
    const formatId = post.templateId || '';
    const formatName = post.templateName || formatId || 'Без формата';
    const postLabel = post.name || post.templateName || formatId || post.id;

    for (const card of post.cards || []) {
      for (const field of card.fields || []) {
        if (field.type !== 'image') continue;
        const assetPath = card.props?.[field.key];
        if (typeof assetPath !== 'string' || !assetPath.trim()) continue;
        bindings.push({
          path: assetPath.trim(),
          postId: post.id,
          postLabel,
          formatId,
          formatName,
          cardIndex: card.cardIndex,
          cardLabel: card.label || `Карточка ${card.cardIndex + 1}`,
          fieldKey: field.key,
          updatedAt: post.updatedAt || post.createdAt || '',
        });
      }
    }
  }

  return bindings;
}

/**
 * @param {string} studioRoot
 * @param {string} assetPath
 */
export async function clearAssetFromAllPosts(studioRoot, assetPath) {
  const normalized = assetPath.trim().replace(/^\/+/, '');
  const posts = await listAllPostsFull(studioRoot);
  let touchedPosts = 0;
  let clearedRefs = 0;

  for (const post of posts) {
    let changed = false;
    for (const card of post.cards || []) {
      for (const field of card.fields || []) {
        if (field.type !== 'image') continue;
        if (card.props?.[field.key] === normalized) {
          card.props[field.key] = '';
          clearedRefs += 1;
          changed = true;
        }
      }
    }
    if (changed) {
      post.updatedAt = new Date().toISOString();
      await writeFile(postPath(studioRoot, post.id), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
      touchedPosts += 1;
    }
  }

  return {touchedPosts, clearedRefs};
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function deletePost(studioRoot, postId) {
  try {
    await deleteAllPostAssets(studioRoot, postId);
    await unlink(postPath(studioRoot, postId));
    return {id: postId};
  } catch {
    throw new Error(`Пост не найден: ${postId}`);
  }
}
