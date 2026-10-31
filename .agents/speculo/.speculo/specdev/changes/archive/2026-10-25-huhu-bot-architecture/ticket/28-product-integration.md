---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"完整产品主路径与跨边界回归验收：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/28-product-integration.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-28.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/module-authoring.md</Path>","sha256":"ac00352dbace247a46730da89a7ad43a06202ab951be49613130ea9adfd5728b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/settings-and-i18n.md</Path>","sha256":"8ab588cba6ad602ab22e8f2ef4d89003331b7b26afb0af02721593af256c22c1","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/build-and-release.md</Path>","sha256":"988f020ccd84625c6da05c455a28ba05c704c6084191156f61c446d582e98871","when":"实施本票对应职责或验证触发时"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"完整产品主路径与跨边界回归验收：final 设计一致性与宿主交互验收","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/28-product-integration.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-28.md</Path>","Design Conformance、真实页面状态/尺寸/键盘证据"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:product-integration","huhu-bot:obsidian-acceptance-profile"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":2,"digest":"aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e","pages":["BOT-CHAT","BOT-TASKS","BOT-AGENT","BOT-MEMORY","BOT-ACCESS","BOT-DATA"],"acceptance":["AC-002","AC-003","AC-004","AC-005","AC-006","AC-007","AC-008","AC-010","AC-011","AC-015","AC-016","AC-017","AC-018","AC-019","AC-020","AC-021","AC-022","AC-023","AC-024","AC-025","AC-026","AC-029","AC-031","AC-038","AC-039","AC-040","AC-041","AC-047","AC-048","AC-049","AC-050","AC-051"]}
change: "2026-10-25-huhu-bot-architecture"
id: "T-28"
title: "完整产品主路径与跨边界回归验收"
status: "ready"
kind: "operations"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-08","T-09","T-10","T-21","T-22","T-23","T-24","T-25","T-26","T-27"]
contract_ids: ["AC-001","AC-005","AC-006","AC-007","AC-015","AC-017","AC-019","AC-020","AC-023","AC-024","AC-025","AC-029","AC-031","AC-033","AC-038","AC-039","AC-040","AC-041","AC-045","AC-047","AC-048","AC-049","AC-050","AC-051","AC-052","AC-053","AC-054","AC-055"]
owner: "unassigned"
expected_changes: ["<Path>scripts/obsidian-acceptance/huhu-bot.mjs</Path>","<Path>scripts/obsidian-acceptance/fixtures/huhu-bot/**</Path>","<Path>test/huhu-bot-integration/**</Path>","<Path>docs/huhu-bot-acceptance.md</Path>"]
writable_paths: ["<Path>scripts/obsidian-acceptance/huhu-bot.mjs</Path>","<Path>scripts/obsidian-acceptance/fixtures/huhu-bot/**</Path>","<Path>test/huhu-bot-integration/**</Path>","<Path>docs/huhu-bot-acceptance.md</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/module.ts</Path>","<Path>src/modules/huhubot/manifest.ts</Path>","<Path>src/modules/huhubot/settings.ts</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>native/huhubot/internal/bootstrap/modules.go</Path>","<Path>src/app/manifests.ts</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/contracts/workbench.ts</Path>","<Path>src/app/settings/nav.ts</Path>","<Path>src/app/settings/app-schema.ts</Path>","<Path>src/shared/i18n/workbench.ts</Path>","<Path>src/shared/i18n/settings.ts</Path>","<Path>scripts/module-strings.ts</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>docs/references.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/</Path>","<Path>scripts/obsidian-acceptance/fresh-vault.mjs</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/module.ts</Path>","<Path>src/modules/huhubot/manifest.ts</Path>","<Path>src/modules/huhubot/settings.ts</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>native/huhubot/internal/bootstrap/modules.go</Path>","<Path>src/app/manifests.ts</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/contracts/workbench.ts</Path>","<Path>src/app/settings/nav.ts</Path>","<Path>src/app/settings/app-schema.ts</Path>","<Path>src/shared/i18n/workbench.ts</Path>","<Path>src/shared/i18n/settings.ts</Path>","<Path>scripts/module-strings.ts</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>docs/references.md</Path>","<Path>AGENTS.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>","<Path>scripts/obsidian-acceptance/fresh-vault.mjs</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>src/modules/huhubot/module.ts</Path> => T-20","<Path>src/modules/huhubot/manifest.ts</Path> => T-20","<Path>src/modules/huhubot/settings.ts</Path> => T-20","<Path>src/modules/huhubot/i18n.ts</Path> => T-20","<Path>native/huhubot/internal/bootstrap/modules.go</Path> => T-20","<Path>src/app/manifests.ts</Path> => T-20","<Path>src/app/contracts/module.ts</Path> => T-01","<Path>src/app/contracts/workbench.ts</Path> => T-20","<Path>src/app/settings/nav.ts</Path> => T-20","<Path>src/app/settings/app-schema.ts</Path> => T-20","<Path>src/shared/i18n/workbench.ts</Path> => T-20","<Path>src/shared/i18n/settings.ts</Path> => T-20","<Path>scripts/module-strings.ts</Path> => T-20","<Path>package.json</Path> => T-27","<Path>pnpm-lock.yaml</Path> => T-27","<Path>src/styles.json</Path> => T-27","<Path>main.js</Path> => T-27","<Path>styles.css</Path> => T-27","<Path>THIRD-PARTY-NOTICES.md</Path> => T-27","<Path>NOTICE</Path> => T-27","<Path>docs/data.md</Path> => T-27","<Path>docs/architecture.md</Path> => T-27","<Path>docs/references.md</Path> => T-27","<Path>AGENTS.md</Path> => T-27","<Path>.agents/skills/dev/SKILL.md</Path> => T-27","<Path>.agents/skills/dev/references/architecture.md</Path> => T-27","<Path>.agents/skills/dev/references/licensing.md</Path> => T-27","<Path>.agents/skills/ui/SKILL.md</Path> => T-27","<Path>scripts/obsidian-acceptance/fresh-vault.mjs</Path> => T-27"]
---

# Ticket T-28：完整产品主路径与跨边界回归验收

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-001–025（012/015 已替代）；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-28.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

在固定最终构建中证明多 Bot、群协作、三协议、记忆、审批写入、崩溃恢复和永久清除可以一起工作，补齐真实产品接缝而非只汇总局部绿灯。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-02 cloudwego/eino-ext](https://github.com/cloudwego/eino-ext/tree/eee37f63ff9548c5eaec48fc157863339f8eda07)；[REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-05 Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot/tree/1bebe826f74e9a72cabafd3b80602b05af867b38)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

## 行为与范围

IN：可复跑一次性 Vault/Profile 的宿主验收工具、跨层 fixture、整体 AC 证据索引与 Design Conformance。REUSE：fresh-vault/workbench-probe 方式和各票真实证据。OUT：新产品能力、用 DOM mock 代替宿主、自动发布/归档。

### 有序实施步骤

1. 锁定源码/构建/依赖/输入/OS 与 DESIGN 摘要，协调全部 writer 停写；回读每个主责 AC 的实证，发现缺证回原 owner。
2. 构建一次性库：3 个持久 Bot＋1 群＋临时任务＋2 篇资料；分别配置三协议，完成 @/委派/受控再委派/预算/审批写/部分结果。
3. 同一场景注入断线/重启/未知效果/撤权，手动恢复；完成私有维护/全局确认/forget/删正文/核查/全清/portable，不触碰用户真库。
4. 检查 6 页面状态、390/800/1440、明暗、200% 缩放、键盘/IME/多窗口/隐藏/关闭；核对平台支持矩阵与实际证据，仅重跑受影响失败闭包。

## 验收标准

- [ ] AC-001（本票接缝；总主责 T-20）：打开前无 Runner/模型请求；打开后 Bot 可独立配置和聊天。
- [ ] AC-005（本票接缝；总主责 T-03）：新意图 busy 且草稿保留；原意图只返回原回执。
- [ ] AC-006（本票接缝；总主责 T-13）：仅 A 自动回应；A 可派遣其他成员，公共 transcript 可追溯。
- [ ] AC-007（本票接缝；总主责 T-13）：第一次仅 B 被调度；第二次受理前拒绝并保留草稿，不误发 A。
- [ ] AC-015（本票接缝；总主责 T-12）：展示部分结果及失败原因；有活动/未知效果后代时不能 succeeded。
- [ ] AC-017（本票接缝；总主责 T-16）：核查前不重派，安全后等点击，已完成子结果不复制；坏 CP blocked。
- [ ] AC-019（本票接缝；总主责 T-14）：私有条目带来源/修订可读；重复作业去重、暂停后不发新模型请求。
- [ ] AC-020（本票接缝；总主责 T-15）：未确认不可用；确认一次生效；拒绝/目标变化不写入。
- [ ] AC-023（本票接缝；总主责 T-08）：每协议独立证据；不静默换协议/endpoint，受控工具闭环成立。
- [ ] AC-024（本票接缝；总主责 T-05）：默认仅两份进入模型，origin/revision 固定；全库需新授权，撤权后过滤。
- [ ] AC-025（本票接缝；总主责 T-06）：目标/diff/来源明确；批准绑定确切效果，拒绝没有笔记修改。
- [ ] AC-029（本票接缝；总主责 T-07）：不自动重复写；committed/reconciled/unknown 可区别，终态可收核查事件。
- [ ] AC-031（本票接缝；总主责 T-04）：服务端停止正文，客户端清理失效投影，快照不能绕过撤权。
- [ ] AC-033（本票接缝；总主责 T-20）：页关闭继续；模块/宿主退出有界收尾，不依赖 async unload 被等待。
- [ ] AC-038（本票接缝；总主责 T-17）：受管派生副本和旧作业同步失效；独立固定/全局条目按用户选择处理。
- [ ] AC-039（本票接缝；总主责 T-17）：正文可删，仅列明最小记录保留；全清暂阻，核查后可清安全记录。
- [ ] AC-040（本票接缝；总主责 T-17）：失败不谎报；旧身份/代数不能复活数据；新 Profile ID 不同且不影响他者。
- [ ] AC-041（本票接缝；总主责 T-18）：预览冲突/ID 映射，权限重授，无秘密/有效审批/队列/CP且不自动运行。
- [ ] AC-045（本票接缝；总主责 T-12）：可关联身份/修订/耗用、known/estimate/unknown，诊断不泄露私有正文。
- [ ] AC-047（本票接缝；总主责 T-21）：列表只把持久身份当 Bot，选中/状态清楚，切换不重复执行，未保存表单有处理。
- [ ] AC-048（本票接缝；总主责 T-21）：主区对话清晰，资料/目标可见；审批前没有“已写入”，流式与保存状态分开。
- [ ] AC-049（本票接缝；总主责 T-23）：父子身份/状态/结果可辨，操作范围明确，未知效果有核查入口。
- [ ] AC-050（本票接缝；总主责 T-24）：作用域、来源、自动/人工状态可见；确认前不显示全局已生效。
- [ ] AC-051（本票接缝；总主责 T-21）：有上下文的下一步，保留草稿/有效数据，不用无限 spinner 或假成功代替。
- [ ] AC-052（本票接缝；总主责 T-21）：桌面内联、中屏覆盖、窄屏组合抽屉；无意横溢/遮挡，控件可达。
- [ ] AC-053（本票接缝；总主责 T-21）：焦点可见/返回触发点，不误发 IME，焦点不穿 modal，触区/语义合格。
- [ ] AC-054（本票接缝；总主责 T-05）：同一用例/DB决定 busy/幂等；普通客户端不能成 Host，离线不直写 Vault。
- [ ] AC-055（本票接缝；总主责 T-27）：逐目标记录实际通过；未通过不列支持，不以交叉编译替代。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态/真实 UI | 从打开 Bot 到协作交付/记忆维护/清除的真实 UI、持久状态和 Vault 结果相互一致；三协议分别有调用证据。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 忙/离线/权限不足/源变更/未知效果/恢复阻塞/清除失败；有下一步、无重复收费/重复写或假保存。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 现有工作台/CLI Agent/mobile boundary 不退化；DTO 双入站探针证明未来入口共用服务，P1 没有 HTTP listener。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 本票新建 `node scripts/obsidian-acceptance/huhu-bot.mjs <全新临时根>`，使用 fresh-vault 方式；逐场景回读 DB/事件/Vault 与截图，结合三个 TestLiveProtocolContract 实证 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-28.md</Path> |

- **E2E disposition：** required。Lead 在唯一 change-workspace 的固定最终产物执行完整一次性宿主场景，并逐目标关联 T-27 平台证据。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。
- **Design Conformance：** 回读 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> revision 2 与 frontmatter 摘要，按绑定页面验证正常/异常/窄叶子/键盘，记录本地截图与浏览器/Obsidian版本；原型源码和批准快照不由本票改写。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

环境/真实模型缺失保持相应验收 pending，不能删除范围。只在实际证据已失效时重跑；宿主与视觉必需证据缺失不宣称整体完成。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** P-UI：final 的设计批准已取得，但 UI-001 缺可回读浏览器证据，保持 ready:false。由 P 原 owner 补实际观察并通过 preview/ready，再由 S 更新 Spec；不重新询问已确认设计，不擅自切换用户未同意的浏览器方式。

### 未决问题

P-UI 技术证据待补；解除条件见就绪说明。产品选择已确认。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。


## 共享宿主探针收尾接缝（Map15 / Goal14）

054 实际回读确认 fresh-vault.mjs 的 stop 在强杀自有 Obsidian 子进程后未 await exited；crashRestart 已等待。该精确 helper 归 T27，T07/T28 只读复用。只补强杀后的真实 Wait，保持正常退出、20 秒宽限及原进程归属，不新增后台管理器。用户后验脚本的代码检查照常进行，不启动真实 Obsidian；最终联合代码门收齐此维护。
