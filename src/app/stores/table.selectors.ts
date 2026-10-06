import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TABLE_COLUMNS } from './table.reducer';
import { TableState } from '../types/table.models';

export const selectTableState = createFeatureSelector<TableState>('table');

export const selectSnapshot = createSelector(selectTableState, (state) => state.snapshot);

export const selectFailedQuery = createSelector(selectTableState, (state) => state.failedQuery);

export const selectPendingViewConflict = createSelector(
  selectTableState,
  (state) => state.pendingViewConflict,
);

export const selectVisibleColumnDefinitions = createSelector(selectTableState, (state) =>
  TABLE_COLUMNS.filter((column) => state.visibleColumns.includes(column.key)).map((column) => ({
    ...column,
    width: state.columnWidths[column.key] ?? 132,
    pinned: state.pinnedColumns.includes(column.key),
  })),
);

export const selectAllColumnDefinitions = createSelector(
  selectTableState,
  (state) => TABLE_COLUMNS.map((column) => ({
    ...column,
    visible: state.visibleColumns.includes(column.key),
    pinned: state.pinnedColumns.includes(column.key),
  })),
);

export const selectPageCount = createSelector(
  selectTableState,
  (state) => Math.max(1, Math.ceil((state.snapshot?.total ?? 0) / state.pageSize)),
);

export const selectSelectionMode = createSelector(
  selectTableState,
  (state) => ({
    allVisibleSelected:
      (state.snapshot?.rows.length ?? 0) > 0 &&
      state.snapshot!.rows.every((row) => state.selectedIds.includes(row.id)),
    count: state.selectedIds.length,
  }),
);
