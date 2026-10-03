import { createReducer, on } from '@ngrx/store'
import type { Anomaly, PendingWrite, TailingsDataset } from '../domain'
import { seedDataset } from '../data/seed'
import { TailingsActions } from './tailings.actions'

export interface TailingsState {
  dataset: TailingsDataset
  loading: boolean
  error: string
  selectedAnomalyId: string
  keyword: string
  status: Anomaly['status'] | '全部'
  /** 尚未确认发布的暂存写入；存在时界面禁止发起新的写入 */
  pendingWrite: PendingWrite | null
  /** 是否让下一次写入失败（用于演示“写入失败可恢复、绝不半成品”） */
  failNextWrite: boolean
}

export const initialTailingsState: TailingsState = {
  dataset: structuredClone(seedDataset),
  loading: false,
  error: '',
  selectedAnomalyId: seedDataset.anomalies[0]?.id ?? '',
  keyword: '',
  status: '全部',
  pendingWrite: null,
  failNextWrite: false
}

export const tailingsReducer = createReducer(
  initialTailingsState,
  on(TailingsActions.loadDataset, (state) => ({ ...state, loading: true, error: '' })),
  on(TailingsActions.loadDatasetSuccess, (state, { dataset }) => ({
    ...state,
    dataset,
    loading: false,
    pendingWrite: null,
    selectedAnomalyId: dataset.anomalies[0]?.id ?? ''
  })),
  on(TailingsActions.loadDatasetFailure, (state, { error }) => ({ ...state, loading: false, error })),

  // 业务意图进入暂存区：dataset 保持上一已发布版本不动
  on(TailingsActions.writeRequested, (state, { pending }) => ({ ...state, pendingWrite: { ...pending, phase: '提交中' as const } })),
  // 写入成功：整版替换为暂存快照（看板/详情/审阅包从此同版），清空暂存区
  on(TailingsActions.writeSucceeded, (state, { pending }) => ({
    ...state,
    dataset: pending.stagedDataset,
    pendingWrite: null
  })),
  // 写入失败：dataset 仍为上一已发布版本，暂存快照保留以待重试/放弃
  on(TailingsActions.writeFailed, (state, { writeId, error }) =>
    state.pendingWrite?.writeId === writeId
      ? { ...state, pendingWrite: { ...state.pendingWrite, phase: '失败待恢复' as const, error } }
      : state),
  on(TailingsActions.retryPendingWrite, (state) =>
    state.pendingWrite ? { ...state, pendingWrite: { ...state.pendingWrite, phase: '提交中' as const, error: '' } } : state),
  on(TailingsActions.discardPendingWrite, (state) => ({ ...state, pendingWrite: null })),
  on(TailingsActions.toggleFailNextWrite, (state) => ({ ...state, failNextWrite: !state.failNextWrite })),

  on(TailingsActions.selectAnomaly, (state, { anomalyId }) => ({ ...state, selectedAnomalyId: anomalyId })),
  on(TailingsActions.updateKeyword, (state, { keyword }) => ({ ...state, keyword })),
  on(TailingsActions.updateStatus, (state, { status }) => ({ ...state, status: status as TailingsState['status'] })),
  on(TailingsActions.resetDemo, () => ({
    ...initialTailingsState,
    dataset: structuredClone(seedDataset),
    selectedAnomalyId: seedDataset.anomalies[0].id
  }))
)
