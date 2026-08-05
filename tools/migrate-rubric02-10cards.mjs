#!/usr/bin/env node
/**
 * Migration: expand existing Rubric02 posts from 2 cards to 10 cards.
 * Even cards (0,2,4,6,8) = Post103Css (emoji card)
 * Odd  cards (1,3,5,7,9) = Post104Css (AI-photo card)
 *
 * Usage: node tools/migrate-rubric02-10cards.mjs
 */
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(STUDIO_ROOT, 'data', 'posts');
const TEMPLATE_PATH = path.join(STUDIO_ROOT, 'data', 'story-templates', 'rubric-02.json');

const RUBRIC02_IDS = new Set(['Rubric02', 'HelloIamWineV1']);

async function main() {
  const template = JSON.parse(await readFile(TEMPLATE_PATH, 'utf8'));
  const templateCards = template.cards; // 10 cards

  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.json'));
  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const post = JSON.parse(await readFile(filePath, 'utf8'));
    if (!RUBRIC02_IDS.has(post.templateId)) continue;
    if ((post.cards || []).length >= 10) {
      console.log(`  SKIP (already 10 cards): ${file}`);
      skipped++;
      continue;
    }

    const existingByIndex = new Map((post.cards || []).map((c) => [c.cardIndex, c]));

    // Build a full 10-card array using existing cards where available
    post.cards = templateCards.map((tCard) => {
      if (existingByIndex.has(tCard.cardIndex)) {
        // Keep existing card but ensure fields/label/compositionId match template
        const existing = existingByIndex.get(tCard.cardIndex);
        const isOddCard = tCard.cardIndex % 2 !== 0;
        return {
          ...existing,
          compositionId: tCard.compositionId,
          label: tCard.label,
          fields: tCard.fields,
          durationFrames: tCard.durationFrames ?? existing.durationFrames,
          props: {
            ...tCard.defaultProps,
            ...existing.props,
            // Odd (AI-photo) cards should never have emoji images
            ...(isOddCard ? {image: ''} : {}),
          },
        };
      }
      // New card — use template defaults (blank image for odd/photo cards)
      return {
        cardIndex: tCard.cardIndex,
        compositionId: tCard.compositionId,
        label: tCard.label,
        fields: tCard.fields,
        metaPropKeys: tCard.metaPropKeys ?? [],
        props: {...tCard.defaultProps, image: ''},
        durationFrames: tCard.durationFrames,
      };
    });

    post.updatedAt = new Date().toISOString();
    await writeFile(filePath, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    console.log(`  MIGRATED (${existingByIndex.size}→10 cards): ${file} [${post.name || post.id}]`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
