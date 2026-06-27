export function formatApiErrorForUser(message: string, maxLength = 220): string {
  const lower = message.toLowerCase();

  if (message.includes('<!DOCTYPE') || message.includes('<html') || lower.includes('cloudflare')) {
    if (lower.includes('exa')) {
      return 'Exa.ai недоступен: IP заблокирован Cloudflare. Новости не собрать — используйте архив или другую сеть.';
    }
    return 'Внешний сервис временно недоступен. Попробуйте позже.';
  }

  if (lower.includes('exa api') && (lower.includes('403') || lower.includes('blocked'))) {
    return 'Exa.ai заблокировал запрос. Новости требуют Exa; YouTube собирается через YouTube API.';
  }

  if (lower.includes('youtube search api') || lower.includes('youtube videos api')) {
    if (lower.includes('403')) {
      return 'Лимит YouTube API. Подождите и попробуйте снова.';
    }
    return 'Ошибка YouTube API. Проверьте YOUTUBE_API_KEY и квоту.';
  }

  if (message.length > maxLength) {
    return `${message.slice(0, maxLength)}…`;
  }

  return message;
}

export function formatApiErrorForLog(message: string): string {
  if (message.includes('<!DOCTYPE') || message.includes('<html')) {
    if (message.toLowerCase().includes('cloudflare')) {
      return 'blocked by Cloudflare';
    }
    return 'non-JSON HTML response';
  }

  return message.length > 160 ? `${message.slice(0, 160)}…` : message;
}
