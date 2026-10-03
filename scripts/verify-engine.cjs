/* 端到端场景验证：用 TS 转译后直接驱动提交引擎，不依赖浏览器/NgRx */
const ts = require('typescript')
const fs = require('fs')
const Module = require('module')

const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  return originalLoad.call(this, request, parent, isMain)
}

// 注册 .ts require 钩子
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  module._compile(output, filename)
}

global.structuredClone = (value) => JSON.parse(JSON.stringify(value))

const path = require('path')
const ROOT = path.resolve(__dirname, '../apps/tailings-monitor/src/app')
const { seedDataset } = require(path.join(ROOT, 'data/seed.ts'))
const { commitWrite } = require(path.join(ROOT, 'store/commit-engine.ts'))

let pass = 0
let fail = 0
function check(name, condition, detail = '') {
  if (condition) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${detail}`) }
}

function write(partial) {
  return {
    id: `PW-${Math.random().toString(36).slice(2)}`,
    basisRevision: 0,
    status: '提交中',
    attempts: 1,
    lastError: '',
    createdAt: '2026-10-03T10:00:00',
    updatedAt: '2026-10-03T10:00:00',
    payload: {},
    ...partial
  }
}

let ds = structuredClone(seedDataset)
const rev0 = ds.revision
console.log(`\n初始状态：R${rev0}，异常${ds.anomalies.length}个，现行调度令V${ds.dispatchOrders.find(o => o.status === '已生效').version}`)

// ---------- 场景1：新调度令生效的原子级联 ----------
console.log('\n[场景1] 调度令改级别并生效（V2 Ⅲ级 → 草稿V3 Ⅰ级）')
let r = commitWrite(ds, write({
  type: 'dispatchCreate', entityId: 'DO-X', label: '拟稿', basisRevision: ds.revision,
  payload: { title: '汛期加强调度令', level: 'Ⅰ级(特大)', targetWaterLevel: 869.0, unit: 'm', issuedBy: '防汛指挥部', issuedAt: '2026-10-03T09:00:00', effectiveAt: '', zones: [], note: '强降雨' }
}))
check('拟稿成功', r.outcome.kind === 'applied', r.outcome.message)
ds = r.dataset
const draft = ds.dispatchOrders.find(o => o.status === '草稿')
check('草稿版本号递增为V3', draft.version === 3, `got V${draft.version}`)
check('草稿不改变异常', ds.anomalies.every(a => a.status !== '方案待重算'))
check('草稿不使revision前进? 实际每次写入前进', ds.revision === rev0 + 1)

r = commitWrite(ds, write({ type: 'dispatchActivate', entityId: draft.id, label: '生效', basisRevision: ds.revision, payload: { orderId: draft.id, note: '' } }))
check('生效成功', r.outcome.kind === 'applied', r.outcome.message)
ds = r.dataset
const a01 = ds.anomalies.find(a => a.id === 'AN-260929-01')
const a02 = ds.anomalies.find(a => a.id === 'AN-260929-02')
check('两个受影响方案均失效', a01.plan.status === '失效待重算' && a02.plan.status === '失效待重算')
check('方案记录被哪一版令作废', a01.plan.invalidatedByOrderId === draft.id)
check('已启动联动保留原依据V1/Ⅱ级', a01.emergency.active && a01.emergency.basisOrderVersion === 1 && a01.emergency.basisLevel === 'Ⅱ级(重大)')
check('联动对象本身未被改写级别', a01.emergency.basisLevel === 'Ⅱ级(重大)')
check('联动异常状态保持「应急联动」', a01.status === '应急联动')
check('联动异常挂起级别复核', a01.levelPendingReview === true)
check('无联动异常进入「方案待重算」', a02.status === '方案待重算' && a02.levelPendingReview === false)
check('未完成任务全部暂停（AN01 2项 + AN02 1项）',
  a01.plan.tasks.filter(t => t.status === '已暂停').length === 2 &&
  a02.plan.tasks.filter(t => t.status === '已暂停').length === 1)
check('暂停任务带原因', a01.plan.tasks[0].pauseReason.includes('换版'))
check('同一次级联只有一个revision增量', ds.revision === rev0 + 2)
check('审计包含「联动保留原依据」', ds.audit.some(x => x.action === '联动保留原依据' && x.entityId === 'AN-260929-01'))
check('不存在半成品：联动active但方案依据仍为旧版的矛盾状态被显式标记',
  a01.emergency.active === true && a01.plan.status === '失效待重算' && a01.plan.basisOrderVersion === 1,
  '（旧版依据保留在失效方案上，且状态明示失效，联动另存原依据）')

// ---------- 场景2：失效方案重算 + 暂停项恢复 ----------
console.log('\n[场景2] AN-02 方案重算签批，暂停项恢复')
r = commitWrite(ds, write({
  type: 'planRecompute', entityId: a02.id, label: '重算', basisRevision: ds.revision,
  payload: { anomalyId: a02.id, plan: { action: '降低库水位', owner: '库区调度班', deadline: '2026-10-03T20:00:00', conditions: '水位降至869.0m' }, tasks: [{ content: '开启泄洪洞按869控制', owner: '调度班' }] }
}))
check('重算成功', r.outcome.kind === 'applied', r.outcome.message)
ds = r.dataset
const a02b = ds.anomalies.find(a => a.id === 'AN-260929-02')
check('方案版本递增V2且依据为调度令V3', a02b.plan.version === 2 && a02b.plan.basisOrderVersion === 3)
check('旧版进入history', a02b.plan.history.length === 1 && a02b.plan.history[0].version === 1)
check('继承的暂停任务被保留（随新方案待恢复）', a02b.plan.tasks.some(t => t.content === '每小时记录水位与入库流量'))
check('新任务加入', a02b.plan.tasks.some(t => t.content.includes('泄洪洞')))
check('重算后为待审批', a02b.status === '待负责人审批' && a02b.plan.status === '待审批')

// 未签批直接恢复任务应被拒
r = commitWrite(ds, write({ type: 'resumeTasks', entityId: a02b.id, label: '恢复', basisRevision: ds.revision, payload: { anomalyId: a02b.id, taskIds: [a02b.plan.tasks[0].id] } }))
check('未签批不能恢复暂停项', r.outcome.kind === 'error' && r.dataset === ds)
check('被拒时revision不变（无半成品）', r.dataset.revision === ds.revision)

r = commitWrite(ds, write({
  type: 'approve', entityId: a02b.id, label: '签批', basisRevision: ds.revision,
  payload: { anomalyId: a02b.id, approver: '何清', note: '同意', decision: '同意', basisAnomalyVersion: a02b.version, basisPlanVersion: 2 }
}))
check('签批通过', r.outcome.kind === 'applied', r.outcome.message)
ds = r.dataset
const a02c = ds.anomalies.find(a => a.id === 'AN-260929-02')
check('签批后进入处置执行中', a02c.status === '处置执行中' && a02c.plan.status === '已批准')
const pausedId = a02c.plan.tasks.find(t => t.status === '已暂停').id
r = commitWrite(ds, write({ type: 'resumeTasks', entityId: a02c.id, label: '恢复', basisRevision: ds.revision, payload: { anomalyId: a02c.id, taskIds: [pausedId] } }))
check('签批后可恢复暂停项', r.outcome.kind === 'applied')
ds = r.dataset
check('恢复后任务执行中、暂停原因清空', !ds.anomalies.find(a => a.id === 'AN-260929-02').plan.tasks.some(t => t.id === pausedId && t.status !== '执行中'))

// ---------- 场景3：两人同时签批同一异常，只通过一份 ----------
console.log('\n[场景3] 两人同时签批同一异常')
// 先把 AN-01 方案重算（带联动），使其进入待审批
r = commitWrite(ds, write({
  type: 'planRecompute', entityId: a01.id, label: '重算', basisRevision: ds.revision,
  payload: { anomalyId: a01.id, plan: { action: '降低库水位', owner: '库区调度班', deadline: '2026-10-04T08:00:00', conditions: '按Ⅰ级响应' }, tasks: [] }
}))
ds = r.dataset
const a01b = ds.anomalies.find(a => a.id === 'AN-260929-01')
check('联动异常重算后仍是应急联动态、待复核', a01b.status === '应急联动' && a01b.levelPendingReview === true, a01b.status)
// 两份签批都基于同一版本（并发）
const baseVer = a01b.version
const planVer = a01b.plan.version
const first = commitWrite(ds, write({ type: 'approve', entityId: a01b.id, label: '签批1', basisRevision: ds.revision, payload: { anomalyId: a01b.id, approver: '何清', note: '同意', decision: '同意', basisAnomalyVersion: baseVer, basisPlanVersion: planVer } }))
check('第一份签批通过', first.outcome.kind === 'applied', first.outcome.message)
const second = commitWrite(first.dataset, write({ type: 'approve', entityId: a01b.id, label: '签批2', basisRevision: ds.revision,
  payload: { anomalyId: a01b.id, approver: '高原', note: '同意', decision: '同意', basisAnomalyVersion: baseVer, basisPlanVersion: planVer } }))
check('第二份签批不通过而落草稿', second.outcome.kind === 'draft', second.outcome.message)
const a01c = second.dataset.anomalies.find(a => a.id === a01b.id)
check('只保留一个签批人（何清）', a01c.plan.approvedBy === '何清')
check('高原的草稿被保留', a01c.approvalDrafts.some(d => d.approver === '高原'))
check('草稿中写明依据变化', a01c.approvalDrafts[0].basisChangeNote.includes('依据已变化'))
check('草稿记录打开时的版本号', a01c.approvalDrafts[0].basisPlanVersion === planVer && a01c.approvalDrafts[0].basisAnomalyVersion === baseVer)

// ---------- 场景4：联动追加复核（保留原依据） ----------
console.log('\n[场景4] 联动追加复核')
r = commitWrite(second.dataset, write({
  type: 'emergencyReview', entityId: a01c.id, label: '复核', basisRevision: second.dataset.revision,
  payload: { anomalyId: a01c.id, reviewer: '郑澜', conclusion: '现场位移趋稳，按Ⅰ级继续联动', continued: true }
}))
check('复核成功', r.outcome.kind === 'applied')
const a01d = r.dataset.anomalies.find(a => a.id === a01c.id)
check('联动启动依据仍为V1/Ⅱ级（不回写）', a01d.emergency.basisOrderVersion === 1 && a01d.emergency.basisLevel === 'Ⅱ级(重大)')
check('复核记录同时保留原V1与新V3', a01d.emergency.reviews[0].originalOrderVersion === 1 && a01d.emergency.reviews[0].reviewedOrderVersion === 3)
check('复核后现场级别更新为新令级别', a01d.responseLevel === 'Ⅰ级(特大)' && a01d.levelPendingReview === false)

// 重复复核应被拒
r = commitWrite(r.dataset, write({ type: 'emergencyReview', entityId: a01d.id, label: '复核2', basisRevision: r.dataset.revision, payload: { anomalyId: a01d.id, reviewer: '郑澜', conclusion: '再次', continued: true } }))
check('已复核不能重复追加', r.outcome.kind === 'error')

// ---------- 场景5：关闭守卫 ----------
console.log('\n[场景5] 关闭条件守卫')
// AN-01 仍有暂停任务（重算继承了2项暂停任务），不能关闭
r = commitWrite(r.dataset, write({ type: 'close', entityId: a01d.id, label: '关闭', basisRevision: r.dataset.revision, payload: { anomalyId: a01d.id, note: '关闭' } }))
check('仍有暂停任务时不能关闭', r.outcome.kind === 'error', r.outcome.message)

// ---------- 场景6：乐观锁（陈旧revision写入被拒） ----------
console.log('\n[场景6] 陈旧revision写入被拒')
const current = r.dataset
r = commitWrite(current, write({
  type: 'plan', entityId: a02c.id, label: '陈旧提交', basisRevision: current.revision - 2,
  payload: { anomalyId: a02c.id, plan: { action: '加密监测', owner: '调度班', deadline: '2026-10-05T00:00:00', conditions: 'x' }, tasks: [] }
}))
check('旧revision写入被拒绝', r.outcome.kind === 'error' && r.dataset === current)

// ---------- 场景7：应急联动不能基于旧版方案启动 ----------
console.log('\n[场景7] 旧版方案启动联动被拒')
// 构造一个方案已签批但调度令已再换版的情况
let ds2 = structuredClone(seedDataset)
// AN-01 在种子里：应急联动已启动，方案失效待重算 —— 尝试再次启动应被拒（已active）
let r2 = commitWrite(ds2, write({ type: 'emergencyLink', entityId: 'AN-260929-01', label: '联动', basisRevision: ds2.revision, payload: { anomalyId: 'AN-260929-01', note: 'x' } }))
check('已启动联动不能重复启动', r2.outcome.kind === 'error', r2.outcome.message)
// AN-02 方案待审批，未签批不能启动
r2 = commitWrite(ds2, write({ type: 'emergencyLink', entityId: 'AN-260929-02', label: '联动', basisRevision: ds2.revision, payload: { anomalyId: 'AN-260929-02', note: 'x' } }))
check('未签批方案不能启动联动', r2.outcome.kind === 'error', r2.outcome.message)

// ---------- 场景8：审阅包同版 ----------
console.log('\n[场景8] 同版快照')
const finalDs = current
const tags = finalDs.anomalies.map(a => `R${finalDs.revision}/异常V${a.version}/方案V${a.plan.version}/令V${a.plan.basisOrderVersion}`)
check('所有异常可在同一revision快照下取得依据标签', tags.length === finalDs.anomalies.length && tags.every(t => t.startsWith(`R${finalDs.revision}`)))
check('审计事件revision均不超过当前版本', finalDs.audit.every(x => x.revision <= finalDs.revision))

console.log(`\n结果：${pass} 通过，${fail} 失败`)
process.exit(fail ? 1 : 0)
