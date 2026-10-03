import type {
  Anomaly,
  AuditEntry,
  DispositionPlan,
  DispatchOrder,
  EmergencyLink,
  EmergencyReview,
  ExpertOpinion,
  FieldReview,
  PendingWrite,
  PlanTask,
  TailingsDataset
} from '../domain'

/** 一次写入落地后的结果；冲突按业务规则解析为草稿，硬错误保留在失败队列中 */
export interface CommitOutcome {
  kind: 'applied' | 'draft' | 'error'
  message: string
}

export interface CommitResult {
  dataset: TailingsDataset
  outcome: CommitOutcome
}

const now = () => new Date().toISOString()

export function activeOrderOf(dataset: TailingsDataset): DispatchOrder | undefined {
  return dataset.dispatchOrders.find((order) => order.status === '已生效')
}

export function affectedByOrder(dataset: TailingsDataset, anomaly: Anomaly, order: DispatchOrder): boolean {
  if (anomaly.status === '已关闭') return false
  if (!order.zones.length) return true
  const point = dataset.points.find((item) => item.id === anomaly.pointId)
  return !!point && order.zones.includes(point.zone)
}

/** 依据快照：看板、详情、审阅包展示同一组键值，杜绝跨版拼接 */
export function basisOf(anomaly: Anomaly): string {
  return `异常V${anomaly.version}/方案V${anomaly.plan.version}/调度令V${anomaly.plan.basisOrderVersion}`
}

function audit(entries: AuditEntry[], revision: number, entityId: string, action: string, operator: string, detail: string): void {
  entries.push({ id: `AUD-${revision}-${entries.length + 1}-${Math.random().toString(36).slice(2, 7)}`, entityId, action, operator, detail, revision, createdAt: now() })
}

function payloadAs<T>(write: PendingWrite): T {
  return write.payload as T
}

function pauseTask(task: PlanTask, reason: string, at: string): void {
  if (task.status !== '已完成') {
    task.status = '已暂停'
    task.pausedAt = at
    task.pauseReason = reason
  }
}

/** 把当前方案整体归档为历史版本，返回一个继承未完成任务的新版本壳 */
function nextPlanVersion(anomaly: Anomaly, order: DispatchOrder, patch: Partial<DispositionPlan>): DispositionPlan {
  const previous = structuredClone(anomaly.plan)
  previous.history = []
  const carriedTasks: PlanTask[] = previous.tasks.map((task) => structuredClone(task))
  const next: DispositionPlan = {
    ...previous,
    status: '待审批',
    tasks: carriedTasks,
    basisOrderId: order.id,
    basisOrderVersion: order.version,
    invalidatedByOrderId: '',
    approvedBy: '',
    approvedAt: '',
    ...patch,
    version: previous.version + 1,
    history: [previous, ...previous.history]
  }
  return next
}

function applyFieldReview(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, review } = payloadAs<{ anomalyId: string; review: FieldReview }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly) return { kind: 'error', message: '异常不存在' }
  if (!review.observed?.trim() || !review.evidence?.trim() || !review.reassessment?.trim()) return { kind: 'error', message: '现场观察、证据清单、重新评估均为必填' }
  anomaly.fieldReviews.unshift({
    ...review,
    version: anomaly.fieldReviews.length + 1,
    afterDispatchChange: anomaly.levelPendingReview,
    levelAtReview: anomaly.responseLevel
  })
  if (anomaly.status === '待现场复核' || anomaly.status === '原因调查中') anomaly.status = '原因调查中'
  anomaly.version += 1
  audit(dataset.audit, dataset.revision, anomalyId, '提交现场复核', review.inspector, `${review.reassessment}（依据：${basisOf(anomaly)}）`)
  return { kind: 'applied', message: `现场复核已提交，${basisOf(anomaly)}` }
}

function applyExpertOpinion(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, opinion } = payloadAs<{ anomalyId: string; opinion: ExpertOpinion }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly) return { kind: 'error', message: '异常不存在' }
  if (!opinion.content?.trim()) return { kind: 'error', message: '意见内容不能为空' }
  anomaly.opinions.unshift(opinion)
  anomaly.version += 1
  audit(dataset.audit, dataset.revision, anomalyId, '补充专业意见', opinion.specialist, `${opinion.conclusion}：${opinion.content}`)
  return { kind: 'applied', message: '专业意见已补充' }
}

function applyPlanSave(dataset: TailingsDataset, write: PendingWrite, recompute: boolean): CommitOutcome {
  const { anomalyId, plan, tasks } = payloadAs<{ anomalyId: string; plan: DispositionPlan; tasks: { content: string; owner: string }[] }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  const order = activeOrderOf(dataset)
  if (!anomaly) return { kind: 'error', message: '异常不存在' }
  if (!order) return { kind: 'error', message: '当前无生效调度令，无法编制方案' }
  if (!plan.owner?.trim() || !plan.deadline || !plan.conditions?.trim()) return { kind: 'error', message: '责任方、截止时间、关闭条件均为必填' }
  if (recompute && anomaly.plan.status !== '失效待重算') {
    return { kind: 'error', message: '当前方案未被新生效调度令作废，无需重算' }
  }
  if (!recompute && anomaly.plan.status === '失效待重算') {
    return { kind: 'error', message: '方案已被新生效调度令作废，必须走「失效重算」而不是普通提交' }
  }
  // 重算继承未完成（含已暂停）任务；普通提交只带表单中的任务
  const inherited = recompute
    ? anomaly.plan.tasks.filter((task) => task.status !== '已完成')
    : []
  const mergedTasks = [
    ...inherited.map((task) => structuredClone(task)),
    ...tasks.filter((task) => task.content.trim()).map((task, index): PlanTask => ({
      id: `PT-${Date.now()}-${index}`,
      content: task.content.trim(),
      owner: task.owner.trim() || plan.owner,
      status: '待执行',
      pausedAt: '',
      pauseReason: ''
    }))
  ]
  const replaced = anomaly.plan
  anomaly.plan = nextPlanVersion(anomaly, order, {
    action: plan.action,
    owner: plan.owner,
    deadline: plan.deadline,
    conditions: plan.conditions,
    // 已启动的联动不随方案换版撤销，仍指向其原始启动依据
    emergencyLinked: !!anomaly.emergency?.active,
    tasks: mergedTasks.length ? mergedTasks : anomaly.plan.tasks
  })
  // 重算即表示方案编制依据已切到新令；联动异常的现场级别仍待追加复核
  if (recompute) {
    anomaly.responseLevel = anomaly.emergency?.active ? anomaly.responseLevel : order.level
    anomaly.levelPendingReview = !!anomaly.emergency?.active
  }
  anomaly.status = anomaly.emergency?.active ? '应急联动' : '待负责人审批'
  anomaly.version += 1
  audit(
    dataset.audit,
    dataset.revision,
    anomalyId,
    recompute ? '处置方案重算提交' : '提交处置方案',
    '当前用户',
    `${recompute ? `旧版V${replaced.version}（依据调度令V${replaced.basisOrderVersion}）失效归档，` : ''}新方案V${anomaly.plan.version}依据调度令V${order.version}编制，措施：${plan.action}，责任方：${plan.owner}；继承未完成任务${inherited.length}项`
  )
  return { kind: 'applied', message: recompute ? `方案已按调度令V${order.version}重算为V${anomaly.plan.version}，待审批` : `处置方案V${anomaly.plan.version}已提交审批` }
}

function applyApprove(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, approver, note, decision, basisAnomalyVersion, basisPlanVersion } = payloadAs<{
    anomalyId: string
    approver: string
    note: string
    decision: '同意' | '不同意'
    basisAnomalyVersion: number
    basisPlanVersion: number
  }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly) return { kind: 'error', message: '异常不存在' }

  // CAS：后到者面对的依据已变（已被前一签批通过/方案换版），只通过一份，后者保留草稿
  const basisChanged = basisAnomalyVersion !== anomaly.version || basisPlanVersion !== anomaly.plan.version
  if (basisChanged) {
    const draft = {
      id: `DR-${Date.now()}`,
      anomalyId,
      approver,
      note,
      basisAnomalyVersion,
      basisPlanVersion,
      decision,
      createdAt: now(),
      basisChangeNote: `签批依据已变化：你打开时为${basisOf({ ...anomaly, version: basisAnomalyVersion, plan: { ...anomaly.plan, version: basisPlanVersion } } as Anomaly)}，当前为${basisOf(anomaly)}；同一异常仅通过一份签批，你的签批保留为草稿。`
    }
    anomaly.approvalDrafts.unshift(draft)
    anomaly.version += 1
    audit(dataset.audit, dataset.revision, anomalyId, '并发签批保留草稿', approver, draft.basisChangeNote)
    return { kind: 'draft', message: `同一异常仅通过一份签批：${approver}的签批到达时依据已变化，已保留为草稿` }
  }

  if (anomaly.plan.status !== '待审批') return { kind: 'error', message: `方案V${anomaly.plan.version}当前为「${anomaly.plan.status}」，不能签批` }
  if (anomaly.severity === '重大' && !anomaly.emergency?.active) {
    return { kind: 'error', message: '重大异常必须先启动应急联动，负责人方可签批' }
  }
  if (decision === '不同意') {
    audit(dataset.audit, dataset.revision, anomalyId, '审批处置方案', approver, `不同意：${note || '退回重编'}`)
    anomaly.version += 1
    return { kind: 'applied', message: '已记录不同意，方案退回重编' }
  }
  anomaly.plan.status = '已批准'
  anomaly.plan.approvedBy = approver
  anomaly.plan.approvedAt = now()
  anomaly.plan.emergencyLinked = !!anomaly.emergency?.active
  anomaly.status = anomaly.emergency?.active ? '应急联动' : '处置执行中'
  anomaly.version += 1
  audit(dataset.audit, dataset.revision, anomalyId, '审批处置方案', approver, `${note || '同意执行'}（通过版本：${basisOf(anomaly)}）`)
  return { kind: 'applied', message: `方案V${anomaly.plan.version}经${approver}签批通过` }
}

function applyEmergencyLink(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, note } = payloadAs<{ anomalyId: string; note: string }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  const order = activeOrderOf(dataset)
  if (!anomaly || !order) return { kind: 'error', message: '异常或生效调度令不存在' }
  if (anomaly.emergency?.active) return { kind: 'error', message: '应急联动已处于启动状态，不得重复启动' }
  if (anomaly.plan.status !== '已批准') return { kind: 'error', message: '方案未经负责人签批，不得启动应急联动' }
  if (anomaly.plan.basisOrderVersion !== order.version) return { kind: 'error', message: '方案依据的调度令已换版，请先重算并签批后再启动联动' }

  const link: EmergencyLink = {
    id: `EL-${Date.now()}`,
    launchedAt: now(),
    launchedBy: '值班负责人 何清',
    basisOrderId: order.id,
    basisOrderVersion: order.version,
    basisLevel: order.level,
    note,
    active: true,
    reviews: []
  }
  anomaly.emergency = link
  anomaly.plan.emergencyLinked = true
  anomaly.status = '应急联动'
  anomaly.plan.tasks.push({ id: `PT-${Date.now()}-0`, content: '通知下游社区巡查、应急队伍集结待命', owner: '应急办', status: '执行中', pausedAt: '', pauseReason: '' })
  anomaly.version += 1
  audit(dataset.audit, dataset.revision, anomalyId, '启动应急联动', link.launchedBy, `按调度令V${order.version}（${order.level}）启动：${note}`)
  return { kind: 'applied', message: `应急联动已按调度令V${order.version}（${order.level}）启动` }
}

function applyEmergencyReview(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, reviewer, conclusion, continued } = payloadAs<{ anomalyId: string; reviewer: string; conclusion: string; continued: boolean }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  const order = activeOrderOf(dataset)
  if (!anomaly?.emergency || !order) return { kind: 'error', message: '已启动的联动或生效调度令不存在' }
  if (!anomaly.levelPendingReview) return { kind: 'error', message: '当前级别已复核，无需追加复核' }
  if (!conclusion?.trim()) return { kind: 'error', message: '复核结论不能为空' }
  const review: EmergencyReview = {
    id: `ER-${Date.now()}`,
    reviewer,
    reviewedAt: now(),
    originalOrderVersion: anomaly.emergency.basisOrderVersion,
    reviewedOrderVersion: order.version,
    conclusion,
    continued
  }
  anomaly.emergency.reviews.unshift(review)
  if (continued) {
    anomaly.responseLevel = order.level
    anomaly.levelPendingReview = false
  }
  anomaly.version += 1
  audit(
    dataset.audit,
    dataset.revision,
    anomalyId,
    '联动追加复核',
    reviewer,
    `联动保留原依据（调度令V${review.originalOrderVersion}/${anomaly.emergency.basisLevel}）；按新令V${review.reviewedOrderVersion}（${order.level}）追加复核，${continued ? '同意按新级别继续联动' : '维持原级别措施，需再次复核'}：${conclusion}`
  )
  return { kind: 'applied', message: continued ? '复核完成，联动继续并改按新级别执行' : '已记录保留意见，联动维持原级别' }
}

function applyResumeTasks(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, taskIds } = payloadAs<{ anomalyId: string; taskIds: string[] }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  const order = activeOrderOf(dataset)
  if (!anomaly || !order) return { kind: 'error', message: '异常或生效调度令不存在' }
  if (anomaly.plan.status !== '已批准') return { kind: 'error', message: '重算方案尚未签批，暂停项不能恢复执行' }
  if (anomaly.plan.basisOrderVersion !== order.version) return { kind: 'error', message: '方案仍依据旧调度令，不能恢复执行' }
  const targets = anomaly.plan.tasks.filter((task) => taskIds.includes(task.id) && task.status === '已暂停')
  if (!targets.length) return { kind: 'error', message: '没有可恢复的暂停项' }
  for (const task of targets) {
    task.status = '执行中'
    task.pausedAt = ''
    task.pauseReason = ''
  }
  anomaly.status = anomaly.emergency?.active ? '应急联动' : '处置执行中'
  anomaly.version += 1
  audit(dataset.audit, dataset.revision, anomalyId, '暂停项恢复执行', '当前用户', `恢复${targets.length}项任务执行（依据：${basisOf(anomaly)}）：${targets.map((task) => task.content).join('；')}`)
  return { kind: 'applied', message: `已恢复${targets.length}项任务执行` }
}

function applyClose(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { anomalyId, note } = payloadAs<{ anomalyId: string; note: string }>(write)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly) return { kind: 'error', message: '异常不存在' }
  if (!anomaly.plan.approvedBy || anomaly.plan.status !== '已批准') return { kind: 'error', message: '处置方案未完成签批，不能关闭' }
  if (!anomaly.fieldReviews.length) return { kind: 'error', message: '缺少现场复核，不能关闭' }
  if (anomaly.plan.tasks.some((task) => task.status === '已暂停')) return { kind: 'error', message: '仍有调度令换版后暂停的任务，先重算并恢复执行' }
  if (anomaly.levelPendingReview) return { kind: 'error', message: '应急联动尚未按新调度令追加复核，不能关闭' }
  if (!note.trim()) return { kind: 'error', message: '关闭说明不能为空' }
  anomaly.status = '已关闭'
  anomaly.closedAt = now()
  if (anomaly.emergency) anomaly.emergency.active = false
  anomaly.version += 1
  audit(dataset.audit, dataset.revision, anomalyId, '关闭异常', anomaly.plan.approvedBy, `${note}（关闭版本：${basisOf(anomaly)}）`)
  return { kind: 'applied', message: '异常已关闭' }
}

function applyDispatchCreate(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const draft = payloadAs<Omit<DispatchOrder, 'id' | 'status' | 'version' | 'supersededOrderId'> & { id?: string }>(write)
  const version = Math.max(0, ...dataset.dispatchOrders.map((order) => order.version)) + 1
  const order: DispatchOrder = {
    ...draft,
    id: draft.id ?? `DO-${Date.now()}`,
    version,
    status: '草稿',
    supersededOrderId: '',
    issuedAt: draft.issuedAt || now()
  }
  dataset.dispatchOrders.unshift(order)
  audit(dataset.audit, dataset.revision, order.id, '调度令拟稿', draft.issuedBy, `${draft.title}（V${version}）拟稿，控制水位${draft.targetWaterLevel}${draft.unit}，响应级别${draft.level}`)
  return { kind: 'applied', message: `调度令V${version}草稿已保存，生效后将触发级联重算` }
}

/** 调度令生效的级联：一次原子迁移内完成旧令作废、方案失效、任务暂停、联动保留依据 */
function applyDispatchActivate(dataset: TailingsDataset, write: PendingWrite): CommitOutcome {
  const { orderId, note } = payloadAs<{ orderId: string; note: string }>(write)
  const incoming = dataset.dispatchOrders.find((order) => order.id === orderId)
  if (!incoming) return { kind: 'error', message: '调度令不存在' }
  if (incoming.status === '已生效') return { kind: 'error', message: '该调度令已生效' }
  if (incoming.status === '作废') return { kind: 'error', message: '已作废的调度令不能生效' }

  const previous = activeOrderOf(dataset)
  incoming.status = '已生效'
  incoming.effectiveAt = now()
  incoming.supersededOrderId = previous?.id ?? ''
  if (previous) previous.status = '作废'

  const affected = dataset.anomalies.filter((anomaly) => affectedByOrder(dataset, anomaly, incoming))
  let invalidated = 0
  let linkedKept = 0
  let paused = 0
  const reason = `调度令V${previous?.version ?? 0}→V${incoming.version}换版，先停住待方案重算`

  for (const anomaly of affected) {
    // 已启动联动：保留原依据，只挂起复核要求，不回写、不撤销
    if (anomaly.emergency?.active) {
      linkedKept += 1
      audit(dataset.audit, dataset.revision, anomaly.id, '联动保留原依据', '系统级联', `应急联动维持调度令V${anomaly.emergency.basisOrderVersion}（${anomaly.emergency.basisLevel}）原依据，须按调度令V${incoming.version}追加复核`)
    }

    // 受影响方案一律失效重算（含已提交未签批、已批准执行中的未完成方案）
    const plan = anomaly.plan
    {
      plan.status = '失效待重算'
      plan.invalidatedByOrderId = incoming.id
      for (const task of plan.tasks) {
        if (task.status !== '已完成') {
          pauseTask(task, reason, incoming.effectiveAt)
          paused += 1
        }
      }
      plan.emergencyLinked = !!anomaly.emergency?.active
      // 保留旧版签批事实（审批人/时间留痕），当前版本状态本身已表示不可再据其执行
      anomaly.status = anomaly.emergency?.active ? '应急联动' : '方案待重算'
      // 级别复核只挂在已启动的联动上：无联动的异常重算方案签批即按新令定级
      anomaly.levelPendingReview = !!anomaly.emergency?.active
      invalidated += 1
      anomaly.version += 1
      audit(dataset.audit, dataset.revision, anomaly.id, '方案失效重算', '系统级联', `方案V${plan.version}依据调度令V${plan.basisOrderVersion}，受新令V${incoming.version}（${incoming.level}）影响失效，须重算；未完成任务已暂停`)
    }
  }

  audit(
    dataset.audit,
    dataset.revision,
    incoming.id,
    '调度令生效',
    incoming.issuedBy,
    `${incoming.title} V${incoming.version}生效，控制水位${incoming.targetWaterLevel}${incoming.unit}，响应级别${incoming.level}。${note ? `备注：${note}。` : ''}影响异常${affected.length}个：方案失效重算${invalidated}个、已启动联动保留原依据${linkedKept}个、暂停未完成任务${paused}项`
  )
  return { kind: 'applied', message: `调度令V${incoming.version}已生效：${invalidated}个方案失效重算，${linkedKept}个联动保留原依据，${paused}项任务暂停` }
}

/**
 * 原子提交：在同一个 dataset 克隆上完成业务变更 + 审计 + revision 前进。
 * 要么完整落地，要么完全不落地（error 时调用方保留待恢复写入）。
 */
export function commitWrite(base: TailingsDataset, write: PendingWrite): CommitResult {
  const dataset = structuredClone(base)

  // 乐观锁：除并发签批按规则落草稿外，依据版本不一致一律拒绝，不产生半成品
  if (write.basisRevision !== dataset.revision) {
    if (write.type === 'approve') {
      dataset.revision += 1
      const outcome = applyApprove(dataset, write)
      return { dataset, outcome }
    }
    return {
      dataset: base,
      outcome: { kind: 'error', message: `依据版本已变化（当前R${dataset.revision}，提交基于R${write.basisRevision}），请刷新后重试` }
    }
  }

  dataset.revision += 1
  let outcome: CommitOutcome
  switch (write.type) {
    case 'fieldReview': outcome = applyFieldReview(dataset, write); break
    case 'expertOpinion': outcome = applyExpertOpinion(dataset, write); break
    case 'plan': outcome = applyPlanSave(dataset, write, false); break
    case 'planRecompute': outcome = applyPlanSave(dataset, write, true); break
    case 'approve': outcome = applyApprove(dataset, write); break
    case 'emergencyLink': outcome = applyEmergencyLink(dataset, write); break
    case 'emergencyReview': outcome = applyEmergencyReview(dataset, write); break
    case 'resumeTasks': outcome = applyResumeTasks(dataset, write); break
    case 'close': outcome = applyClose(dataset, write); break
    case 'dispatchCreate': outcome = applyDispatchCreate(dataset, write); break
    case 'dispatchActivate': outcome = applyDispatchActivate(dataset, write); break
    default: outcome = { kind: 'error', message: '未知写入类型' }
  }

  // 硬错误：回滚整个克隆，revision 不前进，保证不出现半成品
  if (outcome.kind === 'error') return { dataset: base, outcome }
  return { dataset, outcome }
}
