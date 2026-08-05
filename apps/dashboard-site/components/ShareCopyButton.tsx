'use client';

import { useState } from 'react';

interface ShareCopyButtonProps {
  url: string;
  className?: string;
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v10M12 3l-3.5 3.5M12 3l3.5 3.5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareCopyButton({ url, className = '' }: ShareCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className={`share-copy-btn${copied ? ' share-copy-btn--copied' : ''}${className ? ` ${className}` : ''}`}
      onClick={(event) => void handleCopy(event)}
      aria-label={copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
      title={copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
    >
      <ShareIcon />
    </button>
  );
}
