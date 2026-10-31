---
schema_version: 2
session: "20261025T043239Z"
task: "147-resume-inbox-engine"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# 可信补充消息进入原恢复工具结果

## Goal

原共同Engine owner native:/root/engine_adapter 接146可信内部恢复包，将等待期间补充消息放入原pending工具结果的固定后缀位置，三协议真实SDK均能读到且不重复；保留初始ShortTerm/CP前缀与旧artifact兼容。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，Map39/Goal38/LOG127。用户授权全部28票55AC/Agent Team/代码层交付，真实操作用户后验，不访问外部Provider或凭证，无提交推送发布归档，无再委派。依Map→dev/testing→T08/T09/T10及123短期/130组件/139复审固定行为；146 TASK与其待冻结resume-inbox-contract.md是内部交接输入，缺失时只读等Root。

原根因与真实红见evidence/T-14-logs/resume-inbox-window-map39.md、lead-memory-regression-r1.json及145日志。一般waiting用户/model补充虽然写入并通过当前权限，但Prepare清空后没有进入Decision.Children；question答案独立已有Children路径。此修复是既有任务补充行为，不新增外部接口。

## Workspace and Scope

以native/huhubot为前缀，仅internal/adapters/outbound/eino/common/{checkpoint,engine,tools}.go及必要新增resume_inbox.go；responses/checkpoint.go、anthropic/checkpoint.go仅现有工具结果字段验证接缝，其他driver行为只读。新增tests/contract/engine/{chat,responses,anthropic}/resume_inbox_test.go及必要同包既有helper（先报确切路径）；可新增common本包有意义测试。API/Executor/SQLite归146单写；145协作测试只读；014/其他SQL/go.mod/sum/HAP/TS不改。

可写本任务REPORT/logs/manifest。正式状态/Evidence归Root；不得自行另写不同恢复合同。

## Acceptance

1. 当前145独占Go，你先只读原代码及146方案，反馈最小消费者合同。Root确认145归窗、146纯API冻结且你确认后，才开始source-only。任何Go/Node/DB检查须Root另授唯一窗，其他作者停写相关输入。
2. 新正文仅来自可信恢复包；原sealed prefix/Intent/BindingDigest完全不变。按真实消息身份在当前Decision工具结果中恰好一次，连续两次挂起不重注；初始inbox、先前工具message/补充、question answer不得重复；同正文不同ID保持。不能插入任意后来user来绕过validateTranscript。
3. 复用现有CP完整程序位置；新可选字段在缺省时不改变旧CP JSON字节，旧Chat v1与Responses/Anthropic v2检查及native opaque/tool ID顺序保持。恢复持久Decision重放不得吸入最新inbox或重复收费/工具执行。控制token/权限元数据不泄漏到模型；大小/UTF8/结构/身份冲突拒绝。
4. 必须实际三协议SDK→本地HTTP请求中观察原CP保持、补充正文一次、两轮去重和question答案不双注；至少与146真实Core/SQLite消费者衔接，不能只测内部序列化。原权限/取消/费用/资源释放不退化，不放宽测试timeout或断言。
5. 首先有有效行为红，修后定向normal及必要CP/恢复消费者、适用race/vet由Root安排；固定Go1.26.10/输入/原日志/exit/Wait，完成立即停写归窗。Root负责共同全仓/E2E/独立双轴，不签整票。

## Return

先ACK与147最小消费方案，等待146稳定纯合同。最终REPORT首h2前Session:20261025T043239Z、Task:147-resume-inbox-engine、Status:completed，包含实际来源/命令/前后hash/mode/失败保留/未验边界。亲自validate-dispatch return0后MESSAGE+FINAL。
