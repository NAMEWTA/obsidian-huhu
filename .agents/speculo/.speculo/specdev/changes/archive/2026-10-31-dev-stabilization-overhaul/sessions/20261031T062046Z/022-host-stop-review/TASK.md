---
schema_version: 2
session: "20261031T062046Z"
task: "022-host-stop-review"
kind: review
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-06
---

## Goal
native:/root/sources 作为未参与T06实现的独立Astra low reviewer，审查固定10项候选，双轴独立判断。T09停在50 Run检查点，不并行启动规模测量。

## Inputs
Map16、dev/testing、完整Ticket06、Spec AC281/282、ADR002、T04阶段合同和已验收Evidence、execution-boundaries、018 REPORT及T06 review-input。Input-SHA256 50504adfbeb61da567acaa67b2b03c586d467b3b06c81e57438ec72fbd43c5cf。读取实际diff/调用方与每项摘要，不能只依赖作者报告。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa；只写本REPORT，其余只读。允许git diff/show/status等只读操作，禁止Git写入/递归代理/真实Obsidian/产品修复。若摘要或独立性失效即报告。你做过T14/T16/T03，未实现T06；T04审查不影响T06独立性。

## Acceptance
核对唯一stop owner、caller timeout/signal只取消观察、不终止cleanup；重复stop和晚到launch/onConnect/refresh/自然退出/重连收敛，Host cleanup barrier不会被child close越过。普通EOF和BotClient.close不隐式TERM/KILL；仅明确force且不能成功事实。四阶段/失败/真实code-signal-forced完整、不伪造prehello成功。跨runtime同Profile reservation实际阻止旧owner清理前重开，失败保守阻断但状态与恢复边界准确；绝对路径/大小写/清理注册时序和多实例争用无泄漏/误拒绝。成功释放必须四阶段+child exit+Host cleanup；managed:false保持断连原意。测试临时目录删除在实际进程回收后、Linux信号只操作自有进程、finally恢复收割。必须检查实际消费者、数据归属、类型以及T04联合合同，不能忽略有意保留failed reservation的可用性代价。T33负责UI，普通模块重启不是已验证恢复。可运行必要窄验证，不把作者59项和Lead Go全量冒称自己执行；无全局预算通过声明。

两轴原始输出显式anchor original-standards-output / original-specification-output：Reviewer native:/root/sources、Axis、Result pass或request-changes、Input-SHA256、Observed。finding需具体路径行号/触发/影响/严重度及最小修正范围。

## Return
按coordination/report-template聚焦交接/产物与验证/问题与下一步，停写REPORT交Lead，禁止直接修复。完成后等待Lead安排恢复T09。
