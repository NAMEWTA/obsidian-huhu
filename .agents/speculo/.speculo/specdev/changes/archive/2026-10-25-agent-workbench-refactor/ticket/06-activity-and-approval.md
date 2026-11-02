---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-06"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001","PAGE-003"],"acceptance":["AC-007","AC-020","AC-021","AC-022","AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-06"
title: "Agent 状态与 HUHU 内原生人工审批"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "状态判断决定输入是否安全，且须保留账号的 Manual/YOLO 与原生权限边界。"
ready: true
risk: "high"
blocked_by: ["T-05"]
contract_ids: ["AC-007","AC-020","AC-022","AC-061"]
owner: "codex:/root/prepare_t03"
expected_changes: ["<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path>","<Path>src/modules/agent/services/terminal/status.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path>","<Path>src/modules/agent/services/terminal/session.ts</Path>","<Path>src/modules/agent/services/terminal/session.test.ts</Path>","<Path>src/modules/agent/services/terminal/status.ts</Path>","<Path>src/modules/agent/services/terminal/status.test.ts</Path>","<Path>src/modules/agent/services/terminal/sessions.ts</Path>","<Path>src/modules/agent/services/terminal/sessions-activity.test.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/workspace-service-activity.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-spaces.test.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/services/controller-activity.test.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/spaces/records.ts</Path>","<Path>src/modules/agent/services/spaces/records.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.test.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>docs/agent-workbench.md</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-activity.mjs</Path>","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/native-extensions.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/native-extensions.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/event-payload.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/event-payload.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/spool-guard.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/system-hooks.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/system-hooks.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/remove-status-hooks.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.test.ts</Path>","<Path>src/modules/agent/platform/desktop/agents/accounts.ts</Path>","<Path>src/modules/agent/platform/desktop/agents/accounts.test.ts</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>src/modules/agent/services/launch/foreground-intent.ts</Path>","<Path>src/modules/agent/services/launch/foreground-intent.dom.test.tsx</Path>","<Path>src/modules/agent/services/workspace-service-foreground.dom.test.tsx</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path>","<Path>src/modules/agent/services/terminal/session.ts</Path>","<Path>src/modules/agent/services/terminal/session.test.ts</Path>","<Path>src/modules/agent/services/terminal/status.ts</Path>","<Path>src/modules/agent/services/terminal/status.test.ts</Path>","<Path>src/modules/agent/services/terminal/sessions.ts</Path>","<Path>src/modules/agent/services/terminal/sessions-activity.test.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/workspace-service-activity.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-spaces.test.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/services/controller-activity.test.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/spaces/records.ts</Path>","<Path>src/modules/agent/services/spaces/records.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.test.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>docs/agent-workbench.md</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-activity.mjs</Path>","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/native-extensions.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/native-extensions.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/event-payload.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/event-payload.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/spool-guard.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/system-hooks.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/system-hooks.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/remove-status-hooks.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.test.ts</Path>","<Path>src/modules/agent/platform/desktop/agents/accounts.ts</Path>","<Path>src/modules/agent/platform/desktop/agents/accounts.test.ts</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>src/modules/agent/services/launch/foreground-intent.ts</Path>","<Path>src/modules/agent/services/launch/foreground-intent.dom.test.tsx</Path>","<Path>src/modules/agent/services/workspace-service-foreground.dom.test.tsx</Path>"]
shared_path_owners: ["<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/session.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/session.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/status.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/status.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/sessions.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/sessions-activity.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-activity.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-spaces.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-activity.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/records.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/records.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>scripts/obsidian-acceptance/agent-workbench-activity.mjs</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/native-extensions.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/native-extensions.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/event-payload.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/event-payload.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/spool-guard.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/system-hooks.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/system-hooks.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/remove-status-hooks.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/agents/accounts.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/agents/accounts.test.ts</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration","<Path>scripts/bundle-budget.json</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/launch/foreground-intent.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/launch/foreground-intent.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-foreground.dom.test.tsx</Path> => lead:agent-workbench-integration"]
---

# Ticket T-06：Agent 状态与 HUHU 内原生人工审批

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

<a id="purpose"></a>
## 目标与来源

受管 Shell 手动启动 Agent 后可发现能力；后台待处理可定位原终端，用户批准/拒绝后继续该会话；不可靠识别显示未知。

已有 AutomationHooks/native-extensions、hookActivity、AgentState 与账号权限配置；R-01 的当前 Codex 检测已经说明单一 Hook 假设不可靠。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

<a id="scope"></a>
## 行为与范围

IN：状态来源、activitySequence、能力发现、待处理导航与原 TUI 人工操作。REUSE：已实现 Hook/检测与 Manual/YOLO。OUT：通用审批 API、自动批准、跨后端重放。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

<a id="research"></a>
## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- K-01：[Herdr 状态检测变更](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。
- K-02：[Herdr 输入与 Windows 修复](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

<a id="route"></a>
## 有序执行路线

1. 先建立各现有 CLI 的能力/版本表：原生事件、前台程序、屏幕识别各能证明什么；不支持的能力显式 unknown。
2. 用 T-05 权威屏幕与 T-04 runtimeId 处理状态/标题，分开连接、活动、seen 与 mailbox；检测异常不能吞成 idle。
3. 在当前页面提供后台待处理提示和定位，焦点只在用户选择时切换；原生 TUI 内批准/拒绝后按真实状态更新。
4. 保留权限设置与首次确认，blocked 时向控制端暴露不能普通 prompt；补真实 Codex/Claude 与拒绝/未知负例。

<a id="acceptance"></a>
## 验收标准

- [ ] `AC-007`：能力按证据更新；不支持时显示未知且保留原始终端控制；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-020`：在 HUHU 定位原终端；用户能批准或拒绝并继续该会话；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] 本票贡献：状态来源、unknown 和原生待处理入口保持，不自动批准或切后端；普通 CLI 协作输入拒绝与不重放由 T-08 组合验收。
- [ ] `AC-022`：保留选择与首次确认；不无声升级权限；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

<a id="verification"></a>
## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 状态与迟到信号 | V-03/V-06 | pnpm exec vitest run src/modules/agent/platform/desktop/hooks src/modules/agent/services/agent-runtime.test.ts；新增检测状态转移 fixture | 来源可解释、代次不串、未知不伪报空闲 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path> |
| 权限与用户操作 | V-03/V-08 | 生产状态适配器、审批定位与权限保留的自动化；真实 Codex/Claude 操作交用户，普通协作输入的 CLI 组合归 T-08 | 输入不会回答权限问题，不换后端；原会话可继续，原设置保持 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/platform/desktop/hooks/event-payload.test.ts src/modules/agent/platform/desktop/agents/account-permissions.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：在 HUHU 的真实终端中完成至少一种 Provider 允许与拒绝，并记录另一种真实 CLI 的能力差异；未遇审批时不得用模拟动画代替。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

<a id="constraints"></a>
## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001 / PAGE-003、所绑定 AC、生产组件/布局/状态与可访问性自动化及相对原型的差异；真实宿主视口/主题/操作/截图按 Spec §11 由用户验收，不伪造截图。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

检测版本变化使本票状态证据失效；先降为 unknown 和保留原终端，再研究新版本。无可靠结构化审批接口时使用已批准的原生 TUI 路径即可，不扩大平台。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。


## GP-020 实施前接缝核验与精确写集

T-05最终代码交付与独立双轴审查见原Evidence，进入本票前由Lead回读。T-06的只读API、Hook资源、呈现后已读、跨owner对账与Browser验收候选已核对真实源；最终派单合同为evidence/T-06-dispatch-packet.md，输入/路径/Skill摘要由实际派遣时冻结。候选接口只有落入源码并由Lead回读后才解锁跨owner消费。

A负责Session活动权威、原子订阅、精确attach、持久化提示与实际消费者；C负责一个运行一个prepared Hook scope、原生完整结果与小摘要单次物理发布、共享有界spool及真实异步清理；B负责原生产Sidebar/TabView/View呈现与定位，Root独占产物/预算和正式记录。各源文件只有一个writer，精确44路径见frontmatter；不写native/shared、控制宿主、AgentWorkspacePage或T-09布局。非本人路径需要变更时先交Lead。

activitySequence与content/seen分开；同binding/epoch/registration/blockId配对才清待处理。无可靠结构化来源时unknown并保留原终端，不凭输出/TTL/native exit0假报完成。foreground此票保持unknown，T-08需真实前台安全证据和可用正例。原生TUI由用户人工批准/拒绝，Manual/YOLO/首次确认不变。

呈现已读必须捕获React commit时的N，完整screen安装后收到公开onRender覆盖viewport，再核对generation、可见、focus和精确pane；A独立核身份/布局。N+1期间确认N只推进seenThrough=N。readonly恢复提示按实际呈现确认，不spawn。一个真实持久化writer与物理Hook额度在超时后仍保留到真实结算；所有限额、错误与关闭按派单合同验证，不以observer结束充当资源回收。

## GP-021 真实显示意图与几何验证恢复

原GP020的44路径与三次整合失败保留于evidence/T-06-recovery1-preplan.json。Root实际单变量Chrome确认真实capture会被中间companion自动focus撤销；受控seen barrier另确认同owner合法行变化也会击穿旧resize次数断言。依据和新窄修合同见evidence/T-06-recovery1-packet.md，不用后续通过覆盖原失败。

本次精确增加foreground-intent.ts、其DOM测试及workspace-service-foreground.dom.test.tsx，共47路径，仍为A23/B7/C14/Root3的唯一writer。仅解冻Packet列明的A6/B5及Root产物；C和其他路径继续STOP。新增的是显示意图的一次消费和精确Host聚焦，活动状态中的OS foreground能力仍unknown，T08原责任不变。

<a id="review-repair1"></a>
## 独立审查 round1 的同范围修复窗口

完整42路径审查返回两轴request-changes：同OpenCode registration不同root被错误采纳，以及有限重排缺口期间仍current。原报告、输入与探针见evidence/T-06-review-round1.md及T-06-review-round1-return-root-audit.json。按evidence/T-06-review-repair1-packet.md在原47路径内只解冻A4/C3及Root产物；此活动窗口取代上段旧A6/B5窗口，其他源全部STOP。Spec/设计/验收与总写集不变，恢复周期1仍attempts1，后续实际整合递增，不重置原周期3次失败。

选择服务先提交、Host再一次性消费原token的路线；selecting期间不让恢复布局的companion自动focus，所有旧撤销源与revision门保留。精确leaf容器、当前请求/视图身份、后台、取消、过期与两caller均须真实反证；取消清理不补focus，后续真正导航可重新正常聚焦。显示提交1秒未消费即释放原token，不续期、不重试。字段与接口须由A落源、Root回读后B消费，不能只读候选签名开写跨owner调用。
