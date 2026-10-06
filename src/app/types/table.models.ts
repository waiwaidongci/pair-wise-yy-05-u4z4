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
  rows: TableRow[];
  total: number;
  aggregates: AggregateResult;
  groups: GroupSummary[];
  elapsedMs: number;
}

export interface SavedView {
  id: string;
  name: string;
  createdAt: string;
  /** 乐观并发版本号：保存视图时与仓库中的 revision 比对，不一致说明他人已先保存 */
  revision: number;
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

/** 一次成功查询的完整结果，分页、汇总、导出都只能从同一份快照读取 */
export interface TableSnapshot {
  version: number;
  request: QueryRequest;
  rows: TableRow[];
  total: number;
  groups: GroupSummary[];
  aggregates: AggregateResult;
  elapsedMs: number;
  receivedAt: string;
}

/** 出错的那次查询，用于“从出错的那次重试” */
export interface FailedQuery {
  version: number;
  request: QueryRequest;
  error: string;
  failedAt: string;
}

export interface ViewDiffEntry {
  field: string;
  label: string;
  /** 对方已保存（仓库中）的值 */
  existing: string;
  /** 我本次要保存的值 */
  incoming: string;
}

export interface ViewConflict {
  name: string;
  incoming: SavedView;
  existing: SavedView;
  diffs: ViewDiffEntry[];
}

export interface TableState {
  /** 最近一次成功查询的快照；查询失败时保留，不会被错误清空 */
  snapshot: TableSnapshot | null;
  /** 查询版本号：筛选 / 分组 / 分页等条件每次改动都 +1，旧版本的响应一律作废 */
  requestVersion: number;
  loading: boolean;
  error: string | null;
  /** 最近一次失败的查询（版本与当前一致时），供用户从出错的那次重试 */
  failedQuery: FailedQuery | null;
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
  savedViews: SavedView[];
  activeViewId: string | null;
  /** 保存视图时发现他人已先保存，等待用户确认是否覆盖 */
  pendingViewConflict: ViewConflict | null;
  dirtyCells: Record<string, CellValue>;
}
