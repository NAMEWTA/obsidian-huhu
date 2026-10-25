---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/01-native-owner.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/01-native-owner.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-01"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-agent-workbench-refactor"
id: "T-01"
title: "共享原生宿主与按需能力租约"
status: "ready"
kind: "refactor"
planning_depth: "deep"
planning_depth_reason: "PTY、历史和 Cookie 共用 helper，当前 Agent 服务 owner 会影响 Browser；涉及跨模块生命周期与启动边界。"
ready: true
risk: "high"
blocked_by: []
contract_ids: ["AC-057","AC-059"]
owner: "unassigned"
expected_changes: ["<Path>src/modules/agent/services/terminal/sessions.ts</Path>","<Path>src/modules/agent/platform/desktop/pty/helper.ts</Path>","<Path>src/modules/browser/module.ts</Path>"]
writable_paths: ["<Path>src/host/desktop/native/**</Path>","<Path>src/shared/native/**</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/main.ts</Path>","<Path>src/modules/agent/platform/desktop/pty/helper*.ts</Path>","<Path>src/modules/agent/platform/desktop/server/*client.ts</Path>","<Path>src/modules/agent/services/terminal/sessions*.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/api.ts</Path>","<Path>src/modules/agent/module*.ts</Path>","<Path>src/modules/browser/module.ts</Path>","<Path>src/modules/browser/services/host*.ts</Path>","<Path>docs/architecture.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/host/desktop/native/**</Path>","<Path>src/modules/agent/platform/desktop/server/*client.ts</Path>","<Path>src/modules/agent/services/terminal/sessions*.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/api.ts</Path>","<Path>src/modules/agent/module*.ts</Path>","<Path>src/modules/browser/module.ts</Path>","<Path>src/modules/browser/services/host*.ts</Path>","<Path>docs/architecture.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/host/desktop/native/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/server/*client.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/sessions*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/api.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/browser/module.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/browser/services/host*.ts</Path> => lead:agent-workbench-integration","<Path>docs/architecture.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-01：共享原生宿主与按需能力租约

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

关闭 Agent 或最后一个终端时，仍在用 native Cookie/历史能力的消费者能完成；没有使用相关能力时不启动 helper、扫描或下载。

现有 TerminalSessions.ensureHelper 拥有 PtyHelper；Browser.module 通过 Agent 的 NATIVE_HELPER_SQLITE 获取 Cookie reader，AgentController 又集中装配历史与终端。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-057、AC-059；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：抽取懒加载 native owner、租约及关闭/崩溃分发，并保持现有代理端口兼容。REUSE：现有 helper 帧、binary 验证、ServiceAccess 与 lifetime。OUT：新增 daemon、搬账号或新建业务 DB。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。
- R-05：[portable-pty 0.9/MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 先记录 PTY/history/Cookie 与模块启停的现有调用链，补正常、关闭竞争和未使用的观察接缝；移动前跑原 helper/native 测试。
2. Expand：在 host/desktop 下建立宿主级资源 owner，纯端口放 shared，app/模块负责注入；host 不反向导入 agent/app。保留旧服务键的兼容适配。
3. 让 Agent 与 Browser 分别 acquire/release 能力；关闭接纳门、处理迟到启动、向所有 owner 报告 native crash；最后租约释放才退出。
4. 用真实 Cookie 请求与 PTY 并行证明停 Agent 不误杀 Browser，验证移动端/非 Agent 页面不触达 desktop 或 helper；同步架构说明。

## 验收标准

- [ ] `AC-057`：Browser 请求继续；全部 owner 释放后 helper 才结束；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-059`：无扫描/下载/Provider/PTY/活动 gateway 副作用；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 共享使用与退出 | V-05/V-06 | pnpm exec vitest run src/modules/agent/module.test.ts src/modules/browser/services/host.test.ts；新增 host/native 租约集成用例 | Cookie 请求完成，只有所有 owner 释放后进程退出 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md</Path> |
| 失败与懒加载 | V-05 | 注入 helper crash、acquire/disable 竞争；pnpm test:architecture；pnpm run check:bundle | 失败广播准确，无迟到泄漏；未使用无扫描/下载/启动 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/module.test.ts src/modules/browser/services/host.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：真实 Obsidian 一次性库同时开终端和实际 Cookie/native 请求，停用 Agent，核对 Browser 消费者的已接纳请求完成、租约仍有效且 helper 未被误杀；释放全部租约并退出宿主后检查 helper 子进程。无 Space/Agent-off 时完整网页入口、标签与恢复由 T-13/AC-041 验收，不作为本票启动或完成的前置。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

## 未决事项与风险

保留旧 adapter 到 T-14 收缩。失败时停止新 owner 接纳并保留错误，不重新启动旧/新两个 writer。当前桌面适配移动可能使 API import 越界，必须先查 architecture 矩阵。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
