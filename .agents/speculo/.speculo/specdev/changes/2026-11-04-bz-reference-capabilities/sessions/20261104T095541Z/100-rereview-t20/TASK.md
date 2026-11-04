---
schema_version: 2
session: "20261104T095541Z"
task: "100-rereview-t20"
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
01ea45bc06e1ff1ae4319513362ce96bc49430029a0d9617f27a2b2d35af3140  docs/navigator.md
811a5e782942c7461813d74ebed7a46db6290b67230357622b9a4523cce03fda  docs/references.md
a7d2268b334ff1cd11a941cbfd12dd099e731896d0933846f42416be9602eeda  docs/safe.md
d9caf4214ec4b2fe25a8040248b5f6095980474921b1231455d51fbbfae9fb92  docs/health.md
43cfb4c2c5126d2eee8b502a8da0eaad167e77ae975a3bd2589a140f607efda6  docs/third-party/bz.md
2945063f84e3623ad9b3e3acb33aea844de202660d91b125a5355f72057c7a16  docs/third-party/licenses/sources.json
9b7162ddc67c9b685be04405db6e3daa817b87a3ed6db14629e610578a8452a0  NOTICE
3bc9c0f29f2eb5981c7be49451254340dd2ffba68dc9105e72e916dffbca4bbd  main.js
7615bab3264009a0c0fea2bab4d7d8091975ea7d0ef96421940a6c12225b89ab  .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/LOG.md
```
- 输入整体摘要 Input-SHA256：18a65f5ccd5c8b4f6649ffc5b2fc6ec4956e978f0fef196fba9bed97df96f84f
- **复审：** `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/098-review-t20/REPORT.md` 的复审；修复交接 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/099-repair-t20/REPORT.md`。Lead 已：修正 LOG-025 选择器（F2，`pnpm test:docs` 0）；文档定稿后重新 `pnpm run build`（0）使 main.js 横幅与 NOTICE 同步（F3），并复跑 test:docs、check:notices、test:license-texts、check:bundle、release-artifacts 测试均 0。确认 F1–F3 关闭与无回归。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/100-rereview-t20/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 100-rereview-t20、Status），回读后在终端最后一行输出：`DONE 100-rereview-t20 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/100-rereview-t20/REPORT.md`。
