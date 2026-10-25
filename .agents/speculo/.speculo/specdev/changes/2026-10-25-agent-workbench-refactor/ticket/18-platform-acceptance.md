---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-18"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001","PAGE-002","PAGE-003","PAGE-004"],"acceptance":["AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-18"
title: "五平台真实主链与全页面验收"
status: "ready"
kind: "operations"
planning_depth: "deep"
planning_depth_reason: "正式支持矩阵与重构汇合，必须汇总固定输入上的真实宿主/Provider/恢复证据，交叉编译不够。"
ready: true
risk: "high"
blocked_by: ["T-17"]
contract_ids: ["AC-061","AC-063"]
owner: "unassigned"
expected_changes: ["<Path>.github/workflows/terminal-build.yml</Path>","<Path>scripts/obsidian-acceptance/terminal-reliability.mjs</Path>","<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path>"]
writable_paths: ["<Path>.github/workflows/terminal-build.yml</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-*.mjs</Path>","<Path>scripts/obsidian-acceptance/terminal-reliability.mjs</Path>","<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path>","<Path>scripts/verify-pty-helper.mjs</Path>","<Path>test/release/**</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>docs/data.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>.github/workflows/terminal-build.yml</Path>","<Path>scripts/obsidian-acceptance/agent-workbench-*.mjs</Path>","<Path>scripts/verify-pty-helper.mjs</Path>","<Path>test/release/**</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>docs/data.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>.github/workflows/terminal-build.yml</Path> => lead:agent-workbench-integration","<Path>scripts/obsidian-acceptance/agent-workbench-*.mjs</Path> => lead:agent-workbench-integration","<Path>scripts/verify-pty-helper.mjs</Path> => lead:agent-workbench-integration","<Path>test/release/**</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>docs/data.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-18：五平台真实主链与全页面验收

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

同一候选源码/资产在 Windows x64、macOS x64/arm64、Linux x64/arm64 各有实际主链证据，四个页面的生产交互与已批准 A 一致。

terminal-build 已用五种原生 runner 测 helper；现有 terminal-reliability 偏 Windows，workbench-probe 是可扩展宿主先例；缺新的全平台真实 Agent 场景。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-061、AC-063；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：跨平台验收脚本/运行说明、实际五组合结果、完整 UI 状态与重构集成回归。REUSE：各票已经有效的故障/单元证据，只重验变更或集成影响。OUT：以 mock/编译代表真实能力、本轮自动发布、扩大到 iOS/Android 原生 PTY。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-04：[xterm flow control](https://xtermjs.org/docs/guides/flowcontrol/)。
- R-05：[portable-pty 0.9/MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml)。
- K-01：[Herdr 状态检测变更](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。
- K-02：[Herdr 输入与 Windows 修复](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。
- K-03：[xterm resize Issue 6063](https://github.com/xtermjs/xterm.js/issues/6063)。
- K-04：[xterm 背压限制](https://xtermjs.org/docs/guides/flowcontrol/)。
- K-05：[portable-pty 历史 Windows 报告](https://github.com/wezterm/wezterm/issues/4784)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 冻结源码/head或工作副本摘要、构建产物、配置、Provider 版本及一次性库输入；在既有五 runner 矩阵跑 native/CLI 合同，不伪造 E2E。
2. 按每个 OS/架构实际运行宿主：两个 Space、后台 A/B、跨 Space prompt/wait/read、人工审批、关面板重附加、历史继续/冲突、网页独立、退出/重开。
3. 汇总 Codex/Claude 两种真实 CLI 和六入口兼容；中文 IME/多行、非 ASCII 目录、socket/pipe 权限、进程树回收与复制 Vault 分别记录。
4. 覆盖 DESIGN 四页全部状态、明暗/宽窄/键盘/200%/reduced motion，并复核迁移备份与压力集成；缺任一正式组合或 required 场景保持待验收，形成准确阻塞。

## 验收标准

- [ ] `AC-061`：无无意横向溢出/遮挡；焦点可见与返回；状态非仅颜色；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-063`：每组合有实际端到端证据；缺项不宣称正式通过；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 五平台证据 | V-03/V-06/V-10 | 按 terminal-build.yml 五组合原生运行 verify-pty-helper 与新 CLI 测试；使用隔离 Obsidian/测试账号执行上述场景 | 每组合记录 OS/arch、版本、资产摘要、场景结果和退出恢复；缺项不宣称通过 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path> |
| 全页面与集成 | V-08/V-09/V-11 | 扩展 scripts/obsidian-acceptance/agent-workbench-*.mjs，在固定候选执行；按 testing 选择表补必要全量/构建/架构/文档检查 | 生产 Design Conformance 与 64 AC 证据可回读，真实故障和来源限制未被 mock 掩盖 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/services/terminal/sessions.e2e.test.ts test/release/release-artifacts.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：required：五种 OS/架构逐一实际执行；CI 没有可运行 Obsidian/Provider 的组合可用明确记录的真实机器补齐，不能把“计划安排”当验收结果。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001 / PAGE-002 / PAGE-003 / PAGE-004、所绑定 AC、真实视口/主题/操作/截图和与原型的差异。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

本轮 T 不拥有五台机器的运行证据；Ready 仅代表计划合同明确。I 开始时核验环境/账号及测试权限；缺失时该验收分支 blocked，继续独立已授权工作，不能降低五平台完成门。实际发布由后续授权的交付入口负责。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
