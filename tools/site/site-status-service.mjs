const SITE_ORIGIN = 'https://helloiam.am';
const CACHE_MS = 5 * 60 * 1000;
let cached = null;

async function fetchTimed(url, options = {}) {
  const started = Date.now();
  const response = await fetch(url, {redirect: 'follow', signal: AbortSignal.timeout(12_000), ...options});
  return {response, responseMs: Date.now() - started};
}

function decodeEntities(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function metaContent(html, key, attribute = 'name') {
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${key}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]);
  }
  return '';
}

function linkHref(html, rel) {
  const match = html.match(new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']`, 'i'));
  return match ? new URL(decodeEntities(match[1]), SITE_ORIGIN).href : '';
}

function sitemapRoutes(xml) {
  return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/gi)].map((match) => {
    const block = match[2];
    const value = (name) => block.match(new RegExp(`<${name}>([^<]+)</${name}>`, 'i'))?.[1] || '';
    const url = decodeEntities(match[1]);
    return {url, path: new URL(url).pathname, lastmod: value('lastmod'), changefreq: value('changefreq'), priority: value('priority')};
  });
}

function uniqueMatches(html, pattern) {
  return [...new Set([...html.matchAll(pattern)].map((match) => match[1]))];
}

function plainText(value = '') {
  return decodeEntities(value.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

export async function getSiteStatus() {
  if (cached && Date.now() - cached.createdAt < CACHE_MS) return cached.data;
  const [{response: homeResponse, responseMs}, {response: sitemapResponse}, {response: robotsResponse}] = await Promise.all([
    fetchTimed(`${SITE_ORIGIN}/`),
    fetchTimed(`${SITE_ORIGIN}/sitemap.xml`),
    fetchTimed(`${SITE_ORIGIN}/robots.txt`),
  ]);
  const [html, sitemapXml, robots] = await Promise.all([homeResponse.text(), sitemapResponse.text(), robotsResponse.text()]);
  const routes = sitemapRoutes(sitemapXml);
  const routeChecks = await Promise.all(routes.map(async (route) => {
    try {
      const {response, responseMs: routeResponseMs} = await fetchTimed(route.url, {method: 'HEAD'});
      return {...route, status: response.status, responseMs: routeResponseMs};
    } catch (error) {
      return {...route, status: 0, responseMs: 0, error: error.message};
    }
  }));
  const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
  const schemaTypes = uniqueMatches(html, /"@type"\s*:\s*"([^"]+)"/gi);
  const sections = [...html.matchAll(/<section[^>]+id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/section>/gi)].map((match) => {
    const block = match[2];
    const heading = block.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1]
      || block.match(/<p[^>]*class=["'][^"']*kicker[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]
      || match[1];
    return {id: match[1], title: plainText(heading)};
  });
  const assetUrls = uniqueMatches(html, /(?:src|href)=["']((?:assets\/|home\.(?:css|js))[^"']+)["']/gi).map((url) => new URL(url, SITE_ORIGIN).href);
  const currencySelect = html.match(/<select[^>]+data-cur-select[^>]*>([\s\S]*?)<\/select>/i)?.[1] || '';
  const data = {
    checkedAt: new Date().toISOString(),
    origin: SITE_ORIGIN,
    homepage: {
      status: homeResponse.status,
      responseMs,
      finalUrl: homeResponse.url,
      title,
      description: metaContent(html, 'description'),
      canonical: linkHref(html, 'canonical'),
      robots: metaContent(html, 'robots'),
      themeColor: metaContent(html, 'theme-color'),
      ogTitle: metaContent(html, 'og:title', 'property'),
      ogDescription: metaContent(html, 'og:description', 'property'),
      ogImage: metaContent(html, 'og:image', 'property'),
      twitterCard: metaContent(html, 'twitter:card'),
      schemaTypes,
      server: homeResponse.headers.get('server') || '',
      lastModified: homeResponse.headers.get('last-modified') || '',
    },
    routes: routeChecks,
    robots: {status: robotsResponse.status, content: robots.trim()},
    sitemap: {status: sitemapResponse.status, routeCount: routes.length, latestModified: routes.map((route) => route.lastmod).filter(Boolean).sort().at(-1) || ''},
    content: {
      sections,
      tourPaths: routes.filter((route) => route.path.startsWith('/tours/')).map((route) => route.path),
      legalPaths: routes.filter((route) => route.path.startsWith('/legal/')).map((route) => route.path),
      languages: uniqueMatches(html, /<option value=["']([a-z]{2})["']/gi),
      currencies: uniqueMatches(currencySelect, /<option value=["']([A-Z]{3})["']/g),
      forms: (html.match(/<form\b/gi) || []).length,
      images: (html.match(/<img\b/gi) || []).length,
      videos: (html.match(/<video\b/gi) || []).length,
      assetUrls,
      email: html.match(/mailto:([^"']+)/i)?.[1] || '',
      instagram: html.match(/https:\/\/www\.instagram\.com\/([^"'/]+)/i)?.[1] || '',
    },
    connections: {cms: false, deployment: false, analytics: false, formsInbox: false},
  };
  cached = {createdAt: Date.now(), data};
  return data;
}
