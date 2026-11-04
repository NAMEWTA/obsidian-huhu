---
schema_version: 2
session: "20261104T095541Z"
task: "061-review-t09"
kind: review
change: "2026-11-04-bz-reference-capabilities"
ticket: "T-09"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本票实现）对 Ticket T-09「归物本页面与状态流转」的实现候选做双轴审查：**标准轴**（代码质量、正确性、安全、并发/生命周期、项目规范 AGENTS.md 与 dev/ui Skill）与**规范轴**（是否满足 Ticket 与 Spec 的验收 AC-311, AC-312、范围 IN/OUT、写集）。成功定义：两轴分别给出 pass 或 request-changes 及可复现的 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md` 与 `.agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md`（本票 risk=medium，适用时展开）。
- 当前 Ticket：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ticket/09-belongings-page.md`；必需项目 Skill：`.agents/skills/dev/SKILL.md`, `.agents/skills/ui/SKILL.md`。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。
- **冻结输入（working-tree 快照，base 29644dc5833bb209e6282f84fa71441a5a1b99d4）**：审查以下文件当前内容；对已跟踪文件可用 `git diff 29644dc -- <file>` 查看改动，未跟踪文件为新增。开始前用 `sha256sum` 核对，不符即 blocked。
```text
5bb76e10c9ceee364d741c3afd04453931779379bfe8657beac85c050fc1cf1a  src/modules/archives/core/belongings/decimal.ts
a46e155252924f3f7815b0197bd97e9cf954ea72e9e56d02ef6a02918c1a7b40  src/modules/archives/core/belongings/lifecycle.test.ts
eae68a6b6f85cd365e291b862bab44e0725bd37111f53b5106f092998c929970  src/modules/archives/core/belongings/lifecycle.ts
c8ea3053f83e3110d346417c556dda2d9c19195e8b08491811cc79d74f5a95fc  src/modules/archives/core/belongings/model.ts
e5d9cccf59d630ffc93fbb6871f69a5683c6570c5ba7844933d808ae1e837305  src/modules/archives/core/belongings/preset.ts
988f41581608c2390df926998d92bd1bd97557fef6fc56efcd5ac8ae003b12a4  src/modules/archives/core/belongings/statistics.test.ts
bb30df248b6977b8d05ed19b3aa7c22d8fff517917e6f03fefb5be1548e7252d  src/modules/archives/core/belongings/statistics.ts
2a1e1a8c880810575457971c104a48212e2338c4fbc7b4eca7a133c10ddc4a43  src/modules/archives/ui/belongings/BelongingsPage.dom.test.tsx
4bdd16f95a58343351f9422efeb5d970bf933aea78704c40ba5c8d25c75d9c2c  src/modules/archives/ui/belongings/BelongingsPage.tsx
d57dd0366ef123f4cf1cc0b8cdb53a11fa77fbbf48d743b9ad68df650c533317  src/modules/archives/api.ts
d07d83b2d8b371fb093b47ed4cb995677319ff0a97cd8095bf625f974f4ac4cc  src/modules/archives/i18n.ts
ba882d3442a145d118a6ade8d14ec3ab0173d2c3b7124ab185f09d63d42c6f93  src/modules/archives/services/generic/belongings.ts
272469c75c4d23d59d9f878d675a0b401f3a128b3a989071c5930c5d5ae78b8b  src/modules/archives/services/generic/belongings.test.ts
c13b1ca1a5e976edbd2fb38e9d1b252855a7c1dad1095b03f84221d30ec012c4  src/modules/archives/services/generic/belongings.dom.test.tsx
0fdce13cd130a5adbd2cd51cde87c8efac534ee0edacfe7015bec16e046c193e  src/modules/archives/services/generic/entities.ts
bff5fefd307dbd82b2728ed5930f5b45f6ee8f24ff55d875905b096d701b45d4  src/modules/archives/services/generic/workbench.ts
cefa1c7c76c8cb8b610bc98cfc836c75d3464da0716a89ec7c97daa1e882462b  src/modules/archives/ui/generic/workbench-page.tsx
3a8b02a95e550d3965d4c47774776a3a315f23c5585a8008a1749255ebcea6ab  scripts/ui-review/fixtures/T-09.mjs
bde7ec4b0a0453b64916f7780800b208864d7545891743b3fec33ae9d3bf5887  scripts/ui-review/fixtures/T-09.tsx
```
- 输入整体摘要 Input-SHA256：9f43a52358baee6bb0ed4c25612b79ba18019b1c66909f06198371e0cc8b67c8
- 实现交接：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/054-implement-t09/REPORT.md`（blocked：入口与补偿命令）与 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/056-implement-t09-r2/REPORT.md`。UI 票（design_ref revision 2 页面 BELONGINGS）对照 DESIGN 与 UI-001 final 核对 Design Conformance；risk 含领域撤销命令（CAS、过期、返库周期恢复），展开 risk-review。Lead 已 build:css 后亲跑 T-09 UI runner（temp/ui-review/T-09/result.json）。T-08 已验收的领域行为只复核是否回退。

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
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/061-review-t09/REPORT.md`（模板：`.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 061-review-t09、Status），回读后在终端最后一行输出：`DONE 061-review-t09 <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/061-review-t09/REPORT.md`。
