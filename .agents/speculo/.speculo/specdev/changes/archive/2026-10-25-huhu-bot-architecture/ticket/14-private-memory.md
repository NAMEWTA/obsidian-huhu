---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"隔离上下文与 Bot 自动私有记忆：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/14-private-memory.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:private-memory","huhu-bot:sqlite-schema","huhu-bot:provenance-and-revocation"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-14"
title: "隔离上下文与 Bot 自动私有记忆"
status: "in_progress"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-03","T-05","T-08","T-11","T-12"]
contract_ids: ["AC-018","AC-019","AC-021","AC-022"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/domain/memory/private/**</Path>","<Path>native/huhubot/internal/application/memory/context/**</Path>","<Path>native/huhubot/internal/application/memory/private/**</Path>","<Path>native/huhubot/internal/application/memory/maintenance/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/014-memory.sql</Path>","<Path>native/huhubot/tests/contract/private-memory/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/memory/private/**</Path>","<Path>native/huhubot/internal/application/memory/context/**</Path>","<Path>native/huhubot/internal/application/memory/private/**</Path>","<Path>native/huhubot/internal/application/memory/maintenance/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/014-memory.sql</Path>","<Path>native/huhubot/tests/contract/private-memory/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01"]
---

# Ticket T-14：隔离上下文与 Bot 自动私有记忆

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-024；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

每个 Bot/工作线程的短期上下文隔离；完成交互后有额度的 Bot 自动维护自己的长期记忆，用户纠正/遗忘不会被旧作业撤销。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-05 Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot/tree/1bebe826f74e9a72cabafd3b80602b05af867b38)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：上下文构建/压缩、私有/临时命名空间、来源修订、自动作业、暂停/额度、pin/correct/forget、召回过滤。REUSE：同一 Engine/授权/usage。OUT：自动全局写、群级独立长期库、全库索引。

### 有序实施步骤

1. 按 agentId+Session/workThread 组装短期输入，只注入获准消息/摘录；temporary 不隐式继承 sponsor 长期记忆。
2. 在完成交互后受理有来源 revision 的维护作业；先检查暂停/额度/模型目的地，再调用所属 Bot 模型，普通聊天成功不依赖维护成功。
3. 自动条目分观察/推断并记录 provenance/revision；expectedRevision 防覆盖，人工固定项冲突变候选。
4. forget/correct 原子失效召回/索引并提升作业代数，迟到结果不得复活；撤权/删除来源通过共同失效合同传播。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-018（本票主责）：不跨线程/Agent 混入私聊；摘要不无依据成为长期事实。
- [ ] AC-019（本票主责）：私有条目带来源/修订可读；重复作业去重、暂停后不发新模型请求。
- [ ] AC-021（本票主责）：新修订生效，旧索引失效；固定项不被自动覆盖，忘记项不复活。
- [ ] AC-022（本票接缝；总主责 T-05）：在读取/外发前拒绝或过滤，不借 B 更大权限，不直接读另一 Bot 私有库。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | A/B 与 A 两线程哨兵隔离；重复维护只一条事实；暂停/无额度无新模型调用；用户修订立即用于召回。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 提炼失败、并发修订、固定项冲突、forget 后旧作业返回；聊天已保存且记忆不误覆盖/复活。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 普通文件/搜索工具不能读 Profile 私有库；跨 Provider 发布记忆摘录再次过滤，压缩不自动晋升长期事实。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/private-memory/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

自动维护可能收费，预算/暂停状态必须可见；无法追踪来源的条目不可自动持久化。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。


## Map31 当前记忆窗口

本轮从已接纳G2代码基线继续，精确范围和原owner见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-window-map31.md</Path>。115与123接纳为实施合同，未运行的新消费者不算通过；全部历史验收保留，正式开工以实际TASK/原生派遣为准。

### Map35 共同Engine资源实例说明

在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/common-component-window-map35.md</Path> 的实际import闭包确认与冻结条件下，130可独占common/chat/api组件Go检查，126/129只写闭包外源；扩大到Core/SQL或跨语言时重新统一冻结。本条不转移公共API、driver或迁移owner，不修改产品验收合同。

### Map36 纯manifest校验资源窗口

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/manifest-helper-window-map36.md</Path>限定132原API owner只写memory.go及同包新回归，先证实纯api实际闭包再单独检查。126/128保持原source-only写集，wire/schema/fixtures冻结；不把metadata校验当作读取授权。

### Map37 历史与运行消费者窗口

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/history-runtime-window-map37.md</Path>定义原direct/Run/Core/generator owner的134后继写集及128窄资格端口。133组件冻结路径只读；generation和默认Core检查继续Root串行。
