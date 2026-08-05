#!/usr/bin/env node
/**
 * One-time migration: legacy Format → Rubric IDs, quote→fact, titleAccent→item.
 * Usage: node tools/migrate-rubrics.mjs [--studio-root=.]
 */
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LEGACY_TEMPLATE_ALIASES, RUBRIC01_ID, RUBRIC02_ID, RUBRIC03_ID, RUBRIC04_ID, RUBRIC05_ID} from './rubric/rubric-ids.mjs';
import {migrateCardFields, migratePostCardProps, syncCardPropAliases} from './card-props.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = process.argv.includes('--studio-root')
  ? process.argv[process.argv.indexOf('--studio-root') + 1]
  : path.resolve(__dirname, '..');

const TEMPLATE_FILE_MAP = {
  'format-01.json': {out: 'rubric-01.json', id: RUBRIC01_ID, name: 'Rubric 01'},
  'helloiam-wine-v1.json': {out: 'rubric-02.json', id: RUBRIC02_ID, name: 'Rubric 02'},
  'iam-matsun-deep-dive.json': {out: 'rubric-03.json', id: RUBRIC03_ID, name: 'Rubric 03'},
  'green-plate-intro.json': {out: 'rubric-04.json', id: RUBRIC04_ID, name: 'Rubric 04'},
  'format-05-news.json': {out: 'rubric-05.json', id: RUBRIC05_ID, name: 'Rubric 05'},
};

function migrateTemplateJson(data, meta) {
  data.id = meta.id;
  data.name = meta.name;
  if (typeof data.description === 'string') {
    data.description = data.description
      .replace(/Format 0(\d)/g, 'Rubric 0$1')
      .replace(/Posts?\s+\d+[,\s\d]*/gi, '')
      .replace(/matsun|wine|lavash|MATSUN|Wine/gi, '')
      .trim();
  }
  for (const card of data.cards || []) {
    if (card.fields) migrateCardFields(card.fields);
    if (card.defaultProps) {
      syncCardPropAliases(card.defaultProps);
      if (card.defaultProps.titleAccent && !card.defaultProps.item) {
        card.defaultProps.item = card.defaultProps.titleAccent;
      }
      if (card.defaultProps.quote && !card.defaultProps.fact) {
        card.defaultProps.fact = card.defaultProps.quote;
      }
      if (card.defaultProps.item === 'MATSUN' || card.defaultProps.item === 'FOOD') {
        card.defaultProps.item = 'ITEM';
        card.defaultProps.titleAccent = 'ITEM';
      }
    }
  }
  return data;
}

function migratePost(post) {
  const legacyId = post.templateId;
  if (LEGACY_TEMPLATE_ALIASES[legacyId]) {
    post.templateId = LEGACY_TEMPLATE_ALIASES[legacyId];
    if (typeof post.templateName === 'string') {
      post.templateName = post.templateName.replace(/Format\s*0(\d)/i, 'Rubric 0$1');
    }
  }
  if (!post.colorStyleId) post.colorStyleId = 'gray-blue';
  migratePostCardProps(post);
  return post;
}

async function migrateTemplates() {
  const dir = path.join(studioRoot, 'data', 'story-templates');
  for (const [src, meta] of Object.entries(TEMPLATE_FILE_MAP)) {
    const srcPath = path.join(dir, src);
    try {
      const data = JSON.parse(await readFile(srcPath, 'utf8'));
      const migrated = migrateTemplateJson(data, meta);
      await writeFile(path.join(dir, meta.out), `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');
      console.log(`Template: ${src} → ${meta.out}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

async function migratePosts() {
  const dir = path.join(studioRoot, 'data', 'posts');
  let count = 0;
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(dir, file);
    const post = migratePost(JSON.parse(await readFile(filePath, 'utf8')));
    await writeFile(filePath, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    count += 1;
  }
  console.log(`Posts migrated: ${count}`);
}

await migrateTemplates();
await migratePosts();
console.log('Done.');
