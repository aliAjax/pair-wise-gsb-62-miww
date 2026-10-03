export type MonitoringType = '位移' | '水位' | '渗流' | '降雨'
export type PointStatus = '正常' | '预警' | '异常'
export type AnomalyStatus = '待现场复核' | '原因调查中' | '待负责人审批' | '处置中' | '应急联动' | '已关闭'
export type Severity = '关注' | '较高' | '重大'
/** 调度响应级别：级别数字越小，响应越严 */
export type ResponseLevel = 'Ⅳ级(常规)' | 'Ⅲ级(关注)' | 'Ⅱ级(较高)' | 'Ⅰ级(重大)'
export type OrderStatus = '待生效' | '已生效' | '已废止'
export type PlanStatus = '编制中' | '待审批' | '执行中' | '已完成' | '已失效'
export type TaskStatus = '待启动' | '进行中' | '已暂停' | '已完成'
export type EmergencyStatus = '已启动' | '复核中' | '维持' | '已解除'
export type EmergencyConclusion = '维持联动' | '升级响应' | '解除联动'
/** 后到签批落草稿的原因 */
export type DraftReason = '已有人签批' | '依据版本已变化'
export type WritePhase = '提交中' | '失败待恢复'

export interface MonitoringPoint {
  id: string
  name: string
  zone: string
  type: MonitoringType
  longitude: number
  latitude: number
  status: PointStatus
  currentValue: number
  unit: string
  thresholdId: string
  lastInspectionAt: string
}

export interface Threshold {
  id: string
  type: MonitoringType
  warning: number
  alarm: number
  changeRate: number
  unit: string
  enabled: boolean
  version: number
}

export interface RawReading {
  id: string
  pointId: string
  value: number
  unit: string
  capturedAt: string
  deviceId: string
  quality: '有效' | '可疑' | '无效'
}

export interface ExpertOpinion {
  id: string
  specialist: string
  discipline: '坝体' | '水文' | '岩土' | '应急'
  content: string
  conclusion: '支持结论' | '提出异议' | '补充证据'
  createdAt: string
}

export interface FieldReview {
  id: string
  inspector: string
  arrivedAt: string
  observed: string
  evidence: string
  reassessment: string
  version: number
}

/**
 * 处置方案。方案是“依据快照”的一部分：
 * basisOrderId / basisSnapshotVersion 记录它编制时所依据的调度令与数据快照版本；
 * 调度令变更后旧方案置为“已失效”并整体保留，重算产生新方案（recalculatedFromPlanId 指回旧版）。
 */
export interface DispositionPlan {
  id: string
  action: '加密监测' | '降低库水位' | '疏通排水' | '应急撤离准备' | '工程加固'
  owner: string
  deadline: string
  conditions: string
  emergencyLinked: boolean
  approvedBy: string
  approvedAt: string
  status: PlanStatus
  /** 编制依据：调度令 */
  basisOrderId: string
  /** 编制依据：快照版本 */
  basisSnapshotVersion: number
  /** 方案自身版本（签批乐观并发校验用） */
  version: number
  /** 由哪个旧版方案重算而来 */
  recalculatedFromPlanId: string
  invalidatedAt: string
  invalidatedReason: string
  supersededByPlanId: string
}

/** 处置任务（方案下的未完成项），调度令生效时未完成任务一律先停住 */
export interface DispositionTask {
  id: string
  planId: string
  anomalyId: string
  title: string
  owner: string
  status: TaskStatus
  /** 是否被调度令变更冻结，冻结后不得继续推进，须等新方案重算签批 */
  frozen: boolean
  frozenReason: string
  result: string
  completedAt: string
}

/** 调度令变更后，对已启动联动追加的复核要求（原启动依据保留不动） */
export interface EmergencyReview {
  id: string
  requiredAt: string
  requiredBy: string
  reason: string
  newOrderId: string
  resolved: boolean
  resolvedAt: string
  resolvedBy: string
  conclusion: EmergencyConclusion | ''
  note: string
}

/**
 * 应急联动。启动后 basis* 字段永久冻结为启动时刻依据；
 * 调度令变更不重启、不回改依据，只向 reviews 追加“变更复核”。
 */
export interface EmergencyLink {
  id: string
  anomalyId: string
  level: Severity
  startedAt: string
  startedBy: string
  basisPlanId: string
  basisOrderId: string
  basisSnapshotVersion: number
  basisNote: string
  status: EmergencyStatus
  reviews: EmergencyReview[]
}

/** 已通过的签批记录（同一方案只允许一条） */
export interface ApprovalRecord {
  planId: string
  anomalyId: string
  approver: string
  approvedAt: string
  note: string
  planVersion: number
  basisSnapshotVersion: number
}

/** 后到签批保留的草稿，记录尝试时与当前的依据版本，供签批人看到依据变化 */
export interface ApprovalDraft {
  id: string
  anomalyId: string
  planId: string
  approver: string
  note: string
  attemptedAt: string
  planVersionAtAttempt: number
  currentPlanVersion: number
  snapshotVersionAtAttempt: number
  currentSnapshotVersion: number
  reason: DraftReason
  basisChanged: boolean
}

export interface SeverityChange {
  from: Severity
  to: Severity
  reason: string
  at: string
  snapshotVersion: number
  orderId: string
}

export interface Anomaly {
  id: string
  pointId: string
  title: string
  severity: Severity
  status: AnomalyStatus
  openedAt: string
  owner: string
  triggerReadingId: string
  observedValue: string
  fieldReviews: FieldReview[]
  opinions: ExpertOpinion[]
  plan: DispositionPlan
  /** 历次方案（含已失效旧版），当前方案在 plan 字段 */
  planHistory: DispositionPlan[]
  severityHistory: SeverityChange[]
  closedAt: string
  version: number
}

export interface AuditEntry {
  id: string
  entityId: string
  action: string
  operator: string
  detail: string
  /** 该事件发布到的快照版本；看板/详情/审阅包据此按同版展示 */
  snapshotVersion: number
  createdAt: string
}

/** 库水位调度令 */
export interface DispatchOrder {
  id: string
  title: string
  /** 目标控制库水位 m */
  targetWaterLevel: number
  /** 降库限速 m/d */
  rateLimit: number
  responseLevel: ResponseLevel
  issuedAt: string
  effectiveAt: string
  issuedBy: string
  note: string
  status: OrderStatus
  supersedesOrderId: string
}

export interface TailingsDataset {
  points: MonitoringPoint[]
  thresholds: Threshold[]
  readings: RawReading[]
  anomalies: Anomaly[]
  dispatchOrders: DispatchOrder[]
  tasks: DispositionTask[]
  emergencyLinks: EmergencyLink[]
  approvals: ApprovalRecord[]
  drafts: ApprovalDraft[]
  audit: AuditEntry[]
  /** 当前已发布数据快照版本，所有跨实体联动一次提交只 +1 */
  snapshotVersion: number
}

/** 一次尚未确认发布的写入：stagedDataset 必须是内部完整一致的整版快照 */
export interface PendingWrite {
  writeId: string
  label: string
  targetId: string
  phase: WritePhase
  stagedDataset: TailingsDataset
  attemptedAt: string
  error: string
}
