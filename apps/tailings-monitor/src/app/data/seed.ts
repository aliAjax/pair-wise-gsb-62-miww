import type { TailingsDataset } from '../domain'

export const seedDataset: TailingsDataset = {
  revision: 3,
  dispatchOrders: [
    {
      id: 'DO-260928',
      title: '汛期库水位调度令（第1版）',
      version: 1,
      status: '作废',
      level: 'Ⅱ级(重大)',
      targetWaterLevel: 872.0,
      unit: 'm',
      issuedBy: '防汛指挥部',
      issuedAt: '2026-09-28T08:00:00',
      effectiveAt: '2026-09-28T08:30:00',
      zones: [],
      note: '汛期首轮调度，库水位按872.0m控制，重大及以上异常强制应急联动。',
      supersededOrderId: ''
    },
    {
      id: 'DO-260929',
      title: '汛期库水位调度令（第2版·现行）',
      version: 2,
      status: '已生效',
      level: 'Ⅲ级(较高)',
      targetWaterLevel: 870.5,
      unit: 'm',
      issuedBy: '防汛指挥部',
      issuedAt: '2026-09-29T06:00:00',
      effectiveAt: '2026-09-29T06:30:00',
      zones: [],
      note: '上游来水减弱，控制水位下调至870.5m，响应级别下调为Ⅲ级；已启动联动保留原依据并追加复核。',
      supersededOrderId: 'DO-260928'
    }
  ],
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
  anomalies: [
    {
      id: 'AN-260929-01',
      pointId: 'P-D01',
      title: '主坝D01累计位移超过报警阈值',
      severity: '重大',
      responseLevel: 'Ⅱ级(重大)',
      levelPendingReview: true,
      status: '应急联动',
      openedAt: '2026-09-29T08:25:00',
      owner: '坝体安全组',
      triggerReadingId: 'RD-1',
      observedValue: '18.7 mm，昨日变化4.2 mm/d',
      version: 7,
      closedAt: '',
      fieldReviews: [
        { id: 'FR-1', inspector: '宋立', arrivedAt: '2026-09-29T09:10:00', observed: '坝顶排水沟未见明显开裂，D01附近无新增裂缝，基准点稳定。', evidence: 'D01近景照片、基准点复核记录、GNSS原始观测文件', reassessment: '读数有效，位移趋势仍上升，建议立即降低库水位并加密监测。', afterDispatchChange: false, levelAtReview: 'Ⅱ级(重大)', version: 2 }
      ],
      opinions: [
        { id: 'OP-1', specialist: '周岩', discipline: '岩土', content: '近三日位移速率持续高于阈值，需结合孔隙水压力分析潜在滑面。', conclusion: '支持结论', createdAt: '2026-09-29T10:20:00' },
        { id: 'OP-2', specialist: '许洁', discipline: '水文', content: '库水位仍接近警戒线，建议优先降低库水位并核对上游来水。', conclusion: '补充证据', createdAt: '2026-09-29T10:45:00' }
      ],
      plan: {
        id: 'PL-1',
        version: 2,
        action: '降低库水位',
        owner: '库区调度班',
        deadline: '2026-09-29T18:00:00',
        conditions: '每2小时复测D01、D02和W01；位移速率恢复至3mm/d以下并稳定12小时后，负责人可关闭异常。',
        status: '失效待重算',
        tasks: [
          { id: 'PT-1', content: '按872.0m控制水位开启泄洪闸', owner: '库区调度班', status: '已暂停', pausedAt: '2026-09-29T06:30:00', pauseReason: '调度令换版V1→V2，控制水位调整为870.5m，先停住待重算' },
          { id: 'PT-2', content: '每2小时复测D01、D02位移并上报', owner: '监测班', status: '已暂停', pausedAt: '2026-09-29T06:30:00', pauseReason: '调度令换版，复测频率随新方案重算' }
        ],
        basisOrderId: 'DO-260928',
        basisOrderVersion: 1,
        invalidatedByOrderId: 'DO-260929',
        emergencyLinked: true,
        approvedBy: '负责人 何清',
        approvedAt: '2026-09-28T20:10:00',
        history: [
          {
            id: 'PL-1', version: 1, action: '降低库水位', owner: '库区调度班', deadline: '2026-09-29T12:00:00',
            conditions: '每4小时复测D01；位移速率回落至3mm/d以下后关闭。', status: '失效待重算',
            tasks: [], basisOrderId: 'DO-260928', basisOrderVersion: 1, invalidatedByOrderId: 'DO-260928',
            emergencyLinked: false, approvedBy: '负责人 何清', approvedAt: '2026-09-28T16:40:00', history: []
          }
        ]
      },
      emergency: {
        id: 'EL-1',
        launchedAt: '2026-09-28T20:30:00',
        launchedBy: '值班负责人 何清',
        basisOrderId: 'DO-260928',
        basisOrderVersion: 1,
        basisLevel: 'Ⅱ级(重大)',
        note: 'D01位移重大异常，按Ⅱ级启动应急联动，通知下游巡查与撤离准备。',
        active: true,
        reviews: []
      },
      approvalDrafts: []
    },
    {
      id: 'AN-260929-02',
      pointId: 'P-W01',
      title: '库水位短时上升速率超预警值',
      severity: '较高',
      responseLevel: 'Ⅲ级(较高)',
      levelPendingReview: false,
      status: '原因调查中',
      openedAt: '2026-09-29T08:00:00',
      owner: '库区调度班',
      triggerReadingId: 'RD-4',
      observedValue: '873.4 m，1小时上升0.6 m',
      version: 4,
      closedAt: '',
      fieldReviews: [],
      opinions: [
        { id: 'OP-3', specialist: '许洁', discipline: '水文', content: '上游降雨汇流导致入湖量增加，需核实泄洪闸状态。', conclusion: '支持结论', createdAt: '2026-09-29T09:00:00' }
      ],
      plan: {
        id: 'PL-2',
        version: 1,
        action: '加密监测',
        owner: '库区调度班',
        deadline: '2026-09-29T14:00:00',
        conditions: '每小时记录水位与入库流量，达到874.0m时启动应急联动。',
        status: '待审批',
        tasks: [{ id: 'PT-3', content: '每小时记录水位与入库流量', owner: '库区调度班', status: '待执行', pausedAt: '', pauseReason: '' }],
        basisOrderId: 'DO-260929',
        basisOrderVersion: 2,
        invalidatedByOrderId: '',
        emergencyLinked: false,
        approvedBy: '',
        approvedAt: '',
        history: []
      },
      emergency: null,
      approvalDrafts: []
    }
  ],
  audit: [
    { id: 'A-1', entityId: 'P-D01', action: '生成异常', operator: '阈值引擎', detail: '累计位移18.7mm超过报警阈值16mm，按调度令V1定级Ⅱ级', revision: 1, createdAt: '2026-09-29T08:25:00' },
    { id: 'A-2', entityId: 'AN-260929-01', action: '提交现场复核', operator: '宋立', detail: '原始读数有效，位移趋势仍上升', revision: 1, createdAt: '2026-09-29T09:25:00' },
    { id: 'A-3', entityId: 'DO-260929', action: '调度令生效', operator: '防汛指挥部', detail: '第2版调度令生效，控制水位870.5m，响应级别调整为Ⅲ级；1个异常方案失效重算，1项已启动联动保留Ⅱ级原依据待追加复核', revision: 3, createdAt: '2026-09-29T06:30:00' }
  ]
}
