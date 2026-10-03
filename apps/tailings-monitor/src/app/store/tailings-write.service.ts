import { Injectable, inject } from '@angular/core'
import { Store } from '@ngrx/store'
import { firstValueFrom } from 'rxjs'
import type { PendingWrite, TailingsDataset } from '../domain'
import {
  addExpertOpinion,
  advanceTask,
  applyDispatchOrder,
  approvePlan,
  closeAnomaly,
  createEmergencyLink,
  resolveEmergencyReview,
  savePlan,
  submitFieldReview,
  type WriteContext
} from '../domain/transitions'
import { TailingsActions, type WriteKind } from './tailings.actions'
import { selectDataset } from './tailings.selectors'

type IntentMap = typeof TailingsActions
type ActionUnion = ReturnType<IntentMap[keyof IntentMap]>

let writeSeq = 0

/**
 * 写服务：把业务意图在内存里一次性推演为“完整一致的下一版快照”（staged）。
 * staged 不落地展示；只有 commitWrite 返回成功，Store 才整版替换 dataset，
 * 因此任何中途失败都不会产生“联动已启动、方案仍旧版”之类的半成品。
 */
@Injectable({ providedIn: 'root' })
export class TailingsWriteService {
  private readonly store = inject(Store)

  private ctx(operator = '当前用户'): WriteContext {
    const seq = writeSeq
    writeSeq += 1
    return { operator, now: new Date().toISOString(), seq: () => seq, auditCount: 0 }
  }

  async stage(action: ActionUnion): Promise<{ kind: WriteKind; targetId: string; label: string; staged: TailingsDataset } | null> {
    const dataset = await firstValueFrom(this.store.select(selectDataset))
    const now = new Date().toISOString()

    switch (action.type) {
      case '[Tailings] Issue Dispatch Order': {
        const order = {
          id: `DO-${now.slice(0, 10).replace(/-/g, '')}-${writeSeq++}`,
          title: `汛期库水位调度令（${action.responseLevel.replace(/[()（）]/g, '')}）`,
          targetWaterLevel: action.targetWaterLevel,
          rateLimit: action.rateLimit,
          responseLevel: action.responseLevel,
          issuedAt: now,
          effectiveAt: now,
          issuedBy: '防汛指挥部',
          note: action.note,
          status: '待生效' as const,
          supersedesOrderId: ''
        }
        return { kind: 'apply-order', targetId: order.id, label: `调度令生效 ${order.id}`, staged: applyDispatchOrder(dataset, order, this.ctx('防汛指挥部')) }
      }
      case '[Tailings] Submit Field Review':
        return { kind: 'field-review', targetId: action.anomalyId, label: '提交现场复核', staged: submitFieldReview(dataset, action.anomalyId, { inspector: action.inspector, observed: action.observed, evidence: action.evidence, reassessment: action.reassessment }, this.ctx(action.inspector)) }
      case '[Tailings] Add Expert Opinion':
        return { kind: 'expert-opinion', targetId: action.anomalyId, label: '补充专业意见', staged: addExpertOpinion(dataset, action.anomalyId, { specialist: action.specialist, discipline: action.discipline, content: action.content, conclusion: action.conclusion }, this.ctx(action.specialist)) }
      case '[Tailings] Save Disposition Plan':
        return { kind: 'save-plan', targetId: action.anomalyId, label: '提交处置方案', staged: savePlan(dataset, action.anomalyId, { action: action.action, owner: action.owner, deadline: action.deadline, conditions: action.conditions, emergencyLinked: action.emergencyLinked }, this.ctx()) }
      case '[Tailings] Approve Plan': {
        const result = approvePlan(dataset, { anomalyId: action.anomalyId, approver: action.approver, note: action.note, expectedPlanVersion: action.expectedPlanVersion, expectedSnapshotVersion: action.expectedSnapshotVersion }, this.ctx(action.approver))
        return { kind: 'approve-plan', targetId: action.anomalyId, label: result.outcome === 'approved' ? `负责人签批（${action.approver}）` : `签批转草稿（${action.approver}）`, staged: result.dataset }
      }
      case '[Tailings] Create Emergency Link':
        return { kind: 'emergency-link', targetId: action.anomalyId, label: '启动应急联动', staged: createEmergencyLink(dataset, action.anomalyId, action.note, this.ctx('值班负责人')) }
      case '[Tailings] Resolve Emergency Review':
        return { kind: 'emergency-review', targetId: action.linkId, label: '联动变更复核结论', staged: resolveEmergencyReview(dataset, { linkId: action.linkId, reviewId: action.reviewId, conclusion: action.conclusion, note: action.note }, this.ctx('值班负责人')) }
      case '[Tailings] Advance Task':
        return { kind: 'task-done', targetId: action.taskId, label: '完成处置任务', staged: advanceTask(dataset, action.taskId, action.result, this.ctx()) }
      case '[Tailings] Close Anomaly':
        return { kind: 'close-anomaly', targetId: action.anomalyId, label: '关闭异常', staged: closeAnomaly(dataset, action.anomalyId, action.note, this.ctx('负责人 何清')) }
      default:
        return null
    }
  }

  toPending(kind: WriteKind, targetId: string, label: string, staged: TailingsDataset): PendingWrite {
    return { writeId: `W-${Date.now()}-${writeSeq++}`, label, targetId, phase: '提交中', stagedDataset: staged, attemptedAt: new Date().toISOString(), error: '' }
  }
}
