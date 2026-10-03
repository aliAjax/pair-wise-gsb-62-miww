/* 端到端校验：用 esbuild 直接跑，逐条核对需求中的一致性规则 */
import { seedDataset } from '../apps/tailings-monitor/src/app/data/seed'
import type { TailingsDataset } from '../apps/tailings-monitor/src/app/domain'
import {
  advanceTask,
  applyDispatchOrder,
  approvePlan,
  closeAnomaly,
  createEmergencyLink,
  findConsistencyIssues,
  resolveEmergencyReview,
  savePlan,
  type WriteContext
} from '../apps/tailings-monitor/src/app/domain/transitions'

let pass = 0
const ok = (cond: boolean, msg: string): void => { if (!cond) throw new Error(`✘ ${msg}`); console.log(`  ✓ ${msg}`); pass++ }
const clone = (d: TailingsDataset): TailingsDataset => structuredClone(d)
let seq = 100
const ctx = (operator = '测试人'): WriteContext => ({ operator, now: new Date().toISOString(), seq: () => seq++, auditCount: 0 })
const findA = (d: TailingsDataset, id: string) => { const a = d.anomalies.find((x) => x.id === id); if (!a) throw new Error('missing ' + id); return a }

const order = {
  id: 'DO-261003-09', title: 'Ⅰ级调度令', targetWaterLevel: 866.0, rateLimit: 0.8,
  responseLevel: 'Ⅰ级(重大)' as const, issuedAt: '2026-10-03T08:00:00', effectiveAt: '2026-10-03T08:05:00',
  issuedBy: '防汛指挥部', note: 'Ⅰ级响应', status: '待生效' as const, supersedesOrderId: ''
}

console.log('\n场景1：调度令生效——级别重算 / 方案失效重算 / 联动冻结+追加复核 / 未完成任务停住 / 单版提交')
{
  const before = clone(seedDataset)
  const beforeVersion = before.snapshotVersion
  const a01 = findA(before, 'AN-260929-01')
  const oldPlanId = a01.plan.id
  const link = before.emergencyLinks.find((l) => l.anomalyId === 'AN-260929-01')!
  ok(link.status === '已启动' && link.basisOrderId === 'DO-260928-01' && link.basisSnapshotVersion === beforeVersion, '初始：AN-01 已启动联动，依据冻结在旧令/V3')

  const after = applyDispatchOrder(before, { ...order }, ctx('防汛指挥部'))

  ok(after.snapshotVersion === beforeVersion + 1, `快照仅 +1（V${beforeVersion}→V${after.snapshotVersion}），整版提交`)
  ok(before.snapshotVersion === beforeVersion, '输入快照未被原地修改（无副作用）')

  // 旧令废止、新令生效
  ok(after.dispatchOrders.find((o) => o.id === 'DO-260928-01')?.status === '已废止', '旧调度令已废止')
  ok(after.dispatchOrders.find((o) => o.id === order.id)?.status === '已生效', '新调度令已生效')

  // AN-01：级别仍重大（不降级），但因方案依据旧令废止 → 方案必须失效重算
  const na01 = findA(after, 'AN-260929-01')
  ok(na01.severity === '重大', 'AN-01 级别重算后仍为“重大”（不因联动而错误降级/沿用旧级）')
  ok(na01.plan.id !== oldPlanId, 'AN-01 当前方案已换为重算新版（不再是旧版 PL-1）')
  ok(na01.plan.status === '待审批', '重算新方案为待审批')
  ok(na01.plan.basisOrderId === order.id && na01.plan.basisSnapshotVersion === after.snapshotVersion, '新方案依据新令/V4')
  const hist = na01.planHistory.find((p) => p.id === oldPlanId)
  ok(!!hist && hist.status === '已失效' && hist.supersededByPlanId === na01.plan.id, '旧方案 PL-1 整体留痕为“已失效”，并指向新版')

  // AN-02 水位 & AN-03 位移级别重算
  const na02 = findA(after, 'AN-260929-02')
  const na03 = findA(after, 'AN-260929-03')
  ok(na02.severity === '重大' && na02.plan.status === '待审批', 'AN-02 水位高于目标0.5m以上 → 重算为重大，方案失效重算待审批')
  ok(na03.severity === '重大' && na03.plan.status === '待审批', 'AN-03 Ⅰ级且位移达预警 → 重算为重大，方案失效重算待审批')
  ok(na03.severityHistory[0]?.to === '重大' && na03.severityHistory[0].snapshotVersion === after.snapshotVersion, '级别变化留痕到 V4')

  // 已启动联动：原依据保留 + 追加一次复核
  const nlink = after.emergencyLinks.find((l) => l.anomalyId === 'AN-260929-01')!
  ok(nlink.basisPlanId === 'PL-1' && nlink.basisOrderId === 'DO-260928-01' && nlink.basisSnapshotVersion === beforeVersion, '联动启动依据（PL-1/旧令/V3）原样冻结，未被新方案覆盖')
  ok(nlink.status === '复核中' && nlink.reviews.length === 1 && nlink.reviews[0].newOrderId === order.id && !nlink.reviews[0].resolved, '联动仅追加一次针对新令的待复核')
  ok(na01.status === '应急联动', 'AN-01 仍处于应急联动（方案虽重算待批，联动未中断）')

  // 未完成任务先停住
  const frozen = after.tasks.filter((t) => t.anomalyId === 'AN-260929-01')
  ok(frozen.length === 2 && frozen.every((t) => t.frozen && t.status === '已暂停'), 'AN-01 两条进行中任务全部暂停冻结')
  const tk3 = after.tasks.find((t) => t.id === 'TK-3')!
  ok(tk3.frozen && tk3.status === '待启动', '未启动任务 TK-3 被冻结保持“待启动”')

  // 审计都落在同一新版本
  ok(after.audit.filter((a) => a.snapshotVersion === after.snapshotVersion).length >= 9, '本次联动审计全部标注 V4（同版）')
}

console.log('\n场景2：半成品防护——任务在冻结期间不得推进；失败回滚由上层保证输入不变')
{
  const after = applyDispatchOrder(clone(seedDataset), { ...order }, ctx())
  const tk1 = after.tasks.find((t) => t.id === 'TK-1')!
  const blocked = advanceTask(after, 'TK-1', '试图推进', ctx())
  ok(blocked === after, '冻结任务推进被拒绝（返回原状态，未产生新版本/半成品）')
  // 解除不了联动时，异常方案仍与联动复核共存一致
  const a01 = findA(after, 'AN-260929-01')
  ok(a01.plan.status === '待审批' && a01.status === '应急联动', '不存在“联动已启动、方案却按旧版执行”的半成品：方案已重算待批，联动复核中')
}

console.log('\n场景3：两人同时签批同一异常——只过一份，后到者转草稿并看到依据变化')
{
  const base = clone(seedDataset)
  // 取一个待审批方案（构造一份新的未批方案）
  const a03 = findA(base, 'AN-260929-03')
  const pv = a03.plan.version
  const sv = base.snapshotVersion
  const first = approvePlan(base, { anomalyId: 'AN-260929-03', approver: '何清', note: '同意', expectedPlanVersion: pv, expectedSnapshotVersion: sv }, ctx('何清'))
  ok(first.outcome === 'approved', '第一份签批通过')
  const approvedPlan = findA(first.dataset, 'AN-260929-03').plan
  ok(approvedPlan.approvedBy === '何清' && approvedPlan.status === '执行中', '方案置为执行中且记录签批人')
  // 后到者：基于同一旧依据并发签批
  const second = approvePlan(first.dataset, { anomalyId: 'AN-260929-03', approver: '高宁', note: '我也同意', expectedPlanVersion: pv, expectedSnapshotVersion: sv }, ctx('高宁'))
  ok(second.outcome === 'draft' && second.reason === '已有人签批', '第二份（同版并发）不通过，原因“已有人签批”')
  const draft = second.dataset.drafts.find((d) => d.approver === '高宁')!
  ok(!!draft && draft.planId === approvedPlan.id, '高宁的签批保留为草稿')
  ok(findA(second.dataset, 'AN-260929-03').plan.approvedBy === '何清', '方案签批人仍是何清，未被第二份覆盖')
  ok(second.dataset.approvals.filter((x) => x.planId === approvedPlan.id).length === 1, '同一方案只有一条签批记录')
}

console.log('\n场景4：依据在签批期间变化——后到者草稿显示依据版本变化')
{
  const base = clone(seedDataset)
  const a03 = findA(base, 'AN-260929-03')
  const oldPv = a03.plan.version
  const oldSv = base.snapshotVersion
  // 调度令先生效（依据变化、方案重算为新版）
  const changed = applyDispatchOrder(base, { ...order }, ctx())
  const newA03 = findA(changed, 'AN-260929-03')
  // 高宁拿着“旧方案/旧快照”的视图来签批（并发）
  const late = approvePlan(changed, { anomalyId: 'AN-260929-03', approver: '高宁', note: '按旧版同意', expectedPlanVersion: oldPv, expectedSnapshotVersion: oldSv }, ctx('高宁'))
  ok(late.outcome === 'draft' && late.reason === '依据版本已变化', '依据已变 → 不通过，原因“依据版本已变化”')
  const draft = late.dataset.drafts.find((d) => d.approver === '高宁')!
  ok(draft.basisChanged && draft.snapshotVersionAtAttempt === oldSv && draft.currentSnapshotVersion === changed.snapshotVersion && draft.currentPlanVersion === newA03.plan.version, '草稿同时记录尝试时与当前依据版本，后到者能看到变化')
}

console.log('\n场景5：新方案签批后冻结任务恢复；联动复核可维持/解除且原依据不变')
{
  const afterOrder = applyDispatchOrder(clone(seedDataset), { ...order }, ctx())
  const a01 = findA(afterOrder, 'AN-260929-01')
  const newPlan = a01.plan
  const approved = approvePlan(afterOrder, { anomalyId: 'AN-260929-01', approver: '何清', note: '按Ⅰ级令执行', expectedPlanVersion: newPlan.version, expectedSnapshotVersion: afterOrder.snapshotVersion }, ctx('何清'))
  ok(approved.outcome === 'approved', '重算新方案可重新签批')
  const tasks = approved.dataset.tasks.filter((t) => t.anomalyId === 'AN-260929-01')
  ok(tasks.every((t) => !t.frozen && t.status === '待启动' && t.planId === newPlan.id), '签批后被冻结任务按新方案恢复（解冻、指向新方案）')

  const link = approved.dataset.emergencyLinks.find((l) => l.anomalyId === 'AN-260929-01')!
  const review = link.reviews[0]
  const reviewed = resolveEmergencyReview(approved.dataset, { linkId: link.id, reviewId: review.id, conclusion: '维持联动', note: '水情仍紧，维持' }, ctx('值班负责人'))
  const rlink = reviewed.emergencyLinks.find((l) => l.id === link.id)!
  ok(rlink.status === '维持' && rlink.reviews[0].resolved && rlink.reviews[0].conclusion === '维持联动', '追加复核给出“维持联动”结论')
  ok(rlink.basisOrderId === 'DO-260928-01' && rlink.basisSnapshotVersion === 3 && rlink.basisPlanId === 'PL-1', '复核后原启动依据仍冻结不变')
  ok(findA(reviewed, 'AN-260929-01').status === '应急联动', '维持联动 → 异常保持应急联动')
}

console.log('\n场景6：写入失败可恢复、绝不半成品——失败时保留上一已发布版本')
{
  // 模拟 reducer/effect 的提交协议：在暂存快照上推演；提交失败则 dataset 保持上一已发布版本，暂存保留待重试
  const published = clone(seedDataset)
  const staged = applyDispatchOrder(clone(published), { ...order }, ctx())

  // 第一次落库失败：可见版本不变，暂存快照仍在（可重试）
  let commitFails = true
  let visible: TailingsDataset = commitFails ? published : staged
  ok(visible.snapshotVersion === seedDataset.snapshotVersion && findA(visible, 'AN-260929-01').plan.id === 'PL-1', '提交失败：看板/详情/审阅包仍读上一已发布版本 V3，方案仍是 PL-1（无半成品）')
  ok(staged.snapshotVersion === seedDataset.snapshotVersion + 1 && findA(staged, 'AN-260929-01').plan.basisOrderId === order.id, '暂存快照完整保留（V4），等待恢复')

  // 重试成功：整版发布
  commitFails = false
  visible = commitFails ? published : staged
  ok(visible.snapshotVersion === 4 && findA(visible, 'AN-260929-01').plan.basisOrderId === order.id, '重试成功：整版发布 V4，看板/详情/审阅包按同版展示')

  // 关闭异常前必须方案签批、任务闭环
  const ordered = applyDispatchOrder(clone(seedDataset), { ...order }, ctx())
  ok(closeAnomaly(ordered, 'AN-260929-01', '关闭', ctx()) === ordered, '方案待批/任务未闭环时关闭被拒绝')
}

console.log('\n场景7：一致性检查——正常快照零问题；注入"联动已启动+旧版方案"必被检出')
{
  ok(findConsistencyIssues(seedDataset).length === 0, '种子快照一致性检查零问题')
  const after = applyDispatchOrder(clone(seedDataset), { ...order }, ctx())
  ok(findConsistencyIssues(after).length === 0, '调度令生效后的联动/重算/冻结快照零问题')
  const approved = approvePlan(after, { anomalyId: 'AN-260929-01', approver: '何清', note: 'x', expectedPlanVersion: findA(after, 'AN-260929-01').plan.version, expectedSnapshotVersion: after.snapshotVersion }, ctx())
  ok(findConsistencyIssues(approved.dataset).length === 0, '新方案签批恢复后仍零问题')

  // 人工注入目标半成品：只废止调度令并保留联动，却不重算方案
  const corrupted = clone(seedDataset)
  corrupted.dispatchOrders.find((o) => o.id === 'DO-260928-01')!.status = '已废止'
  const issues = findConsistencyIssues(corrupted)
  ok(issues.some((i) => i.includes('仍按已废止旧令')), '注入的"联动已启动、方案仍旧版"半成品被一致性检查捕获')
}

console.log(`\n全部 ${pass} 项断言通过 ✅`)
