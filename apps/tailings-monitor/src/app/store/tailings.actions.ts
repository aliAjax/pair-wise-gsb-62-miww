import { createActionGroup, emptyProps, props } from '@ngrx/store'
import type {
  DispatchOrder,
  ExpertOpinion,
  FieldReview,
  Notice,
  PendingWrite,
  TailingsDataset
} from '../domain'

type WriteRequestProps = Omit<PendingWrite, 'id' | 'basisRevision' | 'status' | 'attempts' | 'lastError' | 'createdAt' | 'updatedAt'>

export const TailingsActions = createActionGroup({
  source: 'Tailings',
  events: {
    'Load Dataset': emptyProps(),
    'Load Dataset Success': props<{ dataset: TailingsDataset; pendingWrites: PendingWrite[] }>(),
    'Load Dataset Failure': props<{ error: string }>(),

    'Submit Field Review': props<{ anomalyId: string; review: FieldReview }>(),
    'Submit Expert Opinion': props<{ anomalyId: string; opinion: ExpertOpinion }>(),
    'Save Plan': props<{ anomalyId: string; plan: Pick<import('../domain').DispositionPlan, 'action' | 'owner' | 'deadline' | 'conditions'>; tasks: { content: string; owner: string }[] }>(),
    'Recompute Plan': props<{ anomalyId: string; plan: Pick<import('../domain').DispositionPlan, 'action' | 'owner' | 'deadline' | 'conditions'>; tasks: { content: string; owner: string }[] }>(),
    'Approve Plan': props<{ anomalyId: string; approver: string; note: string; decision: '同意' | '不同意' }>(),
    'Create Emergency Link': props<{ anomalyId: string; note: string }>(),
    'Submit Emergency Review': props<{ anomalyId: string; reviewer: string; conclusion: string; continued: boolean }>(),
    'Resume Tasks': props<{ anomalyId: string; taskIds: string[] }>(),
    'Close Anomaly': props<{ anomalyId: string; note: string }>(),
    'Create Dispatch Order': props<{ draft: Omit<DispatchOrder, 'id' | 'status' | 'version' | 'supersededOrderId'> }>(),
    'Activate Dispatch Order': props<{ orderId: string; note: string }>(),

    /** 统一写入管线内部动作 */
    'Write Started': props<{ write: PendingWrite }>(),
    'Write Succeeded': props<{ write: PendingWrite; dataset: TailingsDataset; message: string }>(),
    'Write Failed': props<{ write: PendingWrite; error: string }>(),
    'Write Rejected': props<{ error: string }>(),
    'Recover Writes': emptyProps(),
    'Recover Finished': props<{ applied: number; remaining: number }>(),
    'Discard Pending Write': props<{ writeId: string }>(),
    'Arm Failure': emptyProps(),
    'Dismiss Notice': props<{ noticeId: string }>(),

    'Select Anomaly': props<{ anomalyId: string }>(),
    'Update Keyword': props<{ keyword: string }>(),
    'Update Status': props<{ status: string }>(),
    'Reset Demo': emptyProps()
  }
})

export type { WriteRequestProps, Notice }
