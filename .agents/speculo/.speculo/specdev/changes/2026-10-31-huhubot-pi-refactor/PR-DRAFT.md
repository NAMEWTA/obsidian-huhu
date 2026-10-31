# docs(huhubot): 形成 Issue #39 Pi 重构规格、任务图与统一 UI 原型

Refs #39

## 本 PR 的范围

基于 `dev@974105b47e03c108df0f5e0c3fc9606fe4b79aee`，新增 `.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/`，完整冻结原 Issue，按 Triage → Grill → Spec → Tickets → Goal(plan-only) 形成规划，附继承 DESIGN-0002 / UI-001 A 方向的离线交互原型。无 `src/`、`native/`、package/lock/CI/main.js/styles.css 生产改动。

## 内容

22节需求覆盖、11项ADR与决策树、架构/DTO/数据恢复/安全预算/协作/跨模块合同、复用和删除清单、28项验收、24张draft Tickets与完整Goal、会话/审批/三关系视图/记忆/Bot设置/Browser/Automation/恢复原型及实际浏览器检查材料。

## 评审重点

是否准确继承 UI-001 的密度/圆角/语义色/行内主操作；审批与unknown effect是否清楚；三种树图是否不混淆；记忆忘记、来源范围与多Agent交付是否可理解；P0/MCP/Browser外部条件是否足够明确。

## 验证

原型98项浏览器检查与6项候选检查通过。文档结构/覆盖/DAG/授权边界自检的实际结果见evidence/validation.json和prototypes/UI-001/evidence/browser-results.json。未运行完整仓库正式SpecDev validator、pnpm/Obsidian/Pi/SQLite/MCP/跨平台生产测试；所有产品票与Goal均非执行就绪，UI未冒用旧批准。

## 不包含

不实现重构，不自动迁/删旧用户数据，不调整永久设计基线，不关闭#9/#36/#37/#38/#39，不宣称P0完成。新UI待本次明确确认；用户后续另行授权实现。

## 发布事实

此文件只是可用的PR正文；当前会话未创建远程PR/分支/commit。真正发布后由Delivery记录真实URL、base/head和回读，不把本文件当回执。
