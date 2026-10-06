import { Injectable } from '@angular/core';
import { SavedView } from '../types/table.models';

const STORAGE_KEY = 'pair-wise-yy-05:views';

/** 读取仓库中最新的视图列表（旧数据没有 revision / updatedAt 时做迁移） */
export function readStoredViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return (JSON.parse(raw) as SavedView[]).map((view) => ({
      ...view,
      revision: view.revision ?? 1,
      updatedAt: view.updatedAt ?? view.createdAt,
    }));
  } catch {
    return [];
  }
}

/**
 * 视图仓库：模拟服务端的视图存储。
 * 每个视图带 revision，保存时基于“读到的最新 revision”递增，
 * 两个终端同时保存同一视图时，后保存的人能发现对方已先保存。
 */
@Injectable({ providedIn: 'root' })
export class ViewRepositoryService {
  list(): SavedView[] {
    return readStoredViews();
  }

  findByName(name: string): SavedView | undefined {
    return this.list().find((view) => view.name === name);
  }

  /** 覆盖写入（调用方需已完成冲突检查），revision 在 baseRevision 上递增 */
  overwrite(incoming: SavedView, baseRevision: number): SavedView[] {
    const saved: SavedView = {
      ...incoming,
      revision: baseRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const views = [...this.list().filter((view) => view.name !== saved.name), saved];
    this.persist(views);
    return views;
  }

  remove(id: string): SavedView[] {
    const views = this.list().filter((view) => view.id !== id);
    this.persist(views);
    return views;
  }

  /** 模拟另一个人在其它终端修改了同名视图：直接写仓库，本端 state 不知情 */
  simulateExternalEdit(name: string): SavedView | undefined {
    const views = this.list();
    const target = views.find((view) => view.name === name);
    if (!target) {
      return undefined;
    }
    const mutated: SavedView = {
      ...target,
      pageSize: target.pageSize === 100 ? 200 : 100,
      sort: target.sort
        ? { ...target.sort, direction: target.sort.direction === 'asc' ? 'desc' : 'asc' }
        : { field: 'amount', direction: 'desc' },
      treeMode: !target.treeMode,
      revision: target.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    this.persist(views.map((view) => (view.id === target.id ? mutated : view)));
    return mutated;
  }

  private persist(views: SavedView[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  }
}
