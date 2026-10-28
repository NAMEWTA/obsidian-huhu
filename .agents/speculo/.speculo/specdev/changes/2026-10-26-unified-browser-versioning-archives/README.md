# 浏览器、版本管理与档案统一整合

Outcome: active

本 change 汇集 Issue #1/#2/#3 与 PR #4/#5，保留三份 Issue 的完整目标，供用户继续统一处理。**本地合并和统一规格已完成；当前持续实施剩余产品目标，整个 change 尚未完成。**

## 本轮执行

[最新用户授权](sources/SRC-010.md) 已要求完成全部代码和独立代码审查。当前使用 gpt-6.1-sol / high 原生 subagent 开始实施，按 [Goal 本轮执行约定](goal-plan.md) 连续推进。真实宿主、四平台实机和人工视觉验收由用户亲自执行；没有相关通过声明。原有计划阶段说明作为历史背景保留。

## 从这里继续

- [统一 Spec](spec.md)：36 组可观察验收合同、验证接缝、原始条款映射与残余风险；非 UI 与五个主页面已确认，整体 draft 仅保留扩展 UI 前置。
- [Goal Plan](goal-plan.md)：v8 编排、Gate/Wave/恢复；实施强制使用原生 subagent `gpt-6.1-sol` / `high`。
- [Tickets Map](tickets-map.md)：32 张完整实施票、依赖图、36 项 AC 覆盖及写集/Skill 绑定；状态从原票回读。
- [计划审查](evidence/ticket-planning-review.md)：结构检查、设计边界与派发条件。
- [Triage](triage.md)：逐来源已覆盖/待完成、PR 固定点和路由。
- [设计树](design-tree.json)、[LOG](LOG.md)、[ADR](ADR.md)、[领域关系](CONTEXT-MAP.md)：用户已确认的范围、档案模型与历史恢复边界。
- [历史整合与验证](evidence/integration.md)：merge commit、冲突处置、该历史构建的 472 测试及 25 宿主场景，不代替当前工作区验收。
- 当前票据代码和独立审查证据由 [Goal](goal-plan.md) 导航至 `evidence/T-*.md`，真实验收状态另记，不以历史通过结果替代。
- [来源清单与摘要](evidence/source-manifest.json)：独立保存三个 Issue、两个 PR 全文/讨论/审查/文件清单；完整 PR diff 在 evidence/pr-4.patch、pr-5.patch。用户原文见 [SRC-006](sources/SRC-006.md)。

## Ownership

Owner: native:root
Evidence: evidence/integration.md

<a id="execution-context"></a>
## Execution Context

```json
{
  "schema_version": 1,
  "change": "2026-10-26-unified-browser-versioning-archives",
  "workspace_policy": "current",
  "workspace_ref": "current",
  "branch": "NAMEWTA/34",
  "base_sha": "265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa",
  "owner": "native:root",
  "ticket_execution": "auto"
}
```

当前代码实施基线为已合并的 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；此前合并工作基线 `33c21e098ef3188cbab5a09f3e0a01fadb787715` 与命令结果保留在 [整合记录](evidence/integration.md)。本轮范围为 SRC-010 授权的全部票据实施及独立代码审查。

## 前轮计划背景（本轮执行以 SRC-010 与 Goal 为准）

本轮非 UI 访谈与规格整理已完成：设计树 round 2 的 D-001–D-008 全部 answered，用户逐项确认并明确“全部按推荐”，状态为 consensus。六条 ADR 决定、三个领域 Context 和 LOG 已同步；本轮没有待回答的非 UI 高影响问题。

用户已明确确认修订原型。本轮已封板 [DESIGN revision 2](DESIGN.md) 与 [UI-001](prototypes/UI-001/final/index.html)，固定批准记录见 [最终批准记录](prototypes/UI-001/approval-sealed.md)。档案导航正式采用类型→实例树，类型单击进入列表/卡片；按类型配置显示字段，默认创建/更新时间。

已激活 T 并生成 [32 张实施票及总控](tickets-map.md)，覆盖三来源全部目标和 36 组 AC。28 张局部合同完整，4 张扩展 UI 票保留设计前置；整体 Spec 仍为 draft，控制器因此不自动派发任何票。上述数字是本轮交付说明，后续状态以原票为准。精确按块/F、复杂分叉编辑器、CSV 和派生/图谱需 P 补充实际界面后由 S/T 更新；不重复询问已确认主页面。

已接续生成 [Goal Plan](goal-plan.md)，并按本次用户要求固定实施 subagent 的模型和推理强度。本次为 plan，Goal draft / ready_for_execution=false；未改生产 UI/源码、未派遣实施者或执行 I。通过的封板、计划结构和文档检查与实际派发限制见 [Tickets 验证](evidence/tickets-validation.md)。

两 PR 已成为当前分支祖先；远端仍保持原状态，未推送或关闭。源码/生成产物随 merge commit 保存；本 change 新文档暂留工作区，方便继续编辑。用户原有 managed.json 修改原样保留，Bot/终端 change 和永久知识未修改。

Goal 编排的当前输入、模型合同、计划缺口与只读验证见 [Goal 计划审查](evidence/goal-planning-review.md)。Map revision 2 ready 只表示结构就绪；Gate/执行方式由 Goal 负责，单票状态仍在原票。
