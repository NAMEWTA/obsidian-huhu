# #17：借鉴 bz 的公共能力、密码本、档案×脸谱、归物本、书页日记与数据体检

Outcome: completed

Evidence-Mode: conclusion-report
Evidence-Basis: AGENTS.md「SpecDev evidence 入库规则」（evidence 只入库检验结论报告）；Lead 2026-11-04 执行开始时选用

## 目的与导航

本 change 承接 [#17](https://github.com/NAMEWTA/obsidian-huhu/issues/17)，以当前 dev（`81e43c4`）与 bz 最新 master（`d76a0870329403247917a00c43019e203a2560a4`）为基线重新评估 Issue 研究总纲；huhubot 已在 #41 删除，相关 AI/Bot 内容不再纳入。复用优先：bz 有相似实现的，优先仿造复刻并按来源规范署名。

- 来源快照：`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- 分诊与实施简报：`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- 设计树 / 讨论 / 术语 / 决定：`<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`、`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`

## 当前工作

- [x] T intake：来源冻结、基线漂移与现状核对、分诊简报
- [x] G 访谈：D-001–D-020 已回答，用户 2026-11-04 确认共识（LOG-021）
- [x] S 规格：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`（status ready，ready_for_tickets true）
- [x] Tickets（20 张；UI 票 8 张待 G-DESIGN）与 Map：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- [x] Goal Plan（plan 模式，未授权实施）：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- [x] G-DESIGN：P 原型 UI-001（单包九页）ready；change DESIGN revision 2 approved，digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00（批准 approval-r2.md 引用 LOG-013/LOG-022；派遣 sessions/20261104T095541Z/005-design-gate-r2）
- [x] 实施与 G-FINAL：20 张 Ticket done；整体审查 pass，完成依据 `<Path>{roots.state}/specdev/changes/{change}/evidence/final-review.md</Path>`（逐 AC 映射、门禁命令与退出码、残余风险）

## 接续

本 change 已完成（2026-11-05，Lead herdr:w3:p1/claude；T-04 规模验收经 plan_revision 15 补证后再次关闭）。完成依据：`<Path>{roots.state}/specdev/changes/{change}/evidence/final-review.md</Path>` 与各票 `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`。未提交、未推送、未发版；真实 Obsidian 宿主验收由用户执行。下一步（需用户授权）：提交与/或经 `<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>` 归档。

<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-11-04-bz-reference-capabilities",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "dev",
  "base_sha": "29644dc5833bb209e6282f84fa71441a5a1b99d4",
  "owner": "herdr:w3:p1/claude",
  "ticket_execution": "auto"
}
```

## 实施约束

遵守项目目录与开发规范（AGENTS.md、`.agents/skills/dev/SKILL.md`、`.agents/skills/ui/SKILL.md`）：模块经 `api.ts` 互访、`manifest → module → core/platform/services/ui` 分层、React 19＋Tailwind 4＋shadcn/Radix 设计系统、`t()` 双语文案；优先复用现有组件、服务与 bz 实现（LOG-009、ADR-003）。
