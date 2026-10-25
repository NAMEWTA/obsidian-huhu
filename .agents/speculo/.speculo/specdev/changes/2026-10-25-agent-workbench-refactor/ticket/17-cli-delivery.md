---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/17-cli-delivery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/17-cli-delivery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-17"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-agent-workbench-refactor"
id: "T-17"
title: "CLI 资产、配套 Skill 与交付一致性"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "新增 CLI 二进制及帮助/Skill 公开面，涉及发布资产可信性、版本兼容与来源许可。"
ready: true
risk: "high"
blocked_by: ["T-16"]
contract_ids: ["AC-019","AC-062","AC-064"]
owner: "unassigned"
expected_changes: ["<Path>.github/workflows/terminal-build.yml</Path>","<Path>src/modules/agent/platform/desktop/pty/binary-download.test.ts</Path>","<Path>scripts/third-party-notices.mjs</Path>"]
writable_paths: ["<Path>native/pty-server/Cargo.toml</Path>","<Path>native/pty-server/Cargo.lock</Path>","<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>src/modules/agent/platform/desktop/pty/binary*.ts</Path>","<Path>src/modules/agent/platform/desktop/control/**</Path>","<Path>src/modules/agent/core/control/**</Path>","<Path>src/modules/agent/services/skill-manager*.ts</Path>","<Path>src/modules/agent/platform/desktop/skills/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>.github/workflows/terminal-build.yml</Path>","<Path>scripts/verify-release-artifacts.mjs</Path>","<Path>scripts/verify-pty-helper.mjs</Path>","<Path>scripts/third-party-notices.mjs</Path>","<Path>test/release/**</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>NOTICE</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>docs/third-party/**</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>native/pty-server/Cargo.toml</Path>","<Path>native/pty-server/Cargo.lock</Path>","<Path>native/pty-server/src/bin/huhu.rs</Path>","<Path>src/modules/agent/platform/desktop/control/**</Path>","<Path>src/modules/agent/core/control/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>.github/workflows/terminal-build.yml</Path>","<Path>scripts/verify-pty-helper.mjs</Path>","<Path>test/release/**</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>native/pty-server/Cargo.toml</Path> => lead:agent-workbench-integration","<Path>native/pty-server/Cargo.lock</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/bin/huhu.rs</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>.github/workflows/terminal-build.yml</Path> => lead:agent-workbench-integration","<Path>scripts/verify-pty-helper.mjs</Path> => lead:agent-workbench-integration","<Path>test/release/**</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-17：CLI 资产、配套 Skill 与交付一致性

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

每个正式平台可获得匹配的 helper/CLI；帮助、schema、Skill 示例对应真实功能，错版本/无效摘要不执行，源码与产物及声明一致。

已有 terminal-build 五平台、binary-download 摘要校验、verify-release-artifacts 与 third-party notices；目前没有 HUHU 终端控制 CLI/配套 Skill 发布资产。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-019、AC-062、AC-064；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：同批构建 CLI、兼容表、安装/诊断、示例契约、明确触发的产品使用 Skill、来源与生成物一致。REUSE：现有 CI/下载验证/技能管理。OUT：本票自动打 tag/升版本/推送/发布，以及无请求写入用户账号技能目录。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。
- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。
- R-04：[xterm flow control](https://xtermjs.org/docs/guides/flowcontrol/)。
- R-05：[portable-pty 0.9/MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml)。
- K-07：[Herdr 根许可与逐文件边界](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/LICENSE)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 将 T-07 CLI 与 helper 纳入既有五平台资产/校验流程，公布插件/helper/CLI 协议兼容关系；无效摘要或错 major 在执行前拒绝。
2. 使用真实发行语法生成/校验 help/schema 和安装诊断；stdin 长正文、错误输出、离线复用、旧资产混配逐项测试。
3. 提供随插件打包的 HUHU 控制 Skill 资源，仅明确操作 HUHU 终端时触发；示例逐个执行，说明 wait 不等于任务成功、blocked 需人、超时不重发。
4. 逐文件登记实际改编来源、commit/许可/修改；保留署名，生成 NOTICE 附属声明并检查相似度；只留待发布资产，不执行远程交付。

## 验收标准

- [ ] `AC-019`：命令与发行版本一致；stdin 长正文可用；错误分类不依赖中文文案；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-062`：延续摘要校验；无效二进制不执行；明确兼容错误；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-064`：用户文案 en/zh；旧示例被替换；改编来源许可可追踪；无 GPL 终端代码；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 资产与兼容 | V-06/V-10/V-11 | pnpm exec vitest run src/modules/agent/platform/desktop/pty/binary.test.ts src/modules/agent/platform/desktop/pty/binary-download.test.ts test/release/release-artifacts.test.ts；扩展 CLI 资产 fixtures | 正确摘要可用，污染/缺失/错版本拒绝，无下载后执行未知资产 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17.md</Path> |
| 文档/Skill/来源 | V-02/V-11 | 逐个运行产品 Skill 示例；pnpm run build；pnpm run lint；pnpm test:i18n；pnpm test:docs；pnpm run check:notices；按实际参考运行 similarity 报告 | 源码产物帮助一致，双语完整，来源可追踪，无 GPL/未知来源代码 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run test/release/release-artifacts.test.ts src/modules/agent/platform/desktop/skills/skill-fs.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：在隔离安装目录用本票实际构建的 helper/CLI 执行完整能力发现与示例；五平台真实 Provider/宿主任务由 T-18 验收，不能用 help 成功替代。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

## 未决事项与风险

本票不获得发布权限。没有源码改编时明确“借鉴机制、未复制”；有改编才登记实际映射。新增陌生依赖先比较活跃项目，不为使构建通过关闭 notices。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
