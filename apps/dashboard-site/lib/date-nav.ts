const CHIP_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

export function sortDatesDesc(dates: string[]): string[] {
  return [...new Set(dates)].sort((a, b) => b.localeCompare(a));
}

export function getRecentDates(dates: string[], limit = 3): string[] {
  return sortDatesDesc(dates).slice(0, limit);
}

export function formatDateChipLabel(date: string): string {
  return CHIP_FORMAT.format(new Date(`${date}T12:00:00`));
}

export function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

export function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function buildMonthGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const mondayStart = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < mondayStart; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, date: toDateKey(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const MONTH_LABELS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
