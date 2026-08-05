/** Card prop aliases: `fact` ↔ `quote`, `item` ↔ `titleAccent`. */

const FIELD_ALIASES = [
  ['fact', 'quote'],
  ['item', 'titleAccent'],
];

/**
 * @param {Record<string, unknown>} props
 */
export function syncCardPropAliases(props) {
  if (!props || typeof props !== 'object') return props;
  for (const [primary, legacy] of FIELD_ALIASES) {
    const primaryVal = props[primary];
    const legacyVal = props[legacy];
    if (typeof primaryVal === 'string' && primaryVal.trim() && !legacyVal) {
      props[legacy] = primaryVal;
    } else if (typeof legacyVal === 'string' && legacyVal.trim() && !primaryVal) {
      props[primary] = legacyVal;
    }
  }
  return props;
}

/**
 * @param {Array<{ key: string, label?: string, type?: string }>} fields
 */
export function migrateCardFields(fields) {
  if (!Array.isArray(fields)) return fields;
  for (const field of fields) {
    if (field.key === 'quote') {
      field.key = 'fact';
      if (field.label === 'Цитата' || field.label === 'Quote') field.label = 'Slide text';
    }
    if (field.key === 'titleAccent') {
      field.key = 'item';
      if (/акцент|accent/i.test(field.label || '')) field.label = 'Headline item';
    }
  }
  return fields;
}

/**
 * @param {Record<string, unknown>} post
 */
export function migratePostCardProps(post) {
  for (const card of post.cards || []) {
    if (card.fields) migrateCardFields(card.fields);
    if (card.defaultProps) syncCardPropAliases(card.defaultProps);
    if (card.props) syncCardPropAliases(card.props);
  }
  return post;
}

/**
 * @param {Record<string, unknown>} post
 */
export function getPostItemFromCards(post) {
  for (const card of post.cards || []) {
    const props = card.props || {};
    const item = props.item ?? props.titleAccent;
    if (typeof item === 'string' && item.trim()) return item.trim().toUpperCase();
  }
  return '';
}
