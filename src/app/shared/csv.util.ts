import { TableRow } from '../types/table.models';

export interface CsvColumn {
  key: keyof TableRow;
  label: string;
}

/**
 * 用同一份快照导出台账：表头与行数据来自同一版本的列定义与结果，
 * 不会出现“行是 A 次查询、汇总是 B 次查询”的混用。
 */
export function downloadCsv(filename: string, columns: CsvColumn[], rows: TableRow[]): void {
  const escape = (value: unknown): string => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = columns.map((column) => escape(column.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((column) => escape(row[column.key])).join(','),
  );
  const blob = new Blob([`﻿${[header, ...lines].join('\n')}`], {
    type: 'text/csv;charset=utf-8',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
