---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"Go 资产构建、许可覆盖与平台启动验证：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/27-build-platform-notices.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-27.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/module-authoring.md</Path>","sha256":"ac00352dbace247a46730da89a7ad43a06202ab951be49613130ea9adfd5728b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/settings-and-i18n.md</Path>","sha256":"8ab588cba6ad602ab22e8f2ef4d89003331b7b26afb0af02721593af256c22c1","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/build-and-release.md</Path>","sha256":"44a6c8f5697effc90ed3b944de0bbb279dd07e0d294bbf34deb70bfd7bf5c114","when":"实施本票对应职责或验证触发时"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"Go 资产构建、许可覆盖与平台启动验证：final 设计一致性与宿主交互验收","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/27-build-platform-notices.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-27.md</Path>","Design Conformance、真实页面状态/尺寸/键盘证据"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:build-platform-notices","huhu-bot:obsidian-acceptance-profile","project:build-outputs","project:dependency-locks","project:skill-contracts"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":2,"digest":"aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e","pages":["BOT-CHAT","BOT-TASKS","BOT-AGENT","BOT-MEMORY","BOT-ACCESS","BOT-DATA"],"acceptance":["AC-002","AC-003","AC-004","AC-005","AC-006","AC-007","AC-008","AC-010","AC-011","AC-015","AC-016","AC-017","AC-018","AC-019","AC-020","AC-021","AC-022","AC-023","AC-024","AC-025","AC-026","AC-029","AC-031","AC-038","AC-039","AC-040","AC-041","AC-047","AC-048","AC-049","AC-050","AC-051"]}
change: "2026-10-25-huhu-bot-architecture"
id: "T-27"
title: "Go 资产构建、许可覆盖与平台启动验证"
status: "blocked"
kind: "operations"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: false
risk: "high"
blocked_by: []
contract_ids: ["AC-043","AC-044","AC-055"]
owner: "unassigned"
expected_changes: ["<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>scripts/build-huhu-bot.mjs</Path>","<Path>scripts/verify-huhu-bot.mjs</Path>","<Path>scripts/verify-huhu-bot-architecture.mjs</Path>","<Path>scripts/verify-release-artifacts.mjs</Path>","<Path>test/release/release-artifacts.test.ts</Path>","<Path>.github/workflows/huhu-bot.yml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/third-party/huhu-bot.md</Path>","<Path>docs/references.md</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>","<Path>native/huhubot/dist/**</Path>","<Path>native/huhubot/tests/contract/platform/**</Path>","<Path>scripts/third-party-notices.mjs</Path>","<Path>scripts/license-texts.mjs</Path>","<Path>scripts/license-texts.test.mjs</Path>","<Path>scripts/check-bundle.mjs</Path>","<Path>.github/workflows/release.yml</Path>","<Path>AGENTS.md</Path>"]
writable_paths: ["<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>scripts/build-huhu-bot.mjs</Path>","<Path>scripts/verify-huhu-bot.mjs</Path>","<Path>scripts/verify-huhu-bot-architecture.mjs</Path>","<Path>scripts/verify-release-artifacts.mjs</Path>","<Path>test/release/release-artifacts.test.ts</Path>","<Path>.github/workflows/huhu-bot.yml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/third-party/huhu-bot.md</Path>","<Path>docs/references.md</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>","<Path>native/huhubot/dist/**</Path>","<Path>native/huhubot/tests/contract/platform/**</Path>","<Path>scripts/third-party-notices.mjs</Path>","<Path>scripts/license-texts.mjs</Path>","<Path>scripts/license-texts.test.mjs</Path>","<Path>scripts/check-bundle.mjs</Path>","<Path>.github/workflows/release.yml</Path>","<Path>AGENTS.md</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/module.ts</Path>","<Path>src/modules/huhubot/manifest.ts</Path>","<Path>src/modules/huhubot/settings.ts</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>native/huhubot/internal/bootstrap/modules.go</Path>","<Path>src/app/manifests.ts</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/contracts/workbench.ts</Path>","<Path>src/app/settings/nav.ts</Path>","<Path>src/app/settings/app-schema.ts</Path>","<Path>src/shared/i18n/workbench.ts</Path>","<Path>src/shared/i18n/settings.ts</Path>","<Path>scripts/module-strings.ts</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/module.ts</Path>","<Path>src/modules/huhubot/manifest.ts</Path>","<Path>src/modules/huhubot/settings.ts</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>native/huhubot/internal/bootstrap/modules.go</Path>","<Path>src/app/manifests.ts</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/contracts/workbench.ts</Path>","<Path>src/app/settings/nav.ts</Path>","<Path>src/app/settings/app-schema.ts</Path>","<Path>src/shared/i18n/workbench.ts</Path>","<Path>src/shared/i18n/settings.ts</Path>","<Path>scripts/module-strings.ts</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>docs/references.md</Path>","<Path>AGENTS.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>src/modules/huhubot/module.ts</Path> => T-20","<Path>src/modules/huhubot/manifest.ts</Path> => T-20","<Path>src/modules/huhubot/settings.ts</Path> => T-20","<Path>src/modules/huhubot/i18n.ts</Path> => T-20","<Path>native/huhubot/internal/bootstrap/modules.go</Path> => T-20","<Path>src/app/manifests.ts</Path> => T-20","<Path>src/app/contracts/module.ts</Path> => T-20","<Path>src/app/contracts/workbench.ts</Path> => T-20","<Path>src/app/settings/nav.ts</Path> => T-20","<Path>src/app/settings/app-schema.ts</Path> => T-20","<Path>src/shared/i18n/workbench.ts</Path> => T-20","<Path>src/shared/i18n/settings.ts</Path> => T-20","<Path>scripts/module-strings.ts</Path> => T-20","<Path>package.json</Path> => T-27","<Path>pnpm-lock.yaml</Path> => T-27","<Path>src/styles.json</Path> => T-27","<Path>main.js</Path> => T-27","<Path>styles.css</Path> => T-27","<Path>THIRD-PARTY-NOTICES.md</Path> => T-27","<Path>NOTICE</Path> => T-27","<Path>docs/data.md</Path> => T-27","<Path>docs/architecture.md</Path> => T-27","<Path>docs/references.md</Path> => T-27","<Path>AGENTS.md</Path> => T-27","<Path>.agents/skills/dev/SKILL.md</Path> => T-27","<Path>.agents/skills/dev/references/architecture.md</Path> => T-27","<Path>.agents/skills/dev/references/licensing.md</Path> => T-27","<Path>.agents/skills/ui/SKILL.md</Path> => T-27"]
---

# Ticket T-27：Go 资产构建、许可覆盖与平台启动验证

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-001–005、014、022；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-27.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

可追溯构建出平台匹配的 Runner 资产，许可证覆盖 Go 依赖，真实目标环境运行通过后才列支持。承担共享生成物/工程文档的唯一写入责任。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-02 cloudwego/eino-ext](https://github.com/cloudwego/eino-ext/tree/eee37f63ff9548c5eaec48fc157863339f8eda07)；[REF-07 mattn/go-sqlite3](https://github.com/mattn/go-sqlite3/commit/dbbe931904f2ee06546448fbe7cf7780f61bc110)；[REF-08 ncruces/go-sqlite3](https://github.com/ncruces/go-sqlite3/commit/da0ceb8b723e44c2dfde7b287286a2be4ded0016)；[REF-09 zalando/go-keyring](https://github.com/zalando/go-keyring/commit/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

## 行为与范围

IN：Go locked 构建/测试/依赖扫描、资产清单/hash/兼容矩阵、notices 扩展、根生成物、真实 OS smoke、实现后的数据/模块规则同步。REUSE：现有构建与 PTY 发布合同。OUT：自动发布/升版本、改 plugin id、把交叉编译当真机通过。

### 有序实施步骤

1. 先基于现有工程核对 notices/build/release 路径并细化硬写集，提供共享构建窗口；这部分可在 T-01 前准备，避免 T-01 验证等待本票而本票又等待 T-01。Go 入口及资产构建在 T-01 的真实模块/合同可回读后实施，保留 pnpm check:native 的 Rust 含义，产物可区分。
2. 按最终 go.mod/go.sum/build tags 扫传递许可和源码改编；生成通知含完整许可，未采用的参考项目不冒加“包含代码”。
3. 作为共享文件 owner，为各 UI/TS 票提供串行 build/i18n/样式集成窗口；更新 main.js/styles.css 与本票拥有的样式注册，根词典/模块注册仍归 T-20。本票仅有工程准备无前置票；Go 构建子步骤依赖 T-01 实际产物，收尾等待所有生产切片最终输入冻结，并由 Goal G5 验收，不提前 done。
4. 逐拟发行 OS/架构实际启动/TLS/DB/凭证/关闭，验证坏资产与旧兼容版本；同步 docs/data 与 dev 的 Bot 库外例外、ui store 的客户端投影定位，重绑未完成票 Skill 摘要。

## 验收标准

- [ ] AC-043（本票接缝；总主责 T-20）：不执行坏资产、不回退 PATH，保留诊断/兼容旧版本。
- [ ] AC-044（本票接缝；总主责 T-01）：Domain/Application 无 SDK/SQL/Obsidian，跨模块只公开 API；fake/真实 Engine 同用例。
- [ ] AC-055（本票主责）：逐目标记录实际通过；未通过不列支持，不以交叉编译替代。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态/真实 UI | 锁定依赖构建资产与声明一致；目标环境 smoke 有版本/日志/退出结果，消费者安装接受正确目标。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 缺 LICENSE/未知分支、坏 checksum、错误平台/schema、缺保护服务；构建/安装明确失败或按合同内存模式，不假支持。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | PTY 资产、移动端 manifest、当前架构规则/包体/许可检查仍通过；root 生成物与源码一致且不改用户无关变更。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | `go test ./...`（native/huhubot 内）、新建 `node scripts/verify-huhu-bot.mjs <binary>`；`pnpm check:notices`、`pnpm test:license-texts`、`pnpm test:architecture`、`pnpm check:bundle` 和各目标实际启动 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-27.md</Path> |

- **E2E disposition：** required。每个拟支持 OS/架构的真实原生运行；最终 Obsidian 产品 smoke 由 T-28 汇合验证。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。
- **Design Conformance：** 回读 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> revision 2 与 frontmatter 摘要，按绑定页面验证正常/异常/窄叶子/键盘，记录本地截图与浏览器/Obsidian版本；原型源码和批准快照不由本票改写。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

此票拥有跨票共享文件，不意味着可任意重构。授权只及准备资产与验证，不执行远程发布；更改 Skill 后必须刷新适用票摘要和失效闭包。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** P-UI：final 的设计批准已取得，但 UI-001 缺可回读浏览器证据，保持 ready:false。由 P 原 owner 补实际观察并通过 preview/ready，再由 S 更新 Spec；不重新询问已确认设计，不擅自切换用户未同意的浏览器方式。

### 未决问题

P-UI 技术证据待补；解除条件见就绪说明。产品选择已确认。
