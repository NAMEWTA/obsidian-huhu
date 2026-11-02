---
schema_version: 2
session: "20261031T062046Z"
task: "006-runner-stop"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-04
---

## Goal
用户明确指定gpt-6-astra / low实现，由Lead host:codex/root派遣验收；/root/bundle负责T-04候选实际代码与适用验证。基线T-01/T-02已done，G-BASELINE关闭。

## Inputs
先读取.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/tickets-map.md revision5、适用dev Skill、ticket/04-runner-stop-phases.md、spec/ADR/execution-boundaries及evidence/T-01.md/T-02.md。复用此前已读SpecDev I方法；新领域按workspace/catalog发现后读相关方法。所有工件为本任务明确输入；最终生产范围以当前Ticket和冻结边界为准。

## Workspace and Scope
唯一工作区/home/wta/projects/obsidian-huhu，current/dev，HEAD86c500556db1d64865c4cc7f1aff1dd83de071fa。可写当前Ticket writable_paths减去shared/frozen项及本REPORT，禁止其他文件；写集缺口先报告Lead，不自行扩大。禁止递归派遣、Git index/commit/push/checkout、远程写入、真实Obsidian、Browser修改。Lead独占Ticket/Evidence/README/ledger/shared产物，worker不能写。其他并行任务写集互不覆盖；不回滚他人内容。

## Acceptance
实施T-04完整Go阶段停止和wire合同，承接004-stop-preflight/REPORT.md。已核准新增实际application/api、inbound hap/stdio、TS api.ts生成源、recovery producer测试与sqlite base close最窄边界；T-05已依赖T-04以串行拥有store.go。不能做检查点策略T-05。四个事实独立：请求、执行器排空、持久化完成、Profile释放；错误与未完成不得合并为EXECUTOR_STOP_TIMEOUT。调用者截止不剥夺唯一drain资源owner。service.shutdown的分阶段观察要认证且stopping仍可达，不读已关闭数据库，不因首个ACK提前切断重复观察；EOF/信号仍由唯一owner清理。Go Close全部调用方核对；TS生产消费者只由T-06迁移，不引入旧版兼容链。慢>3秒必须实际持久化边界注入，区分wrapper hold与底层fsync证据；覆盖重复请求/迟到生产者/超时后继续/锁重开/error flags。生成源BotMethodMap及Go/TS/schema/fixtures一起改。GOTOOLCHAIN=go1.26.10 GOWORK=off。先新增有意义red证据，再完成定向测试和race；全量Go为集成前观察，保留基线失败，勿同时启动多个重型套件。消息先给预计实际文件与调用方影响，然后实施。

保存实际命令、退出码、失败前后与真实源码路径。不能删断言、扩大超时、无条件重试换绿灯，不能仅文档测试交付。共享环境有其他worker，重型Go全量/race仅顺序运行；如资源冲突报告协调。遇真正阻塞，独立已授权工作继续并报告缺失决定，不伪造完成。

## Return
仅本目录REPORT.md（sessions目录不能新建其他文件）；遵循coordination/report-template.md，给修改文件、前后行为、测试与未验证、来源/设计摘要（如适用）、准确差异及候选验收。完成后原生消息通知并停止写入，由Lead做独立审查及最终E2E，不自行标Ticket done。
