/** Canonical Rubric template IDs (Rubric 01–05). */

export const RUBRIC01_ID = 'Rubric01';
export const RUBRIC02_ID = 'Rubric02';
export const RUBRIC03_ID = 'Rubric03';
export const RUBRIC04_ID = 'Rubric04';
export const RUBRIC05_ID = 'Rubric05';
export const RUBRIC06_ID = 'Rubric06';

export const RUBRIC_IDS = [RUBRIC01_ID, RUBRIC02_ID, RUBRIC03_ID, RUBRIC04_ID, RUBRIC05_ID];

/** @type {Record<string, string>} Legacy templateId → canonical Rubric id */
export const LEGACY_TEMPLATE_ALIASES = {
  Format01: RUBRIC01_ID,
  HelloIamWineV1: RUBRIC02_ID,
  IAmMatsunDeepDive: RUBRIC03_ID,
  GreenPlateIntro: RUBRIC04_ID,
  HelloIamNewsV1: RUBRIC05_ID,
};

/** @deprecated use RUBRIC01_ID */
export const FORMAT01_ID = RUBRIC01_ID;
/** @deprecated use RUBRIC02_ID */
export const FORMAT02_ID = RUBRIC02_ID;
/** @deprecated use RUBRIC03_ID */
export const FORMAT03_ID = RUBRIC03_ID;
/** @deprecated use RUBRIC04_ID */
export const FORMAT04_ID = RUBRIC04_ID;
/** @deprecated use RUBRIC05_ID */
export const FORMAT05_ID = RUBRIC05_ID;

/**
 * @param {string | undefined} templateId
 */
export function normalizeTemplateId(templateId) {
  if (!templateId) return templateId;
  return LEGACY_TEMPLATE_ALIASES[templateId] || templateId;
}

/**
 * @param {string | undefined} templateId
 */
export function isRubric01Template(templateId) {
  return normalizeTemplateId(templateId) === RUBRIC01_ID;
}

/**
 * @param {string | undefined} templateId
 */
export function isRubric02Template(templateId) {
  return normalizeTemplateId(templateId) === RUBRIC02_ID;
}

/**
 * @param {string | undefined} templateId
 */
export function isRubric03Template(templateId) {
  return normalizeTemplateId(templateId) === RUBRIC03_ID;
}

/**
 * @param {string | undefined} templateId
 */
export function isRubric04Template(templateId) {
  return normalizeTemplateId(templateId) === RUBRIC04_ID;
}

/**
 * @param {string | undefined} templateId
 */
export function isRubric05Template(templateId) {
  return normalizeTemplateId(templateId) === RUBRIC05_ID;
}

/**
 * @param {string | undefined} templateId
 */
export function isRubric06Template(templateId) {
  return normalizeTemplateId(templateId) === RUBRIC06_ID;
}

/** @deprecated use isRubric01Template */
export const isFormat01Template = isRubric01Template;
/** @deprecated use isRubric05Template */
export const isFormat05Template = isRubric05Template;

/**
 * @param {string | undefined} templateId
 */
export function rubricShowsEmojiPicker(templateId) {
  const id = normalizeTemplateId(templateId);
  return id !== RUBRIC05_ID && id !== RUBRIC06_ID;
}

/**
 * Rubric 03/04 — emoji on slide 0 + last; 01/02/05 — last only.
 * @param {string | undefined} templateId
 */
export function rubricEmojiOnFirstSlide(templateId) {
  const id = normalizeTemplateId(templateId);
  return id === RUBRIC03_ID || id === RUBRIC04_ID;
}
