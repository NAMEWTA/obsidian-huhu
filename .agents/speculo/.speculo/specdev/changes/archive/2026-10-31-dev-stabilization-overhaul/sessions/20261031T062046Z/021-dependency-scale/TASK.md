---
schema_version: 2
session: "20261031T062046Z"
task: "021-dependency-scale"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-09
---

## Goal
Astra low完成T09改前依赖存储规模基准。T16全部103项继续冻结；不把其待审拖成闲置。

## Inputs
Map16、Ticket09、dev/testing、Spec AC291、ADR004、现有performance与memory/privacy/revocation实现，execution-boundaries。T01/T02done，Go1.26.10/GOWORK=off。Lead最新原入口Go全量已0，但不能把此前T01失败抹掉。

## Workspace and Scope
唯一current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa；只native/huhubot/tests/contract/performance/**、docs/e2e/dev-overhaul/storage-scale/**和本REPORT；模型/Go生产/scripts bench/root生成物/Ticket/Evidence/ledger只读。无Git、递归派遣、remoteCI、真实宿主。可能需要现有工具/fixture写集先报告真实路径，不改memory模型。

## Acceptance
先检查已有基准入口/调用方，发简短影响/方案/验证范围后实施。真实50/100/200 Run规模覆盖链式/分支委派/共享来源/多来源/撤权，仅虚构数据；每阶段memory_dependencies行数、可区分direct/effective的结构量、WAL增量、阶段耗时和峰值内存。测试必须实际走本仓当前production路径，不自写替身闭包或只插表造数。选择足以证明机制且当前环境可复跑的紧凑夹具，结构硬断言接缝供T10收紧；当前模型增长坏可测量，不先改模型让基线消失。记录机器/toolchain/输入/阶段及采样限制，时间只观察不以主观阈值判正确。pnpm bench:huhu-bot和DependencyScale命令实际0；与T06真实Go runner协调避免同时冷构建或重型负载，不跑无需要的全量Go。

## Return
本REPORT真实路径/运行命令退出/基线表/测量方法/残余/停写hash，文档留中文并保留原证据；T10将复跑同一夹具比较，不声称模型已改或Windows已验收。
