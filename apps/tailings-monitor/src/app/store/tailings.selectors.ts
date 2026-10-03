import { createFeatureSelector, createSelector } from '@ngrx/store'
import type { Anomaly, DispatchOrder, DispositionTask, EmergencyLink, EmergencyReview } from '../domain'
import { findConsistencyIssues } from '../domain/transitions'
import type { TailingsState } from './tailings.reducer'

export const selectTailings = createFeatureSelector<TailingsState>('tailings')
export const selectDataset = createSelector(selectTailings, (state) => state.dataset)
export const selectPoints = createSelector(selectDataset, (dataset) => dataset.points)
export const selectAnomalies = createSelector(selectDataset, (dataset) => dataset.anomalies)
export const selectSnapshotVersion = createSelector(selectDataset, (dataset) => dataset.snapshotVersion)
export const selectDispatchOrders = createSelector(selectDataset, (dataset) => dataset.dispatchOrders)
export const selectEffectiveOrder = createSelector(selectDispatchOrders, (orders): DispatchOrder | undefined => orders.find((item) => item.status === '已生效'))
export const selectTasks = createSelector(selectDataset, (dataset) => dataset.tasks)
export const selectEmergencyLinks = createSelector(selectDataset, (dataset) => dataset.emergencyLinks)
export const selectDrafts = createSelector(selectDataset, (dataset) => dataset.drafts)
export const selectApprovals = createSelector(selectDataset, (dataset) => dataset.approvals)
export const selectPendingWrite = createSelector(selectTailings, (state) => state.pendingWrite)
export const selectFailNextWrite = createSelector(selectTailings, (state) => state.failNextWrite)

export const selectSelectedAnomaly = createSelector(
  selectTailings,
  (state): Anomaly | undefined => state.dataset.anomalies.find((item) => item.id === state.selectedAnomalyId) ?? state.dataset.anomalies[0]
)

export const selectFilteredAnomalies = createSelector(selectTailings, (state) => state.dataset.anomalies.filter((item) => {
  const point = state.dataset.points.find((value) => value.id === item.pointId)
  const text = `${item.id} ${item.title} ${item.owner} ${point?.name ?? ''}`.toLowerCase()
  return (!state.keyword || text.includes(state.keyword.toLowerCase())) && (state.status === '全部' || item.status === state.status)
}))

const linkOf = (dataset: ReturnType<typeof selectDataset.projector>, anomalyId: string): EmergencyLink | undefined =>
  dataset.emergencyLinks.find((item) => item.anomalyId === anomalyId && item.status !== '已解除')

/** 某异常下未完成的处置任务 */
export const selectTasksFor = (anomalyId: string) =>
  createSelector(selectTasks, (tasks): DispositionTask[] => tasks.filter((task) => task.anomalyId === anomalyId))

/** 某异常当前仍在生效的应急联动（含变更复核队列） */
export const selectEmergencyLinkFor = (anomalyId: string) =>
  createSelector(selectDataset, (dataset) => linkOf(dataset, anomalyId))

export const selectPendingReviewFor = (anomalyId: string) =>
  createSelector(selectEmergencyLinkFor(anomalyId), (link): EmergencyReview | undefined => link?.reviews.find((review) => !review.resolved))

/** 某异常被后到签批保留的草稿（看到依据变化） */
export const selectDraftsFor = (anomalyId: string) =>
  createSelector(selectDrafts, (drafts) => drafts.filter((draft) => draft.anomalyId === anomalyId))

/** 该异常当前方案的签批记录（同一方案只允许一份） */
export const selectApprovalForPlan = (planId: string) =>
  createSelector(selectApprovals, (approvals) => approvals.find((approval) => approval.planId === planId))

/**
 * 一致性自检：看板/详情/审阅包展示前校验。
 * 正常应为 0 条；非 0 即说明出现了“联动已启动而方案仍旧版/无依据”等半成品。
 */
export const selectConsistencyIssues = createSelector(selectDataset, (dataset) => findConsistencyIssues(dataset))
