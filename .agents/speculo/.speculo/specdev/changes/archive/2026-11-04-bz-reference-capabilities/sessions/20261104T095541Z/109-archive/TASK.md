---
schema_version: 2
session: "20261104T095541Z"
task: "109-archive"
kind: archive
change: "2026-11-04-bz-reference-capabilities"
---

# 任务简报

## Goal
Lead：herdr:w3:p1/claude。你的职责（codex，gpt-6.1-sol，medium）：对已完成的 change `2026-11-04-bz-reference-capabilities` 执行 **archive-single**，完成后提交并推送归档结果。用户已于 2026-11-05 明确授权“提交推送，然后归档”。成功定义：A 工作流返回 `verified`；change 目录整体移动到 `.agents/speculo/.speculo/specdev/changes/archive/2026-11-04-bz-reference-capabilities/`；`--stage archived` 校验 0 error；归档提交已推送到 origin/dev。

## Inputs
- **实际调用的 Work：** 完整读取并执行 `.agents/speculo/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md`（archive-single 分支）及其流程声明的 references（operation-contract、knowledge-graduation、consolidation-rules、archive-rules、archive-receipt-contract；涉及 UI 再读 design-knowledge-gateway）。
- change：`.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/`（README `Outcome: completed`、`Evidence-Mode: conclusion-report`；完成依据 `evidence/final-review.md`；change ADR-001…006、CONTEXT、LOG-001…025；change DESIGN revision 2 与原型 UI-001）。
- 先例：`.agents/speculo/.speculo/specdev/changes/archive/2026-10-31-dev-stabilization-overhaul/` 及其提交 `379048a`（永久 ADR/context 沉淀）、`21eb914`、`d949978`、`29644dc`（归档）。按当前合同执行，先例只作参考。
- 项目指令 `AGENTS.md`（永久 ADR/context 只经 SpecDev A 网关更新；文档中文；Git 提交格式 `type(scope): 说明`；evidence 入库规则）。

## Workspace and Scope
- 工作区 `/home/wta/projects/obsidian-huhu`，分支 dev，HEAD = origin/dev = `529d66270f0b21cbad72aedbf0e8f1a1cb20ab36`。所有实现/审查者已停写。工作区中唯一未提交文件是 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/108-commit-push/REPORT.md`（随归档一起提交）。
- **知识沉淀授权：** 用户的“归档”授权覆盖按 knowledge-graduation/consolidation-rules **评估为应毕业**的本 change ADR/CONTEXT 条目写入永久 `.agents/speculo/.speculo/specdev/adr/`、`context/`（含 INDEX），以及按 design-knowledge-gateway 对 DESIGN delta 的处置；批准来源记为用户 2026-11-05 消息“继续派遣 GPT 6.1 sol medium 去进行提交推送，然后归档”。若某项按规则**必须**由用户逐项确认、或存在取舍无法从规则推导，停止该项、在 REPORT 列出候选与推荐，并以 Status: blocked 返回（不要猜测）；没有知识晋升也是合法结果。
- 现役 docs 若与已沉淀知识直接矛盾才维护（T-20 已更新用户文档）。
- **允许的 Git 动作：** `git add`、`git commit`、`git push origin dev`（普通推送）。可分 2–3 个提交（如：永久知识沉淀 / 归档前定稿与回执 / 移动归档），提交说明 `type(scope): 说明`，正文末尾 `Refs #17`，不写自动关闭关键词。**禁止** force push、改历史、tag、改版本号、推其他分支、`git add -f` 被忽略文件。
- 不修改产品源码与构建产物。

## Acceptance
- `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage archive-ready --repo . .agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities` 在移动前 0 error；移动后 `--stage archived` 对归档目录 0 error；archive-receipt 按合同生成并回读。
- `git push origin dev` 退出 0，`git status -sb` 与 origin/dev 同步，`git status --short` 只剩被忽略文件。
- REPORT 列出：A 返回值、四类资产（change、ADR、context、docs）及 DESIGN 的有变更/无变更与依据、晋升条目清单、提交 SHA。

## Return
- 归档会移动本目录，因此 REPORT 写到**移动后**的位置：`.agents/speculo/.speculo/specdev/changes/archive/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/109-archive/REPORT.md`（模板 `.agents/speculo/references/coordination/report-template.md`；首部 Session: 20261104T095541Z、Task: 109-archive、Status）。如在移动前 blocked，则写到移动前位置 `.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/sessions/20261104T095541Z/109-archive/REPORT.md`。REPORT 写后回读，并确保它也在最终推送的提交中。终端最后一行输出 `DONE 109-archive <Status> <REPORT 实际路径>`。
