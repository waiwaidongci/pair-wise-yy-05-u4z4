import { createAction, props } from '@ngrx/store';
import {
  CellValue,
  FilterGroup,
  QueryRequest,
  QueryResult,
  SavedView,
  SortState,
  TableRow,
} from '../types/table.models';

export const loadPage = createAction('[Order Table] Load Page', props<{ refresh?: boolean }>());
export const loadPageSuccess = createAction(
  '[Order Table] Load Page Success',
  props<{ result: QueryResult }>(),
);
export const loadPageFailure = createAction(
  '[Order Table] Load Page Failure',
  props<{ error: string; version: number; request: QueryRequest }>(),
);
/** 从出错的那次查询重试：沿用失败版本，不自增世代。 */
export const retryQuery = createAction('[Order Table] Retry Query');
export const exportCsv = createAction('[Order Table] Export Csv');
export const exportCsvSuccess = createAction('[Order Table] Export Csv Success');

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

export const loadViews = createAction('[Order Table] Load Views');
export const loadViewsSuccess = createAction(
  '[Order Table] Load Views Success',
  props<{ views: SavedView[] }>(),
);
export const loadViewsFailure = createAction(
  '[Order Table] Load Views Failure',
  props<{ error: string }>(),
);
export const viewsRemotelyChanged = createAction(
  '[Order Table] Views Remotely Changed',
  props<{ views: SavedView[] }>(),
);
export const saveView = createAction('[Order Table] Save View', props<{ name: string }>());
export const saveViewSuccess = createAction(
  '[Order Table] Save View Success',
  props<{ view: SavedView }>(),
);
export const saveViewFailure = createAction(
  '[Order Table] Save View Failure',
  props<{ error: string }>(),
);
export const viewConflict = createAction(
  '[Order Table] View Conflict',
  props<{ existing: SavedView; candidate: SavedView; remoteChanged: boolean }>(),
);
export const confirmOverwriteView = createAction('[Order Table] Confirm Overwrite View');
export const cancelViewConflict = createAction('[Order Table] Cancel View Conflict');
export const applyView = createAction('[Order Table] Apply View', props<{ view: SavedView }>());
export const deleteView = createAction('[Order Table] Delete View', props<{ id: string }>());
export const deleteViewSuccess = createAction(
  '[Order Table] Delete View Success',
  props<{ id: string }>(),
);
export const deleteViewFailure = createAction(
  '[Order Table] Delete View Failure',
  props<{ error: string }>(),
);
