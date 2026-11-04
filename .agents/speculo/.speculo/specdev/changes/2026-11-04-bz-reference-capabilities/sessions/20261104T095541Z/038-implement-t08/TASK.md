---
schema_version: 2
session: "20261104T095541Z"
task: "038-implement-t08"
kind: implementation
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-08"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为实现执行者（codex，gpt-6.1-sol，medium）实现 Ticket T-08「归物预设、生命周期命令与统一统计」，使其验收标准 AC-301, AC-302, AC-303, AC-304, AC-305, AC-313 可被验证。成功定义：本票全部验收项有你实际运行的测试/检查证据；不越出写集；REPORT 交回候选。你不能宣称票据 done，正式状态与 Evidence 由 Lead 验收后写入。

## Inputs
- **实际调用的 Work**：先读并执行 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`（含其必读 `references/implementation-procedure.md`、`references/execution-preflight.md`；TDD 分支按需）。预检中 Ready/授权/Execution Context/依赖已由 Lead 核验通过；你负责实现、自测与返回事实，不写 Evidence。
- **当前 Ticket**：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/08-belongings-domain.md`（frontmatter 的写集、依赖、Skill 绑定为准）。
- **必需项目 Skill**：`.agents/skills/dev/SKILL.md`——实现前完整读取并按其规则执行，在 REPORT 中逐条写出你实际应用了哪些规则（不能只写“已阅读”）。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **依赖产物：** T-04（`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/evidence/T-04.md`）、T-03 已 done；归物变更事件经 ModuleContext.events 发布。业务理念改编 bz d76a087 `src/belongings/types.ts`、`shared.ts`、`report.ts`（金额改十进制字符串＋币种，不复制浮点与币种符号方案）。黄金样本若有意变化，在 REPORT 列出差异。

## Workspace and Scope
- 工作区：`/home/wta/projects/obsidian-huhu`（workspace_policy current，branch dev，base 29644dc5833bb209e6282f84fa71441a5a1b99d4；README execution-context 锚点）。
- 同一工作区中可能有其他执行者在并行修改其他票的文件；**不要修改、格式化、还原或暂存**你写集以外的任何文件，看到无关 dirty 改动保持原样。
- 禁止任何 Git 写操作（add/commit/stash/checkout/reset/restore/branch），禁止推送与发版。
- 禁止运行 `pnpm run build`、`pnpm run build:css`、`pnpm notices`（它们改写 Lead 独占的 `main.js`/`styles.css`/生成文件）；构建与产物由 Lead 串行执行。可以运行：`pnpm exec vitest run <files>`、`pnpm exec vitest run --project dom <files>`、`pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json`（及 `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json`；不带 -skipLibCheck 的第三方声明错误是仓库既有状态，不算本票失败）、`pnpm run lint`、不写仓库文件的 `pnpm test:*`/`pnpm check:*` 门禁。
- 不安装/升级依赖，除非本票写集明确包含 `package.json`/`pnpm-lock.yaml`（此时只增加本票需要的依赖并在 REPORT 说明）。
- **允许写入（本票 writable_paths）**：`src/modules/archives/core/**`, `src/modules/archives/services/**`, `src/modules/archives/api.ts`, `test/golden/archives-v2.test.ts`, `test/golden/__snapshots__/**`，以及新建的就近测试文件（位于上述路径内）。
- **Lead 授权你在本任务期间独占编辑的共享文件**：`src/modules/archives/i18n.ts`；只做本票必需的最小修改。
- **只读**：无，以及其他全部仓库文件。
- 若实现必须改动上述以外的路径，先停止该部分，在 REPORT 写明路径与原因并以 Status: blocked 交回，不要擅自扩大写集。
- 复制或改编 bz 代码时，在文件头写上游仓库、提交 d76a087、路径、原版权 `Copyright (c) 2026 叫我包仔` 与修改说明，并在 REPORT 列出（Lead 汇总到 docs/third-party/bz.md，除非本票写集含该文件）。

## Acceptance
- 运行本票「验证方法」表中适用于非构建的命令（vitest 定向、tsc --noEmit、lint、相关 `pnpm test:*` 门禁），全部退出码 0；每条命令及退出码写入 REPORT。
- 需要 `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner 的检查由 Lead 执行，你在 REPORT 中列为“未执行，owner Lead”。
- 不删除或弱化既有测试与断言；不提高任何阈值。
- 双轴独立审查由另一 reviewer 执行，Lead 最终验收。

## Return
- 交付时一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/038-implement-t08/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`；首部 Session: 20261104T095541Z、Task: 038-implement-t08、Status），列出：修改/新增的全部文件、关键决定、命令与退出码、未验证项、问题。写后回读。
- 然后在终端最后一行输出：`DONE 038-implement-t08 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/038-implement-t08/REPORT.md`。
- 有阻塞问题时同样写 REPORT（Status: blocked）并输出上面一行；不要等待交互回答。
