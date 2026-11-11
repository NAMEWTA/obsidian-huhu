---
schema_version: 2
session: "20261104T095541Z"
task: "101-final-review"
kind: review
change: "2026-11-04-bz-reference-capabilities"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责：作为独立审查者（codex，gpt-6.1-sol，high；未参与本 change 任何实现）对 change 的**最终整体交付**做风险适配的双轴整体审查（G-FINAL）：**标准轴**——跨票集成正确性（共享注册点 `src/app/main.ts`、`src/app/contracts/*`、`src/app/manifests.ts`、各模块 `module.ts`/`i18n.ts`、路由与 shell、反馈/事件/文件适配/通知协议在各消费者处的使用一致性、生命周期与清理、隐私 NFR-002、启动闭包 NFR-001、包体 NFR-003）；**规范轴**——Spec 全部 AC（AC-001…AC-903）在最终工作副本中仍成立、IN/OUT 无越界（OOS-001…OOS-008）、单票验收后没有被后续票回退。成功定义：两轴分别给出 pass 或 request-changes 及可复现 findings。

## Inputs
- 审查方法：`.agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md`、`risk-review.md`、`working-tree-review.md`、`review-evidence.md`（多票组合的整体审查）。
- Spec `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/spec.md`、Tickets Map `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/tickets-map.md`、Goal Plan `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/goal-plan.md`、ADR/CONTEXT/LOG（含 LOG-022…025 偏差）、DESIGN `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/DESIGN.md`、各票结论 Evidence `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/evidence/T-01.md`…`T-20.md`。
- 项目规则：`AGENTS.md`、`.agents/skills/dev/SKILL.md`、`.agents/skills/ui/SKILL.md`。

## Workspace and Scope
- 工作区：`/home/wta/projects/obsidian-huhu`（current，dev，base 29644dc5833bb209e6282f84fa71441a5a1b99d4，未提交工作副本快照）。所有实现者已停写。
- **冻结输入：** 相对 base 的全部变更文件（不含本 change 状态目录），清单见 `temp/final-review/input.txt`（被忽略的本地过程材料）（共 195 个文件）；Input-SHA256 = `8b45a5e17c811980daf324e943fce6fcaa989c16ee4b8739b6818897d5884f4a`（对清单内文件按清单顺序 `sha256sum` 后再 `sha256sum`）。开始前核对，不符即 blocked。
- 本任务只读：不得修改任何业务文件；只写下方 REPORT。可运行只读检查（vitest、tsc --noEmit -skipLibCheck、lint、只读门禁、UI runner 到 temp/）。不要运行 `pnpm run build`/`build:css`/`notices`。
- Lead 已执行的整体门禁（可复核）：build:css、build、lint、test:architecture、test:i18n、check:styles、check:bundle、check:notices、test:license-texts、test:docs、test:safety-regressions、test:workbench-lifecycle、test:workbench-entry 均 0；pnpm test 568/573 文件通过，6 个失败用例为 `src/host/desktop/native/host-{editor,control}.integration.test.ts`，在未修改 HEAD 副本同样失败（既有基线）。
- REPORT 中如引用含方括号的选择器，放进代码格式。

## Acceptance
- 每条 finding：严重度（blocker/major/minor）、文件:行、问题、复现方式、建议修正。只报可操作问题。
- 两轴结论分开：`## Standards Axis`（Result: pass|request-changes）与 `## Specification Axis`（Result: pass|request-changes），并给出 AC 覆盖核对表（逐 AC 一行：证据位置与结论）。

## Return
- 一次性写 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/101-final-review/REPORT.md`（模板 `.agents/speculo/references/coordination/report-template.md`，首部 Session: 20261104T095541Z、Task: 101-final-review、Status），回读后终端最后一行输出 `DONE 101-final-review <Status> .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/101-final-review/REPORT.md`。
