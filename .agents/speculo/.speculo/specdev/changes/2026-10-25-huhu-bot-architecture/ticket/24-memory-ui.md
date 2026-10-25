---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"私有、短期与全局记忆管理界面：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/24-memory-ui.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-24.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/module-authoring.md</Path>","sha256":"ac00352dbace247a46730da89a7ad43a06202ab951be49613130ea9adfd5728b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/settings-and-i18n.md</Path>","sha256":"8ab588cba6ad602ab22e8f2ef4d89003331b7b26afb0af02721593af256c22c1","when":"实施本票对应职责或验证触发时"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"私有、短期与全局记忆管理界面：final 设计一致性与宿主交互验收","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/24-memory-ui.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-24.md</Path>","Design Conformance、真实页面状态/尺寸/键盘证据"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:memory-ui","huhu-bot:obsidian-acceptance-profile"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":2,"digest":"aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e","pages":["BOT-MEMORY"],"acceptance":["AC-018","AC-019","AC-020","AC-021","AC-022","AC-050"]}
change: "2026-10-25-huhu-bot-architecture"
id: "T-24"
title: "私有、短期与全局记忆管理界面"
status: "blocked"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "范围已清晰，主要消费稳定 API；异常、宿主或包格式仍需可回读验收"
ready: false
risk: "medium"
blocked_by: ["T-14","T-15","T-21"]
contract_ids: ["AC-018","AC-019","AC-020","AC-021","AC-022","AC-050","AC-051","AC-053"]
owner: "unassigned"
expected_changes: ["<Path>src/modules/huhubot/ui/memory/**</Path>","<Path>src/modules/huhubot/styles/memory.css</Path>","<Path>src/modules/huhubot/i18n/memory.ts</Path>"]
writable_paths: ["<Path>src/modules/huhubot/ui/memory/**</Path>","<Path>src/modules/huhubot/styles/memory.css</Path>","<Path>src/modules/huhubot/i18n/memory.ts</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/module.ts</Path>","<Path>src/modules/huhubot/manifest.ts</Path>","<Path>src/modules/huhubot/settings.ts</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>native/huhubot/internal/bootstrap/modules.go</Path>","<Path>src/app/manifests.ts</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/contracts/workbench.ts</Path>","<Path>src/app/settings/nav.ts</Path>","<Path>src/app/settings/app-schema.ts</Path>","<Path>src/shared/i18n/workbench.ts</Path>","<Path>src/shared/i18n/settings.ts</Path>","<Path>scripts/module-strings.ts</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>docs/references.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/module.ts</Path>","<Path>src/modules/huhubot/manifest.ts</Path>","<Path>src/modules/huhubot/settings.ts</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>native/huhubot/internal/bootstrap/modules.go</Path>","<Path>src/app/manifests.ts</Path>","<Path>src/app/contracts/module.ts</Path>","<Path>src/app/contracts/workbench.ts</Path>","<Path>src/app/settings/nav.ts</Path>","<Path>src/app/settings/app-schema.ts</Path>","<Path>src/shared/i18n/workbench.ts</Path>","<Path>src/shared/i18n/settings.ts</Path>","<Path>scripts/module-strings.ts</Path>","<Path>package.json</Path>","<Path>pnpm-lock.yaml</Path>","<Path>src/styles.json</Path>","<Path>main.js</Path>","<Path>styles.css</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>NOTICE</Path>","<Path>docs/data.md</Path>","<Path>docs/architecture.md</Path>","<Path>docs/references.md</Path>","<Path>AGENTS.md</Path>","<Path>.agents/skills/dev/SKILL.md</Path>","<Path>.agents/skills/dev/references/architecture.md</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/skills/ui/SKILL.md</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>src/modules/huhubot/module.ts</Path> => T-20","<Path>src/modules/huhubot/manifest.ts</Path> => T-20","<Path>src/modules/huhubot/settings.ts</Path> => T-20","<Path>src/modules/huhubot/i18n.ts</Path> => T-20","<Path>native/huhubot/internal/bootstrap/modules.go</Path> => T-20","<Path>src/app/manifests.ts</Path> => T-20","<Path>src/app/contracts/module.ts</Path> => T-20","<Path>src/app/contracts/workbench.ts</Path> => T-20","<Path>src/app/settings/nav.ts</Path> => T-20","<Path>src/app/settings/app-schema.ts</Path> => T-20","<Path>src/shared/i18n/workbench.ts</Path> => T-20","<Path>src/shared/i18n/settings.ts</Path> => T-20","<Path>scripts/module-strings.ts</Path> => T-20","<Path>package.json</Path> => T-27","<Path>pnpm-lock.yaml</Path> => T-27","<Path>src/styles.json</Path> => T-27","<Path>main.js</Path> => T-27","<Path>styles.css</Path> => T-27","<Path>THIRD-PARTY-NOTICES.md</Path> => T-27","<Path>NOTICE</Path> => T-27","<Path>docs/data.md</Path> => T-27","<Path>docs/architecture.md</Path> => T-27","<Path>docs/references.md</Path> => T-27","<Path>AGENTS.md</Path> => T-27","<Path>.agents/skills/dev/SKILL.md</Path> => T-27","<Path>.agents/skills/dev/references/architecture.md</Path> => T-27","<Path>.agents/skills/dev/references/licensing.md</Path> => T-27","<Path>.agents/skills/ui/SKILL.md</Path> => T-27"]
---

# Ticket T-24：私有、短期与全局记忆管理界面

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-024、025；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-24.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

## 目标与来源

用户清楚看到当前 Bot/线程/全局作用域，管理自动维护、来源、固定/纠正/遗忘，并确认全局提案。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-05 Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot/tree/1bebe826f74e9a72cabafd3b80602b05af867b38)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

## 行为与范围

IN：BOT-MEMORY、scope 切换、暂停/额度原因、proposal 预览、correct/pin/forget、冲突。REUSE：Memory API 和共享 Settings/Dialogs。OUT：跨 Bot 隐式混合、全局自动生效、原型数据权威。

### 有序实施步骤

1. 按 final scope 导航展示 owner/来源/自动或人工/修订；短期/临时上下文不冒称持久长期。
2. 自动维护显示可能调用模型、当前额度与暂停原因；无额度不会触发测试性自动调用。
3. 全局提案增改删均预览确认，待确认不能显示已生效；correct/forget 冲突保留可处理输入。
4. 测试来源撤销/删除后投影失效，键盘焦点/窄叶子和真正持久结果回读。

## 验收标准

- [ ] AC-018（本票接缝；总主责 T-14）：不跨线程/Agent 混入私聊；摘要不无依据成为长期事实。
- [ ] AC-019（本票接缝；总主责 T-14）：私有条目带来源/修订可读；重复作业去重、暂停后不发新模型请求。
- [ ] AC-020（本票接缝；总主责 T-15）：未确认不可用；确认一次生效；拒绝/目标变化不写入。
- [ ] AC-021（本票接缝；总主责 T-14）：新修订生效，旧索引失效；固定项不被自动覆盖，忘记项不复活。
- [ ] AC-022（本票接缝；总主责 T-05）：在读取/外发前拒绝或过滤，不借 B 更大权限，不直接读另一 Bot 私有库。
- [ ] AC-050（本票主责）：作用域、来源、自动/人工状态可见；确认前不显示全局已生效。
- [ ] AC-051（本票接缝；总主责 T-21）：有上下文的下一步，保留草稿/有效数据，不用无限 spinner 或假成功代替。
- [ ] AC-053（本票接缝；总主责 T-21）：焦点可见/返回触发点，不误发 IME，焦点不穿 modal，触区/语义合格。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态/真实 UI | 切换 A/B 和 scope 不串条目；自动维护状态真实；确认前后全局可见性改变。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 旧 revision、拒绝/过期 proposal、forget 后迟到作业、撤权；不假成功/复活/误召回。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 固定项保护、关闭面板后作业生命周期归模块；无内存 UI store 反写持久权威。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 运行本票新增的定向 Vitest/宿主场景；具体接缝见下方；`pnpm exec vitest run src/modules/huhubot/ui/` 中本票相关 suite；Lead 执行真实 Obsidian 场景 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-24.md</Path> |

- **E2E disposition：** required。真实宿主对话触发维护→查来源→固定/纠正/遗忘→确认/拒绝全局；从另 Bot 验证召回。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。
- **Design Conformance：** 回读 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> revision 2 与 frontmatter 摘要，按绑定页面验证正常/异常/窄叶子/键盘，记录本地截图与浏览器/Obsidian版本；原型源码和批准快照不由本票改写。

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

来源正文敏感，仅显示当前可读部分；不能为了预览绕过 Memory API。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** P-UI：final 的设计批准已取得，但 UI-001 缺可回读浏览器证据，保持 ready:false。由 P 原 owner 补实际观察并通过 preview/ready，再由 S 更新 Spec；不重新询问已确认设计，不擅自切换用户未同意的浏览器方式。

### 未决问题

P-UI 技术证据待补；解除条件见就绪说明。产品选择已确认。
