---
schema_version: 2
session: "20261031T062046Z"
task: "008-ui-foundation"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-23
---

## Goal
用户明确指定gpt-6-astra / low实现，由Lead host:codex/root派遣验收；/root/baseline负责T-23候选实际代码与适用验证。基线T-01/T-02已done，G-BASELINE关闭。

## Inputs
先读取.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/tickets-map.md revision5、适用dev与ui Skill、ticket/23-tokens-base-components.md、spec/ADR/execution-boundaries及evidence/T-01.md/T-02.md。复用此前已读SpecDev I方法；新领域按workspace/catalog发现后读相关方法。所有工件为本任务明确输入；最终生产范围以当前Ticket和冻结边界为准。

## Workspace and Scope
唯一工作区/home/wta/projects/obsidian-huhu，current/dev，HEAD86c500556db1d64865c4cc7f1aff1dd83de071fa。可写当前Ticket writable_paths减去shared/frozen项及本REPORT，禁止其他文件；写集缺口先报告Lead，不自行扩大。禁止递归派遣、Git index/commit/push/checkout、远程写入、真实Obsidian、Browser修改。Lead独占Ticket/Evidence/README/ledger/shared产物，worker不能写。其他并行任务写集互不覆盖；不回滚他人内容。

## Acceptance
实施T-23真实tokens/基础组件及可复用独立UI runner。先读真实src/ui/theme、全部消费者及批准DESIGN/UI-GALLERY，消息简列文件/影响/验证后实施；如Browser共享消费者使范围不安全，先具体报告该subitem，其他安全范围继续。不能重新选风格，不能用原型截图冒充生产；不能添加第二套UI运行时。保留Browser冻结消费者实际依赖的旧变量/组件行为，不用全局样式间接改Browser；新未冻结合同可用明确产品组合和语义token，T36再清可删除旧定义。按execution-boundaries建立scripts/ui-review/run.mjs --ticket T-23 --matrix standard --out ...，真实生产组件、420/600/1440、en/zh、亮暗/用户主题、200%、reduced-motion、键盘/IME、多窗口、所有状态/几何/命中区/焦点/对比度；可复用现有ui-runtime测试Chrome基础，不能只截图无断言。样式、字体、用户主题优先级按批准合同。你可做定向测试和runner实现/预检，Lead独占build/**/styles.css/main.js/fonts.generated.css及最终E2E，若需要生成样式先通知Lead并停在该依赖点、可继续其他独立工作。docs/references/shared词典给精确候选不直接写。

保存实际命令、退出码、失败前后与真实源码路径。不能删断言、扩大超时、无条件重试换绿灯，不能仅文档测试交付。共享环境有其他worker，重型Go全量/race仅顺序运行；如资源冲突报告协调。遇真正阻塞，独立已授权工作继续并报告缺失决定，不伪造完成。

## Return
仅本目录REPORT.md（sessions目录不能新建其他文件）；遵循coordination/report-template.md，给修改文件、前后行为、测试与未验证、来源/设计摘要（如适用）、准确差异及候选验收。完成后原生消息通知并停止写入，由Lead做独立审查及最终E2E，不自行标Ticket done。
