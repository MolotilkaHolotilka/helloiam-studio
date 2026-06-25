/** @typedef {'food' | 'sounds' | 'culture' | 'places' | 'news'} PostCategory */

import {
  isRubric01Template,
  isRubric02Template,
  isRubric03Template,
  isRubric04Template,
  isRubric05Template,
  isRubric06Template,
  normalizeTemplateId,
} from '../rubric/rubric-ids.mjs';
import {getPostItemFromCards, syncCardPropAliases} from '../card-props.mjs';

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

/** Color style presets — chosen in Settings only (not per-card). */
export const COLOR_STYLES = [
  {
    id: 'red-blue-white',
    label: 'Red · Blue · White',
    themeColor: '#D61E23',
    colors: {
      background: '#D61E23',
      accentColor: '#4A7BFF',
      titleColor: '#FFFFFF',
      labelColor: '#FFFFFF',
      factColor: '#FFFFFF',
      quoteColor: '#FFFFFF',
    },
  },
  {
    id: 'red-blue-black',
    label: 'Red · Blue · Black',
    themeColor: '#D61E23',
    colors: {
      background: '#D61E23',
      accentColor: '#4A7BFF',
      titleColor: '#1E1E1E',
      labelColor: '#1E1E1E',
      factColor: '#1E1E1E',
      quoteColor: '#1E1E1E',
    },
  },
  {
    id: 'blue-red-white',
    label: 'Blue · Red · White',
    themeColor: '#4A7BFF',
    colors: {
      background: '#4A7BFF',
      accentColor: '#D61E23',
      titleColor: '#FFFFFF',
      labelColor: '#FFFFFF',
      factColor: '#FFFFFF',
      quoteColor: '#FFFFFF',
    },
  },
  {
    id: 'blue-red-black',
    label: 'Blue · Red · Black',
    themeColor: '#4A7BFF',
    colors: {
      background: '#4A7BFF',
      accentColor: '#D61E23',
      titleColor: '#1E1E1E',
      labelColor: '#1E1E1E',
      factColor: '#1E1E1E',
      quoteColor: '#1E1E1E',
    },
  },
  {
    id: 'red-yellow-white',
    label: 'Red · Yellow · White',
    themeColor: '#D61E23',
    colors: {
      background: '#D61E23',
      accentColor: '#FFC53A',
      titleColor: '#FFFFFF',
      labelColor: '#FFFFFF',
      factColor: '#FFFFFF',
      quoteColor: '#FFFFFF',
    },
  },
  {
    id: 'red-yellow-black',
    label: 'Red · Yellow · Black',
    themeColor: '#D61E23',
    colors: {
      background: '#D61E23',
      accentColor: '#FFC53A',
      titleColor: '#1E1E1E',
      labelColor: '#1E1E1E',
      factColor: '#1E1E1E',
      quoteColor: '#1E1E1E',
    },
  },
  {
    id: 'yellow-red-white',
    label: 'Yellow · Red · White',
    themeColor: '#FFC53A',
    colors: {
      background: '#FFC53A',
      accentColor: '#D61E23',
      titleColor: '#FFFFFF',
      labelColor: '#FFFFFF',
      factColor: '#D61E23',
      quoteColor: '#D61E23',
    },
  },
  {
    id: 'yellow-red-black',
    label: 'Yellow · Red · Black',
    themeColor: '#FFC53A',
    colors: {
      background: '#FFC53A',
      accentColor: '#D61E23',
      titleColor: '#1E1E1E',
      labelColor: '#1E1E1E',
      factColor: '#D61E23',
      quoteColor: '#D61E23',
    },
  },
];

/** @deprecated use COLOR_STYLES */
export const BRAND_COLORS = COLOR_STYLES.map((style) => ({
  id: style.id,
  hex: style.themeColor,
  label: style.label,
}));

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR_STYLE_ID = 'yellow-red-white';
const DEFAULT_CATEGORY = 'food';
const DEFAULT_PRESET = 'soft-float';

/**
 * @param {string} styleId
 */
export function getColorStyle(styleId) {
  return COLOR_STYLES.find((s) => s.id === styleId) || COLOR_STYLES.find((s) => s.id === DEFAULT_COLOR_STYLE_ID);
}

/**
 * Resolve the active color style for a post.
 * Card background wins over a stale colorStyleId (e.g. default yellow-red-white on a red slide).
 * @param {Record<string, unknown>} post
 */
export function resolvePostColorStyle(post) {
  const styleId = typeof post.colorStyleId === 'string' ? post.colorStyleId.trim() : '';

  if (styleId) {
    const byId = COLOR_STYLES.find((s) => s.id === styleId);
    if (byId) return byId;
  }

  const cards = Array.isArray(post.cards) ? post.cards : [];
  const bg = String(cards[0]?.props?.background || '').trim().toUpperCase();

  if (bg) {
    const byBackground = COLOR_STYLES.filter((s) => s.colors.background.toUpperCase() === bg);
    if (byBackground.length === 1) return byBackground[0];
    if (byBackground.length > 1) {
      if (styleId) {
        const byIdAndBg = byBackground.find((s) => s.id === styleId);
        if (byIdAndBg) return byIdAndBg;
      }
      const redYellow = byBackground.find((s) => s.id === 'red-yellow-white');
      if (redYellow) return redYellow;
      return byBackground[0];
    }
  }

  const theme = String(post.themeColor || '').trim().toUpperCase();
  if (theme) {
    const byTheme = COLOR_STYLES.filter((s) => s.themeColor.toUpperCase() === theme);
    if (byTheme.length === 1) return byTheme[0];
    if (byTheme.length > 1) {
      if (styleId) {
        const byIdAndTheme = byTheme.find((s) => s.id === styleId);
        if (byIdAndTheme) return byIdAndTheme;
      }
      const redYellow = byTheme.find((s) => s.id === 'red-yellow-white');
      if (redYellow) return redYellow;
      return byTheme[0];
    }
  }

  return getColorStyle(DEFAULT_COLOR_STYLE_ID);
}

/**
 * Rubric 03/04 swatch roles: 1st = background, 2nd = accent (facts), 3rd = title (headers).
 * @param {Record<string, unknown>} post
 */
export function rubricSchemeColors(post) {
  const style = resolvePostColorStyle(post);
  return {
    first: style.colors.background,
    second: style.colors.accentColor,
    third: style.colors.titleColor,
  };
}

/**
 * Rubric 03/04 export props — same roles as preview (2nd = fact, 3rd = headers/labels).
 * @param {Record<string, unknown>} post
 * @param {{ cardIndex?: number, fields?: Array<{ key: string }>, props?: Record<string, unknown> }} card
 */
export function resolveRubricCardRenderProps(post, card) {
  applyPostSettingsToCards(post);
  const live = (post.cards || []).find((c) => c.cardIndex === card.cardIndex) || card;
  const props = {...(live.props || {})};

  const shouldUseGeneratedVideo =
    isRubric01Template(/** @type {string} */ (post.templateId))
    || (isRubric02Template(/** @type {string} */ (post.templateId)) && Number(live.cardIndex) % 2 === 1);

  if (shouldUseGeneratedVideo) {
    const video = post.generation?.videoAssets?.[live.cardIndex];
    if (typeof video === 'string' && video.trim()) {
      props.video = video.trim();
    }
  }

  const itemRubric =
    isRubric03Template(/** @type {string} */ (post.templateId))
    || isRubric04Template(/** @type {string} */ (post.templateId));
  if (!itemRubric || post.category === 'news') return props;

  const {second, third} = rubricSchemeColors(post);
  const isHello = props.cardKind === 'hello';
  const isQuote =
    props.cardKind === 'quote'
    || (live.fields || []).some((f) => f.key === 'fact' || f.key === 'quote');

  if (isHello) {
    props.titleColor = third;
    props.accentColor = second;
    props.labelColor = third;
    props.schemeSecondColor = second;
    if (!props.introLayout) {
      if (isRubric03Template(/** @type {string} */ (post.templateId))) props.introLayout = 'matsun';
      else if (isRubric04Template(/** @type {string} */ (post.templateId))) props.introLayout = 'lavash';
    }
  } else if (isQuote) {
    props.quoteColor = second;
    props.schemeSecondColor = second;
    props.titleColor = third;
    props.accentColor = third;
    props.labelColor = third;
  }

  return props;
}

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
  const style = resolvePostColorStyle(post);
  post.colorStyleId = style.id;
  post.themeColor = style.themeColor;
  if (typeof post.presetId !== 'string' || !post.presetId.trim()) {
    post.presetId = DEFAULT_PRESET;
  }
  if (typeof post.subject !== 'string') post.subject = '';
  if (!post.generation || typeof post.generation !== 'object') {
    post.generation = {status: 'draft'};
  } else if (typeof post.generation.status !== 'string') {
    post.generation.status = 'draft';
  }
  syncPostName(post);
}

/**
 * @param {Record<string, unknown>} post
 */
export function syncPostName(post) {
  const rubricName = typeof post.templateName === 'string' && post.templateName.trim()
    ? post.templateName.trim()
    : typeof post.templateId === 'string'
      ? post.templateId
      : 'Post';
  if (isRubric05Template(/** @type {string} */ (post.templateId))) {
    const infopov = typeof post.subject === 'string' ? post.subject.trim() : '';
    if (infopov) {
      const headline = infopov.split('\n')[0].trim().toUpperCase();
      post.name = `${rubricName} · ${headline.length > 72 ? `${headline.slice(0, 69)}…` : headline}`;
    } else {
      post.name = rubricName;
    }
    return;
  }
  if (isRubric06Template(/** @type {string} */ (post.templateId))) {
    const emojiName = typeof post.subject === 'string' ? post.subject.trim() : '';
    if (emojiName) {
      const label = emojiName.toUpperCase();
      post.name = `${rubricName} · ${label.length > 72 ? `${label.slice(0, 69)}…` : label}`;
    } else {
      post.name = rubricName;
    }
    return;
  }
  const item = getPostItem(post);
  post.name = item ? `${rubricName} · ${item}` : rubricName;
}

/**
 * @param {Record<string, unknown>} post
 */
export function getPostItem(post) {
  const fromCards = getPostItemFromCards(post);
  if (fromCards) return fromCards;
  if (typeof post.subject === 'string' && post.subject.trim()) {
    return post.subject.trim().toUpperCase();
  }
  return '';
}

/**
 * @param {Record<string, unknown>} post
 * @param {string} itemUpper
 */
export function applyItemToPost(post, itemUpper) {
  const item = itemUpper.trim().toUpperCase();
  if (!item) return;
  post.subject = item;
  for (const card of post.cards || []) {
    if (!card.props) card.props = {};
    const hasItem = (card.fields || []).some((f) => f.key === 'item' || f.key === 'titleAccent');
    if (hasItem) {
      card.props.item = item;
      card.props.titleAccent = item;
      syncCardPropAliases(card.props);
    }
  }
}

/**
 * @param {Record<string, unknown>} post
 */
/**
 * Per-line title colors for Rubric01 first 4 slides.
 * Line order follows RUBRIC01_CARD_TITLES split by \n.
 * @param {number} cardIndex
 * @param {{ accentColor: string, titleColor: string, background: string }} c
 * @returns {string | null}
 */
/**
 * Cards 1 and 3 are photo compositions — their background is a dark overlay, not the scheme color.
 * Cards 4–8 have fixed aesthetics independent of the scheme.
 */
const RUBRIC01_PHOTO_CARD_INDEXES = new Set([1, 3]);

/**
 * Fixed per-card title colors for Rubric01 slides 4–8.
 * These are intentionally diverse to create visual variety (not scheme-driven).
 */
const RUBRIC01_FIXED_CARD_COLORS = {
  4: { background: '#D9DDE0', titleColor: '#1E1E1E' }, // gray + dark
  5: { background: '#0F0F10', titleColor: '#FFFFFF' }, // dark + white
  6: { background: '#0F0F10', titleColor: '#FFC53A' }, // dark + yellow
  7: { background: '#0F0F10', titleColor: '#D61E23' }, // dark + red
  8: { background: '#0F0F10', titleColor: '#4A7BFF' }, // dark + blue
};

/**
 * Per-line title colors for Rubric01 first 4 slides.
 * Uses only 2 of the scheme's 3 colors per slide — never all three at once.
 * @param {number} cardIndex
 * @param {{ accentColor: string, titleColor: string, background: string }} c
 * @returns {string | null}
 */
function rubric01TitleLineColors(cardIndex, c) {
  // card 0: "HELLO\nI AM" — all titleColor, clean and simple
  if (cardIndex === 0) return null;
  // card 1: "HELLO\nI AM\nAM" — last standalone AM in accent
  if (cardIndex === 1) return `${c.titleColor},${c.titleColor},${c.accentColor}`;
  // card 2: "AM\nMEANS" — card bg is accentColor; both lines use background color
  // (only 2 colors: accentColor bg + background text, no third color)
  if (cardIndex === 2) return `${c.background},${c.background}`;
  // card 3: "AM\nMEANS\nARMENIA" — AM and ARMENIA in accent, MEANS in titleColor
  if (cardIndex === 3) return `${c.accentColor},${c.titleColor},${c.accentColor}`;
  return null;
}

export function applyPostSettingsToCards(post) {
  const label = CATEGORY_LABELS[/** @type {PostCategory} */ (post.category)] || CATEGORY_LABELS.food;
  const lockColors = post.category === 'news';
  const style = resolvePostColorStyle(post);
  const isR01 = isRubric01Template(/** @type {string} */ (post.templateId));
  const isItemRubric =
    isRubric03Template(/** @type {string} */ (post.templateId))
    || isRubric04Template(/** @type {string} */ (post.templateId));

  for (const card of post.cards || []) {
    if (!card.props) card.props = {};
    if ('label' in card.props) card.props.label = label;
    if (lockColors) continue;

    // Rubric01 cards 4–8: restore fixed per-card aesthetics (not scheme-driven)
    if (isR01 && card.cardIndex >= 4) {
      const fixed = RUBRIC01_FIXED_CARD_COLORS[card.cardIndex];
      if (fixed) {
        if ('titleColor' in card.props) card.props.titleColor = fixed.titleColor;
        if ('background' in card.props) card.props.background = fixed.background;
        delete card.props.titleLineColors;
      }
      continue;
    }

    // Apply scheme colors to text props (titleColor, factColor, etc.)
    for (const [key, value] of Object.entries(style.colors)) {
      if ((card.fields || []).some((f) => f.key === key)) {
        card.props[key] = value;
      }
    }

    // Apply background — photo cards (1, 3) keep their dark overlay; solid cards get scheme bg
    if ((card.fields || []).some((f) => f.key === 'background')) {
      if (isR01 && RUBRIC01_PHOTO_CARD_INDEXES.has(card.cardIndex)) {
        // Photo cards keep a dark overlay so the image shows through properly
        card.props.background = '#000000';
      } else if (isR01 && card.cardIndex === 2) {
        // "Flipped" card — accentColor becomes the background
        card.props.background = style.colors.accentColor;
      } else {
        card.props.background = style.colors.background;
      }
    }
    syncCardPropAliases(card.props);
  }

  // Rubric03/04: hello — item 2nd, title/label 3rd; quote — headers/label 3rd, fact 2nd.
  if (isItemRubric && !lockColors) {
    const thirdColor = style.colors.titleColor;
    const secondColor = style.colors.accentColor;
    for (const card of post.cards || []) {
      if (!card.props) card.props = {};
      card.props.schemeSecondColor = secondColor;
      const fields = card.fields || [];
      const isHello = card.props.cardKind === 'hello';
      if (fields.some((f) => f.key === 'accentColor' || f.key === 'item' || f.key === 'titleAccent')) {
        card.props.accentColor = isHello ? secondColor : thirdColor;
      }
      if (fields.some((f) => f.key === 'titleColor' || f.key === 'title')) {
        card.props.titleColor = thirdColor;
      }
      if (fields.some((f) => f.key === 'labelColor' || f.key === 'label')) {
        card.props.labelColor = thirdColor;
      }
      if (fields.some((f) => f.key === 'quoteColor' || f.key === 'fact' || f.key === 'quote')) {
        card.props.quoteColor = secondColor;
      }
      if (fields.some((f) => f.key === 'factColor')) {
        card.props.factColor = secondColor;
      }
      syncCardPropAliases(card.props);
    }
  }

  // Apply per-line title colors for Rubric01 first 4 slides
  if (isR01 && !lockColors) {
    const c = {
      accentColor: style.colors.accentColor,
      titleColor: style.colors.titleColor,
      background: style.colors.background,
    };
    for (const card of post.cards || []) {
      if (card.cardIndex >= 4) continue;
      if (!card.props) card.props = {};
      const lineColors = rubric01TitleLineColors(card.cardIndex, c);
      if (lineColors !== null) {
        card.props.titleLineColors = lineColors;
      } else {
        delete card.props.titleLineColors;
      }
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
    if (!isPostCategory(patch.category)) errors.push('Invalid topic');
    else out.category = patch.category;
  }

  if (patch.colorStyleId !== undefined) {
    const styleId = typeof patch.colorStyleId === 'string' ? patch.colorStyleId.trim() : '';
    if (!getColorStyle(styleId)) errors.push('Invalid color style');
    else out.colorStyleId = styleId;
  }

  if (patch.themeColor !== undefined && patch.colorStyleId === undefined) {
    const color = typeof patch.themeColor === 'string' ? patch.themeColor.trim() : '';
    const matches = COLOR_STYLES.filter((s) => s.themeColor.toUpperCase() === color.toUpperCase());
    if (matches.length === 1) out.colorStyleId = matches[0].id;
    else if (matches.length > 1) {
      errors.push('Choose a color style preset');
    } else if (options.admin && HEX_COLOR.test(color)) {
      out.colorStyleId = DEFAULT_COLOR_STYLE_ID;
    } else {
      errors.push('Choose a color style preset');
    }
  }

  if (patch.presetId !== undefined) {
    const presetId = typeof patch.presetId === 'string' ? patch.presetId.trim() : '';
    if (!presetId) errors.push('Preset required');
    else out.presetId = presetId;
  }

  if (patch.subject !== undefined) {
    out.subject = typeof patch.subject === 'string' ? patch.subject.trim() : '';
  }

  if (patch.name !== undefined && options.admin) {
    const name = typeof patch.name === 'string' ? patch.name.trim() : '';
    if (!name) errors.push('Post name required');
    else out.name = name;
  }

  return {errors, patch: out};
}

export {normalizeTemplateId};
