#!/usr/bin/env node
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rebuildStoryCatalog} from './story-catalog.mjs';

const studioRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesRoot = path.join(studioRoot, 'src', 'templates');
const storyDir = path.join(studioRoot, 'data', 'story-templates');

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
    dir: 'post-82',
    id: 'Post82Css',
    name: 'Кадр 82 — серый фон',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#D9DDE0'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 161, top: 285, width: 758, height: 780},
          alignItems: 'center',
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#4A7BFF',
          },
          defaultText: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
          defaultColor: '#4A7BFF',
        },
      ],
      imageLayers: [],
    },
    defaults: {
      background: '#D9DDE0',
      title: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
      titleColor: '#4A7BFF',
    },
    withImage: false,
  },
  {
    dir: 'post-94',
    id: 'Post94Css',
    name: 'Кадр 94 — жёлтый фон',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#FFC53A'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 272, top: 285, width: 536, height: 312},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#0F0F10',
          },
          defaultText: 'HELLO\nI AM',
          defaultColor: '#0F0F10',
        },
      ],
      imageLayers: [],
    },
    defaults: {
      background: '#FFC53A',
      title: 'HELLO\nI AM',
      titleColor: '#0F0F10',
    },
    withImage: false,
  },
  {
    dir: 'post-95',
    id: 'Post95Css',
    name: 'Кадр 95 — фото с затемнением',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#000000'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 272, top: 285, width: 536, height: 468},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#FFFFFF',
          },
          defaultText: 'HELLO\nI AM\nAM',
          defaultColor: '#FFFFFF',
        },
      ],
      imageLayers: [{left: -804, top: -150, width: 2688, height: 1500, opacity: 0.6, objectFit: 'cover'}],
    },
    defaults: {
      background: '#000000',
      title: 'HELLO\nI AM\nAM',
      titleColor: '#FFFFFF',
      image: 'generated/image-79-1.png',
    },
    withImage: true,
  },
  {
    dir: 'post-91',
    id: 'Post91Css',
    name: 'Кадр 91 — тёмный герой',
    layout: {
      family: 'intro-hero',
      card: {width: 1080, height: 1350, background: '#0F0F10'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 161, top: 285, width: 758, height: 780},
          alignItems: 'center',
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#FFFFFF',
          },
          defaultText: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
          defaultColor: '#FFFFFF',
        },
      ],
      imageLayers: [{left: -448, top: -470, width: 1977, height: 1977, objectFit: 'cover'}],
    },
    defaults: {
      background: '#0F0F10',
      title: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
      titleColor: '#FFFFFF',
      image: 'generated/image-79-1.png',
    },
    withImage: true,
  },
  {
    dir: 'post-88',
    id: 'Post88Css',
    name: 'Кадр 88 — красный фон',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#D61E23'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 243, top: 597, width: 595, height: 468},
          alignItems: 'flex-end',
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#FFC53A',
          },
          defaultText: 'AM\nMEANS',
          defaultColor: '#FFC53A',
        },
      ],
      imageLayers: [],
    },
    defaults: {
      background: '#D61E23',
      title: 'AM\nMEANS',
      titleColor: '#FFC53A',
    },
    withImage: false,
  },
  {
    dir: 'post-96',
    id: 'Post96Css',
    name: 'Кадр 96 — фото + низ',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#000000'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 161, top: 597, width: 758, height: 468},
          alignItems: 'flex-end',
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#FFC53A',
          },
          defaultText: 'AM\nMEANS\nARMENIA',
          defaultColor: '#FFC53A',
        },
      ],
      imageLayers: [{left: -670, top: 0, width: 2419, height: 1350, objectFit: 'cover'}],
    },
    defaults: {
      background: '#000000',
      title: 'AM\nMEANS\nARMENIA',
      titleColor: '#FFC53A',
      image: 'generated/image-79-1.png',
    },
    withImage: true,
  },
  {
    dir: 'post-89',
    id: 'Post89Css',
    name: 'Кадр 89 — фото + жёлтый текст',
    layout: {
      family: 'intro-hero',
      card: {width: 1080, height: 1350, background: '#000000'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 161, top: 285, width: 758, height: 780},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#FFC53A',
          },
          defaultText: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
          defaultColor: '#FFC53A',
        },
      ],
      imageLayers: [{left: -448, top: -313, width: 1977, height: 1977, objectFit: 'cover'}],
    },
    defaults: {
      background: '#000000',
      title: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
      titleColor: '#FFC53A',
      image: 'generated/image-79-1.png',
    },
    withImage: true,
  },
  {
    dir: 'post-97',
    id: 'Post97Css',
    name: 'Кадр 97 — полноэкранное фото',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#000000'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 161, top: 285, width: 758, height: 780},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#D61E23',
          },
          defaultText: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
          defaultColor: '#D61E23',
        },
      ],
      imageLayers: [{left: 0, top: 0, width: 1350, height: 1350, objectFit: 'cover'}],
    },
    defaults: {
      background: '#000000',
      title: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
      titleColor: '#D61E23',
      image: 'generated/image-79-1.png',
    },
    withImage: true,
  },
  {
    dir: 'post-98',
    id: 'Post98Css',
    name: 'Кадр 98 — фото + красный текст',
    layout: {
      family: 'generic',
      card: {width: 1080, height: 1350, background: '#000000'},
      layers: [
        {
          key: 'title',
          role: 'title',
          box: {left: 161, top: 285, width: 758, height: 780},
          textStyle: {
            fontFamily: 'sans',
            fontSize: 164,
            lineHeight: '156px',
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#D61E23',
          },
          defaultText: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
          defaultColor: '#D61E23',
        },
      ],
      imageLayers: [{left: -151, top: -16, width: 1381, height: 1381, objectFit: 'cover'}],
    },
    defaults: {
      background: '#000000',
      title: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
      titleColor: '#D61E23',
      image: 'generated/image-79-1.png',
    },
    withImage: true,
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

function schemaTs(withImage) {
  if (withImage) {
    return `import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  title: z.string(),
  titleColor: zColor(),
  image: z.enum(STUDIO_IMAGE_OPTIONS),
  background: zColor(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
`;
  }
  return `import {zColor} from '@remotion/zod-types';
import {z} from 'zod';

export const schema = z.object({
  title: z.string(),
  titleColor: zColor(),
  background: zColor(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
`;
}

function cardFields(card) {
  const fields = [
    {key: 'title', type: 'string', label: 'Заголовок'},
    {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
    {key: 'background', type: 'color', label: 'Фон'},
  ];
  if (card.withImage) {
    fields.splice(2, 0, {key: 'image', type: 'image', label: 'Фото'});
  }
  return fields;
}

for (const card of CARDS) {
  const dir = path.join(templatesRoot, card.dir);
  await mkdir(path.join(dir, 'presets'), {recursive: true});

  const fields = cardFields(card);

  const meta = {
    id: card.id,
    project: 'helloiam',
    name: card.name,
    description: 'Format 01 — HelloIAM 9-card carousel',
    tag: 'HelloIAM',
    templateDir: card.dir,
    preset: 'soft-float',
    durationFrames: 90,
    propsFields: fields,
    defaultProps: card.defaults,
  };

  await writeFile(path.join(dir, 'layout.ts'), layoutTs(card.layout));
  await writeFile(path.join(dir, 'schema.ts'), schemaTs(card.withImage));
  await writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  await writeFile(path.join(dir, 'presets', 'soft-float.tsx'), SOFT_FLOAT);
  console.log(`  ${card.dir} → ${card.id}`);
}

const format01 = {
  id: 'Format01',
  project: 'helloiam',
  name: 'Format 01',
  description: 'HelloIAM 9-card carousel (posts 82, 94, 95, 91, 88, 96, 89, 97, 98)',
  tag: 'Карусель',
  width: 1080,
  height: 1350,
  fps: 30,
  durationPerCardSec: 3,
  cards: CARDS.map((card, cardIndex) => ({
    cardIndex,
    compositionId: card.id,
    label: card.name,
    fields: cardFields(card),
    defaultProps: {...card.defaults},
    durationFrames: 90,
  })),
};

await mkdir(storyDir, {recursive: true});
await writeFile(path.join(storyDir, 'format-01.json'), `${JSON.stringify(format01, null, 2)}\n`);

await rebuildStoryCatalog(studioRoot);
console.log(`  format-01.json → ${format01.id} (${format01.cards.length} cards)`);
console.log('Done.');
