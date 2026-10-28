---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-16"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-004"],"acceptance":["AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-16"
title: "HUHU 业务备份、导入预检与恢复"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "导入会改变业务记录，涉及版本/摘要/身份碰撞和可恢复切换，不能只实现导出按钮。"
ready: true
risk: "high"
blocked_by: ["T-15"]
contract_ids: ["AC-050","AC-051","AC-061"]
owner: "unassigned"
expected_changes: ["<Path>src/modules/agent/ui/settings-page.tsx</Path>"]
writable_paths: ["<Path>src/modules/agent/core/backup/**</Path>", "<Path>src/modules/agent/services/backup/**</Path>", "<Path>src/modules/agent/platform/desktop/backup/**</Path>", "<Path>src/modules/agent/ui/settings/**</Path>", "<Path>src/modules/agent/ui/settings-page.tsx</Path>", "<Path>src/modules/agent/i18n.ts</Path>", "<Path>test/agent-backup/**</Path>", "<Path>docs/data.md</Path>", "<Path>docs/agent-workbench.md</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/shared/storage/recovery-contracts.ts</Path>", "<Path>src/shared/storage/recovery-contracts.test.ts</Path>", "<Path>src/shared/storage/recovery-transaction.ts</Path>", "<Path>src/shared/storage/recovery-transaction.test.ts</Path>", "<Path>src/app/recovery.ts</Path>", "<Path>src/app/recovery.test.ts</Path>", "<Path>src/app/main.ts</Path>", "<Path>src/app/settings/runtime.ts</Path>", "<Path>src/app/settings/runtime.test.ts</Path>", "<Path>src/shared/settings/store.ts</Path>", "<Path>src/shared/settings/store.test.ts</Path>", "<Path>src/modules/agent/api.ts</Path>", "<Path>src/modules/agent/module.ts</Path>", "<Path>src/modules/agent/platform/history/service.ts</Path>", "<Path>src/modules/agent/platform/history/service.test.ts</Path>", "<Path>src/modules/agent/services/agent-runtime.ts</Path>", "<Path>src/modules/agent/services/agent-runtime.test.ts</Path>", "<Path>src/modules/agent/services/stats-service.ts</Path>", "<Path>src/modules/agent/services/stats-service.test.ts</Path>", "<Path>src/modules/agent/platform/stats-store.ts</Path>", "<Path>src/modules/agent/platform/stats-store.test.ts</Path>", "<Path>src/shell/shared-workspace/**</Path>", "<Path>src/modules/automations/api.ts</Path>", "<Path>src/modules/automations/module.ts</Path>", "<Path>src/modules/automations/services/runtime.ts</Path>", "<Path>src/modules/automations/core/service.ts</Path>", "<Path>src/modules/automations/core/invocations.test.ts</Path>", "<Path>src/modules/automations/automation.test.ts</Path>", "<Path>src/modules/automations/core/backup.test.ts</Path>", "<Path>src/modules/automations/core/documents.ts</Path>", "<Path>src/modules/automations/core/documents.test.ts</Path>", "<Path>src/modules/automations/platform/definitions.ts</Path>", "<Path>src/modules/automations/platform/definitions.test.ts</Path>", "<Path>src/modules/notifications/api.ts</Path>", "<Path>src/modules/notifications/module.ts</Path>", "<Path>src/modules/notifications/core/service.ts</Path>", "<Path>src/modules/notifications/core/service.test.ts</Path>", "<Path>scripts/bundle-budget.json</Path>", "<Path>src/shared/i18n/lazy/backup.ts</Path>", "<Path>src/modules/sync/core/excludes.ts</Path>", "<Path>src/modules/sync/core/*.test.ts</Path>", "<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16-budget-attribution.json</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>","<Path>src/shared/storage/ports.ts</Path>","<Path>src/host/obsidian/storage/private-storage.ts</Path>"]
shared_paths: ["<Path>src/modules/agent/ui/settings/**</Path>","<Path>src/modules/agent/ui/settings-page.tsx</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>docs/data.md</Path>","<Path>docs/agent-workbench.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>src/shared/storage/recovery-contracts.ts</Path>","<Path>src/shared/storage/recovery-contracts.test.ts</Path>","<Path>src/shared/storage/recovery-transaction.ts</Path>","<Path>src/shared/storage/recovery-transaction.test.ts</Path>","<Path>src/app/recovery.ts</Path>","<Path>src/app/recovery.test.ts</Path>","<Path>src/app/main.ts</Path>","<Path>src/app/settings/runtime.ts</Path>","<Path>src/app/settings/runtime.test.ts</Path>","<Path>src/shared/settings/store.ts</Path>","<Path>src/shared/settings/store.test.ts</Path>","<Path>src/modules/agent/api.ts</Path>","<Path>src/modules/agent/module.ts</Path>","<Path>src/modules/agent/platform/history/service.ts</Path>","<Path>src/modules/agent/platform/history/service.test.ts</Path>","<Path>src/modules/agent/services/agent-runtime.ts</Path>","<Path>src/modules/agent/services/agent-runtime.test.ts</Path>","<Path>src/modules/agent/services/stats-service.ts</Path>","<Path>src/modules/agent/services/stats-service.test.ts</Path>","<Path>src/modules/agent/platform/stats-store.ts</Path>","<Path>src/modules/agent/platform/stats-store.test.ts</Path>","<Path>src/shell/shared-workspace/**</Path>"]
shared_path_owners: ["<Path>src/modules/agent/ui/settings/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/settings-page.tsx</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>docs/data.md</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration","<Path>src/shared/storage/recovery-contracts.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/storage/recovery-contracts.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/storage/recovery-transaction.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/storage/recovery-transaction.test.ts</Path> => lead:agent-workbench-integration","<Path>src/app/recovery.ts</Path> => lead:agent-workbench-integration","<Path>src/app/recovery.test.ts</Path> => lead:agent-workbench-integration","<Path>src/app/main.ts</Path> => lead:agent-workbench-integration","<Path>src/app/settings/runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/app/settings/runtime.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/settings/store.ts</Path> => lead:agent-workbench-integration","<Path>src/shared/settings/store.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/api.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/module.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/history/service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/history/service.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/agent-runtime.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/stats-service.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/stats-service.test.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/stats-store.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/platform/stats-store.test.ts</Path> => lead:agent-workbench-integration","<Path>src/shell/shared-workspace/**</Path> => lead:agent-workbench-integration"]
---

# Ticket T-16：HUHU 业务备份、导入预检与恢复

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

用户导出后能在空环境完整恢复 HUHU 自有记录，清楚看到原生全文/凭证缺项；坏包、冲突或目录失效不会覆盖有效数据。

现有 vault API/private storage 与 T-15 版本切换可复用；本轮没有任务 Run/Outbox 要打包。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任见 frontmatter/Map；本地贡献见验收标准；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：版本化包、清单、范围确认、摘要/路径/身份预检、暂存切换、失败恢复与设置入口。REUSE：T-15 数据核对/恢复流程。OUT：凭证/原生全文自动备份、恢复运行进程、自动启动模型。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-02：[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 按真实数据 owner 枚举 Space/Session、通知与 ack、标注、结果、来源和设备布局，清单明列外部正文/凭证/缓存/endpoint 的不含项。
2. 导出一致版本并摘要核对；导入先检查版本、摘要、路径、身份冲突与目录授权，在确认范围前不改有效数据。
3. 复用暂存→核对→切 writer 的恢复机制；目标机器库外目录重新授权，原生来源缺失保持说明，不触发启动。
4. 验证往返数据与故障回滚，界面提供实际清单和失败入口，同步数据与升级说明。

### 真实 owner 与恢复闭环（LOG-029）

必须落实 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> §6：原 owner 白名单、活动 BUSY/有界门禁、严格 drain、共同快照、暂存/恢复副本/journal、启动前恢复、内存和设置namespace基线重载，以及导入后和重启无副作用。不能直接调用现有吞错flush、正常load/publish/invoke完成恢复。原 owner 分析见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/backup-owner-analysis.md</Path>；实际新 Space/mailbox/共享布局的 store 路径在进入本票时按前序产物补齐，不能仅在 migrations/backup 目录写孤立逻辑。

本票通过 automations/notifications api 注册原 owner，备份现有完整 run/invocation/result/taskDelivery 和 records/read/receipts（包括 clearRead 后保留的墓碑），定义使用原 Markdown 仓储。保持现有 run/invocation 结构，不创建新 Run 平台。自动化至少覆盖两账户同session ID、两Space同cwd、全部来源/标注/mailbox ack/统计/结果往返，automation完成与通知预占边界一致快照，通知墓碑去重，导入及重启零dispatch/spawn/schedule/notify，原invocation幂等/冲突，导入不裁剪、禁用owner读取、活动BUSY、身份碰撞/恶意包/环境变量排除和源摘要漂移。实际运行 `test/agent-backup`、新增owner backup测试及既有invocations/automation/notifications套件。

## 验收标准

- [ ] `AC-050`：自有数据完整；清单明确外部正文/凭证缺项；不启动任何 Agent；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-051`：不覆盖有效数据；失败可重试/恢复；外部目录重新核对；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 往返与完整性 | V-07 | 新增 export/import 服务与 fixtures；导出后导入空隔离库，比较数量、原生引用、正文/标注与 ack | 自有数据完整，外部缺项明确，活动身份未恢复为运行 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path> |
| 恶意/损坏与中断 | V-04/V-07/V-08 | 损坏摘要、不支持版本、路径穿越、重复身份、只读盘、中途失败和撤销目录授权 | 预检拒绝或保留原状/恢复副本，可重试，无自动 Agent | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/shared/json-store.test.ts src/shared/storage/vault-identity.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** not-required：用户明确指定真实端到端由用户进行（LOG-027、Spec §11）；Agent 负责本票代码、自动化与构建验收。以下为交接用户的未运行场景：真实宿主在两个一次性库导出/导入，查看恢复清单、来源缺失提示和显式继续入口；记录零 spawn 与新目录授权流程。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；实际 workspace/base/head 见 README Execution Context，配置与输入记录在本票 Evidence；代码验收在固定快照上执行；真实 E2E 交给用户。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。人工 E2E 保留待用户验收，不能以 mock 或退出码 0 的 skip 记为通过。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。本票源文件可由 Lead 显式委托唯一实现者，main.js/styles.css 仍由 Lead 独占生成；同工作区共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-004、所绑定 AC、生产组件/布局/状态与可访问性自动化及相对原型的差异；真实宿主视口/主题/操作/截图按 Spec §11 由用户验收，不伪造截图。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

导入不能把活动 lock/endpoint 或系统/托管账号凭证当业务资料复制。文件打包格式由 I 选用项目现有能力；若需要新库，先按复用要求研究并走许可/依赖 owner。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
