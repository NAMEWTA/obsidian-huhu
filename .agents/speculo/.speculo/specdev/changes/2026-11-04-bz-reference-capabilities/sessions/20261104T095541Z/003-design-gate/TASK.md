---
schema_version: 2
session: "20261104T095541Z"
task: "003-design-gate"
kind: prototype
change: "2026-11-04-bz-reference-capabilities"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：执行 G-DESIGN——按 P 原型 Work 为本 change 产出 change DESIGN 与 5 个 UI 原型包：UI-001 密码本（快速取密＋三段式工作区）、UI-002 归物本（页面＋年度报告）、UI-003 书页日记（阅读＋搜索＋书内写作）、UI-004 人物阅读层、UI-005 数据体检页面。每包**只出 1 个候选**，直接以 bz 最新原型为蓝本，用虎虎生产组件语义与项目设计基线 token 复刻（用户决定 LOG-013：用户已预先批准全部原型，无需逐个审批；批准记录引用 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/LOG.md` 的 LOG-013）。

## Inputs
- **实际调用的 Work**：读并执行 `.agents/speculo/workflows/specdev/specdev-p-prototype/SKILL.md` 及其流程中声明的 references/assets/scripts；必读 `.agents/speculo/workflows/specdev/common/rules/design-contract.md`。
- 项目设计基线：`.agents/speculo/.speculo/specdev/design/DESIGN.md`（当前 DESIGN-0002）；已有基线，**不**发布或修改永久基线，只在本 change DESIGN 记录 delta。
- 项目界面规则：`.agents/skills/ui/SKILL.md`；设计系统文档 `docs/design-system.md`；组件 `src/ui/components/`、`src/ui/components/huhu/`。
- bz 原型蓝本（d76a087）：`prototypes/password-vault/`、`prototypes/belongings/`、`prototypes/diary/`、`prototypes/people/`；体检参考 `src/checkup/ui.ts`；日记 `docs/adr/adr-0230-diary-book-ui.md`。原型中图片素材不要复制（许可不明），用占位。
- Spec 中各页面的交互/状态行为（第 2–6 节与 AC-2xx/3xx/4xx/5xx/6xx）必须体现为原型状态；页面 ID 与验收 ID 写入 DESIGN，供 UI 票 design_ref 绑定。
- 项目指令：`AGENTS.md`（必须遵守：模块经 api.ts 互访、t() 双语、只做被要求改动、不提交）。
- SpecDev 运行合同：`.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`。
- Tickets Map（含总体实施背景与项目 Skill 矩阵）：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`
- Spec：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`；ADR：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/ADR.md`；CONTEXT：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/CONTEXT.md`；Goal Plan：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`
- bz 复刻参考固定提交：https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 （MIT；可用 `gh api repos/yeshimei/bz/contents/<path>?ref=d76a0870329403247917a00c43019e203a2560a4` 只读获取源码）。

## Workspace and Scope
- 工作区：`/home/wta/projects/obsidian-huhu`（workspace_policy current，branch dev，base 29644dc5833bb209e6282f84fa71441a5a1b99d4；README execution-context 锚点）。
- 同一工作区中可能有其他执行者在并行修改其他票的文件；**不要修改、格式化、还原或暂存**你写集以外的任何文件，看到无关 dirty 改动保持原样。
- 禁止任何 Git 写操作（add/commit/stash/checkout/reset/restore/branch），禁止推送与发版。
- 禁止运行 `pnpm run build`、`pnpm run build:css`、`pnpm notices`（它们改写 Lead 独占的 `main.js`/`styles.css`/生成文件）；构建与产物由 Lead 串行执行。可以运行：`pnpm exec vitest run <files>`、`pnpm exec vitest run --project dom <files>`、`pnpm exec tsc --noEmit -p tsconfig.json`（及 `-p tsconfig.test.json`）、`pnpm run lint`、不写仓库文件的 `pnpm test:*`/`pnpm check:*` 门禁。
- 不安装/升级依赖，除非本票写集明确包含 `package.json`/`pnpm-lock.yaml`（此时只增加本票需要的依赖并在 REPORT 说明）。
- **允许写入**：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/DESIGN.md`、`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-001/**` … `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-005/**`，以及你的 REPORT。P 不修改生产代码、不写永久设计目录。
- 浏览器证据：使用本机可用的无头浏览器（如仓库已有的 Playwright/Chrome 依赖）对 final HTML 做桌面与窄屏实际打开检查，截图放在原型包内声明的证据路径；截图等过程材料按 AGENTS.md 不入库规则由 .gitignore 处理。

## Acceptance
- `node .agents/speculo/workflows/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs --check` 与 `validate-design-package.mjs --check-ready` 对每个包通过；
- `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage prototype --prototype-id UI-00N --repo . .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities` 对 UI-001…UI-005 全部 0 error；
- DESIGN 中列出每个页面 ID、状态清单、验收 ID 与 revision/digest（供 Lead 绑定）。

## Return
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/003-design-gate/REPORT.md`（模板 `.agents/speculo/references/coordination/report-template.md`），列出 DESIGN revision/digest、各页面 ID、命令与退出码；回读后终端最后一行输出 `DONE 003-design-gate <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/003-design-gate/REPORT.md`。
