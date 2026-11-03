---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: true
design_ref: {"revision":3,"digest":"78dd227f70b86804078218988b35850af8f2078a02ea791486dfb5b6f65d689f","pages":["UI-TERMINAL"],"acceptance":["AC-201","AC-351"]}
change: 2026-10-31-dev-stabilization-overhaul
id: T-43
title: "移除 Agent 工作区中的浏览器标签、资料移交与 Cookie 辅助"
status: done
kind: refactor
planning_depth: deep
planning_depth_reason: "移除 Agent Browser 标签类型及消费者，只验证现行终端/页面会话；无旧布局兼容要求（ADR-011）"
ready: false
risk: high
blocked_by: ["T-42"]
contract_ids: ["AC-404"]
owner: unassigned
expected_changes: ["<Path>src/modules/agent/ui/browser/</Path>", "<Path>src/modules/agent/module.ts</Path>", "<Path>src/modules/agent/services/controller.ts</Path>", "<Path>src/modules/agent/services/workspace-service.ts</Path>", "<Path>src/app/contracts/shared-workspace.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/ui/browser/**</Path>", "<Path>src/modules/agent/ui/tabs/**</Path>", "<Path>src/modules/agent/ui/workspace/**</Path>", "<Path>src/modules/agent/ui/create/**</Path>", "<Path>src/modules/agent/ui/sidebar/**</Path>", "<Path>src/modules/agent/ui/jump/**</Path>", "<Path>src/modules/agent/ui/settings/**</Path>", "<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>", "<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>", "<Path>src/modules/agent/platform/desktop/browser-material.ts</Path>", "<Path>src/modules/agent/platform/desktop/browser-material.test.ts</Path>", "<Path>src/modules/agent/platform/desktop/files.ts</Path>", "<Path>src/modules/agent/platform/desktop/agents/legacy-accounts.ts</Path>", "<Path>src/modules/agent/platform/desktop/server/cookie-client.ts</Path>", "<Path>src/modules/agent/services/**</Path>", "<Path>src/modules/agent/core/**</Path>", "<Path>src/modules/agent/module.ts</Path>", "<Path>src/modules/agent/manifest.ts</Path>", "<Path>src/modules/agent/api.ts</Path>", "<Path>src/modules/agent/i18n.ts</Path>", "<Path>src/modules/agent/shared-browser-close.test.ts</Path>", "<Path>src/app/contracts/shared-workspace.ts</Path>", "<Path>src/host/desktop/retained-browser-file.ts</Path>", "<Path>src/host/desktop/retained-browser-file.test.ts</Path>", "<Path>src/host/desktop/browser-session-migration.ts</Path>", "<Path>src/shared/native/cookies.ts</Path>", "<Path>src/shared/native/cookies.test.ts</Path>", "<Path>src/shared/native/host.ts</Path>", "<Path>src/shared/storage/vault-layout.ts</Path>", "<Path>native/pty-server/src/cookies.rs</Path>", "<Path>native/pty-server/src/main.rs</Path>", "<Path>native/pty-server/tests/control.rs</Path>", "<Path>src/host/desktop/native/host.integration.test.ts</Path>", "<Path>src/host/desktop/native/host-stream.integration.test.ts</Path>", "<Path>test/agent-migrations/legacy-browser.test.ts</Path>", "<Path>test/agent-backup/fixtures.ts</Path>", "<Path>docs/e2e/dev-overhaul/removal/T-43/**</Path>"]
read_only_paths: ["<Path>src/modules/browser/**</Path>", "<Path>src/modules/agent/platform/desktop/hooks/**</Path>", "<Path>src/host/desktop/browser-session.ts</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>build/**</Path>", "<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>build/**</Path> => Lead", "<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "5c60d84fe28cfc8b8653e8813127a870f0483b40cae8e823d8e8e48bc83c1d0f", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-43: 移除 Agent 工作区中的浏览器标签、资料移交与 Cookie 辅助

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-43.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

删除 Agent 工作区与 Browser 的全部耦合：浏览器标签（`BrowserTabView`/`BrowserWorkspaceTab`、`kind: 'browser'` 标签数据与 `SharedBrowserPort`）、`AGENT_BROWSER_TABS` 服务、浏览器资料移交（`BROWSER_MATERIAL_CONSUMERS`、`browser-material*`、`.huhu/browser-materials/`）、终端链接在 HUHU 浏览器打开、“浏览器设置”入口、Omnibox“打开浏览器工作区”、仅服务 Browser 身份导入的原生 Cookie SQLite 读取链。来源：#41 R5；ADR-010；Spec AC-404。

## 行为与范围

IN（规划期核对到 40 个 Agent 文件含 browser 引用，按 T-39 终版收敛）：
- 删除 `src/modules/agent/ui/browser/**`、`platform/desktop/browser-material*`、`services/browser-material-consumer*`、`shared-browser-close.test.ts`；`module.ts`/`manifest.ts`/`api.ts` 删除 `BROWSER_MATERIAL_CONSUMERS` 贡献、`SharedBrowserPort` 实现、`AGENT_BROWSER_TABS`、`NATIVE_HELPER_SQLITE`；`services/controller.ts` 删除 `BROWSER_WORKSPACE/BROWSER_OPEN` 订阅、`openBrowserWorkspace`、`browserOpener`、`configureBrowser`；`core/terminal/links.ts` 终端 URL 改为系统浏览器；`core/workspace/model.ts`/`ops.ts`/`migrations/legacy-layout.ts` 删除 `browser` 标签类型；`TabStrip`/`WorkspaceLayout`/`Omnibox`/`TerminalSettings`/`TerminalTabView`/sidebar/jump 去掉 Browser 分支；`src/app/contracts/shared-workspace.ts` 删除 Browser 端口（若只剩 Agent 自身用途则就地收敛）。
- 工作区模型：删除 `kind: 'browser'` 类型及序列化、解析、服务和测试；仅验证当前终端/页面标签、分组与会话正常，不提供旧 browser 布局恢复或未知旧标签兜底（ADR-011）。
- Cookie 链：`src/shared/native/cookies.ts`、Agent `cookie-client.ts`、`native/pty-server/src/cookies.rs` 与 `main.rs` 的 `Cookies` 消息、相关测试，仅在 T-39 证明无其他消费者时删除。
- 旧浏览器文件：删除 `retained-browser-file.ts` 的旧 runtime 解析；`legacy-accounts.ts` 仅在确有现行非 Browser 消费者时保留独立部分，不保留发布前旧账号迁移（ADR-011）。
- `vault-layout.ts` 删除 `BROWSER_MATERIALS_ROOT`；`BROWSER_ROOT` 在 T-42/T-44 清空消费者后直接删除，无需旧磁盘路径兼容（ADR-011）。

OUT：Hook 与终端核心（T-12/T-13/T-21 负责）；Agent 界面统一（T-25，依赖本票）；`host/desktop/browser-session*.ts` 宿主会话代码（T-44 删除）。

## 验收标准

- [ ] `AC-404`：当前终端/页面标签、分组及会话正常，Agent 不再含 Browser 类型、服务与入口；Native 和现有非 Browser 测试无新增失败。无旧标签/旧资料恢复夹具。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 当前工作区 | vitest | `pnpm exec vitest run src/modules/agent test/agent-backup` | 通过；不运行旧 browser 迁移用例 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-43.md</Path>` |
| 原生 | cargo | `pnpm check:native` | 通过 | 同上 |
| 编译 | tsc | 两步 tsc | 0 错误 | 同上 |

- **E2E disposition：** required：T-46 在真实 Obsidian 中验证现行终端/页面工作区会话并截图（无旧 browser 布局夹具）。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

Agent 写集很宽，必须排在 T-42 之后、T-25/T-22 之前；不触碰 `platform/desktop/hooks/**`（T-12/T-13 在行）。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 本项目未正式发布，不对旧数据、旧 Profile、旧配置、旧布局提供保留、迁移、回读、兼容或字节不变验收（ADR-011）；当前格式的数据写入、隐私与权限安全仍须保证。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

Agent 与 Browser 的代码耦合为零，原生与 Agent 测试通过；T-44 可删除 Browser 模块目录。

## 未决事项与风险

布局恢复是用户数据路径；`workspace-service-stop-native.test.ts` 等混合测试同时承载非 Browser 风险，只删 Browser 用例，不删整文件。

### 未决问题

DoR 重审条件：T-39 确认 Cookie 链与 `retainLegacyDirectory` 的消费者、`shared-workspace.ts` 的去留后由 Lead 改为 ready。
