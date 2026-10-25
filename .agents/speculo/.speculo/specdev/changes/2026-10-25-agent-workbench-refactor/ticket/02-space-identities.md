---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-02"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001"],"acceptance":["AC-001","AC-002","AC-003","AC-004","AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-02"
title: "可持久化的 Space、目录授权与单写入者"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "新增持久身份、目录授权及物理 Vault 单 writer，触及数据完整性和安全边界。"
ready: true
risk: "high"
blocked_by: ["T-01"]
contract_ids: ["AC-001","AC-002","AC-003","AC-004","AC-046","AC-053","AC-061"]
owner: "unassigned"
expected_changes: ["<Path>src/modules/agent/services/workspace-store.ts</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>"]
writable_paths: ["<Path>src/modules/agent/core/space/**</Path>","<Path>src/modules/agent/services/spaces/**</Path>","<Path>src/modules/agent/platform/desktop/spaces/**</Path>","<Path>src/modules/agent/services/workspace-store*.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/ui/sidebar/**</Path>","<Path>src/modules/agent/ui/create/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>src/shared/storage/vault-identity*.ts</Path>","<Path>docs/data.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>","<Path>src/shared/storage/vault-identity.ts</Path>"]
shared_paths: ["<Path>src/modules/agent/services/workspace-store*.ts</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/ui/sidebar/**</Path>","<Path>src/modules/agent/ui/create/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>docs/data.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/agent/services/workspace-store*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/controller.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/sidebar/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/create/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>docs/data.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-02：可持久化的 Space、目录授权与单写入者

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

用户能创建/重命名空 Space，两个同 cwd 的 Space 独立；库外目录必须明确选择，保存失败不产生不可追踪进程。

workspace-store 当前保存 version1 的 tabs/groups，没有 Space；已有 JsonStore、vault identity、规范 cwd 与目录选择可复用。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-001、AC-002、AC-003、AC-004、AC-046、AC-053；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：Space/Session 记录基础、目录绑定、唯一 writer 与创建 UI。REUSE：JsonStore/设备身份/现有目录选择。OUT：旧数据覆盖迁移（T-15）、任意路径自动授权。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 先固定 Space/Session 最小 schema 和物理 owner 校验；测试同 cwd、同名、复制逻辑 ID、只读目录、损坏文件。
2. Expand 新版本存储与旧 layout 并存，只在隔离新格式库启用；持久提交成功后才能发启动请求，禁止吞掉写失败。
3. 在 PAGE-001 实现空 Space、新建/重命名与目录选择；Vault 内规范相对路径可用，外部 grant 必须由本机选择确认。
4. 第二实例先验证 owner 再写；符号链接/junction 改指向、设备/物理目录变化撤销旧绑定；保留冲突双方及诊断。

## 验收标准

- [ ] `AC-001`：记录存在；无 PTY/Agent；可重命名且 ID 不变；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-002`：ID、布局、邮箱与归属独立；不按目录合并；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-003`：使用该目录，历史仍归当前 Vault/Space；目录被替换/撤销时拒绝；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-004`：GUI 引导选择；CLI 给缺目标/歧义结果；不猜 Space；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-046`：不返回成功；不先启动关联新进程；保留旧数据和诊断；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-053`：唯一活动 writer 或明确冲突；不互盖 locator/记录；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 身份与保存 | V-01/V-07 | pnpm exec vitest run src/modules/agent/services/workspace-store.test.ts src/shared/storage/vault-identity.test.ts；新增 Space repository 故障用例 | ID 不按 cwd 合并，失败不启动，旧有效数据保留 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path> |
| 授权与竞争 | V-04/V-07 | 两个宿主实例打开同一物理测试 Vault；替换授权 symlink/junction；在 GUI 取消授权 | 只有一个 writer；未授权目录不运行；取消无写入 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/services/workspace-store.test.ts src/modules/agent/core/workspace/ops.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：真实宿主建立空 Space、两个同 cwd Space 和授权库外 Space，关闭重开后身份保持；以第二实例验证写冲突，记录真实目录与进程数。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001、所绑定 AC、真实视口/主题/操作/截图和与原型的差异。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

新 schema 与 layout 旧 writer 并存阶段必须隔离目标文件；上线旧数据由 T-15 显式迁移。owner 锁异常只核对当前任务实例，不因锁旧就删除其他实例的锁。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
