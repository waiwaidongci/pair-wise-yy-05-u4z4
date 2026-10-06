import { Injectable } from '@angular/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { SavedView } from '../types/table.models';

const STORAGE_KEY = 'pair-wise-yy-05:views';

export type SaveViewResult =
  | { status: 'saved'; view: SavedView }
  | { status: 'conflict'; serverView: SavedView };

/**
 * 视图协作服务：负责视图的持久化、乐观并发校验与跨标签页同步。
 * 保存同名视图时，若服务端版本与客户端基线不一致，或内容存在差异，
 * 则返回冲突，由用户在差异对话框中确认后再覆盖。
 */
@Injectable({ providedIn: 'root' })
export class CollabService {
  private readonly remoteChanges$ = new Subject<SavedView[]>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
          this.remoteChanges$.next(this.readViews());
        }
      });
    }
  }

  list(): Observable<SavedView[]> {
    return of(this.readViews()).pipe(delay(80));
  }

  /**
   * 保存视图。baseUpdatedAt 为客户端上次见到的版本时间戳。
   * 同名视图内容不一致或基线过期时返回冲突，不直接覆盖。
   */
  save(view: SavedView, baseUpdatedAt: string | null): Observable<SaveViewResult> {
    return of(null).pipe(
      delay(120),
      map((): SaveViewResult => {
        const views = this.readViews();
        const index = views.findIndex((item) => item.name === view.name);
        if (index === -1) {
          this.writeViews([...views, view]);
          return { status: 'saved', view };
        }
        const existing = views[index];
        if (existing.updatedAt !== baseUpdatedAt || !this.contentEqual(existing, view)) {
          return { status: 'conflict', serverView: existing };
        }
        return { status: 'saved', view: existing };
      }),
    );
  }

  /** 确认覆盖后无条件写入。 */
  overwrite(view: SavedView): Observable<SavedView> {
    return of(null).pipe(
      delay(80),
      map(() => {
        const views = this.readViews();
        const index = views.findIndex((item) => item.name === view.name);
        const next =
          index === -1 ? [...views, view] : views.map((item) => (item.name === view.name ? view : item));
        this.writeViews(next);
        return view;
      }),
    );
  }

  delete(id: string): Observable<void> {
    return of(null).pipe(
      delay(40),
      map(() => {
        this.writeViews(this.readViews().filter((view) => view.id !== id));
      }),
    );
  }

  onRemoteChange(): Observable<SavedView[]> {
    return this.remoteChanges$.asObservable();
  }

  private contentEqual(left: SavedView, right: SavedView): boolean {
    return JSON.stringify({
      pageSize: left.pageSize,
      visibleColumns: left.visibleColumns,
      columnWidths: left.columnWidths,
      pinnedColumns: left.pinnedColumns,
      sort: left.sort,
      filter: left.filter,
      groupBy: left.groupBy,
      treeMode: left.treeMode,
    }) === JSON.stringify({
      pageSize: right.pageSize,
      visibleColumns: right.visibleColumns,
      columnWidths: right.columnWidths,
      pinnedColumns: right.pinnedColumns,
      sort: right.sort,
      filter: right.filter,
      groupBy: right.groupBy,
      treeMode: right.treeMode,
    });
  }

  private readViews(): SavedView[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedView[];
      return parsed.map((view) => ({
        ...view,
        updatedAt: view.updatedAt ?? view.createdAt ?? '',
      }));
    } catch {
      return [];
    }
  }

  private writeViews(views: SavedView[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  }
}
