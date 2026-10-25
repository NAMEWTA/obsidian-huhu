---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"OpenAI Chat Completions 真实工具与恢复闭环：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/08-engine-chat-completions.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:engine-chat-completions","huhu-bot:live-provider-quota","huhu-bot:engine-contract"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-08"
title: "OpenAI Chat Completions 真实工具与恢复闭环"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-02","T-03","T-05","T-06","T-07","T-12","T-16"]
contract_ids: ["AC-023","AC-036","AC-044"]
owner: "unassigned"
expected_changes: ["<Path>native/huhubot/internal/adapters/outbound/eino/common/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/chat/**</Path>","<Path>native/huhubot/tests/contract/engine/chat/**</Path>","<Path>native/huhubot/testdata/providers/chat/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/adapters/outbound/eino/common/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/chat/**</Path>","<Path>native/huhubot/tests/contract/engine/chat/**</Path>","<Path>native/huhubot/testdata/providers/chat/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01"]
---

# Ticket T-08：OpenAI Chat Completions 真实工具与恢复闭环

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-002、018、021；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

首条真实模型协议通过同一 Engine Port 运行流式对话、受控工具、审批后恢复与取消；实现不泄露 SDK 类型。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-02 cloudwego/eino-ext](https://github.com/cloudwego/eino-ext/tree/eee37f63ff9548c5eaec48fc157863339f8eda07)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

## 行为与范围

IN：Chat factory、消息/事件/CP 映射、明确 endpoint/凭证、usage/error/超时策略。REUSE：EinoExt openai 与 T-06 Broker。OUT：Responses 冒充 Chat、自动 failover、SDK 自主工具执行。

### 有序实施步骤

1. 在锁定模块图上对照 REF-01/02 选择 Runner/循环；复现工具级 interrupt/Resume，不因 Issue Closed 跳过。
2. 实现 Engine Port 的 Run/Resume 与 CP envelope 兼容元信息，事件映射保留 partial/usage 来源。
3. 控制 SDK 重试/超时/环境回退；请求前走授权与预算钩子，没有额度提供方时不放行收费。
4. 先 provider fixture 覆盖失败窗口，再由明确配置的真实 endpoint/model 验收文本、流、工具审批/拒绝、恢复、取消、usage。

## 验收标准

- [ ] AC-023（本票主责）：每协议独立证据；不静默换协议/endpoint，受控工具闭环成立。
- [ ] AC-036（本票主责）：原状态/部分内容保留且解释；只在已声明前提下重试，不跨目的地。
- [ ] AC-044（本票接缝；总主责 T-01）：Domain/Application 无 SDK/SQL/Obsidian，跨模块只公开 API；fake/真实 Engine 同用例。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 真实 Chat 调用在批准后继续并终结；界面外公共 API 可读取持久消息，模型实际收到的工具 schema 不含越权接口。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 429/超时/流中断/坏工具参数/interrupt 后 resume；返回部分状态和明确错误，不换 endpoint、协议或新意图。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | fake Engine 和真实 Engine 通过同一用例合同；捕获请求不含未授权笔记和环境密钥。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/engine/chat/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态；该目录另建 TestLiveProtocolContract，显式启用 `HUHU_BOT_LIVE=1` 并提供非秘密 endpoint/model 配置与受保护 credentialRef，skip 不算通过 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08.md</Path> |

- **E2E disposition：** required。真实 Provider endpoint/model → 同一应用用例/Broker → 一次性 Host → 审批/拒绝/恢复/取消 → 回读持久结果；每协议独立记录，不将 fixture 当真实调用。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

模型/账号/网络是执行输入，缺任一真实样本则该协议验收 pending；文档不保存 API Key。不接受只通过文本生成。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。
