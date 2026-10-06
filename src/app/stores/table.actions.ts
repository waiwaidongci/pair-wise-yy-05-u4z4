import { createAction, props } from '@ngrx/store';
import {
  CellValue,
  FilterGroup,
  QueryRequest,
  QueryResult,
  SavedView,
  SortState,
  TableRow,
  ViewConflict,
} from '../types/table.models';

export const loadPage = createAction('[Order Table] Load Page', props<{ refresh?: boolean }>());
export const loadPageSuccess = createAction(
  '[Order Table] Load Page Success',
  props<{ version: number; request: QueryRequest; result: QueryResult }>(),
);
export const loadPageFailure = createAction(
  '[Order Table] Load Page Failure',
  props<{ version: number; request: QueryRequest; error: string }>(),
);
/** 从出错的那次查询重试（原样重发 failedQuery 里的请求） */
export const retryFailedQuery = createAction('[Order Table] Retry Failed Query');
export const setPage = createAction('[Order Table] Set Page', props<{ page: number }>());
export const setPageSize = createAction('[Order Table] Set Page Size', props<{ pageSize: number }>());
export const setSort = createAction('[Order Table] Set Sort', props<{ sort: SortState | null }>());
export const setFilter = createAction('[Order Table] Set Filter', props<{ filter: FilterGroup }>());
export const setSearch = createAction('[Order Table] Set Search', props<{ search: string }>());
export const setGroupBy = createAction('[Order Table] Set Group By', props<{ groupBy: keyof TableRow | null }>());
export const toggleTreeMode = createAction('[Order Table] Toggle Tree Mode');
export const toggleExpanded = createAction('[Order Table] Toggle Expanded', props<{ id: string }>());
export const setSelection = createAction('[Order Table] Set Selection', props<{ ids: string[] }>());
export const toggleColumn = createAction('[Order Table] Toggle Column', props<{ key: keyof TableRow }>());
export const resizeColumn = createAction(
  '[Order Table] Resize Column',
  props<{ key: keyof TableRow; width: number }>(),
);
export const togglePinned = createAction('[Order Table] Toggle Pinned', props<{ key: keyof TableRow }>());
export const setDensity = createAction(
  '[Order Table] Set Density',
  props<{ density: 'compact' | 'standard' | 'comfortable' }>(),
);
export const updateCell = createAction(
  '[Order Table] Update Cell',
  props<{ id: string; key: keyof TableRow; value: CellValue }>(),
);
export const saveView = createAction('[Order Table] Save View', props<{ name: string }>());
export const saveViewSuccess = createAction(
  '[Order Table] Save View Success',
  props<{ views: SavedView[]; activeViewId: string }>(),
);
/** 保存时发现同名视图已被他人先行保存（revision 不一致），携带双方差异等待确认 */
export const saveViewConflict = createAction(
  '[Order Table] Save View Conflict',
  props<{ conflict: ViewConflict }>(),
);
/** 用户看过差异后确认覆盖对方版本 */
export const confirmViewOverwrite = createAction('[Order Table] Confirm View Overwrite');
export const cancelViewConflict = createAction('[Order Table] Cancel View Conflict');
export const applyView = createAction('[Order Table] Apply View', props<{ view: SavedView }>());
export const deleteView = createAction('[Order Table] Delete View', props<{ id: string }>());
/** 演示用：模拟另一个人在其它终端修改并保存了同名视图（只写仓库，不同步到本端 state） */
export const simulateExternalViewEdit = createAction(
  '[Order Table] Simulate External View Edit',
  props<{ name: string }>(),
);
