---
schema_version: 2
session: "20261104T095541Z"
task: "045-review-t08"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-08"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-08「归物预设、生命周期命令与统一统计」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-301, AC-302, AC-303, AC-304, AC-305, AC-313、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=high，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/08-belongings-domain.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
5bb76e10c9ceee364d741c3afd04453931779379bfe8657beac85c050fc1cf1a  src/modules/archives/core/belongings/decimal.ts
a46e155252924f3f7815b0197bd97e9cf954ea72e9e56d02ef6a02918c1a7b40  src/modules/archives/core/belongings/lifecycle.test.ts
e088f121c856dd7187035a94b692023d58b6d85288f07efd89d5e72be342524c  src/modules/archives/core/belongings/lifecycle.ts
20e35aa15b508827ef8fcf73ef6fe8ca7ecbf9e68e7f0d9d89560138a69cd713  src/modules/archives/core/belongings/model.ts
417dd0d6419879955e44db22b4ca573ab8a4a53fb44a1c3c18af199e90a6582a  src/modules/archives/core/belongings/preset.ts
7f1f13ff171a252a7edc1d5bb506e594d853c0119e79fb407226b010597d9423  src/modules/archives/core/belongings/statistics.test.ts
52b34828d5d257cb8e385dcd0ba050ceb07a7a3b33c4e41fcccd4bc8b74f3ecb  src/modules/archives/core/belongings/statistics.ts
2236f901dfe0d67283438f82edf4f670f01b0539c09872fb35826d960484b917  src/modules/archives/services/generic/belongings.ts
35af95808a58592091ec2da3da0cdd9208c5c700f4835827914ac61ca9bc6f4c  src/modules/archives/services/generic/belongings.test.ts
3a8806d0369be3b7f1dc7d0c156ef29d270d418eb3ec8379e9ef111d9a917a5f  src/modules/archives/api.ts
f5c137baaf4aec3ac01b71a44da7ed568eadcfc2335a2f98a73828a1f791d142  src/modules/archives/core/schema/labels.ts
acf1be5cf9649c8ca438af7b084313921a99085e6efe3817c19b1fbd08f7f887  src/modules/archives/core/schema/presets.ts
e8d32b30ceff863f32d1181e7f7b4c1b8add090cb63aa5ad66266400363a5017  src/modules/archives/i18n.ts
3399fec7dd55e4459d918e509a8b9a388a40d1c267f9885cd6c04a7b77c34188  src/modules/archives/module.ts
a6efc3d086c6e0f0fe6904b8efd2c0d61da5b656684c4654b811c29aacbfe1ad  src/modules/archives/services/generic/application.ts
20842326cb3bd7c512df8e297c46180c2208365004d0aa7049127cc55a86addd  src/modules/archives/services/generic/entities.ts
7b508be8231e12d14bbeb018cbf710531da5a9653398726a207b88c716c8fdac  src/modules/archives/services/generic/recovery.ts
309c026af2fea1f3dfd3b0c8ee34204d5af15a589626654b46ad907cae053b57  src/modules/archives/services/generic/runtime.ts
369246f1a231db3b1f2cd25a2a89039ba739e0a0931a2a7bde1d9184feb66dc7  test/golden/archives-v2.test.ts
f39a76465611f3278913eacc1ed19e7c6d77a8175f47886dc8fa772f2efb50a5  test/golden/__snapshots__/archives-v2.test.ts.snap
7866b035d9eae297bfa136d3b9e4307494bed6367a3769f184cc1af99dd3e8b1  docs/third-party/bz.md
```
- 输入整体摘要 Input-SHA256：c1990bac2ac008fee5526ee7036c89e221c44189bac4f2a0f010e07bfbca5200
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/038-implement-t08/REPORT.md`。risk=high（金额/日期口径、历史重放、预设升级不覆盖用户修改 DEC-002、幂等与 CAS），展开 risk-review。黄金样本快照差异须逐项判断是否有意。Lead 已在 bz.md 新增 belongings 两条改编登记，一并核对。runtime.ts/module.ts/RecordEditor 中 T-02/T-04 已验收部分只复核波及。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/045-review-t08/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 045-review-t08、Status），回读后在终端最后一行输出：`DONE 045-review-t08 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/045-review-t08/REPORT.md`。
