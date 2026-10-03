import { Injectable, inject } from '@angular/core'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { Store } from '@ngrx/store'
import { from, map, of, switchMap, take, concatMap, withLatestFrom } from 'rxjs'
import type { PendingWrite, TailingsDataset } from '../domain'
import { PersistenceService } from '../services/persistence.service'
import { commitWrite } from './commit-engine'
import { TailingsActions } from './tailings.actions'
import { selectDataset, selectPendingWrites } from './tailings.selectors'

let writeSeed = 0
const newWrite = (type: PendingWrite['type'], entityId: string, label: string, payload: Record<string, unknown>, revision: number): PendingWrite => ({
  id: `PW-${Date.now()}-${writeSeed++}`,
  type,
  entityId,
  label,
  basisRevision: revision,
  payload,
  status: '提交中',
  attempts: 1,
  lastError: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

@Injectable()
export class TailingsEffects {
  private readonly actions$ = inject(Actions)
  private readonly store = inject(Store)
  private readonly persistence = inject(PersistenceService)

  loadDataset$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.loadDataset),
    switchMap(() => {
      const snapshot = this.persistence.loadSnapshot()
      const dataset = snapshot ?? this.persistence.seedSnapshot()
      const pendingWrites = this.persistence.loadPending()
        .map((raw) => { try { return JSON.parse(raw) as PendingWrite } catch { return null } })
        .filter((item): item is PendingWrite => !!item)
        .map((item) => ({ ...item, status: '失败待恢复' as const }))
      return of(TailingsActions.loadDatasetSuccess({ dataset, pendingWrites }))
    })
  ))

  resetDemo$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.resetDemo),
    switchMap(() => of(TailingsActions.loadDatasetSuccess({ dataset: this.persistence.reset(), pendingWrites: [] })))
  ))

  armFailure$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.armFailure),
    map(() => {
      this.persistence.armFailure()
      return TailingsActions.writeRejected({ error: '已模拟下一次写入失败：写入将进入待恢复队列，当前数据不会改动。' })
    })
  ))

  /** 所有用户写入统一构造写入项，并在此时锁定签批依据版本 */
  private readonly requestWrite$ = createEffect(() => this.actions$.pipe(
    ofType(
      TailingsActions.submitFieldReview,
      TailingsActions.submitExpertOpinion,
      TailingsActions.savePlan,
      TailingsActions.recomputePlan,
      TailingsActions.approvePlan,
      TailingsActions.createEmergencyLink,
      TailingsActions.submitEmergencyReview,
      TailingsActions.resumeTasks,
      TailingsActions.closeAnomaly,
      TailingsActions.createDispatchOrder,
      TailingsActions.activateDispatchOrder
    ),
    withLatestFrom(this.store.select(selectDataset)),
    map(([action, dataset]) => {
      const revision = dataset.revision
      const anomaly = (id: string) => dataset.anomalies.find((item) => item.id === id)
      let write: PendingWrite
      switch (action.type) {
        case '[Tailings] Submit Field Review':
          write = newWrite('fieldReview', action.anomalyId, '提交现场复核', { anomalyId: action.anomalyId, review: action.review }, revision); break
        case '[Tailings] Submit Expert Opinion':
          write = newWrite('expertOpinion', action.anomalyId, '补充专业意见', { anomalyId: action.anomalyId, opinion: action.opinion }, revision); break
        case '[Tailings] Save Plan':
          write = newWrite('plan', action.anomalyId, '提交处置方案', { anomalyId: action.anomalyId, plan: action.plan, tasks: action.tasks }, revision); break
        case '[Tailings] Recompute Plan':
          write = newWrite('planRecompute', action.anomalyId, '方案失效重算', { anomalyId: action.anomalyId, plan: action.plan, tasks: action.tasks }, revision); break
        case '[Tailings] Approve Plan': {
          const target = anomaly(action.anomalyId)
          write = newWrite('approve', action.anomalyId, `负责人签批（${action.approver}）`, {
            anomalyId: action.anomalyId, approver: action.approver, note: action.note, decision: action.decision,
            basisAnomalyVersion: target?.version ?? 0, basisPlanVersion: target?.plan.version ?? 0
          }, revision)
          break
        }
        case '[Tailings] Create Emergency Link':
          write = newWrite('emergencyLink', action.anomalyId, '启动应急联动', { anomalyId: action.anomalyId, note: action.note }, revision); break
        case '[Tailings] Submit Emergency Review':
          write = newWrite('emergencyReview', action.anomalyId, '联动追加复核', { anomalyId: action.anomalyId, reviewer: action.reviewer, conclusion: action.conclusion, continued: action.continued }, revision); break
        case '[Tailings] Resume Tasks':
          write = newWrite('resumeTasks', action.anomalyId, '恢复暂停任务', { anomalyId: action.anomalyId, taskIds: action.taskIds }, revision); break
        case '[Tailings] Close Anomaly':
          write = newWrite('close', action.anomalyId, '关闭异常', { anomalyId: action.anomalyId, note: action.note }, revision); break
        case '[Tailings] Create Dispatch Order':
          write = newWrite('dispatchCreate', action.draft.title, '调度令拟稿', { ...action.draft } as Record<string, unknown>, revision); break
        case '[Tailings] Activate Dispatch Order':
          write = newWrite('dispatchActivate', action.orderId, '调度令生效与级联重算', { orderId: action.orderId, note: action.note }, revision); break
        default:
          return TailingsActions.writeRejected({ error: '未识别的写入类型' })
      }
      return TailingsActions.writeStarted({ write })
    })
  ))

  /** 串行提交：同一时刻只有一笔写入在通道内，保证 revision 单调、无覆盖 */
  private readonly executeWrite$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.writeStarted),
    concatMap(({ write }) => this.store.select(selectDataset).pipe(
      take(1),
      switchMap((dataset) => {
        const result = commitWrite(dataset, write)
        if (result.outcome.kind === 'error') {
          return of(TailingsActions.writeRejected({ error: result.outcome.message }))
        }
        return this.persistence.writeSnapshot(result.dataset).pipe(
          map((ok) => ok
            ? TailingsActions.writeSucceeded({ write, dataset: result.dataset, message: result.outcome.message })
            : TailingsActions.writeFailed({ write, error: '写入通道不可用（模拟网络/服务端失败）' }))
        )
      })
    ))
  ))

  private readonly syncPending$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.writeSucceeded, TailingsActions.writeFailed, TailingsActions.discardPendingWrite),
    withLatestFrom(this.store.select(selectPendingWrites)),
    map(([, pending]) => {
      this.persistence.savePending(pending.map((item) => JSON.stringify(item)))
      return { type: 'noop' }
    })
  ), { dispatch: false })

  /** 恢复：按入队顺序（旧→新）逐笔重放；任一笔失败则停止并保留剩余写入 */
  recoverWrites$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.recoverWrites),
    withLatestFrom(this.store.select(selectPendingWrites)),
    switchMap(([, queued]) => from(this.replay([...queued].reverse())).pipe(
      switchMap(({ applied, remaining, finalDataset }) => {
        this.persistence.savePending(remaining.map((item) => JSON.stringify(item)))
        const pendingWrites = remaining.map((item) => ({ ...item, status: '失败待恢复' as const }))
        return [
          TailingsActions.recoverFinished({ applied, remaining: remaining.length }),
          TailingsActions.loadDatasetSuccess({ dataset: finalDataset, pendingWrites })
        ]
      })
    ))
  ))

  private async replay(queued: PendingWrite[]): Promise<{ applied: number; remaining: PendingWrite[]; finalDataset: TailingsDataset }> {
    let dataset: TailingsDataset = this.persistence.loadSnapshot()!
    let applied = 0
    for (let index = 0; index < queued.length; index++) {
      // 恢复是值班人员显式确认的续做：按最新 revision 续接，业务规则仍在 commitWrite 内重新校验
      const write: PendingWrite = { ...queued[index], basisRevision: dataset.revision, attempts: queued[index].attempts + 1, updatedAt: new Date().toISOString() }
      const result = commitWrite(dataset, write)
      if (result.outcome.kind === 'error') {
        const head = { ...write, status: '失败待恢复' as const, lastError: result.outcome.message }
        return { applied, remaining: [head, ...queued.slice(index + 1)], finalDataset: dataset }
      }
      const ok = await new Promise<boolean>((resolve) => this.persistence.writeSnapshot(result.dataset).subscribe(resolve))
      if (!ok) {
        const head = { ...write, status: '失败待恢复' as const, lastError: '写入通道仍不可用' }
        return { applied, remaining: [head, ...queued.slice(index + 1)], finalDataset: dataset }
      }
      dataset = result.dataset
      applied += 1
    }
    return { applied, remaining: [], finalDataset: dataset }
  }

  /** 首次载入若有未恢复写入，给出提示（不自动重放，由值班人员确认） */
  notifyPendingOnLoad$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.loadDatasetSuccess),
    switchMap(({ pendingWrites }) => pendingWrites.length
      ? of(TailingsActions.writeRejected({ error: `检测到${pendingWrites.length}笔写入失败待恢复；恢复前看板、详情与审阅包保持上次已落盘版本。` }))
      : of({ type: 'noop-load' }))
  ))
}
