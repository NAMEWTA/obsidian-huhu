---
schema_version: 3
plan_contract_version: 1
skill_scan: "已扫描 .agents/skills/**/SKILL.md 与 AGENTS；真实项目技能 dev/ui 命中，SpecDev 工作流不伪装为项目 Skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"3c6e68925449c4bf103a17e3b5d15ea149e217864b2dd7be3b32a0cc0ad743fd","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"implement-approved-behavior","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/design-system.md</Path>","sha256":"3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/shell.md</Path>","sha256":"f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"verify","operation":"verify-affected-contracts","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path>：实际调用轨迹、适用检查和失败处置"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/ui/references/motion-a11y.md</Path>","sha256":"76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103","when":"本票命中该领域时在调用前回读；摘要变化先交 Lead 核验"}]}]
resource_claims: ["huhu:integration-entrypoints","huhu:generated-artifacts","huhu:behavior:T-08"]
artifact: "ticket"
ui_change: true
design_ref: {"revision":1,"digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab","pages":["PAGE-001","PAGE-003"],"acceptance":["AC-013","AC-014","AC-015","AC-016","AC-017","AC-018","AC-061"]}
change: "2026-10-25-agent-workbench-refactor"
id: "T-08"
title: "输入仲裁、状态等待与有界读屏闭环"
status: "ready"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "公共 prompt/wait/read 涉及输入副作用、取消竞争和任务成功误判，必须端到端证明。"
ready: true
risk: "high"
blocked_by: ["T-07"]
contract_ids: ["AC-013","AC-014","AC-015","AC-016","AC-017","AC-018","AC-030","AC-061"]
owner: "unassigned"
expected_changes: ["<Path>src/modules/agent/services/terminal/session.ts</Path>","<Path>src/modules/agent/core/terminal/keyboard.ts</Path>","<Path>src/modules/agent/core/terminal/paste.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/services/control/**</Path>","<Path>src/modules/agent/core/control/**</Path>","<Path>src/modules/agent/services/terminal/session*.ts</Path>","<Path>src/modules/agent/core/terminal/keyboard*.ts</Path>","<Path>src/modules/agent/core/terminal/paste*.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>src/modules/agent/ui/control/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>native/pty-server/src/session.rs</Path>","<Path>native/pty-server/tests/control*.rs</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>"]
shared_paths: ["<Path>src/modules/agent/services/control/**</Path>","<Path>src/modules/agent/core/control/**</Path>","<Path>src/modules/agent/services/terminal/session*.ts</Path>","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path>","<Path>src/modules/agent/ui/control/**</Path>","<Path>src/modules/agent/i18n.ts</Path>","<Path>native/pty-server/src/session.rs</Path>","<Path>native/pty-server/tests/control*.rs</Path>","<Path>docs/agent-workbench-cli.md</Path>","<Path>main.js</Path>","<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/agent/services/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/core/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/services/terminal/session*.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/terminal/terminal-view.ts</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/ui/control/**</Path> => lead:agent-workbench-integration","<Path>src/modules/agent/i18n.ts</Path> => lead:agent-workbench-integration","<Path>native/pty-server/src/session.rs</Path> => lead:agent-workbench-integration","<Path>native/pty-server/tests/control*.rs</Path> => lead:agent-workbench-integration","<Path>docs/agent-workbench-cli.md</Path> => lead:agent-workbench-integration","<Path>main.js</Path> => lead:agent-workbench-integration","<Path>styles.css</Path> => lead:agent-workbench-integration"]
---

# Ticket T-08：输入仲裁、状态等待与有界读屏闭环

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path>（由实施时真实结果形成，本轮不预填通过）
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；按 Map → 适用项目 Skill → 当前 Ticket 回读。I 负责实施、固定快照、独立双轴审查和完成证据，规划不授权执行。

## 目标与来源

Agent A 通过 HUHU CLI 给 B 提交输入、等状态并读屏/查产物；键盘/粘贴/CLI 不交错，wait 超时或取消不会停止/重发。

现有 TerminalSession.input、paste/keyboard、prompt-port 与原生自动化 runner 可复用，但新协作不是旧一次性业务任务。 当前代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；执行前回读真实源。主验收责任：AC-013、AC-014、AC-015、AC-016、AC-017、AC-018、AC-030；Spec §3/§5 与 ADR-001/008/009 共同约束范围。

## 行为与范围

IN：文本+提交事务队列、原始按键、prompt+wait 活动水位、独立 wait、被动 read 与效果未知。REUSE：T-05 屏幕、T-06 状态、现有输入保护。OUT：任务队列、最终答案关联、主动滚动抓 TUI 历史。

共享接线与计划 CLI 以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 为准。目录下尚不存在的条目是拟新增实现位置，不是既有能力；优先在现有邻近接缝完成。

## 开源参考与实施前核验

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 保存活动/许可/依赖比较和本项目差异。本票优先回读：

- R-01：[Herdr 固定源码与机制](https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01)。
- R-03：[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)。
- R-04：[xterm flow control](https://xtermjs.org/docs/guides/flowcontrol/)。
- K-01：[Herdr 状态检测变更](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。
- K-02：[Herdr 输入与 Windows 修复](https://github.com/herdrdev/herdr/releases/tag/v0.9.5)。
- K-04：[xterm 背压限制](https://xtermjs.org/docs/guides/flowcontrol/)。

陌生功能先检索官方 GitHub 的近两年实际活动、许可、实现/依赖与已知问题，并记录采用或不采用理由。以上是机制参考；不得整包移植或跳过逐文件许可。用户已经要求此步骤，不能只写“已阅读”。

## 有序执行路线

1. 把 GUI 键盘、粘贴、CLI prompt 放入统一有界输入仲裁；文本与 Enter 不被其他输入插入，取消未开始项不能迟到提交。
2. 提交前验证 runtime、前台程序、输入就绪和 blocked；working 且原生可收输入时允许但不承诺模型队列；中文 IME 不误回车。
3. prompt --wait 捕获提交前活动水位，独立 wait 保留当前匹配语义；超时/断线/Ctrl-C 只拆等待，effects unknown 先查询。
4. read 只消费 T-05 快照，标明身份、cursor、截断；跑真实 A→B 主链，回归 existing 材料仅粘贴和 runner 原生答案。

## 验收标准

- [ ] `AC-013`：文本+提交顺序一致；返回输入阶段信息，不宣称任务成功；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-014`：操作不交错成第三条命令；取消未开始输入后不迟到提交；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-015`：明确拒绝；不向权限/登录界面注入任务正文；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-016`：不把旧 idle 当新完成；独立 wait 可立即匹配；已有 working 情况可见；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-017`：结束当前等待；B 继续；不自动重发/停止；查询仍可核对；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-018`：输出有界，身份/截断/位置准确；不主动滚动 TUI 或把屏幕称为完整答案；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-030`：保留现有输入保护；组字不提前提交；复制与中断语义不退化；本票负责完整证明，关联场景依 Spec 验证接缝。
- [ ] `AC-061` 的本票页面部分：完成已绑定 page 的正常、错误、加载/空态、键盘与尺寸检查；T-18 汇总全页合同，本票不能省略局部生产 UI 验收。
- [ ] 所用参考与实际新增/改编依赖可追溯；所属用户说明随行为更新，源码和适用生成物一致；未实施范围不写成已交付。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 竞争与协议 | V-02/V-03/V-06 | 新增 control 黑盒：并发键盘/粘贴/prompt、取消队列、旧 idle/初始 working、断线；pnpm exec vitest run src/modules/agent/core/terminal src/modules/agent/services/prompt-port.test.ts | 输入顺序、阶段、effect 可判定，无额外 Enter 或重发 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path> |
| 真实协作与只读 | V-03/V-08 | 真实 A/B 执行 prompt→wait→read/产物；随后 blocked、超时、Ctrl-C；检查另一终端运行与 TUI 视口 | 等待退出不杀 B；read 不滚屏、不声称完整答案；中文/多行可操作 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path> |
| 原有行为回归 | 既有稳定接缝 | `pnpm exec vitest run src/modules/agent/services/prompt-port.test.ts src/modules/agent/services/prompt-runner.test.ts`；实际改变 TS/TSX 后按 testing 运行 build/lint，涉及 UI 补适用样式/i18n | 正常、负例和原风险保持；不以删测试消除失败 | 同上 |

- **E2E disposition：** required：至少 Codex→Claude 或 Claude→Codex 的真实协作链，并保存 CLI 版本、目标身份、输入回执、等待、终端输出/产物证据；不记录密钥或完整环境。
- **运行环境：** 全部执行者复用 README 的同一 change-workspace；本轮只规划，尚未伪造 Execution Context。I 开始时由 Lead 记录一次实际 workspace/base/head、配置与输入；Lead-owned E2E 在固定快照上执行。
- 新增测试目录/脚本是本票产物，先使其在隔离 fixture 上可运行再记录命令；不能将这里的未来命令当成本轮通过。环境缺失保留 required 待验收，不能以 mock 或退出码 0 的 skip 替代。

## 执行约束

依赖、深度、风险、写集与 Skill 调用以 frontmatter 为准。只写本票边界；共享入口和生成物由 `lead:agent-workbench-integration` 作为唯一整合写入者，在本票 Evidence 中记录实际 diff。普通执行者只改不共享部分；同工作区的共享写入和构建串行，不能因静态 ready 就并发。独立审查者只读。

按绑定的 implement/verify 阶段实际调用 dev 与 ui，记录输入、摘要、轨迹及产出到 Skill Execution Records；仅列技能名不算执行。新增影响到未列路径/Skill 时先由 Lead 修订本票/Map，再继续。

UI 继续使用 DESIGN revision1、DESIGN-0001 与 UI-001/candidate-a。Evidence 必须包含 `Design Conformance`、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001 / PAGE-003、所绑定 AC、真实视口/主题/操作/截图和与原型的差异。原型 mock 不作为生产验收；设计漂移回 P，外部行为冲突回 S。

## 未决事项与风险

错误返回不代表输入未发生；运行代次变化必须失败不能重新定位新 runtime 自动输入。原生 TUI 不支持安全提交时准确拒绝。失败先读现状，不以自动重试修复测试。

- **证据失效：** base/head 或工作副本、公共 schema、依赖版本、相关配置/Provider、输入样本、Skill 或 DESIGN 摘要变化时，回读影响闭包并重跑对应检查；不重复未失效的独立证据。
- **停止与恢复：** 授权/身份/写集不符、高影响合同冲突、来源许可不清或 required 验证不可用时停止受影响分支，保存检查点/原始失败并回对应 owner；不得接管他人锁、默认重发或把 blocked 改 done。

### 未决问题

无。
