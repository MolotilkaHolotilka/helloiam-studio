'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  buildMonthGrid,
  MONTH_LABELS,
  parseDateParts,
  WEEKDAY_LABELS,
} from '@/lib/date-nav';

interface DateCalendarPickerProps {
  availableDates: Array<{ date: string; href: string }>;
  activeDate: string;
  today: string;
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DateCalendarPicker({
  availableDates,
  activeDate,
  today,
}: DateCalendarPickerProps) {
  const activeParts = parseDateParts(activeDate);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(activeParts.year);
  const [month, setMonth] = useState(activeParts.month);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const hrefByDate = new Map(availableDates.map((item) => [item.date, item.href]));
  const pickerActive = open || !availableDates.slice(0, 3).some((item) => item.date === activeDate);

  useEffect(() => {
    if (!open) return;
    const parts = parseDateParts(activeDate);
    setYear(parts.year);
    setMonth(parts.month);
  }, [open, activeDate]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const cells = buildMonthGrid(year, month);

  return (
    <div className="date-calendar" ref={rootRef}>
      <button
        type="button"
        className={`date-chip date-chip--more${pickerActive ? ' date-chip--active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Выбрать дату в календаре"
      >
        <CalendarIcon />
      </button>

      {open && (
        <div id={panelId} className="date-calendar__popover" role="dialog" aria-label="Календарь">
          <div className="date-calendar__header">
            <button type="button" className="date-calendar__nav" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
              ‹
            </button>
            <span className="date-calendar__title">{MONTH_LABELS[month - 1]} {year}</span>
            <button type="button" className="date-calendar__nav" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
              ›
            </button>
          </div>

          <div className="date-calendar__weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="date-calendar__weekday">{label}</span>
            ))}
          </div>

          <div className="date-calendar__grid">
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className="date-calendar__day date-calendar__day--empty" />;
              }

              const href = hrefByDate.get(cell.date);
              const hasData = Boolean(href);
              const isActive = cell.date === activeDate;
              const isToday = cell.date === today;

              if (!hasData) {
                return (
                  <span
                    key={cell.date}
                    className={`date-calendar__day${isToday ? ' date-calendar__day--today' : ''}`}
                    aria-hidden
                  >
                    {cell.day}
                  </span>
                );
              }

              return (
                <Link
                  key={cell.date}
                  href={href || '#'}
                  className={`date-calendar__day date-calendar__day--has-data${isActive ? ' date-calendar__day--active' : ''}${isToday ? ' date-calendar__day--today' : ''}`}
                  scroll={false}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                >
                  {cell.day}
                </Link>
              );
            })}
          </div>

          <p className="caption date-calendar__hint">Подсвечены дни с данными</p>
        </div>
      )}
    </div>
  );
}
