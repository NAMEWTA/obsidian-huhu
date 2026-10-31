# 群成员移除后的效果所有者核查（Map19 / Goal18）

本补充响应073真实请求并由Root回读现行调用路径和实际红灯；原073/074/075 TASK及摘要不变。它恢复原T06/T07的精确维护，不增加产品范围、Ticket或AC。原072/r3代码门作为历史保留，新增群消费者使这一核查接缝需要重新验证。

## 证据与唯一写集

073在隔离的真实Go源码副本运行公开group→仅B真实note审批→默认writebridge Invoke一次并丢回执→child失败且effect unknown_outcome→公开移除B→原用户Effects.Get/Reconcile。两者实际GROUP_MEMBER_REMOVED，QueryReceipt=0，exit1且Wait完成。原始日志：`sessions/20261025T043239Z/073-groups-core/logs/11-effect-owner-probe-red.log`，SHA256 `3ae0ecf5a7a2791721ba682db1dd97c8e684e71e4cb9f9c6c6fdbf8c25424958`。08保留223文件输入，09保留探针；10只是缺Title的夹具失败，不称行为红灯。

- 原T06作者foundation_go/073仅新增 `native/huhubot/internal/adapters/outbound/sqlite/effects/reconcile.go` 的本次写权，维护loadReconciliationInTx的效果owner读取边界。
- 原T07同一作者073仅新增 `native/huhubot/tests/contract/effect-reconcile/reconcile_test.go` 的本次写权，加入真实公开流程、拒绝对照与生命周期回归。
- 其余T06/T07生产、TS Host、审批、Blob、SQL和应用服务仍只读。确需更多路径须先给出实际证据与最小请求。074与已交回075不写这两文件。

## 不变量

EffectView只返回效果ID、RunID、修订、状态、原因与无正文HostReceipt。execution.ReadInTx的真实Profile、Run principal与Session owner/member验证必须保留。当前模型Group/来源Grant的正文权限不应阻止原用户核查已经发生但结果不确定的自己效果；内部EffectDispatch/Preview不进入用户响应，仍只交给现有核查服务计算原指纹并调用Host.QueryReceipt。

不弱化Approvals.Get/List的正文授权或全局Group/Grant checker，不恢复Run、不取得新模型claim、不重新Invoke。原Profile/CommandEpoch/CAS/幂等回执、当前Host lease/connection/workspace、原效果指纹与回执校验继续有效。终态Run只可附加核查事实，不变为运行态；未知仍保持未知。补充实际foreign principal/Profile拒绝且零Host查询、移除后审批正文仍拒绝、合法owner查询/核查一次、换合法lease仍只Query不写入、原Run终态不变等对照。沿原真实红灯输入给出绿灯，不用mock Repository代替公开Core/SQLite/默认writebridge路径。

## 状态与资源

T06/T07恢复in_progress、当前群维护尝试0，旧全部失败与通过记录原样保留；T13及其余原owner维护继续。两路径仍由073单writer；轻量测试与074互斥，重矩阵和Root稳定E2E另由Root分配。28票/55AC、DAG、执行限制及用户后验边界不变。当前补充不表示修复、测试或独立审查通过。
