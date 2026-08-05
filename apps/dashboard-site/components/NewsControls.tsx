import { FilterSortToolbar } from '@/components/controls/FilterSortToolbar';
import { FiltersDropdown, type FilterDropdownOption } from '@/components/controls/FiltersDropdown';
import { buildDashboardHref } from '@/lib/dashboard-url';
import { RUBRIC_FILTERS, type RubricFilterId } from '@/lib/rubric-filter';

interface NewsControlsProps {
  activeRubric: RubricFilterId;
  date?: string;
  title?: string;
}

export function NewsControls({ activeRubric, date, title }: NewsControlsProps) {
  const options: FilterDropdownOption[] = RUBRIC_FILTERS.map((filter) => ({
    id: filter.id,
    label: 'emoji' in filter && filter.emoji ? `${filter.emoji} ${filter.label}` : filter.label,
    href: buildDashboardHref({
      source: 'exa',
      date,
      rubric: filter.id === 'all' ? undefined : filter.id,
    }),
    active: activeRubric === filter.id,
  }));

  return (
    <FilterSortToolbar
      startAction={
        title ? (
          <h2 className="headline top-stories__title top-stories__title--inline">{title}</h2>
        ) : undefined
      }
    >
      <FiltersDropdown options={options} ariaLabel="Фильтр по рубрикам" />
    </FilterSortToolbar>
  );
}
