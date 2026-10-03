import { createReducer, on } from '@ngrx/store'
import type { Anomaly, Notice, PendingWrite, TailingsDataset } from '../domain'
import { seedDataset } from '../data/seed'
import { TailingsActions } from './tailings.actions'

export interface TailingsState {
  dataset: TailingsDataset
  pendingWrites: PendingWrite[]
  writing: boolean
  loading: boolean
  error: string
  notices: Notice[]
  selectedAnomalyId: string
  keyword: string
  status: Anomaly['status'] | '全部'
}

export const initialTailingsState: TailingsState = {
  dataset: structuredClone(seedDataset),
  pendingWrites: [],
  writing: false,
  loading: false,
  error: '',
  notices: [],
  selectedAnomalyId: seedDataset.anomalies[0]?.id ?? '',
  keyword: '',
  status: '全部'
}

let noticeSeed = 0
const notice = (tone: Notice['tone'], title: string, detail = ''): Notice => ({
  id: `NTF-${Date.now()}-${noticeSeed++}`,
  tone,
  title,
  detail,
  createdAt: new Date().toISOString()
})

export const tailingsReducer = createReducer(
  initialTailingsState,
  on(TailingsActions.loadDataset, (state) => ({ ...state, loading: true, error: '' })),
  on(TailingsActions.loadDatasetSuccess, (state, { dataset, pendingWrites }) => ({
    ...state,
    dataset,
    pendingWrites,
    loading: false,
    writing: false,
    selectedAnomalyId: dataset.anomalies.some((item) => item.id === state.selectedAnomalyId) ? state.selectedAnomalyId : dataset.anomalies[0]?.id ?? ''
  })),
  on(TailingsActions.loadDatasetFailure, (state, { error }) => ({ ...state, loading: false, error })),

  on(TailingsActions.writeStarted, (state, { write }) => ({
    ...state,
    writing: true,
    error: '',
    // 去重（恢复重放时可能已在队列）
    pendingWrites: state.pendingWrites.some((item) => item.id === write.id) ? state.pendingWrites : [write, ...state.pendingWrites]
  })),
  on(TailingsActions.writeSucceeded, (state, { write, dataset, message }) => ({
    ...state,
    dataset,
    writing: false,
    pendingWrites: state.pendingWrites.filter((item) => item.id !== write.id),
    notices: [notice('success', write.label, message), ...state.notices].slice(0, 8)
  })),
  on(TailingsActions.writeFailed, (state, { write, error }) => ({
    ...state,
    writing: false,
    pendingWrites: state.pendingWrites.map((item) => (item.id === write.id
      ? { ...write, status: '失败待恢复' as const, lastError: error, updatedAt: new Date().toISOString() }
      : item)),
    notices: [notice('error', `写入失败，已保留可恢复：${write.label}`, `${error}。状态未改动，可在顶部「待恢复写入」中重试或放弃。`), ...state.notices].slice(0, 8)
  })),
  on(TailingsActions.writeRejected, (state, { error }) => ({
    ...state,
    notices: [notice('warn', '操作未执行', error), ...state.notices].slice(0, 8)
  })),
  on(TailingsActions.recoverFinished, (state, { applied, remaining }) => ({
    ...state,
    notices: [
      notice(
        remaining ? 'warn' : 'success',
        remaining ? `部分恢复完成：成功${applied}笔，仍有${remaining}笔待恢复` : `待恢复写入已全部恢复（${applied}笔）`,
        remaining ? '未恢复的写入仍保留其提交时依据，可再次重试。' : '看板、详情和审阅包已按同版展示。'
      ),
      ...state.notices
    ].slice(0, 8)
  })),
  on(TailingsActions.discardPendingWrite, (state, { writeId }) => ({
    ...state,
    pendingWrites: state.pendingWrites.filter((item) => item.id !== writeId),
    notices: [notice('info', '已放弃一笔待恢复写入', '该笔变更未落地，当前数据保持现状。'), ...state.notices].slice(0, 8)
  })),
  on(TailingsActions.dismissNotice, (state, { noticeId }) => ({ ...state, notices: state.notices.filter((item) => item.id !== noticeId) })),

  on(TailingsActions.selectAnomaly, (state, { anomalyId }) => ({ ...state, selectedAnomalyId: anomalyId })),
  on(TailingsActions.updateKeyword, (state, { keyword }) => ({ ...state, keyword })),
  on(TailingsActions.updateStatus, (state, { status }) => ({ ...state, status: status as TailingsState['status'] })),
  on(TailingsActions.resetDemo, () => ({ ...initialTailingsState }))
)
