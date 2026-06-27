'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

export interface SortDropdownOption {
  id: string;
  label: string;
  href?: string;
}

interface SortDropdownProps {
  activeId: string;
  options: SortDropdownOption[];
  onSelect?: (id: string) => void;
  ariaLabel?: string;
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4v16M8 4L5 7M8 4l3 3M16 20V4M16 20l-3-3M16 20l3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="control-pill__chevron">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SortDropdown({
  activeId,
  options,
  onSelect,
  ariaLabel = 'Сортировка',
}: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = options.find((option) => option.id === activeId) ?? options[0];

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

  if (!active) return null;

  return (
    <div className="control-dropdown" ref={rootRef}>
      <button
        type="button"
        className="control-pill"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <SortIcon />
        <span>{active.label}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="control-dropdown__panel" id={listId} role="menu">
          {options.map((option) => {
            const isActive = option.id === activeId;

            if (option.href) {
              return (
                <Link
                  key={option.id}
                  href={option.href}
                  className={`control-dropdown__item${isActive ? ' control-dropdown__item--active' : ''}`}
                  role="menuitem"
                  scroll={false}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                >
                  {option.label}
                </Link>
              );
            }

            return (
              <button
                key={option.id}
                type="button"
                className={`control-dropdown__item${isActive ? ' control-dropdown__item--active' : ''}`}
                role="menuitem"
                onClick={() => {
                  onSelect?.(option.id);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
