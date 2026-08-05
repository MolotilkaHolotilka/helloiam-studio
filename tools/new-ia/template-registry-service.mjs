import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function describeStoryTemplate(template, file) {
  const cards = Array.isArray(template.cards) ? template.cards : [];
  const fields = unique(cards.flatMap((card) => (card.fields || []).map((field) => `${field.key}:${field.type || 'string'}`)));
  return {
    id: template.id,
    name: template.name || template.id,
    kind: 'remotion-story',
    status: /^rubric-/i.test(file) ? 'production' : 'legacy',
    sourceFile: `data/story-templates/${file}`,
    canvas: {width: template.width || null, height: template.height || null},
    fps: template.fps || null,
    durationPerCardSec: template.durationPerCardSec || null,
    cardCount: cards.length,
    compositionIds: unique(cards.map((card) => card.compositionId)),
    fields,
    settings: ['canvas', 'fps', 'duration', 'card sequence', 'composition', 'fields', 'default props', 'render output'],
  };
}

export async function getBrandPresets(studioRoot) {
  return readJson(path.join(studioRoot, 'data', 'brand-presets.json'));
}

export async function getTemplateRegistry(studioRoot) {
  const storyDir = path.join(studioRoot, 'data', 'story-templates');
  const storyFiles = (await readdir(storyDir)).filter((file) => file.endsWith('.json')).sort();
  const storyTemplates = await Promise.all(storyFiles.map(async (file) => describeStoryTemplate(await readJson(path.join(storyDir, file)), file)));
  const productCard = await readJson(path.join(studioRoot, 'data', 'html-templates', 'product-card-v1.json'));
  return {
    generatedAt: new Date().toISOString(),
    authoringModel: {
      method: 'Direct HTML/CSS/JS layout → preview → render',
      figmaRequired: false,
      animationOptions: ['CSS', 'JavaScript', 'Remotion'],
      ownership: 'Templates are authored locally by the internal team or coding agents, then registered for generators.',
    },
    universalContract: {
      input: ['brand preset', 'template schema', 'content props', 'media assets'],
      template: ['HTML/component structure', 'CSS tokens', 'field schema', 'validation', 'animation', 'render settings'],
      output: ['preview', 'HTML/CSS', 'JSON props', 'PNG/JPG', 'MP4 when animated'],
    },
    templates: [...storyTemplates, productCard],
  };
}
