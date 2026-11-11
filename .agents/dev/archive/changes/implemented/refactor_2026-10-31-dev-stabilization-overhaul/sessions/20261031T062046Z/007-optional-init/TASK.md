---
schema_version: 2
session: "20261031T062046Z"
task: "007-optional-init"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-14
---

## Goal
用户明确指定gpt-6-astra / low实现，由Lead host:codex/root派遣验收；/root/sources负责T-14候选实际代码与适用验证。基线T-01/T-02已done，G-BASELINE关闭。

## Inputs
先读取.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/tickets-map.md revision5、适用dev Skill、ticket/14-optional-init-off-critical-path.md、spec/ADR/execution-boundaries及evidence/T-01.md/T-02.md。复用此前已读SpecDev I方法；新领域按workspace/catalog发现后读相关方法。所有工件为本任务明确输入；最终生产范围以当前Ticket和冻结边界为准。

## Workspace and Scope
唯一工作区/home/wta/projects/obsidian-huhu，current/dev，HEAD86c500556db1d64865c4cc7f1aff1dd83de071fa。可写当前Ticket writable_paths减去shared/frozen项及本REPORT，禁止其他文件；写集缺口先报告Lead，不自行扩大。禁止递归派遣、Git index/commit/push/checkout、远程写入、真实Obsidian、Browser修改。Lead独占Ticket/Evidence/README/ledger/shared产物，worker不能写。其他并行任务写集互不覆盖；不回滚他人内容。

## Acceptance
实施T-14，承接005-startup-preflight/REPORT.md。已补music-service.ts及module.test.ts授权。真实Home module→MusicService→NeteaseAccount装配测试不可mock掉关键链。load只做本地必要初始化；模块本地服务发布后拥有后台恢复，去重、错误收敛、订阅、所属窗口timer/close与dispose幂等。所有账号操作epoch在发布之前检查，登录/登出开始即废弃旧恢复；取消登录迟到cookie也不能更新状态，旧session不能清新error。无限Cookie的可交互证明不能靠推进5秒或测试超时；错误/迟到/销毁/关闭/重新打开全部用可控屏障。保留既有音乐收费/播放断言，既有await load后member假设改为明确后台通知屏障。审计其他模块可选IO及真实隔离fixture分模块耗时，明确mock界限，勿改其他模块生产。冻结session.ts/Browser宿主边界不动。先消息列实际范围；定向测试与本票脚本由你执行，Lead负责workbench-entry/lifecycle最终E2E与构建。

保存实际命令、退出码、失败前后与真实源码路径。不能删断言、扩大超时、无条件重试换绿灯，不能仅文档测试交付。共享环境有其他worker，重型Go全量/race仅顺序运行；如资源冲突报告协调。遇真正阻塞，独立已授权工作继续并报告缺失决定，不伪造完成。

## Return
仅本目录REPORT.md（sessions目录不能新建其他文件）；遵循coordination/report-template.md，给修改文件、前后行为、测试与未验证、来源/设计摘要（如适用）、准确差异及候选验收。完成后原生消息通知并停止写入，由Lead做独立审查及最终E2E，不自行标Ticket done。
