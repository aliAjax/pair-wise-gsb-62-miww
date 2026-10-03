import { Injectable, inject } from '@angular/core'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { Store } from '@ngrx/store'
import { catchError, filter, map, of, switchMap, withLatestFrom } from 'rxjs'
import { TailingsApiService } from '../services/tailings-api.service'
import { TailingsActions } from './tailings.actions'
import { TailingsWriteService } from './tailings-write.service'
import { selectFailNextWrite, selectPendingWrite } from './tailings.selectors'

/** 统一走“暂存—提交”通道的业务意图 */
const WRITE_INTENTS: string[] = [
  TailingsActions.issueDispatchOrder.type,
  TailingsActions.submitFieldReview.type,
  TailingsActions.addExpertOpinion.type,
  TailingsActions.saveDispositionPlan.type,
  TailingsActions.approvePlan.type,
  TailingsActions.createEmergencyLink.type,
  TailingsActions.resolveEmergencyReview.type,
  TailingsActions.advanceTask.type,
  TailingsActions.closeAnomaly.type
]

@Injectable()
export class TailingsEffects {
  private readonly actions$ = inject(Actions)
  private readonly api = inject(TailingsApiService)
  private readonly store = inject(Store)
  private readonly writeService = inject(TailingsWriteService)

  loadDataset$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.loadDataset),
    switchMap(() => this.api.loadDataset().pipe(
      map((dataset) => TailingsActions.loadDatasetSuccess({ dataset })),
      catchError((error: Error) => of(TailingsActions.loadDatasetFailure({ error: error.message })))
    ))
  ))

  /**
   * 业务写入：先在内存推演为完整一致的暂存快照（writeRequested），
   * 再提交。提交期间 dataset 不变；成功才整版发布，失败保留暂存供恢复。
   */
  requestWrite$ = createEffect(() => this.actions$.pipe(
    filter((action) => WRITE_INTENTS.includes(action.type)),
    withLatestFrom(this.store.select(selectPendingWrite)),
    filter(([, pending]) => !pending), // 已有暂存写入时拒绝新写入，避免交叉
    switchMap(async ([action]) => {
      const staged = await this.writeService.stage(action as Parameters<TailingsWriteService['stage']>[0])
      if (!staged) return null
      const pending = this.writeService.toPending(staged.kind, staged.targetId, staged.label, staged.staged)
      return TailingsActions.writeRequested({ kind: staged.kind, targetId: staged.targetId, label: staged.label, pending })
    }),
    filter((action): action is NonNullable<typeof action> => action !== null)
  ))

  /** 提交暂存写入。failNextWrite 打开时模拟一次落库失败。 */
  commitWrite$ = createEffect(() => this.actions$.pipe(
    ofType(TailingsActions.writeRequested, TailingsActions.retryPendingWrite),
    withLatestFrom(this.store.select(selectPendingWrite), this.store.select(selectFailNextWrite)),
    filter(([, pending]) => !!pending),
    switchMap(([, pending, failNext]) =>
      this.api.commitWrite((pending as NonNullable<typeof pending>).stagedDataset, failNext).pipe(
        map(() => TailingsActions.writeSucceeded({ pending: pending as NonNullable<typeof pending> })),
        catchError((error: Error) =>
          of(TailingsActions.writeFailed({ writeId: (pending as NonNullable<typeof pending>).writeId, error: error.message })))
      )
    )
  ))
}
