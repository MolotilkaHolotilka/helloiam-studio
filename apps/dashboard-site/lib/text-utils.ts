const SOURCE_NAMES: Record<string, string> = {
  'cnn.com': 'CNN',
  'bloomberg.com': 'Bloomberg',
  'aljazeera.com': 'Al Jazeera',
  'cbc.ca': 'CBC News',
  'reuters.com': 'Reuters',
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'theguardian.com': 'The Guardian',
  'nytimes.com': 'The New York Times',
  'nationalgeographic.com': 'National Geographic',
  'wsetglobal.com': 'WSET',
  'worldoffinewine.com': 'World of Fine Wine',
  'nomadicmatt.com': 'Nomadic Matt',
  'thebrokebackpacker.com': 'The Broke Backpacker',
  'bucketlistly.blog': 'BucketListly Blog',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'panarmenian.net': 'PanARMENIAN.Net',
  'armenpress.am': 'Armenpress',
  'verelq.am': 'Verelq News',
  'kavkaz-uzel.eu': 'Кавказский Узел',
  'eurasianet.org': 'Eurasianet',
  'rusi.org': 'RUSI',
  'armenianreport.com': 'ArmenianReport',
};

export function cleanText(text: string) {
  let cleaned = text
    .replace(/\[\.\.\.\]/g, ' ')
    .replace(/\[…\]/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^(?:Резюме|Summary|Краткое описание|Ключевые моменты)[:\s-]*/i, '')
    .replace(/(?:адаптирован(?:о|ное)|имеющ(?:ие|ее) отношение) к вашему запросу[^.]*\.?\s*/gi, '')
    .replace(/\(на основе статьи[^)]*\)\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const metaPatterns = [
    /\s*(?:Если (?:вам )?нужен|Если хотите|Могу также|Я могу).*$/i,
    /\s*(?:If you (?:want|need)|I can also).*$/i,
  ];

  for (const pattern of metaPatterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  return cleaned;
}

export function truncateToSentences(text: string, maxSentences = 3) {
  const cleaned = cleanText(text);
  if (!cleaned) return '';

  const parts = cleaned.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [cleaned];
  return parts.slice(0, maxSentences).join(' ').trim();
}

export function splitParagraphs(text: string) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const byNewline = cleaned.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  const sentences = cleaned.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [cleaned];
  const paragraphs: string[] = [];
  let buffer: string[] = [];

  for (const sentence of sentences) {
    buffer.push(sentence.trim());
    if (buffer.length >= 3) {
      paragraphs.push(buffer.join(' '));
      buffer = [];
    }
  }

  if (buffer.length) paragraphs.push(buffer.join(' '));
  return paragraphs.length ? paragraphs : [cleaned];
}

export function extractSourceName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (SOURCE_NAMES[hostname]) return SOURCE_NAMES[hostname];

    const base = hostname.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Источник';
  }
}

export function hasExtendedContent(summary: string, fullSummary: string) {
  const short = cleanText(summary);
  const full = cleanText(fullSummary);
  if (!full || full === short) return false;
  return full.length > short.length + 40;
}
