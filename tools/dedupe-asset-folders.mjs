#!/usr/bin/env node
/**
 * Remove duplicate emoji/card files (legacy numbered emojis, card-v2-*).
 * Migrates post JSON emojiId references to kept filenames.
 *
 * Usage:
 *   node tools/dedupe-asset-folders.mjs           # dry-run
 *   node tools/dedupe-asset-folders.mjs --apply   # delete + migrate
 */
import {readdir, readFile, writeFile, unlink, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildEmojiIdMigrationMap,
  dedupeEmojiFilenames,
} from './emojis/emojis-service.mjs';
import {
  buildCardIdMigrationMap,
  dedupeCardFilenames,
} from './cards/cards-service.mjs';

const studioRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const ALLOWED_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);

async function listFiles(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  return entries
    .filter((e) => e.isFile() && ALLOWED_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name);
}

function remapId(value, emojiMap, cardMap) {
  if (typeof value !== 'string' || !value.trim()) return value;
  const base = path.basename(value);
  return emojiMap.get(base) || cardMap.get(base) || value;
}

function migratePostObject(post, emojiMap, cardMap) {
  let changed = false;
  const touch = (key) => {
    if (!(key in post)) return;
    const next = remapId(post[key], emojiMap, cardMap);
    if (next !== post[key]) {
      post[key] = next;
      changed = true;
    }
  };

  touch('selectedEmojiId');
  if (Array.isArray(post.selectedEmojis)) {
    for (const entry of post.selectedEmojis) {
      if (!entry || typeof entry !== 'object') continue;
      const next = remapId(entry.emojiId, emojiMap, cardMap);
      if (next !== entry.emojiId) {
        entry.emojiId = next;
        changed = true;
      }
    }
  }

  return changed;
}

async function migratePosts(emojiMap, cardMap) {
  const postsDir = path.join(studioRoot, 'data', 'posts');
  let files;
  try {
    files = await readdir(postsDir);
  } catch {
    return 0;
  }

  let updated = 0;
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const filePath = path.join(postsDir, file);
    const post = JSON.parse(await readFile(filePath, 'utf8'));
    if (!migratePostObject(post, emojiMap, cardMap)) continue;
    if (apply) {
      post.updatedAt = new Date().toISOString();
      await writeFile(filePath, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    }
    updated += 1;
    console.log(`  post ${file}: emojiId references updated`);
  }
  return updated;
}

async function removeFiles(dir, filenames) {
  for (const name of filenames) {
    const filePath = path.join(dir, name);
    if (apply) {
      await unlink(filePath);
      console.log(`  deleted ${name}`);
    } else {
      try {
        const s = await stat(filePath);
        console.log(`  would delete ${name} (${Math.round(s.size / 1024)} KB)`);
      } catch {
        console.log(`  would delete ${name}`);
      }
    }
  }
}

async function main() {
  const emojisDir = path.join(studioRoot, 'ALL EMOJIS');
  const cardsDir = path.join(studioRoot, 'ALL CARDS');

  const emojiFiles = await listFiles(emojisDir);
  const cardFiles = await listFiles(cardsDir);

  const emojiDedupe = dedupeEmojiFilenames(emojiFiles);
  const cardDedupe = dedupeCardFilenames(cardFiles);
  const emojiMap = buildEmojiIdMigrationMap(emojiFiles);
  const cardMap = buildCardIdMigrationMap(cardFiles);

  console.log(apply ? '==> APPLY dedupe' : '==> DRY RUN (pass --apply to delete)');
  console.log(`ALL EMOJIS: ${emojiFiles.length} files → keep ${emojiDedupe.keep.length}, remove ${emojiDedupe.remove.length}`);
  console.log(`ALL CARDS: ${cardFiles.length} files → keep ${cardDedupe.keep.length}, remove ${cardDedupe.remove.length}`);

  if (emojiDedupe.remove.length) {
    console.log('\nEmojis:');
    await removeFiles(emojisDir, emojiDedupe.remove);
  }
  if (cardDedupe.remove.length) {
    console.log('\nCards:');
    await removeFiles(cardsDir, cardDedupe.remove);
  }

  const postsUpdated = await migratePosts(emojiMap, cardMap);
  console.log(`\nPosts: ${postsUpdated} ${apply ? 'updated' : 'would update'}`);

  if (!apply && (emojiDedupe.remove.length || cardDedupe.remove.length || postsUpdated)) {
    console.log('\nRe-run with --apply to commit changes.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
