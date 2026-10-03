import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatTableModule } from '@angular/material/table'
import { Store } from '@ngrx/store'
import { map } from 'rxjs'
import type { ResponseLevel } from '../domain'
import { SpatialMapComponent } from '../components/spatial-map.component'
import { TailingsActions } from '../store/tailings.actions'
import {
  selectAnomalies,
  selectConsistencyIssues,
  selectDataset,
  selectDispatchOrders,
  selectEffectiveOrder,
  selectEmergencyLinks,
  selectPendingWrite,
  selectPoints,
  selectSnapshotVersion,
  selectTasks
} from '../store/tailings.selectors'

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, SpatialMapComponent],
  template: `
    <section class="page">
      <div class="metrics">
        <article><span>监测点</span><strong>{{ pointCount$ | async }}</strong><small>位移、水位、渗流、降雨</small></article>
        <article><span>异常点</span><strong>{{ abnormalCount$ | async }}</strong><small>按调度令重算级别</small></article>
        <article><span>应急联动</span><strong>{{ activeLinkCount$ | async }}</strong><small>启动依据冻结，变更追加复核</small></article>
        <article><span>暂停任务</span><strong>{{ frozenTaskCount$ | async }}</strong><small>未完成项先停住</small></article>
      </div>

      <div class="order-band panel">
        <div class="order-current">
          <h2>库水位调度令 <span class="snap">看板快照 V{{ snapshotVersion$ | async }}</span></h2>
          <ng-container *ngIf="effectiveOrder$ | async as order">
            <div class="order-grid">
              <div><span>当前生效</span><b>{{ order.title }}</b><small>{{ order.id }} · {{ order.issuedBy }}</small></div>
              <div><span>目标控制水位</span><b>{{ order.targetWaterLevel }} m</b><small>降库限速 {{ order.rateLimit }} m/d</small></div>
              <div><span>响应级别</span><b class="level">{{ order.responseLevel }}</b><small>{{ order.effectiveAt.replace('T', ' ').slice(0, 16) }} 生效</small></div>
              <div class="note"><span>调度说明</span><p>{{ order.note }}</p></div>
            </div>
          </ng-container>
        </div>
        <form class="order-form" [formGroup]="orderForm" (ngSubmit)="issue()">
          <h3>签发新调度令</h3>
          <p class="hint">生效后：受影响方案失效重算；已启动联动保留原依据并追加复核；未完成任务先停住。一次整版提交到 V{{ (snapshotVersion$ | async)! + 1 }}。</p>
          <div class="row">
            <mat-form-field appearance="outline"><mat-label>目标水位 m</mat-label><input matInput type="number" formControlName="targetWaterLevel" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>降库限速 m/d</mat-label><input matInput type="number" formControlName="rateLimit" /></mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full"><mat-label>响应级别</mat-label><mat-select formControlName="responseLevel"><mat-option *ngFor="let level of levels" [value]="level">{{ level }}</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline" class="full"><mat-label>调度说明</mat-label><textarea matInput rows="2" formControlName="note"></textarea></mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="orderForm.invalid || (pending$ | async) !== null">调度令生效（联动重算）</button>
          <small class="busy" *ngIf="(pending$ | async) !== null">有写入进行中，请等待其完成或恢复后再签发。</small>
        </form>
      </div>

      <div class="consistency panel" [class.bad]="(issues$ | async)?.length">
        <b>一致性自检</b>
        <ng-container *ngIf="(issues$ | async)?.length === 0; else badTpl">
          <span class="ok">通过：联动、方案、任务、看板/详情/审阅包均处于同一已发布版本 V{{ snapshotVersion$ | async }}，无半成品。</span>
        </ng-container>
        <ng-template #badTpl><ul><li *ngFor="let issue of issues$ | async">{{ issue }}</li></ul></ng-template>
      </div>

      <app-spatial-map [points]="(points$ | async) ?? []" />
      <div class="threshold-band panel">
        <div><h2>阈值与历史调度令</h2><p>阈值版本独立留痕；调度令一改，异常级别与处置方案按新令重算。</p></div>
        <table mat-table [dataSource]="(dataset$ | async)?.thresholds ?? []">
          <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>类型</th><td mat-cell *matCellDef="let row">{{ row.type }}</td></ng-container>
          <ng-container matColumnDef="warning"><th mat-header-cell *matHeaderCellDef>预警</th><td mat-cell *matCellDef="let row">{{ row.warning }} {{ row.unit }}</td></ng-container>
          <ng-container matColumnDef="alarm"><th mat-header-cell *matHeaderCellDef>报警</th><td mat-cell *matCellDef="let row">{{ row.alarm }} {{ row.unit }}</td></ng-container>
          <ng-container matColumnDef="rate"><th mat-header-cell *matHeaderCellDef>变化率</th><td mat-cell *matCellDef="let row">{{ row.changeRate }} {{ row.unit }}</td></ng-container>
          <ng-container matColumnDef="version"><th mat-header-cell *matHeaderCellDef>版本</th><td mat-cell *matCellDef="let row">V{{ row.version }}</td></ng-container>
          <tr mat-header-row *matHeaderRowDef="thresholdColumns"></tr><tr mat-row *matRowDef="let row; columns: thresholdColumns"></tr>
        </table>
        <div class="order-history">
          <h3>调度令沿革</h3>
          <article *ngFor="let order of orders$ | async" [class.active]="order.status === '已生效'" [class.void]="order.status === '已废止'">
            <b>{{ order.title }}</b><span class="tag">{{ order.status }}</span>
            <p>{{ order.id }} · 目标 {{ order.targetWaterLevel }}m · {{ order.responseLevel }} · {{ order.effectiveAt.replace('T', ' ').slice(0, 16) }}</p>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }
    .panel { background: white; border: 1px solid #d9e1df; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d9e1df; margin-bottom: 15px; }
    .metrics article { padding: 17px 19px; border-right: 1px solid #e2e8e6; background: white; } .metrics article:last-child { border: 0; }
    .metrics span, .metrics strong, .metrics small { display: block; } .metrics span { color: #72807d; font-size: 12px; } .metrics strong { font-size: 27px; color: #245060; margin: 6px 0; } .metrics small { color: #98a4a0; font-size: 10px; }
    .order-band { display: grid; grid-template-columns: 1fr 360px; margin-bottom: 15px; }
    .order-current { padding: 18px 20px; border-right: 1px solid #e2e8e6; } .order-current h2 { margin: 0 0 14px; font-size: 17px; } .snap { font-size: 11px; color: #2b6ca3; background: #e8f1fb; border-radius: 3px; padding: 2px 7px; margin-left: 8px; font-weight: 600; }
    .order-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; } .order-grid .note { grid-column: 1 / -1; }
    .order-grid span, .order-grid small { display: block; color: #82908c; font-size: 10px; } .order-grid b { font-size: 18px; color: #213a44; display: block; margin: 3px 0; } .order-grid .level { color: #a23b34; } .order-grid p { margin: 3px 0 0; color: #5f6d69; font-size: 12px; }
    .order-form { padding: 18px 20px; background: #f7f9f9; display: grid; gap: 4px; } .order-form h3 { margin: 0 0 2px; font-size: 14px; } .order-form .hint { color: #7a8784; font-size: 11px; margin: 0 0 8px; }
    .order-form .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .order-form .full { width: 100%; } .order-form .busy { color: #a26a2f; font-size: 11px; }
    .consistency { padding: 11px 18px; margin-bottom: 15px; display: flex; align-items: baseline; gap: 10px; font-size: 12px; } .consistency .ok { color: #2e765a; } .consistency.bad { background: #fdecea; border-color: #e4b3ad; } .consistency ul { margin: 4px 0 0; padding-left: 18px; color: #a23b34; }
    .threshold-band { margin-top: 15px; padding: 16px; } .threshold-band h2 { margin: 0 0 5px; font-size: 17px; } .threshold-band p { color: #72807d; font-size: 12px; margin: 0 0 12px; } table { width: 100%; }
    .order-history { margin-top: 16px; } .order-history h3 { font-size: 13px; margin: 0 0 8px; } .order-history article { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 8px 0; border-bottom: 1px solid #eef2f1; } .order-history article p { grid-column: 1 / -1; margin: 0; color: #7a8784; font-size: 11px; } .order-history .tag { font-size: 10px; padding: 2px 7px; border-radius: 3px; background: #e7f3ee; color: #2e765a; } .order-history .void { opacity: .65; } .order-history .void .tag { background: #ececec; color: #8a8a8a; }
  `]
})
export class DashboardPageComponent {
  private readonly store = inject(Store)
  private readonly fb = inject(FormBuilder)
  readonly levels: ResponseLevel[] = ['Ⅲ级(关注)', 'Ⅱ级(较高)', 'Ⅰ级(重大)']
  readonly orderForm = this.fb.nonNullable.group({
    targetWaterLevel: [866.0, Validators.required],
    rateLimit: [0.8, Validators.required],
    responseLevel: 'Ⅰ级(重大)' as ResponseLevel,
    note: ['上游持续降雨，Ⅰ级响应，加快降低库水位至866.0m。']
  })

  readonly points$ = this.store.select(selectPoints)
  readonly anomalies$ = this.store.select(selectAnomalies)
  readonly dataset$ = this.store.select(selectDataset)
  readonly orders$ = this.store.select(selectDispatchOrders)
  readonly effectiveOrder$ = this.store.select(selectEffectiveOrder)
  readonly links$ = this.store.select(selectEmergencyLinks)
  readonly tasks$ = this.store.select(selectTasks)
  readonly snapshotVersion$ = this.store.select(selectSnapshotVersion)
  readonly pending$ = this.store.select(selectPendingWrite)
  readonly issues$ = this.store.select(selectConsistencyIssues)
  readonly pointCount$ = this.points$.pipe(map((points) => points.length))
  readonly abnormalCount$ = this.points$.pipe(map((points) => points.filter((point) => point.status !== '正常').length))
  readonly activeLinkCount$ = this.links$.pipe(map((links) => links.filter((link) => link.status !== '已解除').length))
  readonly frozenTaskCount$ = this.tasks$.pipe(map((tasks) => tasks.filter((task) => task.frozen).length))
  readonly thresholdColumns = ['type', 'warning', 'alarm', 'rate', 'version']

  issue(): void {
    if (this.orderForm.invalid) return
    const value = this.orderForm.getRawValue()
    this.store.dispatch(TailingsActions.issueDispatchOrder({
      targetWaterLevel: value.targetWaterLevel,
      rateLimit: value.rateLimit,
      responseLevel: value.responseLevel,
      note: value.note
    }))
  }
}
