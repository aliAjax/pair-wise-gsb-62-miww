import { createFeatureSelector, createSelector } from '@ngrx/store'
import type { Anomaly, TailingsDataset } from '../domain'
import type { TailingsState } from './tailings.reducer'

export const selectTailings = createFeatureSelector<TailingsState>('tailings')
export const selectDataset = createSelector(selectTailings, (state) => state.dataset)
export const selectRevision = createSelector(selectDataset, (dataset) => dataset.revision)
export const selectPoints = createSelector(selectDataset, (dataset) => dataset.points)
export const selectAnomalies = createSelector(selectDataset, (dataset) => dataset.anomalies)
export const selectDispatchOrders = createSelector(selectDataset, (dataset) => dataset.dispatchOrders)
export const selectActiveOrder = createSelector(selectDataset, (dataset) => dataset.dispatchOrders.find((order) => order.status === '已生效'))
export const selectPendingWrites = createSelector(selectTailings, (state) => state.pendingWrites)
export const selectHasFailedWrites = createSelector(selectPendingWrites, (writes) => writes.length > 0)
export const selectWriting = createSelector(selectTailings, (state) => state.writing)
export const selectNotices = createSelector(selectTailings, (state) => state.notices)
export const selectSelectedAnomaly = createSelector(selectTailings, (state) =>
  state.dataset.anomalies.find((item) => item.id === state.selectedAnomalyId) ?? state.dataset.anomalies[0]
)
export const selectFilteredAnomalies = createSelector(selectTailings, (state) => state.dataset.anomalies.filter((item) => {
  const point = state.dataset.points.find((value) => value.id === item.pointId)
  const text = `${item.id} ${item.title} ${item.owner} ${point?.name ?? ''}`.toLowerCase()
  return (!state.keyword || text.includes(state.keyword.toLowerCase())) && (state.status === '全部' || item.status === state.status)
}))

/** 看板/详情/审阅包共用的一致性口径：任何展示版本都必须来自同一个 revision 快照 */
export interface BasisView {
  revision: number
  basisOrderVersion: number
  planVersion: number
  anomalyVersion: number
  stale: boolean
  label: string
}

export const selectBasisView = createSelector(selectDataset, (dataset) => (anomaly: Anomaly): BasisView => {
  const active = dataset.dispatchOrders.find((order) => order.status === '已生效')
  const stale = anomaly.plan.basisOrderVersion !== (active?.version ?? anomaly.plan.basisOrderVersion)
  return {
    revision: dataset.revision,
    basisOrderVersion: anomaly.plan.basisOrderVersion,
    planVersion: anomaly.plan.version,
    anomalyVersion: anomaly.version,
    stale,
    label: `R${dataset.revision} · 异常V${anomaly.version} · 方案V${anomaly.plan.version} · 调度令V${anomaly.plan.basisOrderVersion}`
  }
})

/** 审阅包：单一快照导出，头部带 revision，包内所有版本同版 */
export const selectReviewPackage = createSelector(selectDataset, (dataset) => buildReviewPackage(dataset))

export function buildReviewPackage(dataset: TailingsDataset): unknown {
  return {
    packageName: '尾矿库异常处置审阅包',
    exportedAt: new Date().toISOString(),
    revision: dataset.revision,
    consistencyTag: `snapshot-revision-${dataset.revision}`,
    activeDispatchOrder: dataset.dispatchOrders.find((order) => order.status === '已生效') ?? null,
    dispatchOrders: dataset.dispatchOrders,
    points: dataset.points,
    thresholds: dataset.thresholds,
    readings: dataset.readings,
    anomalies: dataset.anomalies.map((anomaly) => ({
      ...anomaly,
      basisTag: `R${dataset.revision}/异常V${anomaly.version}/方案V${anomaly.plan.version}/调度令V${anomaly.plan.basisOrderVersion}`,
      planStale: anomaly.plan.status === '失效待重算'
    })),
    audit: dataset.audit.filter((entry) => entry.revision <= dataset.revision)
  }
}
