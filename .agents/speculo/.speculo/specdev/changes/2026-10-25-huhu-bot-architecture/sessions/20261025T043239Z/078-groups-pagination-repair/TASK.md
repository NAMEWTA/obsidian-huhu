---
schema_version: 2
session: "20261025T043239Z"
task: "078-groups-pagination-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 修正任务列表分页中的实际消费边界

## Goal
原 /root/credential_provider 修复077当前独立审查确认的分页消费P2。077已真实MESSAGE/FINAL交回，Root全读并验证299文件/87来源、237副本、return0，当前打开原owner精确修复窗口；收到Root实际原生派遣后可写源码。既有gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map19/Goal18仍当前。AGENTS发现→dev/testing→T13/T11及I/error/test-reliability。完整读077最终REPORT及实际反例、原074最终REPORT、当前T13 review-input-groups-r1；077最终REPORT SHA256 79025664b38e2ff00a3360e775c64f0e74f74ceb4b14f2c67e85388ec22bb5ec，Root回执 evidence/077-lead-return.json。LOG051真实模型/Obsidian/OS仍用户后验。

## Workspace and Scope
生产唯一写集：native/huhubot/internal/adapters/outbound/sqlite/collaboration/store.go（原T11）。回归只在native/huhubot/tests/contract/groups/**（原T13；可新增明确分页消费者测试），不改无关旧断言。自有TASK目录REPORT/log可写。所有其他代码、公共API/schema/生成物、旧SQL、依赖、规范状态、他人报告及产物只读；需要额外路径先向Root报告实际最小必要性。无提交、推送、发布。

077原反例通过公开群/同Executor，在B使用真实绑定tasks.list时提供四个合法131072-byte私有结果；页预算实际只返回三个，第四个却已被readTaskInTx/ConsumePrivateInTx并入B持久GroupBinding。只移除未返回的成员，就导致本应可继续的B实际Dispatch=0。源为store.go当前读入时消费、之后才检查524288-byte页预算的顺序；不是要求放松读权限。

恢复精确边界：只有本次实际返回给模型的私有正文才记为消费；确定页面内容与全部必要授权、持久贡献union/revision提升仍在同一短事务。GetTask真实返回仍消费，用户Facade查询仍不改变模型proof；选入页的所有来源/成员完整元组与Derived依然合并，当前消费者读取/最后Dispatch/子任务继承保持。未返回项不制造依赖/revision，不以清空有效proof、删除检查、截断页正文或扩大wire预算解决。首项过大/后续读取失败仍不得留下部分消费提交；跨页真正读取后则必须形成真实依赖。

## Acceptance
先用077原精确反例在当前输入复现并留红，再写永久回归与最小修复。独立077原红探针通过持久proof找遗漏者；永久回归必须从 admitted IDs 减 actual returned IDs 找未返回成员，在修复后也真实执行移除，不能因phantom消失而跳过关键动作。对照至少观察：仅第一页后移除遗漏成员不取消消费者/真实Dispatch仍1；移除已返回成员阻止后续Dispatch；明确请求下一页后该成员成为真实贡献者、移除后阻止派发；页无遗漏/重复、保持有界、用户只读不消费、终态slots/pins0。保留原合法Get/List消费、旧ToolExecution严格subset与连续C+D/temporary后代真实闭包，不能用mock Repo代替产品路径。

Root在本次原生派遣时授予078唯一重检查窗口；077已释放，Root不并跑重检查。先具体红绿，再按影响范围验证groups/delegation/access消费者，旧全矩阵/TS/build只在影响闭包外摘要一致时复用，不为简单修复择绿重跑或改阈值。冻结自有后不得边测边改，所有Go/Node/Runner实际Wait。Root随后独立回读/反例复验与当前完整候选双轴复审，T16仍未开工。

## Return
REPORT首h2前Session/Task/Status，记录精确自有前后SHA、最小差异、原始命令/exit/Wait/红绿、当前合同/共享输入与复用边界。亲自return0后native MESSAGE+FINAL，作者源码/报告停写，所有进程结束。不得称当前联合候选或全Goal已通过。
