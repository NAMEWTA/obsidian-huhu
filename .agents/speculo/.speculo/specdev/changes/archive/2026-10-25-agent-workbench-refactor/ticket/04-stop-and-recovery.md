---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-04"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001","PAGE-003","PAGE-004"],"acceptance":["AC-027","AC-029","AC-060","AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-04"
title: "明确停止、归档与宿主恢复"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "停止与 spawn/退出/重启竞争可能遗留进程或丢失用户记录，包含不可交换的归档顺序。"
ready: true
risk: "high"
blocked_by: ["T-03"]
contract_ids: ["AC-027","AC-028","AC-029","AC-056","AC-058","AC-060","AC-061"]
owner: "codex:/root/prepare_t03"
expected_changes: ["<Path>src/modules/agent/services/terminal/sessions.ts</Path>","<Path>native/pty-server/src/job.rs</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/services/terminal/**</Path>","<Path>src/modules/agent/services/workspace-service*.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/module*.ts</Path>","<Path>src/modules/agent/ui/terminal/confirm.tsx</Path>","<Path>src/modules/agent/ui/sidebar/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>native/pty-server/src/session.rs</Path>","<Path>native/pty-server/src/job.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/tests/**</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path>","<Path>src/modules/agent/core/workspace/model.ts</Path>","<Path>src/modules/agent/core/workspace/ops.ts</Path>","<Path>src/modules/agent/services/spaces/records.ts</Path>","<Path>src/modules/agent/services/spaces/records.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service-recovery.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service-lifecycle.test.ts</Path>","<Path>src/modules/agent/services/workspace-store.ts</Path>","<Path>src/modules/agent/services/workspace-store.test.ts</Path>","<Path>src/modules/agent/services/workspace-store-spaces.test.ts</Path>","<Path>src/modules/agent/services/controller-stop-recovery.test.ts</Path>","<Path>src/modules/agent/services/controller-managed-runtimes.test.ts</Path>","<Path>src/modules/agent/services/controller-space.test.ts</Path>","<Path>src/modules/agent/services/controller-native.test.ts</Path>","<Path>src/modules/agent/services/launch/managed-errors.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/prompt-runner.ts</Path>","<Path>src/modules/agent/services/prompt-runner.test.ts</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/confirm.dom.test.tsx</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/shared/native/frames.ts</Path>","<Path>src/shared/native/termination.ts</Path>","<Path>src/shared/native/termination.test.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/host/desktop/native/helper.ts</Path>","<Path>src/host/desktop/native/host.test.ts</Path>","<Path>src/host/desktop/native/helper.test.ts</Path>","<Path>src/host/desktop/native/host.integration.test.ts</Path>","<Path>native/pty-server/src/bootstrap.rs</Path>","<Path>native/pty-server/Cargo.toml</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>src/modules/agent/core/space/errors.ts</Path>","<Path>src/modules/agent/services/spaces/messages.ts</Path>","<Path>src/modules/agent/services/launch/launcher.ts</Path>","<Path>src/modules/agent/services/launch/launcher-space.test.ts</Path>","<Path>test/fixtures/native/terminal-termination-v1.json</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path>","<Path>src/modules/browser/module.test.ts</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/services/terminal/**</Path>","<Path>src/modules/agent/services/workspace-service*.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/module*.ts</Path>","<Path>src/modules/agent/ui/sidebar/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>native/pty-server/src/session.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/tests/**</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path>","<Path>src/modules/agent/core/workspace/model.ts</Path>","<Path>src/modules/agent/core/workspace/ops.ts</Path>","<Path>src/modules/agent/services/spaces/records.ts</Path>","<Path>src/modules/agent/services/spaces/records.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service-recovery.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service-lifecycle.test.ts</Path>","<Path>src/modules/agent/services/workspace-store.ts</Path>","<Path>src/modules/agent/services/workspace-store.test.ts</Path>","<Path>src/modules/agent/services/workspace-store-spaces.test.ts</Path>","<Path>src/modules/agent/services/controller-stop-recovery.test.ts</Path>","<Path>src/modules/agent/services/controller-managed-runtimes.test.ts</Path>","<Path>src/modules/agent/services/controller-space.test.ts</Path>","<Path>src/modules/agent/services/controller-native.test.ts</Path>","<Path>src/modules/agent/services/launch/managed-errors.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/prompt-runner.ts</Path>","<Path>src/modules/agent/services/prompt-runner.test.ts</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/confirm.dom.test.tsx</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/shared/native/frames.ts</Path>","<Path>src/shared/native/termination.ts</Path>","<Path>src/shared/native/termination.test.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/host/desktop/native/helper.ts</Path>","<Path>src/host/desktop/native/host.test.ts</Path>","<Path>src/host/desktop/native/helper.test.ts</Path>","<Path>src/host/desktop/native/host.integration.test.ts</Path>","<Path>native/pty-server/src/bootstrap.rs</Path>","<Path>native/pty-server/Cargo.toml</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>src/modules/agent/core/space/errors.ts</Path>","<Path>src/modules/agent/services/spaces/messages.ts</Path>","<Path>src/modules/agent/services/launch/launcher.ts</Path>","<Path>src/modules/agent/services/launch/launcher-space.test.ts</Path>","<Path>test/fixtures/native/terminal-termination-v1.json</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path>","<Path>src/modules/browser/module.test.ts</Path>"]
shared_path_owners: ["<Path>src/modules/agent/services/terminal/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/session.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/main.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/**</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/managed-runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/model.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/workspace/ops.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/records.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/records.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service-recovery.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service-lifecycle.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-store.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-store.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-store-spaces.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-stop-recovery.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-managed-runtimes.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-space.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-native.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/launch/managed-errors.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/prompt-runner.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/prompt-runner.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/confirm.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/shared/native/host.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/frames.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/termination.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/termination.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.integration.test.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/bootstrap.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/Cargo.toml</Path> => lead:agent-workbench-integration","<Path>scripts/bundle-budget.json</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/space/errors.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/messages.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/launch/launcher.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/launch/launcher-space.test.ts</Path> => lead:agent-workbench-integration","<Path>test/fixtures/native/terminal-termination-v1.json</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/browser/module.test.ts</Path> => lead:agent-workbench-integration"]
---

# Ticket T-04：明确停止、归档与宿主恢复

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

<a id="purpose"></a>
## 目标与来源

停止只结束指定代次；归档先收束运行并保留历史，部分失败可见；宿主退出后恢复记录而不自动执行。

现有 native session/job、helper stdin-close 与 dispose 已有测试；要把 shutdown 与 Tab close 明确拆开。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

<a id="scope"></a>
## 行为与范围

IN：stop/archiving/shutdown 的有限收束、迟到事件、恢复状态。REUSE：Rust Job/进程管理、持久布局。OUT：宿主外 daemon、自动补发任务。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

<a id="research"></a>
## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-05：[portable-pty 0.9/MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml)。
- K-05：[portable-pty 历史 Windows 报告](https://github.com/wezterm/wezterm/issues/4784)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

<a id="route"></a>
## 有序执行路线

1. 先关闭新动作接纳，取消未开始的 spawn/input/wait，继续处理输出和退出；旧 Hook/exit 依 runtimeId 过滤。
2. 显式 stop 保留 stop-requested，核实退出才标 exited；失败/残留持久可定位，不能用移除 UI 掩盖。
3. Space/Session 归档先汇总并收束其运行，再写归档；取消无影响，部分失败保留逐对象结果。
4. 退出宿主保存恢复记录并结束受管子进程；重开不自动 spawn，明确继续生成新代次；补 Agent disable 与 Browser 租约回归。

### T-03 完成后的真实接缝补集

GP-015 / Map16（LOG-050）依据前序已完成源与 T-04 只读预检补齐实际持久 owner、runtime DTO、native 收束证据和局部 UI 路径。SpaceService 仍是唯一业务队列；持久运行尝试须先于首次 spawn，历史 PID/runtime 不成为重启后的活动进程授权。归档在同队列关闭范围准入并核对确认前冻结集合，进程等待在队列之外，部分/未知结果不得提交成功归档。恢复读取零 helper/Provider/输入副作用。

Root 在本票 Evidence 明确 A 业务/持久化/DTO、C 原生协议/host/Rust、B 局部 UI 的互斥分工；公共 native 合同与业务 DTO 分别由唯一 owner 先落源冻结，再解锁消费者。Windows 采用同 helper 内部 bootstrap、私有放行与独立 Session Job；Unix 采用验证归属的组/会话有限收束，保留根退出与清理结果的不同证据，无法确认时明确 partial/unknown。仅沿已研究许可的机制实现，不修改依赖 registry、不引入系统服务/额外权限或第二 PTY 实现。

条件路径只在实际闭包需要时使用：workspace-store/model/ops 限恢复/归档布局与严格排空；agent-runtime/prompt-runner 限旧消费者停止/等待适配，不实施 T-14 配置迁移；Cargo.toml 仅既有 windows-sys 的必要 feature，不增版本/依赖；termination.ts 可承载有限 native codec；bootstrap.rs 仅可信内部启动模式。main.js/styles.css 与测量后必要预算仍 Root 独占。新增或条件路径不构成必须改动的清单。

GP-016 / Map17（LOG-053）根据真实Chrome取消后焦点丢失的反例，精确补AgentWorkspacePage.tsx及其DOM测试，由B唯一修复无AlertDialogTrigger时的确认来源焦点生命周期。仅捕获发起document/元素、关闭时按仍可见连接和用户焦点意图恢复；不改页面布局、共享Dialog原语或工作台架构。原GP015分配与红灯记录保留，其他owner写集不变。

GP-017 / Map18（LOG-055）据Root真实组合回归补src/modules/browser/module.test.ts单一测试路径，适配明确清理证据与旧helper未知结果，并继续验证Cookie在Agent关闭期间完成。仅修旧测试fixture与断言，不放宽生产清理证据，不实施T-13网页重构。

<a id="acceptance"></a>
## 验收标准

- [x] `AC-027`：区分请求和已退出；只处理目标代次；失败/残留可见；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-028`：取消无影响；归档先收束，部分失败不伪称完成；历史/消息保留；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-029`：新状态、标题和终端不被旧事件污染；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-056`：拒绝新动作；等待有界结束；迟到进程按身份清理；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-058`：各 owner 收到准确失败；屏幕/状态标失联；不重放输入；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-060`：进程随宿主退出；恢复记录/网页；Agent 需明确继续；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [x] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

<a id="verification"></a>
## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 竞争与退出 | V-03/V-06 | pnpm run check:native；pnpm exec vitest run src/modules/agent/services/terminal；新增 late-spawn/old-hook 故障注入 | 停止与退出分开，新代次不受污染，等待有界结束 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path> |
| 重启与归档 | V-01/V-08 | 真实宿主：归档取消/部分 kill 失败、Agent disable 期间 spawn、强制终止 helper、重开宿主 | 有效数据保留；恢复未运行，无自动输入；残留/失联准确可见 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/module.test.ts src/modules/browser/services/host.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：一次性库中测试工作中会话、网页、多个 Space，执行 stop、归档、停用、宿主退出和重启；核对进程树与精确恢复身份。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

<a id="constraints"></a>
## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001 / PAGE-003 / PAGE-004、所绑定 AC、生产组件/布局/状态与可访问性自动化及相对原型的差异；真实宿主视口/主题/操作/截图按 Spec §11 由用户验收，不伪造截图。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

Windows Job 与 Unix 进程退出不可相互代替；测试单一进程不证明孙进程收束。程序回退不直接回写新格式，数据回滚细节在 T-15。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
