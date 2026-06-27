'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

export interface FilterDropdownOption {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

interface FiltersDropdownProps {
  options: FilterDropdownOption[];
  ariaLabel?: string;
}

function FiltersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function FiltersDropdown({
  options,
  ariaLabel = 'Фильтры',
}: FiltersDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const activeCount = options.filter((option) => option.active && option.id !== 'all').length;

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="control-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`control-pill${activeCount > 0 ? ' control-pill--active' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <FiltersIcon />
        <span>Все фильтры</span>
        {activeCount > 0 && <span className="control-pill__badge">{activeCount}</span>}
      </button>

      {open && (
        <div className="control-dropdown__panel control-dropdown__panel--filters" id={listId} role="menu">
          <div className="control-dropdown__chips">
            {options.map((option) => (
              <Link
                key={option.id}
                href={option.href}
                className={`date-chip${option.active ? ' date-chip--active' : ''}`}
                role="menuitem"
                scroll={false}
                prefetch={false}
                onClick={() => setOpen(false)}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
