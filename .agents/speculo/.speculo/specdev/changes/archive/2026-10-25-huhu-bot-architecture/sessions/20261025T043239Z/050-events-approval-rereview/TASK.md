---
schema_version: 2
session: "20261025T043239Z"
task: "050-events-approval-rereview"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-06
---

# 事件与审批候选2独立双轴复审

## Goal
由未参与生产实现的原 /root/foundation_review 对修复后完整候选执行标准轴与规范轴复审。仅 Root 实际 followup_task 启动；原 gpt-6-astra/high 偏好沿用，不冒称运行时 attestation。不得实施修复或再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map13/Goal12，LOG051/071。复用已读 AGENTS/发现指南/dev 和046实际审查规则、Spec/ARCH/ADR/T04/T06及原T01/T03/T05维护。唯一当前输入 evidence/T-06.md#review-input-r2；精确文件/来源数量与 Input SHA 以 evidence/T-06-logs/review-freeze-r2.json 及 Root 实际派遣消息为准，准备模板不表示已冻结。

完整回读048-source-delivery-repair与049-event-page-repair最终REPORT、原始红绿输出及本次实际diff。原046完整三项P2/独立探针/失败回执保留于原TASK和evidence/T-06.md#review-failure-r1。Root修复复放：evidence/T-06-logs/lead-repair-e2e-r2.json及原始日志，实际复制原046探针，仅重命名标识符防同名，输入/断言未改；当前全插件build/lint见evidence/T-04-logs/lead-ts-build-result-r2.json。旧042/043/044、Root原E2E和040/046未受影响观察只在逐项摘要及影响闭包相容时复用。

## Workspace and Scope
完整冻结产品候选是审查范围，重点覆盖048/049变化和实际影响闭包；不能把审查缩成作者测试表。只写本TASK REPORT、外部临时副本独立探针与原始日志；不改生产、永久测试、规范、锁、其他报告或正式Evidence/Map。所有产品writer须已停；发现漂移通知Root停止受影响审查，不自行选择新候选。不提交、推送、发布。

逐项重放046三个真实反例，不能通过抬预算、缩输入、少断言或只用普通测试替代race原失败：

- 带真实Source/Grant的单Session 50个真实Run、100条合法消息历史页，在原250ms门下normal和独占race均应成功，writer在SQL关闭后实际写出。raw Grant/RunRecipient同Tx批量读取必须保留单读语义、当前逐项授权、parent revoke/expiry、alternative coverage、missing/bad JSON/混合组/recipient；不能把原800 subjects误变成所有Grant总数800的新限制，也不能缓存跨Tx授权结论。
- 原真实EventClient→HapConnection→stdio→Executor/SQLite 65000/65536字节向量均应完整到seq5/succeeded。默认64KiB到既有512KiB的重试必须有限、同Run/cursor/generation、只针对准确错误；JSON转义/来源开销、上限仍不足、非目标RESOURCE_LIMIT、暂停/显式refresh、取消/撤权/dispose/lease变更及旧响应不得复活都要检查。文本/frame/投影既有边界保留。
- 原公开Tail CURSOR_EXPIRED/snapshotSeq274向量：空来源user消息、非空继承assistant、显式来源对照均与每条持久source_json及History一致；不能用Run effective来源覆盖每条message。坏JSON/provenance安全失败、wholeRun当前读资格及snapshotSeq同Tx仍成立，不夸大原缺陷为未证实泄露。

原046其余闭包包括审批CP/原子发布/同Executor.Resume、取消unknown迟到账本、真实Linux pipe、旧来源ACL、schema/limits；按真实影响决定复用或补查，不机械重跑无变化大套件/许可/五平台。T02凭证/锁无变化；禁止旧默认D-Bus自动激活fixture和实际系统keyring访问/终止。T07与后续协议/群/树/UI尚未装配的明确OUT不当作本候选缺陷。

## Acceptance
两轴各自 pass / request-changes，所有发现带真实路径/触发/影响/严重性/依据/最小验证。先给可证伪假设，再沿实际公共消费者/SQLite/TS-Go查证；区分观察与推断。测试前协调独占重窗口，不与Root/其他agent争用性能测量；复放原失败时保留原输入和完整日志。最终文件/来源/HEAD/index核对同一输入，所有子进程Wait、探针和writer全停。

真实Provider、Obsidian、目标OS操作仍user-owned/not-run，不索取凭证、不把编译/受控fixture冒称现场验收。没有finding数量上限；全绿也不能自动替代代码检查。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 050-events-approval-rereview、Status: completed；h2 聚焦交接、产物与验证、问题与下一步。独立standards-output/specification-output锚点包含Reviewer/Axis/Result/Input-SHA256/Observed；来源为实际候选2摘要。实际return结构校验0后真实MESSAGE和FINAL，Root全读核验后再接纳；不得自行宣称28票/55AC完成。


当前实际固定输入：169产品文件 / 46规范来源；Input SHA256 `b7701a7987833a19f91387607feedb7eb5314864bdd0ac953ea61ceb02d1de33`。Root原三探针全部exit0且Wait/无漂移：原100来源race28.067005ms，公开快照seq274空来源保持，真实65000/65536均seq5/succeeded/完整正文。当前完整插件build/lint已通过且1814输入复读无漂移。所有作者停止产品/报告写入；Root当前无重测试进程，050可独占执行实际所需反例/检查。
