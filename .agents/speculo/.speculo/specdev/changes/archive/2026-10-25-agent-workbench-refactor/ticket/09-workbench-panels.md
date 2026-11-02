---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-09"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001","PAGE-003"],"acceptance":["AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-09"
title: "A 方案工作台与双向面板控制"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "GUI/CLI 同一布局与焦点合同，跨现有标签/分屏/侧栏和终端输入目标，属于共享 UI 接线。"
ready: true
risk: "high"
blocked_by: ["T-08"]
contract_ids: ["AC-009","AC-061"]
owner: "codex:/root"
expected_changes: ["<Path>src/modules/agent/ui/workspace/WorkspaceLayout.tsx</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/core/workspace/model.ts</Path>","<Path>src/modules/agent/core/workspace/ops.ts</Path>","<Path>src/modules/agent/core/workspace/ops.test.ts</Path>","<Path>src/modules/agent/core/workspace/pane-identity.ts</Path>","<Path>src/modules/agent/core/workspace/pane-identity.test.ts</Path>","<Path>src/modules/agent/services/workspace-store.ts</Path>","<Path>src/modules/agent/services/workspace-store-spaces.test.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/workspace-service-panes.ts</Path>","<Path>src/modules/agent/services/workspace-service-panes.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-spaces.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-foreground.dom.test.tsx</Path>","<Path>src/modules/agent/services/workspace-service-control.test.ts</Path>","<Path>src/modules/agent/services/workspace-service.test.ts</Path>","<Path>src/shared/native/control-schema.json</Path>","<Path>src/shared/native/control-wire.generated.ts</Path>","<Path>src/shared/native/control-wire.test.ts</Path>","<Path>native/pty-server/src/control/wire_generated.rs</Path>","<Path>native/pty-server/src/control/cli.rs</Path>","<Path>native/pty-server/tests/control.rs</Path>","<Path>native/pty-server/tests/control_protocol.rs</Path>","<Path>test/fixtures/native/control-v1.json</Path>","<Path>test/native/control-protocol.test.ts</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>src/modules/agent/services/control/commands.ts</Path>","<Path>src/modules/agent/services/control/commands.test.ts</Path>","<Path>src/modules/agent/services/control/paging.ts</Path>","<Path>src/modules/agent/services/control/paging.test.ts</Path>","<Path>src/modules/agent/services/control/router.ts</Path>","<Path>src/modules/agent/services/control/router.test.ts</Path>","<Path>src/modules/agent/services/control/router-foreground.dom.test.tsx</Path>","<Path>src/modules/agent/services/control/control-panels-native.test.ts</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceToolbar.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/sidebar/SpaceNavigation.tsx</Path>","<Path>src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx</Path>","<Path>src/modules/agent/ui/tabs/TabStrip.tsx</Path>","<Path>src/modules/agent/ui/tabs/WorkspaceTab.tsx</Path>","<Path>src/modules/agent/ui/control/TerminalControlPanel.tsx</Path>","<Path>src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/modules/agent/styles/agent.css</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-panels.mjs</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>vitest.config.ts</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/core/workspace/model.ts</Path>","<Path>src/modules/agent/core/workspace/ops.ts</Path>","<Path>src/modules/agent/core/workspace/ops.test.ts</Path>","<Path>src/modules/agent/core/workspace/pane-identity.ts</Path>","<Path>src/modules/agent/core/workspace/pane-identity.test.ts</Path>","<Path>src/modules/agent/services/workspace-store.ts</Path>","<Path>src/modules/agent/services/workspace-store-spaces.test.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/workspace-service-panes.ts</Path>","<Path>src/modules/agent/services/workspace-service-panes.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-spaces.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-foreground.dom.test.tsx</Path>","<Path>src/modules/agent/services/workspace-service-control.test.ts</Path>","<Path>src/modules/agent/services/workspace-service.test.ts</Path>","<Path>src/shared/native/control-schema.json</Path>","<Path>src/shared/native/control-wire.generated.ts</Path>","<Path>src/shared/native/control-wire.test.ts</Path>","<Path>native/pty-server/src/control/wire_generated.rs</Path>","<Path>native/pty-server/src/control/cli.rs</Path>","<Path>native/pty-server/tests/control.rs</Path>","<Path>native/pty-server/tests/control_protocol.rs</Path>","<Path>test/fixtures/native/control-v1.json</Path>","<Path>test/native/control-protocol.test.ts</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>src/modules/agent/services/control/commands.ts</Path>","<Path>src/modules/agent/services/control/commands.test.ts</Path>","<Path>src/modules/agent/services/control/paging.ts</Path>","<Path>src/modules/agent/services/control/paging.test.ts</Path>","<Path>src/modules/agent/services/control/router.ts</Path>","<Path>src/modules/agent/services/control/router.test.ts</Path>","<Path>src/modules/agent/services/control/router-foreground.dom.test.tsx</Path>","<Path>src/modules/agent/services/control/control-panels-native.test.ts</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceToolbar.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/sidebar/SpaceNavigation.tsx</Path>","<Path>src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx</Path>","<Path>src/modules/agent/ui/tabs/TabStrip.tsx</Path>","<Path>src/modules/agent/ui/tabs/WorkspaceTab.tsx</Path>","<Path>src/modules/agent/ui/control/TerminalControlPanel.tsx</Path>","<Path>src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/modules/agent/styles/agent.css</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-panels.mjs</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>vitest.config.ts</Path>"]
shared_path_owners: ["<Path>src/modules/agent/core/workspace/model.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/ops.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/ops.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/pane-identity.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/pane-identity.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-store.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-store-spaces.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-panes.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-panes.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-spaces.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-foreground.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-schema.json</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-wire.generated.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-wire.test.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/wire_generated.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/cli.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control_protocol.rs</Path> => lead:agent-workbench-integration","<Path>test/fixtures/native/control-v1.json</Path> => lead:agent-workbench-integration","<Path>test/native/control-protocol.test.ts</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/commands.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/commands.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/paging.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/paging.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/router.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/router.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/router-foreground.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/control-panels-native.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/workspace/WorkspaceToolbar.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/SpaceNavigation.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/tabs/TabStrip.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/tabs/WorkspaceTab.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/control/TerminalControlPanel.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/styles/agent.css</Path> => lead:agent-workbench-integration","<Path>scripts/obsidian-acceptance/agent-workbench-panels.mjs</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration","<Path>scripts/bundle-budget.json</Path> => lead:agent-workbench-integration","<Path>THIRD-PARTY-NOTICES.md</Path> => lead:agent-workbench-integration","<Path>vitest.config.ts</Path> => lead:agent-workbench-integration"]
---

# Ticket T-09：A 方案工作台与双向面板控制

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

<a id="purpose"></a>
## 目标与来源

用户获得已批准 A 布局；CLI 附加、聚焦、分屏、调比例与关闭视图可立即在 GUI 看到，双方查询一致。

已有 WorkspaceLayout、TabStrip、WorkspaceService 和 React resizable panels，不应按静态 HTML 重写一套布局。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

<a id="scope"></a>
## 行为与范围

IN：Space/Session 导航、控制抽屉、同 Vault 目标展示、面板控制命令、焦点/宽窄/主题。REUSE：现有 tabs/groups/shortcuts 与共享组件。OUT：照搬原型 fixture、另建工作台外壳、删除旧拖拽/分组能力。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

<a id="research"></a>
## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。
- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。
- K-06：[Wave v0.14.5 修复记录](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

<a id="route"></a>
## 有序执行路线

1. 回读 DESIGN revision1/PAGE-001/003 与 A 原型，用真实 services 状态替换 mock；恢复原型未模拟的侧栏拖拽与现有分组快捷键。
2. 把 GUI 和 CLI pane 操作接同一 WorkspaceService，目标身份与输入焦点分别存；跨 Space focus 切显示但不迁移归属。
3. 关闭 Pane/Tab 调用 detach；stop 仍用明确目标的确认；后台状态/消息不抢焦点。
4. 覆盖空/加载/失联/后台/停止/长标题、键盘、Dialog/Sheet 焦点返回、200% 缩放、减少动效；记录 Design Conformance。

<a id="acceptance"></a>
## 验收标准

- [x] `AC-009`：两端查询一致；目标稳定；不改变 Session 的 Space 归属；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [x] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

### 显式目标回归（LOG-028）

已批准原型存在已复现缺陷：切换焦点到另一 Space 后，目标下拉显示新 Space 的首项，内部 target 仍指向旧 Session，造成所见目标与实际发送不同。生产实现遵守 DESIGN 的“焦点与显式目标分离”：切焦点不得静默改写目标；保留的目标必须在 scope/选项与归属提示中真实可见，或明确要求重新选择且禁发。为跨 Space 焦点切换、目标停止/归档/删除及发送建立生产组件与用例回归。获批原型和其批准 digest 不改写。

<a id="verification"></a>
## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 布局与焦点一致 | V-01/V-02/V-08 | pnpm exec vitest run --project dom src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx；新 pane CLI 契约 | 两端布局/目标一致，分屏第三个对象不会重复旧对象 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path> |
| 真实宿主 UI | V-08 | 基于 workbench-probe.mjs 增补目标场景：宽>=960、600–959、<600，亮暗、长中文、键盘、200%缩放 | 无意外溢出；focus 与控制 target 不串；关闭显示后后台仍运行 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/ui/workspace/keyboard-scope.dom.test.tsx src/modules/agent/core/workspace/shortcuts.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：真实 Obsidian 主窗口与专注叶子，在 A 任务流中逐项执行 create/attach/split/resize/focus/close，保留截图和 CLI 对照；窄屏不当移动端 PTY。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

<a id="constraints"></a>
## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001 / PAGE-003、所绑定 AC、生产组件/布局/状态与可访问性自动化及相对原型的差异；真实宿主视口/主题/操作/截图按 Spec §11 由用户验收，不伪造截图。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

<a id="risks"></a>
## 未决事项与风险

shared 容器/浏览器独立承载由 T-13 迁移，保持本票已验证的布局契约。修改 DESIGN 或原型以迎合实现偏差不属于本票写集。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。

## GP033 实际接缝与精确写集

<a id="t09-engineering"></a>

T08实际done后，Root已核012/013/018真实准备及上游最终交付，采用 evidence/T-09-engineering-packet.md 与 T-09-write-allocation.json 的56精确路径。A为原SpaceWorkspaceStore/WorkspaceService与Pane身份，B为原canonical/CLI/薄Control adapter，U为生产UI/i18n与受控Chrome，Root独占根产物与正式状态；未分配路径只读。先A交真实API，B第一阶段只写明确协议子集且availability=false，B接线和U消费者再按已冻API解锁。

查询旧布局不取writer、不写盘、不将兼容ID塞进clean base；第一次真实布局mutation才物化。所有CLI修改沿原dirty draft owner保存，不绕开它写records.layouts。Pane关闭只detach，重开新显示ID；焦点成功需实际ForegroundIntent consumed。完整envelope分页与本地布局revision、明确原Pane与插入Session分别捕获，均按Packet真实回归验证。原Spec/设计/Space绑定/真实E2E责任不变。

<a id="t09-dom-assembly"></a>
## GP034 DOM真实浏览器依赖入口

031生产分屏DOM探针发现当前dom测试解析react-resizable-panels 3.0.6的node/edge-light入口，布局effects被移除，原键盘用例未真正运行。Root回读包exports及020/021原输出后，仅追加vitest.config.ts为Root唯一写入，dom项目显式使用已安装的browser入口，不改依赖/锁或其它项目的解析。当前精确写集见evidence/T-09-write-allocation-r2.json（57路径）；原A14/B18/U20和已冻结TASK权限不变。021临时配置通过不是正式根配置或完整T09验收；原020装配失败与wrapper退出码回执保留。实际结构校验通过后Root才修改该配置，最终在同源DOM集成中核验。


## T09 最终代码验收

- 状态：done；Root 整合 attempts 3，最终审计 `evidence/T-09-root-integration3-audit.json`。
- A042 GUI 容量修复已停源并通过 owner/GUI/foreground 149/149、Pane 24/24、types 与生产 lint；统一覆盖 splitPane、reopen、direct attach、updateLayout/editLayout 和竞争发布。
- Root build、lint、Agent/Navigator DOM 30/314、native control 4/31、architecture、Promise、bundle budget、生产 Chrome 30/26 全部 exit0；最终源 manifest drift=[]、outside allocation=[]。
- R2 独立审查报告 `sessions/20261026T045732Z/043-t09-full-review-r2/REPORT.md` SHA256 `119cbd3bbc18537df8e7e4aa54271a44c0c5335cdaaf804d7d1d4fe890aa000e`，standards/specification 均 pass，无 material finding。
- 真实 Obsidian、Provider、OS IME/preedit 与五平台 E2E 仍由用户执行，不能由本票受控证据替代。
