import type { TailingsDataset } from '../domain'

/**
 * 初始快照 V3（此前阈值与方案调整累计到 V3）。
 * 当前生效调度令为汛期Ⅱ级（较高）降库令；
 * AN-260929-01 已按该令签批方案并启动应急联动（联动依据冻结在 V3）；
 * 新令一旦生效：联动保留 V3 依据并追加复核，受影响方案失效重算，未完成任务暂停。
 */
export const seedDataset: TailingsDataset = {
  snapshotVersion: 3,
  points: [
    { id: 'P-D01', name: '主坝顶部位移点 D01', zone: '主坝', type: '位移', longitude: 112.832, latitude: 40.116, status: '异常', currentValue: 18.7, unit: 'mm', thresholdId: 'T-D', lastInspectionAt: '2026-09-29T08:20:00' },
    { id: 'P-D02', name: '主坝下游位移点 D02', zone: '主坝', type: '位移', longitude: 112.837, latitude: 40.111, status: '预警', currentValue: 12.4, unit: 'mm', thresholdId: 'T-D', lastInspectionAt: '2026-09-29T08:10:00' },
    { id: 'P-W01', name: '库内水位计 W01', zone: '库区', type: '水位', longitude: 112.846, latitude: 40.121, status: '预警', currentValue: 873.4, unit: 'm', thresholdId: 'T-W', lastInspectionAt: '2026-09-29T07:55:00' },
    { id: 'P-S01', name: '主坝渗流计 S01', zone: '主坝', type: '渗流', longitude: 112.827, latitude: 40.106, status: '正常', currentValue: 1.8, unit: 'L/s', thresholdId: 'T-S', lastInspectionAt: '2026-09-29T07:40:00' },
    { id: 'P-R01', name: '库区雨量站 R01', zone: '库区', type: '降雨', longitude: 112.861, latitude: 40.132, status: '正常', currentValue: 24.6, unit: 'mm/h', thresholdId: 'T-R', lastInspectionAt: '2026-09-29T08:00:00' }
  ],
  thresholds: [
    { id: 'T-D', type: '位移', warning: 10, alarm: 16, changeRate: 3, unit: 'mm/d', enabled: true, version: 4 },
    { id: 'T-W', type: '水位', warning: 871, alarm: 873, changeRate: 0.5, unit: 'm/h', enabled: true, version: 3 },
    { id: 'T-S', type: '渗流', warning: 2.2, alarm: 3, changeRate: 0.4, unit: 'L/s', enabled: true, version: 5 },
    { id: 'T-R', type: '降雨', warning: 30, alarm: 50, changeRate: 10, unit: 'mm/h', enabled: true, version: 2 }
  ],
  readings: [
    { id: 'RD-1', pointId: 'P-D01', value: 18.7, unit: 'mm', capturedAt: '2026-09-29T08:20:00', deviceId: 'GNSS-D01', quality: '有效' },
    { id: 'RD-2', pointId: 'P-D01', value: 16.2, unit: 'mm', capturedAt: '2026-09-29T07:20:00', deviceId: 'GNSS-D01', quality: '有效' },
    { id: 'RD-3', pointId: 'P-D01', value: 13.8, unit: 'mm', capturedAt: '2026-09-29T06:20:00', deviceId: 'GNSS-D01', quality: '有效' },
    { id: 'RD-4', pointId: 'P-W01', value: 873.4, unit: 'm', capturedAt: '2026-09-29T07:55:00', deviceId: 'WL-W01', quality: '有效' }
  ],
  dispatchOrders: [
    {
      id: 'DO-260928-01',
      title: '汛期库水位调度令（Ⅱ级 较高）',
      targetWaterLevel: 870.0,
      rateLimit: 0.5,
      responseLevel: 'Ⅱ级(较高)',
      issuedAt: '2026-09-28T09:00:00',
      effectiveAt: '2026-09-28T09:30:00',
      issuedBy: '防汛指挥部',
      note: '汛期按Ⅱ级响应控制库水位，日降幅不超过0.5m/d。',
      status: '已生效',
      supersedesOrderId: ''
    }
  ],
  anomalies: [
    {
      id: 'AN-260929-01', pointId: 'P-D01', title: '主坝D01累计位移超过报警阈值', severity: '重大', status: '应急联动', openedAt: '2026-09-29T08:25:00', owner: '坝体安全组', triggerReadingId: 'RD-1', observedValue: '18.7 mm，昨日变化4.2 mm/d', version: 7, closedAt: '',
      fieldReviews: [{ id: 'FR-1', inspector: '宋立', arrivedAt: '2026-09-29T09:10:00', observed: '坝顶排水沟未见明显开裂，D01附近无新增裂缝，基准点稳定。', evidence: 'D01近景照片、基准点复核记录、GNSS原始观测文件', reassessment: '读数有效，位移趋势仍上升，建议立即降低库水位并加密监测。', version: 2 }],
      opinions: [
        { id: 'OP-1', specialist: '周岩', discipline: '岩土', content: '近三日位移速率持续高于阈值，需结合孔隙水压力分析潜在滑面。', conclusion: '支持结论', createdAt: '2026-09-29T10:20:00' },
        { id: 'OP-2', specialist: '许洁', discipline: '水文', content: '库水位仍接近警戒线，建议优先降低库水位并核对上游来水。', conclusion: '补充证据', createdAt: '2026-09-29T10:45:00' }
      ],
      plan: { id: 'PL-1', action: '降低库水位', owner: '库区调度班', deadline: '2026-09-29T18:00:00', conditions: '每2小时复测D01、D02和W01；位移速率恢复至3mm/d以下并稳定12小时后，负责人可关闭异常。', emergencyLinked: true, approvedBy: '何清', approvedAt: '2026-09-29T11:00:00', status: '执行中', basisOrderId: 'DO-260928-01', basisSnapshotVersion: 3, version: 2, recalculatedFromPlanId: '', invalidatedAt: '', invalidatedReason: '', supersededByPlanId: '' },
      planHistory: [],
      severityHistory: []
    },
    {
      id: 'AN-260929-02', pointId: 'P-W01', title: '库水位短时上升速率超预警值', severity: '较高', status: '原因调查中', openedAt: '2026-09-29T08:00:00', owner: '库区调度班', triggerReadingId: 'RD-4', observedValue: '873.4 m，1小时上升0.6 m', version: 4, closedAt: '',
      fieldReviews: [],
      opinions: [{ id: 'OP-3', specialist: '许洁', discipline: '水文', content: '上游降雨汇流导致入湖量增加，需核实泄洪闸状态。', conclusion: '支持结论', createdAt: '2026-09-29T09:00:00' }],
      plan: { id: 'PL-2', action: '加密监测', owner: '库区调度班', deadline: '2026-09-29T14:00:00', conditions: '每小时记录水位与入库流量，达到874.0m时启动应急联动。', emergencyLinked: false, approvedBy: '', approvedAt: '', status: '编制中', basisOrderId: 'DO-260928-01', basisSnapshotVersion: 3, version: 1, recalculatedFromPlanId: '', invalidatedAt: '', invalidatedReason: '', supersededByPlanId: '' },
      planHistory: [],
      severityHistory: []
    },
    {
      id: 'AN-260929-03', pointId: 'P-D02', title: '主坝D02位移持续增大（预警）', severity: '较高', status: '待负责人审批', openedAt: '2026-09-29T09:05:00', owner: '坝体安全组', triggerReadingId: 'RD-2', observedValue: '12.4 mm，较前日+2.6 mm', version: 3, closedAt: '',
      fieldReviews: [{ id: 'FR-2', inspector: '宋立', arrivedAt: '2026-09-29T09:40:00', observed: 'D02测斜管未见错动，坡面无新增渗水点。', evidence: 'D02巡查照片、测斜数据', reassessment: '趋势需关注，建议加密监测并纳入降库联动评估。', version: 1 }],
      opinions: [],
      plan: { id: 'PL-3', action: '加密监测', owner: '监测班', deadline: '2026-09-30T08:00:00', conditions: '每4小时复测D02；若Ⅰ级响应生效且位移达预警值，升级为重大并降库。', emergencyLinked: false, approvedBy: '', approvedAt: '', status: '待审批', basisOrderId: 'DO-260928-01', basisSnapshotVersion: 3, version: 1, recalculatedFromPlanId: '', invalidatedAt: '', invalidatedReason: '', supersededByPlanId: '' },
      planHistory: [],
      severityHistory: []
    }
  ],
  tasks: [
    { id: 'TK-1', planId: 'PL-1', anomalyId: 'AN-260929-01', title: '按0.5m/d降低库水位至870.0m', owner: '库区调度班', status: '进行中', frozen: false, frozenReason: '', result: '', completedAt: '' },
    { id: 'TK-2', planId: 'PL-1', anomalyId: 'AN-260929-01', title: '每2小时复测D01/D02/W01', owner: '监测班', status: '进行中', frozen: false, frozenReason: '', result: '', completedAt: '' },
    { id: 'TK-3', planId: 'PL-3', anomalyId: 'AN-260929-03', title: '每4小时复测D02', owner: '监测班', status: '待启动', frozen: false, frozenReason: '', result: '', completedAt: '' }
  ],
  emergencyLinks: [
    {
      id: 'EL-1',
      anomalyId: 'AN-260929-01',
      level: '重大',
      startedAt: '2026-09-29T11:10:00',
      startedBy: '值班负责人',
      basisPlanId: 'PL-1',
      basisOrderId: 'DO-260928-01',
      basisSnapshotVersion: 3,
      basisNote: '重大异常联动应急值班，通知下游巡查。',
      status: '已启动',
      reviews: []
    }
  ],
  approvals: [
    { planId: 'PL-1', anomalyId: 'AN-260929-01', approver: '何清', approvedAt: '2026-09-29T11:00:00', note: '同意按Ⅱ级调度令降库，严格执行关闭条件。', planVersion: 2, basisSnapshotVersion: 3 }
  ],
  drafts: [],
  audit: [
    { id: 'A-1', entityId: 'P-D01', action: '生成异常', operator: '阈值引擎', detail: '累计位移18.7mm超过报警阈值16mm', snapshotVersion: 1, createdAt: '2026-09-29T08:25:00' },
    { id: 'A-2', entityId: 'AN-260929-01', action: '提交现场复核', operator: '宋立', detail: '原始读数有效，位移趋势仍上升', snapshotVersion: 2, createdAt: '2026-09-29T09:25:00' },
    { id: 'A-3', entityId: 'AN-260929-01', action: '补充专业意见', operator: '周岩', detail: '建议结合孔隙水压力分析潜在滑面', snapshotVersion: 2, createdAt: '2026-09-29T10:20:00' },
    { id: 'A-4', entityId: 'DO-260928-01', action: '调度令生效', operator: '防汛指挥部', detail: '目标水位870.0m，Ⅱ级响应，降库限速0.5m/d', snapshotVersion: 3, createdAt: '2026-09-28T09:30:00' },
    { id: 'A-5', entityId: 'AN-260929-01', action: '审批处置方案', operator: '何清', detail: '签批通过PL-1（降低库水位，依据DO-260928-01@V3）', snapshotVersion: 3, createdAt: '2026-09-29T11:00:00' },
    { id: 'A-6', entityId: 'AN-260929-01', action: '启动应急联动', operator: '值班负责人', detail: '冻结启动依据：方案PL-1/DO-260928-01@V3', snapshotVersion: 3, createdAt: '2026-09-29T11:10:00' }
  ]
}
