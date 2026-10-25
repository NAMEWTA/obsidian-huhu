---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"可启动、可重连的 Profile Runner 与公共合同：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/01-runner-profile-contract.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-01.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/build-and-release.md</Path>","sha256":"44a6c8f5697effc90ed3b944de0bbb279dd07e0d294bbf34deb70bfd7bf5c114","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:runner-profile-contract","huhu-bot:sqlite-schema"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-01"
title: "可启动、可重连的 Profile Runner 与公共合同"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: []
contract_ids: ["AC-034","AC-035","AC-044","AC-054"]
owner: "unassigned"
expected_changes: ["<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>native/huhubot/cmd/huhubot/**</Path>","<Path>native/huhubot/internal/runtime/profile/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/adapters/inbound/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/001-core.sql</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>src/modules/huhubot/platform/desktop/transport/**</Path>"]
writable_paths: ["<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>native/huhubot/cmd/huhubot/**</Path>","<Path>native/huhubot/internal/runtime/profile/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/adapters/inbound/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/001-core.sql</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>src/modules/huhubot/platform/desktop/transport/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01"]
---

# Ticket T-01：可启动、可重连的 Profile Runner 与公共合同

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-001–005、020–022；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-01.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

从真实 TS 客户端启动 Go Runner，hello 后读取同一 Profile；退出重开仍识别同一数据库，第二写者被拒绝。建立其他行为共同消费的稳定边界。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-02 cloudwego/eino-ext](https://github.com/cloudwego/eino-ext/tree/eee37f63ff9548c5eaec48fc157863339f8eda07)；[REF-07 mattn/go-sqlite3](https://github.com/mattn/go-sqlite3/commit/dbbe931904f2ee06546448fbe7cf7780f61bc110)；[REF-08 ncruces/go-sqlite3](https://github.com/ncruces/go-sqlite3/commit/da0ceb8b723e44c2dfde7b287286a2be4ded0016)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

## 行为与范围

IN：独立 Go module、领域/应用/API/DTO 边界、Profile 元数据/UoW、真实 framed stdio 与双向 request/response、schema/生成夹具、实际 DB 身份锁、fake 第二入站客户端。REUSE：项目 Module/ServiceKey 类型和现有原生测试方式。OUT：HTTP 服务、模型循环、Bot UI、通用存储框架。

### 有序实施步骤

1. 先按 REF-07/08 用同一真实文件库夹具比较两类 SQLite driver 的事务、锁、备份 API、取消和依赖；选择一个并锁 Go/EinoExt 子模块及传递依赖；未通过的目标不宣布支持。
2. 以 spec §9 完整方法表定义版本化 DTO/schema、错误和能力分组；方法尚未装配时 hello 不宣称可用，不生成虚假成功 handler。工具与客户端身份边界分开。
3. 实现 Profile 根/权限/锁和最小元数据事务；创建空库与打开坏库走不同路径。实现 TS/Go codec、hello、health、关闭和 Host 反向响应；stdout 仅协议。
4. 用真实两进程/路径别名与两 fake 入站客户端验证同一应用 facade；建立代码依赖扫描，Domain/Application 禁导 SDK/SQL/Obsidian/Wire DTO。固定帧大小/batch 候选夹具并测量冻结。

## 验收标准

- [ ] AC-034（本票主责）：第二写者 INSTANCE_CONFLICT，首实例和数据不被覆盖。
- [ ] AC-035（本票主责）：确定错误和关闭行为，stdout 无日志污染；hello 与 schema/类型一致。
- [ ] AC-044（本票主责）：Domain/Application 无 SDK/SQL/Obsidian，跨模块只公开 API；fake/真实 Engine 同用例。
- [ ] AC-054（本票接缝；总主责 T-05）：同一用例/DB决定 busy/幂等；普通客户端不能成 Host，离线不直写 Vault。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 启动、hello、Profile 元数据持久后重启回读；分片、连续多帧、反向 host 请求保持 ID 关联；两个入站客户端调用同一 facade。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 零长/半帧 EOF/未知 kind/非法 UTF-8/JSON/超限、hello 前业务、重复 DB 别名进程；确定错误、断开及原数据不变。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 现有 PTY 协议与 .huhu 路径不变；依赖扫描及 schema 双端夹具；mobile 代码不可到达 Node。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/foundation/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-01.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

锁、驱动和 DTO 一旦漂移会影响全链；停止条件为无法证明同库单写、依赖许可证不明或 API 暴露底层类型。保留探针数据与依赖选择记录，失败不删真实 Profile。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。
