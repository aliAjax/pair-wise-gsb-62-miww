import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatTableModule } from '@angular/material/table'
import { Store } from '@ngrx/store'
import { combineLatest, map } from 'rxjs'
import type { Anomaly, DispositionPlan, EmergencyConclusion, ExpertOpinion } from '../domain'
import { TailingsActions } from '../store/tailings.actions'
import {
  selectAnomalies,
  selectApprovals,
  selectDrafts,
  selectEmergencyLinks,
  selectFilteredAnomalies,
  selectPendingWrite,
  selectSelectedAnomaly,
  selectSnapshotVersion,
  selectTasks
} from '../store/tailings.selectors'

@Component({
  selector: 'app-anomaly-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule],
  template: `
    <section class="page">
      <div class="metrics">
        <article><span>调查与审批</span><strong>{{ count(['待现场复核','原因调查中','待负责人审批']) }}</strong><small>受调度令影响将重算</small></article>
        <article><span>处置中</span><strong>{{ count(['处置中']) }}</strong><small>方案已签批执行</small></article>
        <article><span>应急联动</span><strong>{{ count(['应急联动']) }}</strong><small>原依据冻结·变更复核</small></article>
        <article><span>已关闭</span><strong>{{ count(['已关闭']) }}</strong><small>具备复测与签批</small></article>
      </div>
      <div class="toolbar"><mat-form-field appearance="outline"><mat-label>搜索异常</mat-label><input matInput [(ngModel)]="localKeyword" (ngModelChange)="updateKeyword($event)" /></mat-form-field><mat-form-field appearance="outline"><mat-label>状态</mat-label><mat-select [(ngModel)]="localStatus" (ngModelChange)="updateStatus($event)"><mat-option value="全部">全部</mat-option><mat-option *ngFor="let item of statuses" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field></div>
      <div class="split">
        <div class="left-col">
          <table mat-table [dataSource]="filtered$ | async" class="panel">
            <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>异常</th><td mat-cell *matCellDef="let row"><b>{{ row.title }}</b><small class="sub">{{ row.id }} · {{ row.pointId }}</small></td></ng-container>
            <ng-container matColumnDef="severity"><th mat-header-cell *matHeaderCellDef>级别</th><td mat-cell *matCellDef="let row"><span class="severity" [class.major]="row.severity === '重大'">{{ row.severity }}</span></td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>状态</th><td mat-cell *matCellDef="let row"><span class="state" [class.link]="row.status === '应急联动'" [class.hold]="row.plan.status === '已失效'">{{ row.status }}</span></td></ng-container>
            <ng-container matColumnDef="basis"><th mat-header-cell *matHeaderCellDef>依据</th><td mat-cell *matCellDef="let row"><small>{{ row.plan.basisOrderId }}/V{{ row.plan.basisSnapshotVersion }}</small></td></ng-container>
            <ng-container matColumnDef="version"><th mat-header-cell *matHeaderCellDef>版本</th><td mat-cell *matCellDef="let row">V{{ row.version }}</td></ng-container>
            <ng-container matColumnDef="open"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let row"><button mat-button (click)="select(row.id)">审阅</button></td></ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns" [class.selected]="row.id === (selected$ | async)?.id"></tr>
          </table>

          <div class="panel drafts" *ngIf="draftsForSelected$ | async as drafts">
            <h3>被保留的签批草稿（后到者看到依据变化）</h3>
            <p class="empty" *ngIf="drafts.length === 0">暂无后到签批。两人同签同一异常时，只通过一份，后到者在此保留草稿。</p>
            <article *ngFor="let draft of drafts">
              <div class="draft-head"><b>{{ draft.approver }}</b><span class="tag" [class.warn]="draft.reason === '依据版本已变化'">{{ draft.reason }}</span><small>{{ draft.attemptedAt.replace('T', ' ').slice(5, 16) }}</small></div>
              <p>{{ draft.note }}</p>
              <div class="basis-diff">
                <span>尝试时：方案 V{{ draft.planVersionAtAttempt }} · 快照 V{{ draft.snapshotVersionAtAttempt }}</span>
                <span [class.changed]="draft.basisChanged">当前：方案 V{{ draft.currentPlanVersion }} · 快照 V{{ draft.currentSnapshotVersion }}</span>
              </div>
            </article>
          </div>
        </div>

        <div class="panel detail" *ngIf="selected$ | async as selected">
          <div class="detail-head">
            <div><span>{{ selected.id }} · 异常 V{{ selected.version }} · 展示快照 V{{ snapshotVersion$ | async }}</span><h2>{{ selected.title }}</h2><p>{{ selected.observedValue }}</p></div>
            <span class="severity" [class.major]="selected.severity === '重大'">{{ selected.severity }}</span>
          </div>

          <div class="severity-track" *ngIf="selected.severityHistory.length">
            <h3>级别随调度令重算</h3>
            <article *ngFor="let change of selected.severityHistory"><span class="severity" [class.major]="change.from === '重大'">{{ change.from }}</span><i>→</i><span class="severity major" *ngIf="change.to === '重大'">{{ change.to }}</span><span class="severity" *ngIf="change.to !== '重大'">{{ change.to }}</span><b>{{ change.reason }} · V{{ change.snapshotVersion }}</b></article>
          </div>

          <h3>现场复核</h3>
          <div class="review-form"><mat-form-field appearance="outline" class="wide"><mat-label>现场观察</mat-label><textarea matInput rows="2" [(ngModel)]="fieldForm.observed"></textarea></mat-form-field><mat-form-field appearance="outline"><mat-label>证据清单</mat-label><input matInput [(ngModel)]="fieldForm.evidence" /></mat-form-field><mat-form-field appearance="outline"><mat-label>重新评估</mat-label><input matInput [(ngModel)]="fieldForm.reassessment" /></mat-form-field><button mat-flat-button color="primary" [disabled]="busy" (click)="submitReview(selected)">提交复核版本</button></div>
          <div class="records" *ngFor="let review of selected.fieldReviews"><b>{{ review.inspector }} · V{{ review.version }}</b><p>{{ review.observed }}</p><span>{{ review.reassessment }} · {{ review.evidence }}</span></div>

          <h3>专业意见</h3>
          <div class="opinion-form"><mat-form-field appearance="outline"><mat-label>专业</mat-label><mat-select [(ngModel)]="opinionForm.discipline"><mat-option *ngFor="let item of disciplines" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field><mat-form-field appearance="outline" class="wide"><mat-label>意见</mat-label><input matInput [(ngModel)]="opinionForm.content" /></mat-form-field><button mat-button [disabled]="busy" (click)="addOpinion(selected)">补充意见</button></div>
          <div class="opinions"><article *ngFor="let opinion of selected.opinions"><b>{{ opinion.discipline }}专家 {{ opinion.specialist }}</b><span>{{ opinion.conclusion }}</span><p>{{ opinion.content }}</p></article></div>

          <h3>处置方案与会签（依据 {{ selected.plan.basisOrderId }}/V{{ selected.plan.basisSnapshotVersion }} · 方案 V{{ selected.plan.version }}）</h3>
          <div class="plan-invalid" *ngIf="selected.plan.status === '已失效'">
            ⚠ 当前调度令已变更：本方案依据失效，已整体进入下方历史版本；已按新令重算新版方案待签批。
          </div>
          <div class="plan-form"><mat-form-field appearance="outline"><mat-label>措施</mat-label><mat-select [(ngModel)]="planForm.action"><mat-option *ngFor="let item of actions" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field><mat-form-field appearance="outline"><mat-label>责任方</mat-label><input matInput [(ngModel)]="planForm.owner" /></mat-form-field><mat-form-field appearance="outline" class="wide"><mat-label>关闭条件</mat-label><textarea matInput rows="2" [(ngModel)]="planForm.conditions"></textarea></mat-form-field><mat-form-field appearance="outline"><mat-label>截止</mat-label><input matInput type="datetime-local" [(ngModel)]="planForm.deadline" /></mat-form-field><button mat-button [disabled]="busy || selected.plan.status === '执行中'" (click)="savePlan(selected)">提交/修订方案</button></div>

          <div class="approval-band">
            <div class="approval-info">
              <ng-container *ngIf="approvalForSelected$ | async as approval"><b>{{ approval.approver }} 已签批 · {{ approval.approvedAt.replace('T',' ').slice(5,16) }}</b><span>{{ approval.note }}</span><small>签批依据快照 V{{ approval.basisSnapshotVersion }} / 方案 V{{ approval.planVersion }}</small></ng-container>
              <ng-container *ngIf="(approvalForSelected$ | async) === undefined"><b>尚未签批</b><span>同一方案两人同签只通过一份；后到者转草稿并提示依据变化。</span></ng-container>
            </div>
            <div class="approval-actions">
              <button mat-flat-button color="primary" [disabled]="!canApprove(selected)" (click)="approve(selected, '何清')">何清 签批</button>
              <button mat-flat-button [disabled]="!canApprove(selected)" (click)="approve(selected, '高宁')">高宁 同时签批</button>
              <button mat-button color="warn" [disabled]="busy || !selected.plan.approvedBy || linkActive" (click)="emergency(selected)">启动应急联动</button>
              <button mat-button [disabled]="!canClose(selected)" (click)="close(selected)">关闭异常</button>
            </div>
          </div>

          <div class="plan-history" *ngIf="selected.planHistory.length">
            <h3>方案历史（失效旧版整体留痕）</h3>
            <article *ngFor="let old of selected.planHistory" class="invalid-plan">
              <div class="draft-head"><b>{{ old.action }} · {{ old.id }}</b><span class="tag void">已失效</span></div>
              <p>{{ old.conditions }}</p>
              <small>依据 {{ old.basisOrderId }}/V{{ old.basisSnapshotVersion }}{{ old.approvedBy ? ' · 已由' + old.approvedBy + '签批' : ' · 未签批' }} · {{ old.invalidatedReason }} → 新版 {{ old.supersededByPlanId }}</small>
            </article>
          </div>

          <div class="tasks" *ngIf="tasksForSelected$ | async as tasks">
            <h3>处置任务（未完成项）</h3>
            <p class="empty" *ngIf="tasks.length === 0">暂无任务。</p>
            <article *ngFor="let task of tasks" [class.frozen]="task.frozen" [class.done]="task.status === '已完成'">
              <div class="draft-head"><b>{{ task.title }}</b><span class="tag" [class.froz]="task.frozen" [class.fin]="task.status === '已完成'">{{ task.status }}</span></div>
              <small>责任方 {{ task.owner }}<ng-container *ngIf="task.frozen"> · {{ task.frozenReason }}</ng-container></small>
              <p *ngIf="task.result">{{ task.result }}</p>
              <button mat-button *ngIf="task.status !== '已完成'" [disabled]="task.frozen || busy" (click)="finishTask(task.id)">{{ task.frozen ? '已停住' : '完成并回填' }}</button>
            </article>
          </div>

          <div class="emergency" *ngIf="linkForSelected$ | async as link">
            <h3>应急联动</h3>
            <div class="link-basis">
              <span class="tag link">联动 {{ link.status }}</span>
              <b>启动依据（冻结不改）</b>
              <p>启动于 {{ link.startedAt.replace('T',' ').slice(5,16) }} · {{ link.startedBy }}</p>
              <p>方案 {{ link.basisPlanId }} · 调度令 {{ link.basisOrderId }} · 快照 V{{ link.basisSnapshotVersion }} · 级别 {{ link.level }}</p>
              <small>{{ link.basisNote }}</small>
            </div>
            <div class="link-reviews" *ngIf="link.reviews.length">
              <h4>调度令变更追加复核（原启动依据保留）</h4>
              <article *ngFor="let review of link.reviews" [class.resolved]="review.resolved">
                <div class="draft-head"><b>{{ review.reason }}</b><span class="tag" [class.fin]="review.resolved">{{ review.resolved ? '已复核·' + review.conclusion : '待复核' }}</span></div>
                <small>{{ review.requiredAt.replace('T',' ').slice(5,16) }} · {{ review.requiredBy }} 要求复核</small>
                <p *ngIf="review.resolved">{{ review.resolvedBy }}：{{ review.note }}</p>
                <div class="review-actions" *ngIf="!review.resolved">
                  <button mat-flat-button color="primary" [disabled]="busy" (click)="resolve(link.id, review.id, '维持联动')">维持联动</button>
                  <button mat-button [disabled]="busy" (click)="resolve(link.id, review.id, '升级响应')">升级响应</button>
                  <button mat-button color="warn" [disabled]="busy" (click)="resolve(link.id, review.id, '解除联动')">解除联动</button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }.metrics { display: grid; grid-template-columns: repeat(4, 1fr); background: white; border: 1px solid #d9e1df; margin-bottom: 14px; }.metrics article { padding: 16px 18px; border-right: 1px solid #e2e7e6; }.metrics article:last-child { border: 0; }.metrics span, .metrics strong, .metrics small { display: block; }.metrics span { color: #72807d; font-size: 12px; }.metrics strong { font-size: 26px; color: #245060; margin: 6px 0; }.metrics small { color: #98a4a0; font-size: 10px; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 10px; }.split { display: grid; grid-template-columns: minmax(560px,1fr) 560px; gap: 14px; align-items: start; }.left-col { display: grid; gap: 14px; }.panel { background: white; border: 1px solid #d9e1df; } table { width: 100%; }.selected { background: #eef5f4; }.sub { display: block; color: #7c8986; font-size: 10px; margin-top: 3px; }
    .severity { padding: 3px 7px; border-radius: 3px; background: #f7edd6; color: #8e681d; font-size: 11px; }.severity.major { background: #fae7e5; color: #a23b34; }.state { font-size: 11px; }.state.link { color: #a23b34; font-weight: 700; }.state.hold { color: #a4762a; }
    .detail { padding: 16px; }.detail-head { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #e1e6e5; padding-bottom: 12px; }.detail-head span { color: #74827f; font-size: 10px; }.detail-head h2 { margin: 4px 0; font-size: 18px; }.detail-head p { margin: 0; color: #65736f; font-size: 12px; }.detail h3 { font-size: 13px; margin: 16px 0 8px; }
    .review-form, .opinion-form, .plan-form { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.review-form .wide, .opinion-form .wide, .plan-form .wide { grid-column: 1 / -1; }.review-form button, .plan-form button { align-self: center; }
    .records { border-left: 3px solid #315d6e; background: #f5f8f7; padding: 9px; margin-top: 7px; display: grid; gap: 4px; }.records p { margin: 0; font-size: 12px; }.records span { color: #72807d; font-size: 10px; }
    .opinions article { border-bottom: 1px solid #e2e7e6; padding: 9px 0; display: grid; grid-template-columns: 1fr auto; gap: 4px; }.opinions p { grid-column: 1 / -1; margin: 0; font-size: 12px; }.opinions span { color: #8a6720; font-size: 10px; }
    .plan-invalid { background: #fbeee0; border-left: 3px solid #cf8a3c; color: #8a5a1f; font-size: 12px; padding: 9px 11px; margin-bottom: 8px; }
    .approval-band { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; background: #f6f0df; border-left: 3px solid #c99f3d; padding: 10px; margin-top: 12px; }.approval-info b, .approval-info span, .approval-info small { display: block; }.approval-info span { color: #746c55; font-size: 10px; margin-top: 3px; }.approval-info small { color: #9a8a63; font-size: 10px; margin-top: 2px; }.approval-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .drafts, .plan-history, .tasks, .emergency { padding: 12px 14px; }.drafts h3, .plan-history h3, .tasks h3, .emergency h3 { margin: 0 0 8px; font-size: 13px; }.drafts article, .invalid-plan, .tasks article, .link-reviews article { border-bottom: 1px solid #eef2f1; padding: 8px 0; display: grid; gap: 4px; }.drafts p, .invalid-plan p, .tasks p { margin: 0; font-size: 12px; }.empty { color: #98a4a0; font-size: 11px; }
    .draft-head { display: flex; align-items: center; gap: 8px; }.draft-head small { color: #98a4a0; font-size: 10px; margin-left: auto; }.tag { font-size: 10px; padding: 2px 7px; border-radius: 3px; background: #e7f3ee; color: #2e765a; }.tag.warn { background: #fbeee0; color: #a4631c; }.tag.void { background: #ececec; color: #8a8a8a; }.tag.froz { background: #f3e2e0; color: #a23b34; }.tag.fin { background: #e7f3ee; color: #2e765a; }.tag.link { background: #fae7e5; color: #a23b34; }
    .basis-diff { display: flex; gap: 16px; font-size: 10px; color: #7a8784; }.basis-diff .changed { color: #a23b34; font-weight: 700; }
    .tasks article.frozen { background: #fbf3f2; border-left: 3px solid #c98a84; padding-left: 9px; }.tasks article.done { opacity: .7; }
    .severity-track article { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 4px 0; }.severity-track b { color: #667572; font-weight: 400; font-size: 10px; }
    .emergency .link-basis { background: #f6eceb; border-left: 3px solid #b6574e; padding: 10px; display: grid; gap: 3px; }.emergency .link-basis p { margin: 0; font-size: 11px; }.emergency .link-basis small { color: #8a625d; font-size: 10px; }
    .link-reviews { margin-top: 10px; }.link-reviews h4 { font-size: 11px; margin: 0 0 6px; color: #a23b34; }.review-actions { display: flex; gap: 6px; }
  `]
})
export class AnomalyPageComponent {
  private readonly store = inject(Store)
  readonly filtered$ = this.store.select(selectFilteredAnomalies)
  readonly selected$ = this.store.select(selectSelectedAnomaly)
  readonly all$ = this.store.select(selectAnomalies)
  readonly snapshotVersion$ = this.store.select(selectSnapshotVersion)
  readonly pending$ = this.store.select(selectPendingWrite)

  readonly columns = ['title', 'severity', 'status', 'basis', 'version', 'open']
  readonly statuses: Anomaly['status'][] = ['待现场复核', '原因调查中', '待负责人审批', '处置中', '应急联动', '已关闭']
  readonly disciplines: ExpertOpinion['discipline'][] = ['坝体', '水文', '岩土', '应急']
  readonly actions: DispositionPlan['action'][] = ['加密监测', '降低库水位', '疏通排水', '应急撤离准备', '工程加固']
  localKeyword = ''
  localStatus: Anomaly['status'] | '全部' = '全部'
  fieldForm = { observed: '', evidence: '', reassessment: '' }
  opinionForm = { discipline: '坝体' as ExpertOpinion['discipline'], content: '' }
  planForm = { action: '加密监测' as DispositionPlan['action'], owner: '坝体安全组', conditions: '', deadline: '2026-10-03T18:00', emergencyLinked: false }

  readonly tasksForSelected$ = combineLatest([this.selected$, this.store.select(selectTasks)]).pipe(
    map(([selected, tasks]) => (selected ? tasks.filter((task) => task.anomalyId === selected.id) : []))
  )
  readonly linkForSelected$ = combineLatest([this.selected$, this.store.select(selectEmergencyLinks)]).pipe(
    map(([selected, links]) => selected ? links.find((link) => link.anomalyId === selected.id && link.status !== '已解除') : undefined)
  )
  readonly draftsForSelected$ = combineLatest([this.selected$, this.store.select(selectDrafts)]).pipe(
    map(([selected, drafts]) => selected ? drafts.filter((draft) => draft.anomalyId === selected.id) : [])
  )
  readonly approvalForSelected$ = combineLatest([this.selected$, this.store.select(selectApprovals)]).pipe(
    map(([selected, approvals]) => selected ? approvals.find((approval) => approval.planId === selected.plan.id) : undefined)
  )
  readonly linkActive$ = this.linkForSelected$
  get busy(): boolean { let value = false; this.pending$.subscribe((pending) => { value = pending !== null }).unsubscribe(); return value }
  get linkActive(): boolean { let value = false; this.linkForSelected$.subscribe((link) => { value = !!link }).unsubscribe(); return value }

  count(statusList: Anomaly['status'][]): number { let value = 0; this.all$.subscribe((items) => { value = items.filter((item) => statusList.includes(item.status)).length }).unsubscribe(); return value }
  updateKeyword(value: string): void { this.store.dispatch(TailingsActions.updateKeyword({ keyword: value })) }
  updateStatus(value: Anomaly['status'] | '全部'): void { this.store.dispatch(TailingsActions.updateStatus({ status: value })) }
  select(id: string): void { this.store.dispatch(TailingsActions.selectAnomaly({ anomalyId: id })) }

  submitReview(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.submitFieldReview({ anomalyId: anomaly.id, inspector: '宋立', ...this.fieldForm }))
  }
  addOpinion(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.addExpertOpinion({ anomalyId: anomaly.id, specialist: '当前用户', ...this.opinionForm, conclusion: '补充证据' }))
  }
  savePlan(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.saveDispositionPlan({ anomalyId: anomaly.id, ...this.planForm }))
  }
  /** 以“打开签批时看到的方案版本+快照版本”为依据提交，供并发/依据变化判定 */
  approve(anomaly: Anomaly, approver: string): void {
    this.store.dispatch(TailingsActions.approvePlan({
      anomalyId: anomaly.id,
      approver,
      note: '同意执行，严格执行关闭条件。',
      expectedPlanVersion: anomaly.plan.version,
      expectedSnapshotVersion: this.snapshotNow()
    }))
  }
  private snapshotNow(): number { let value = 0; this.snapshotVersion$.subscribe((v) => { value = v }).unsubscribe(); return value }
  emergency(anomaly: Anomaly): void { this.store.dispatch(TailingsActions.createEmergencyLink({ anomalyId: anomaly.id, note: '重大异常联动应急值班，通知下游巡查。' })) }
  resolve(linkId: string, reviewId: string, conclusion: EmergencyConclusion): void {
    this.store.dispatch(TailingsActions.resolveEmergencyReview({ linkId, reviewId, conclusion, note: '经现场与水情复核，按新调度令研判。' }))
  }
  finishTask(taskId: string): void { this.store.dispatch(TailingsActions.advanceTask({ taskId, result: '已按当前方案完成并记录。' })) }
  close(anomaly: Anomaly): void { this.store.dispatch(TailingsActions.closeAnomaly({ anomalyId: anomaly.id, note: '复测数据稳定，关闭条件已满足。' })) }

  canApprove(anomaly: Anomaly): boolean {
    return anomaly.plan.status === '待审批' && !this.busy && (anomaly.severity !== '重大' || anomaly.plan.emergencyLinked)
  }
  canClose(anomaly: Anomaly): boolean {
    if (!anomaly.plan.approvedBy || !anomaly.fieldReviews.length || this.busy) return false
    let blocked = true
    this.tasksForSelected$.subscribe((tasks) => { blocked = tasks.some((task) => task.status !== '已完成') }).unsubscribe()
    return !blocked
  }
}
