---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-46
title: "删除主线验收：构建、测试与真实 Obsidian 端到端（截图）"
status: draft
kind: review
planning_depth: deep
planning_depth_reason: "删除主线需真实宿主证据，旧数据/旧库夹具不再要求（ADR-011）"
ready: false
risk: high
blocked_by: ["T-45"]
contract_ids: ["AC-402", "AC-403", "AC-404", "AC-408"]
owner: unassigned
expected_changes: ["<Path>docs/e2e/dev-overhaul/removal/acceptance/</Path>"]
writable_paths: ["<Path>docs/e2e/dev-overhaul/removal/acceptance/**</Path>", "<Path>scripts/obsidian-acceptance/removal-contraction.mjs</Path>"]
read_only_paths: ["<Path>src/**</Path>", "<Path>native/**</Path>", "<Path>scripts/obsidian-acceptance/fresh-vault.mjs</Path>", "<Path>scripts/obsidian-acceptance/cdp.mjs</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>build/**</Path>", "<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>build/**</Path> => Lead", "<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-46: 删除主线验收：构建、测试与真实 Obsidian 端到端（截图）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-46.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

对 T-40–T-45 的删除结果做整体验收：运行适用构建、lint、测试、文档、i18n、包体、原生检查与残留扫描，在真实 Obsidian 当前格式新库中执行端到端并截图；不测旧库/旧格式兼容（ADR-011）。来源：#41 R8、ADR-010/011、AC-402/403/404/408。

## 行为与范围

IN：
- 命令：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm run lint`、`pnpm test`、`pnpm test:all`、`pnpm test:docs`、`pnpm test:i18n`、`pnpm check:bundle`、`pnpm check:notices`、`pnpm check:native`、残留检索脚本；与 T-01 基线逐项对比，区分既有与新增失败。
- 真实 Obsidian（复用 `scripts/obsidian-acceptance/fresh-vault.mjs` 与 `cdp.mjs` 的方式新建 `removal-contraction.mjs`）：
  1. 新库：插件加载、工作台导航与设置分类无 Browser/Bot，命令面板搜索 “browser/bot” 无 HUHU 命令，ribbon 无地球图标，控制台无错误；截图。
  2. 当前工作区：在新库验证终端/页面标签、分组、会话及 Home 看板，确保不存在 Browser/Bot/网页嵌入分区/网易云音乐；不执行旧库回读、旧数据摘要或不变性断言。
  3. Home 链接及自动化“打开网址”使用系统浏览器，“网页快捷卡”保留可用；不准备旧 `web` 分区或 `music` 小组件的兼容夹具，截图现行功能。
- 证据写入 `docs/e2e/dev-overhaul/removal/acceptance/`（截图、`result.json`、命令输出摘要；无需旧数据前后摘要）。

OUT：Windows/macOS 实机与远程 CI（未获授权时标为未验收，不填成通过）。

## 验收标准

- [ ] `AC-402`、`AC-403`、`AC-404`：当前格式新库真实 Obsidian 截图与 `result.json` 断言齐全；AC-406 已撤回。
- [ ] `AC-408`：适用命令全部通过或与 dev 基线相比无新增失败；当前格式新库截图齐全，未执行项如实标注；无需旧库 E2E。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 全量检查 | 命令 | 见行为与范围 | 无新增失败 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-46.md</Path>` |
| 真实宿主 | Obsidian + CDP | `node scripts/obsidian-acceptance/removal-contraction.mjs --out docs/e2e/dev-overhaul/removal/acceptance` | 断言全过，截图齐全 | 同上 |

- **E2E disposition：** required：Lead 在 change-workspace 执行真实 Obsidian 端到端与全部适用检查（ADR-010 对删除主线覆盖 LOG-012 的“agent 不执行真机”限制，仅限 Linux 上可运行的 Obsidian）。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

只读被测代码；发现缺陷退回负责删除票修复，不在本票改生产代码。截图不含真实用户数据与凭据，仅用虚构夹具。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 本项目未正式发布，不对旧数据、旧 Profile、旧配置、旧布局提供保留、迁移、回读、兼容或字节不变验收（ADR-011）；当前格式的数据写入、隐私与权限安全仍须保证。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

账本与 Evidence 记录全部结果；删除主线 Gate G-REMOVAL 关闭后 T-36/T-37/T-38 才按收缩后的范围收口。

## 未决事项与风险

真实 Obsidian 在无图形环境可能无法启动；无法运行时保持未验收并说明原因，不用 DOM 测试替代。

### 未决问题

无。
