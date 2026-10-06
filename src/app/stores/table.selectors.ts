import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TABLE_COLUMNS } from './table.reducer';
import { TableState } from '../types/table.models';

export const selectTableState = createFeatureSelector<TableState>('table');

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
  (state) => Math.max(1, Math.ceil(state.total / state.pageSize)),
);

export const selectSelectionMode = createSelector(
  selectTableState,
  (state) => ({
    allVisibleSelected:
      state.rows.length > 0 && state.rows.every((row) => state.selectedIds.includes(row.id)),
    count: state.selectedIds.length,
  }),
);

/** 当前查询世代号：每次条件改动或刷新自增。 */
export const selectQueryVersion = createSelector(selectTableState, (state) => state.queryVersion);

/** 当前展示的快照所属世代。 */
export const selectSnapshotVersion = createSelector(
  selectTableState,
  (state) => state.snapshotVersion,
);

/**
 * 分页、订单汇总与导出共用的快照：三者同源，不会出现行是 A 世代、汇总是 B 世代的混用。
 */
export const selectSnapshot = createSelector(selectTableState, (state) => ({
  version: state.snapshotVersion,
  rows: state.rows,
  total: state.total,
  groups: state.groups,
  aggregates: state.aggregates,
  elapsedMs: state.elapsedMs,
  request: state.lastRequest,
}));

/** 最近一次失败查询的现场（含版本与条件），用于重试。 */
export const selectQueryError = createSelector(selectTableState, (state) => state.queryError);

/** 是否有当前世代的查询正在加载。 */
export const selectQueryLoading = createSelector(selectTableState, (state) => state.loading);

/** 待确认的视图覆盖冲突。 */
export const selectViewConflict = createSelector(
  selectTableState,
  (state) => state.pendingViewConflict,
);

export const selectSavedViews = createSelector(selectTableState, (state) => state.savedViews);
