import {mkdir, readFile, unlink, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {getPost} from './posts-service.mjs';

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const MAX_BYTES = 12 * 1024 * 1024;
const POST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function postPath(studioRoot, postId) {
  return path.join(studioRoot, 'data', 'posts', `${postId}.json`);
}

function postAssetsRelPrefix(postId) {
  return `generated/posts/${postId}`;
}

function postAssetsDir(studioRoot, postId) {
  return path.join(studioRoot, 'public', 'generated', 'posts', postId);
}

function assertPostId(postId) {
  if (!POST_ID_RE.test(postId)) {
    throw new Error('Недопустимый id поста');
  }
}

function normalizePostAssetPath(assetPath, postId) {
  const normalized = assetPath.trim().replace(/^\/+/, '');
  const prefix = `${postAssetsRelPrefix(postId)}/`;
  if (!normalized.startsWith(prefix) || normalized.includes('..') || normalized.includes('\\')) {
    throw new Error('Недопустимый путь изображения');
  }
  return normalized;
}

async function savePost(studioRoot, post) {
  post.updatedAt = new Date().toISOString();
  await writeFile(postPath(studioRoot, post.id), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
}

/**
 * @param {object} post
 */
export function listPostAssetPaths(post) {
  if (!Array.isArray(post.assets)) return [];
  return post.assets.filter((p) => typeof p === 'string' && p.trim());
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function listPostAssets(studioRoot, postId) {
  assertPostId(postId);
  const post = await getPost(studioRoot, postId);
  return listPostAssetPaths(post).map((assetPath) => ({
    path: assetPath,
    name: path.basename(assetPath),
  }));
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function getPostAssetPathSet(studioRoot, postId) {
  const assets = await listPostAssets(studioRoot, postId);
  return new Set(assets.map((a) => a.path));
}

/**
 * @param {unknown} assetPath
 * @param {Set<string>} assetPaths
 */
export function isPostAssetRegistered(assetPath, assetPaths) {
  return typeof assetPath === 'string' && assetPath.trim() !== '' && assetPaths.has(assetPath);
}

/**
 * @param {object} post
 * @param {string} base
 * @param {string} ext
 */
function uniqueFilename(post, base, ext) {
  const existing = new Set(listPostAssetPaths(post).map((p) => path.basename(p)));
  let candidate = `${base}${ext}`;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-${n}${ext}`;
    n += 1;
  }
  return candidate;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {{ buffer: Buffer, originalName: string }} input
 */
export async function uploadPostAsset(studioRoot, postId, input) {
  assertPostId(postId);
  const buffer = input.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Файл пустой');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('Файл слишком большой (макс. 12 МБ)');
  }

  const ext = path.extname(input.originalName || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Допустимы PNG, JPG, WEBP, SVG');
  }

  const post = await getPost(studioRoot, postId);
  if (!Array.isArray(post.assets)) post.assets = [];

  const base = slugify(path.basename(input.originalName || 'image', ext)) || `image-${Date.now()}`;
  const filename = uniqueFilename(post, base, ext);
  const relPath = `${postAssetsRelPrefix(postId)}/${filename}`;

  await mkdir(postAssetsDir(studioRoot, postId), {recursive: true});
  await writeFile(path.join(postAssetsDir(studioRoot, postId), filename), buffer);

  if (!post.assets.includes(relPath)) {
    post.assets.push(relPath);
    post.assets.sort();
    await savePost(studioRoot, post);
  }

  return {path: relPath, name: filename, size: buffer.length};
}

/**
 * @param {object} post
 * @param {string} assetPath
 */
function clearAssetFromPostCards(post, assetPath) {
  let clearedRefs = 0;
  for (const card of post.cards || []) {
    for (const field of card.fields || []) {
      if (field.type !== 'image') continue;
      if (card.props?.[field.key] === assetPath) {
        card.props[field.key] = '';
        clearedRefs += 1;
      }
    }
  }
  return clearedRefs;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} assetPath
 */
export async function deletePostAsset(studioRoot, postId, assetPath) {
  assertPostId(postId);
  const normalized = normalizePostAssetPath(assetPath, postId);
  const post = await getPost(studioRoot, postId);
  if (!Array.isArray(post.assets)) post.assets = [];

  const index = post.assets.indexOf(normalized);
  if (index === -1) {
    throw new Error('Изображение не найдено в этом посте');
  }

  post.assets.splice(index, 1);
  const clearedRefs = clearAssetFromPostCards(post, normalized);
  await savePost(studioRoot, post);
  await unlink(path.join(studioRoot, 'public', normalized)).catch(() => {});

  return {path: normalized, deleted: true, clearedRefs};
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string[]} assetPaths
 */
export async function deletePostAssets(studioRoot, postId, assetPaths) {
  let clearedRefs = 0;
  const deleted = [];
  for (const assetPath of assetPaths) {
    const result = await deletePostAsset(studioRoot, postId, assetPath);
    clearedRefs += result.clearedRefs;
    deleted.push(result.path);
  }
  return {deleted, clearedRefs};
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function deleteAllPostAssets(studioRoot, postId) {
  assertPostId(postId);
  await rm(postAssetsDir(studioRoot, postId), {recursive: true, force: true});
}
