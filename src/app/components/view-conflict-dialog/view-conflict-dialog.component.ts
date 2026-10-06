import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ViewConflict } from '../../types/table.models';

/** 保存视图冲突时展示双方差异，用户确认后才覆盖对方版本 */
@Component({
  selector: 'app-view-conflict-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>warning_amber</mat-icon>
      视图「{{ conflict.name }}」已被他人保存
    </h2>
    <mat-dialog-content>
      <p class="summary">
        对方版本 <strong>v{{ conflict.existing.revision }}</strong>
        （{{ conflict.existing.updatedAt | date:'MM-dd HH:mm:ss' }}），
        你的修改基于 <strong>v{{ conflict.incoming.revision }}</strong>。
        确认覆盖前请核对双方差异：
      </p>
      @if (conflict.diffs.length) {
        <table class="diff-table">
          <thead>
            <tr>
              <th>配置项</th>
              <th>对方已保存</th>
              <th>你的修改</th>
            </tr>
          </thead>
          <tbody>
            @for (diff of conflict.diffs; track diff.field) {
              <tr>
                <td>{{ diff.label }}</td>
                <td class="existing">{{ diff.existing }}</td>
                <td class="incoming">{{ diff.incoming }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="no-diff">两边配置内容一致，仅保存时间不同。</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close('cancel')">取消，保留对方版本</button>
      <button mat-flat-button color="warn" type="button" (click)="close('overwrite')">
        确认覆盖对方版本
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #b42318;
    }
    .summary {
      margin: 0 0 12px;
      color: #475467;
      font-size: 13px;
    }
    .diff-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .diff-table th,
    .diff-table td {
      padding: 8px 10px;
      border: 1px solid #eaecf0;
      text-align: left;
      vertical-align: top;
    }
    .diff-table th {
      background: #f8fafc;
      color: #667085;
      font-weight: 600;
    }
    .diff-table .existing {
      color: #b42318;
    }
    .diff-table .incoming {
      color: #027a48;
    }
    .no-diff {
      margin: 0;
      padding: 12px;
      border-radius: 8px;
      background: #f8fafc;
      color: #667085;
      font-size: 13px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewConflictDialogComponent {
  readonly conflict: ViewConflict = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ViewConflictDialogComponent>);

  close(result: 'overwrite' | 'cancel'): void {
    this.dialogRef.close(result);
  }
}
