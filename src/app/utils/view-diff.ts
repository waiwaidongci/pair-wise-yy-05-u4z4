import { FilterGroup, FilterNode, SavedView, SortState, TableRow, ViewDiffEntry } from '../types/table.models';
import { TABLE_COLUMNS } from '../stores/table.reducer';

const OPERATOR_LABELS: Record<string, string> = {
  contains: '包含',
  equals: '等于',
  notEquals: '不等于',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  in: '属于',
};

/** 计算“我要保存的视图”和“仓库中他人已保存的视图”之间的人类可读差异 */
export function diffViews(incoming: SavedView, existing: SavedView): ViewDiffEntry[] {
  const diffs: ViewDiffEntry[] = [];
  const push = (field: string, label: string, existingValue: string, incomingValue: string) => {
    if (existingValue !== incomingValue) {
      diffs.push({ field, label, existing: existingValue, incoming: incomingValue });
    }
  };

  push('pageSize', '每页行数', String(existing.pageSize), String(incoming.pageSize));
  push('sort', '排序', describeSort(existing.sort), describeSort(incoming.sort));
  push('filter', '筛选条件', describeFilter(existing.filter), describeFilter(incoming.filter));
  push('groupBy', '分组字段', columnLabel(existing.groupBy), columnLabel(incoming.groupBy));
  push('treeMode', '树形模式', existing.treeMode ? '开启' : '关闭', incoming.treeMode ? '开启' : '关闭');
  push(
    'visibleColumns',
    '显示列',
    existing.visibleColumns.map((key) => columnLabel(key)).join('、') || '（无）',
    incoming.visibleColumns.map((key) => columnLabel(key)).join('、') || '（无）',
  );
  push(
    'pinnedColumns',
    '固定列',
    existing.pinnedColumns.map((key) => columnLabel(key)).join('、') || '（无）',
    incoming.pinnedColumns.map((key) => columnLabel(key)).join('、') || '（无）',
  );
  push('columnWidths', '列宽', describeWidths(existing), describeWidths(incoming));

  return diffs;
}

function columnLabel(key: keyof TableRow | null): string {
  if (!key) {
    return '不分组';
  }
  return TABLE_COLUMNS.find((column) => column.key === key)?.label ?? String(key);
}

function describeSort(sort: SortState | null): string {
  if (!sort) {
    return '不排序';
  }
  return `${columnLabel(sort.field)} ${sort.direction === 'asc' ? '升序' : '降序'}`;
}

function describeFilter(group: FilterGroup): string {
  const parts = describeNode(group);
  return parts.length ? parts.join(` ${group.logic === 'and' ? '且' : '或'} `) : '无筛选条件';
}

function describeNode(node: FilterNode): string[] {
  if (node.kind === 'condition') {
    if (!node.value.trim()) {
      return [];
    }
    const operator = OPERATOR_LABELS[node.operator] ?? node.operator;
    return [`${columnLabel(node.field)} ${operator} “${node.value}”`];
  }
  const children = node.children.flatMap((child) => describeNode(child));
  if (!children.length) {
    return [];
  }
  const joined = children.join(` ${node.logic === 'and' ? '且' : '或'} `);
  return children.length > 1 ? [`（${joined}）`] : [joined];
}

function describeWidths(view: SavedView): string {
  return (
    Object.entries(view.columnWidths)
      .map(([key, width]) => `${columnLabel(key as keyof TableRow)} ${width}px`)
      .join('、') || '（默认）'
  );
}
