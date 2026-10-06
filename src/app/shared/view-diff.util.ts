import { FilterGroup, FilterNode, SavedView, TableRow } from '../types/table.models';

export interface ViewDiffEntry {
  label: string;
  old: string;
  new: string;
}

export interface ColumnLabel {
  key: keyof TableRow;
  label: string;
}

const OPERATOR_LABELS: Record<string, string> = {
  contains: '包含',
  equals: '等于',
  notEquals: '不等于',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
  in: '属于',
};

/** 把筛选条件树压成可读摘要，用于视图差异展示。 */
export function summarizeFilter(node: FilterNode, columns: ColumnLabel[]): string {
  if (node.kind === 'condition') {
    if (!node.value.trim()) return '（空条件）';
    const fieldLabel = columns.find((column) => column.key === node.field)?.label ?? String(node.field);
    const operator = OPERATOR_LABELS[node.operator] ?? node.operator;
    return `${fieldLabel} ${operator} ${node.value.trim()}`;
  }
  const children = node.children.map((child) => summarizeFilter(child, columns));
  if (!children.length) return '（空条件组）';
  const joiner = node.logic === 'and' ? ' 且 ' : ' 或 ';
  return `(${children.join(joiner)})`;
}

/** 逐字段对比两个视图配置，只返回存在差异的字段。 */
export function diffViews(
  existing: SavedView,
  candidate: SavedView,
  columns: ColumnLabel[],
): ViewDiffEntry[] {
  const entries: ViewDiffEntry[] = [];
  const push = (label: string, oldValue: unknown, newValue: unknown): void => {
    const oldText = String(oldValue ?? '');
    const newText = String(newValue ?? '');
    if (oldText !== newText) {
      entries.push({ label, old: oldText, new: newText });
    }
  };

  const oldFilter = summarizeFilter(existing.filter, columns);
  const newFilter = summarizeFilter(candidate.filter, columns);
  if (oldFilter !== newFilter) {
    entries.push({ label: '筛选条件', old: oldFilter, new: newFilter });
  }

  push(
    '排序',
    existing.sort ? `${columnLabel(existing.sort.field, columns)} ${existing.sort.direction === 'asc' ? '升序' : '降序'}` : '默认',
    candidate.sort ? `${columnLabel(candidate.sort.field, columns)} ${candidate.sort.direction === 'asc' ? '升序' : '降序'}` : '默认',
  );
  push('分组', existing.groupBy ? columnLabel(existing.groupBy, columns) : '无', candidate.groupBy ? columnLabel(candidate.groupBy, columns) : '无');
  push('树形模式', existing.treeMode ? '是' : '否', candidate.treeMode ? '是' : '否');
  push('分页大小', existing.pageSize, candidate.pageSize);
  push(
    '可见列',
    existing.visibleColumns.map((key) => columnLabel(key, columns)).join('、'),
    candidate.visibleColumns.map((key) => columnLabel(key, columns)).join('、'),
  );
  push(
    '固定列',
    existing.pinnedColumns.map((key) => columnLabel(key, columns)).join('、') || '无',
    candidate.pinnedColumns.map((key) => columnLabel(key, columns)).join('、') || '无',
  );

  const widthDiff = diffWidths(existing.columnWidths, candidate.columnWidths, columns);
  if (widthDiff) {
    entries.push({ label: '列宽', old: widthDiff.old, new: widthDiff.new });
  }

  return entries;
}

function columnLabel(key: unknown, columns: ColumnLabel[]): string {
  return columns.find((column) => column.key === key)?.label ?? String(key);
}

function diffWidths(
  oldWidths: Record<string, number>,
  newWidths: Record<string, number>,
  columns: ColumnLabel[],
): { old: string; new: string } | null {
  const changed = columns
    .filter((column) => (oldWidths[String(column.key)] ?? 132) !== (newWidths[String(column.key)] ?? 132))
    .map((column) => column.label);
  if (!changed.length) return null;
  return { old: `${changed.length} 列保持原宽`, new: `已调整 ${changed.join('、')}` };
}
