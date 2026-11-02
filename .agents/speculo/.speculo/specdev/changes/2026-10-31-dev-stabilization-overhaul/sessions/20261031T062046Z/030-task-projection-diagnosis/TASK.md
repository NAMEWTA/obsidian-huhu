---
schema_version: 2
session: "20261031T062046Z"
task: "030-task-projection-diagnosis"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-19
---

## Goal
native:/root/baseline（Astra low）继续T19只读诊断，寻找可重复行为红灯。先读取D技能的feedback-loop/triage约束，再决定实验；没有红灯不进入根因假设/产品修复。原用户录制条件的异步问题尚无答复，不再次向用户索取新真机测试。

## Inputs
Ticket19、Spec AC261、source.md里#26、docs/task-domain.md、diagnosis.md的T19分诊、diagnostics/T-19现有三例与原始JSON/摘要、dev/ui及execution-boundaries。当前真实TaskPage+TaskEditor、独立mountTasks/editTask在happy-dom全部通过；不能用再跑同三例冒称推进。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。产品/现有测试/正式diagnosis与Ticket/Evidence只读；仅新增diagnostics/T-19/chrome-*或home-*文件及本REPORT，已有Lead三例/日志不覆盖。可用OS临时构建/日志，清理拥有的进程。无Git写入/递归代理/真实Obsidian/Browser产品或专用资产。独立Chrome是允许的诊断工具。

## Acceptance
先核对原#26实际入口是否Home任务看板/TaskPage及当前调用链；Home ui/tasks虽为Ticket只读仍可诊断。优先找尚未覆盖的真实入口/筛选/编辑/删除/持久存储异步边界；若使用Chrome，挂载真实生产组件/runtime与TaskService/Repository，替身仅宿主storage端口，复用T23现有Chrome/CDP助手而不修改共享runner。用虚构内容，可按真实生产格式生成有限不同任务量，记录保存提交/发布/列表与计数/成功反馈/关闭及下一帧；不通过故意freeze UI或fake projection制造任意迟滞。
AC261要求列表计数同一结果、无重复行、失败保留输入；publish同步后正常下一帧DOM更新本身不是缺陷。必须用可观察合同差异及最小变量证明red，排除自身fixture/选择器失败，再依D进行因果实验。若无red，明确未覆盖/未知，不编造根因，不置Ready；有red也只报具体建议文件/验证，Lead补正式写集后实施。

## Return
REPORT标准结构，列真实脚本/输入/输出SHA、命令退出、最小复现与限制，成功检查不伪称修复；Lead整理正式diagnosis。诊断工件不得含用户真实数据或机器敏感路径。
