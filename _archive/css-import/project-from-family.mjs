/** @param {string} family */
export function projectFromFamily(family) {
  if (family === 'intro-hero') return 'am-food';
  if (family === 'news-126') return 'am-news';
  return 'am-news';
}
