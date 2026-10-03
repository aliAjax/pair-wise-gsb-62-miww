// apps/tailings-monitor/src/app/data/seed.ts
var seedDataset = {
  snapshotVersion: 3,
  points: [
    { id: "P-D01", name: "\u4E3B\u575D\u9876\u90E8\u4F4D\u79FB\u70B9 D01", zone: "\u4E3B\u575D", type: "\u4F4D\u79FB", longitude: 112.832, latitude: 40.116, status: "\u5F02\u5E38", currentValue: 18.7, unit: "mm", thresholdId: "T-D", lastInspectionAt: "2026-09-29T08:20:00" },
    { id: "P-D02", name: "\u4E3B\u575D\u4E0B\u6E38\u4F4D\u79FB\u70B9 D02", zone: "\u4E3B\u575D", type: "\u4F4D\u79FB", longitude: 112.837, latitude: 40.111, status: "\u9884\u8B66", currentValue: 12.4, unit: "mm", thresholdId: "T-D", lastInspectionAt: "2026-09-29T08:10:00" },
    { id: "P-W01", name: "\u5E93\u5185\u6C34\u4F4D\u8BA1 W01", zone: "\u5E93\u533A", type: "\u6C34\u4F4D", longitude: 112.846, latitude: 40.121, status: "\u9884\u8B66", currentValue: 873.4, unit: "m", thresholdId: "T-W", lastInspectionAt: "2026-09-29T07:55:00" },
    { id: "P-S01", name: "\u4E3B\u575D\u6E17\u6D41\u8BA1 S01", zone: "\u4E3B\u575D", type: "\u6E17\u6D41", longitude: 112.827, latitude: 40.106, status: "\u6B63\u5E38", currentValue: 1.8, unit: "L/s", thresholdId: "T-S", lastInspectionAt: "2026-09-29T07:40:00" },
    { id: "P-R01", name: "\u5E93\u533A\u96E8\u91CF\u7AD9 R01", zone: "\u5E93\u533A", type: "\u964D\u96E8", longitude: 112.861, latitude: 40.132, status: "\u6B63\u5E38", currentValue: 24.6, unit: "mm/h", thresholdId: "T-R", lastInspectionAt: "2026-09-29T08:00:00" }
  ],
  thresholds: [
    { id: "T-D", type: "\u4F4D\u79FB", warning: 10, alarm: 16, changeRate: 3, unit: "mm/d", enabled: true, version: 4 },
    { id: "T-W", type: "\u6C34\u4F4D", warning: 871, alarm: 873, changeRate: 0.5, unit: "m/h", enabled: true, version: 3 },
    { id: "T-S", type: "\u6E17\u6D41", warning: 2.2, alarm: 3, changeRate: 0.4, unit: "L/s", enabled: true, version: 5 },
    { id: "T-R", type: "\u964D\u96E8", warning: 30, alarm: 50, changeRate: 10, unit: "mm/h", enabled: true, version: 2 }
  ],
  readings: [
    { id: "RD-1", pointId: "P-D01", value: 18.7, unit: "mm", capturedAt: "2026-09-29T08:20:00", deviceId: "GNSS-D01", quality: "\u6709\u6548" },
    { id: "RD-2", pointId: "P-D01", value: 16.2, unit: "mm", capturedAt: "2026-09-29T07:20:00", deviceId: "GNSS-D01", quality: "\u6709\u6548" },
    { id: "RD-3", pointId: "P-D01", value: 13.8, unit: "mm", capturedAt: "2026-09-29T06:20:00", deviceId: "GNSS-D01", quality: "\u6709\u6548" },
    { id: "RD-4", pointId: "P-W01", value: 873.4, unit: "m", capturedAt: "2026-09-29T07:55:00", deviceId: "WL-W01", quality: "\u6709\u6548" }
  ],
  dispatchOrders: [
    {
      id: "DO-260928-01",
      title: "\u6C5B\u671F\u5E93\u6C34\u4F4D\u8C03\u5EA6\u4EE4\uFF08\u2161\u7EA7 \u8F83\u9AD8\uFF09",
      targetWaterLevel: 870,
      rateLimit: 0.5,
      responseLevel: "\u2161\u7EA7(\u8F83\u9AD8)",
      issuedAt: "2026-09-28T09:00:00",
      effectiveAt: "2026-09-28T09:30:00",
      issuedBy: "\u9632\u6C5B\u6307\u6325\u90E8",
      note: "\u6C5B\u671F\u6309\u2161\u7EA7\u54CD\u5E94\u63A7\u5236\u5E93\u6C34\u4F4D\uFF0C\u65E5\u964D\u5E45\u4E0D\u8D85\u8FC70.5m/d\u3002",
      status: "\u5DF2\u751F\u6548",
      supersedesOrderId: ""
    }
  ],
  anomalies: [
    {
      id: "AN-260929-01",
      pointId: "P-D01",
      title: "\u4E3B\u575DD01\u7D2F\u8BA1\u4F4D\u79FB\u8D85\u8FC7\u62A5\u8B66\u9608\u503C",
      severity: "\u91CD\u5927",
      status: "\u5E94\u6025\u8054\u52A8",
      openedAt: "2026-09-29T08:25:00",
      owner: "\u575D\u4F53\u5B89\u5168\u7EC4",
      triggerReadingId: "RD-1",
      observedValue: "18.7 mm\uFF0C\u6628\u65E5\u53D8\u53164.2 mm/d",
      version: 7,
      closedAt: "",
      fieldReviews: [{ id: "FR-1", inspector: "\u5B8B\u7ACB", arrivedAt: "2026-09-29T09:10:00", observed: "\u575D\u9876\u6392\u6C34\u6C9F\u672A\u89C1\u660E\u663E\u5F00\u88C2\uFF0CD01\u9644\u8FD1\u65E0\u65B0\u589E\u88C2\u7F1D\uFF0C\u57FA\u51C6\u70B9\u7A33\u5B9A\u3002", evidence: "D01\u8FD1\u666F\u7167\u7247\u3001\u57FA\u51C6\u70B9\u590D\u6838\u8BB0\u5F55\u3001GNSS\u539F\u59CB\u89C2\u6D4B\u6587\u4EF6", reassessment: "\u8BFB\u6570\u6709\u6548\uFF0C\u4F4D\u79FB\u8D8B\u52BF\u4ECD\u4E0A\u5347\uFF0C\u5EFA\u8BAE\u7ACB\u5373\u964D\u4F4E\u5E93\u6C34\u4F4D\u5E76\u52A0\u5BC6\u76D1\u6D4B\u3002", version: 2 }],
      opinions: [
        { id: "OP-1", specialist: "\u5468\u5CA9", discipline: "\u5CA9\u571F", content: "\u8FD1\u4E09\u65E5\u4F4D\u79FB\u901F\u7387\u6301\u7EED\u9AD8\u4E8E\u9608\u503C\uFF0C\u9700\u7ED3\u5408\u5B54\u9699\u6C34\u538B\u529B\u5206\u6790\u6F5C\u5728\u6ED1\u9762\u3002", conclusion: "\u652F\u6301\u7ED3\u8BBA", createdAt: "2026-09-29T10:20:00" },
        { id: "OP-2", specialist: "\u8BB8\u6D01", discipline: "\u6C34\u6587", content: "\u5E93\u6C34\u4F4D\u4ECD\u63A5\u8FD1\u8B66\u6212\u7EBF\uFF0C\u5EFA\u8BAE\u4F18\u5148\u964D\u4F4E\u5E93\u6C34\u4F4D\u5E76\u6838\u5BF9\u4E0A\u6E38\u6765\u6C34\u3002", conclusion: "\u8865\u5145\u8BC1\u636E", createdAt: "2026-09-29T10:45:00" }
      ],
      plan: { id: "PL-1", action: "\u964D\u4F4E\u5E93\u6C34\u4F4D", owner: "\u5E93\u533A\u8C03\u5EA6\u73ED", deadline: "2026-09-29T18:00:00", conditions: "\u6BCF2\u5C0F\u65F6\u590D\u6D4BD01\u3001D02\u548CW01\uFF1B\u4F4D\u79FB\u901F\u7387\u6062\u590D\u81F33mm/d\u4EE5\u4E0B\u5E76\u7A33\u5B9A12\u5C0F\u65F6\u540E\uFF0C\u8D1F\u8D23\u4EBA\u53EF\u5173\u95ED\u5F02\u5E38\u3002", emergencyLinked: true, approvedBy: "\u4F55\u6E05", approvedAt: "2026-09-29T11:00:00", status: "\u6267\u884C\u4E2D", basisOrderId: "DO-260928-01", basisSnapshotVersion: 3, version: 2, recalculatedFromPlanId: "", invalidatedAt: "", invalidatedReason: "", supersededByPlanId: "" },
      planHistory: [],
      severityHistory: []
    },
    {
      id: "AN-260929-02",
      pointId: "P-W01",
      title: "\u5E93\u6C34\u4F4D\u77ED\u65F6\u4E0A\u5347\u901F\u7387\u8D85\u9884\u8B66\u503C",
      severity: "\u8F83\u9AD8",
      status: "\u539F\u56E0\u8C03\u67E5\u4E2D",
      openedAt: "2026-09-29T08:00:00",
      owner: "\u5E93\u533A\u8C03\u5EA6\u73ED",
      triggerReadingId: "RD-4",
      observedValue: "873.4 m\uFF0C1\u5C0F\u65F6\u4E0A\u53470.6 m",
      version: 4,
      closedAt: "",
      fieldReviews: [],
      opinions: [{ id: "OP-3", specialist: "\u8BB8\u6D01", discipline: "\u6C34\u6587", content: "\u4E0A\u6E38\u964D\u96E8\u6C47\u6D41\u5BFC\u81F4\u5165\u6E56\u91CF\u589E\u52A0\uFF0C\u9700\u6838\u5B9E\u6CC4\u6D2A\u95F8\u72B6\u6001\u3002", conclusion: "\u652F\u6301\u7ED3\u8BBA", createdAt: "2026-09-29T09:00:00" }],
      plan: { id: "PL-2", action: "\u52A0\u5BC6\u76D1\u6D4B", owner: "\u5E93\u533A\u8C03\u5EA6\u73ED", deadline: "2026-09-29T14:00:00", conditions: "\u6BCF\u5C0F\u65F6\u8BB0\u5F55\u6C34\u4F4D\u4E0E\u5165\u5E93\u6D41\u91CF\uFF0C\u8FBE\u5230874.0m\u65F6\u542F\u52A8\u5E94\u6025\u8054\u52A8\u3002", emergencyLinked: false, approvedBy: "", approvedAt: "", status: "\u7F16\u5236\u4E2D", basisOrderId: "DO-260928-01", basisSnapshotVersion: 3, version: 1, recalculatedFromPlanId: "", invalidatedAt: "", invalidatedReason: "", supersededByPlanId: "" },
      planHistory: [],
      severityHistory: []
    },
    {
      id: "AN-260929-03",
      pointId: "P-D02",
      title: "\u4E3B\u575DD02\u4F4D\u79FB\u6301\u7EED\u589E\u5927\uFF08\u9884\u8B66\uFF09",
      severity: "\u8F83\u9AD8",
      status: "\u5F85\u8D1F\u8D23\u4EBA\u5BA1\u6279",
      openedAt: "2026-09-29T09:05:00",
      owner: "\u575D\u4F53\u5B89\u5168\u7EC4",
      triggerReadingId: "RD-2",
      observedValue: "12.4 mm\uFF0C\u8F83\u524D\u65E5+2.6 mm",
      version: 3,
      closedAt: "",
      fieldReviews: [{ id: "FR-2", inspector: "\u5B8B\u7ACB", arrivedAt: "2026-09-29T09:40:00", observed: "D02\u6D4B\u659C\u7BA1\u672A\u89C1\u9519\u52A8\uFF0C\u5761\u9762\u65E0\u65B0\u589E\u6E17\u6C34\u70B9\u3002", evidence: "D02\u5DE1\u67E5\u7167\u7247\u3001\u6D4B\u659C\u6570\u636E", reassessment: "\u8D8B\u52BF\u9700\u5173\u6CE8\uFF0C\u5EFA\u8BAE\u52A0\u5BC6\u76D1\u6D4B\u5E76\u7EB3\u5165\u964D\u5E93\u8054\u52A8\u8BC4\u4F30\u3002", version: 1 }],
      opinions: [],
      plan: { id: "PL-3", action: "\u52A0\u5BC6\u76D1\u6D4B", owner: "\u76D1\u6D4B\u73ED", deadline: "2026-09-30T08:00:00", conditions: "\u6BCF4\u5C0F\u65F6\u590D\u6D4BD02\uFF1B\u82E5\u2160\u7EA7\u54CD\u5E94\u751F\u6548\u4E14\u4F4D\u79FB\u8FBE\u9884\u8B66\u503C\uFF0C\u5347\u7EA7\u4E3A\u91CD\u5927\u5E76\u964D\u5E93\u3002", emergencyLinked: false, approvedBy: "", approvedAt: "", status: "\u5F85\u5BA1\u6279", basisOrderId: "DO-260928-01", basisSnapshotVersion: 3, version: 1, recalculatedFromPlanId: "", invalidatedAt: "", invalidatedReason: "", supersededByPlanId: "" },
      planHistory: [],
      severityHistory: []
    }
  ],
  tasks: [
    { id: "TK-1", planId: "PL-1", anomalyId: "AN-260929-01", title: "\u63090.5m/d\u964D\u4F4E\u5E93\u6C34\u4F4D\u81F3870.0m", owner: "\u5E93\u533A\u8C03\u5EA6\u73ED", status: "\u8FDB\u884C\u4E2D", frozen: false, frozenReason: "", result: "", completedAt: "" },
    { id: "TK-2", planId: "PL-1", anomalyId: "AN-260929-01", title: "\u6BCF2\u5C0F\u65F6\u590D\u6D4BD01/D02/W01", owner: "\u76D1\u6D4B\u73ED", status: "\u8FDB\u884C\u4E2D", frozen: false, frozenReason: "", result: "", completedAt: "" },
    { id: "TK-3", planId: "PL-3", anomalyId: "AN-260929-03", title: "\u6BCF4\u5C0F\u65F6\u590D\u6D4BD02", owner: "\u76D1\u6D4B\u73ED", status: "\u5F85\u542F\u52A8", frozen: false, frozenReason: "", result: "", completedAt: "" }
  ],
  emergencyLinks: [
    {
      id: "EL-1",
      anomalyId: "AN-260929-01",
      level: "\u91CD\u5927",
      startedAt: "2026-09-29T11:10:00",
      startedBy: "\u503C\u73ED\u8D1F\u8D23\u4EBA",
      basisPlanId: "PL-1",
      basisOrderId: "DO-260928-01",
      basisSnapshotVersion: 3,
      basisNote: "\u91CD\u5927\u5F02\u5E38\u8054\u52A8\u5E94\u6025\u503C\u73ED\uFF0C\u901A\u77E5\u4E0B\u6E38\u5DE1\u67E5\u3002",
      status: "\u5DF2\u542F\u52A8",
      reviews: []
    }
  ],
  approvals: [
    { planId: "PL-1", anomalyId: "AN-260929-01", approver: "\u4F55\u6E05", approvedAt: "2026-09-29T11:00:00", note: "\u540C\u610F\u6309\u2161\u7EA7\u8C03\u5EA6\u4EE4\u964D\u5E93\uFF0C\u4E25\u683C\u6267\u884C\u5173\u95ED\u6761\u4EF6\u3002", planVersion: 2, basisSnapshotVersion: 3 }
  ],
  drafts: [],
  audit: [
    { id: "A-1", entityId: "P-D01", action: "\u751F\u6210\u5F02\u5E38", operator: "\u9608\u503C\u5F15\u64CE", detail: "\u7D2F\u8BA1\u4F4D\u79FB18.7mm\u8D85\u8FC7\u62A5\u8B66\u9608\u503C16mm", snapshotVersion: 1, createdAt: "2026-09-29T08:25:00" },
    { id: "A-2", entityId: "AN-260929-01", action: "\u63D0\u4EA4\u73B0\u573A\u590D\u6838", operator: "\u5B8B\u7ACB", detail: "\u539F\u59CB\u8BFB\u6570\u6709\u6548\uFF0C\u4F4D\u79FB\u8D8B\u52BF\u4ECD\u4E0A\u5347", snapshotVersion: 2, createdAt: "2026-09-29T09:25:00" },
    { id: "A-3", entityId: "AN-260929-01", action: "\u8865\u5145\u4E13\u4E1A\u610F\u89C1", operator: "\u5468\u5CA9", detail: "\u5EFA\u8BAE\u7ED3\u5408\u5B54\u9699\u6C34\u538B\u529B\u5206\u6790\u6F5C\u5728\u6ED1\u9762", snapshotVersion: 2, createdAt: "2026-09-29T10:20:00" },
    { id: "A-4", entityId: "DO-260928-01", action: "\u8C03\u5EA6\u4EE4\u751F\u6548", operator: "\u9632\u6C5B\u6307\u6325\u90E8", detail: "\u76EE\u6807\u6C34\u4F4D870.0m\uFF0C\u2161\u7EA7\u54CD\u5E94\uFF0C\u964D\u5E93\u9650\u901F0.5m/d", snapshotVersion: 3, createdAt: "2026-09-28T09:30:00" },
    { id: "A-5", entityId: "AN-260929-01", action: "\u5BA1\u6279\u5904\u7F6E\u65B9\u6848", operator: "\u4F55\u6E05", detail: "\u7B7E\u6279\u901A\u8FC7PL-1\uFF08\u964D\u4F4E\u5E93\u6C34\u4F4D\uFF0C\u4F9D\u636EDO-260928-01@V3\uFF09", snapshotVersion: 3, createdAt: "2026-09-29T11:00:00" },
    { id: "A-6", entityId: "AN-260929-01", action: "\u542F\u52A8\u5E94\u6025\u8054\u52A8", operator: "\u503C\u73ED\u8D1F\u8D23\u4EBA", detail: "\u51BB\u7ED3\u542F\u52A8\u4F9D\u636E\uFF1A\u65B9\u6848PL-1/DO-260928-01@V3", snapshotVersion: 3, createdAt: "2026-09-29T11:10:00" }
  ]
};

// apps/tailings-monitor/src/app/domain/transitions.ts
var responseRank = (level) => ({ "\u2163\u7EA7(\u5E38\u89C4)": 4, "\u2162\u7EA7(\u5173\u6CE8)": 3, "\u2161\u7EA7(\u8F83\u9AD8)": 2, "\u2160\u7EA7(\u91CD\u5927)": 1 })[level];
var addAudit = (dataset, ctx2, entityId, action, detail) => {
  dataset.audit.unshift({
    id: `AUD-${ctx2.now.replace(/[-:T.]/g, "")}-${ctx2.seq()}`,
    entityId,
    action,
    operator: ctx2.operator,
    detail,
    snapshotVersion: dataset.snapshotVersion,
    createdAt: ctx2.now
  });
  ctx2.auditCount += 1;
};
var published = (dataset, ctx2) => {
  const nextVersion = dataset.snapshotVersion + 1;
  for (let i = 0; i < ctx2.auditCount && i < dataset.audit.length; i++) dataset.audit[i].snapshotVersion = nextVersion;
  dataset.snapshotVersion = nextVersion;
  return dataset;
};
var nextId = (prefix, ctx2) => `${prefix}-${ctx2.now.slice(0, 10).replace(/-/g, "")}-${ctx2.seq()}`;
var pointOf = (dataset, pointId) => dataset.points.find((point) => point.id === pointId);
function recomputeSeverity(dataset, anomaly, order2) {
  if (anomaly.status === "\u5DF2\u5173\u95ED") return anomaly.severity;
  const point = pointOf(dataset, anomaly.pointId);
  const threshold = point ? dataset.thresholds.find((item) => item.id === point.thresholdId) : void 0;
  if (point?.type === "\u4F4D\u79FB" && threshold) {
    if (order2.responseLevel === "\u2160\u7EA7(\u91CD\u5927)" && point.currentValue >= threshold.warning) return "\u91CD\u5927";
    if (order2.responseLevel === "\u2161\u7EA7(\u8F83\u9AD8)" && point.currentValue >= threshold.warning * 1.2) return "\u91CD\u5927";
    if (point.currentValue >= threshold.alarm) return "\u91CD\u5927";
    if (point.currentValue >= threshold.warning) return "\u8F83\u9AD8";
    return "\u5173\u6CE8";
  }
  if (point?.type === "\u6C34\u4F4D") {
    const gap = point.currentValue - order2.targetWaterLevel;
    if (gap > 0.5) return "\u91CD\u5927";
    if (gap > 0) return "\u8F83\u9AD8";
    return "\u5173\u6CE8";
  }
  if (point && point.status !== "\u6B63\u5E38" && responseRank(order2.responseLevel) <= 2) {
    return anomaly.severity === "\u91CD\u5927" ? "\u91CD\u5927" : "\u8F83\u9AD8";
  }
  return anomaly.severity;
}
function recalculatedPlan(anomaly, oldPlan, order2, ctx2) {
  const action = oldPlan.action === "\u52A0\u5BC6\u76D1\u6D4B" ? "\u964D\u4F4E\u5E93\u6C34\u4F4D" : oldPlan.action;
  return {
    id: nextId("PL", ctx2),
    action,
    owner: anomaly.severity === "\u91CD\u5927" ? "\u5E93\u533A\u8C03\u5EA6\u73ED" : oldPlan.owner,
    deadline: ctx2.now.slice(0, 11) + "18:00:00",
    conditions: `\u4F9D\u636E\u8C03\u5EA6\u4EE4${order2.id}\uFF08\u76EE\u6807\u6C34\u4F4D${order2.targetWaterLevel}m\u3001\u9650\u901F${order2.rateLimit}m/d\u3001${order2.responseLevel}\uFF09\u91CD\u7B97\uFF1A\u6BCF2\u5C0F\u65F6\u590D\u6D4B\u5E76\u6838\u62A5\u964D\u5E93\u901F\u7387\uFF0C\u4F4D\u79FB\u901F\u7387\u6062\u590D\u9608\u503C\u5185\u4E14\u7A33\u5B9A12\u5C0F\u65F6\u540E\u65B9\u53EF\u5173\u95ED\u3002`,
    emergencyLinked: anomaly.severity === "\u91CD\u5927" ? true : oldPlan.emergencyLinked,
    approvedBy: "",
    approvedAt: "",
    status: "\u5F85\u5BA1\u6279",
    basisOrderId: order2.id,
    basisSnapshotVersion: 0,
    version: 1,
    recalculatedFromPlanId: oldPlan.id,
    invalidatedAt: "",
    invalidatedReason: "",
    supersededByPlanId: ""
  };
}
function applyDispatchOrder(input, order2, ctx2) {
  const dataset = structuredClone(input);
  const nextSnapshotVersion = dataset.snapshotVersion + 1;
  const previous = dataset.dispatchOrders.find((item) => item.status === "\u5DF2\u751F\u6548" && item.id !== order2.id);
  if (previous) {
    previous.status = "\u5DF2\u5E9F\u6B62";
    addAudit(dataset, ctx2, previous.id, "\u8C03\u5EA6\u4EE4\u5E9F\u6B62", `\u8C03\u5EA6\u4EE4${order2.id}\u751F\u6548\uFF0C${previous.id}\uFF08\u76EE\u6807${previous.targetWaterLevel}m\uFF09\u540C\u65F6\u5E9F\u6B62`);
  }
  order2 = { ...order2, status: "\u5DF2\u751F\u6548", effectiveAt: order2.effectiveAt || ctx2.now, supersedesOrderId: previous?.id ?? "" };
  const existing = dataset.dispatchOrders.find((item) => item.id === order2.id);
  if (existing) Object.assign(existing, order2);
  else dataset.dispatchOrders.unshift(order2);
  addAudit(dataset, ctx2, order2.id, "\u8C03\u5EA6\u4EE4\u751F\u6548", `\u76EE\u6807\u6C34\u4F4D${order2.targetWaterLevel}m\uFF0C\u964D\u5E93\u9650\u901F${order2.rateLimit}m/d\uFF0C\u54CD\u5E94\u7EA7\u522B${order2.responseLevel}\uFF1B\u53D7\u5F71\u54CD\u65B9\u6848\u5931\u6548\u91CD\u7B97\uFF0C\u672A\u5B8C\u6210\u5904\u7F6E\u5148\u6682\u505C`);
  for (const anomaly of dataset.anomalies) {
    if (anomaly.status === "\u5DF2\u5173\u95ED") continue;
    const nextSeverity = recomputeSeverity(dataset, anomaly, order2);
    const severityChanged = nextSeverity !== anomaly.severity;
    const basisStale = !!previous && anomaly.plan.status !== "\u5DF2\u5B8C\u6210" && anomaly.plan.basisOrderId === previous.id;
    const affected = severityChanged || basisStale;
    addAudit(dataset, ctx2, anomaly.id, "\u5F02\u5E38\u7EA7\u522B\u91CD\u7B97", `\u4F9D\u636E\u8C03\u5EA6\u4EE4${order2.id}\u7531${anomaly.severity}\u91CD\u7B97\u4E3A${nextSeverity}${affected ? `\uFF08${severityChanged ? "\u7EA7\u522B\u6863\u4F4D\u53D8\u5316" : ""}${severityChanged && basisStale ? "\u3001" : ""}${basisStale ? "\u65B9\u6848\u4F9D\u636E\u65E7\u4EE4\u5E9F\u6B62" : ""}\uFF0C\u65B9\u6848\u53D7\u5F71\u54CD\uFF09` : "\uFF08\u7EA7\u522B\u4E0E\u65B9\u6848\u4F9D\u636E\u5747\u4E0D\u53D7\u5F71\u54CD\uFF09"}`);
    if (severityChanged) {
      anomaly.severityHistory.unshift({ from: anomaly.severity, to: nextSeverity, reason: `\u8C03\u5EA6\u4EE4${order2.id}\u751F\u6548\u91CD\u7B97`, at: ctx2.now, snapshotVersion: nextSnapshotVersion, orderId: order2.id });
      anomaly.severity = nextSeverity;
    }
    const link = dataset.emergencyLinks.find((item) => item.anomalyId === anomaly.id && item.status !== "\u5DF2\u89E3\u9664");
    if (link) {
      const already = link.reviews.some((review) => review.newOrderId === order2.id && !review.resolved);
      if (!already) {
        const review = {
          id: nextId("ER", ctx2),
          requiredAt: ctx2.now,
          requiredBy: ctx2.operator,
          reason: `\u8C03\u5EA6\u4EE4\u7531${previous?.id ?? "\u65E0"}\u53D8\u66F4\u4E3A${order2.id}\uFF0C\u4FDD\u7559\u542F\u52A8\u4F9D\u636E${link.basisOrderId}@V${link.basisSnapshotVersion}\uFF0C\u987B\u590D\u6838\u662F\u5426\u7EF4\u6301\u8054\u52A8\u3002`,
          newOrderId: order2.id,
          resolved: false,
          resolvedAt: "",
          resolvedBy: "",
          conclusion: "",
          note: ""
        };
        link.reviews.unshift(review);
        link.status = "\u590D\u6838\u4E2D";
        addAudit(dataset, ctx2, link.id, "\u8054\u52A8\u8FFD\u52A0\u590D\u6838", `\u8054\u52A8\u4FDD\u7559\u539F\u4F9D\u636E\uFF08${link.basisOrderId}@V${link.basisSnapshotVersion}/\u65B9\u6848${link.basisPlanId}\uFF09\uFF0C\u8FFD\u52A0\u590D\u6838${review.id}`);
      }
    }
    if (affected && anomaly.plan.status !== "\u5DF2\u5B8C\u6210") {
      const oldPlan = anomaly.plan;
      const stampedOld = {
        ...oldPlan,
        status: "\u5DF2\u5931\u6548",
        invalidatedAt: ctx2.now,
        invalidatedReason: `\u8C03\u5EA6\u4EE4${order2.id}\u751F\u6548\uFF0C\u4F9D\u636E${oldPlan.basisOrderId}@V${oldPlan.basisSnapshotVersion}\u5931\u6548`,
        supersededByPlanId: ""
      };
      const fresh = recalculatedPlan({ ...anomaly, severity: nextSeverity }, stampedOld, order2, ctx2);
      fresh.basisSnapshotVersion = nextSnapshotVersion;
      stampedOld.supersededByPlanId = fresh.id;
      anomaly.planHistory.unshift(stampedOld);
      anomaly.plan = fresh;
      anomaly.status = "\u5F85\u8D1F\u8D23\u4EBA\u5BA1\u6279";
      anomaly.version += 1;
      addAudit(dataset, ctx2, anomaly.id, "\u65B9\u6848\u5931\u6548\u91CD\u7B97", `\u65E7\u65B9\u6848${stampedOld.id}\uFF08${stampedOld.action}\uFF0C\u4F9D\u636E${stampedOld.basisOrderId}@V${stampedOld.basisSnapshotVersion}\uFF09\u5931\u6548\u7559\u75D5\uFF0C\u65B0\u65B9\u6848${fresh.id}\u6309${order2.id}@V${nextSnapshotVersion}\u91CD\u7B97\u5F85\u5BA1\u6279`);
      for (const task of dataset.tasks) {
        if (task.anomalyId === anomaly.id && task.status !== "\u5DF2\u5B8C\u6210" && !task.frozen) {
          task.frozen = true;
          task.status = task.status === "\u8FDB\u884C\u4E2D" ? "\u5DF2\u6682\u505C" : "\u5F85\u542F\u52A8";
          task.frozenReason = `\u8C03\u5EA6\u4EE4${order2.id}\u751F\u6548\uFF0C\u7B49\u5F85\u65B0\u65B9\u6848${fresh.id}\u7B7E\u6279`;
          addAudit(dataset, ctx2, task.id, "\u4EFB\u52A1\u6682\u505C", `\u672A\u5B8C\u6210\u9879\u5148\u505C\u4F4F\uFF0C\u7B49\u5F85\u65B0\u65B9\u6848${fresh.id}\u7B7E\u6279`);
        }
      }
    }
    if (link) anomaly.status = "\u5E94\u6025\u8054\u52A8";
    anomaly.version += 1;
  }
  return published(dataset, ctx2);
}
function approvePlan(input, payload, ctx2) {
  const dataset = structuredClone(input);
  const anomaly = dataset.anomalies.find((item) => item.id === payload.anomalyId);
  if (!anomaly) return { dataset: input, outcome: "draft" };
  const plan = anomaly.plan;
  const already = dataset.approvals.find((item) => item.planId === plan.id);
  const basisChanged = payload.expectedSnapshotVersion !== dataset.snapshotVersion || payload.expectedPlanVersion !== plan.version;
  if (already || basisChanged) {
    const reason = already ? "\u5DF2\u6709\u4EBA\u7B7E\u6279" : "\u4F9D\u636E\u7248\u672C\u5DF2\u53D8\u5316";
    const draft = {
      id: nextId("DR", ctx2),
      anomalyId: anomaly.id,
      planId: plan.id,
      approver: payload.approver,
      note: payload.note,
      attemptedAt: ctx2.now,
      planVersionAtAttempt: payload.expectedPlanVersion,
      currentPlanVersion: plan.version,
      snapshotVersionAtAttempt: payload.expectedSnapshotVersion,
      currentSnapshotVersion: dataset.snapshotVersion,
      reason,
      basisChanged
    };
    dataset.drafts.unshift(draft);
    addAudit(dataset, ctx2, anomaly.id, "\u7B7E\u6279\u8F6C\u8349\u7A3F", `${payload.approver}\u7684\u7B7E\u6279\u672A\u901A\u8FC7\uFF1A${reason}${basisChanged ? `\uFF08\u4F9D\u636EV${payload.expectedSnapshotVersion}/\u65B9\u6848V${payload.expectedPlanVersion}\u2192\u5F53\u524DV${dataset.snapshotVersion}/V${plan.version}\uFF09` : `\uFF0C${already?.approver}\u5DF2\u7B7E\u6279`}`);
    published(dataset, ctx2);
    return { dataset, outcome: "draft", reason, basisChanged };
  }
  if (anomaly.severity === "\u91CD\u5927" && !plan.emergencyLinked) return { dataset: input, outcome: "draft" };
  plan.approvedBy = payload.approver;
  plan.approvedAt = ctx2.now;
  plan.status = "\u6267\u884C\u4E2D";
  const approvalVersion = dataset.snapshotVersion + 1;
  dataset.approvals.unshift({
    planId: plan.id,
    anomalyId: anomaly.id,
    approver: payload.approver,
    approvedAt: ctx2.now,
    note: payload.note || "\u540C\u610F\u6267\u884C",
    planVersion: plan.version,
    basisSnapshotVersion: approvalVersion
  });
  anomaly.status = anomaly.plan.emergencyLinked ? "\u5E94\u6025\u8054\u52A8" : "\u5904\u7F6E\u4E2D";
  anomaly.version += 1;
  for (const task of dataset.tasks) {
    if (task.anomalyId === anomaly.id && task.frozen) {
      task.frozen = false;
      task.status = "\u5F85\u542F\u52A8";
      task.planId = plan.id;
      task.frozenReason = "";
      addAudit(dataset, ctx2, task.id, "\u4EFB\u52A1\u6062\u590D", `\u65B0\u65B9\u6848${plan.id}\u7B7E\u6279\uFF0C\u6309${plan.basisOrderId}@V${approvalVersion}\u6062\u590D\u63A8\u8FDB`);
    }
  }
  addAudit(dataset, ctx2, anomaly.id, "\u5BA1\u6279\u5904\u7F6E\u65B9\u6848", `${payload.approver}\u7B7E\u6279\u901A\u8FC7${plan.id}\uFF08${plan.action}\uFF0C\u4F9D\u636E${plan.basisOrderId}@V${plan.basisSnapshotVersion}\uFF09`);
  return { dataset: published(dataset, ctx2), outcome: "approved" };
}
function resolveEmergencyReview(input, payload, ctx2) {
  const dataset = structuredClone(input);
  const link = dataset.emergencyLinks.find((item) => item.id === payload.linkId);
  const review = link?.reviews.find((item) => item.id === payload.reviewId);
  if (!link || !review || review.resolved) return input;
  review.resolved = true;
  review.resolvedAt = ctx2.now;
  review.resolvedBy = ctx2.operator;
  review.conclusion = payload.conclusion;
  review.note = payload.note;
  const pending = link.reviews.some((item) => !item.resolved);
  link.status = pending ? "\u590D\u6838\u4E2D" : payload.conclusion === "\u89E3\u9664\u8054\u52A8" ? "\u5DF2\u89E3\u9664" : "\u7EF4\u6301";
  const anomaly = dataset.anomalies.find((item) => item.id === link.anomalyId);
  if (payload.conclusion === "\u89E3\u9664\u8054\u52A8") {
    if (anomaly && anomaly.status === "\u5E94\u6025\u8054\u52A8") anomaly.status = "\u5904\u7F6E\u4E2D";
  } else {
    if (anomaly) anomaly.status = "\u5E94\u6025\u8054\u52A8";
  }
  addAudit(dataset, ctx2, link.id, "\u8054\u52A8\u590D\u6838\u7ED3\u8BBA", `${payload.conclusion}\uFF1B\u539F\u542F\u52A8\u4F9D\u636E${link.basisOrderId}@V${link.basisSnapshotVersion}\u4FDD\u6301\u4E0D\u53D8\u3002${payload.note}`);
  return published(dataset, ctx2);
}
function advanceTask(input, taskId, result, ctx2) {
  const dataset = structuredClone(input);
  const task = dataset.tasks.find((item) => item.id === taskId);
  if (!task || task.frozen || task.status === "\u5DF2\u5B8C\u6210") return input;
  task.status = "\u5DF2\u5B8C\u6210";
  task.result = result;
  task.completedAt = ctx2.now;
  addAudit(dataset, ctx2, taskId, "\u4EFB\u52A1\u5B8C\u6210", result);
  return published(dataset, ctx2);
}
function closeAnomaly(input, anomalyId, note, ctx2) {
  const dataset = structuredClone(input);
  const anomaly = dataset.anomalies.find((item) => item.id === anomalyId);
  if (!anomaly || !anomaly.plan.approvedBy || !anomaly.fieldReviews.length || !note.trim()) return input;
  const openTasks = dataset.tasks.some((task) => task.anomalyId === anomalyId && task.status !== "\u5DF2\u5B8C\u6210");
  if (openTasks) return input;
  anomaly.status = "\u5DF2\u5173\u95ED";
  anomaly.closedAt = ctx2.now;
  anomaly.plan.status = "\u5DF2\u5B8C\u6210";
  anomaly.version += 1;
  for (const link of dataset.emergencyLinks) {
    if (link.anomalyId === anomalyId && link.status !== "\u5DF2\u89E3\u9664") link.status = "\u5DF2\u89E3\u9664";
  }
  addAudit(dataset, ctx2, anomalyId, "\u5173\u95ED\u5F02\u5E38", `${note}\uFF1B\u5F52\u6863\u4F9D\u636E${anomaly.plan.basisOrderId}@V${anomaly.plan.basisSnapshotVersion}`);
  return published(dataset, ctx2);
}
function findConsistencyIssues(dataset) {
  const issues = [];
  const isVoid = (orderId) => dataset.dispatchOrders.some((o) => o.id === orderId && o.status === "\u5DF2\u5E9F\u6B62");
  for (const link of dataset.emergencyLinks) {
    if (link.status === "\u5DF2\u89E3\u9664") continue;
    const anomaly = dataset.anomalies.find((item) => item.id === link.anomalyId);
    if (!anomaly) {
      issues.push(`\u8054\u52A8${link.id}\u627E\u4E0D\u5230\u5F02\u5E38${link.anomalyId}`);
      continue;
    }
    const plan = anomaly.plan;
    if (plan.status === "\u6267\u884C\u4E2D" && isVoid(plan.basisOrderId)) {
      issues.push(`\u8054\u52A8${link.id}\u5DF2\u542F\u52A8\uFF0C\u4F46\u5F02\u5E38${anomaly.id}\u65B9\u6848${plan.id}\u4ECD\u6309\u5DF2\u5E9F\u6B62\u65E7\u4EE4${plan.basisOrderId}\u6267\u884C\uFF08\u65B9\u6848\u672A\u91CD\u7B97\uFF09`);
    }
    if (plan.id !== link.basisPlanId && !link.reviews.some((review) => review.newOrderId === plan.basisOrderId)) {
      issues.push(`\u8054\u52A8${link.id}\u5DF2\u542F\u52A8\uFF0C\u5F02\u5E38${anomaly.id}\u65B9\u6848\u5DF2\u6362\u7248(${plan.id})\u4F46\u7F3A\u5C11\u53D8\u66F4\u590D\u6838`);
    }
  }
  for (const anomaly of dataset.anomalies) {
    if (anomaly.plan.status === "\u5DF2\u5931\u6548" && anomaly.status !== "\u5F85\u8D1F\u8D23\u4EBA\u5BA1\u6279" && anomaly.status !== "\u5E94\u6025\u8054\u52A8") {
      issues.push(`\u5F02\u5E38${anomaly.id}\u65B9\u6848\u5DF2\u5931\u6548\u4F46\u72B6\u6001\u4ECD\u4E3A${anomaly.status}`);
    }
    for (const task of dataset.tasks) {
      if (task.anomalyId === anomaly.id && task.status !== "\u5DF2\u5B8C\u6210" && task.frozen !== (task.frozenReason !== "")) {
        issues.push(`\u4EFB\u52A1${task.id}\u51BB\u7ED3\u6807\u8BB0\u4E0E\u51BB\u7ED3\u539F\u56E0\u4E0D\u4E00\u81F4`);
      }
    }
  }
  return issues;
}

// tools/verify-transitions.ts
var pass = 0;
var ok = (cond, msg) => {
  if (!cond) throw new Error(`\u2718 ${msg}`);
  console.log(`  \u2713 ${msg}`);
  pass++;
};
var clone = (d) => structuredClone(d);
var seq = 100;
var ctx = (operator = "\u6D4B\u8BD5\u4EBA") => ({ operator, now: (/* @__PURE__ */ new Date()).toISOString(), seq: () => seq++, auditCount: 0 });
var findA = (d, id) => {
  const a = d.anomalies.find((x) => x.id === id);
  if (!a) throw new Error("missing " + id);
  return a;
};
var order = {
  id: "DO-261003-09",
  title: "\u2160\u7EA7\u8C03\u5EA6\u4EE4",
  targetWaterLevel: 866,
  rateLimit: 0.8,
  responseLevel: "\u2160\u7EA7(\u91CD\u5927)",
  issuedAt: "2026-10-03T08:00:00",
  effectiveAt: "2026-10-03T08:05:00",
  issuedBy: "\u9632\u6C5B\u6307\u6325\u90E8",
  note: "\u2160\u7EA7\u54CD\u5E94",
  status: "\u5F85\u751F\u6548",
  supersedesOrderId: ""
};
console.log("\n\u573A\u666F1\uFF1A\u8C03\u5EA6\u4EE4\u751F\u6548\u2014\u2014\u7EA7\u522B\u91CD\u7B97 / \u65B9\u6848\u5931\u6548\u91CD\u7B97 / \u8054\u52A8\u51BB\u7ED3+\u8FFD\u52A0\u590D\u6838 / \u672A\u5B8C\u6210\u4EFB\u52A1\u505C\u4F4F / \u5355\u7248\u63D0\u4EA4");
{
  const before = clone(seedDataset);
  const beforeVersion = before.snapshotVersion;
  const a01 = findA(before, "AN-260929-01");
  const oldPlanId = a01.plan.id;
  const link = before.emergencyLinks.find((l) => l.anomalyId === "AN-260929-01");
  ok(link.status === "\u5DF2\u542F\u52A8" && link.basisOrderId === "DO-260928-01" && link.basisSnapshotVersion === beforeVersion, "\u521D\u59CB\uFF1AAN-01 \u5DF2\u542F\u52A8\u8054\u52A8\uFF0C\u4F9D\u636E\u51BB\u7ED3\u5728\u65E7\u4EE4/V3");
  const after = applyDispatchOrder(before, { ...order }, ctx("\u9632\u6C5B\u6307\u6325\u90E8"));
  ok(after.snapshotVersion === beforeVersion + 1, `\u5FEB\u7167\u4EC5 +1\uFF08V${beforeVersion}\u2192V${after.snapshotVersion}\uFF09\uFF0C\u6574\u7248\u63D0\u4EA4`);
  ok(before.snapshotVersion === beforeVersion, "\u8F93\u5165\u5FEB\u7167\u672A\u88AB\u539F\u5730\u4FEE\u6539\uFF08\u65E0\u526F\u4F5C\u7528\uFF09");
  ok(after.dispatchOrders.find((o) => o.id === "DO-260928-01")?.status === "\u5DF2\u5E9F\u6B62", "\u65E7\u8C03\u5EA6\u4EE4\u5DF2\u5E9F\u6B62");
  ok(after.dispatchOrders.find((o) => o.id === order.id)?.status === "\u5DF2\u751F\u6548", "\u65B0\u8C03\u5EA6\u4EE4\u5DF2\u751F\u6548");
  const na01 = findA(after, "AN-260929-01");
  ok(na01.severity === "\u91CD\u5927", "AN-01 \u7EA7\u522B\u91CD\u7B97\u540E\u4ECD\u4E3A\u201C\u91CD\u5927\u201D\uFF08\u4E0D\u56E0\u8054\u52A8\u800C\u9519\u8BEF\u964D\u7EA7/\u6CBF\u7528\u65E7\u7EA7\uFF09");
  ok(na01.plan.id !== oldPlanId, "AN-01 \u5F53\u524D\u65B9\u6848\u5DF2\u6362\u4E3A\u91CD\u7B97\u65B0\u7248\uFF08\u4E0D\u518D\u662F\u65E7\u7248 PL-1\uFF09");
  ok(na01.plan.status === "\u5F85\u5BA1\u6279", "\u91CD\u7B97\u65B0\u65B9\u6848\u4E3A\u5F85\u5BA1\u6279");
  ok(na01.plan.basisOrderId === order.id && na01.plan.basisSnapshotVersion === after.snapshotVersion, "\u65B0\u65B9\u6848\u4F9D\u636E\u65B0\u4EE4/V4");
  const hist = na01.planHistory.find((p) => p.id === oldPlanId);
  ok(!!hist && hist.status === "\u5DF2\u5931\u6548" && hist.supersededByPlanId === na01.plan.id, "\u65E7\u65B9\u6848 PL-1 \u6574\u4F53\u7559\u75D5\u4E3A\u201C\u5DF2\u5931\u6548\u201D\uFF0C\u5E76\u6307\u5411\u65B0\u7248");
  const na02 = findA(after, "AN-260929-02");
  const na03 = findA(after, "AN-260929-03");
  ok(na02.severity === "\u91CD\u5927" && na02.plan.status === "\u5F85\u5BA1\u6279", "AN-02 \u6C34\u4F4D\u9AD8\u4E8E\u76EE\u68070.5m\u4EE5\u4E0A \u2192 \u91CD\u7B97\u4E3A\u91CD\u5927\uFF0C\u65B9\u6848\u5931\u6548\u91CD\u7B97\u5F85\u5BA1\u6279");
  ok(na03.severity === "\u91CD\u5927" && na03.plan.status === "\u5F85\u5BA1\u6279", "AN-03 \u2160\u7EA7\u4E14\u4F4D\u79FB\u8FBE\u9884\u8B66 \u2192 \u91CD\u7B97\u4E3A\u91CD\u5927\uFF0C\u65B9\u6848\u5931\u6548\u91CD\u7B97\u5F85\u5BA1\u6279");
  ok(na03.severityHistory[0]?.to === "\u91CD\u5927" && na03.severityHistory[0].snapshotVersion === after.snapshotVersion, "\u7EA7\u522B\u53D8\u5316\u7559\u75D5\u5230 V4");
  const nlink = after.emergencyLinks.find((l) => l.anomalyId === "AN-260929-01");
  ok(nlink.basisPlanId === "PL-1" && nlink.basisOrderId === "DO-260928-01" && nlink.basisSnapshotVersion === beforeVersion, "\u8054\u52A8\u542F\u52A8\u4F9D\u636E\uFF08PL-1/\u65E7\u4EE4/V3\uFF09\u539F\u6837\u51BB\u7ED3\uFF0C\u672A\u88AB\u65B0\u65B9\u6848\u8986\u76D6");
  ok(nlink.status === "\u590D\u6838\u4E2D" && nlink.reviews.length === 1 && nlink.reviews[0].newOrderId === order.id && !nlink.reviews[0].resolved, "\u8054\u52A8\u4EC5\u8FFD\u52A0\u4E00\u6B21\u9488\u5BF9\u65B0\u4EE4\u7684\u5F85\u590D\u6838");
  ok(na01.status === "\u5E94\u6025\u8054\u52A8", "AN-01 \u4ECD\u5904\u4E8E\u5E94\u6025\u8054\u52A8\uFF08\u65B9\u6848\u867D\u91CD\u7B97\u5F85\u6279\uFF0C\u8054\u52A8\u672A\u4E2D\u65AD\uFF09");
  const frozen = after.tasks.filter((t) => t.anomalyId === "AN-260929-01");
  ok(frozen.length === 2 && frozen.every((t) => t.frozen && t.status === "\u5DF2\u6682\u505C"), "AN-01 \u4E24\u6761\u8FDB\u884C\u4E2D\u4EFB\u52A1\u5168\u90E8\u6682\u505C\u51BB\u7ED3");
  const tk3 = after.tasks.find((t) => t.id === "TK-3");
  ok(tk3.frozen && tk3.status === "\u5F85\u542F\u52A8", "\u672A\u542F\u52A8\u4EFB\u52A1 TK-3 \u88AB\u51BB\u7ED3\u4FDD\u6301\u201C\u5F85\u542F\u52A8\u201D");
  ok(after.audit.filter((a) => a.snapshotVersion === after.snapshotVersion).length >= 9, "\u672C\u6B21\u8054\u52A8\u5BA1\u8BA1\u5168\u90E8\u6807\u6CE8 V4\uFF08\u540C\u7248\uFF09");
}
console.log("\n\u573A\u666F2\uFF1A\u534A\u6210\u54C1\u9632\u62A4\u2014\u2014\u4EFB\u52A1\u5728\u51BB\u7ED3\u671F\u95F4\u4E0D\u5F97\u63A8\u8FDB\uFF1B\u5931\u8D25\u56DE\u6EDA\u7531\u4E0A\u5C42\u4FDD\u8BC1\u8F93\u5165\u4E0D\u53D8");
{
  const after = applyDispatchOrder(clone(seedDataset), { ...order }, ctx());
  const tk1 = after.tasks.find((t) => t.id === "TK-1");
  const blocked = advanceTask(after, "TK-1", "\u8BD5\u56FE\u63A8\u8FDB", ctx());
  ok(blocked === after, "\u51BB\u7ED3\u4EFB\u52A1\u63A8\u8FDB\u88AB\u62D2\u7EDD\uFF08\u8FD4\u56DE\u539F\u72B6\u6001\uFF0C\u672A\u4EA7\u751F\u65B0\u7248\u672C/\u534A\u6210\u54C1\uFF09");
  const a01 = findA(after, "AN-260929-01");
  ok(a01.plan.status === "\u5F85\u5BA1\u6279" && a01.status === "\u5E94\u6025\u8054\u52A8", "\u4E0D\u5B58\u5728\u201C\u8054\u52A8\u5DF2\u542F\u52A8\u3001\u65B9\u6848\u5374\u6309\u65E7\u7248\u6267\u884C\u201D\u7684\u534A\u6210\u54C1\uFF1A\u65B9\u6848\u5DF2\u91CD\u7B97\u5F85\u6279\uFF0C\u8054\u52A8\u590D\u6838\u4E2D");
}
console.log("\n\u573A\u666F3\uFF1A\u4E24\u4EBA\u540C\u65F6\u7B7E\u6279\u540C\u4E00\u5F02\u5E38\u2014\u2014\u53EA\u8FC7\u4E00\u4EFD\uFF0C\u540E\u5230\u8005\u8F6C\u8349\u7A3F\u5E76\u770B\u5230\u4F9D\u636E\u53D8\u5316");
{
  const base = clone(seedDataset);
  const a03 = findA(base, "AN-260929-03");
  const pv = a03.plan.version;
  const sv = base.snapshotVersion;
  const first = approvePlan(base, { anomalyId: "AN-260929-03", approver: "\u4F55\u6E05", note: "\u540C\u610F", expectedPlanVersion: pv, expectedSnapshotVersion: sv }, ctx("\u4F55\u6E05"));
  ok(first.outcome === "approved", "\u7B2C\u4E00\u4EFD\u7B7E\u6279\u901A\u8FC7");
  const approvedPlan = findA(first.dataset, "AN-260929-03").plan;
  ok(approvedPlan.approvedBy === "\u4F55\u6E05" && approvedPlan.status === "\u6267\u884C\u4E2D", "\u65B9\u6848\u7F6E\u4E3A\u6267\u884C\u4E2D\u4E14\u8BB0\u5F55\u7B7E\u6279\u4EBA");
  const second = approvePlan(first.dataset, { anomalyId: "AN-260929-03", approver: "\u9AD8\u5B81", note: "\u6211\u4E5F\u540C\u610F", expectedPlanVersion: pv, expectedSnapshotVersion: sv }, ctx("\u9AD8\u5B81"));
  ok(second.outcome === "draft" && second.reason === "\u5DF2\u6709\u4EBA\u7B7E\u6279", "\u7B2C\u4E8C\u4EFD\uFF08\u540C\u7248\u5E76\u53D1\uFF09\u4E0D\u901A\u8FC7\uFF0C\u539F\u56E0\u201C\u5DF2\u6709\u4EBA\u7B7E\u6279\u201D");
  const draft = second.dataset.drafts.find((d) => d.approver === "\u9AD8\u5B81");
  ok(!!draft && draft.planId === approvedPlan.id, "\u9AD8\u5B81\u7684\u7B7E\u6279\u4FDD\u7559\u4E3A\u8349\u7A3F");
  ok(findA(second.dataset, "AN-260929-03").plan.approvedBy === "\u4F55\u6E05", "\u65B9\u6848\u7B7E\u6279\u4EBA\u4ECD\u662F\u4F55\u6E05\uFF0C\u672A\u88AB\u7B2C\u4E8C\u4EFD\u8986\u76D6");
  ok(second.dataset.approvals.filter((x) => x.planId === approvedPlan.id).length === 1, "\u540C\u4E00\u65B9\u6848\u53EA\u6709\u4E00\u6761\u7B7E\u6279\u8BB0\u5F55");
}
console.log("\n\u573A\u666F4\uFF1A\u4F9D\u636E\u5728\u7B7E\u6279\u671F\u95F4\u53D8\u5316\u2014\u2014\u540E\u5230\u8005\u8349\u7A3F\u663E\u793A\u4F9D\u636E\u7248\u672C\u53D8\u5316");
{
  const base = clone(seedDataset);
  const a03 = findA(base, "AN-260929-03");
  const oldPv = a03.plan.version;
  const oldSv = base.snapshotVersion;
  const changed = applyDispatchOrder(base, { ...order }, ctx());
  const newA03 = findA(changed, "AN-260929-03");
  const late = approvePlan(changed, { anomalyId: "AN-260929-03", approver: "\u9AD8\u5B81", note: "\u6309\u65E7\u7248\u540C\u610F", expectedPlanVersion: oldPv, expectedSnapshotVersion: oldSv }, ctx("\u9AD8\u5B81"));
  ok(late.outcome === "draft" && late.reason === "\u4F9D\u636E\u7248\u672C\u5DF2\u53D8\u5316", "\u4F9D\u636E\u5DF2\u53D8 \u2192 \u4E0D\u901A\u8FC7\uFF0C\u539F\u56E0\u201C\u4F9D\u636E\u7248\u672C\u5DF2\u53D8\u5316\u201D");
  const draft = late.dataset.drafts.find((d) => d.approver === "\u9AD8\u5B81");
  ok(draft.basisChanged && draft.snapshotVersionAtAttempt === oldSv && draft.currentSnapshotVersion === changed.snapshotVersion && draft.currentPlanVersion === newA03.plan.version, "\u8349\u7A3F\u540C\u65F6\u8BB0\u5F55\u5C1D\u8BD5\u65F6\u4E0E\u5F53\u524D\u4F9D\u636E\u7248\u672C\uFF0C\u540E\u5230\u8005\u80FD\u770B\u5230\u53D8\u5316");
}
console.log("\n\u573A\u666F5\uFF1A\u65B0\u65B9\u6848\u7B7E\u6279\u540E\u51BB\u7ED3\u4EFB\u52A1\u6062\u590D\uFF1B\u8054\u52A8\u590D\u6838\u53EF\u7EF4\u6301/\u89E3\u9664\u4E14\u539F\u4F9D\u636E\u4E0D\u53D8");
{
  const afterOrder = applyDispatchOrder(clone(seedDataset), { ...order }, ctx());
  const a01 = findA(afterOrder, "AN-260929-01");
  const newPlan = a01.plan;
  const approved = approvePlan(afterOrder, { anomalyId: "AN-260929-01", approver: "\u4F55\u6E05", note: "\u6309\u2160\u7EA7\u4EE4\u6267\u884C", expectedPlanVersion: newPlan.version, expectedSnapshotVersion: afterOrder.snapshotVersion }, ctx("\u4F55\u6E05"));
  ok(approved.outcome === "approved", "\u91CD\u7B97\u65B0\u65B9\u6848\u53EF\u91CD\u65B0\u7B7E\u6279");
  const tasks = approved.dataset.tasks.filter((t) => t.anomalyId === "AN-260929-01");
  ok(tasks.every((t) => !t.frozen && t.status === "\u5F85\u542F\u52A8" && t.planId === newPlan.id), "\u7B7E\u6279\u540E\u88AB\u51BB\u7ED3\u4EFB\u52A1\u6309\u65B0\u65B9\u6848\u6062\u590D\uFF08\u89E3\u51BB\u3001\u6307\u5411\u65B0\u65B9\u6848\uFF09");
  const link = approved.dataset.emergencyLinks.find((l) => l.anomalyId === "AN-260929-01");
  const review = link.reviews[0];
  const reviewed = resolveEmergencyReview(approved.dataset, { linkId: link.id, reviewId: review.id, conclusion: "\u7EF4\u6301\u8054\u52A8", note: "\u6C34\u60C5\u4ECD\u7D27\uFF0C\u7EF4\u6301" }, ctx("\u503C\u73ED\u8D1F\u8D23\u4EBA"));
  const rlink = reviewed.emergencyLinks.find((l) => l.id === link.id);
  ok(rlink.status === "\u7EF4\u6301" && rlink.reviews[0].resolved && rlink.reviews[0].conclusion === "\u7EF4\u6301\u8054\u52A8", "\u8FFD\u52A0\u590D\u6838\u7ED9\u51FA\u201C\u7EF4\u6301\u8054\u52A8\u201D\u7ED3\u8BBA");
  ok(rlink.basisOrderId === "DO-260928-01" && rlink.basisSnapshotVersion === 3 && rlink.basisPlanId === "PL-1", "\u590D\u6838\u540E\u539F\u542F\u52A8\u4F9D\u636E\u4ECD\u51BB\u7ED3\u4E0D\u53D8");
  ok(findA(reviewed, "AN-260929-01").status === "\u5E94\u6025\u8054\u52A8", "\u7EF4\u6301\u8054\u52A8 \u2192 \u5F02\u5E38\u4FDD\u6301\u5E94\u6025\u8054\u52A8");
}
console.log("\n\u573A\u666F6\uFF1A\u5199\u5165\u5931\u8D25\u53EF\u6062\u590D\u3001\u7EDD\u4E0D\u534A\u6210\u54C1\u2014\u2014\u5931\u8D25\u65F6\u4FDD\u7559\u4E0A\u4E00\u5DF2\u53D1\u5E03\u7248\u672C");
{
  const published2 = clone(seedDataset);
  const staged = applyDispatchOrder(clone(published2), { ...order }, ctx());
  let commitFails = true;
  let visible = commitFails ? published2 : staged;
  ok(visible.snapshotVersion === seedDataset.snapshotVersion && findA(visible, "AN-260929-01").plan.id === "PL-1", "\u63D0\u4EA4\u5931\u8D25\uFF1A\u770B\u677F/\u8BE6\u60C5/\u5BA1\u9605\u5305\u4ECD\u8BFB\u4E0A\u4E00\u5DF2\u53D1\u5E03\u7248\u672C V3\uFF0C\u65B9\u6848\u4ECD\u662F PL-1\uFF08\u65E0\u534A\u6210\u54C1\uFF09");
  ok(staged.snapshotVersion === seedDataset.snapshotVersion + 1 && findA(staged, "AN-260929-01").plan.basisOrderId === order.id, "\u6682\u5B58\u5FEB\u7167\u5B8C\u6574\u4FDD\u7559\uFF08V4\uFF09\uFF0C\u7B49\u5F85\u6062\u590D");
  commitFails = false;
  visible = commitFails ? published2 : staged;
  ok(visible.snapshotVersion === 4 && findA(visible, "AN-260929-01").plan.basisOrderId === order.id, "\u91CD\u8BD5\u6210\u529F\uFF1A\u6574\u7248\u53D1\u5E03 V4\uFF0C\u770B\u677F/\u8BE6\u60C5/\u5BA1\u9605\u5305\u6309\u540C\u7248\u5C55\u793A");
  const ordered = applyDispatchOrder(clone(seedDataset), { ...order }, ctx());
  ok(closeAnomaly(ordered, "AN-260929-01", "\u5173\u95ED", ctx()) === ordered, "\u65B9\u6848\u5F85\u6279/\u4EFB\u52A1\u672A\u95ED\u73AF\u65F6\u5173\u95ED\u88AB\u62D2\u7EDD");
}
console.log('\n\u573A\u666F7\uFF1A\u4E00\u81F4\u6027\u68C0\u67E5\u2014\u2014\u6B63\u5E38\u5FEB\u7167\u96F6\u95EE\u9898\uFF1B\u6CE8\u5165"\u8054\u52A8\u5DF2\u542F\u52A8+\u65E7\u7248\u65B9\u6848"\u5FC5\u88AB\u68C0\u51FA');
{
  ok(findConsistencyIssues(seedDataset).length === 0, "\u79CD\u5B50\u5FEB\u7167\u4E00\u81F4\u6027\u68C0\u67E5\u96F6\u95EE\u9898");
  const after = applyDispatchOrder(clone(seedDataset), { ...order }, ctx());
  ok(findConsistencyIssues(after).length === 0, "\u8C03\u5EA6\u4EE4\u751F\u6548\u540E\u7684\u8054\u52A8/\u91CD\u7B97/\u51BB\u7ED3\u5FEB\u7167\u96F6\u95EE\u9898");
  const approved = approvePlan(after, { anomalyId: "AN-260929-01", approver: "\u4F55\u6E05", note: "x", expectedPlanVersion: findA(after, "AN-260929-01").plan.version, expectedSnapshotVersion: after.snapshotVersion }, ctx());
  ok(findConsistencyIssues(approved.dataset).length === 0, "\u65B0\u65B9\u6848\u7B7E\u6279\u6062\u590D\u540E\u4ECD\u96F6\u95EE\u9898");
  const corrupted = clone(seedDataset);
  corrupted.dispatchOrders.find((o) => o.id === "DO-260928-01").status = "\u5DF2\u5E9F\u6B62";
  const issues = findConsistencyIssues(corrupted);
  ok(issues.some((i) => i.includes("\u4ECD\u6309\u5DF2\u5E9F\u6B62\u65E7\u4EE4")), '\u6CE8\u5165\u7684"\u8054\u52A8\u5DF2\u542F\u52A8\u3001\u65B9\u6848\u4ECD\u65E7\u7248"\u534A\u6210\u54C1\u88AB\u4E00\u81F4\u6027\u68C0\u67E5\u6355\u83B7');
}
console.log(`
\u5168\u90E8 ${pass} \u9879\u65AD\u8A00\u901A\u8FC7 \u2705`);
