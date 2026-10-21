export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T;
  sortable?: boolean;
}

export interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowSelect?: (item: T) => void;
  ariaLabel: string;
  getRowId?: (item: T) => string;
}

export type SortDirection = 'ascending' | 'descending';

export interface SortState<T> {
  key: keyof T;
  direction: SortDirection;
}

export interface PaginationResult<T> {
  rows: T[];
  page: number;
  pageCount: number;
}

export type RowIdGetter<T> = (item: T) => string;
