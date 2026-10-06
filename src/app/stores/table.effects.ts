import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, map, Observable, of, switchMap, take, tap, withLatestFrom } from 'rxjs';
import { MockTableApiService } from '../data/mock-table-api.service';
import { CollabService } from '../data/collab.service';
import { downloadCsv } from '../shared/csv.util';
import { SavedView, TableState } from '../types/table.models';
import * as TableActions from './table.actions';
import {
  selectTableState,
  selectVisibleColumnDefinitions,
} from './table.selectors';

@Injectable()
export class TableEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(MockTableApiService);
  private readonly collab = inject(CollabService);

  /**
   * 查询效应：每次条件改动 / 刷新 / 重试都携带当前世代号。
   * switchMap 取消在途请求，结果再带版本回到 reducer 做二次守卫，
   * 慢查询乱序返回时旧结果不会覆盖新条件。
   */
  loadPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        TableActions.loadPage,
        TableActions.retryQuery,
        TableActions.setPage,
        TableActions.setPageSize,
        TableActions.setSort,
        TableActions.setFilter,
        TableActions.setSearch,
        TableActions.setGroupBy,
        TableActions.toggleTreeMode,
        TableActions.toggleExpanded,
        TableActions.applyView,
      ),
      withLatestFrom(this.store.select(selectTableState)),
      switchMap(([, state]) =>
        this.api
          .query({
            version: state.queryVersion,
            page: state.page,
            pageSize: state.pageSize,
            sort: state.sort,
            filter: state.filter,
            groupBy: state.groupBy,
            treeMode: state.treeMode,
            expandedIds: state.expandedIds,
            search: state.search,
          })
          .pipe(
            map((result) => TableActions.loadPageSuccess({ result })),
            catchError((error: unknown) =>
              of(
                TableActions.loadPageFailure({
                  error: String(error),
                  version: state.queryVersion,
                  request: {
                    version: state.queryVersion,
                    page: state.page,
                    pageSize: state.pageSize,
                    sort: state.sort,
                    filter: state.filter,
                    groupBy: state.groupBy,
                    treeMode: state.treeMode,
                    expandedIds: state.expandedIds,
                    search: state.search,
                  },
                }),
              ),
            ),
          ),
      ),
    ),
  );

  /**
   * 导出效应：导出始终使用当前世代的同一份快照。
   * 若该世代仍在加载，则等它落定（成功用新快照、失败用上一快照）后再导出，
   * 避免分页、汇总与导出混用两次查询的结果。
   */
  exportCsv$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.exportCsv),
      withLatestFrom(this.store.select(selectTableState)),
      switchMap(([, state]) => {
        const version = state.queryVersion;
        const wait$: Observable<boolean> = state.loading
          ? this.actions$.pipe(
              ofType(TableActions.loadPageSuccess, TableActions.loadPageFailure),
              filter((action) =>
                action.type === TableActions.loadPageSuccess.type
                  ? action.result.version === version
                  : action.version === version,
              ),
              take(1),
              map(() => true),
            )
          : of(true);
        return wait$.pipe(
          withLatestFrom(
            this.store.select(selectTableState),
            this.store.select(selectVisibleColumnDefinitions),
          ),
          tap(([, latest, columns]) => {
            downloadCsv(
              `销售订单-第${latest.page + 1}页.csv`,
              columns.map((column) => ({ key: column.key, label: column.label })),
              latest.rows,
            );
          }),
          map(() => TableActions.exportCsvSuccess()),
        );
      }),
    ),
  );

  loadViews$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.loadViews),
      switchMap(() =>
        this.collab.list().pipe(
          map((views) => TableActions.loadViewsSuccess({ views })),
          catchError((error: unknown) =>
            of(TableActions.loadViewsFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  );

  viewsRemote$ = createEffect(() =>
    this.collab.onRemoteChange().pipe(
      map((views) => TableActions.viewsRemotelyChanged({ views })),
    ),
  );

  saveView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.saveView),
      withLatestFrom(this.store.select(selectTableState)),
      switchMap(([action, state]) => {
        const candidate = buildCandidate(state, action.name);
        const existing = state.savedViews.find((view) => view.name === candidate.name);
        return this.collab.save(candidate, existing?.updatedAt ?? null).pipe(
          map((result) =>
            result.status === 'saved'
              ? TableActions.saveViewSuccess({ view: result.view })
              : TableActions.viewConflict({
                  existing: result.serverView,
                  candidate,
                  remoteChanged: result.serverView.updatedAt !== (existing?.updatedAt ?? null),
                }),
          ),
          catchError((error: unknown) =>
            of(TableActions.saveViewFailure({ error: String(error) })),
          ),
        );
      }),
    ),
  );

  confirmOverwriteView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.confirmOverwriteView),
      withLatestFrom(this.store.select(selectTableState)),
      switchMap(([, state]) => {
        const conflict = state.pendingViewConflict;
        if (!conflict) {
          return of(TableActions.cancelViewConflict());
        }
        return this.collab.overwrite(conflict.candidate).pipe(
          map((view) => TableActions.saveViewSuccess({ view })),
          catchError((error: unknown) =>
            of(TableActions.saveViewFailure({ error: String(error) })),
          ),
        );
      }),
    ),
  );

  deleteView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.deleteView),
      switchMap((action) =>
        this.collab.delete(action.id).pipe(
          map(() => TableActions.deleteViewSuccess({ id: action.id })),
          catchError((error: unknown) =>
            of(TableActions.deleteViewFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  );
}

/** 从当前状态拼装一份待保存的视图配置。 */
function buildCandidate(state: TableState, name: string): SavedView {
  const now = new Date().toISOString();
  return {
    id: `view-${Date.now()}`,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    pageSize: state.pageSize,
    visibleColumns: [...state.visibleColumns],
    columnWidths: { ...state.columnWidths },
    pinnedColumns: [...state.pinnedColumns],
    sort: state.sort,
    filter: state.filter,
    groupBy: state.groupBy,
    treeMode: state.treeMode,
  };
}
