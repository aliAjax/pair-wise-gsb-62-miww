import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatTableModule } from '@angular/material/table'
import { Store } from '@ngrx/store'
import type { Anomaly, DispatchOrder, ResponseLevel } from '../domain'
import { affectedByOrder } from '../store/commit-engine'
import { TailingsActions } from '../store/tailings.actions'
import { selectActiveOrder, selectAnomalies, selectDataset, selectDispatchOrders, selectRevision } from '../store/tailings.selectors'

@Component({
  selector: 'app-dispatch-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule],
  template: `
    <section class="page">
      <div class="metrics">
        <article><span>全库一致性版本</span><strong>R{{ revision$ | async }}</strong><small>看板/详情/审阅包同版</small></article>
        <article><span>现行调度令</span><strong>V{{ (active$ | async)?.version ?? '—' }}</strong><small>{{ (active$ | async)?.level }}</small></article>
        <article><span>控制库水位</span><strong>{{ (active$ | async)?.targetWaterLevel ?? '—' }}</strong><small>{{ (active$ | async)?.unit }}</small></article>
        <article><span>生效时间</span><strong>{{ ((active$ | async)?.effectiveAt || '').replace('T', ' ').slice(5, 16) || '—' }}</strong><small>换版即触发级联</small></article>
      </div>

      <div class="split">
        <div class="panel">
          <h2>调度令版本</h2>
          <p class="hint">调度令生效是一次原子级联：受影响方案立即失效重算、已启动联动保留原依据并追加复核、未完成项先停住。</p>
          <table mat-table [dataSource]="orders$ | async">
            <ng-container matColumnDef="version"><th mat-header-cell *matHeaderCellDef>版本</th><td mat-cell *matCellDef="let row">V{{ row.version }}</td></ng-container>
            <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>调度令</th><td mat-cell *matCellDef="let row"><b>{{ row.title }}</b><small>{{ row.id }} · {{ row.issuedBy }}</small></td></ng-container>
            <ng-container matColumnDef="level"><th mat-header-cell *matHeaderCellDef>响应级别</th><td mat-cell *matCellDef="let row">{{ row.level }}</td></ng-container>
            <ng-container matColumnDef="target"><th mat-header-cell *matHeaderCellDef>控制水位</th><td mat-cell *matCellDef="let row">{{ row.targetWaterLevel }} {{ row.unit }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>状态</th><td mat-cell *matCellDef="let row"><span class="status" [class.active]="row.status === '已生效'" [class.void]="row.status === '作废'">{{ row.status }}</span></td></ng-container>
            <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let row"><button mat-flat-button color="primary" *ngIf="row.status === '草稿'" (click)="activate(row)">生效并级联</button><span *ngIf="row.status === '已生效'">执行中</span><span *ngIf="row.status === '作废'">已被V{{ nextVersion(row) }}接替</span></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="orderColumns"></tr><tr mat-row *matRowDef="let row; columns: orderColumns"></tr>
          </table>

          <h2 class="mt">生效影响预览（以拟稿级别实时测算）</h2>
          <table mat-table [dataSource]="impactRows">
            <ng-container matColumnDef="anomaly"><th mat-header-cell *matHeaderCellDef>异常</th><td mat-cell *matCellDef="let row"><b>{{ row.anomaly.title }}</b><small>{{ row.anomaly.id }} · {{ row.anomaly.status }}</small></td></ng-container>
            <ng-container matColumnDef="plan"><th mat-header-cell *matHeaderCellDef>方案</th><td mat-cell *matCellDef="let row">V{{ row.anomaly.plan.version }}（依据调度令V{{ row.anomaly.plan.basisOrderVersion }}） → <b class="danger">失效重算</b></td></ng-container>
            <ng-container matColumnDef="tasks"><th mat-header-cell *matHeaderCellDef>未完成项</th><td mat-cell *matCellDef="let row">{{ row.pauseCount }}项先停住</td></ng-container>
            <ng-container matColumnDef="link"><th mat-header-cell *matHeaderCellDef>应急联动</th><td mat-cell *matCellDef="let row"><span *ngIf="row.anomaly.emergency?.active" class="kept">已启动：保留V{{ row.anomaly.emergency.basisOrderVersion }}原依据 + 追加复核</span><span *ngIf="!row.anomaly.emergency?.active">未启动</span></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="impactColumns"></tr><tr mat-row *matRowDef="let row; columns: impactColumns"></tr>
          </table>
        </div>

        <div class="panel form-panel">
          <h2>拟新调度令</h2>
          <mat-form-field appearance="outline"><mat-label>标题</mat-label><input matInput [(ngModel)]="form.title" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>响应级别</mat-label><mat-select [(ngModel)]="form.level"><mat-option *ngFor="let item of levels" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>控制库水位 (m)</mat-label><input matInput type="number" step="0.1" [(ngModel)]="form.targetWaterLevel" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>签发单位</mat-label><input matInput [(ngModel)]="form.issuedBy" /></mat-form-field>
          <mat-form-field appearance="outline" class="wide"><mat-label>调度说明（生效后写入审计）</mat-label><textarea matInput rows="3" [(ngModel)]="form.note"></textarea></mat-form-field>
          <button mat-flat-button color="primary" (click)="saveDraft()">保存草稿（不生效）</button>
          <p class="hint">草稿不改变任何现场状态；点击版本列表中的「生效并级联」后才会一次性完成旧令作废、方案失效、任务暂停、联动保留。</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); background: white; border: 1px solid #d9e1df; margin-bottom: 14px; }
    .metrics article { padding: 16px 18px; border-right: 1px solid #e2e7e6; } .metrics article:last-child { border: 0; }
    .metrics span, .metrics strong, .metrics small { display: block; } .metrics span { color: #72807d; font-size: 12px; } .metrics strong { font-size: 24px; color: #245060; margin: 6px 0; } .metrics small { color: #98a4a0; font-size: 10px; }
    .split { display: grid; grid-template-columns: minmax(640px, 1fr) 360px; gap: 14px; align-items: start; }
    .panel { background: white; border: 1px solid #d9e1df; padding: 16px; } .panel h2 { margin: 0 0 6px; font-size: 16px; } .mt { margin-top: 22px; }
    .hint { color: #7a8784; font-size: 11px; margin: 0 0 12px; } table { width: 100%; }
    .status { padding: 2px 8px; border-radius: 3px; font-size: 11px; background: #eceff1; color: #607d8b; } .status.active { background: #e7f3ee; color: #2e765a; } .status.void { background: #f4f0ea; color: #8d7c66; }
    .danger { color: #a23b34; } .kept { color: #2e765a; font-size: 11px; } td small { display: block; color: #8b9794; font-size: 10px; }
    .form-panel { display: grid; gap: 4px; } .form-panel .wide { width: 100%; }
  `]
})
export class DispatchPageComponent {
  private readonly store = inject(Store)
  readonly revision$ = this.store.select(selectRevision)
  readonly orders$ = this.store.select(selectDispatchOrders)
  readonly active$ = this.store.select(selectActiveOrder)
  readonly anomalies$ = this.store.select(selectAnomalies)
  private readonly dataset$ = this.store.select(selectDataset)
  readonly orderColumns = ['version', 'title', 'level', 'target', 'status', 'actions']
  readonly impactColumns = ['anomaly', 'plan', 'tasks', 'link']
  readonly levels: ResponseLevel[] = ['Ⅳ级(关注)', 'Ⅲ级(较高)', 'Ⅱ级(重大)', 'Ⅰ级(特大)']
  form = {
    title: '汛期库水位调度令（新版）',
    level: 'Ⅰ级(特大)' as ResponseLevel,
    targetWaterLevel: 869.5,
    issuedBy: '防汛指挥部',
    note: '上游强降雨预报，库水位进一步下调，响应级别上调；受影响方案立即重算，已启动联动保留原依据并追加复核。'
  }
  impactRows: { anomaly: Anomaly; pauseCount: number }[] = []

  constructor() {
    this.dataset$.subscribe((dataset) => {
      const previewOrder = { zones: [] } as DispatchOrder
      this.impactRows = dataset.anomalies
        .filter((anomaly) => affectedByOrder(dataset, anomaly, previewOrder))
        .map((anomaly) => ({ anomaly, pauseCount: anomaly.plan.tasks.filter((task) => task.status !== '已完成').length }))
    })
  }

  nextVersion(row: DispatchOrder): number {
    return row.version + 1
  }

  saveDraft(): void {
    this.store.dispatch(TailingsActions.createDispatchOrder({
      draft: {
        title: this.form.title,
        level: this.form.level,
        targetWaterLevel: this.form.targetWaterLevel,
        unit: 'm',
        issuedBy: this.form.issuedBy,
        issuedAt: new Date().toISOString(),
        effectiveAt: '',
        zones: [],
        note: this.form.note
      }
    }))
  }

  activate(row: DispatchOrder): void {
    if (!globalThis.confirm(`确认调度令V${row.version}生效？将一次性完成：旧令作废、受影响方案失效重算、未完成任务暂停、已启动联动保留原依据。`)) return
    this.store.dispatch(TailingsActions.activateDispatchOrder({ orderId: row.id, note: '' }))
  }
}
