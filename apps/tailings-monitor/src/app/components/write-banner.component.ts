import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { Store } from '@ngrx/store'
import { TailingsActions } from '../store/tailings.actions'
import { selectDataset, selectFailNextWrite, selectPendingWrite } from '../store/tailings.selectors'

/**
 * 全局写入状态条：展示当前已发布快照版本、暂存写入进度与失败恢复入口。
 * 看板/详情/审阅包都只在“已发布版本”上渲染，保证同版展示。
 */
@Component({
  selector: 'app-write-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="write-banner" [class.submitting]="(pending$ | async)?.phase === '提交中'" [class.failed]="(pending$ | async)?.phase === '失败待恢复'">
      <div class="left">
        <span class="badge">已发布快照 V{{ (dataset$ | async)?.snapshotVersion }}</span>
        <ng-container *ngIf="pending$ | async as pending">
          <ng-container *ngIf="pending.phase === '提交中'">
            <span class="spin"></span>
            <b>{{ pending.label }}</b><small>正在整版提交，看板/详情暂仍显示 V{{ (dataset$ | async)?.snapshotVersion }}，成功后同版更新……</small>
          </ng-container>
          <ng-container *ngIf="pending.phase === '失败待恢复'">
            <span class="err-dot"></span>
            <b>{{ pending.label }} 写入失败，可恢复</b>
            <small>{{ pending.error }}</small>
            <button mat-flat-button color="primary" (click)="retry()">重试提交</button>
            <button mat-button (click)="discard()">放弃本次写入</button>
          </ng-container>
        </ng-container>
        <ng-container *ngIf="(pending$ | async) === null">
          <small class="idle">所有页面按同一已发布快照展示；跨实体联动一次提交，绝不出现半成品。</small>
        </ng-container>
      </div>
      <label class="fail-toggle" [class.on]="failNext$ | async">
        <mat-slide-toggle [checked]="failNext$ | async" (change)="toggle()">模拟下一次写入失败</mat-slide-toggle>
      </label>
    </div>
  `,
  styles: [`
    .write-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 28px; background: #eef3f2; border-bottom: 1px solid #d9e1df; font-size: 12px; }
    .write-banner.submitting { background: #e8f1fb; border-bottom-color: #b9d4ef; }
    .write-banner.failed { background: #fdecea; border-bottom-color: #eab8b3; }
    .left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .badge { font-weight: 700; color: #245060; background: #fff; border: 1px solid #cdd9d6; border-radius: 3px; padding: 2px 8px; font-size: 11px; }
    .idle { color: #7c8986; } small { color: #667572; }
    .err-dot { width: 9px; height: 9px; border-radius: 50%; background: #c0392b; display: inline-block; }
    .fail-toggle { display: flex; align-items: center; color: #8a5a55; font-size: 11px; white-space: nowrap; }
    .fail-toggle.on { color: #b03a30; font-weight: 600; }
    .spin { width: 13px; height: 13px; border: 2px solid #9dbcd8; border-top-color: #2b6ca3; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class WriteBannerComponent {
  private readonly store = inject(Store)
  readonly dataset$ = this.store.select(selectDataset)
  readonly pending$ = this.store.select(selectPendingWrite)
  readonly failNext$ = this.store.select(selectFailNextWrite)
  retry(): void { this.store.dispatch(TailingsActions.retryPendingWrite()) }
  discard(): void { this.store.dispatch(TailingsActions.discardPendingWrite()) }
  toggle(): void { this.store.dispatch(TailingsActions.toggleFailNextWrite()) }
}
