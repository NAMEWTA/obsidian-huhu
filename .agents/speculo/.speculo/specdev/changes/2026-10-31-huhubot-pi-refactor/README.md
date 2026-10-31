# Huhu Bot · Pi 原生重构设计包

Outcome: active

## 本次交付

本 change 的长期目标是 Issue #39 的整体替换；本次交付仅是**完整规划文档 + 可交互静态原型 + 待发布 PR 内容**。没有生产实现授权，没有修改 `src/`、`native/`、依赖、CI、构建产物或永久设计基线。此包不是已完成 Issue #39 的声明，也不应使用 `Closes #39`。

基于读取时最新 `dev@974105b47e03c108df0f5e0c3fc9606fe4b79aee`。原始 Issue 22 个章节完整冻结；A01–A28 一一映射为 AC-001–AC-028。设计沿用 **DESIGN-0002 / UI-001 candidate-a**，新增原型尚待本次用户确认，不借用旧 change 的批准记录。

## 从哪里开始

| 阅读目的 | 入口 |
|---|---|
| 先看结论、待决定事项与实施门禁 | DECISIONS.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/DECISIONS.md</Path>、goal-plan.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/goal-plan.md</Path> |
| 原始需求与来源 | source.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/source.md</Path>、完整 Issue：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/sources/issue-39-body.md</Path>、逐节覆盖：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/coverage.md</Path> |
| 产品行为与验收 | spec.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/spec.md</Path>、acceptance-plan.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/acceptance-plan.md</Path> |
| 模块/进程/公共 API | architecture.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/architecture.md</Path>、api-contracts.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/api-contracts.md</Path> |
| 数据、恢复、安全、预算 | data-contracts.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/data-contracts.md</Path>、tool-security.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/tool-security.md</Path> |
| 协作与其他模块 | collaboration.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/collaboration.md</Path>、integrations.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/integrations.md</Path> |
| 复用与删除边界 | reuse-map.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/reuse-map.md</Path>、deletion-map.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/deletion-map.md</Path> |
| 原型与视觉合同 | DESIGN.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/DESIGN.md</Path>、原型入口：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/final/index.html</Path>、原型说明：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/design-system.md</Path> |
| 实施拆分 | tickets-map.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/tickets-map.md</Path>、ticket/：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/ticket</Path> |
| 实际检查与未验证项目 | evidence/planning-review.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/evidence/planning-review.md</Path>、evidence/validation.json：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/evidence/validation.json</Path> |
| PR 发布 | PR-DRAFT.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/PR-DRAFT.md</Path>、PUBLISH.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/PUBLISH.md</Path> |

## Execution Context

- Workspace strategy：`current`。本次为生成工件工作区，不冒充已克隆的完整 dev checkout；目录使用仓库相对结构。
- 固定输入：以上 dev SHA、Issue updated_at、UI 基线 digest；实际 head 复核见 `evidence/source-check.json`。
- 计划 Lead：`issue-39-change-lead`，角色名，不伪造已启动的 Agent 会话。执行期由实际承担者绑定可恢复 locator。
- 当前实现：`not-authorized`。未来 Ticket 全部 `draft / ready: false`；允许形成完整规划，不允许自动派单。
- 授权 Git 范围：文档/原型分支、push 和 PR → dev 已获用户请求；当前可用 GitHub connector 只有读取动作，未创建远程分支、commit 或 PR。仓库权限与工具能力是两个问题。
- 远程 merge、部署、用户数据清理、改其他 Issue：未授权。

## 接续与通过条件

先评审新原型及 DECISIONS.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/DECISIONS.md</Path>；在有完整仓库和写入能力的环境执行 PUBLISH.md：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/PUBLISH.md</Path> 的来源漂移/原生工作流校验，再发布文档 PR。此文档 PR 可以先接受设计评审，不需要伪造 P0 实机报告。

用户另行授权实现后，按 Goal G0 与单票 DoR 开始 P0；平台实机、MCP 选型、路径/权限、预算参数等可发现事实由执行者验证，不让用户猜技术事实。新原型确认只批准设计意图，不批准生产实现或永久基线提升。
