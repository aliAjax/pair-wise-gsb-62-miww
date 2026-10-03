import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatTableModule } from '@angular/material/table'
import { MatTooltipModule } from '@angular/material/tooltip'
import { Store } from '@ngrx/store'
import type { Anomaly, DispositionPlan, ExpertOpinion, FieldReview, TailingsDataset } from '../domain'
import { TailingsActions } from '../store/tailings.actions'
import { selectActiveOrder, selectAnomalies, selectBasisView, selectDataset, selectFilteredAnomalies, selectSelectedAnomaly, selectRevision } from '../store/tailings.selectors'

@Component({
  selector: 'app-anomaly-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatTooltipModule],
  template: `
    <section class="page" *ngIf="basisView$ | async">
      <div class="metrics">
        <article><span>方案待重算</span><strong>{{ count('方案待重算') }}</strong><small>调度令换版后失效</small></article>
        <article><span>已暂停任务</span><strong>{{ pausedTaskCount }}</strong><small>未完成项先停住</small></article>
        <article><span>应急联动中</span><strong>{{ count('应急联动') }}</strong><small>保留原依据+复核</small></article>
        <article><span>签批草稿</span><strong>{{ draftCount }}</strong><small>后到者仅留草稿</small></article>
      </div>
      <div class="toolbar">
        <mat-form-field appearance="outline"><mat-label>搜索异常</mat-label><input matInput [(ngModel)]="localKeyword" (ngModelChange)="updateKeyword($event)" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>状态</mat-label><mat-select [(ngModel)]="localStatus" (ngModelChange)="updateStatus($event)"><mat-option value="全部">全部</mat-option><mat-option *ngFor="let item of statuses" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field>
        <span class="rev">全库版本 R{{ revision$ | async }}</span>
      </div>
      <div class="split">
        <table mat-table [dataSource]="filtered$ | async" class="panel">
          <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>异常</th><td mat-cell *matCellDef="let row"><b>{{ row.title }}</b><small class="sub">{{ row.id }} · {{ row.pointId }}</small></td></ng-container>
          <ng-container matColumnDef="severity"><th mat-header-cell *matHeaderCellDef>级别</th><td mat-cell *matCellDef="let row"><span class="severity" [class.major]="row.severity === '重大'">{{ row.severity }}</span><small class="sub">{{ row.responseLevel }}<em *ngIf="row.levelPendingReview">（待复核）</em></small></td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>状态</th><td mat-cell *matCellDef="let row"><span [class.stale]="row.plan.status === '失效待重算'">{{ row.status }}</span></td></ng-container>
          <ng-container matColumnDef="basis"><th mat-header-cell *matHeaderCellDef>依据</th><td mat-cell *matCellDef="let row"><small class="sub">R{{ (dataset$ | async)?.revision }} · 方案V{{ row.plan.version }} · 令V{{ row.plan.basisOrderVersion }}</small></td></ng-container>
          <ng-container matColumnDef="open"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let row"><button mat-button (click)="select(row.id)">审阅</button></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns" [class.selected]="row.id === (selected$ | async)?.id" [class.row-stale]="row.plan.status === '失效待重算'"></tr>
        </table>

        <div class="panel detail" *ngIf="selected$ | async as selected">
          <div class="detail-head">
            <div>
              <span class="basis-tag">{{ basisOf(selected) }}</span>
              <h2>{{ selected.title }}</h2>
              <p>{{ selected.observedValue }}</p>
            </div>
            <div class="head-right">
              <span class="severity" [class.major]="selected.severity === '重大'">{{ selected.severity }}</span>
              <small>{{ selected.responseLevel }}<em *ngIf="selected.levelPendingReview"> · 沿用旧令待复核</em></small>
            </div>
          </div>

          <div class="stale-banner" *ngIf="selected.plan.status === '失效待重算'">
            <b>调度令已换版：方案V{{ selected.plan.version }}（依据调度令V{{ selected.plan.basisOrderVersion }}）失效，须按现行调度令V{{ (activeOrder$ | async)?.version }}重算并重新签批。</b>
            <span>未完成任务已先停住；已启动的应急联动仍保留其原始依据。</span>
          </div>

          <section class="block">
            <h3>处置任务（未完成项）</h3>
            <table mat-table [dataSource]="selected.plan.tasks" class="tasks">
              <ng-container matColumnDef="content"><th mat-header-cell *matHeaderCellDef>任务</th><td mat-cell *matCellDef="let task">{{ task.content }}<small>{{ task.owner }}</small></td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>状态</th><td mat-cell *matCellDef="let task"><span class="task" [class.paused]="task.status === '已暂停'">{{ task.status }}</span><small *ngIf="task.status === '已暂停'">{{ task.pauseReason }}</small></td></ng-container>
              <ng-container matColumnDef="resume"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let task"><button mat-button color="primary" [disabled]="selected.plan.status !== '已批准'" (click)="resume(selected, task.id)">恢复执行</button></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="taskColumns"></tr><tr mat-row *matRowDef="let task; columns: taskColumns"></tr>
            </table>
          </section>

          <section class="block" *ngIf="selected.emergency as link">
            <h3>应急联动</h3>
            <div class="link-card" [class.kept]="link.active">
              <div class="link-grid">
                <span>启动时间</span><b>{{ link.launchedAt.replace('T', ' ').slice(5, 16) }}</b>
                <span>启动依据（保留）</span><b class="basis">调度令V{{ link.basisOrderVersion }} · {{ link.basisLevel }}</b>
                <span>状态</span><b>{{ link.active ? '联动进行中' : '已解除' }}</b>
                <span>启动说明</span><b>{{ link.note }}</b>
              </div>
              <p class="kept-note" *ngIf="selected.levelPendingReview && link.active">联动未因新令改写依据；须由应急专业按现行调度令V{{ (activeOrder$ | async)?.version }}追加复核后，现场级别才更新。</p>
              <div class="review-add" *ngIf="selected.levelPendingReview && link.active">
                <mat-form-field appearance="outline" class="wide"><mat-label>追加复核结论</mat-label><textarea matInput rows="2" [(ngModel)]="reviewForm.conclusion"></textarea></mat-form-field>
                <label class="continue"><input type="checkbox" [(ngModel)]="reviewForm.continued" /> 同意按新级别（{{ (activeOrder$ | async)?.level }}）继续联动</label>
                <button mat-flat-button color="primary" (click)="submitEmergencyReview(selected)">追加联动复核</button>
              </div>
              <div class="link-reviews" *ngFor="let item of link.reviews">
                <b>{{ item.reviewer }} · {{ item.reviewedAt.replace('T', ' ').slice(5, 16) }}</b>
                <span>原依据V{{ item.originalOrderVersion }} → 复核依据V{{ item.reviewedOrderVersion }} · {{ item.continued ? '继续联动' : '维持原级别' }}</span>
                <p>{{ item.conclusion }}</p>
              </div>
            </div>
          </section>

          <section class="block">
            <h3>处置方案与重算</h3>
            <div class="plan-meta">
              <span>当前 V{{ selected.plan.version }}（依据调度令V{{ selected.plan.basisOrderVersion }}）</span>
              <span class="plan-status" [class.stale]="selected.plan.status === '失效待重算'">{{ selected.plan.status }}</span>
              <span *ngIf="selected.plan.approvedBy">签批：{{ selected.plan.approvedBy }}</span>
            </div>
            <div class="plan-form">
              <mat-form-field appearance="outline"><mat-label>措施</mat-label><mat-select [(ngModel)]="planForm.action"><mat-option *ngFor="let item of actions" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>责任方</mat-label><input matInput [(ngModel)]="planForm.owner" /></mat-form-field>
              <mat-form-field appearance="outline" class="wide"><mat-label>关闭条件</mat-label><textarea matInput rows="2" [(ngModel)]="planForm.conditions"></textarea></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>截止</mat-label><input matInput type="datetime-local" [(ngModel)]="planForm.deadline" /></mat-form-field>
              <mat-form-field appearance="outline" class="wide"><mat-label>新增任务（每行：任务内容 | 责任方）</mat-label><textarea matInput rows="2" [(ngModel)]="taskText" placeholder="按870.5m重新设定泄洪流量 | 库区调度班"></textarea></mat-form-field>
              <div class="plan-actions">
                <button mat-flat-button color="primary" *ngIf="selected.plan.status === '失效待重算'" (click)="recompute(selected)">按现行调度令重算提交</button>
                <button mat-button *ngIf="selected.plan.status !== '失效待重算'" (click)="savePlan(selected)">提交方案</button>
              </div>
            </div>
            <div class="history" *ngIf="selected.plan.history.length">
              <b>历史版本（仅追溯，不参与当前处置）</b>
              <article *ngFor="let old of selected.plan.history">
                <span>V{{ old.version }} · 调度令V{{ old.basisOrderVersion }} · {{ old.status }}</span>
                <p>{{ old.action }} · {{ old.owner }} · {{ old.conditions }}</p>
                <small *ngIf="old.approvedBy">原签批：{{ old.approvedBy }}</small>
              </article>
            </div>
          </section>

          <section class="block">
            <h3>负责人会签（同一异常只通过一份）</h3>
            <div class="approve-row">
              <mat-form-field appearance="outline"><mat-label>签批人</mat-label><input matInput [(ngModel)]="approveForm.approver" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>结论</mat-label><mat-select [(ngModel)]="approveForm.decision"><mat-option value="同意">同意</mat-option><mat-option value="不同意">不同意</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline" class="wide"><mat-label>签批意见</mat-label><input matInput [(ngModel)]="approveForm.note" /></mat-form-field>
              <button mat-flat-button color="primary" [disabled]="selected.plan.status !== '待审批'" (click)="approve(selected)">提交签批</button>
              <button mat-button (click)="simulateSecondApprover(selected)" matTooltip="演示：同一在途版本下两笔签批先后到达，后到者落草稿">模拟并发会签</button>
            </div>
            <p class="hint">提交时锁定依据（{{ basisOf(selected) }}）。若依据已被前一签批改变，本份不通过，保留为草稿并展示依据变化。</p>
            <div class="drafts" *ngFor="let draft of selected.approvalDrafts">
              <b>{{ draft.approver }} 的签批草稿 · {{ draft.decision }}</b>
              <span>{{ draft.note }}</span>
              <p class="change">{{ draft.basisChangeNote }}</p>
            </div>
          </section>

          <section class="block">
            <h3>现场复核与专业意见</h3>
            <div class="review-form">
              <mat-form-field appearance="outline" class="wide"><mat-label>现场观察</mat-label><textarea matInput rows="2" [(ngModel)]="fieldForm.observed"></textarea></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>证据清单</mat-label><input matInput [(ngModel)]="fieldForm.evidence" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>重新评估</mat-label><input matInput [(ngModel)]="fieldForm.reassessment" /></mat-form-field>
              <button mat-flat-button (click)="submitReview(selected)">提交复核版本</button>
            </div>
            <div class="records" *ngFor="let review of selected.fieldReviews">
              <b>{{ review.inspector }} · V{{ review.version }} · {{ review.levelAtReview }}<em *ngIf="review.afterDispatchChange">（换版后追加）</em></b>
              <p>{{ review.observed }}</p><span>{{ review.reassessment }} · {{ review.evidence }}</span>
            </div>
            <div class="opinion-form">
              <mat-form-field appearance="outline"><mat-label>专业</mat-label><mat-select [(ngModel)]="opinionForm.discipline"><mat-option *ngFor="let item of disciplines" [value]="item">{{ item }}</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline" class="wide"><mat-label>意见</mat-label><input matInput [(ngModel)]="opinionForm.content" /></mat-form-field>
              <button mat-button (click)="addOpinion(selected)">补充意见</button>
            </div>
            <div class="opinions"><article *ngFor="let opinion of selected.opinions"><b>{{ opinion.discipline }}专家 {{ opinion.specialist }}</b><span>{{ opinion.conclusion }}</span><p>{{ opinion.content }}</p></article></div>
          </section>

          <div class="footer-band">
            <button mat-flat-button color="primary" [disabled]="!canEmergency(selected)" (click)="emergency(selected)" matTooltip="方案按现行调度令签批后，方可启动联动">启动应急联动</button>
            <button mat-button color="warn" [disabled]="!canClose(selected)" (click)="close(selected)">关闭异常</button>
            <small>启动联动与方案必须同版；关闭前不得存在暂停任务或未复核的级别变化。</small>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 22px 28px 45px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); background: white; border: 1px solid #d9e1df; margin-bottom: 12px; }
    .metrics article { padding: 14px 18px; border-right: 1px solid #e2e7e6; } .metrics article:last-child { border: 0; }
    .metrics span, .metrics strong, .metrics small { display: block; } .metrics span { color: #72807d; font-size: 12px; } .metrics strong { font-size: 24px; color: #245060; margin: 5px 0; } .metrics small { color: #98a4a0; font-size: 10px; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; } .rev { margin-left: auto; color: #315d6e; font-weight: 700; font-size: 12px; }
    .split { display: grid; grid-template-columns: minmax(560px, 1fr) 580px; gap: 14px; align-items: start; }
    .panel { background: white; border: 1px solid #d9e1df; } table { width: 100%; } .selected { background: #eef5f4; } .row-stale { background: #fdf3f2; }
    .sub { display: block; color: #7c8986; font-size: 10px; margin-top: 3px; } .sub em { color: #a23b34; font-style: normal; }
    .severity { padding: 3px 7px; border-radius: 3px; background: #f7edd6; color: #8e681d; font-size: 11px; } .severity.major { background: #fae7e5; color: #a23b34; }
    .stale, .stale-banner b { color: #a23b34; }
    .detail { padding: 16px; max-height: calc(100vh - 170px); overflow-y: auto; }
    .detail-head { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #e1e6e5; padding-bottom: 12px; gap: 10px; }
    .detail-head h2 { margin: 4px 0; font-size: 17px; } .detail-head p { margin: 0; color: #65736f; font-size: 12px; }
    .basis-tag { background: #eef3f2; color: #315d6e; font-size: 10px; padding: 2px 7px; border-radius: 3px; font-weight: 700; }
    .head-right { display: grid; justify-items: end; gap: 4px; } .head-right small { color: #72807d; font-size: 10px; } .head-right em { color: #a23b34; font-style: normal; }
    .stale-banner { background: #fbeceb; border-left: 3px solid #c2564d; padding: 10px 12px; margin: 12px 0; display: grid; gap: 3px; } .stale-banner span { font-size: 11px; color: #8a5752; }
    .block { margin-top: 14px; } .block h3 { font-size: 13px; margin: 0 0 8px; }
    .tasks td small { display: block; color: #98a4a0; font-size: 10px; } .task { font-size: 11px; color: #2e765a; } .task.paused { color: #a23b34; } td small { font-size: 10px; color: #a23b34; }
    .link-card { border: 1px solid #d9e1df; padding: 10px 12px; background: #fafcfb; } .link-card.kept { border-left: 3px solid #2e765a; }
    .link-grid { display: grid; grid-template-columns: 110px 1fr; gap: 4px 10px; font-size: 11px; } .link-grid span { color: #7a8784; } .link-grid b { font-weight: 600; } .link-grid .basis { color: #2e765a; }
    .kept-note { font-size: 11px; color: #8e681d; margin: 8px 0; }
    .review-add { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; margin-top: 6px; } .review-add .wide { grid-column: 1 / -1; } .continue { font-size: 11px; color: #44524f; }
    .link-reviews { border-left: 3px solid #2e765a; background: #f2f8f5; padding: 8px; margin-top: 8px; } .link-reviews b, .link-reviews span, .link-reviews p { display: block; font-size: 11px; margin: 2px 0; } .link-reviews span { color: #2e765a; }
    .plan-meta { display: flex; gap: 12px; font-size: 11px; color: #5a6865; margin-bottom: 6px; } .plan-status { font-weight: 700; color: #2e765a; } .plan-status.stale { color: #a23b34; }
    .plan-form { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .plan-form .wide { grid-column: 1 / -1; } .plan-actions { grid-column: 1 / -1; }
    .history { margin-top: 10px; border-top: 1px dashed #d9e1df; padding-top: 8px; } .history article { background: #f5f7f6; padding: 7px 9px; margin-top: 6px; } .history span { font-size: 10px; color: #8b9794; } .history p { margin: 3px 0; font-size: 11px; } .history small { font-size: 10px; color: #8b9794; }
    .approve-row { display: grid; grid-template-columns: 1fr 120px; gap: 6px; align-items: center; } .approve-row .wide { grid-column: 1 / -1; } .hint { font-size: 10px; color: #98a4a0; margin: 6px 0; }
    .drafts { background: #fdf6e7; border-left: 3px solid #c99f3d; padding: 8px 10px; margin-top: 8px; display: grid; gap: 2px; } .drafts b { font-size: 11px; } .drafts span { font-size: 10px; color: #746c55; } .drafts .change { font-size: 10px; color: #a23b34; margin: 2px 0 0; }
    .review-form, .opinion-form { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .review-form .wide, .opinion-form .wide { grid-column: 1 / -1; }
    .records { border-left: 3px solid #315d6e; background: #f5f8f7; padding: 8px; margin-top: 6px; } .records b, .records p, .records span { display: block; font-size: 11px; margin: 2px 0; } .records em { color: #8e681d; font-style: normal; }
    .opinions article { border-bottom: 1px solid #e2e7e6; padding: 7px 0; display: grid; grid-template-columns: 1fr auto; gap: 3px; } .opinions p { grid-column: 1 / -1; margin: 0; font-size: 11px; } .opinions span { color: #8a6720; font-size: 10px; }
    .footer-band { display: flex; gap: 8px; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e7e6; } .footer-band small { color: #98a4a0; font-size: 10px; }
  `]
})
export class AnomalyPageComponent {
  private readonly store = inject(Store)
  readonly dataset$ = this.store.select(selectDataset)
  readonly revision$ = this.store.select(selectRevision)
  readonly filtered$ = this.store.select(selectFilteredAnomalies)
  readonly selected$ = this.store.select(selectSelectedAnomaly)
  readonly all$ = this.store.select(selectAnomalies)
  readonly activeOrder$ = this.store.select(selectActiveOrder)
  readonly basisView$ = this.store.select(selectBasisView)
  readonly columns = ['title', 'severity', 'status', 'basis', 'open']
  readonly taskColumns = ['content', 'status', 'resume']
  readonly statuses: Anomaly['status'][] = ['待现场复核', '原因调查中', '待负责人审批', '处置执行中', '方案待重算', '已暂停', '应急联动', '已关闭']
  readonly disciplines: ExpertOpinion['discipline'][] = ['坝体', '水文', '岩土', '应急']
  readonly actions: DispositionPlan['action'][] = ['加密监测', '降低库水位', '疏通排水', '应急撤离准备', '工程加固']
  localKeyword = ''
  localStatus: Anomaly['status'] | '全部' = '全部'
  fieldForm = { observed: '', evidence: '', reassessment: '' }
  opinionForm = { discipline: '坝体' as ExpertOpinion['discipline'], content: '' }
  planForm = { action: '降低库水位' as DispositionPlan['action'], owner: '库区调度班', conditions: '', deadline: '2026-10-03T18:00' }
  taskText = ''
  reviewForm = { conclusion: '', continued: true }
  approveForm = { approver: '负责人 何清', note: '同意按新调度令执行，严格落实关闭条件。', decision: '同意' as '同意' | '不同意' }
  pausedTaskCount = 0
  draftCount = 0
  private snapshot: TailingsDataset | null = null

  constructor() {
    this.dataset$.subscribe((dataset) => {
      this.snapshot = dataset
      this.pausedTaskCount = dataset.anomalies.reduce((sum, anomaly) => sum + anomaly.plan.tasks.filter((task) => task.status === '已暂停').length, 0)
      this.draftCount = dataset.anomalies.reduce((sum, anomaly) => sum + anomaly.approvalDrafts.length, 0)
    })
  }

  basisOf(anomaly: Anomaly): string {
    const revision = this.snapshot?.revision ?? 0
    return `R${revision} · 异常V${anomaly.version} · 方案V${anomaly.plan.version} · 调度令V${anomaly.plan.basisOrderVersion}`
  }

  count(status: Anomaly['status']): number {
    return this.snapshot?.anomalies.filter((item) => item.status === status).length ?? 0
  }

  private parseTasks(): { content: string; owner: string }[] {
    return this.taskText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [content, owner] = line.split('|').map((part) => part.trim())
      return { content, owner: owner || this.planForm.owner }
    })
  }

  updateKeyword(value: string): void { this.store.dispatch(TailingsActions.updateKeyword({ keyword: value })) }
  updateStatus(value: Anomaly['status'] | '全部'): void { this.store.dispatch(TailingsActions.updateStatus({ status: value })) }
  select(id: string): void { this.store.dispatch(TailingsActions.selectAnomaly({ anomalyId: id })) }

  submitReview(anomaly: Anomaly): void {
    const review: FieldReview = { id: `FR-${Date.now()}`, inspector: '宋立', arrivedAt: new Date().toISOString(), ...this.fieldForm, afterDispatchChange: false, levelAtReview: anomaly.responseLevel, version: 0 }
    this.store.dispatch(TailingsActions.submitFieldReview({ anomalyId: anomaly.id, review }))
    this.fieldForm = { observed: '', evidence: '', reassessment: '' }
  }

  addOpinion(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.submitExpertOpinion({ anomalyId: anomaly.id, opinion: { id: `OP-${Date.now()}`, specialist: '当前用户', ...this.opinionForm, conclusion: '补充证据', createdAt: new Date().toISOString() } }))
    this.opinionForm.content = ''
  }

  savePlan(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.savePlan({ anomalyId: anomaly.id, plan: { ...this.planForm }, tasks: this.parseTasks() }))
  }

  recompute(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.recomputePlan({ anomalyId: anomaly.id, plan: { ...this.planForm }, tasks: this.parseTasks() }))
  }

  approve(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.approvePlan({ anomalyId: anomaly.id, ...this.approveForm }))
  }

  /** 演示并发：值班负责人 何清 与 技术负责人 高原 基于同一在途版本同时提交，串行管线只通过一份，后到者落草稿 */
  simulateSecondApprover(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.approvePlan({ anomalyId: anomaly.id, approver: this.approveForm.approver, note: this.approveForm.note, decision: this.approveForm.decision }))
    this.store.dispatch(TailingsActions.approvePlan({ anomalyId: anomaly.id, approver: '技术负责人 高原', note: '同步会签：同意按当前依据执行。', decision: '同意' }))
  }

  emergency(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.createEmergencyLink({ anomalyId: anomaly.id, note: `按${anomaly.responseLevel}启动应急联动，通知下游巡查、撤离准备与应急队伍集结。` }))
  }

  submitEmergencyReview(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.submitEmergencyReview({ anomalyId: anomaly.id, reviewer: '应急专家 郑澜', conclusion: this.reviewForm.conclusion, continued: this.reviewForm.continued }))
    this.reviewForm = { conclusion: '', continued: true }
  }

  resume(anomaly: Anomaly, taskId: string): void {
    this.store.dispatch(TailingsActions.resumeTasks({ anomalyId: anomaly.id, taskIds: [taskId] }))
  }

  close(anomaly: Anomaly): void {
    this.store.dispatch(TailingsActions.closeAnomaly({ anomalyId: anomaly.id, note: '复测数据稳定，关闭条件已满足，联动已解除。' }))
  }

  canEmergency(anomaly: Anomaly): boolean {
    return anomaly.plan.status === '已批准' && !anomaly.emergency?.active && anomaly.plan.basisOrderVersion === (this.activeVersion())
  }

  canClose(anomaly: Anomaly): boolean {
    return !!anomaly.plan.approvedBy && anomaly.plan.status === '已批准' && !anomaly.levelPendingReview && !anomaly.plan.tasks.some((task) => task.status === '已暂停')
  }

  private activeVersion(): number {
    return this.snapshot?.dispatchOrders.find((order) => order.status === '已生效')?.version ?? 0
  }
}
