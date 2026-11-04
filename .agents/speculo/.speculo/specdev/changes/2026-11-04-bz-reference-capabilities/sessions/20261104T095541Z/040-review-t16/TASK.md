---
schema_version: 2
session: "20261104T095541Z"
task: "040-review-t16"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-16"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-16「health 模块、provider 契约与只读扫描编排」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-601, AC-602, AC-603、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=high，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/16-health-module-core.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
b3843db5c7e961eef3f41487c482b0ccf7884c6cbd988056175338ea003f1d9e  src/modules/health/api.ts
5942f0834fa0aef041cc14df75bda1c56b89674685a73ab657a52a5a540d1ff4  src/modules/health/core/scanner.test.ts
629179d2323b317e3c60a029fc72e444c8d8adf2c78caa21d4231b2796aa6c4b  src/modules/health/core/scanner.ts
698072a65e9d5b2c570066cbc4bbfb357d86dadd83674f0756e50cff5fd36919  src/modules/health/i18n.ts
46303a09e0423696db0faccd1b4090ecd43286e02812af20b5b2d10d94710350  src/modules/health/manifest.ts
a1929b374faa225a303abaa7811c5ed28da589e2ac4de997e7533f432abd5464  src/modules/health/module.test.ts
7ceef2ff7422be71e5cee3b497079a2fecbce498d3609f79b4130992193f5ce3  src/modules/health/module.ts
95ddc7ebe8e60e3c176309e2f83d2513785884eaea79165c82b9a2abbb40f567  src/modules/health/settings.ts
48a26a9bac15fb2ce5d7bd1f15028625577d1d420b3fb8fb35d1ec81d12348f6  src/app/contracts/module.ts
f48baadaac00eb80de65be91bc1ce04349a9ad8705e50ade9357dcc2ab350891  src/app/manifests.ts
8db97a11f92b607a1da026ff373edd5e134081eab80fb992622c3f2a1004845e  src/shared/i18n/huhu.ts
cd3606d5144cb2316e8fe2f0949ffffc838ad9bafe87e29d757a66e8ca7dd9af  scripts/module-strings.ts
5662d6c21e8ca11c4433df7b5624ce5b45b0b2c7e01417df43b99e6d3ae73420  scripts/bundle-budget.json
```
- 输入整体摘要 Input-SHA256：438c131d4456eea1bcd3b0b9f7ea7fb74d8c66be66eb8080b9dfffd082aec9cd
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/033-implement-t16/REPORT.md`、`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/039-implement-t16-r2/REPORT.md`。risk=high（全库只读扫描零写入、取消与锁定语义），展开 risk-review；核对 bundle-budget.json 只新增 health 条目。`src/app/contracts/module.ts` 含 T-03 已验收的 events 字段，只审 ModuleId 增量。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/040-review-t16/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 040-review-t16、Status），回读后在终端最后一行输出：`DONE 040-review-t16 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/040-review-t16/REPORT.md`。
