---
schema_version: 2
session: "20261025T043239Z"
task: "012-foundation-client-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# T-01 TS 方法级运行时合同修复

## Goal
修复008独立审查STD/SPEC-03：外部JSON必须在resolve/Host执行/回执发送前进行完整方法级runtime验证，不用as断言冒充。用户同范围修复授权有效，真实操作用户后验，无提交发布。你为原TS owner，独立复审另由Lead派遣。

## Inputs
Map7→当前dev及refs→T01；读008-foundation-review/REPORT.md和raw-probes.log。实际生产反例：service.status schema99/state非法/数字revision仍resolve；带有效lease的host.invoke数字expectedRevision/resource.revision、object content、unknown字段进入Host并committed。现22个旧测试绿不能证明这些语义。保留old输入和报告。

## Workspace and Scope
同根 /home/wta/orca/workspaces/obsidian-huhu/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715。可写本票TS core/protocol/**、desktop/transport/**和本TASK报告日志；现有api.ts原则保持合同不改，确需修正先精确请求。Go/contracts由 /root/foundation_go (011)唯一写，根package/lock/notices/eslint归T27；正式状态/Evidence只读。先和Go owner明确共同schema/运行时validator接缝，不能各自写另一套字段语言。新增生成文件如由Go generator输出，先向Lead报精确路径并协调生成窗口。禁止再派遣。

## Acceptance
先加真实HapConnection反例跑红，再完整验证：所有普通方法请求/结果，hello，host.attach结果，host.invoke/queryReceipt参数及Host回执；覆盖required/additionalProperties/literal/enum/decimal/UTC/嵌套结构。非法result拒绝pending并确定失败，非法Host参数绝不可到Host，非法Host结果不标committed/输出错误事实；错误处理有界并释放pending/计时器。未装配方法仍明确拒绝，无伪成功。对全部版本schema建立可维护的唯一事实源，优先复用维护活跃、许可明确的现成validator/编译方案；需要npm dev/runtime依赖先给Lead/T27精确请求与原因，不自行写package。不要手写漂移的61方法字段检查表；不要把readonlyJSONschema成功当runtime校验完成。

Host-free core、lifecycle、bounded queues、request/response方向和已有shared golden保持。真实TS-Go已有Runner suite、core单测/负向schema一致、production/test tsc、定向lint/架构；完整build由Lead窗口。联合反向Host是否需新增跨进程回归按缺陷风险决定，若需Go测试harness由Go owner在其foundation写集接纳，不私改Go。

## Return
本TASK REPORT按coordination模板ASCII Session/Task/Status和三个必需二级标题，列STD/SPEC-03修复与红绿证据/精确文件hash/未验事项，return校验通过。全部writer/子进程停止后交回，不标票done。
