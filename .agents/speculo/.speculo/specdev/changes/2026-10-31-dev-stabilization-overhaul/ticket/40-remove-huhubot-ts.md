---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: true
design_ref: {"revision":3,"digest":"78dd227f70b86804078218988b35850af8f2078a02ea791486dfb5b6f65d689f","pages":["UI-GALLERY"],"acceptance":["AC-351","AC-352"]}
change: 2026-10-31-dev-stabilization-overhaul
id: T-40
title: "删除 huhubot 插件侧模块与全部产品入口"
status: ready
kind: refactor
planning_depth: deep
planning_depth_reason: "删除整模块及其在 app/shell/i18n/设置/版本排除中的注册，需同批更新全部消费者"
ready: true
risk: high
blocked_by: ["T-39", "T-24"]
contract_ids: ["AC-402", "AC-405"]
owner: unassigned
expected_changes: ["<Path>src/modules/huhubot/</Path>", "<Path>src/app/manifests.ts</Path>", "<Path>src/app/workbench/compose-workbench.ts</Path>", "<Path>src/app/contracts/module.ts</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/app/settings/nav.ts</Path>"]
writable_paths: ["<Path>src/modules/huhubot/**</Path>", "<Path>src/app/manifests.ts</Path>", "<Path>src/app/workbench/compose-workbench.ts</Path>", "<Path>src/app/contracts/module.ts</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/app/settings/nav.ts</Path>", "<Path>src/app/settings/nav.test.ts</Path>", "<Path>src/app/workbench/settings-categories.ts</Path>", "<Path>src/shell/navigation-state.ts</Path>", "<Path>src/shared/i18n/workbench.ts</Path>", "<Path>src/shared/i18n/settings.ts</Path>", "<Path>src/shared/storage/vault-layout.ts</Path>", "<Path>src/shared/storage/vault-layout.test.ts</Path>", "<Path>src/modules/versioning/core/excludes.ts</Path>", "<Path>src/modules/versioning/platform/desktop/excludes.test.ts</Path>", "<Path>scripts/module-strings.ts</Path>", "<Path>vitest.config.ts</Path>", "<Path>test/huhu-bot-integration/**</Path>", "<Path>scripts/obsidian-acceptance/huhu-bot.mjs</Path>", "<Path>scripts/obsidian-acceptance/huhu-bot-note-effects.mjs</Path>", "<Path>scripts/obsidian-acceptance/huhu-bot-sources.mjs</Path>", "<Path>scripts/obsidian-acceptance/fixtures/huhu-bot/**</Path>", "<Path>docs/e2e/dev-overhaul/removal/T-40/**</Path>"]
read_only_paths: ["<Path>native/huhubot/**</Path>", "<Path>contracts/hap/**</Path>", "<Path>src/modules/browser/**</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>build/**</Path>", "<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>build/**</Path> => Lead", "<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-40: 删除 huhubot 插件侧模块与全部产品入口

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-40.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

删除 HUHU Bot（huhubot，含 superhuhu/superbot 重构方向）的插件侧代码和全部产品入口：模块目录、manifest 注册、工作台页面与导航（chat/agents/groups/tasks/memory/access/approvals/data）、设置分类与产品开关、词典键、`HUHUBOT_RUNTIME_ROOT` 及其 Git 排除、专用测试与 Obsidian 验收脚本。来源：#41 R2；ADR-010；Spec AC-402、AC-405。

## 行为与范围

IN（规划期已核对的真实位置，开工前按 T-39 终版修订）：
- 删除 `src/modules/huhubot/**`（api/BotClient、BOT_RUNTIME、transport/credentials/runtime/installation、note-effects、sources、workbench 服务与全部 UI/样式/i18n）。
- `src/app/manifests.ts` 去掉 `huhubotManifest`；`src/app/workbench/compose-workbench.ts` 去掉 `huhubotPage`、`id: 'huhubot'` 工作台条目与 8 个子导航、`settings` 映射；`src/app/contracts/module.ts`、`workbench.ts` 去掉 `'huhubot'` 模块/feature ID；`src/app/settings/nav.ts`（+`nav.test.ts`）去掉 `huhubot` 产品；`settings-categories.ts` 去掉 `settings.productHuhuBot`；`src/shell/navigation-state.ts` 去掉 huhubot 段；`src/shared/i18n/workbench.ts`/`settings.ts` 去掉 `workbench.huhubot*`、`settings.productHuhuBot` en/zh 键。
- `src/shared/storage/vault-layout.ts` 删除 `HUHUBOT_RUNTIME_ROOT`（+测试）；`src/modules/versioning/core/excludes.ts` 删除对应 Git 排除（+`excludes.test.ts`）。是否需要为遗留 `.huhu/huhubot/` 保留通用排除由 T-39 给出证据，默认删除并在 T-45 文档中提示用户手动清理。
- `scripts/module-strings.ts` 去掉 huhubot 词典；`vitest.config.ts` 删除 `huhu-bot-integration` 项目与 `huhuBotIntegrationTests` 排除；删除 `test/huhu-bot-integration/**`、`scripts/obsidian-acceptance/huhu-bot*.mjs` 与 `fixtures/huhu-bot/**`。
- 已保存设置中遗留的 `huhubot` 模块开关/导航状态：加载时按现有未知键规则忽略，不报错、不改写其他设置；若现有逻辑会因未知模块 ID 抛错，修正为通用校验（不是 huhubot 专用分支）。

OUT：`native/huhubot`、`contracts/hap`、构建/发行链（T-41）；Browser（T-42–T-44）；文档（T-45）。Agent 终端模块与 Hook 不属于 huhubot，保持不变。

## 验收标准

- [ ] `AC-402`：新库与含旧 huhubot 设置的库启动后，导航、设置、命令面板、工作台无 Bot 入口，控制台无相关错误；`activateModule('huhubot')` 等动态入口不再存在。
- [ ] `AC-405`：`src/`、`test/`、`scripts/`（T-41 负责部分除外）对 huhubot/BotClient/BOT_RUNTIME 的残留检索为 0（允许清单仅含 T-39 批准项）；`tsc`、lint、`pnpm test` 通过或无新增失败。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 编译与引用 | 构建 | `pnpm exec tsc -noEmit -skipLibCheck` + `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0 错误 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-40.md</Path>` |
| 单元/DOM | vitest | `pnpm test` | 无新增失败 | 同上 |
| 残留 | 只读检索 | `node docs/e2e/dev-overhaul/removal/residual-scan.mjs --scope huhubot-ts` | 0 未批准命中 | 同上 |
| 词典 | i18n | `pnpm test:i18n` | 通过 | 同上 |

- **E2E disposition：** required：Lead 在 T-46 的真实 Obsidian 验收中复核 AC-402；本票自身运行构建/单元/i18n/残留检索。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

与 T-24 共享 `src/shell/**`、`settings-categories.ts`、`src/shared/i18n/{workbench,settings}.ts`，按 DAG 在 T-24 完成后执行；生成产物只由 Lead 经现有构建链更新。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 不删除、移动、覆盖任何用户数据目录或本机 Profile（ADR-010 D-019）；代码删除与数据清理是两件事。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

huhubot 插件侧代码与入口全部删除，构建/测试/i18n/残留检索通过并写入 Evidence；`native/huhubot` 不再有插件侧调用者，T-41 可执行。

## 未决事项与风险

`compose-workbench.ts` 同时承载 Browser 页面，T-42 随后修改同一文件，必须串行；词典键删除需同时删 en/zh。

### 未决问题

无。
