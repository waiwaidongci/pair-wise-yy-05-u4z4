import { createReducer, on } from '@ngrx/store';
import {
  FilterGroup,
  TableRow,
  TableState,
} from '../types/table.models';
import { readStoredViews } from '../data/view-repository.service';
import * as TableActions from './table.actions';

export const EMPTY_FILTER: FilterGroup = {
  kind: 'group',
  id: 'root',
  logic: 'and',
  children: [],
};

export const TABLE_COLUMNS: Array<{ key: keyof TableRow; label: string }> = [
  { key: 'orderNo', label: '订单编号' },
  { key: 'customer', label: '客户名称' },
  { key: 'region', label: '区域' },
  { key: 'category', label: '产品线' },
  { key: 'owner', label: '负责人' },
  { key: 'amount', label: '合同金额' },
  { key: 'quantity', label: '数量' },
  { key: 'margin', label: '毛利率' },
  { key: 'status', label: '状态' },
  { key: 'updatedAt', label: '更新时间' },
];

const initialVisibleColumns = TABLE_COLUMNS.map((column) => column.key);
const initialWidths = Object.fromEntries(
  TABLE_COLUMNS.map((column) => [
    column.key,
    ['orderNo', 'customer'].includes(String(column.key)) ? 190 : 132,
  ]),
);

export const initialState: TableState = {
  snapshot: null,
  requestVersion: 0,
  loading: false,
  error: null,
  failedQuery: null,
  page: 0,
  pageSize: 100,
  sort: { field: 'updatedAt', direction: 'desc' },
  filter: EMPTY_FILTER,
  search: '',
  groupBy: null,
  treeMode: false,
  expandedIds: [],
  selectedIds: [],
  visibleColumns: initialVisibleColumns,
  columnWidths: initialWidths,
  pinnedColumns: ['orderNo', 'customer'],
  density: 'standard',
  savedViews: readStoredViews(),
  activeViewId: null,
  pendingViewConflict: null,
  dirtyCells: {},
};

/**
 * 查询条件一旦改动：版本号 +1，此前发出的所有慢响应随之作废；
 * 同时清掉上一次失败记录（它属于旧条件），快照保留到新结果到达为止。
 */
function invalidate(state: TableState) {
  return {
    requestVersion: state.requestVersion + 1,
    loading: true,
    error: null,
    failedQuery: null,
  };
}

export const tableReducer = createReducer(
  initialState,
  on(TableActions.loadPage, (state) => ({ ...state, ...invalidate(state) })),
  on(TableActions.loadPageSuccess, (state, { version, request, result }) => {
    if (version !== state.requestVersion) {
      // 慢查询乱序返回的旧版本结果，直接丢弃，不允许覆盖新条件
      return state;
    }
    const rows = result.rows.map((row) => {
      const dirty = Object.entries(state.dirtyCells).reduce<TableRow>((current, [key, value]) => {
        const [id, field] = key.split('::');
        return current.id === id ? { ...current, [field]: value } : current;
      }, row);
      return dirty;
    });
    return {
      ...state,
      // 分页、汇总、导出共用的一份快照，整体原子替换
      snapshot: {
        version,
        request,
        rows,
        total: result.total,
        groups: result.groups,
        aggregates: result.aggregates,
        elapsedMs: result.elapsedMs,
        receivedAt: new Date().toISOString(),
      },
      loading: false,
      error: null,
      failedQuery: null,
    };
  }),
  on(TableActions.loadPageFailure, (state, { version, request, error }) => {
    if (version !== state.requestVersion) {
      return state;
    }
    // 保留上一次可用快照（snapshot 不动），只记录出错的那次查询供重试
    return {
      ...state,
      loading: false,
      error,
      failedQuery: { version, request, error, failedAt: new Date().toISOString() },
    };
  }),
  on(TableActions.retryFailedQuery, (state) =>
    state.failedQuery
      ? { ...state, requestVersion: state.requestVersion + 1, loading: true, error: null }
      : state,
  ),
  on(TableActions.setPage, (state, { page }) => ({ ...state, page, ...invalidate(state) })),
  on(TableActions.setPageSize, (state, { pageSize }) => ({ ...state, pageSize, page: 0, ...invalidate(state) })),
  on(TableActions.setSort, (state, { sort }) => ({ ...state, sort, page: 0, ...invalidate(state) })),
  on(TableActions.setFilter, (state, { filter }) => ({ ...state, filter, page: 0, ...invalidate(state) })),
  on(TableActions.setSearch, (state, { search }) => ({ ...state, search, page: 0, ...invalidate(state) })),
  on(TableActions.setGroupBy, (state, { groupBy }) => ({ ...state, groupBy, page: 0, ...invalidate(state) })),
  on(TableActions.toggleTreeMode, (state) => ({
    ...state,
    treeMode: !state.treeMode,
    page: 0,
    ...invalidate(state),
  })),
  on(TableActions.toggleExpanded, (state, { id }) => ({
    ...state,
    expandedIds: state.expandedIds.includes(id)
      ? state.expandedIds.filter((item) => item !== id)
      : [...state.expandedIds, id],
    ...invalidate(state),
  })),
  on(TableActions.setSelection, (state, { ids }) => ({ ...state, selectedIds: ids })),
  on(TableActions.toggleColumn, (state, { key }) => ({
    ...state,
    visibleColumns: state.visibleColumns.includes(key)
      ? state.visibleColumns.filter((item) => item !== key)
      : [...state.visibleColumns, key],
  })),
  on(TableActions.resizeColumn, (state, { key, width }) => ({
    ...state,
    columnWidths: { ...state.columnWidths, [key]: Math.max(88, width) },
  })),
  on(TableActions.togglePinned, (state, { key }) => ({
    ...state,
    pinnedColumns: state.pinnedColumns.includes(key)
      ? state.pinnedColumns.filter((item) => item !== key)
      : [...state.pinnedColumns, key],
  })),
  on(TableActions.setDensity, (state, { density }) => ({ ...state, density })),
  on(TableActions.updateCell, (state, { id, key, value }) => ({
    ...state,
    snapshot: state.snapshot
      ? {
          ...state.snapshot,
          rows: state.snapshot.rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
        }
      : state.snapshot,
    dirtyCells: { ...state.dirtyCells, [`${id}::${String(key)}`]: value },
  })),
  on(TableActions.saveViewSuccess, (state, { views, activeViewId }) => ({
    ...state,
    savedViews: views,
    activeViewId,
    pendingViewConflict: null,
  })),
  on(TableActions.saveViewConflict, (state, { conflict }) => ({
    ...state,
    pendingViewConflict: conflict,
  })),
  on(TableActions.cancelViewConflict, (state) => ({ ...state, pendingViewConflict: null })),
  on(TableActions.applyView, (state, { view }) => ({
    ...state,
    pageSize: view.pageSize,
    visibleColumns: [...view.visibleColumns],
    columnWidths: { ...view.columnWidths },
    pinnedColumns: [...view.pinnedColumns],
    sort: view.sort,
    filter: view.filter,
    groupBy: view.groupBy,
    treeMode: view.treeMode,
    activeViewId: view.id,
    page: 0,
    ...invalidate(state),
  })),
  on(TableActions.deleteView, (state, { id }) => ({
    ...state,
    savedViews: state.savedViews.filter((view) => view.id !== id),
    activeViewId: state.activeViewId === id ? null : state.activeViewId,
  })),
);
