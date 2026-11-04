---
schema_version: 2
session: "20261104T095541Z"
task: "106-scale-fix-t04"
kind: implementation
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-04"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为实现执行者（codex，gpt-6.1-sol，medium）实现 Ticket T-04「文件变化适配与 archives 首个接入」，使其验收标准 AC-121, AC-122, AC-123, AC-124 可被验证。成功定义：本票全部验收项有你实际运行的测试/检查证据；不越出写集；REPORT 交回候选。你不能宣称票据 done，正式状态与 Evidence 由 Lead 验收后写入。

## Inputs
- **实际调用的 Work**：先读并执行 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`（含其必读 `references/implementation-procedure.md`、`references/execution-preflight.md`；TDD 分支按需）。预检中 Ready/授权/Execution Context/依赖已由 Lead 核验通过；你负责实现、自测与返回事实，不写 Evidence。
- **当前 Ticket**：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/04-file-change-adapter.md`（frontmatter 的写集、依赖、Skill 绑定为准）。
- **必需项目 Skill**：`.agents/skills/dev/SKILL.md`——实现前完整读取并按其规则执行，在 REPORT 中逐条写出你实际应用了哪些规则（不能只写“已阅读”）。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **规模验收修复（Lead 重新打开 T-04，plan_revision 15）：** `pnpm accept:archives-v2-scale` 失败于 `import_strict.default.equal(first.isComplete, true)`（scripts/accept-archives-v2-scale.ts 首次 query 后），且在未修改的 HEAD 29644dc 导出副本上同样失败（Lead 已复现），因此本票“规模无退化”从未被实测。任务：(1) 先诊断根因——是脚本夹具/调用方式与当前索引契约不符（例如首次 query 前未等待索引就绪、分页/limit 语义变化），还是 archives 索引完整性判定（core/generic 的 query/index）真实缺陷；写出证据。(2) 做最小修复：脚本问题改脚本（使其等待真实就绪信号，不得删除/放宽 isComplete 或其他断言与时间/内存阈值）；产品缺陷改 core/generic 并补单测。(3) 跑通 `pnpm accept:archives-v2-scale`（退出 0），在 REPORT 记录实际规模指标；并在 /tmp 的 HEAD 副本上套用同一脚本修复对照基线指标，说明本 change 无退化。授权写 `scripts/accept-archives-v2-scale.ts`、`src/modules/archives/core/generic/**`。保持 archives 其他测试全绿。

## Workspace and Scope
- 工作区：`/home/wta/projects/obsidian-huhu`（workspace_policy current，branch dev，base 29644dc5833bb209e6282f84fa71441a5a1b99d4；README execution-context 锚点）。
- 同一工作区中可能有其他执行者在并行修改其他票的文件；**不要修改、格式化、还原或暂存**你写集以外的任何文件，看到无关 dirty 改动保持原样。
- 禁止任何 Git 写操作（add/commit/stash/checkout/reset/restore/branch），禁止推送与发版。
- 禁止运行 `pnpm run build`、`pnpm run build:css`、`pnpm notices`（它们改写 Lead 独占的 `main.js`/`styles.css`/生成文件）；构建与产物由 Lead 串行执行。可以运行：`pnpm exec vitest run <files>`、`pnpm exec vitest run --project dom <files>`、`pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json`（及 `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json`；不带 -skipLibCheck 的第三方声明错误是仓库既有状态，不算本票失败）、`pnpm run lint`、不写仓库文件的 `pnpm test:*`/`pnpm check:*` 门禁。
- 不安装/升级依赖，除非本票写集明确包含 `package.json`/`pnpm-lock.yaml`（此时只增加本票需要的依赖并在 REPORT 说明）。
- **允许写入（本票 writable_paths）**：`src/host/obsidian/file-changes*.ts`, `src/modules/archives/services/**`, `scripts/accept-archives-v2-scale.ts`, `src/modules/archives/core/generic/**`，以及新建的就近测试文件（位于上述路径内）。
- **Lead 授权你在本任务期间独占编辑的共享文件**：`src/app/main.ts`, `src/modules/archives/module.ts`；只做本票必需的最小修改。
- **只读**：`src/modules/navigator/platform/vault-index.ts`, `src/modules/versioning/**`，以及其他全部仓库文件。
- 若实现必须改动上述以外的路径，先停止该部分，在 REPORT 写明路径与原因并以 Status: blocked 交回，不要擅自扩大写集。
- 复制或改编 bz 代码时，在文件头写上游仓库、提交 d76a087、路径、原版权 `Copyright (c) 2026 叫我包仔` 与修改说明，并在 REPORT 列出（Lead 汇总到 docs/third-party/bz.md，除非本票写集含该文件）。

## Acceptance
- 运行本票「验证方法」表中适用于非构建的命令（vitest 定向、tsc --noEmit、lint、相关 `pnpm test:*` 门禁），全部退出码 0；每条命令及退出码写入 REPORT。
- 需要 `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner 的检查由 Lead 执行，你在 REPORT 中列为“未执行，owner Lead”。
- 不删除或弱化既有测试与断言；不提高任何阈值。
- 双轴独立审查由另一 reviewer 执行，Lead 最终验收。

## Return
- 交付时一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/106-scale-fix-t04/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`；首部 Session: 20261104T095541Z、Task: 106-scale-fix-t04、Status），列出：修改/新增的全部文件、关键决定、命令与退出码、未验证项、问题。写后回读。
- 然后在终端最后一行输出：`DONE 106-scale-fix-t04 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/106-scale-fix-t04/REPORT.md`。
- 有阻塞问题时同样写 REPORT（Status: blocked）并输出上面一行；不要等待交互回答。
