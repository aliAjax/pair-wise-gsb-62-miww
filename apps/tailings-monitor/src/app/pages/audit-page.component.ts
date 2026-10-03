import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatTableModule } from '@angular/material/table'
import { Store } from '@ngrx/store'
import { map } from 'rxjs'
import { TailingsApiService } from '../services/tailings-api.service'
import { selectConsistencyIssues, selectDataset, selectPendingWrite } from '../store/tailings.selectors'

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule],
  template: `
    <section class="page">
      <div class="head">
        <div><h2>审计与版本追溯</h2><p>调度令生效、级别重算、方案失效重算、联动复核、并发签批全部带快照版本留痕；审阅包只导出当前已发布整版。</p></div>
        <div class="export-box">
          <span class="snap">已发布 V{{ (dataset$ | async)?.snapshotVersion }}</span>
          <button mat-flat-button color="primary" [disabled]="(pending$ | async) !== null" (click)="exportPackage()">{{ (pending$ | async) ? '写入进行中，禁止导出' : '导出审阅包' }}</button>
        </div>
      </div>
      <div class="consistency" [class.bad]="(issues$ | async)?.length">
        <b>同版校验：</b>
        <span *ngIf="(issues$ | async)?.length === 0" class="ok">通过，看板/详情/本审阅包均为同一已发布快照，无“联动已启动、方案仍旧版”。</span>
        <span *ngIf="(issues$ | async)?.length" class="bad-text">{{ (issues$ | async)?.length }} 处不一致，已禁止导出整版。</span>
      </div>
      <div class="toolbar"><mat-form-field appearance="outline"><mat-label>搜索实体、动作、操作人</mat-label><input matInput [(ngModel)]="keyword" /></mat-form-field><span>共{{ (filtered$ | async)?.length }}条事件</span></div>
      <table mat-table [dataSource]="filtered$ | async" class="panel">
        <ng-container matColumnDef="version"><th mat-header-cell *matHeaderCellDef>快照</th><td mat-cell *matCellDef="let row"><span class="v">V{{ row.snapshotVersion }}</span></td></ng-container>
        <ng-container matColumnDef="time"><th mat-header-cell *matHeaderCellDef>时间</th><td mat-cell *matCellDef="let row">{{ row.createdAt.replace('T', ' ').slice(5, 16) }}</td></ng-container>
        <ng-container matColumnDef="entity"><th mat-header-cell *matHeaderCellDef>实体</th><td mat-cell *matCellDef="let row">{{ row.entityId }}</td></ng-container>
        <ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef>动作</th><td mat-cell *matCellDef="let row"><span class="action" [class.key]="keyActions.includes(row.action)">{{ row.action }}</span></td></ng-container>
        <ng-container matColumnDef="operator"><th mat-header-cell *matHeaderCellDef>操作人</th><td mat-cell *matCellDef="let row">{{ row.operator }}</td></ng-container>
        <ng-container matColumnDef="detail"><th mat-header-cell *matHeaderCellDef>说明</th><td mat-cell *matCellDef="let row">{{ row.detail }}</td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 16px; }.head h2 { margin: 0 0 5px; font-size: 20px; }.head p { margin: 0; color: #72807d; font-size: 12px; max-width: 720px; }
    .export-box { display: grid; gap: 6px; justify-items: end; }.snap { font-weight: 700; color: #2b6ca3; font-size: 13px; }
    .consistency { background: white; border: 1px solid #d9e1df; padding: 10px 16px; font-size: 12px; margin-bottom: 12px; display: flex; gap: 8px; align-items: baseline; }.consistency .ok { color: #2e765a; }.consistency.bad { background: #fdecea; border-color: #e4b3ad; }.bad-text { color: #a23b34; }
    .toolbar { display: flex; align-items: center; gap: 12px; }.toolbar span { color: #72807d; font-size: 11px; }.panel { width: 100%; background: white; border: 1px solid #d9e1df; }
    .v { font-weight: 700; color: #2b6ca3; font-size: 11px; }.action.key { color: #a23b34; font-weight: 600; }
  `]
})
export class AuditPageComponent {
  private readonly store = inject(Store)
  private readonly api = inject(TailingsApiService)
  keyword = ''
  readonly keyActions = ['调度令生效', '调度令废止', '异常级别重算', '方案失效重算', '任务暂停', '任务恢复', '联动追加复核', '联动复核结论', '签批转草稿']
  readonly columns = ['version', 'time', 'entity', 'action', 'operator', 'detail']
  readonly dataset$ = this.store.select(selectDataset)
  readonly pending$ = this.store.select(selectPendingWrite)
  readonly issues$ = this.store.select(selectConsistencyIssues)
  readonly filtered$ = this.store.select(selectDataset).pipe(map((dataset) => dataset.audit.filter((item) => !this.keyword || `${item.entityId} ${item.action} ${item.operator} ${item.detail}`.includes(this.keyword))))
  exportPackage(): void {
    this.store.select(selectDataset).subscribe((dataset) => {
      this.api.exportPackage(dataset).subscribe((blob) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `尾矿库监测审阅包-V${dataset.snapshotVersion}.json`; anchor.click(); URL.revokeObjectURL(url)
      })
    }).unsubscribe()
  }
}
