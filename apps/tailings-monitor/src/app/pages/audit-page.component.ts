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
import { selectDataset, selectReviewPackage, selectRevision } from '../store/tailings.selectors'

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule],
  template: `
    <section class="page">
      <div class="head">
        <div><h2>审计与版本追溯</h2><p>调度令生效、方案失效重算、联动保留依据、并发签批草稿、失败恢复全部留痕；每条事件标注落地后的全库版本。</p></div>
        <div class="head-right"><span class="tag">审阅包同版 R{{ revision$ | async }}</span><button mat-flat-button color="primary" (click)="exportPackage()">导出审阅包</button></div>
      </div>
      <div class="toolbar"><mat-form-field appearance="outline"><mat-label>搜索实体、动作、操作人</mat-label><input matInput [(ngModel)]="keyword" /></mat-form-field><span>共{{ (filtered$ | async)?.length }}条事件</span></div>
      <table mat-table [dataSource]="filtered$ | async" class="panel">
        <ng-container matColumnDef="time"><th mat-header-cell *matHeaderCellDef>时间</th><td mat-cell *matCellDef="let row">{{ row.createdAt.replace('T', ' ').slice(0, 16) }}</td></ng-container>
        <ng-container matColumnDef="revision"><th mat-header-cell *matHeaderCellDef>版本</th><td mat-cell *matCellDef="let row"><b class="rev">R{{ row.revision }}</b></td></ng-container>
        <ng-container matColumnDef="entity"><th mat-header-cell *matHeaderCellDef>实体</th><td mat-cell *matCellDef="let row">{{ row.entityId }}</td></ng-container>
        <ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef>动作</th><td mat-cell *matCellDef="let row"><span [class.cascade]="row.operator === '系统级联'">{{ row.action }}</span></td></ng-container>
        <ng-container matColumnDef="operator"><th mat-header-cell *matHeaderCellDef>操作人</th><td mat-cell *matCellDef="let row">{{ row.operator }}</td></ng-container>
        <ng-container matColumnDef="detail"><th mat-header-cell *matHeaderCellDef>说明</th><td mat-cell *matCellDef="let row">{{ row.detail }}</td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 14px; }
    .head h2 { margin: 0 0 5px; font-size: 20px; } .head p { margin: 0; color: #72807d; font-size: 12px; max-width: 720px; }
    .head-right { display: flex; align-items: center; gap: 12px; } .tag { background: #eef3f2; color: #315d6e; font-weight: 700; padding: 6px 10px; border-radius: 4px; font-size: 12px; }
    .toolbar { display: flex; align-items: center; gap: 12px; } .toolbar span { color: #74827f; font-size: 11px; }
    .panel { width: 100%; background: white; border: 1px solid #d9e1df; } .rev { color: #315d6e; } .cascade { color: #936d20; font-weight: 700; }
  `]
})
export class AuditPageComponent {
  private readonly store = inject(Store)
  private readonly api = inject(TailingsApiService)
  keyword = ''
  readonly columns = ['time', 'revision', 'entity', 'action', 'operator', 'detail']
  readonly revision$ = this.store.select(selectRevision)
  readonly filtered$ = this.store.select(selectDataset).pipe(map((dataset) =>
    dataset.audit
      .filter((item) => !this.keyword || `${item.entityId} ${item.action} ${item.operator} ${item.detail}`.includes(this.keyword))
      .slice()
      .sort((a, b) => b.revision - a.revision || b.createdAt.localeCompare(a.createdAt))
  ))

  exportPackage(): void {
    this.store.select(selectReviewPackage).subscribe((payload) => {
      this.api.exportPackage(payload).subscribe((blob) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `尾矿库监测审阅包-R${(payload as { revision: number }).revision}.json`
        anchor.click()
        URL.revokeObjectURL(url)
      })
    }).unsubscribe()
  }
}
