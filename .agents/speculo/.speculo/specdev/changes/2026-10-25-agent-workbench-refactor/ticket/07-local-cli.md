---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-07"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-agent-workbench-refactor"
id: "T-07"
title: "本机 CLI、精确寻址与机器协议"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "新增公开控制协议、Unix/Windows 本机访问边界与 Rust→TS→Rust 回入。"
ready: true
risk: "high"
blocked_by: ["T-06"]
contract_ids: ["AC-010","AC-011","AC-012","AC-052","AC-055"]
owner: "unassigned"
expected_changes: ["<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/frame.rs</Path>","<Path>src/modules/agent/module.ts</Path>"]
writable_paths: ["<Path>native/pty-server/src/control/**</Path>","<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>native/pty-server/src/lib.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/frame.rs</Path>","<Path>native/pty-server/Cargo.toml</Path>","<Path>native/pty-server/Cargo.lock</Path>","<Path>native/pty-server/tests/control*.rs</Path>","<Path>src/modules/agent/core/control/**</Path>","<Path>src/modules/agent/platform/desktop/control/**</Path>","<Path>src/modules/agent/services/control/**</Path>","<Path>src/host/desktop/native/**</Path>","<Path>src/modules/agent/module.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>native/pty-server/src/main.rs</Path>","<Path>native/pty-server/src/frame.rs</Path>","<Path>native/pty-server/Cargo.toml</Path>","<Path>native/pty-server/Cargo.lock</Path>","<Path>native/pty-server/tests/control*.rs</Path>","<Path>src/modules/agent/core/control/**</Path>","<Path>src/modules/agent/platform/desktop/control/**</Path>","<Path>src/modules/agent/services/control/**</Path>","<Path>src/host/desktop/native/**</Path>","<Path>src/modules/agent/module.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>native/pty-server/src/bin/huhu.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/main.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/frame.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/Cargo.toml</Path> => lead:agent-workbench-integration","<Path>native/pty-server/Cargo.lock</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control*.rs</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/**</Path> => lead:agent-workbench-integration","<Path>src/host/desktop/native/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-07：本机 CLI、精确寻址与机器协议

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

外部 huhu CLI 能准确发现当前实例和目标；默认当前 Space、明确同 Vault 跨 Space，跨 Vault/过期运行拒绝；慢扫描不堵控制。

目前 helper 只有 stdio 帧与现有 cookie/history 请求；需增加受保护本机控制入口，并通过同一 TS 用例调度业务。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-010、AC-011、AC-012、AC-052、AC-055；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：implementation-contracts 的 v1 语法/JSON/schema、独立 Rust CLI、发现/能力/诊断、路由、取消、请求关联。REUSE：现有 helper/帧与受保护本机路径设施。OUT：公网 HTTP、自动唤醒模块、自建角色平台。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。
- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。
- K-01：[Herdr 状态检测变更](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 先把计划 v1 字段/错误/命令转换为可编译并契约测试的单一描述，产出 TS/Rust 两端校验；尚未实现能力显式 unavailable。
2. 构建独立 huhu CLI 与 helper 通道；Unix socket 权限/Windows pipe ACL 限当前用户，令牌/locator 不进入共享备份或敏感日志。
3. 绑定物理 Vault/device/instance，复用 T-02 单 owner；缺目标/同名/跨 Vault/过期 endpoint 与协议不匹配都在副作用前拒绝。
4. 分离接收分派与业务 await，允许 native→TS→native 回入；并行慢 history 与 stop，CLI 退出只取消自己的请求/等待。

## 验收标准

- [ ] `AC-010`：协议与 Vault/物理绑定一致；失效或错实例明确拒绝；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-011`：默认范围当前 Space；明确目标可跨 Space；结果带原归属；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-012`：无越界效果；错误说明目标不属当前实例或已失效；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-052`：不误连接原实例；业务身份可恢复；物理绑定与授权可核对；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-055`：无全局读循环/锁死锁；控制和退出不被慢扫描挡住；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| CLI 黑盒契约 | V-02/V-06 | pnpm run check:native；新增 native/pty-server/tests/control.rs：启动隔离 helper+TS harness，执行 huhu version/doctor/schema/目标查询 | stdout/stderr/退出码和 envelope 一致；跨 Vault/旧 runtime 无效果 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path> |
| 访问与回入 | V-02/V-07 | 本机 socket/pipe 权限检查、复制 Vault/过期 locator、同名目标、慢扫描期间递归回入和断线 | 错误可分类、无死锁、不覆盖其他实例或自动启用 Agent | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run native/pty-server/tests/stdio.rs src/modules/agent/platform/desktop/server/serial-queue.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：真实宿主打开工作台后从第二个终端调用本机 CLI，默认查 Space A，明确寻址 Space B；复制测试 Vault 后拒绝旧 endpoint。Windows ACL 由 T-18 实机补齐。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

## 未决事项与风险

本机同用户 IPC 不是恶意同账户进程沙箱；路由环境变量不能变认证。Windows 高权限/普通权限差异需准确诊断，不能为绕过错误放开 ACL。未发行 CLI 资产只能用本票构建结果测试。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
