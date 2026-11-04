---
schema_version: 2
session: "20261104T095541Z"
task: "075-rereview-t14"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-14"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-14「人物纪事字段与命令」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-502, AC-503、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=medium，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/14-person-journal-data.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
20f3fbf39cb738595ef594d05dc5033eb7dd292055c1eb765bbf466b77213efe  src/modules/archives/core/person-journal/journal.ts
4aa10388653ed171bd45234460970f4f8498a2a6c3f11c5ec286d6aa8b9db27f  src/modules/archives/core/person-journal/preset.ts
a71954d5528c421fca0516e5f41bbdacc423d2f2e75dc3237b42824d51e72a1c  src/modules/archives/core/schema/labels.ts
2be9d4dffc1cda279722c8347ec996ca333f379e4a183a022237798558a0be70  src/modules/archives/i18n.ts
c550c1e7ba88aeaf21213595c0e519a9f33c3eaf1857a5448e4e6c8c4cf92bee  src/modules/archives/services/generic/application.ts
0257c90aa2412669fc5d0904b547be56ff4faa870aaee8ab33846623c0005230  src/modules/archives/services/generic/person-journal.ts
a0fb6b7c4d76c2094128f6d179e07bd69ab482ca184c7d210c6e67ee5b96d5af  src/modules/archives/services/generic/person-journal.test.ts
5d42f6c0527bc251b0addfed7a6e5a51733ed16ce3320991b1b3c7c35f1fbf81  test/golden/archives-v2.test.ts
c587d2c3953f3c9a3f6e0136cd12c1985e776bc4411a653de400bd8c3d9835ae  test/golden/__snapshots__/archives-v2.test.ts.snap
```
- 输入整体摘要 Input-SHA256：08058cc89024553535e83de567cca6365bf0b45a8e731e721a3e86fccb1aa358
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/069-implement-t14/REPORT.md`。核对 DEC-002（不覆盖用户已修改的人物预设，旧实体不被重新解释）、ARCHIVES_COMMANDS 预期哈希写入、同名人物按 entityId 归属、未涉及字段与自由正文逐字不变（AC-502/503）。黄金样本差异须判断是否有意。labels.ts/application.ts/i18n.ts 中其他票已验收部分只复核波及。
- **短复核：** `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/074-review-t14/REPORT.md` 唯一 finding F1（来源登记）已由 Lead 在 docs/third-party/bz.md 追加 `src/people/types.ts`（ManualEvent）→ person-journal 行。代码冻结输入与 074 相同（哈希一致，Lead 已核）。本次只需核对该登记行与文件头/实际采用范围一致，并确认代码输入未变，然后给出两轴结论。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/075-rereview-t14/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 075-rereview-t14、Status），回读后在终端最后一行输出：`DONE 075-rereview-t14 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/075-rereview-t14/REPORT.md`。
