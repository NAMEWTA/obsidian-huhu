---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/14-consumer-compatibility.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/14-consumer-compatibility.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-14"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-agent-workbench-refactor"
id: "T-14"
title: "既有消费者兼容与旧控制接线收缩"
status: "ready"
kind: "refactor"
planning_depth: "deep"
planning_depth_reason: "公开 Agent API 被 Home/Browser/Shell/自动化调用，移除旧控制器接线可能降级完整答案、取消或移动端能力。"
ready: true
risk: "high"
blocked_by: ["T-12","T-13","T-10"]
contract_ids: ["AC-042","AC-043","AC-044","AC-045"]
owner: "unassigned"
expected_changes: ["<Path>src/modules/agent/api.ts</Path>","<Path>src/modules/agent/services/prompt-runner.ts</Path>","<Path>src/modules/agent/services/prompt-port.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/api.ts</Path>","<Path>src/modules/agent/module*.ts</Path>","<Path>src/modules/agent/services/prompt*.ts</Path>","<Path>src/modules/agent/services/session-material*.ts</Path>","<Path>src/modules/agent/services/agent-runtime*.ts</Path>","<Path>src/modules/agent/services/skills*.ts</Path>","<Path>src/modules/agent/services/quick-commands-port.ts</Path>","<Path>src/modules/agent/services/workbench.ts</Path>","<Path>src/shared/agent-*.ts</Path>","<Path>src/modules/browser/services/host*.ts</Path>","<Path>src/modules/home/module.ts</Path>","<Path>src/modules/home/services/**</Path>","<Path>src/modules/automations/services/**</Path>","<Path>src/app/workbench/compose-workbench.ts</Path>","<Path>test/automations/calendar-delivery.test.ts</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/automation.md</Path>","<Path>docs/browser.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/api.ts</Path>","<Path>src/modules/agent/module*.ts</Path>","<Path>src/modules/browser/services/host*.ts</Path>","<Path>src/app/workbench/compose-workbench.ts</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/browser.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/agent/api.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/browser/services/host*.ts</Path> => lead:agent-workbench-integration","<Path>src/app/workbench/compose-workbench.ts</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>docs/browser.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-14：既有消费者兼容与旧控制接线收缩

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

所有既有消费者使用新运行/宿主接线继续工作：原生完整答案、existing 只粘贴、技能只读与移动端轻量入口均保持。

现有 AGENT_PROMPT_RUNNER、AGENT_DISPATCH、AGENT_SESSIONS、directory/skills/quick-commands/usage 与自动化 invocation 有明确测试。前序票保留旧适配，本票迁完并证明旧路由可收缩。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-042、AC-043、AC-044、AC-045；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：迁移真实消费者、保留原语义、移除已无调用的兼容接线与同步说明。REUSE：原生 result parser/自动化 ledger/轻量技能。OUT：用终端屏幕替代结果、迁走账号/技能或删旧风险测试。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 枚举每个公开 serviceKey 的真实调用方与两端，建立前后观察对照；缺原生答案、取消、执行期限、租约撤销作为必要负例。
2. 逐消费者迁移到新端口，每批保持旧 API 可用和绿色；Browser 素材/自动化 existing 只完整粘贴一次、不 Enter。
3. 核对 Home/Shell 只读列表/标题/用量、移动端技能路径没有 desktop/PTY 加载。
4. 扫描旧 native/browser/controller 路由调用点为零且回归通过后收缩；保存旧测试风险承接与文档更新，接口不再双写。

## 验收标准

- [ ] `AC-042`：一次粘贴、不回车；就绪超时/会话失效准确失败；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-043`：原生完整答案及原失败语义保留；不以屏幕文本冒充答案；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-044`：原服务消费者可用；existing 投递仍只粘贴；只读不启动模型；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-045`：轻量技能继续可用；无 Node/PTY/桌面控制器加载；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 业务结果与投递 | V-03/V-05 | pnpm exec vitest run src/modules/agent/services/prompt-runner.test.ts src/modules/agent/services/prompt-port.test.ts src/modules/agent/services/session-material.test.ts test/automations/calendar-delivery.test.ts；pnpm run test:safety-regressions | 完整原生答案与旧失败/取消语义保持，existing 不回车，invocation 去重不变 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14.md</Path> |
| 轻量入口与收缩 | V-05 | pnpm exec vitest run src/modules/agent/module.test.ts src/modules/agent/services/skills.test.ts；pnpm test:architecture；rg 查旧路由真实调用 | 移动端不加载 desktop；旧接线消费者为零后才删除 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/services/prompt-runner.test.ts src/modules/agent/services/prompt-port.test.ts test/automations/calendar-delivery.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：真实宿主从 Home 快捷命令、Browser 素材、自动化调用各走一遍；在测试移动环境核对轻量技能，并记录真实调用方结果而不只检查 mock 调用次数。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

## 未决事项与风险

任何消费者原行为回归失败都先保留兼容层，不把迁移未完归为新功能限制。若删测试需逐条指向承接风险的新用例，禁止静默快照更新。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
