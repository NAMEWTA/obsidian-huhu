---
schema_version: 2
session: "20261104T095541Z"
task: "104-final-fix-t15"
kind: implementation
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-15"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为实现执行者（codex，gpt-6.1-sol，medium）实现 Ticket T-15「人物阅读层页面」，使其验收标准 AC-501, AC-504 可被验证。成功定义：本票全部验收项有你实际运行的测试/检查证据；不越出写集；REPORT 交回候选。你不能宣称票据 done，正式状态与 Evidence 由 Lead 验收后写入。

## Inputs
- **实际调用的 Work**：先读并执行 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`（含其必读 `references/implementation-procedure.md`、`references/execution-preflight.md`；TDD 分支按需）。预检中 Ready/授权/Execution Context/依赖已由 Lead 核验通过；你负责实现、自测与返回事实，不写 Evidence。
- **当前 Ticket**：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/15-person-reading-page.md`（frontmatter 的写集、依赖、Skill 绑定为准）。
- **必需项目 Skill**：`.agents/skills/dev/SKILL.md`, `.agents/skills/ui/SKILL.md`——实现前完整读取并按其规则执行，在 REPORT 中逐条写出你实际应用了哪些规则（不能只写“已阅读”）。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **UI 票约定（Lead）：** 先读 `.agents/speculo/workflows/specdev/common/rules/design-contract.md`、已批准 change DESIGN `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/DESIGN.md`（revision 2）与原型 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-001/final/`（index.html/styles.css/app.js），按本票 design_ref 的页面与状态实现，**不重新选风格**；用生产组件（`src/ui/components/**`、`src/ui/components/huhu/**`）与语义 token。原型 mock 不等于生产实现。
- **UI runner fixture：** Lead 授权你新建/修改 `scripts/ui-review/fixtures/T-15.mjs` 与 `scripts/ui-review/fixtures/T-15.tsx`（参照现有 T-23…T-27 fixture 的结构），覆盖本票页面的宽/窄、亮/暗、中/英、长文本、键盘与 reduced-motion 场景。runner 依赖构建出的 styles.css，由 Lead 构建后运行：`node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out temp/ui-review/T-15`；你可在 REPORT 中说明预期观察。
- 在 REPORT 中写一段 Design Conformance 候选：页面 ID、已实现状态清单、与 DESIGN 的差异（如有）。
- **G-FINAL 修复派遣（Lead 重新打开 T-15）：** 复审 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/103-final-rereview/REPORT.md` 的 F2（minor）：`scripts/ui-review/fixtures/T-15.mjs` 的连续点击缺少渲染就绪等待，正式 runner 失败（Lead 复跑 3 次均 failed，结果见 temp/ui-review/T-15-r1..r3/result.json）。修复 fixture 的等待逻辑（等待真实可观察的渲染完成条件，不用固定 sleep，不弱化断言）；若发现是产品组件的真实时序缺陷，修产品代码并补 DOM 回归。修复后用 runner `--check` 自测，正式矩阵由 Lead 连续跑多次确认稳定。上轮交接 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/082-repair-t15/REPORT.md`。

## Workspace and Scope
- 工作区：`/home/wta/projects/obsidian-huhu`（workspace_policy current，branch dev，base 29644dc5833bb209e6282f84fa71441a5a1b99d4；README execution-context 锚点）。
- 同一工作区中可能有其他执行者在并行修改其他票的文件；**不要修改、格式化、还原或暂存**你写集以外的任何文件，看到无关 dirty 改动保持原样。
- 禁止任何 Git 写操作（add/commit/stash/checkout/reset/restore/branch），禁止推送与发版。
- 禁止运行 `pnpm run build`、`pnpm run build:css`、`pnpm notices`（它们改写 Lead 独占的 `main.js`/`styles.css`/生成文件）；构建与产物由 Lead 串行执行。可以运行：`pnpm exec vitest run <files>`、`pnpm exec vitest run --project dom <files>`、`pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json`（及 `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json`；不带 -skipLibCheck 的第三方声明错误是仓库既有状态，不算本票失败）、`pnpm run lint`、不写仓库文件的 `pnpm test:*`/`pnpm check:*` 门禁。
- 不安装/升级依赖，除非本票写集明确包含 `package.json`/`pnpm-lock.yaml`（此时只增加本票需要的依赖并在 REPORT 说明）。
- **允许写入（本票 writable_paths）**：`src/modules/archives/ui/person/**`, `src/modules/archives/ui/generic/RecordEditor.tsx`, `src/modules/archives/ui/generic/ArchivePage.tsx`, `scripts/ui-review/fixtures/T-15.mjs`, `scripts/ui-review/fixtures/T-15.tsx`，以及新建的就近测试文件（位于上述路径内）。
- **Lead 授权你在本任务期间独占编辑的共享文件**：`src/modules/archives/i18n.ts`；只做本票必需的最小修改。
- **只读**：`src/modules/archives/core/**`, `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/DESIGN.md`, `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-001/design-system.md`, `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-001/final/**`, `.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md`，以及其他全部仓库文件。
- 若实现必须改动上述以外的路径，先停止该部分，在 REPORT 写明路径与原因并以 Status: blocked 交回，不要擅自扩大写集。
- 复制或改编 bz 代码时，在文件头写上游仓库、提交 d76a087、路径、原版权 `Copyright (c) 2026 叫我包仔` 与修改说明，并在 REPORT 列出（Lead 汇总到 docs/third-party/bz.md，除非本票写集含该文件）。

## Acceptance
- 运行本票「验证方法」表中适用于非构建的命令（vitest 定向、tsc --noEmit、lint、相关 `pnpm test:*` 门禁），全部退出码 0；每条命令及退出码写入 REPORT。
- 需要 `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner 的检查由 Lead 执行，你在 REPORT 中列为“未执行，owner Lead”。
- 不删除或弱化既有测试与断言；不提高任何阈值。
- 双轴独立审查由另一 reviewer 执行，Lead 最终验收。

## Return
- 交付时一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/104-final-fix-t15/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`；首部 Session: 20261104T095541Z、Task: 104-final-fix-t15、Status），列出：修改/新增的全部文件、关键决定、命令与退出码、未验证项、问题。写后回读。
- 然后在终端最后一行输出：`DONE 104-final-fix-t15 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/104-final-fix-t15/REPORT.md`。
- 有阻塞问题时同样写 REPORT（Status: blocked）并输出上面一行；不要等待交互回答。
