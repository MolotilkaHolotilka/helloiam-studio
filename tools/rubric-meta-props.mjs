/**
 * Rubric composition props set by templates — not edited in the post form.
 * Keep in sync with RubricCardProps in src/templates/_rubric/types.ts
 */
export const RUBRIC_META_PROP_KEYS = [
  'engine',
  'cardKind',
  'cardIndex',
  'cardCount',
  'cardLayout',
  'introLayout',
  // System-managed visual prop for Rubric01 multi-color title lines
  'titleLineColors',
  /** Rubric03/04: second swatch color — fact body text */
  'schemeSecondColor',
];

export const RUBRIC_META_PROP_KEY_SET = new Set(RUBRIC_META_PROP_KEYS);
