export type MonitoringType = '位移' | '水位' | '渗流' | '降雨'
export type PointStatus = '正常' | '预警' | '异常'
export type AnomalyStatus =
  | '待现场复核'
  | '原因调查中'
  | '待负责人审批'
  | '处置执行中'
  | '方案待重算'
  | '已暂停'
  | '应急联动'
  | '已关闭'
export type Severity = '关注' | '较高' | '重大'
/** 调度响应级别：调度令一改，旧级别的处置依据即被新令接替 */
export type ResponseLevel = 'Ⅳ级(关注)' | 'Ⅲ级(较高)' | 'Ⅱ级(重大)' | 'Ⅰ级(特大)'
export type DispatchStatus = '草稿' | '已生效' | '作废'
export type PlanStatus = '待审批' | '已批准' | '失效待重算'
export type PlanTaskStatus = '待执行' | '执行中' | '已完成' | '已暂停'

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
  /** 是否为调度令换版后追加的联动复核 */
  afterDispatchChange: boolean
  /** 复核时异常响应级别，留痕用 */
  levelAtReview: ResponseLevel
  version: number
}

export interface PlanTask {
  id: string
  content: string
  owner: string
  status: PlanTaskStatus
  /** 暂停时间与原因（调度令换版导致） */
  pausedAt: string
  pauseReason: string
}

export interface DispositionPlan {
  id: string
  /** 同一方案每次重算递增；审批、联动只认当前版本 */
  version: number
  action: '加密监测' | '降低库水位' | '疏通排水' | '应急撤离准备' | '工程加固'
  owner: string
  deadline: string
  conditions: string
  status: PlanStatus
  tasks: PlanTask[]
  /** 方案编制时所依据的调度令版本 */
  basisOrderId: string
  basisOrderVersion: number
  /** 被哪一版调度令宣告失效 */
  invalidatedByOrderId: string
  emergencyLinked: boolean
  approvedBy: string
  approvedAt: string
  /** 历史版本归档（最近在前），仅作追溯，不参与当前处置 */
  history: DispositionPlan[]
}

export interface EmergencyReview {
  id: string
  reviewer: string
  reviewedAt: string
  /** 保留的原始联动依据 */
  originalOrderVersion: number
  /** 追加复核所依据的新调度令版本 */
  reviewedOrderVersion: number
  conclusion: string
  /** 复核后是否同意按新级别继续联动 */
  continued: boolean
}

export interface EmergencyLink {
  id: string
  launchedAt: string
  launchedBy: string
  /** 启动联动时锁定的调度令版本，联动保留原依据，不因新令改写 */
  basisOrderId: string
  basisOrderVersion: number
  basisLevel: ResponseLevel
  note: string
  active: boolean
  reviews: EmergencyReview[]
}

export interface ApprovalDraft {
  id: string
  anomalyId: string
  approver: string
  note: string
  /** 后到者打开签批时看到的异常/方案版本 */
  basisAnomalyVersion: number
  basisPlanVersion: number
  /** 草稿提交时的审批结论，保留待本人决定 */
  decision: '同意' | '不同意'
  createdAt: string
  /** 依据变化说明（仅一份通过时回填） */
  basisChangeNote: string
}

export interface Anomaly {
  id: string
  pointId: string
  title: string
  severity: Severity
  /** 当前响应级别（依据当前生效调度令推导/复核确认） */
  responseLevel: ResponseLevel
  /** 级别是否仍沿用旧令、等待按新生效调度令复核重算 */
  levelPendingReview: boolean
  status: AnomalyStatus
  openedAt: string
  owner: string
  triggerReadingId: string
  observedValue: string
  fieldReviews: FieldReview[]
  opinions: ExpertOpinion[]
  plan: DispositionPlan
  emergency: EmergencyLink | null
  approvalDrafts: ApprovalDraft[]
  closedAt: string
  version: number
}

export interface AuditEntry {
  id: string
  entityId: string
  action: string
  operator: string
  detail: string
  /** 变更落地后全库的一致性版本号 */
  revision: number
  createdAt: string
}

export interface DispatchOrder {
  id: string
  title: string
  version: number
  status: DispatchStatus
  /** 调度响应级别，决定位移异常与应急联动级别 */
  level: ResponseLevel
  /** 目标库水位（汛期调度核心参数） */
  targetWaterLevel: number
  unit: string
  issuedBy: string
  issuedAt: string
  effectiveAt: string
  /** 影响范围：分区为空表示全库 */
  zones: string[]
  note: string
  /** 被本令接替的旧令版本 */
  supersededOrderId: string
}

export type WriteType =
  | 'fieldReview'
  | 'expertOpinion'
  | 'plan'
  | 'planRecompute'
  | 'approve'
  | 'emergencyLink'
  | 'emergencyReview'
  | 'resumeTasks'
  | 'close'
  | 'dispatchCreate'
  | 'dispatchActivate'

export interface PendingWrite {
  id: string
  type: WriteType
  entityId: string
  label: string
  /** 乐观锁：提交时认定的全库版本；提交成功才落地 */
  basisRevision: number
  payload: Record<string, unknown>
  status: '提交中' | '失败待恢复'
  attempts: number
  lastError: string
  createdAt: string
  updatedAt: string
}

export interface Notice {
  id: string
  tone: 'success' | 'warn' | 'error' | 'info'
  title: string
  detail: string
  createdAt: string
}

export interface TailingsDataset {
  revision: number
  dispatchOrders: DispatchOrder[]
  points: MonitoringPoint[]
  thresholds: Threshold[]
  readings: RawReading[]
  anomalies: Anomaly[]
  audit: AuditEntry[]
}
