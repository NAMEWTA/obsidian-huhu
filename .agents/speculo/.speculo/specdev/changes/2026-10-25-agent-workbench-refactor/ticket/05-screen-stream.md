---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-05"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001"],"acceptance":["AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-05"
title: "权威屏幕、重同步与有界流控"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "改变终端解析/订阅/resize 热路径，涉及数据顺序、压力隔离及当前依赖风险。"
ready: true
risk: "high"
blocked_by: ["T-04"]
contract_ids: ["AC-031","AC-032","AC-054","AC-061"]
owner: "codex:/root/prepare_t03"
expected_changes: ["<Path>src/modules/agent/services/terminal/session.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>native/pty-server/src/session.rs</Path>"]
writable_paths: ["<Path>src/modules/agent/services/terminal/session*.ts</Path>","<Path>src/modules/agent/core/terminal/frames*.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-presentation.ts</Path>","<Path>src/modules/agent/ui/terminal/stable-terminal-fit.ts</Path>","<Path>native/pty-server/src/session.rs</Path>","<Path>native/pty-server/src/frame.rs</Path>","<Path>native/pty-server/tests/**</Path>","<Path>scripts/verify-pty-helper.mjs</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-screen.mjs</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>src/modules/agent/services/prompt-runner.ts</Path>","<Path>src/modules/agent/services/prompt-runner.test.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/services/controller-native.test.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/terminal-scheduling.test.ts</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalSearch.dom.test.tsx</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/shared/native/frames.ts</Path>","<Path>src/shared/native/frames.test.ts</Path>","<Path>src/shared/native/input.ts</Path>","<Path>src/shared/native/input.test.ts</Path>","<Path>src/host/desktop/native/helper.ts</Path>","<Path>src/host/desktop/native/helper.test.ts</Path>","<Path>src/host/desktop/native/helper-stream.test.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/host/desktop/native/host.test.ts</Path>","<Path>src/host/desktop/native/host.integration.test.ts</Path>","<Path>src/host/desktop/native/host-stream.integration.test.ts</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/outbox.rs</Path>","<Path>native/pty-server/src/data.rs</Path>","<Path>native/pty-server/src/cookies.rs</Path>","<Path>native/pty-server/src/agent_data.rs</Path>","<Path>test/fixtures/native/terminal-input-admission-v1.json</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>src/modules/agent/services/workspace-service-stop-native.test.ts</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/services/terminal/session*.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>native/pty-server/src/session.rs</Path>","<Path>native/pty-server/src/frame.rs</Path>","<Path>native/pty-server/tests/**</Path>","<Path>scripts/verify-pty-helper.mjs</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-screen.mjs</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>src/modules/agent/services/prompt-runner.ts</Path>","<Path>src/modules/agent/services/prompt-runner.test.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/services/controller-native.test.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/terminal-scheduling.test.ts</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path>","<Path>src/modules/agent/ui/terminal/TerminalSearch.dom.test.tsx</Path>","<Path>src/shared/native/host.ts</Path>","<Path>src/shared/native/frames.ts</Path>","<Path>src/shared/native/frames.test.ts</Path>","<Path>src/shared/native/input.ts</Path>","<Path>src/shared/native/input.test.ts</Path>","<Path>src/host/desktop/native/helper.ts</Path>","<Path>src/host/desktop/native/helper.test.ts</Path>","<Path>src/host/desktop/native/helper-stream.test.ts</Path>","<Path>src/host/desktop/native/host.ts</Path>","<Path>src/host/desktop/native/host.test.ts</Path>","<Path>src/host/desktop/native/host.integration.test.ts</Path>","<Path>src/host/desktop/native/host-stream.integration.test.ts</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/outbox.rs</Path>","<Path>native/pty-server/src/data.rs</Path>","<Path>native/pty-server/src/cookies.rs</Path>","<Path>native/pty-server/src/agent_data.rs</Path>","<Path>test/fixtures/native/terminal-input-admission-v1.json</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>scripts/bundle-budget.json</Path>","<Path>src/modules/agent/services/workspace-service-stop-native.test.ts</Path>"]
shared_path_owners: ["<Path>src/modules/agent/services/terminal/session*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/session.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/frame.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/**</Path> => lead:agent-workbench-integration","<Path>scripts/verify-pty-helper.mjs</Path> => lead:agent-workbench-integration","<Path>scripts/obsidian-acceptance/agent-workbench-screen.mjs</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/prompt-runner.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/prompt-runner.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-native.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-scheduling.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/TerminalSearch.dom.test.tsx</Path> => lead:agent-workbench-integration","<Path>src/shared/native/host.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/frames.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/frames.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/input.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/input.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/helper-stream.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host.integration.test.ts</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/host-stream.integration.test.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/main.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/outbox.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/data.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/cookies.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/agent_data.rs</Path> => lead:agent-workbench-integration","<Path>test/fixtures/native/terminal-input-admission-v1.json</Path> => lead:agent-workbench-integration","<Path>package.json</Path> => lead:agent-workbench-integration","<Path>pnpm-lock.yaml</Path> => lead:agent-workbench-integration","<Path>scripts/bundle-budget.json</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/workspace-service-stop-native.test.ts</Path> => lead:agent-workbench-integration"]
---

# Ticket T-05：权威屏幕、重同步与有界流控

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

<a id="purpose"></a>
## 目标与来源

多个观察者看到同一终端；订阅/resize/重连不丢字重复，慢观察者不会拖死其他终端或 stop。

TerminalSession 已以 xterm/headless 解析并在 write callback ack；native 有 PAUSE_AT/RESUME_AT；视图仍有 onData 与 resize，需核对设备回复与尺寸所有权。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

<a id="scope"></a>
## 行为与范围

IN：snapshot 水位+连续增量、单尺寸 owner、显示背压、UTF-8/ANSI、压力样本。REUSE：既有单headless parser、可见xterm交互/渲染器与native credit；采用固定版本集中状态投影，不将serialize+后续raw当作完整快照合同。OUT：重写终端引擎、屏幕录制、主动滚 TUI 抓历史。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

<a id="research"></a>
## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。
- R-04：[xterm flow control](https://xtermjs.org/docs/guides/flowcontrol/)。
- R-05：[portable-pty 0.9/MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml)。
- K-03：[xterm resize Issue 6063](https://github.com/xtermjs/xterm.js/issues/6063)。
- K-04：[xterm 背压限制](https://xtermjs.org/docs/guides/flowcontrol/)。
- K-05：[portable-pty 历史 Windows 报告](https://github.com/wezterm/wezterm/issues/4784)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

<a id="route"></a>
## 有序执行路线

1. 先复现 K-03 的 scrollback+增高 rows 边界，记录现有依赖是否受影响；从现有 session tests 建立行为回归，再决定是否需要兼容修复。
2. 在 T-04 代次边界上给快照/增量赋连续水位，原始字节只进 headless 一次；设备回复与用户输入分路，多视图尺寸 owner 明确转移。
3. 将慢观察者丢弃限定在可重建帧；超限重取快照，输入/输出/查询队列均有上限，stop/exit 不被慢输出阻塞。
4. 固定机器、数据量、速率/慢视图条件，记录原始样本、峰值与控制完成；不给未经测量的绝对性能承诺。

<a id="acceptance"></a>
## 验收标准

- [ ] `AC-031`：尺寸 owner 明确；屏幕一致；设备回复一次；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-032`：无丢失/重复；UTF-8/ANSI 完整；失同步可重建展示；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-054`：缓存有界；其他控制可完成；慢视图独立重同步；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

<a id="verification"></a>
## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 解析一致性 | V-06 | pnpm exec vitest run src/modules/agent/services/terminal/session.test.ts src/modules/agent/services/terminal/sessions.e2e.test.ts；扩展分片/备用屏/reset/resize场景 | 快照加增量与完整解析结果一致，设备回复计数为一 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path> |
| 负载与失同步 | V-06/V-09 | 真实 PTY 连续输出+两个不同速度观察者，同时操作第二终端 stop/resize；记录缓存峰值 | 缓存有限，控制完成，慢视图可重同步；失败不丢原始字节 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/core/terminal/terminal-core.test.ts src/modules/agent/ui/terminal/terminal-scheduling.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：真实 Obsidian 两个叶子观察同一终端，进行中文/ANSI/备用屏输出、窗口尺寸变化和重附加；截图与屏幕序号一起保存。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

<a id="constraints"></a>
## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001、所绑定 AC、生产组件/布局/状态与可访问性自动化及相对原型的差异；真实宿主视口/主题/操作/截图按 Spec §11 由用户验收，不伪造截图。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

### 当前源闭包与唯一写入者

GP-019/Map20依据T-04已交付的代次/关闭接缝补精确范围：A拥有session*.ts/frames-screen与整笔paste+Enter的prompt-runner、agent-runtime及Controller.typeWhenReady失败分类窄接线、词典/说明；B拥有可见投影adapter、Presentation/fit/View及TabView资格与真实DOM测试；C拥有native/host wire、stdout/input有界队列和既有data/cookie/history响应的生产前预算。Root拥有正式记录、产物、预算与必要固定依赖版本。各实际writer仍须按Packet派单，范围声明不等于所有文件都需改。

GP-019/Map20仅补入workspace-service-stop-native.test.ts，由A修正旧fixture对已confirmed/retired SID重复stop导致finally短路；业务断言与生产WorkspaceService不变，独立清理保留失败。

先执行原K03再冻结实际DTO/profile。默认沿现有xterm/headless6.0.0、search0.16.0，只由Root在证据成立后精确pin manifest/lock的现版本；不默认升级或patch依赖。若必需patch、新路径或行为变化须先报Root回原owner。Controller限定输入结果分类，不改生命周期/Space；native data/cookies/agent_data仅生产前响应预算与准确失败，不改历史摄入/凭证归属；没有T08业务仲裁或T14消费者配置迁移。

## 未决事项与风险

K-03 是外部未关闭报告，不能当 HUHU 已有根因。若修复必须升依赖，先固定目标版本、许可和回归，由 Lead 更新依赖共享写集与受影响证据。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
