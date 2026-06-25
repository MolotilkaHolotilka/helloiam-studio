/** Rubric 01 — fixed slide titles (not LLM-generated). */

import {isRubric01Template, RUBRIC01_ID} from '../rubric/rubric-ids.mjs';

export {RUBRIC01_ID as FORMAT01_ID, isRubric01Template, isRubric01Template as isFormat01Template};

/** @type {Record<number, string>} */
export const RUBRIC01_CARD_TITLES = {
  0: 'HELLO\nI AM',
  1: 'HELLO\nI AM\nAM',
  2: 'AM\nMEANS',
  3: 'AM\nMEANS\nARMENIA',
  4: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
  5: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
  6: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
  7: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
  8: 'HELLO\nI AM\nAM\nMEANS\nARMENIA',
};

/** @deprecated */
export const FORMAT01_CARD_TITLES = RUBRIC01_CARD_TITLES;

/**
 * @param {number} cardIndex
 */
export function getRubric01Title(cardIndex) {
  return RUBRIC01_CARD_TITLES[cardIndex];
}

/** @deprecated */
export const getFormat01Title = getRubric01Title;

/**
 * @param {Record<string, unknown>} post
 */
export function applyRubric01TitlesToPost(post) {
  if (!isRubric01Template(/** @type {string} */ (post.templateId))) return post;
  for (const card of post.cards || []) {
    const fixed = getRubric01Title(card.cardIndex);
    if (!fixed) continue;
    if (!card.props) card.props = {};
    card.props.title = fixed;
  }
  return post;
}

/** @deprecated */
export const applyFormat01TitlesToPost = applyRubric01TitlesToPost;
