#!/usr/bin/env node
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rebuildStoryCatalog} from './story-catalog.mjs';

const studioRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesRoot = path.join(studioRoot, 'src', 'templates');
const storyDir = path.join(studioRoot, 'data', 'story-templates');

const WINE_IMG = 'generated/helloiam-wine-armenia.png';

const SOFT_FLOAT = `import React from 'react';
import {GeneratedSoftFloat} from '../../_shared/GeneratedSoftFloat';
import {LAYOUT} from '../layout';
import type {TemplateProps} from '../schema';

export const SoftFloatCard: React.FC<{
  card: TemplateProps;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
}> = ({card, localFrame, segmentFrames, imageSrc}) => (
  <GeneratedSoftFloat
    layout={LAYOUT}
    card={card}
    localFrame={localFrame}
    segmentFrames={segmentFrames}
    imageSrc={imageSrc}
  />
);
`;

const CARDS = [
  {
    dir: 'post-103',
    id: 'Post103Css',
    name: 'Кадр 103 — бренд + вино',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#D9DDE0'},
      layers: [
        {
          key: 'body2',
          role: 'text',
          box: {left: 197, top: 586, width: 687, height: 92},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 96,
            lineHeight: '92px',
            fontWeight: 700,
            fontStyle: 'normal',
            textAlign: 'center',
            color: '#420000',
          },
          defaultText: 'helloiam am',
          defaultColor: '#420000',
        },
        {
          key: 'body4',
          role: 'text',
          box: {left: 525, top: 719, width: 288, height: 88},
          textStyle: {
            fontFamily: 'serif',
            fontSize: 44,
            lineHeight: '44px',
            fontWeight: 400,
            fontStyle: 'italic',
            textAlign: 'center',
            color: '#420000',
          },
          defaultText: 'Say Hello\nto Armenian Wine',
          defaultColor: '#420000',
        },
      ],
      imageLayers: [{left: 579, top: 542, width: 180, height: 180, objectFit: 'cover'}],
    },
    defaults: {
      background: '#D9DDE0',
      body2: 'helloiam am',
      body2Color: '#420000',
      body4: 'Say Hello\nto Armenian Wine',
      body4Color: '#420000',
      image: WINE_IMG,
    },
    fields: [
      {key: 'body2', type: 'string', label: 'Заголовок (helloiam am)'},
      {key: 'body2Color', type: 'color', label: 'Цвет заголовка'},
      {key: 'body4', type: 'textarea', label: 'Подзаголовок'},
      {key: 'body4Color', type: 'color', label: 'Цвет подзаголовка'},
      {key: 'image', type: 'image', label: 'Стикер / фото'},
      {key: 'background', type: 'color', label: 'Фон'},
    ],
  },
  {
    dir: 'post-104',
    id: 'Post104Css',
    name: 'Кадр 104 — фото на весь кадр',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#D9DDE0'},
      layers: [],
      imageLayers: [{left: -135, top: 0, width: 1350, height: 1350, objectFit: 'cover'}],
    },
    defaults: {
      background: '#D9DDE0',
      image: WINE_IMG,
    },
    fields: [
      {key: 'image', type: 'image', label: 'Фото'},
      {key: 'background', type: 'color', label: 'Фон'},
    ],
  },
];

function tsString(value) {
  return JSON.stringify(value);
}

function layoutTs(layout) {
  const layers = layout.layers
    .map((layer) => {
      const textStyle = layer.textStyle
        ? Object.entries(layer.textStyle)
            .map(([k, v]) => `        ${k}: ${tsString(v)},`)
            .join('\n')
        : '';
      return `    {
      key: ${tsString(layer.key)},
      role: ${tsString(layer.role)},
      box: {left: ${layer.box.left}, top: ${layer.box.top}, width: ${layer.box.width}, height: ${layer.box.height}},${
        layer.alignItems ? `\n      alignItems: ${tsString(layer.alignItems)},` : ''
      }
      textStyle: {
${textStyle}
      },
      defaultText: ${tsString(layer.defaultText)},
      defaultColor: ${tsString(layer.defaultColor)},
    }`;
    })
    .join(',\n');

  const images = layout.imageLayers
    .map((box) => {
      const parts = [`left: ${box.left}`, `top: ${box.top}`, `width: ${box.width}`, `height: ${box.height}`];
      if (box.opacity != null) parts.push(`opacity: ${box.opacity}`);
      if (box.objectFit) parts.push(`objectFit: ${tsString(box.objectFit)}`);
      return `    {${parts.join(', ')}}`;
    })
    .join(',\n');

  return `import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: ${tsString(layout.family)},
  card: {width: ${layout.card.width}, height: ${layout.card.height}, background: ${tsString(layout.card.background)}},
  layers: [
${layers}
  ],
  imageLayers: [
${images}
  ],
};
`;
}

function schemaTs(card) {
  if (card.dir === 'post-103') {
    return `import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  body2: z.string(),
  body2Color: zColor(),
  body4: z.string(),
  body4Color: zColor(),
  image: z.enum(STUDIO_IMAGE_OPTIONS),
  background: zColor(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
`;
  }
  return `import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  image: z.enum(STUDIO_IMAGE_OPTIONS),
  background: zColor(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
`;
}

for (const card of CARDS) {
  const dir = path.join(templatesRoot, card.dir);
  await mkdir(path.join(dir, 'presets'), {recursive: true});

  const meta = {
    id: card.id,
    project: 'helloiam',
    name: card.name,
    description: 'HelloIAM Wine — 2 cards (posts 103–104)',
    tag: 'HelloIAM',
    templateDir: card.dir,
    preset: 'soft-float',
    durationFrames: 90,
    propsFields: card.fields,
    defaultProps: card.defaults,
  };

  await writeFile(path.join(dir, 'layout.ts'), layoutTs(card.layout));
  await writeFile(path.join(dir, 'schema.ts'), schemaTs(card));
  await writeFile(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  await writeFile(path.join(dir, 'presets', 'soft-float.tsx'), SOFT_FLOAT);
  console.log(`  ${card.dir} → ${card.id}`);
}

const BRAND_FIELDS = [
  {key: 'brandLeft', type: 'string', label: 'Текст слева'},
  {key: 'brandRight', type: 'string', label: 'Текст справа'},
  {key: 'image', type: 'image', label: 'Эмодзи / фото'},
  {key: 'background', type: 'color', label: 'Фон'},
  {key: 'brandColor', type: 'color', label: 'Цвет бренда'},
];

const RUBRIC_META_PROP_KEYS = [
  'engine',
  'cardKind',
  'cardIndex',
  'cardCount',
  'cardLayout',
];

const wineStory = {
  id: 'HelloIamWineV1',
  project: 'helloiam',
  name: 'Format 02',
  description: 'Posts 103–104: brand + Armenian wine hero',
  tag: 'Сторис',
  width: 1080,
  height: 1350,
  fps: 30,
  durationPerCardSec: 3,
  cards: [
    {
      cardIndex: 0,
      compositionId: CARDS[0].id,
      label: CARDS[0].name,
      fields: CARDS[0].fields,
      defaultProps: {...CARDS[0].defaults, image: ''},
      durationFrames: 90,
    },
    {
      cardIndex: 1,
      compositionId: CARDS[1].id,
      label: CARDS[1].name,
      fields: CARDS[1].fields,
      defaultProps: {...CARDS[1].defaults, image: ''},
      durationFrames: 90,
    },
  ],
};

await mkdir(storyDir, {recursive: true});
await writeFile(path.join(storyDir, 'helloiam-wine-v1.json'), `${JSON.stringify(wineStory, null, 2)}\n`);

await rebuildStoryCatalog(studioRoot);
console.log(`  helloiam-wine-v1.json → ${wineStory.id} (${wineStory.cards.length} cards)`);
console.log('Done.');
