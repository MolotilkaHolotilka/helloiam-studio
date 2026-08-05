import type { ReactNode } from 'react';

interface FilterSortToolbarProps {
  children: ReactNode;
  startAction?: ReactNode;
}

export function FilterSortToolbar({ children, startAction }: FilterSortToolbarProps) {
  return (
    <div className="filter-sort-toolbar" role="toolbar" aria-label="Сортировка и фильтры">
      {startAction ? <div className="filter-sort-toolbar__start">{startAction}</div> : null}
      <div className="filter-sort-toolbar__controls">{children}</div>
    </div>
  );
}
