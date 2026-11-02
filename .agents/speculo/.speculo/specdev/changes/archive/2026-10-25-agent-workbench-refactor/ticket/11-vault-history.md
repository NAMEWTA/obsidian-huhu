---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-11"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-002"],"acceptance":["AC-033","AC-034","AC-035","AC-036","AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-11"
title: "本 Vault 历史摄入、检索与只读预览"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "历史摄入涉及跨 Vault 隐私边界、原生来源异常和分页；不能先读入全文再过滤。"
ready: true
risk: "high"
blocked_by: ["T-09"]
contract_ids: ["AC-033","AC-034","AC-035","AC-036","AC-061"]
owner: "codex:/root"
goal_plan: "GP-038"
map_revision: 39
expected_changes: ["<Path>src/modules/agent/services/history-store.ts</Path>","<Path>src/modules/agent/ui/history/SessionHistoryPanel.tsx</Path>","<Path>native/pty-server/src/agent_data.rs</Path>"]
writable_paths: ["<Path>src/modules/agent/core/history/**</Path>","<Path>src/modules/agent/platform/desktop/history/**</Path>","<Path>src/modules/agent/platform/history/**</Path>","<Path>src/modules/agent/platform/desktop/server/agent-data-client.ts</Path>","<Path>src/modules/agent/services/history-store*.ts</Path>","<Path>src/modules/agent/ui/history/**</Path>","<Path>src/modules/agent/services/control/history*.ts</Path>","<Path>src/modules/agent/services/control/commands.ts</Path>","<Path>src/modules/agent/services/control/commands.test.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/services/controller-history*.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/spaces/records.ts</Path>","<Path>src/modules/agent/services/spaces/records.test.ts</Path>","<Path>src/modules/agent/core/space/model.ts</Path>","<Path>src/shared/native/control-schema.json</Path>","<Path>src/shared/native/control-wire.generated.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>native/pty-server/src/agent_data.rs</Path>","<Path>native/pty-server/src/data.rs</Path>","<Path>native/pty-server/tests/**</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/core/history/**</Path>","<Path>src/modules/agent/platform/desktop/history/**</Path>","<Path>src/modules/agent/platform/history/**</Path>","<Path>src/modules/agent/platform/desktop/server/agent-data-client.ts</Path>","<Path>src/modules/agent/services/history-store*.ts</Path>","<Path>src/modules/agent/ui/history/**</Path>","<Path>src/modules/agent/services/control/history*.ts</Path>","<Path>src/modules/agent/services/control/commands.ts</Path>","<Path>src/modules/agent/services/control/commands.test.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/services/controller-history*.test.ts</Path>","<Path>src/modules/agent/services/spaces/space-service.ts</Path>","<Path>src/modules/agent/services/spaces/records.ts</Path>","<Path>src/modules/agent/services/spaces/records.test.ts</Path>","<Path>src/modules/agent/core/space/model.ts</Path>","<Path>src/shared/native/control-schema.json</Path>","<Path>src/shared/native/control-wire.generated.ts</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>native/pty-server/src/agent_data.rs</Path>","<Path>native/pty-server/src/data.rs</Path>","<Path>native/pty-server/tests/**</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/agent/core/history/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/history/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/history/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/desktop/server/agent-data-client.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/history-store*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/history/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/history*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/commands.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/control/commands.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller-history*.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/space-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/records.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/spaces/records.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/space/model.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-schema.json</Path> => lead:agent-workbench-integration","<Path>src/shared/native/control-wire.generated.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/agent_data.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/data.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/**</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-11：本 Vault 历史摄入、检索与只读预览

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

右侧只列当前 Vault 的全部 Space/归档/可归属记录；筛选和预览稳定，坏来源局部降级，外库正文不污染索引。

已有 HistoryStore、NativeHistory、native agent_data 与 account/vault scope；可复用解析器但要把归属判定前移。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：Vault 投影、标题/元数据筛选、稳定分页、来源状态、只读预览与 CLI history list/preview。REUSE：原生解析与可重建 SQLite 索引。OUT：全账号全文摄入、删除原生对话、预览创建 Session。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 在摄入前按明确 HUHU 绑定、可验证 Vault 内真实 cwd、用户显式来源授权判断；库外新 Session 只凭自己的绑定归属。
2. 让索引只保存准入记录并可重建；自有标题/收藏/标注/来源独立，来源轮转或损坏不删除自有事实。
3. 完成分页/筛选/取消旧请求和右侧只读预览；记录正文能力、截断、部分失败与重试。
4. 以混合账号 fixtures 验证外 Vault/库外路径、路径编码、同 ID 不同来源，确认只读不启动 native PTY。

## 验收标准

- [ ] `AC-033`：默认本 Vault 全 Space；可筛选；读历史不启动 PTY；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-034`：不把无归属正文摄入当前库；授权库外 Session 依绑定归属；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-035`：元数据/标注保留；准确缺失/部分/不支持；其他来源继续可用；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-036`：稳定分页或明确刷新；不静默重行漏行；结果与筛选一致；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 边界/分页 | V-04/V-07 | pnpm exec vitest run src/modules/agent/platform/desktop/history src/modules/agent/services/history-store.test.ts；native agent_data fixtures | 摄入前拒外库，筛选无静默漏重，缓存重建保留标注 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path> |
| 来源错误与 UI | V-04/V-08 | 删除/轮转/损坏一个 fixture 来源，同时预览其他来源；真实宿主长列表/筛选/刷新 | 可用记录继续显示，缺失正文准确标记，预览零启动 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/platform/desktop/history/scope.test.ts src/modules/agent/platform/desktop/server/native-history.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：真实 Obsidian 使用隔离来源目录同时放两个 Vault 历史，打开当前 Vault 抽屉并搜索、翻页、预览、切筛选；保存摄入清单和截图。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-002、所绑定 AC、生产组件/布局/状态与可访问性自动化及相对原型的差异；真实宿主视口/主题/操作/截图按 Spec §11 由用户验收，不伪造截图。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

外部 Provider 格式变化只使对应解析器降级，不能无归属全文兜底。T-15 负责旧 account 标注的隔离迁移，本票不得静默丢弃。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
