---
schema_version: 2
session: "20261104T095541Z"
task: "089-review-t10"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-10"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-10「归物年度报告」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-321、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=low，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/10-belongings-report.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`, `.agents/skills/ui/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
bbfeeaace100f797eca12c30a5fa032e4b71661bbb8d60238cbf7af468c836cd  src/modules/archives/ui/belongings/report/BelongingsReport.dom.test.tsx
59a10d8cc43d79fd1bcd25222d8de5c2385b634277d7e929046a28ae630671f5  src/modules/archives/ui/belongings/report/BelongingsReport.tsx
fef218d40e263c288155822b92c6a06dc29de5faf02962bd8db28abcad1109b1  src/modules/archives/ui/belongings/report/report-i18n.ts
97f4684ab2b7e1a2c74a27bf79b7bf66c5380a94882cfbcc54031fb2caa58cab  src/modules/archives/ui/belongings/BelongingsPage.tsx
2da4755556d86acc4f84c5b62ba1e63baf2dfa7b9eb081f2c23852c0c9a982af  src/modules/archives/core/belongings/statistics.ts
73f28b6b66b2306ce86331b189dd0290d010d86aafcd3d8188fc09fa7c6ed1fa  src/modules/archives/core/belongings/statistics.test.ts
de49d40db6786cd07f5d3763f15b179659cda22f7ff4e2ad3dc80a20ad0efb2e  src/modules/archives/services/generic/belongings.ts
bb81bbba79f9464c95446d9d241cdb415e8e33688cf4da6106447eb87e8d179c  src/modules/archives/services/generic/belongings.test.ts
bcd3ba7acec9a1cafd7232f8c12b8f6ec9be81a6d60c2dbd25da447d2bee45a3  src/modules/archives/api.ts
73ee7c658edd65a26bf22670a46d58dc89f28021e005a117fb464584669c6ada  scripts/ui-review/fixtures/T-10.mjs
50a366eaf3af939bf8b4d661a2e21aa3c77b4a792865535242eed8067823504c  scripts/ui-review/fixtures/T-10.tsx
```
- 输入整体摘要 Input-SHA256：05aaf6da4a18dae561909a1591fb90a4eddfb92aa286b658d390b0e1ee079716
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/070-implement-t10/REPORT.md`（blocked：统计生产者与入口）与 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/088-implement-t10-r2/REPORT.md`。UI 票（design_ref revision 2 页面 BELONGINGS-REPORT）对照 DESIGN 与 UI-001 final 核对 Design Conformance；Lead 已 build:css 后亲跑正式 T-10 runner：passed，48 cases。重点核对年度统计口径（与卡片同一、事件重放、多币种不混算、未知≠0，AC-321 与 AC-304/305 一致性），以及 T-08/T-09/T-18 已验收行为未回退。全仓 lint 当前失败于并行 T-19 的 health 页面文件，不属本票。

## Workspace and Scope
- 工作区：`/home/wta/projects/obsidian-huhu`（workspace_policy current，branch dev，base 29644dc5833bb209e6282f84fa71441a5a1b99d4；README execution-context 锚点）。
- 同一工作区中可能有其他执行者在并行修改其他票的文件；**不要修改、格式化、还原或暂存**你写集以外的任何文件，看到无关 dirty 改动保持原样。
- 禁止任何 Git 写操作（add/commit/stash/checkout/reset/restore/branch），禁止推送与发版。
- 禁止运行 `pnpm run build`、`pnpm run build:css`、`pnpm notices`（它们改写 Lead 独占的 `main.js`/`styles.css`/生成文件）；构建与产物由 Lead 串行执行。可以运行：`pnpm exec vitest run <files>`、`pnpm exec vitest run --project dom <files>`、`pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json`（及 `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json`；不带 -skipLibCheck 的第三方声明错误是仓库既有状态，不算本票失败）、`pnpm run lint`、不写仓库文件的 `pnpm test:*`/`pnpm check:*` 门禁。
- 不安装/升级依赖，除非本票写集明确包含 `package.json`/`pnpm-lock.yaml`（此时只增加本票需要的依赖并在 REPORT 说明）。
- **本任务只读**：不得修改任何业务文件；只写下方 REPORT。可运行只读检查与测试（vitest、tsc --noEmit、lint、只读门禁）以复现结论。
- 固定审查输入见上方“冻结输入”；若发现输入中的文件在你审查期间被改动（内容与哈希不符），停止并以 Status: blocked 报告。

## Acceptance
- 每条 finding 写：严重度（blocker/major/minor）、文件:行、问题、复现方式或证据、建议修正。只报可操作的问题，不报风格偏好。
- 亲自运行至少本票验收相关的定向测试并记录命令与退出码。
- 两轴结论分开写：`## Standards Axis`（Result: pass|request-changes）与 `## Specification Axis`（Result: pass|request-changes）。

## Return
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/089-review-t10/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 089-review-t10、Status），回读后在终端最后一行输出：`DONE 089-review-t10 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/089-review-t10/REPORT.md`。
