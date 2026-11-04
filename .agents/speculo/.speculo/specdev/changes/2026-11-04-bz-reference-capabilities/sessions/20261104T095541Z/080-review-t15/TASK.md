---
schema_version: 2
session: "20261104T095541Z"
task: "080-review-t15"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-15"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-15「人物阅读层页面」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-501, AC-504、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=medium，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/15-person-reading-page.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`, `.agents/skills/ui/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
e63ca9fe4a8c6e442edaf691f6ce1aa885bba082a01dfdca44af7f532fecafdf  src/modules/archives/ui/person/common.ts
82caa24793fc91c6fbbcbf37d8c22d97dab65ac36fe9a695df03948dc1872825  src/modules/archives/ui/person/PersonJournal.tsx
1aef12b2169632ed4ec8f8bd3ad44ac59938c42ae96c27d5e5ad6659f759bc05  src/modules/archives/ui/person/PersonReadingPage.dom.test.tsx
12b4bd1b1d7ac163aec315f206b602d831b9cc5b38e59fa5585e5562cebc9ab0  src/modules/archives/ui/person/PersonReadingPage.tsx
950f05efeeea7610cfb9c962c47ec4db4a3429679e4d24622ad07c0c5889861c  src/modules/archives/ui/generic/ArchivePage.tsx
970ee5f1e74443ef5326c7cf49d8a5ba0bb36ce4aebcf2a255cb26422a1907db  src/modules/archives/i18n.ts
20f6409da0838f4f0078180d4c5e087943afaacbf1120155d6a803e5749f7ef6  scripts/ui-review/fixtures/T-15.mjs
c03526af6c4a537e5b5e77f894719f9a6ef2a4e7bea0012c1373072399e90f3f  scripts/ui-review/fixtures/T-15.tsx
```
- 输入整体摘要 Input-SHA256：5b741d65161f1f43695212d1190c08a89a638bf3f0d1a7ccda0214e445d686e0
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/077-implement-t15/REPORT.md`（blocked：入口）与 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/078-implement-t15-r2/REPORT.md`。UI 票（design_ref revision 2 页面 PERSON-READING）对照 DESIGN 与 UI-001 final 核对 Design Conformance。**Lead 已 build:css 后亲跑正式 T-15 runner：failed（1 case），AssertionError 'main: usable input content width 44'**——请复现并在 findings 中定位；同时完成其余双轴审查，以便合并为一次修复。来源登记：Lead 已在 bz.md 追加 src/people/ui.ts 交互复刻行（不在冻结输入，核对内容）。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/080-review-t15/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 080-review-t15、Status），回读后在终端最后一行输出：`DONE 080-review-t15 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/080-review-t15/REPORT.md`。
