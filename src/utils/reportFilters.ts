import type { MovementReport, MovementType, ReportStatus } from '../types/report';
import { movementLabel } from './reportDisplay';

// Filter and sort options for the My Reports page.

export type MovementFilter = 'all' | MovementType;
export type StatusFilter = 'all' | ReportStatus;
export type SortOption =
  | 'newest'
  | 'oldest'
  | 'highest'
  | 'lowest'
  | 'name-asc'
  | 'name-desc';

export const DEFAULT_MOVEMENT_FILTER: MovementFilter = 'all';
export const DEFAULT_STATUS_FILTER: StatusFilter = 'all';
export const DEFAULT_SORT_OPTION: SortOption = 'newest';

/*
 * Applies, in order: search → movement filter → status filter → sort.
 * Never mutates the input array. Search matches the movement label,
 * custom movement name, file name, and summary — never IDs.
 */
export function filterAndSortReports(
  reports: MovementReport[],
  searchQuery: string,
  movementFilter: MovementFilter,
  statusFilter: StatusFilter,
  sortOption: SortOption,
): MovementReport[] {
  const query = searchQuery.trim().toLowerCase();

  let result = reports;

  if (query) {
    result = result.filter((report) => {
      const haystacks = [
        movementLabel(report),
        report.customMovementName ?? '',
        report.fileName,
        report.summary,
      ];
      return haystacks.some((text) => text.toLowerCase().includes(query));
    });
  }

  if (movementFilter !== 'all') {
    result = result.filter((report) => report.movementType === movementFilter);
  }

  if (statusFilter !== 'all') {
    result = result.filter((report) => report.status === statusFilter);
  }

  const sorted = [...result];
  switch (sortOption) {
    case 'newest':
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      break;
    case 'oldest':
      sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      break;
    case 'highest':
      sorted.sort((a, b) => b.overallScore - a.overallScore);
      break;
    case 'lowest':
      sorted.sort((a, b) => a.overallScore - b.overallScore);
      break;
    case 'name-asc':
      sorted.sort((a, b) => movementLabel(a).localeCompare(movementLabel(b)));
      break;
    case 'name-desc':
      sorted.sort((a, b) => movementLabel(b).localeCompare(movementLabel(a)));
      break;
  }
  return sorted;
}
