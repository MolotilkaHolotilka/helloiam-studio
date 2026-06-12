import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {getPost, updatePostCard} from '../posts/posts-service.mjs';
import {uploadPostAsset} from '../posts/post-assets-service.mjs';

const ALLOWED_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);

function emojisDir(studioRoot) {
  return path.join(studioRoot, 'ALL EMOJIS');
}

function sortEmojiFilename(a, b) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, 'ru');
}

function emojiDisplayName(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/^\d+\s+/, '')
    .trim();
}

/**
 * @param {string} studioRoot
 */
export async function listEmojis(studioRoot) {
  const dir = emojisDir(studioRoot);
  const entries = await readdir(dir, {withFileTypes: true});
  return entries
    .filter((entry) => entry.isFile() && ALLOWED_EXT.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort(sortEmojiFilename)
    .map((filename) => ({
      id: filename,
      name: emojiDisplayName(filename),
      url: `/api/emojis/${encodeURIComponent(filename)}`,
    }));
}

/**
 * @param {string} studioRoot
 * @param {string} filename
 */
export function resolveEmojiPath(studioRoot, filename) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) {
    throw new Error('Недопустимое имя эмодзи');
  }
  const ext = path.extname(safeName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Недопустимый формат эмодзи');
  }
  const resolved = path.resolve(emojisDir(studioRoot), safeName);
  if (!resolved.startsWith(path.resolve(emojisDir(studioRoot)))) {
    throw new Error('Недопустимый путь эмодзи');
  }
  return resolved;
}

/**
 * @param {Record<string, unknown>} post
 */
function findEmojiTargetCard(post) {
  for (const card of post.cards || []) {
    const kind = card.props?.cardKind ?? card.defaultProps?.cardKind;
    if (kind === 'brand') return card;
  }
  for (const card of post.cards || []) {
    const hasEmojiImage = (card.fields || []).some(
      (field) => field.type === 'image' && /эмодзи|стикер/i.test(field.label || ''),
    );
    if (hasEmojiImage) return card;
  }
  return null;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} emojiFilename
 */
export async function addEmojiToPost(studioRoot, postId, emojiFilename) {
  const sourcePath = resolveEmojiPath(studioRoot, emojiFilename);
  const buffer = await readFile(sourcePath);
  const asset = await uploadPostAsset(studioRoot, postId, {
    buffer,
    originalName: path.basename(emojiFilename),
  });

  const post = await getPost(studioRoot, postId);
  const target = findEmojiTargetCard(post);
  if (target) {
    const fieldKey = (target.fields || []).find((field) => field.type === 'image')?.key || 'image';
    await updatePostCard(studioRoot, postId, target.cardIndex, {[fieldKey]: asset.path}, {strict: false});
  }

  return asset;
}
