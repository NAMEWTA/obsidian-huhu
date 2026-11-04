---
schema_version: 2
session: "20261104T095541Z"
task: "084-rereview-t15"
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
ba3d6adb5c535eee6226d76648868ef8252202ea79fec6cb978ce67d34082049  src/modules/archives/ui/person/PersonJournal.tsx
ee4df4bf313aa9f9fde8dfce383cbb7901c6f9bd715990a346a0c4421a85ca37  src/modules/archives/ui/person/PersonOverview.tsx
470ef1dbee521e1005961169445311103751fc263f148bc61784a202b9baedc9  src/modules/archives/ui/person/PersonReadingPage.dom.test.tsx
e5eff92012dbd22d7df072336cf97a145d49e759c19f2acdcb21540cf65a9c2a  src/modules/archives/ui/person/PersonReadingPage.tsx
748f111b291932110ce57fee10012bcc34cf8d53c4b418dba06b29a8bcd63a4e  src/modules/archives/ui/generic/ArchivePage.tsx
a36aca31b1dd3d8206d4d2befc175fd6c328dc25c36f634007a6643478bfc178  src/modules/archives/i18n.ts
d35e169837a212a6f92f1433665deeaf17ca7fab42e729ae28b19d2cc2c16f0a  scripts/ui-review/fixtures/T-15.mjs
a8fc3902616a01a3c8c6d0fd29fc61d9a01b0938e96683e78bd8466375c6434e  scripts/ui-review/fixtures/T-15.tsx
```
- 输入整体摘要 Input-SHA256：119c8ebe8755f262bca90fb3e53cc7855a56a03b3abf56bb8415135b2c3b34ec
- **复审：** `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/080-review-t15/REPORT.md` 的复审；修复交接 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/082-repair-t15/REPORT.md`。Lead 已 build:css 后亲跑正式 T-15 runner：passed，48 cases。确认 F1–F5 修复与无回归，重放原 F1/F2 反例与 420px/200% 宽度检查。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/084-rereview-t15/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 084-rereview-t15、Status），回读后在终端最后一行输出：`DONE 084-rereview-t15 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/084-rereview-t15/REPORT.md`。
