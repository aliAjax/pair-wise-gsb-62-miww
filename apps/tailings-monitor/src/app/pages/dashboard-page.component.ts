import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatTableModule } from '@angular/material/table'
import { RouterLink } from '@angular/router'
import { Store } from '@ngrx/store'
import { map } from 'rxjs'
import { SpatialMapComponent } from '../components/spatial-map.component'
import { selectActiveOrder, selectAnomalies, selectDataset, selectPoints, selectRevision } from '../store/tailings.selectors'

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, RouterLink, SpatialMapComponent],
  template: `
    <section class="page">
      <div class="metrics">
        <article><span>全库一致性版本</span><strong>R{{ revision$ | async }}</strong><small>看板/详情/审阅包同版</small></article>
        <article><span>待重算方案</span><strong class="danger">{{ stalePlanCount$ | async }}</strong><small>调度令换版后失效</small></article>
        <article><span>已暂停任务</span><strong class="warn">{{ pausedTaskCount$ | async }}</strong><small>未完成项先停住</small></article>
        <article><span>应急联动</span><strong>{{ linkedCount$ | async }}</strong><small>保留原依据+追加复核</small></article>
      </div>

      <div class="order-band">
        <div>
          <span>现行调度令</span>
          <h2>{{ (active$ | async)?.title ?? '暂无生效调度令' }}</h2>
          <p>版本 V{{ (active$ | async)?.version }} · {{ (active$ | async)?.level }} · 控制水位 {{ (active$ | async)?.targetWaterLevel }} {{ (active$ | async)?.unit }} · {{ ((active$ | async)?.effectiveAt || '').replace('T', ' ').slice(5, 16) }} 生效</p>
          <small>{{ (active$ | async)?.note }}</small>
        </div>
        <a mat-flat-button color="primary" routerLink="/dispatch">调度令与级联</a>
      </div>

      <app-spatial-map [points]="(points$ | async) ?? []" />

      <div class="grid">
        <div class="threshold-band">
          <h2>阈值版本</h2>
          <table mat-table [dataSource]="(dataset$ | async)?.thresholds ?? []">
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>类型</th><td mat-cell *matCellDef="let row">{{ row.type }}</td></ng-container>
            <ng-container matColumnDef="warning"><th mat-header-cell *matHeaderCellDef>预警</th><td mat-cell *matCellDef="let row">{{ row.warning }} {{ row.unit }}</td></ng-container>
            <ng-container matColumnDef="alarm"><th mat-header-cell *matHeaderCellDef>报警</th><td mat-cell *matCellDef="let row">{{ row.alarm }} {{ row.unit }}</td></ng-container>
            <ng-container matColumnDef="rate"><th mat-header-cell *matHeaderCellDef>变化率</th><td mat-cell *matCellDef="let row">{{ row.changeRate }} {{ row.unit }}</td></ng-container>
            <ng-container matColumnDef="version"><th mat-header-cell *matHeaderCellDef>版本</th><td mat-cell *matCellDef="let row">V{{ row.version }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="thresholdColumns"></tr><tr mat-row *matRowDef="let row; columns: thresholdColumns"></tr>
          </table>
        </div>
        <div class="anomaly-band">
          <h2>异常依据同版状态</h2>
          <table mat-table [dataSource]="anomalies$ | async">
            <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>异常</th><td mat-cell *matCellDef="let row">{{ row.title }}</td></ng-container>
            <ng-container matColumnDef="level"><th mat-header-cell *matHeaderCellDef>响应级别</th><td mat-cell *matCellDef="let row">{{ row.responseLevel }}<em *ngIf="row.levelPendingReview"> 待复核</em></td></ng-container>
            <ng-container matColumnDef="plan"><th mat-header-cell *matHeaderCellDef>方案</th><td mat-cell *matCellDef="let row"><span [class.stale]="row.plan.status === '失效待重算'">V{{ row.plan.version }} · {{ row.plan.status }}</span></td></ng-container>
            <ng-container matColumnDef="basis"><th mat-header-cell *matHeaderCellDef>同版依据</th><td mat-cell *matCellDef="let row">R{{ (dataset$ | async)?.revision }}/令V{{ row.plan.basisOrderVersion }}<span class="link-basis" *ngIf="row.emergency?.active"> · 联动依据令V{{ row.emergency.basisOrderVersion }}</span></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="anomalyColumns"></tr><tr mat-row *matRowDef="let row; columns: anomalyColumns" [class.stale-row]="row.plan.status === '失效待重算'"></tr>
          </table>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); background: white; border: 1px solid #d9e1df; margin-bottom: 14px; }
    .metrics article { padding: 17px 19px; border-right: 1px solid #e2e8e6; } .metrics article:last-child { border: 0; }
    .metrics span, .metrics strong, .metrics small { display: block; } .metrics span { color: #72807d; font-size: 12px; } .metrics strong { font-size: 27px; color: #245060; margin: 6px 0; } .metrics small { color: #98a4a0; font-size: 10px; }
    strong.danger { color: #a23b34; } strong.warn { color: #936d20; }
    .order-band { background: white; border: 1px solid #d9e1df; border-left: 4px solid #315d6e; padding: 14px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .order-band span { color: #72807d; font-size: 11px; } .order-band h2 { margin: 4px 0; font-size: 18px; } .order-band p { margin: 0 0 4px; font-size: 12px; color: #44524f; } .order-band small { color: #8b9794; font-size: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px; margin-top: 14px; }
    .threshold-band, .anomaly-band { background: white; border: 1px solid #d9e1df; padding: 14px; } h2 { margin: 0 0 10px; font-size: 15px; } table { width: 100%; }
    .stale { color: #a23b34; font-weight: 700; } .stale-row { background: #fdf3f2; } em { color: #a23b34; font-style: normal; font-size: 10px; } .link-basis { color: #2e765a; }
  `]
})
export class DashboardPageComponent {
  private readonly store = inject(Store)
  readonly points$ = this.store.select(selectPoints)
  readonly anomalies$ = this.store.select(selectAnomalies)
  readonly dataset$ = this.store.select(selectDataset)
  readonly revision$ = this.store.select(selectRevision)
  readonly active$ = this.store.select(selectActiveOrder)
  readonly stalePlanCount$ = this.anomalies$.pipe(map((items) => items.filter((item) => item.plan.status === '失效待重算').length))
  readonly pausedTaskCount$ = this.anomalies$.pipe(map((items) => items.reduce((sum, item) => sum + item.plan.tasks.filter((task) => task.status === '已暂停').length, 0)))
  readonly linkedCount$ = this.anomalies$.pipe(map((items) => items.filter((item) => item.emergency?.active).length))
  readonly thresholdColumns = ['type', 'warning', 'alarm', 'rate', 'version']
  readonly anomalyColumns = ['title', 'level', 'plan', 'basis']
}
