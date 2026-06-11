#!/usr/bin/env node
import {readdir, readFile, writeFile, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const studioRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rubricRoot = path.join(studioRoot, 'rubric-templates-tsx');
const storyDir = path.join(studioRoot, 'data', 'story-templates');
const galleryDir = path.join(studioRoot, 'src', 'gallery');

const IMG = {
  lavash: 'generated/helloiam-lavash.png',
  wine: 'generated/helloiam-wine-armenia.png',
  field: 'generated/helloiam-chair-field.png',
};

const FIELD = {
  hello: [
    {key: 'title', type: 'string', label: 'Заголовок'},
    {key: 'titleAccent', type: 'string', label: 'Акцент заголовка'},
    {key: 'label', type: 'string', label: 'Метка'},
    {key: 'image', type: 'image', label: 'Фото'},
    {key: 'background', type: 'color', label: 'Фон'},
    {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
    {key: 'accentColor', type: 'color', label: 'Цвет акцента'},
    {key: 'labelColor', type: 'color', label: 'Цвет метки'},
    {key: 'introLayout', type: 'string', label: 'Раскладка (lavash/dolma/matsun)'},
  ],
  quote: [
    {key: 'title', type: 'string', label: 'Заголовок'},
    {key: 'titleAccent', type: 'string', label: 'Акцент заголовка'},
    {key: 'quote', type: 'textarea', label: 'Цитата'},
    {key: 'label', type: 'string', label: 'Метка'},
    {key: 'image', type: 'image', label: 'Фото'},
    {key: 'background', type: 'color', label: 'Фон'},
    {key: 'quoteColor', type: 'color', label: 'Цвет цитаты'},
    {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
    {key: 'accentColor', type: 'color', label: 'Цвет акцента'},
    {key: 'labelColor', type: 'color', label: 'Цвет метки'},
  ],
  brand: [
    {key: 'brandLeft', type: 'string', label: 'Текст слева'},
    {key: 'brandRight', type: 'string', label: 'Текст справа'},
    {key: 'image', type: 'image', label: 'Эмодзи / фото'},
    {key: 'background', type: 'color', label: 'Фон'},
    {key: 'brandColor', type: 'color', label: 'Цвет бренда'},
  ],
  deepQuote: [
    {key: 'title', type: 'string', label: 'Заголовок'},
    {key: 'titleAccent', type: 'string', label: 'Акцент'},
    {key: 'quote', type: 'textarea', label: 'Цитата'},
    {key: 'label', type: 'string', label: 'Метка'},
    {key: 'image', type: 'image', label: 'Фото'},
    {key: 'background', type: 'color', label: 'Фон'},
    {key: 'quoteColor', type: 'color', label: 'Цвет цитаты'},
    {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
    {key: 'accentColor', type: 'color', label: 'Цвет акцента'},
    {key: 'labelColor', type: 'color', label: 'Цвет метки'},
  ],
  foodFact: [
    {key: 'title', type: 'textarea', label: 'Заголовок'},
    {key: 'text', type: 'textarea', label: 'Текст'},
    {key: 'image', type: 'image', label: 'Миниатюра'},
    {key: 'counter', type: 'string', label: 'Счётчик'},
  ],
  foodHero: [
    {key: 'title', type: 'textarea', label: 'Заголовок'},
    {key: 'subtitle', type: 'textarea', label: 'Подзаголовок'},
    {key: 'image', type: 'image', label: 'Миниатюра'},
    {key: 'backgroundImage', type: 'image', label: 'Фон'},
  ],
  foodFactImg: [
    {key: 'title', type: 'textarea', label: 'Заголовок'},
    {key: 'backgroundImage', type: 'image', label: 'Фон'},
    {key: 'counter', type: 'string', label: 'Счётчик'},
  ],
  foodBrand: [
    {key: 'brandLeft', type: 'string', label: 'Текст слева'},
    {key: 'brandRight', type: 'string', label: 'Текст справа'},
    {key: 'image', type: 'image', label: 'Эмодзи'},
    {key: 'subtitle', type: 'textarea', label: 'Подзаголовок'},
  ],
  wizzHeadline: [
    {key: 'title', type: 'string', label: 'Заголовок'},
    {key: 'titleAccent', type: 'string', label: 'Акцент'},
    {key: 'quote', type: 'textarea', label: 'Текст'},
    {key: 'label', type: 'string', label: 'Метка'},
    {key: 'image', type: 'image', label: 'Фото'},
    {key: 'background', type: 'color', label: 'Фон'},
    {key: 'quoteColor', type: 'color', label: 'Цвет текста'},
    {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
    {key: 'accentColor', type: 'color', label: 'Цвет акцента'},
    {key: 'labelColor', type: 'color', label: 'Цвет метки'},
    {key: 'imageTop', type: 'string', label: 'Отступ фото (px)'},
    {key: 'imageHeight', type: 'string', label: 'Высота фото (px)'},
  ],
  wizzBody: [
    {key: 'title', type: 'string', label: 'Заголовок'},
    {key: 'titleAccent', type: 'string', label: 'Акцент'},
    {key: 'body', type: 'textarea', label: 'Текст'},
    {key: 'label', type: 'string', label: 'Метка'},
    {key: 'image', type: 'image', label: 'Фото'},
    {key: 'background', type: 'color', label: 'Фон'},
    {key: 'bodyColor', type: 'color', label: 'Цвет текста'},
    {key: 'titleColor', type: 'color', label: 'Цвет заголовка'},
    {key: 'accentColor', type: 'color', label: 'Цвет акцента'},
    {key: 'labelColor', type: 'color', label: 'Цвет метки'},
    {key: 'imageHeight', type: 'string', label: 'Высота фото'},
    {key: 'imageFocus', type: 'string', label: 'Фокус фото'},
    {key: 'imageScale', type: 'string', label: 'Масштаб фото'},
  ],
};

function toTemplateId(slug) {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function slugFromId(id) {
  return id.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function baseMeta(engine, cardKind, cardIndex, cardCount, props, durationFrames = 90) {
  return {
    engine,
    cardKind,
    cardIndex,
    cardCount,
    ...props,
    _durationFrames: durationFrames,
  };
}

function greenPlate7Cards(introLayout, theme) {
  const cards = [];
  const count = 7;
  const dur = theme === 'deep' ? 210 : 90;
  cards.push({
    label: 'Обложка',
    kind: 'hello',
    fields: FIELD.hello,
    props: baseMeta('green-plate', 'hello', 0, count, {
      title: 'HELLO, I AM',
      titleAccent: theme.toUpperCase(),
      label: `AM ${theme.toUpperCase()}`,
      background: '#D9DDE0',
      titleColor: '#0F0F10',
      accentColor: '#D61E23',
      labelColor: '#000000',
      image: IMG.lavash,
      introLayout,
    }, dur),
  });
  for (let i = 1; i < count - 1; i++) {
    cards.push({
      label: `Слайд ${i + 1}`,
      kind: 'quote',
      fields: FIELD.quote,
      props: baseMeta('green-plate', 'quote', i, count, {
        title: 'HELLO, I AM',
        titleAccent: theme.toUpperCase(),
        quote: `Armenian ${theme} — slide ${i + 1}.\nDiscover the story.`,
        label: `AM ${theme.toUpperCase()}`,
        background: '#D9DDE0',
        quoteColor: '#D61E23',
        titleColor: '#0F0F10',
        accentColor: '#D61E23',
        labelColor: '#000000',
        image: IMG.field,
      }, dur),
    });
  }
  cards.push({
    label: 'Бренд',
    kind: 'brand',
    fields: FIELD.brand,
    props: baseMeta('green-plate', 'brand', count - 1, count, {
      brandLeft: 'helloiam',
      brandRight: 'am',
      background: '#D9DDE0',
      brandColor: '#420000',
      image: IMG.lavash,
    }, dur),
  });
  return cards;
}

function greenPlate3Cards() {
  const count = 3;
  return [
    {
      label: 'Интро',
      kind: 'hello',
      fields: FIELD.hello,
      props: baseMeta('green-plate', 'hello', 0, count, {
        title: 'HELLO, I AM',
        titleAccent: 'FOOD',
        label: 'AM FOOD',
        background: '#D9DDE0',
        titleColor: '#0F0F10',
        accentColor: '#D61E23',
        labelColor: '#000000',
        image: IMG.lavash,
        introLayout: 'lavash',
      }),
    },
    {
      label: 'Цитата',
      kind: 'quote',
      fields: FIELD.quote,
      props: baseMeta('green-plate', 'quote', 1, count, {
        title: 'HELLO, I AM',
        titleAccent: 'FOOD',
        quote: 'Thin bread baked in stone oven.\nA taste of Armenia.',
        label: 'AM FOOD',
        background: '#D9DDE0',
        quoteColor: '#D61E23',
        titleColor: '#0F0F10',
        accentColor: '#D61E23',
        labelColor: '#000000',
        image: IMG.lavash,
      }),
    },
    {
      label: 'Бренд',
      kind: 'brand',
      fields: FIELD.brand,
      props: baseMeta('green-plate', 'brand', 2, count, {
        brandLeft: 'helloiam',
        brandRight: 'am',
        background: '#D9DDE0',
        brandColor: '#420000',
        image: IMG.lavash,
      }),
    },
  ];
}

function deepDiveCard(theme, colors) {
  return [
    {
      label: 'Цитата',
      kind: 'quote',
      fields: FIELD.deepQuote,
      props: baseMeta('green-plate', 'quote', 0, 1, {
        title: 'HELLO, I AM',
        titleAccent: theme,
        quote: 'Deep dive quote card.\nEdit text for your story.',
        label: 'AM NEWS',
        background: colors.bg,
        quoteColor: colors.quote,
        titleColor: colors.title,
        accentColor: colors.accent,
        labelColor: colors.label,
        image: IMG.wine,
      }),
    },
  ];
}

function armenianFoodCards() {
  const count = 6;
  const kinds = ['food-0', 'food-1', 'food-2', 'food-3', 'food-4', 'food-5'];
  const specs = [
    {label: 'Факт 1', fields: FIELD.foodFact, props: {title: 'Fact\nnumber\nOne', text: 'Armenian lavash is UNESCO heritage bread.', counter: '1/6', image: IMG.lavash}},
    {label: 'Герой', fields: FIELD.foodHero, props: {title: 'Hello, I Am\nArmenian\nLAVASH', subtitle: 'Thin bread baked\nin stone oven', image: IMG.lavash, backgroundImage: IMG.field}},
    {label: 'Факт 2', fields: FIELD.foodFactImg, props: {title: 'Fact\nnumber\nOne', backgroundImage: IMG.field, counter: '3/6'}},
    {label: 'Факт 3', fields: FIELD.foodFact, props: {title: 'Fact\nnumber\nTwo', text: 'Baked on the walls of a tonir oven.', counter: '4/6', image: IMG.lavash}},
    {label: 'Факт 4', fields: FIELD.foodFactImg, props: {title: 'Fact\nnumber\nThree', backgroundImage: IMG.wine, counter: '5/6'}},
    {label: 'Бренд', fields: FIELD.foodBrand, props: {brandLeft: 'helloiam', brandRight: 'am', image: IMG.lavash, subtitle: 'Say Hello\nto Armenia'}},
  ];
  return specs.map((spec, i) => ({
    label: spec.label,
    kind: kinds[i],
    fields: spec.fields,
    props: baseMeta('armenian-food', kinds[i], i, count, spec.props),
  }));
}

function wizzCards() {
  const count = 3;
  const dur = 210;
  return [
    {
      label: 'Заголовок + фото',
      kind: 'headline',
      fields: FIELD.wizzHeadline,
      props: baseMeta('wizz', 'headline', 0, count, {
        title: 'HELLO,',
        titleAccent: 'I AM',
        quote: 'Wizz Air launches London — Yerevan route.',
        label: 'AM NEWS',
        background: '#D9DDE0',
        quoteColor: '#D61E23',
        titleColor: '#0F0F10',
        accentColor: '#D61E23',
        labelColor: '#000000',
        image: IMG.field,
        imageTop: '406',
        imageHeight: '829',
      }, dur),
    },
    {
      label: 'Текст под фото',
      kind: 'body-below',
      fields: FIELD.wizzBody,
      props: baseMeta('wizz', 'body-below', 1, count, {
        title: 'HELLO,',
        titleAccent: 'I AM',
        body: 'Fly direct to Yerevan.\nDiscover Armenia.',
        label: 'AM NEWS',
        background: '#D9DDE0',
        bodyColor: '#0F0F10',
        titleColor: '#0F0F10',
        accentColor: '#D61E23',
        labelColor: '#000000',
        image: IMG.wine,
        cardLayout: 'body-below',
        imageHeight: '556',
        imageFocus: '50% 30%',
        imageScale: '1.12',
      }, dur),
    },
    {
      label: 'Финал',
      kind: 'headline',
      fields: FIELD.wizzHeadline,
      props: baseMeta('wizz', 'headline', 2, count, {
        title: 'HELLO,',
        titleAccent: 'ARMENIA',
        quote: 'Your next adventure starts here.',
        label: 'AM NEWS',
        background: '#D9DDE0',
        quoteColor: '#D61E23',
        titleColor: '#0F0F10',
        accentColor: '#D61E23',
        labelColor: '#000000',
        image: IMG.field,
        imageTop: '350',
        imageHeight: '700',
      }, dur),
    },
  ];
}

const TEMPLATE_BUILDERS = {
  'i-am-7-cards': () => greenPlate7Cards('lavash', 'food'),
  'i-am-food-intro': () => greenPlate7Cards('lavash', 'food'),
  'i-am-culture-intro': () => greenPlate7Cards('dolma', 'culture'),
  'i-am-streets-intro': () => greenPlate7Cards('matsun', 'streets'),
  'i-am-lavash-deep-dive': () => greenPlate7Cards('lavash', 'lavash'),
  'i-am-dolma-deep-dive': () => greenPlate7Cards('dolma', 'dolma'),
  'i-am-matsun-deep-dive': () => greenPlate7Cards('matsun', 'matsun'),
  'i-am-khachkar-deep-dive': () => greenPlate7Cards('lavash', 'khachkar'),
  'i-am-wine-deep-dive': () => greenPlate7Cards('lavash', 'wine'),
  'green-plate-intro': () => greenPlate3Cards(),
  'deep-dive-theme-blue': () => deepDiveCard('ARMENIA', {bg: '#4A7BFF', quote: '#FFFFFF', title: '#FFFFFF', accent: '#FFC53A', label: '#FFFFFF'}),
  'deep-dive-theme-gray': () => deepDiveCard('ARMENIA', {bg: '#D9DDE0', quote: '#D61E23', title: '#0F0F10', accent: '#D61E23', label: '#000000'}),
  'deep-dive-theme-dark': () => deepDiveCard('ARMENIA', {bg: '#0F0F10', quote: '#FFFFFF', title: '#FFFFFF', accent: '#FFC53A', label: '#FFFFFF'}),
  'armenian-food-carousel': () => armenianFoodCards(),
  'wizz-london-yerevan': () => wizzCards(),
};

function buildStoryTemplate(workflow) {
  const slug = workflow.id;
  const builder = TEMPLATE_BUILDERS[slug];
  if (!builder) throw new Error(`No builder for ${slug}`);
  const cardSpecs = builder();
  const fps = workflow.fps || 30;
  const defaultDur = workflow.durationPerCardFrames || 90;

  const cards = cardSpecs.map((spec, cardIndex) => {
    const dur = spec.props._durationFrames || defaultDur;
    const { _durationFrames, ...defaultProps } = spec.props;
    return {
      cardIndex,
      compositionId: 'RubricCardCss',
      label: spec.label,
      fields: spec.fields,
      defaultProps,
      durationFrames: dur,
    };
  });

  const durationPerCardSec = Math.round(((cardSpecs[0]?.props._durationFrames || defaultDur) / fps) * 10) / 10;

  return {
    id: toTemplateId(slug),
    project: 'helloiam',
    name: workflow.name,
    description: `Rubric: ${slug}`,
    tag: workflow.format?.includes('carousel') ? 'Карусель' : 'Сторис',
    width: workflow.width || 1080,
    height: workflow.height || 1350,
    fps,
    durationPerCardSec,
    cards,
  };
}

// Remove legacy story templates
const legacy = ['hello-iam-v1.json', 'hello-iam-wine-v1.json'];
for (const f of legacy) {
  try {
    await unlink(path.join(storyDir, f));
    console.log('removed legacy', f);
  } catch { /* */ }
}

const entries = await readdir(rubricRoot, {withFileTypes: true});
const catalogTemplates = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const wfPath = path.join(rubricRoot, entry.name, 'workflow.json');
  let workflow;
  try {
    workflow = JSON.parse(await readFile(wfPath, 'utf8'));
  } catch {
    continue;
  }
  const story = buildStoryTemplate(workflow);
  const fileSlug = slugFromId(story.id);
  await writeFile(path.join(storyDir, `${fileSlug}.json`), `${JSON.stringify(story, null, 2)}\n`);
  catalogTemplates.push({
    id: story.id,
    project: story.project,
    name: story.name,
    description: story.description,
    tag: story.tag,
    cardCount: story.cards.length,
  });
  console.log(`  ${story.id} (${story.cards.length} cards)`);
}

catalogTemplates.sort((a, b) => a.id.localeCompare(b.id));

const catalog = {
  projects: [
    {
      id: 'helloiam',
      name: 'HelloIAM',
      description: 'Брендовые сторис и карусели',
      accent: '#4A7BFF',
    },
  ],
  templates: catalogTemplates,
};

await writeFile(path.join(galleryDir, 'story-templates.json'), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`\nImported ${catalogTemplates.length} rubric templates.`);
