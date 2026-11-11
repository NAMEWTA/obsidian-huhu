---
schema_version: 2
session: "20261031T062046Z"
task: "024-hook-measurement"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-12
---

## Goal
native:/root/baseline（Astra low）完成T12本地可做的分段测量与Windows专用workflow准备。Windows远程执行未授权，不触发或推送；做好可审查候选，Lead最后处理必要远程授权。不能因此提前把AC311记通过。

## Inputs
Map16、Ticket12、Spec AC311、ADR005、dev/testing、execution-boundaries、T01 hook基线和现有hook-spool/guard/测试与CI。当前T16由bundle窄修复，你只保留独立审查资格，不写T16。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。只写.github/workflows/hook-windows.yml、src/modules/agent/platform/desktop/hooks/hook-spool.test.ts、docs/e2e/dev-overhaul/hook/**和本REPORT；产品hook-spool.ts/spool-guard.ts只读，不改shared生成物/Ticket/Evidence/Map。允许只读git；禁止Git写入、递归代理、remote CI、真实Obsidian。先看真实入口/依赖/现有决策，发送影响计划后改。需要扩大诊断接缝先报告，不悄悄新增产品遥测。

## Acceptance
独立workflow明确实际Windows+32 scopes×3 ordered events目标用例，不靠宽glob或前置suite失败使目标不可达，版本/依赖复用已存在项目合同。测试分段记录等待collector、持有collector、路径与token校验、写入发布、消费回收，不改变时限/成功断言/调度语义、不输出路径外敏感信息；若现有测试接缝无法分离生产私有阶段，明确测量边界并请求最小方案，禁止假精度。
本地运行目标测试与类型/必要workflow静态校验，保留各段总量、事件数、失败数和机器版本；Windows未跑就是待验收，不能用Linux替代。文档中文，参考原出处就地保留，不新增实现外部代码。任务完成前写出可供Lead最终授权的具体workflow、run输入/输出与资源范围，不提前要求用户确认。
T16修复返还后Lead可能安排你暂停本票安全检查点做复审；记录哈希/在跑命令，不能中断测试留下无主进程。

## Return
按coordination/report-template回报聚焦交接/产物与验证/问题与下一步；列exact路径SHA、全部真实命令退出、Windows待验收与下一步。候选停写，不标Ticket done。
