#!/usr/bin/env node
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rebuildStoryCatalog} from './story-catalog.mjs';

const studioRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesRoot = path.join(studioRoot, 'src', 'templates');
const storyDir = path.join(studioRoot, 'data', 'story-templates');

const FOOD_IMG = 'generated/helloiam-lavash.png';

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
    dir: 'post-5',
    id: 'Post5Css',
    name: 'Кадр 5 — интро DZIRANI',
    schemaKind: 'green-plate-hero',
    layout: {
      family: 'intro-hero',
      card: {width: 1080, height: 1350, background: '#FFC53A'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 40, top: 40, width: 605, height: 624},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#0F0F10',
          },
          defaultText: 'HELLO,\nI AM\nDZIRANI',
          defaultColor: '#0F0F10',
        },
        {
          key: 'label',
          role: 'label',
          box: {left: 40, top: 1285, width: 124, height: 32},
          alignItems: 'flex-end',
          textStyle: {
            fontFamily: 'sans',
            fontSize: 26,
            lineHeight: '32px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#000000',
          },
          defaultText: 'AM FOOD',
          defaultColor: '#000000',
        },
      ],
      imageLayers: [{left: -269, top: 0, width: 1698, height: 1698, objectFit: 'cover'}],
    },
    defaults: {
      background: '#FFC53A',
      title: 'HELLO,\nI AM\nDZIRANI',
      titleColor: '#0F0F10',
      label: 'AM FOOD',
      labelColor: '#000000',
      image: '',
    },
    fields: [
      {key: 'title', type: 'string', label: 'Заголовок'},
      {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
      {key: 'label', type: 'string', label: 'Метка'},
      {key: 'labelColor', type: 'color', label: 'Цвет метки'},
      {key: 'image', type: 'image', label: 'Фото'},
      {key: 'background', type: 'color', label: 'Фон'},
    ],
  },
  {
    dir: 'post-112',
    id: 'Post112Css',
    name: 'Кадр 112 — helloiam + эмодзи',
    schemaKind: 'brand-sticker',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#FFC53A'},
      layers: [
        {
          key: 'body2',
          role: 'text',
          box: {left: 196, top: 632, width: 687, height: 92},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 96,
            lineHeight: '92px',
            fontWeight: 700,
            fontStyle: 'normal',
            textAlign: 'center',
            color: '#0F0F10',
          },
          defaultText: 'helloiam am',
          defaultColor: '#0F0F10',
        },
      ],
      imageLayers: [{left: 578, top: 588, width: 180, height: 180, objectFit: 'cover'}],
    },
    defaults: {
      background: '#FFC53A',
      body2: 'helloiam am',
      body2Color: '#0F0F10',
      image: '',
    },
    fields: [
      {key: 'body2', type: 'string', label: 'Заголовок (helloiam am)'},
      {key: 'body2Color', type: 'color', label: 'Цвет заголовка'},
      {key: 'image', type: 'image', label: 'Стикер / фото'},
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
  if (card.schemaKind === 'brand-sticker') {
    return `import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  body2: z.string(),
  body2Color: zColor(),
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
  title: z.string(),
  titleColor: zColor(),
  label: z.string(),
  labelColor: zColor(),
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
    description: 'Format 03 — posts 5 & 112',
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

const format03 = {
  id: 'Format03',
  project: 'helloiam',
  name: 'Format 03',
  description: 'Posts 5 & 112: DZIRANI intro + helloiam',
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
      defaultProps: {...CARDS[0].defaults},
      durationFrames: 90,
    },
    {
      cardIndex: 1,
      compositionId: CARDS[1].id,
      label: CARDS[1].name,
      fields: CARDS[1].fields,
      defaultProps: {...CARDS[1].defaults},
      durationFrames: 90,
    },
  ],
};

await mkdir(storyDir, {recursive: true});
await writeFile(path.join(storyDir, 'format-03.json'), `${JSON.stringify(format03, null, 2)}\n`);
await rebuildStoryCatalog(studioRoot);
console.log(`  format-03.json → ${format03.id} (${format03.cards.length} cards)`);
console.log('Done.');
