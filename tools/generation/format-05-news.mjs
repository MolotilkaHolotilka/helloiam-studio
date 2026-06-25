import {isRubric05Template, RUBRIC05_ID} from '../rubric/rubric-ids.mjs';

export const FORMAT05_ID = RUBRIC05_ID;
export {RUBRIC05_ID, isRubric05Template, isRubric05Template as isFormat05Template};

export const FORMAT05_LOCKED_TEXT_KEYS = new Set(['title', 'label', 'source']);

/** Text fields LLM may fill on Rubric 05 cards. */
export const FORMAT05_GENERATED_TEXT_KEYS = new Set(['fact', 'quote']);

export const FORMAT05_BRAND_CARD_FILENAME = '51 News.png';
export const FORMAT05_BRAND_CARD_IMAGE = 'generated/cards/51-news.png';

export const FORMAT05_FIXED_TEXT = {
  title: 'Hello, WORLD',
  label: 'AM NEWS',
  source: 'source: armradio.am',
};

export function getFormat05BrandCardProps() {
  return {
    engine: 'green-plate',
    cardKind: 'brand',
    cardIndex: 3,
    cardCount: 4,
    background: '#D9DDE0',
    image: FORMAT05_BRAND_CARD_IMAGE,
  };
}

/** @param {Record<string, unknown>} post */
export function ensureFormat05BrandCard(post) {
  const cards = post.cards || [];
  const hasBrand = cards.some((c) => c.props?.cardKind === 'brand' || c.cardIndex === 3);
  if (hasBrand) return;
  cards.push({
    cardIndex: 3,
    compositionId: 'Post103Css',
    label: 'Кадр — бренд NEWS',
    fields: [
      {key: 'image', type: 'image', label: 'Карточка'},
      {key: 'background', type: 'color', label: 'Фон'},
    ],
    metaPropKeys: ['engine', 'cardKind', 'cardIndex', 'cardCount'],
    props: {...getFormat05BrandCardProps()},
    durationFrames: 90,
  });
  post.cards = cards;
}

/**
 * @param {{ fields?: Array<{ key: string }> }} card
 */
export function getFormat05FixedProps(card) {
  /** @type {Record<string, string>} */
  const props = {};
  const fieldKeys = new Set((card.fields || []).map((field) => field.key));
  if (fieldKeys.has('title')) {
    props.title = FORMAT05_FIXED_TEXT.title;
  }
  if (fieldKeys.has('label')) {
    props.label = FORMAT05_FIXED_TEXT.label;
  }
  if (fieldKeys.has('source')) {
    props.source = FORMAT05_FIXED_TEXT.source;
  }
  return props;
}

/**
 * @param {Record<string, unknown>} post
 */
export function applyFormat05FixedToPost(post) {
  if (!isRubric05Template(/** @type {string} */ (post.templateId))) return post;
  ensureFormat05BrandCard(post);
  if (!Array.isArray(post.assets)) post.assets = [];
  if (!post.assets.includes(FORMAT05_BRAND_CARD_IMAGE)) {
    post.assets.push(FORMAT05_BRAND_CARD_IMAGE);
  }
  for (const card of post.cards || []) {
    if (!card.props) card.props = {};
    if (card.props.cardKind === 'brand' || card.cardIndex === 3) {
      card.props = getFormat05BrandCardProps();
      continue;
    }
    Object.assign(card.props, getFormat05FixedProps(card));
  }
  return post;
}
