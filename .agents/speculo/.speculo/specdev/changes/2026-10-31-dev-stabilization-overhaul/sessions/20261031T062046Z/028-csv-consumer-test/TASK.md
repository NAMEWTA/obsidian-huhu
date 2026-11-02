---
schema_version: 2
session: "20261031T062046Z"
task: "028-csv-consumer-test"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-16
---

## Goal
native:/root/sources（Astra low）在027只读报告完成后，修复Lead184文件1285例宽集合唯一失败的CSV测试旧端口；T16生产103项冻结，只更新实际消费者回归。

## Inputs
Map17、dev/ui、Ticket16及Evidence D06，原014/023/026报告，/tmp/huhu-t16-lead-e2e.log。实际CSV生产已使用create-only，不改回writeVaultFile。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。唯一可写src/modules/home/ui/expense/records.dom.test.tsx与本REPORT。无产品/词典/生成物/正式状态/Git写入/递归代理。先读取当前ExpenseStatsPanel→ledger-csv→ExpenseService创建端口，发影响范围再改；不从测试失败直接假设产品必正确。

## Acceptance
确定旧writeVaultFile mock确已失效而当前create-only行为正确；将fixture改到当前真实创建边界，保留原月/类型/类别筛选、行/图/指标与CSV内容一致断言，同时验证新导出固定英文目录与existing内容不被覆盖。用端口模拟实际存在/创建语义，不能只改成随便返回成功的spy洗绿；不更改时限/删断言。运行该DOM文件及ledger-csv.test，类型只需必要增量；1284个已绿原结果不重复。

## Return
REPORT按标准结构列精确SHA、真实命令退出、原因/输入和未改范围；停写交baseline增量复审，不直接done。
