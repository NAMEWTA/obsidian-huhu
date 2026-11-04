---
schema_version: 2
session: "20261104T095541Z"
task: "098-review-t20"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-20"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-20「用户文档与整体验收」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-001, AC-901, AC-902, AC-903、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=medium，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/20-docs-overall-acceptance.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
92a758d812dcaef5775bbe6feeca6e9134852a5fad9c9eeb150db89fefe35ab5  docs/README.md
cbce2c99c9d739cb9922905aed4f64093bddd998b54fe5a12201a63700089f96  docs/architecture.md
17956583c228013992e9d598984aab8bb421e077a09f03bff478d3b83854329e  docs/contacts.md
ad1f08947085cb496bc17c1fec9877a379e6803f5a9cea71e6c78e359713b47e  docs/data.md
37d1fce825514d277308794b77d96bb7f180c6543c250f1470b0513e7e67c0c4  docs/navigator.md
811a5e782942c7461813d74ebed7a46db6290b67230357622b9a4523cce03fda  docs/references.md
a7d2268b334ff1cd11a941cbfd12dd099e731896d0933846f42416be9602eeda  docs/safe.md
d9caf4214ec4b2fe25a8040248b5f6095980474921b1231455d51fbbfae9fb92  docs/health.md
21051cc7e78040d8a0c6ac2e638ab16460b97921430c70fe57912c3ea7201470  docs/third-party/bz.md
2945063f84e3623ad9b3e3acb33aea844de202660d91b125a5355f72057c7a16  docs/third-party/licenses/sources.json
9b7162ddc67c9b685be04405db6e3daa817b87a3ed6db14629e610578a8452a0  NOTICE
```
- 输入整体摘要 Input-SHA256：56abc4548a58042a229433ac95ba1839e1742781fc7f14db03c1eb9f5017f8cd
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/097-implement-t20/REPORT.md`（blocked 原因“test:docs 被 080 REPORT 未转义选择器阻塞”已由 Lead 按 LOG-025 处理，现 `pnpm test:docs` 退出 0）。
- **审查重点：** 文档描述与**当前源码**一致（逐项抽查文档中的行为声明对应实现，不得出现未实现能力）；AC-902 所列文档覆盖完整；`docs/third-party/bz.md` 与 `rg -l yeshimei/bz src` 的全部文件头一一对应且描述准确；许可与 NOTICE 门禁。
- **Lead 已执行的整体门禁（2026-11-05，当前工作区）：** build:css、run build、run lint、test:architecture、test:i18n、check:styles、check:bundle、test:license-texts、test:safety-regressions、test:workbench-lifecycle、test:workbench-entry 全部退出 0；pnpm test 568/573 文件通过，6 个失败用例均为 `src/host/desktop/native/host-{editor,control}.integration.test.ts`，在未修改的 HEAD 29644dc 副本上同样失败（既有基线）。你可复核但不必重跑全部。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/098-review-t20/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 098-review-t20、Status），回读后在终端最后一行输出：`DONE 098-review-t20 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/098-review-t20/REPORT.md`。
