import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, map, mergeMap, of, tap, withLatestFrom } from 'rxjs';
import { Store } from '@ngrx/store';
import { MockTableApiService } from '../data/mock-table-api.service';
import { ViewRepositoryService } from '../data/view-repository.service';
import { QueryRequest, SavedView, TableState } from '../types/table.models';
import { diffViews } from '../utils/view-diff';
import * as TableActions from './table.actions';
import { selectTableState } from './table.selectors';

@Injectable()
export class TableEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(MockTableApiService);
  private readonly viewRepository = inject(ViewRepositoryService);

  /**
   * 查询入口：条件类动作都会先把 requestVersion +1，这里取最新版本号发出请求。
   * 用 mergeMap 让多个版本并发在途，慢查询乱序返回时由 reducer 按版本号丢弃旧结果。
   */
  loadPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        TableActions.loadPage,
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
      mergeMap(([, state]) => {
        const version = state.requestVersion;
        const request = buildRequest(state);
        return this.api.query(request).pipe(
          map((result) => TableActions.loadPageSuccess({ version, request, result })),
          catchError((error: unknown) =>
            of(TableActions.loadPageFailure({ version, request, error: toMessage(error) })),
          ),
        );
      }),
    ),
  );

  /** 从出错的那次重试：原样重发 failedQuery 里的请求，版本号用 reducer 刚递增的新版本 */
  retryFailedQuery$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.retryFailedQuery),
      withLatestFrom(this.store.select(selectTableState)),
      filter(([, state]) => state.loading && !!state.failedQuery),
      mergeMap(([, state]) => {
        const version = state.requestVersion;
        const request = state.failedQuery!.request;
        return this.api.query(request).pipe(
          map((result) => TableActions.loadPageSuccess({ version, request, result })),
          catchError((error: unknown) =>
            of(TableActions.loadPageFailure({ version, request, error: toMessage(error) })),
          ),
        );
      }),
    ),
  );

  /**
   * 保存视图：先读仓库里的最新版本。
   * 同名视图的 revision 与本端基准不一致，说明他人已先保存——
   * 不直接覆盖，抛出双方差异等用户确认。
   */
  saveView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.saveView),
      withLatestFrom(this.store.select(selectTableState)),
      map(([{ name }, state]) => {
        const trimmed = name.trim();
        const known = state.savedViews.find((view) => view.name === trimmed);
        const existing = this.viewRepository.findByName(trimmed);
        const incoming = buildView(state, trimmed, existing ?? known);

        if (existing && existing.revision !== (known?.revision ?? 0)) {
          return TableActions.saveViewConflict({
            conflict: {
              name: trimmed,
              incoming,
              existing,
              diffs: diffViews(incoming, existing),
            },
          });
        }
        const views = this.viewRepository.overwrite(incoming, existing?.revision ?? 0);
        return TableActions.saveViewSuccess({ views, activeViewId: incoming.id });
      }),
    ),
  );

  /** 用户看过差异后确认覆盖；覆盖前再核一次仓库，期间若他人又保存则重新抛出差异 */
  confirmViewOverwrite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TableActions.confirmViewOverwrite),
      withLatestFrom(this.store.select(selectTableState)),
      filter(([, state]) => !!state.pendingViewConflict),
      map(([, state]) => {
        const conflict = state.pendingViewConflict!;
        const latest = this.viewRepository.findByName(conflict.name);
        if (latest && latest.revision !== conflict.existing.revision) {
          return TableActions.saveViewConflict({
            conflict: {
              name: conflict.name,
              incoming: conflict.incoming,
              existing: latest,
              diffs: diffViews(conflict.incoming, latest),
            },
          });
        }
        const views = this.viewRepository.overwrite(conflict.incoming, conflict.existing.revision);
        return TableActions.saveViewSuccess({ views, activeViewId: conflict.incoming.id });
      }),
    ),
  );

  deleteView$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TableActions.deleteView),
        tap(({ id }) => this.viewRepository.remove(id)),
      ),
    { dispatch: false },
  );

  simulateExternalViewEdit$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TableActions.simulateExternalViewEdit),
        tap(({ name }) => this.viewRepository.simulateExternalEdit(name)),
      ),
    { dispatch: false },
  );
}

function buildRequest(state: TableState): QueryRequest {
  return {
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

function buildView(state: TableState, name: string, base?: SavedView): SavedView {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? `view-${Date.now()}`,
    name,
    createdAt: base?.createdAt ?? now,
    revision: base?.revision ?? 0,
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

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
