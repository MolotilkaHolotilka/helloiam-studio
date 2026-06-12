import {listEmojis} from '../emojis/emojis-service.mjs';
import {addEmojiToPost} from '../emojis/emojis-service.mjs';

/**
 * @param {string} studioRoot
 * @param {string} subject
 * @param {string} [emojiPrompt]
 */
export async function findBestEmojiFilename(studioRoot, subject, emojiPrompt = '') {
  const emojis = await listEmojis(studioRoot);
  const subjectLower = subject.toLowerCase().trim();
  const query = `${subject} ${emojiPrompt}`.toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const emoji of emojis) {
    const name = emoji.name.toLowerCase();
    const id = emoji.id.toLowerCase();
    let score = 0;

    if (subjectLower && (name.includes(subjectLower) || id.includes(subjectLower))) score += 12;
    if (emojiPrompt && (name.includes(emojiPrompt.toLowerCase().slice(0, 12)) || query.includes(name))) {
      score += 8;
    }

    for (const word of subjectLower.split(/[\s,_-]+/)) {
      if (word.length < 3) continue;
      if (name.includes(word) || id.includes(word)) score += 4;
    }

    if (score > bestScore) {
      bestScore = score;
      best = emoji.id;
    }
  }

  return bestScore >= 4 ? best : null;
}

/**
 * @param {import('../posts/posts-service.mjs').getPost extends Function ? Awaited<ReturnType<import('../posts/posts-service.mjs').getPost>> : never} post
 * @param {string} studioRoot
 */
export function findEmojiAssetInPost(post, studioRoot) {
  const assets = post.assets || [];
  for (let i = assets.length - 1; i >= 0; i--) {
    const assetPath = assets[i];
    const base = assetPath.split('/').pop()?.toLowerCase() || '';
    if (/lavash|matsun|sujukh|dolma|wine|emoji|tolma|baklava|pomegranate|apricot/.test(base)) {
      return assetPath;
    }
  }
  return null;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} subject
 * @param {string} [emojiPrompt]
 */
export async function resolveCoverEmojiAsset(studioRoot, postId, post, subject, emojiPrompt) {
  const existing = findEmojiAssetInPost(post, studioRoot);
  if (existing) return existing;

  const filename = await findBestEmojiFilename(studioRoot, subject, emojiPrompt);
  if (!filename) return null;

  const asset = await addEmojiToPost(studioRoot, postId, filename);
  return asset.path;
}
