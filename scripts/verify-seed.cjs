/* 校验种子数据内部一致性（页面打开时不应自相矛盾） */
const ts = require('typescript')
const fs = require('fs')
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
}
global.structuredClone = (v) => JSON.parse(JSON.stringify(v))
const path = require('path')
const { seedDataset } = require(path.resolve(__dirname, '../apps/tailings-monitor/src/app/data/seed.ts'))

const errors = []
const active = seedDataset.dispatchOrders.filter(o => o.status === '已生效')
if (active.length !== 1) errors.push(`生效调度令应有1个，实际${active.length}`)
for (const a of seedDataset.anomalies) {
  const tag = `R${seedDataset.revision}/异常V${a.version}/方案V${a.plan.version}/令V${a.plan.basisOrderVersion}`
  // 历史版本不得带活跃联动状态
  for (const h of a.plan.history) {
    if (h.history.length) errors.push(`${a.id} 历史方案V${h.version}不应再嵌套history`)
  }
  if (a.emergency?.active) {
    if (a.plan.emergencyLinked !== true) errors.push(`${a.id} 联动active但plan.emergencyLinked=false ${tag}`)
    if (a.status !== '应急联动') errors.push(`${a.id} 联动active但状态=${a.status} ${tag}`)
    if (!a.levelPendingReview) errors.push(`${a.id} 联动依据V${a.emergency.basisOrderVersion}旧于现行V${active[0].version}，应挂起复核`)
    if (a.emergency.basisOrderVersion !== a.plan.basisOrderVersion) {
      // 允许：方案已失效（basisVersion是方案编制依据），联动依据独立保留——但plan必须标失效
      if (a.plan.status !== '失效待重算') errors.push(`${a.id} 联动依据与方案依据分叉时方案必须标失效`)
    }
  }
  if (a.plan.status === '失效待重算' && !a.plan.invalidatedByOrderId) errors.push(`${a.id} 失效方案缺少invalidatedByOrderId`)
  for (const t of a.plan.tasks) {
    if (t.status === '已暂停' && !t.pauseReason) errors.push(`${a.id} 暂停任务${t.id}缺少原因`)
  }
}
// 审计revision单调不超过当前
const revs = seedDataset.audit.map(x => x.revision)
if (revs.some(r => r > seedDataset.revision)) errors.push('审计存在超过当前revision的事件')

if (errors.length) { console.log('❌ 种子一致性问题：'); errors.forEach(e => console.log(' -', e)); process.exit(1) }
console.log('✅ 种子数据一致：1个现行调度令V' + active[0].version + '，' + seedDataset.anomalies.length + '个异常状态自洽，审计revision合法')
