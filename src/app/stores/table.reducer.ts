import { createReducer, on } from '@ngrx/store';
import {
  AggregateResult,
  FilterGroup,
  QueryRequest,
  SavedView,
  TableRow,
  TableState,
} from '../types/table.models';
import * as TableActions from './table.actions';

const EMPTY_AGGREGATE: AggregateResult = { amount: 0, quantity: 0, averageMargin: 0 };

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
  rows: [],
  total: 0,
  groups: [],
  aggregates: EMPTY_AGGREGATE,
  loading: false,
  error: null,
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
  elapsedMs: 0,
  savedViews: [],
  activeViewId: null,
  dirtyCells: {},
  queryVersion: 0,
  snapshotVersion: null,
  lastRequest: null,
  queryError: null,
  pendingViewConflict: null,
};

/** 一次新查询世代开始：版本自增、置加载态、清掉旧错误。旧结果据此立即失效。 */
function beginQuery(state: TableState): TableState {
  return { ...state, queryVersion: state.queryVersion + 1, loading: true, queryError: null };
}

/** 从当前状态拼装查询请求，版本与世代一一对应。 */
function requestFromState(state: TableState): QueryRequest {
  return {
    version: state.queryVersion,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    filter: state.filter,
    groupBy: state.groupBy,
    treeMode: state.treeMode,
    expandedIds: state.expandedIds,
    search: state.search,
  };
}

export const tableReducer = createReducer(
  initialState,
  on(TableActions.loadPage, (state) => beginQuery(state)),
  on(TableActions.loadPageSuccess, (state, { result }) => {
    // 版本守卫：只接受当前世代的结果，慢查询乱序返回时旧结果不会覆盖新条件。
    if (result.version !== state.queryVersion) {
      return state;
    }
    const rows = result.rows.map((row) =>
      Object.entries(state.dirtyCells).reduce<TableRow>((current, [key, value]) => {
        const [id, field] = key.split('::');
        return current.id === id ? { ...current, [field]: value } : current;
      }, row),
    );
    return {
      ...state,
      rows,
      total: result.total,
      groups: result.groups,
      aggregates: result.aggregates,
      elapsedMs: result.elapsedMs,
      snapshotVersion: result.version,
      lastRequest: requestFromState(state),
      loading: false,
      queryError: null,
    };
  }),
  on(TableActions.loadPageFailure, (state, { error, version, request }) => {
    // 旧世代的失败直接忽略；当前世代失败则保留上一次可用快照，仅记录错误现场。
    if (version !== state.queryVersion) {
      return state;
    }
    return {
      ...state,
      loading: false,
      queryError: { message: error, version, request },
    };
  }),
  on(TableActions.retryQuery, (state) => ({
    ...state,
    // 沿用失败版本重试，不自增世代；条件未变，旧快照继续展示。
    loading: true,
    queryError: null,
  })),
  on(TableActions.setPage, (state, { page }) => beginQuery({ ...state, page })),
  on(TableActions.setPageSize, (state, { pageSize }) => beginQuery({ ...state, pageSize, page: 0 })),
  on(TableActions.setSort, (state, { sort }) => beginQuery({ ...state, sort, page: 0 })),
  on(TableActions.setFilter, (state, { filter }) => beginQuery({ ...state, filter, page: 0 })),
  on(TableActions.setSearch, (state, { search }) => beginQuery({ ...state, search, page: 0 })),
  on(TableActions.setGroupBy, (state, { groupBy }) => beginQuery({ ...state, groupBy, page: 0 })),
  on(TableActions.toggleTreeMode, (state) =>
    beginQuery({ ...state, treeMode: !state.treeMode, page: 0 }),
  ),
  on(TableActions.toggleExpanded, (state, { id }) =>
    beginQuery({
      ...state,
      expandedIds: state.expandedIds.includes(id)
        ? state.expandedIds.filter((item) => item !== id)
        : [...state.expandedIds, id],
    }),
  ),
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
    rows: state.rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    dirtyCells: { ...state.dirtyCells, [`${id}::${String(key)}`]: value },
  })),
  on(TableActions.loadViewsSuccess, (state, { views }) => ({ ...state, savedViews: views })),
  on(TableActions.viewsRemotelyChanged, (state, { views }) => ({ ...state, savedViews: views })),
  on(TableActions.saveViewSuccess, (state, { view }) => ({
    ...state,
    savedViews: [...state.savedViews.filter((item) => item.id !== view.id && item.name !== view.name), view],
    activeViewId: view.id,
    pendingViewConflict: null,
  })),
  on(TableActions.viewConflict, (state, { existing, candidate, remoteChanged }) => ({
    ...state,
    pendingViewConflict: { existing, candidate, remoteChanged },
  })),
  on(TableActions.cancelViewConflict, (state) => ({ ...state, pendingViewConflict: null })),
  on(TableActions.applyView, (state, { view }) =>
    beginQuery({
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
    }),
  ),
  on(TableActions.deleteViewSuccess, (state, { id }) => ({
    ...state,
    savedViews: state.savedViews.filter((view) => view.id !== id),
    activeViewId: state.activeViewId === id ? null : state.activeViewId,
  })),
);
