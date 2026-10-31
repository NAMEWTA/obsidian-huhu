---
schema_version: 2
session: "20261025T043239Z"
task: "088-recovery-claim-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# 修复恢复屏障导致的领取饥饿

## Goal

由原 /root/foundation_go 修复独立审查 F-083-01，并检查同一领取链上的同类先截断后过滤机制。保持原 T03/T06 owner、Map21/Goal20、28票55AC与产品合同。沿既有 gpt-6.1-sol/xhigh 偏好，不再委派。实际原生派遣后开始，文件存在不表示已开工。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。按已读 AGENTS workspace/catalog/runtime → 当前 Map → dev/testing → T03/T06/T16 → I/error/test-reliability 恢复；未变规则可复用。

完整读083最终REPORT、logs/05-starvation-probe.go.txt、05-starvation.log、05-result.json及Root evidence/083-lead-return.json。原固定输入为 evidence/T-16.md#review-input-recovery-r1，SHA256 5283c6f2df32207a609142551375684c980b972471ff1026290bfd0c7b07ab2b。080/081/082/086、Root独立E2E-r2/build/lint原记录保持；这些绿证据没有覆盖本次多树饥饿。01–04的探针前提/编译错误不是产品红。

## Workspace and Scope

唯一生产writer是你。精确可写：

- 原T03 native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go，必要的同目录局部扫描辅助代码；确有同一领取状态需要时可维护store.go中的私有字段，但不能改公开准入合同。
- 原T06 native/huhubot/internal/adapters/outbound/sqlite/effects/continuations.go，仅在实际可达性/共享机制核对后处理同类Ready扫描；先向Root说明证据与最小方案，不凭未验证猜测扩大修改。
- 原T03 native/huhubot/tests/contract/chat/**、原T06 native/huhubot/tests/contract/approval/**，仅本缺陷与相邻领取风险的永久回归。
- 自有REPORT/log与外部探针/快照。

其余生产/永久测试、recovery与collaboration目录、公共API/schema/迁移/依赖、TS/产物/正式Evidence/Map/Goal/他人报告只读。若实际修复需要更多原owner路径，先给精确理由和写集，不越界。没有提交、推送、发布、归档授权。真实Provider/Obsidian/目标OS由用户后验，不索凭证。

## Acceptance

先确认局部机制和最小设计，再保存真正红→绿。原公开构造：先合法受理6 roots，逐树真实delegate32；前5树各1运行+31accepted，第6树32accepted尚未领取；真实Close/Done重开后5树blocked、第6资格none。修复后第6原32children在不取消/恢复前5树时各执行一次，原父succeeded，前5树保持闭门/零新模型。保留4树正常CAS恢复对照及只取消前方树的因果历史；不要通过放宽全局队列/RootChildren、减少children、改SQL业务状态或自动释放恢复门造绿。

扫描必须能越过不可领取候选；只提高128常量不成立。比较最小稳定keyset分页/公平游标或安全预过滤的实际适用性，保留确定排序、最终同事务恢复/取消/权限/slot门、claim唯一性、known inbox拒绝后继续扫描与短事务/取消响应。核对accepted/recovering、审批Ready、waiting-parent的真实调用链；相邻静态疑点与已证实finding分开。前页slot不满足时不能仍永久重复同页，也不能在选择后丢掉已占slot或已消费结果。

永久测试从公开API/真实Executor/SQLite进入，采用屏障锁住故障窗口，读取真实状态，所有Core/producer/进程实际Close/Done/Wait。不要只测试私有SQL或靠睡眠/内部调用计数代替消费结果。保留现有CP、原命令回执、预算、取消/Stop与独立树边界。

你获得本轮唯一必要Go检查窗口：先定向红/绿与race，再按实际影响选择chat/approval/recovery/delegation相关包；不机械重跑整个11包矩阵或TS build。提交检查计划和实际变更闭包给Root，旧输入未变的生成/TS/build/lint证据可复用。Root拥有独立E2E与后续固定候选双轴审查。所有原失败保留，未达到真实前提的探针要精确分类。

## Return

REPORT首h2前Session/Task/Status；记录局部方案、实际生产与测试diff、精确SHA清单、正常/反向控制、原始命令exit/Wait、适用验证及未验证项。先亲自return结构校验0，全部自有生产/测试writer和进程停止，再原生MESSAGE+FINAL交回。不得宣布T16/G1、其余票或Goal完成。
