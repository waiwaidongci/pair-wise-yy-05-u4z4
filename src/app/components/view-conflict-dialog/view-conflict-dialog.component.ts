import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SavedView } from '../../types/table.models';
import { TABLE_COLUMNS } from '../../stores/table.reducer';
import { diffViews, ViewDiffEntry } from '../../shared/view-diff.util';

export interface ViewConflictDialogData {
  existing: SavedView;
  candidate: SavedView;
  remoteChanged: boolean;
}

@Component({
  selector: 'app-view-conflict-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title class="conflict-title">
      <mat-icon class="conflict-title__icon">warning</mat-icon>
      保存视图：检测到差异
    </h2>
    <mat-dialog-content>
      <p class="conflict-hint">
        视图 <strong>“{{ data.candidate.name }}”</strong> 已存在，且已保存版本与当前配置存在差异。
        覆盖前请确认以下差异将被替换。
      </p>
      @if (data.remoteChanged) {
        <p class="remote-note">
          <mat-icon>sync</mat-icon>
          该视图可能已被其他标签页或同事修改，以下为双方最新差异。
        </p>
      }
      <div class="diff-list">
        @for (entry of diffs; track entry.label) {
          <div class="diff-row">
            <span class="diff-label">{{ entry.label }}</span>
            <span class="diff-old" [matTooltip]="entry.old">{{ entry.old }}</span>
            <mat-icon class="diff-arrow">arrow_forward</mat-icon>
            <span class="diff-new" [matTooltip]="entry.new">{{ entry.new }}</span>
          </div>
        }
        @if (!diffs.length) {
          <p class="no-diff">两份配置内容一致，覆盖不会产生变化。</p>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">取消</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">确认覆盖</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .conflict-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #b42318;
      font-size: 18px;
    }
    .conflict-title__icon {
      color: #f79009;
    }
    .conflict-hint {
      margin: 0 0 12px;
      color: #475467;
      font-size: 13px;
    }
    .remote-note {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      background: #fffaeb;
      color: #b54708;
      font-size: 12px;
    }
    .remote-note mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .diff-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 320px;
      overflow-y: auto;
    }
    .diff-row {
      display: grid;
      grid-template-columns: 72px 1fr 24px 1fr;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid #eaecf0;
      border-radius: 7px;
      background: #fafbfc;
      font-size: 12px;
    }
    .diff-label {
      color: #667085;
      font-weight: 700;
    }
    .diff-old {
      color: #98a2b3;
      text-decoration: line-through;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .diff-arrow {
      color: #175cd3;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .diff-new {
      color: #172033;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .no-diff {
      margin: 8px 0;
      color: #667085;
      font-size: 13px;
    }
  `],
})
export class ViewConflictDialogComponent {
  readonly data = inject<ViewConflictDialogData>(MAT_DIALOG_DATA);
  readonly diffs: ViewDiffEntry[] = diffViews(this.data.existing, this.data.candidate, TABLE_COLUMNS);
  private readonly dialogRef = inject(MatDialogRef<ViewConflictDialogComponent>);

  confirm(): void {
    this.dialogRef.close('confirm');
  }

  cancel(): void {
    this.dialogRef.close('cancel');
  }
}
