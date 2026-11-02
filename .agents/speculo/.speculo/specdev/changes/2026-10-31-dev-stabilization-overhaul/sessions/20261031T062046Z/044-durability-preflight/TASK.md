---
schema_version: 2
session: "20261031T062046Z"
task: "044-durability-preflight"
kind: research
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-08
---

## Goal
native:/root/baseline（Astra low）对T08做只读实际VFS审计/实施预检；T05源码/AC283已独立pass但Windows未验收，因此本任务不越过DAG写生产或测试。Lead后续将根据真实前置固定本地执行与平台验收门，当前只交REPORT。

## Inputs
完整Ticket08/AC341-342、锁定go.mod/go.sum、永久Bot ADR027（按docs/architecture索引定位）、dev/testing/licensing与research-and-reuse合同、T05候选及043审查。已有官方资料可复用并保留原始引用。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa，只有本REPORT可写。读本地go module cache锁定源码及官方原始仓库/文档，不改go.mod/cache/node_modules/生产/测试/正式Evidence/Map或workflows。无递归agent/Git写/remoteCI/真实Obsidian/Browser/断电/VM骤停。用户暂不远程CI。

## Acceptance
把实际锁定Go、SQLite/ncruces、WASM/VFS、Darwin xSync→fsync/F_FULLFSYNC、fullfsync/checkpoint_fullfsync pragmas及本仓正常关闭sync的真实调用链逐项定位到版本/文件/行与源摘要；区分SQLite pragma支持、VFS实际实现和OS持久性承诺，不根据名称猜结论。知识缺口用官方primary sources验证，采用处保留原始链接。
检查当前durability/measurement已有normal close、子进程kill/reopen/64行probe、windows/allocation跨编译等可复用接缝，给T08最小新增验证计划（正常关闭与进程崩溃分别测，不能借Linux声称Darwin；骤停始终用户自行验收不跟踪）。写集缺macOS workflow入口若实际需要列精确建议，先不写；已有 workflow能复用先比较，避免不必要新增。列出可本地自动验证的行为与必须macOS runner的未验收点及最终前置输入摘要。

## Return
标准REPORT含审计事实表/原始引用/实际消费者、最小精确预计文件、验证范围与只读命令结果。无需为预检跑全Go/构建；完成停写等Lead。
