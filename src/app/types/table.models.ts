export type CellValue = string | number | boolean | null;

export interface TableRow {
  id: string;
  orderNo: string;
  customer: string;
  region: string;
  category: string;
  owner: string;
  amount: number;
  quantity: number;
  margin: number;
  status: '待审核' | '进行中' | '已发货' | '已完成' | '异常';
  updatedAt: string;
  parentId: string | null;
  [key: string]: CellValue;
}

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in';

export interface FilterCondition {
  kind: 'condition';
  id: string;
  field: keyof TableRow;
  operator: FilterOperator;
  value: string;
}

export interface FilterGroup {
  kind: 'group';
  id: string;
  logic: 'and' | 'or';
  children: FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: keyof TableRow;
  direction: SortDirection;
}

export interface ColumnDefinition {
  key: keyof TableRow;
  label: string;
  width: number;
  minWidth: number;
  align?: 'left' | 'right' | 'center';
  editable?: boolean;
  formatter?: 'currency' | 'percent' | 'date' | 'status';
  type: 'text' | 'number' | 'date' | 'enum' | 'boolean';
}

export interface QueryRequest {
  version: number;
  page: number;
  pageSize: number;
  sort: SortState | null;
  filter: FilterGroup;
  groupBy: keyof TableRow | null;
  treeMode: boolean;
  expandedIds: string[];
  search: string;
}

export interface AggregateResult {
  amount: number;
  quantity: number;
  averageMargin: number;
}

export interface GroupSummary {
  key: string;
  count: number;
  aggregate: AggregateResult;
}

export interface QueryResult {
  version: number;
  rows: TableRow[];
  total: number;
  aggregates: AggregateResult;
  groups: GroupSummary[];
  elapsedMs: number;
}

/** 一次成功查询留下的可用快照，分页、订单汇总与导出共用同一份。 */
export interface QuerySnapshot {
  version: number;
  rows: TableRow[];
  total: number;
  groups: GroupSummary[];
  aggregates: AggregateResult;
  elapsedMs: number;
  request: QueryRequest;
}

/** 一次失败查询的现场，用于“从出错的那次重试”。 */
export interface QueryFailure {
  message: string;
  version: number;
  request: QueryRequest;
}

export interface SavedView {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pageSize: number;
  visibleColumns: Array<keyof TableRow>;
  columnWidths: Record<string, number>;
  pinnedColumns: Array<keyof TableRow>;
  sort: SortState | null;
  filter: FilterGroup;
  groupBy: keyof TableRow | null;
  treeMode: boolean;
}

export interface TableState {
  rows: TableRow[];
  total: number;
  groups: GroupSummary[];
  aggregates: AggregateResult;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  sort: SortState | null;
  filter: FilterGroup;
  search: string;
  groupBy: keyof TableRow | null;
  treeMode: boolean;
  expandedIds: string[];
  selectedIds: string[];
  visibleColumns: Array<keyof TableRow>;
  columnWidths: Record<string, number>;
  pinnedColumns: Array<keyof TableRow>;
  density: 'compact' | 'standard' | 'comfortable';
  elapsedMs: number;
  savedViews: SavedView[];
  activeViewId: string | null;
  dirtyCells: Record<string, CellValue>;
  /** 查询世代号：每次条件改动或刷新自增，旧结果据此失效。 */
  queryVersion: number;
  /** 当前展示的快照所属世代；查询失败时保留上一世代快照。 */
  snapshotVersion: number | null;
  /** 当前快照对应的查询条件，供导出与重试核对。 */
  lastRequest: QueryRequest | null;
  /** 最近一次失败查询的现场（含版本与条件），用于重试。 */
  queryError: QueryFailure | null;
  /** 待确认的视图覆盖冲突。 */
  pendingViewConflict: { existing: SavedView; candidate: SavedView; remoteChanged: boolean } | null;
}
