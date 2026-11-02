---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-07"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-agent-workbench-refactor"
id: "T-07"
title: "本机 CLI、精确寻址与机器协议"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "新增公开控制协议、Unix/Windows 本机访问边界与 Rust→TS→Rust 回入。"
ready: true
risk: "high"
blocked_by: ["T-06"]
contract_ids: ["AC-004","AC-006","AC-010","AC-011","AC-012","AC-052","AC-055"]
owner: "codex:/root/prepare_t03"
expected_changes: ["<Path>src/shared/native/control-schema.json</Path>","<Path>src/shared/native/control-wire.ts</Path>","<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/modules/agent/services/control/router.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>docs/agent-workbench-cli.md</Path>"]
writable_paths: ["<Path>src/modules/agent/core/control/context.ts</Path>","<Path>src/modules/agent/services/control/router.ts</Path>","<Path>src/modules/agent/services/control/commands.ts</Path>","<Path>src/modules/agent/services/control/paging.ts</Path>","<Path>src/modules/agent/platform/desktop/control/environment.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/terminal/sessions.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/module.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/modules/agent/services/control/router.test.ts</Path>","<Path>src/modules/agent/services/control/commands.test.ts</Path>","<Path>src/modules/agent/services/control/paging.test.ts</Path>","<Path>src/modules/agent/services/control/router-foreground.dom.test.tsx</Path>","<Path>src/modules/agent/services/control/control-native.test.ts</Path>","<Path>src/modules/agent/platform/desktop/control/environment.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service-control.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-control.test.ts</Path>","<Path>src/modules/agent/services/terminal/sessions-control.test.ts</Path>","<Path>src/modules/agent/services/controller-control.test.ts</Path>","<Path>src/modules/agent/module.test.ts</Path>","<Path>src/modules/agent/services/controller-managed-runtimes.test.ts</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/shared/native/frames.ts</Path>","<Path>src/shared/native/frames.test.ts</Path>","<Path>src/shared/native/lazy-host.test.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/host/desktop/native/helper.ts</Path>","<Path>src/host/desktop/native/helper-control.test.ts</Path>","<Path>src/host/desktop/native/host-control.test.ts</Path>","<Path>src/host/desktop/native/host-control.integration.test.ts</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-control.mjs</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>.github/workflows/lint.yml</Path>","<Path>src/shared/native/control-schema.json</Path>","<Path>scripts/generate-control-protocol.mjs</Path>","<Path>src/shared/native/control-wire.generated.ts</Path>","<Path>src/shared/native/control-wire.ts</Path>","<Path>src/shared/native/control-wire.test.ts</Path>","<Path>test/fixtures/native/control-v1.json</Path>","<Path>test/native/control-protocol.test.ts</Path>","<Path>native/pty-server/src/lib.rs</Path>","<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/outbox.rs</Path>","<Path>native/pty-server/Cargo.toml</Path>","<Path>native/pty-server/Cargo.lock</Path>","<Path>native/pty-server/src/control/mod.rs</Path>","<Path>native/pty-server/src/control/wire_generated.rs</Path>","<Path>native/pty-server/src/control/codec.rs</Path>","<Path>native/pty-server/src/control/cli.rs</Path>","<Path>native/pty-server/src/control/client.rs</Path>","<Path>native/pty-server/src/control/broker.rs</Path>","<Path>native/pty-server/src/control/ipc.rs</Path>","<Path>native/pty-server/src/control/unix.rs</Path>","<Path>native/pty-server/src/control/windows.rs</Path>","<Path>native/pty-server/src/control/locator.rs</Path>","<Path>native/pty-server/tests/control_protocol.rs</Path>","<Path>native/pty-server/tests/control.rs</Path>","<Path>native/pty-server/tests/control_outbox.rs</Path>","<Path>scripts/third-party-notices.mjs</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>src/modules/agent/services/controller-activity.test.ts</Path>","<Path>docs/third-party/licenses/objc2-historical-MIT.txt</Path>","<Path>docs/third-party/licenses/dispatch2-original-MIT.txt</Path>","<Path>docs/third-party/licenses/sources.json</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/core/control/context.ts</Path>","<Path>src/modules/agent/services/control/router.ts</Path>","<Path>src/modules/agent/services/control/commands.ts</Path>","<Path>src/modules/agent/services/control/paging.ts</Path>","<Path>src/modules/agent/platform/desktop/control/environment.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/terminal/sessions.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/module.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/modules/agent/services/control/router.test.ts</Path>","<Path>src/modules/agent/services/control/commands.test.ts</Path>","<Path>src/modules/agent/services/control/paging.test.ts</Path>","<Path>src/modules/agent/services/control/router-foreground.dom.test.tsx</Path>","<Path>src/modules/agent/services/control/control-native.test.ts</Path>","<Path>src/modules/agent/platform/desktop/control/environment.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service-control.test.ts</Path>","<Path>src/modules/agent/services/workspace-service-control.test.ts</Path>","<Path>src/modules/agent/services/terminal/sessions-control.test.ts</Path>","<Path>src/modules/agent/services/controller-control.test.ts</Path>","<Path>src/modules/agent/module.test.ts</Path>","<Path>src/modules/agent/services/controller-managed-runtimes.test.ts</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/shared/native/frames.ts</Path>","<Path>src/shared/native/frames.test.ts</Path>","<Path>src/shared/native/lazy-host.test.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/host/desktop/native/helper.ts</Path>","<Path>src/host/desktop/native/helper-control.test.ts</Path>","<Path>src/host/desktop/native/host-control.test.ts</Path>","<Path>src/host/desktop/native/host-control.integration.test.ts</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-control.mjs</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>.github/workflows/lint.yml</Path>","<Path>src/shared/native/control-schema.json</Path>","<Path>scripts/generate-control-protocol.mjs</Path>","<Path>src/shared/native/control-wire.generated.ts</Path>","<Path>src/shared/native/control-wire.ts</Path>","<Path>src/shared/native/control-wire.test.ts</Path>","<Path>test/fixtures/native/control-v1.json</Path>","<Path>test/native/control-protocol.test.ts</Path>","<Path>native/pty-server/src/lib.rs</Path>","<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/outbox.rs</Path>","<Path>native/pty-server/Cargo.toml</Path>","<Path>native/pty-server/Cargo.lock</Path>","<Path>native/pty-server/src/control/mod.rs</Path>","<Path>native/pty-server/src/control/wire_generated.rs</Path>","<Path>native/pty-server/src/control/codec.rs</Path>","<Path>native/pty-server/src/control/cli.rs</Path>","<Path>native/pty-server/src/control/client.rs</Path>","<Path>native/pty-server/src/control/broker.rs</Path>","<Path>native/pty-server/src/control/ipc.rs</Path>","<Path>native/pty-server/src/control/unix.rs</Path>","<Path>native/pty-server/src/control/windows.rs</Path>","<Path>native/pty-server/src/control/locator.rs</Path>","<Path>native/pty-server/tests/control_protocol.rs</Path>","<Path>native/pty-server/tests/control.rs</Path>","<Path>native/pty-server/tests/control_outbox.rs</Path>","<Path>scripts/third-party-notices.mjs</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>src/modules/agent/services/controller-activity.test.ts</Path>","<Path>docs/third-party/licenses/objc2-historical-MIT.txt</Path>","<Path>docs/third-party/licenses/dispatch2-original-MIT.txt</Path>","<Path>docs/third-party/licenses/sources.json</Path>"]
shared_path_owners: ["<Path>src/modules/agent/core/control/context.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/router.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/commands.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/paging.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/control/environment.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/sessions.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/router.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/commands.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/paging.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/router-foreground.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/control-native.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/control/environment.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/sessions-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-managed-runtimes.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/host.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/frames.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/frames.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/lazy-host.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host-control.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host-control.integration.test.ts</Path> => lead:agent-workbench-integration","<Path>scripts/obsidian-acceptance/agent-workbench-control.mjs</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>.github/workflows/lint.yml</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-schema.json</Path> => lead:agent-workbench-integration","<Path>scripts/generate-control-protocol.mjs</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-wire.generated.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-wire.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-wire.test.ts</Path> => lead:agent-workbench-integration","<Path>test/fixtures/native/control-v1.json</Path> => lead:agent-workbench-integration","<Path>test/native/control-protocol.test.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/lib.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/bin/huhu.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/main.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/outbox.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/Cargo.toml</Path> => lead:agent-workbench-integration","<Path>native/pty-server/Cargo.lock</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/mod.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/wire_generated.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/codec.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/cli.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/client.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/broker.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/ipc.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/unix.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/windows.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/control/locator.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control_protocol.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control_outbox.rs</Path> => lead:agent-workbench-integration","<Path>scripts/third-party-notices.mjs</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration","<Path>scripts/bundle-budget.json</Path> => lead:agent-workbench-integration","<Path>THIRD-PARTY-NOTICES.md</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-activity.test.ts</Path> => lead:agent-workbench-integration","<Path>docs/third-party/licenses/objc2-historical-MIT.txt</Path> => lead:agent-workbench-integration","<Path>docs/third-party/licenses/dispatch2-original-MIT.txt</Path> => lead:agent-workbench-integration","<Path>docs/third-party/licenses/sources.json</Path> => lead:agent-workbench-integration"]
---

# Ticket T-07：本机 CLI、精确寻址与机器协议

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

<a id="purpose"></a>

## 目标与来源

外部 huhu CLI 能准确发现当前实例和目标；默认已捕获受管终端绑定的 Space（不猜 GUI 焦点或 cwd）、明确同 Vault 跨 Space，跨 Vault/过期运行拒绝；慢扫描不堵控制。

目前 helper 只有 stdio 帧与现有 cookie/history 请求；需增加受保护本机控制入口，并通过同一 TS 用例调度业务。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

<a id="scope"></a>

## 行为与范围

IN：implementation-contracts 的 v1 语法/JSON/schema、独立 Rust CLI、发现/能力/诊断、路由、取消、请求关联。REUSE：现有 helper/帧与受保护本机路径设施。OUT：公网 HTTP、自动唤醒模块、自建角色平台。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

<a id="research"></a>

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。
- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。
- K-01：[Herdr 状态检测变更](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

<a id="route"></a>

## 有序执行路线

1. 先把计划 v1 字段/错误/命令转换为可编译并契约测试的单一描述，产出 TS/Rust 两端校验；尚未实现能力显式 unavailable。
2. 构建独立 huhu CLI 与 helper 通道；Unix socket 权限/Windows pipe ACL 限当前用户，令牌/locator 不进入共享备份或敏感日志。
3. 绑定物理 Vault/device/instance，复用 T-02 单 owner；缺目标/同名/跨 Vault/过期 endpoint 与协议不匹配都在副作用前拒绝。
4. 分离接收分派与业务 await，允许 native→TS→native 回入；并行慢 history 与 stop，CLI 退出只取消自己的请求/等待。

<a id="acceptance"></a>

## 验收标准

- [x] `AC-006`：通过真实 CLI 命令入口调用 T-03 生产用例创建后台 B，查询 runtime/Space 且无 Pane、不抢 A 焦点。

- [x] `AC-004`：通过真实 CLI 命令入口与生产目标解析证明无 Space/同名歧义时明确拒绝，结合 T-02 的 GUI 选择证据闭合。

- [x] `AC-010`：协议与 Vault/物理绑定一致；失效或错实例明确拒绝；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-011`：默认范围当前 Space；明确目标可跨 Space；结果带原归属；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-012`：无越界效果；错误说明目标不属当前实例或已失效；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-052`：不误连接原实例；业务身份可恢复；物理绑定与授权可核对；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] `AC-055`：无全局读循环/锁死锁；控制和退出不被慢扫描挡住；本票负责完整证明，关联场景依 Spec 验证接缝。
- [x] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

<a id="verification"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| CLI 黑盒契约 | V-02/V-06 | `pnpm run check:native`：Rust control tests验证真实双bin/IPC/协议；Root固定两实际bin后以HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY运行 `pnpm exec vitest run src/modules/agent/services/control/control-native.test.ts src/host/desktop/native/host-control.integration.test.ts test/native/control-protocol.test.ts`，A测试拥有真实CLI→broker→Host→生产TS用例断言 | stdout/stderr/退出码和 envelope 一致；跨 Vault/旧 runtime 无效果 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path> |
| 访问与回入 | V-02/V-07 | 本机 socket/pipe 权限检查、复制 Vault/过期 locator、同名目标、慢扫描期间递归回入和断线 | 错误可分类、无死锁、不覆盖其他实例或自动启用 Agent | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `cargo test --manifest-path native/pty-server/Cargo.toml --test stdio` 与 `pnpm exec vitest run src/modules/agent/platform/desktop/server/serial-queue.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：真实宿主打开工作台后从第二个终端调用本机 CLI，默认查 Space A，明确寻址 Space B；复制测试 Vault 后拒绝旧 endpoint。Windows ACL 由 T-18 实机补齐。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

<a id="constraints"></a>

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

<a id="risks"></a>

## 未决事项与风险

本机同用户 IPC 不是恶意同账户进程沙箱；路由环境变量不能变认证。Windows 高权限/普通权限差异需准确诊断，不能为绕过错误放开 ACL。未发行 CLI 资产只能用本票构建结果测试。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。

## 实施记录

<a id="t07-engineering"></a>

## GP025 / Map26 实施接缝

T06实际最终交付已回读。Root选定同helper本机IPC、单源描述生成TS/Rust、捕获PTY lease的同代control owner、同步capture与有界进度/取消/关闭；具体顺序、固定额度、兼容门和反例见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07-engineering-packet.md</Path>。精确70路径为A24/B12/C30/Root4，唯一writer与分阶段解锁见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07-write-allocation.json</Path>。字段/回执与外部行为仍由Spec和implementation-contracts拥有；本票不能把未注册后继能力写成可用。

现有旧入口的Space补配仍由T14/T15实施；本票所有fresh start只接受显式参数或已冻结的受管终端绑定，缺失返回TARGET_REQUIRED。required真实CLI/TS闭环缺binary明确失败，不skip；Node CI先执行现有check:native再test:all并传实际双bin，Rust CI不安装pnpm。新control走C唯一raw codec与B帧包装，旧history/Cookie限额不变。真实UI版式无修改，本票ui_change=false；既有ForegroundIntent仅由生产服务控制与组合DOM回归验证。新增视觉/UI文件必须重新绑定ui后再实施。

GP023/Map24只增加 `src/modules/agent/services/controller-managed-runtimes.test.ts`：真实定向旧用例因假transport缺localControl而在原environment门前失败，补齐测试注册/关闭协议并保留原断言。原红灯、输入与窄范围依据见 `evidence/T-07-fixture-supplement-root-audit.json`；未将其他潜在fixture提前授权。

GP024/Map25另按Root第1次真实555项回归的唯一失败增加 `src/modules/agent/services/controller-activity.test.ts`，只补旧fake的localControl注册/撤销协议并保留全部业务、权限、root-exit/drain与cleanup断言。原实验1fail→1pass、原finally遮蔽和输入见 `evidence/T-07-a-i1-diagnosis-root-audit.json`；生产能力门与关闭语义不变。

GP025/Map26按Root首次notices真实失败补3个许可输入路径给原C：两份原项目历史完整MIT原文与sources.json四个精确版本条目；Root独占生成THIRD-PARTY-NOTICES.md。当前发布commit的MIT许可声明与完整历史notice来源分别记录，不混称发布内全文，不填写版权/年份、不放松生成器、不换依赖。实际全图73包与4份原archive核验见 `evidence/T-07-license-readonly-root-audit.json`。
