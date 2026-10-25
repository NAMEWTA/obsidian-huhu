---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"发现 Bot、派遣已有或临时执行与创建提案：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/11-delegation-directory.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-11.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:delegation-directory","huhu-bot:sqlite-schema","huhu-bot:run-admission-contract"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-11"
title: "发现 Bot、派遣已有或临时执行与创建提案"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-02","T-03","T-05","T-06"]
contract_ids: ["AC-002","AC-009","AC-010","AC-011","AC-027"]
owner: "unassigned"
expected_changes: ["<Path>native/huhubot/internal/domain/collaboration/delegation/**</Path>","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path>","<Path>native/huhubot/internal/application/collaboration/discover/**</Path>","<Path>native/huhubot/internal/application/collaboration/proposecreate/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/011-delegation.sql</Path>","<Path>native/huhubot/internal/application/tooling/collaboration-tools/**</Path>","<Path>native/huhubot/tests/contract/delegation/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/collaboration/delegation/**</Path>","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path>","<Path>native/huhubot/internal/application/collaboration/discover/**</Path>","<Path>native/huhubot/internal/application/collaboration/proposecreate/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/011-delegation.sql</Path>","<Path>native/huhubot/internal/application/tooling/collaboration-tools/**</Path>","<Path>native/huhubot/tests/contract/delegation/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01"]
---

# Ticket T-11：发现 Bot、派遣已有或临时执行与创建提案

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-023；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-11.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

任何获准 Bot 可发现受权名册并派遣已有 Bot 或临时配置；新工作线程与持久 Bot 身份清晰分开。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-06 openclaw/openclaw](https://github.com/openclaw/openclaw/tree/090e6213e25e6b09f03590a41da2fddeaf9f611e)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

## 行为与范围

IN：discover/delegate/tasks get/list/cancel 的应用/工具合同、ContextEnvelope、幂等原子受理、proposeCreate。REUSE：同一 Engine/RunExecutor，不启动另一个团队引擎。OUT：复用目标私聊、未经确认持久创建、无限递归。

### 有序实施步骤

1. 用实际模型可见 schema/prompt 写明已有身份/临时执行区别、分页、空结果/错误和状态返回；caller 从执行上下文注入。
2. 受理前交集检查目标、来源、接收方、能力、深度/数量/预算 Port；后续 T-12 注入完整策略，缺策略时保守拒绝，不先无限放行。
3. 短事务创建 Delegation/childRun/workThread/回执/事件；重复交付回原 ID，accepted 扫描补偿。临时配置独立可持久恢复。
4. 实现任务查询与创建持久 Bot 草稿；用户确认调用 assistant 用例，新建 Agent 不由模型参数证明。

## 验收标准

- [ ] AC-002（本票接缝；总主责 T-02）：重启后持久 Bot 保留稳定 ID；临时任务不新增目录 Bot。
- [ ] AC-009（本票主责）：仅返回受权摘要；重名不猜测；无结果、失败、截断可区分。
- [ ] AC-010（本票主责）：只受理一个委派/子 Run，有独立工作线程，未读取 B 私聊或新增身份。
- [ ] AC-011（本票主责）：临时配置/上下文隔离可恢复；持久创建须用户确认明确意图。
- [ ] AC-027（本票接缝；总主责 T-03）：同输入一次提交、异输入冲突；扫描不丢消息/任务，终结失败不报保存成功。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 已有 B 的新线程不读 B 私聊、不增加身份；temporary 独立运行，重启仍可定位；同工具重复仅一子任务。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 未知/重名未选择/停用/不可见目标、伪造 caller、缺准入策略；不执行且返回可理解状态。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 目录摘要不含人格正文/私有记忆；新用户相同任务不被去重吞掉；任务查询不凭内存 Promise。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/delegation/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-11.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

参考项目限制不可直接套用。临时 Agent 的上下文/模型/输出接收方必须可审计，无法确认时阻止受理。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。
