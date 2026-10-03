import { createActionGroup, emptyProps, props } from '@ngrx/store'
import type {
  AuditEntry,
  EmergencyConclusion,
  PendingWrite,
  ResponseLevel,
  TailingsDataset
} from '../domain'

/** 暂存写入的类型标签，决定失败恢复界面如何表述 */
export type WriteKind =
  | 'apply-order'
  | 'save-plan'
  | 'approve-plan'
  | 'emergency-link'
  | 'emergency-review'
  | 'task-done'
  | 'close-anomaly'
  | 'field-review'
  | 'expert-opinion'

export const TailingsActions = createActionGroup({
  source: 'Tailings',
  events: {
    'Load Dataset': emptyProps(),
    'Load Dataset Success': props<{ dataset: TailingsDataset }>(),
    'Load Dataset Failure': props<{ error: string }>(),

    // —— 库水位调度令 ——
    'Issue Dispatch Order': props<{
      targetWaterLevel: number
      rateLimit: number
      responseLevel: ResponseLevel
      note: string
    }>(),

    // —— 现场复核 / 专业意见 / 处置方案 ——
    'Submit Field Review': props<{ anomalyId: string; inspector: string; observed: string; evidence: string; reassessment: string }>(),
    'Add Expert Opinion': props<{ anomalyId: string; specialist: string; discipline: '坝体' | '水文' | '岩土' | '应急'; content: string; conclusion: '支持结论' | '提出异议' | '补充证据' }>(),
    'Save Disposition Plan': props<{ anomalyId: string; action: '加密监测' | '降低库水位' | '疏通排水' | '应急撤离准备' | '工程加固'; owner: string; deadline: string; conditions: string; emergencyLinked: boolean }>(),
    /** 签批带打开签批时的依据版本，服务端/Store 据此判定并发与依据变化 */
    'Approve Plan': props<{ anomalyId: string; approver: string; note: string; expectedPlanVersion: number; expectedSnapshotVersion: number }>(),
    'Close Anomaly': props<{ anomalyId: string; note: string }>(),

    // —— 应急联动与变更复核 ——
    'Create Emergency Link': props<{ anomalyId: string; note: string }>(),
    'Resolve Emergency Review': props<{ linkId: string; reviewId: string; conclusion: EmergencyConclusion; note: string }>(),
    'Advance Task': props<{ taskId: string; result: string }>(),

    // —— 写入失败恢复（暂存区整版提交，绝不出现半成品）——
    'Write Requested': props<{ kind: WriteKind; targetId: string; label: string; pending: PendingWrite }>(),
    'Write Succeeded': props<{ pending: PendingWrite }>(),
    'Write Failed': props<{ writeId: string; error: string }>(),
    'Retry Pending Write': emptyProps(),
    'Discard Pending Write': emptyProps(),
    'Toggle Fail Next Write': emptyProps(),

    // —— 界面状态 ——
    'Select Anomaly': props<{ anomalyId: string }>(),
    'Update Keyword': props<{ keyword: string }>(),
    'Update Status': props<{ status: string }>(),
    'Add Audit': props<{ entry: AuditEntry }>(),
    'Reset Demo': emptyProps()
  }
})
