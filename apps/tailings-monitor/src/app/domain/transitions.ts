import type {
  Anomaly,
  ApprovalDraft,
  DispatchOrder,
  DispositionPlan,
  EmergencyConclusion,
  EmergencyLink,
  EmergencyReview,
  ResponseLevel,
  Severity,
  TailingsDataset
} from './models'

/**
 * 所有“写操作”都先产出一个内部完整一致的下一版 dataset（暂存），
 * 再由上层决定提交或回滚。任何跨实体联动（调度令→级别→方案→联动→任务）
 * 都在同一个函数内一次性完成，snapshotVersion 只 +1，杜绝半成品。
 */
export interface WriteContext {
  operator: string
  now: string
  seq: () => number
  /** 本次事务新增审计条数，发布时据此统一盖新版本号 */
  auditCount: number
}

const responseRank = (level: ResponseLevel): number => ({ 'Ⅳ级(常规)': 4, 'Ⅲ级(关注)': 3, 'Ⅱ级(较高)': 2, 'Ⅰ级(重大)': 1 } as const)[level]

const addAudit = (dataset: TailingsDataset, ctx: WriteContext, entityId: string, action: string, detail: string): void => {
  dataset.audit.unshift({
    id: `AUD-${ctx.now.replace(/[-:T.]/g, '')}-${ctx.seq()}`,
    entityId,
    action,
    operator: ctx.operator,
    detail,
    snapshotVersion: dataset.snapshotVersion,
    createdAt: ctx.now
  })
  ctx.auditCount += 1
}

const published = (dataset: TailingsDataset, ctx: WriteContext): TailingsDataset => {
  // audit 为 unshift，本事务新增的 ctx.auditCount 条位于最前；统一改盖新版本号后再自增
  const nextVersion = dataset.snapshotVersion + 1
  for (let i = 0; i < ctx.auditCount && i < dataset.audit.length; i++) dataset.audit[i].snapshotVersion = nextVersion
  dataset.snapshotVersion = nextVersion
  return dataset
}

const nextId = (prefix: string, ctx: WriteContext): string => `${prefix}-${ctx.now.slice(0, 10).replace(/-/g, '')}-${ctx.seq()}`

const pointOf = (dataset: TailingsDataset, pointId: string) => dataset.points.find((point) => point.id === pointId)

/**
 * 依据新调度令重算异常级别。
 * 位移：响应级别抬高，报警门槛按级别收紧（Ⅰ级按预警值即升级，Ⅱ级按1.2倍预警）。
 * 水位：按目标控制水位与当前水位的关系重估。
 */
export function recomputeSeverity(dataset: TailingsDataset, anomaly: Anomaly, order: DispatchOrder): Severity {
  if (anomaly.status === '已关闭') return anomaly.severity
  const point = pointOf(dataset, anomaly.pointId)
  const threshold = point ? dataset.thresholds.find((item) => item.id === point.thresholdId) : undefined

  if (point?.type === '位移' && threshold) {
    if (order.responseLevel === 'Ⅰ级(重大)' && point.currentValue >= threshold.warning) return '重大'
    if (order.responseLevel === 'Ⅱ级(较高)' && point.currentValue >= threshold.warning * 1.2) return '重大'
    if (point.currentValue >= threshold.alarm) return '重大'
    if (point.currentValue >= threshold.warning) return '较高'
    return '关注'
  }

  if (point?.type === '水位') {
    const gap = point.currentValue - order.targetWaterLevel
    if (gap > 0.5) return '重大'
    if (gap > 0) return '较高'
    return '关注'
  }

  // 渗流、降雨等：响应级别Ⅰ/Ⅱ级且本身处于预警以上的，抬升一档
  if (point && point.status !== '正常' && responseRank(order.responseLevel) <= 2) {
    return anomaly.severity === '重大' ? '重大' : '较高'
  }
  return anomaly.severity
}

/** 按异常类型与新调度令编制替换方案 */
function recalculatedPlan(anomaly: Anomaly, oldPlan: DispositionPlan, order: DispatchOrder, ctx: WriteContext): DispositionPlan {
  // 响应级别抬高后，单纯“加密监测”不再满足要求，一律转为降低库水位；其余措施沿用
  const action: DispositionPlan['action'] = oldPlan.action === '加密监测' ? '降低库水位' : oldPlan.action
  return {
    id: nextId('PL', ctx),
    action,
    owner: anomaly.severity === '重大' ? '库区调度班' : oldPlan.owner,
    deadline: ctx.now.slice(0, 11) + '18:00:00',
    conditions: `依据调度令${order.id}（目标水位${order.targetWaterLevel}m、限速${order.rateLimit}m/d、${order.responseLevel}）重算：每2小时复测并核报降库速率，位移速率恢复阈值内且稳定12小时后方可关闭。`,
    emergencyLinked: anomaly.severity === '重大' ? true : oldPlan.emergencyLinked,
    approvedBy: '',
    approvedAt: '',
    status: '待审批',
    basisOrderId: order.id,
    basisSnapshotVersion: 0,
    version: 1,
    recalculatedFromPlanId: oldPlan.id,
    invalidatedAt: '',
    invalidatedReason: '',
    supersededByPlanId: ''
  }
}

/**
 * 调度令生效（一个事务内完成全部联动）：
 * 1) 旧令废止、新令生效；
 * 2) 异常按新令重算级别并留痕；
 * 3) 受影响方案整体失效、旧版入历史，按新令重算新版（待审批）；
 * 4) 已启动联动保留原依据冻结，仅追加一次“变更复核”；
 * 5) 未完成任务一律暂停冻结，待新方案签批后按新方案恢复。
 */
export function applyDispatchOrder(input: TailingsDataset, order: DispatchOrder, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  // 本事务所有审计与依据都指向同一新版本；版本号在结尾由 published() 统一 +1
  const nextSnapshotVersion = dataset.snapshotVersion + 1

  const previous = dataset.dispatchOrders.find((item) => item.status === '已生效' && item.id !== order.id)
  if (previous) {
    previous.status = '已废止'
    addAudit(dataset, ctx, previous.id, '调度令废止', `调度令${order.id}生效，${previous.id}（目标${previous.targetWaterLevel}m）同时废止`)
  }
  order = { ...order, status: '已生效', effectiveAt: order.effectiveAt || ctx.now, supersedesOrderId: previous?.id ?? '' }
  const existing = dataset.dispatchOrders.find((item) => item.id === order.id)
  if (existing) Object.assign(existing, order)
  else dataset.dispatchOrders.unshift(order)
  addAudit(dataset, ctx, order.id, '调度令生效', `目标水位${order.targetWaterLevel}m，降库限速${order.rateLimit}m/d，响应级别${order.responseLevel}；受影响方案失效重算，未完成处置先暂停`)

  for (const anomaly of dataset.anomalies) {
    if (anomaly.status === '已关闭') continue
    const nextSeverity = recomputeSeverity(dataset, anomaly, order)
    const severityChanged = nextSeverity !== anomaly.severity
    // 级别档位变化，或当前未完成方案所依据的调度令已被本令废止，都属于“受影响”
    const basisStale = !!previous && anomaly.plan.status !== '已完成' && anomaly.plan.basisOrderId === previous.id
    const affected = severityChanged || basisStale

    addAudit(dataset, ctx, anomaly.id, '异常级别重算', `依据调度令${order.id}由${anomaly.severity}重算为${nextSeverity}${affected ? `（${severityChanged ? '级别档位变化' : ''}${severityChanged && basisStale ? '、' : ''}${basisStale ? '方案依据旧令废止' : ''}，方案受影响）` : '（级别与方案依据均不受影响）'}`)

    if (severityChanged) {
      anomaly.severityHistory.unshift({ from: anomaly.severity, to: nextSeverity, reason: `调度令${order.id}生效重算`, at: ctx.now, snapshotVersion: nextSnapshotVersion, orderId: order.id })
      anomaly.severity = nextSeverity
    }

    // 已启动联动：冻结原依据，仅追加复核
    const link = dataset.emergencyLinks.find((item) => item.anomalyId === anomaly.id && item.status !== '已解除')
    if (link) {
      const already = link.reviews.some((review) => review.newOrderId === order.id && !review.resolved)
      if (!already) {
        const review: EmergencyReview = {
          id: nextId('ER', ctx),
          requiredAt: ctx.now,
          requiredBy: ctx.operator,
          reason: `调度令由${previous?.id ?? '无'}变更为${order.id}，保留启动依据${link.basisOrderId}@V${link.basisSnapshotVersion}，须复核是否维持联动。`,
          newOrderId: order.id,
          resolved: false,
          resolvedAt: '',
          resolvedBy: '',
          conclusion: '',
          note: ''
        }
        link.reviews.unshift(review)
        link.status = '复核中'
        addAudit(dataset, ctx, link.id, '联动追加复核', `联动保留原依据（${link.basisOrderId}@V${link.basisSnapshotVersion}/方案${link.basisPlanId}），追加复核${review.id}`)
      }
    }

    if (affected && anomaly.plan.status !== '已完成') {
      const oldPlan = anomaly.plan
      const stampedOld: DispositionPlan = {
        ...oldPlan,
        status: '已失效',
        invalidatedAt: ctx.now,
        invalidatedReason: `调度令${order.id}生效，依据${oldPlan.basisOrderId}@V${oldPlan.basisSnapshotVersion}失效`,
        supersededByPlanId: ''
      }
      const fresh = recalculatedPlan({ ...anomaly, severity: nextSeverity }, stampedOld, order, ctx)
      fresh.basisSnapshotVersion = nextSnapshotVersion
      stampedOld.supersededByPlanId = fresh.id

      anomaly.planHistory.unshift(stampedOld)
      anomaly.plan = fresh
      anomaly.status = '待负责人审批'
      anomaly.version += 1
      addAudit(dataset, ctx, anomaly.id, '方案失效重算', `旧方案${stampedOld.id}（${stampedOld.action}，依据${stampedOld.basisOrderId}@V${stampedOld.basisSnapshotVersion}）失效留痕，新方案${fresh.id}按${order.id}@V${nextSnapshotVersion}重算待审批`)

      // 未完成任务先停住
      for (const task of dataset.tasks) {
        if (task.anomalyId === anomaly.id && task.status !== '已完成' && !task.frozen) {
          task.frozen = true
          task.status = task.status === '进行中' ? '已暂停' : '待启动'
          task.frozenReason = `调度令${order.id}生效，等待新方案${fresh.id}签批`
          addAudit(dataset, ctx, task.id, '任务暂停', `未完成项先停住，等待新方案${fresh.id}签批`)
        }
      }
    }
    // 已启动联动即使方案重算也仍处于应急联动（依据冻结、复核中），新方案签批后才解除待批
    if (link) anomaly.status = '应急联动'
    anomaly.version += 1
  }

  return published(dataset, ctx)
}

/** 提交处置方案（编制/修订）。依据版本跟随当前已发布快照。 */
export function savePlan(input: TailingsDataset, anomalyId: string, draft: Pick<DispositionPlan, 'action' | 'owner' | 'deadline' | 'conditions' | 'emergencyLinked'>, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly || !draft.owner || !draft.deadline || !draft.conditions) return input
  if (anomaly.plan.status === '已失效') return input
  const effectiveOrder = dataset.dispatchOrders.find((item) => item.status === '已生效')
  const basisVersion = dataset.snapshotVersion + 1
  anomaly.plan = {
    ...anomaly.plan,
    ...draft,
    approvedBy: '',
    approvedAt: '',
    status: '待审批',
    basisOrderId: effectiveOrder?.id ?? anomaly.plan.basisOrderId,
    basisSnapshotVersion: basisVersion,
    version: anomaly.plan.version + 1,
    invalidatedAt: '',
    invalidatedReason: '',
    supersededByPlanId: ''
  }
  if (anomaly.status === '原因调查中' || anomaly.status === '待现场复核' || anomaly.status === '处置中') anomaly.status = '待负责人审批'
  anomaly.version += 1
  addAudit(dataset, ctx, anomalyId, '提交处置方案', `${draft.action}，责任方${draft.owner}，依据${anomaly.plan.basisOrderId}@V${basisVersion}`)
  return published(dataset, ctx)
}

/**
 * 负责人签批。同一方案只通过一份：
 *  - 依据快照版本或方案版本在打开签批后发生变化 → 不通过，落草稿并标注依据变化；
 *  - 该方案已有人签批 → 不通过，落草稿。
 */
export function approvePlan(
  input: TailingsDataset,
  payload: { anomalyId: string; approver: string; note: string; expectedPlanVersion: number; expectedSnapshotVersion: number },
  ctx: WriteContext
): { dataset: TailingsDataset; outcome: 'approved' | 'draft'; reason?: ApprovalDraft['reason']; basisChanged?: boolean } {
  const dataset: TailingsDataset = structuredClone(input)
  const anomaly = dataset.anomalies.find((item) => item.id === payload.anomalyId)
  if (!anomaly) return { dataset: input, outcome: 'draft' }
  const plan = anomaly.plan
  const already = dataset.approvals.find((item) => item.planId === plan.id)
  const basisChanged = payload.expectedSnapshotVersion !== dataset.snapshotVersion || payload.expectedPlanVersion !== plan.version

  if (already || basisChanged) {
    const reason: ApprovalDraft['reason'] = already ? '已有人签批' : '依据版本已变化'
    const draft: ApprovalDraft = {
      id: nextId('DR', ctx),
      anomalyId: anomaly.id,
      planId: plan.id,
      approver: payload.approver,
      note: payload.note,
      attemptedAt: ctx.now,
      planVersionAtAttempt: payload.expectedPlanVersion,
      currentPlanVersion: plan.version,
      snapshotVersionAtAttempt: payload.expectedSnapshotVersion,
      currentSnapshotVersion: dataset.snapshotVersion,
      reason,
      basisChanged
    }
    dataset.drafts.unshift(draft)
    addAudit(dataset, ctx, anomaly.id, '签批转草稿', `${payload.approver}的签批未通过：${reason}${basisChanged ? `（依据V${payload.expectedSnapshotVersion}/方案V${payload.expectedPlanVersion}→当前V${dataset.snapshotVersion}/V${plan.version}）` : `，${already?.approver}已签批`}`)
    published(dataset, ctx)
    return { dataset, outcome: 'draft', reason, basisChanged }
  }

  if (anomaly.severity === '重大' && !plan.emergencyLinked) return { dataset: input, outcome: 'draft' }

  plan.approvedBy = payload.approver
  plan.approvedAt = ctx.now
  plan.status = '执行中'
  const approvalVersion = dataset.snapshotVersion + 1
  dataset.approvals.unshift({
    planId: plan.id,
    anomalyId: anomaly.id,
    approver: payload.approver,
    approvedAt: ctx.now,
    note: payload.note || '同意执行',
    planVersion: plan.version,
    basisSnapshotVersion: approvalVersion
  })
  anomaly.status = anomaly.plan.emergencyLinked ? '应急联动' : '处置中'
  anomaly.version += 1

  // 新方案签批后，被调度令冻结的任务按新方案恢复
  for (const task of dataset.tasks) {
    if (task.anomalyId === anomaly.id && task.frozen) {
      task.frozen = false
      task.status = '待启动'
      task.planId = plan.id
      task.frozenReason = ''
      addAudit(dataset, ctx, task.id, '任务恢复', `新方案${plan.id}签批，按${plan.basisOrderId}@V${approvalVersion}恢复推进`)
    }
  }
  addAudit(dataset, ctx, anomaly.id, '审批处置方案', `${payload.approver}签批通过${plan.id}（${plan.action}，依据${plan.basisOrderId}@V${plan.basisSnapshotVersion}）`)
  return { dataset: published(dataset, ctx), outcome: 'approved' }
}

/** 启动应急联动：启动时刻依据（方案/调度令/快照版本）永久冻结 */
export function createEmergencyLink(input: TailingsDataset, anomalyId: string, note: string, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly || !anomaly.plan.approvedBy) return input
  if (dataset.emergencyLinks.some((item) => item.anomalyId === anomalyId && item.status !== '已解除')) return input
  const link: EmergencyLink = {
    id: nextId('EL', ctx),
    anomalyId,
    level: anomaly.severity,
    startedAt: ctx.now,
    startedBy: ctx.operator,
    basisPlanId: anomaly.plan.id,
    basisOrderId: anomaly.plan.basisOrderId,
    basisSnapshotVersion: anomaly.plan.basisSnapshotVersion,
    basisNote: note,
    status: '已启动',
    reviews: []
  }
  dataset.emergencyLinks.unshift(link)
  anomaly.plan.emergencyLinked = true
  anomaly.status = '应急联动'
  anomaly.version += 1
  addAudit(dataset, ctx, anomalyId, '启动应急联动', `冻结启动依据：方案${link.basisPlanId}/${link.basisOrderId}@V${link.basisSnapshotVersion}；${note}`)
  return published(dataset, ctx)
}

/** 对调度令变更追加的联动复核给出结论；原启动依据不变 */
export function resolveEmergencyReview(
  input: TailingsDataset,
  payload: { linkId: string; reviewId: string; conclusion: EmergencyConclusion; note: string },
  ctx: WriteContext
): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const link = dataset.emergencyLinks.find((item) => item.id === payload.linkId)
  const review = link?.reviews.find((item) => item.id === payload.reviewId)
  if (!link || !review || review.resolved) return input
  review.resolved = true
  review.resolvedAt = ctx.now
  review.resolvedBy = ctx.operator
  review.conclusion = payload.conclusion
  review.note = payload.note
  const pending = link.reviews.some((item) => !item.resolved)
  link.status = pending ? '复核中' : payload.conclusion === '解除联动' ? '已解除' : '维持'
  const anomaly = dataset.anomalies.find((item) => item.id === link.anomalyId)
  if (payload.conclusion === '解除联动') {
    if (anomaly && anomaly.status === '应急联动') anomaly.status = '处置中'
  } else {
    if (anomaly) anomaly.status = '应急联动'
  }
  addAudit(dataset, ctx, link.id, '联动复核结论', `${payload.conclusion}；原启动依据${link.basisOrderId}@V${link.basisSnapshotVersion}保持不变。${payload.note}`)
  return published(dataset, ctx)
}

/** 推进任务（冻结的任务不得推进） */
export function advanceTask(input: TailingsDataset, taskId: string, result: string, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const task = dataset.tasks.find((item) => item.id === taskId)
  if (!task || task.frozen || task.status === '已完成') return input
  task.status = '已完成'
  task.result = result
  task.completedAt = ctx.now
  addAudit(dataset, ctx, taskId, '任务完成', result)
  return published(dataset, ctx)
}

/** 关闭异常：要求方案已签批、具备现场复核、任务已闭环 */
export function closeAnomaly(input: TailingsDataset, anomalyId: string, note: string, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly || !anomaly.plan.approvedBy || !anomaly.fieldReviews.length || !note.trim()) return input
  const openTasks = dataset.tasks.some((task) => task.anomalyId === anomalyId && task.status !== '已完成')
  if (openTasks) return input
  anomaly.status = '已关闭'
  anomaly.closedAt = ctx.now
  anomaly.plan.status = '已完成'
  anomaly.version += 1
  for (const link of dataset.emergencyLinks) {
    if (link.anomalyId === anomalyId && link.status !== '已解除') link.status = '已解除'
  }
  addAudit(dataset, ctx, anomalyId, '关闭异常', `${note}；归档依据${anomaly.plan.basisOrderId}@V${anomaly.plan.basisSnapshotVersion}`)
  return published(dataset, ctx)
}

export function submitFieldReview(input: TailingsDataset, anomalyId: string, review: { inspector: string; observed: string; evidence: string; reassessment: string }, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly || !review.observed || !review.evidence || !review.reassessment) return input
  anomaly.fieldReviews.unshift({ id: nextId('FR', ctx), arrivedAt: ctx.now, ...review, version: anomaly.fieldReviews.length + 1 })
  if (anomaly.status === '待现场复核') anomaly.status = '原因调查中'
  anomaly.version += 1
  addAudit(dataset, ctx, anomalyId, '提交现场复核', review.reassessment)
  return published(dataset, ctx)
}

export function addExpertOpinion(input: TailingsDataset, anomalyId: string, opinion: { specialist: string; discipline: Anomaly['opinions'][number]['discipline']; content: string; conclusion: Anomaly['opinions'][number]['conclusion'] }, ctx: WriteContext): TailingsDataset {
  const dataset: TailingsDataset = structuredClone(input)
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId)
  if (!anomaly || !opinion.content) return input
  anomaly.opinions.unshift({ id: nextId('OP', ctx), createdAt: ctx.now, ...opinion })
  anomaly.version += 1
  addAudit(dataset, ctx, anomalyId, '补充专业意见', `${opinion.specialist} ${opinion.conclusion}：${opinion.content}`)
  return published(dataset, ctx)
}

/**
 * 一致性检查：返回当前快照中的“半成品”问题清单。
 * 正常事务结果应为空；非空即表示存在“联动已启动而方案仍按废止旧令执行”等越界状态。
 */
export function findConsistencyIssues(dataset: TailingsDataset): string[] {
  const issues: string[] = []
  const isVoid = (orderId: string): boolean => dataset.dispatchOrders.some((o) => o.id === orderId && o.status === '已废止')
  for (const link of dataset.emergencyLinks) {
    if (link.status === '已解除') continue
    const anomaly = dataset.anomalies.find((item) => item.id === link.anomalyId)
    if (!anomaly) {
      issues.push(`联动${link.id}找不到异常${link.anomalyId}`)
      continue
    }
    const plan = anomaly.plan
    if (plan.status === '执行中' && isVoid(plan.basisOrderId)) {
      issues.push(`联动${link.id}已启动，但异常${anomaly.id}方案${plan.id}仍按已废止旧令${plan.basisOrderId}执行（方案未重算）`)
    }
    if (plan.id !== link.basisPlanId && !link.reviews.some((review) => review.newOrderId === plan.basisOrderId)) {
      issues.push(`联动${link.id}已启动，异常${anomaly.id}方案已换版(${plan.id})但缺少变更复核`)
    }
  }
  for (const anomaly of dataset.anomalies) {
    if (anomaly.plan.status === '已失效' && anomaly.status !== '待负责人审批' && anomaly.status !== '应急联动') {
      issues.push(`异常${anomaly.id}方案已失效但状态仍为${anomaly.status}`)
    }
    for (const task of dataset.tasks) {
      if (task.anomalyId === anomaly.id && task.status !== '已完成' && task.frozen !== (task.frozenReason !== '')) {
        issues.push(`任务${task.id}冻结标记与冻结原因不一致`)
      }
    }
  }
  return issues
}
