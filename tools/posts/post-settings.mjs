/** @typedef {'food' | 'sounds' | 'culture' | 'places' | 'news'} PostCategory */

export const POST_CATEGORIES = /** @type {const} */ ([
  'food',
  'sounds',
  'culture',
  'places',
  'news',
]);

/** @type {Record<PostCategory, string>} */
export const CATEGORY_LABELS = {
  food: 'AM FOOD',
  sounds: 'AM SOUNDS',
  culture: 'AM CULTURE',
  places: 'AM PLACES',
  news: 'AM NEWS',
};

export const BRAND_COLORS = [
  {id: 'blue', hex: '#4A7BFF', label: 'Синий'},
  {id: 'yellow', hex: '#FFC53A', label: 'Жёлтый'},
  {id: 'red', hex: '#D61E23', label: 'Красный'},
  {id: 'dark', hex: '#0F0F10', label: 'Чёрный'},
  {id: 'gray', hex: '#D9DDE0', label: 'Серый'},
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_THEME_COLOR = '#D9DDE0';
const DEFAULT_CATEGORY = 'food';
const DEFAULT_PRESET = 'soft-float';

/**
 * @param {unknown} value
 * @returns {value is PostCategory}
 */
export function isPostCategory(value) {
  return typeof value === 'string' && POST_CATEGORIES.includes(/** @type {PostCategory} */ (value));
}

/**
 * @param {Record<string, unknown>} post
 */
export function normalizePostSettings(post) {
  if (!isPostCategory(post.category)) post.category = DEFAULT_CATEGORY;
  if (typeof post.themeColor !== 'string' || !HEX_COLOR.test(post.themeColor)) {
    post.themeColor = DEFAULT_THEME_COLOR;
  }
  if (typeof post.presetId !== 'string' || !post.presetId.trim()) {
    post.presetId = DEFAULT_PRESET;
  }
  if (typeof post.subject !== 'string') post.subject = '';
  if (typeof post.name !== 'string' || !post.name.trim()) {
    post.name = typeof post.subject === 'string' && post.subject.trim()
      ? post.subject.trim()
      : post.templateName || 'Новый пост';
  }
  if (!post.generation || typeof post.generation !== 'object') {
    post.generation = {status: 'draft'};
  } else if (typeof post.generation.status !== 'string') {
    post.generation.status = 'draft';
  }
}

/**
 * @param {Record<string, unknown>} post
 */
export function applyPostSettingsToCards(post) {
  const label = CATEGORY_LABELS[/** @type {PostCategory} */ (post.category)] || CATEGORY_LABELS.food;
  const themeColor = typeof post.themeColor === 'string' ? post.themeColor : DEFAULT_THEME_COLOR;
  const lockColors = post.category === 'news';

  for (const card of post.cards || []) {
    if (!card.props) card.props = {};
    if ('label' in card.props) card.props.label = label;
    if (!lockColors && card.fields?.some((f) => f.key === 'background')) {
      card.props.background = themeColor;
    }
  }
}

/**
 * @param {Record<string, unknown>} patch
 * @param {{ admin?: boolean }} [options]
 */
export function validatePostSettingsPatch(patch, options = {}) {
  const errors = [];
  const out = {};

  if (patch.category !== undefined) {
    if (!isPostCategory(patch.category)) errors.push('Некорректная рубрика');
    else out.category = patch.category;
  }

  if (patch.themeColor !== undefined) {
    const color = typeof patch.themeColor === 'string' ? patch.themeColor.trim() : '';
    const allowed = new Set(BRAND_COLORS.map((c) => c.hex.toUpperCase()));
    const normalized = color.toUpperCase();
    if (!HEX_COLOR.test(color)) {
      errors.push('Цвет в формате #RRGGBB');
    } else if (!allowed.has(normalized) && !options.admin) {
      errors.push('Доступны только 5 фирменных цветов');
    } else {
      out.themeColor = color;
    }
  }

  if (patch.presetId !== undefined) {
    const presetId = typeof patch.presetId === 'string' ? patch.presetId.trim() : '';
    if (!presetId) errors.push('Укажите пресет');
    else out.presetId = presetId;
  }

  if (patch.subject !== undefined) {
    out.subject = typeof patch.subject === 'string' ? patch.subject.trim() : '';
  }

  if (patch.name !== undefined) {
    const name = typeof patch.name === 'string' ? patch.name.trim() : '';
    if (!name) errors.push('Укажите название поста');
    else out.name = name;
  }

  return {errors, patch: out};
}
