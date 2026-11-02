---
schema_version: 2
session: "20261031T062046Z"
task: "025-host-cleanup-repair"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-06
---

## Goal
native:/root/bundle（Astra low）在023报告停写、Lead wave3构建结束后，修复022独立审查的S1/S2。先实际读报告/调用方并简报影响，保留所有历史失败证据。

## Inputs
Map16、dev/testing、Ticket06、ADR002、T04合同、execution-boundaries、018与022 REPORT，原T06 review-input 50504adf...为失败候选。Lead已确认022两P1：已结算refresh失败丢失；同步reconnect cleanup throw跳过stopOwned/丢进程owner。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。唯一可写：src/modules/huhubot/platform/desktop/runtime/client-runtime.ts、client-runtime.test.ts（同目录），src/modules/huhubot/platform/desktop/transport/managed-session.test.ts、runner.test.ts，以及本REPORT。其余T06文件、T04/Go/协议、T16及共享生成物一律冻结。允许只读git，无Git写入/递归代理/remoteCI/真实宿主。新增必要生产路径先报告Lead，不扩公共API/恢复UI。

## Acceptance
S1先真实红灯：refresh清理同步抛错或异步reject，失败已结算后再stop，不能因hostRefresh/disconnect清空而遗忘。失败事实属于原owner，stop失败、state failed且真实managed reservation不能允许另一runtime重开，不能只用mock错误字符串验证。
S2先红灯：closed HAP旧owner重连cleanup同步throw，进程停止必须独立启动且实际exit尚未释放时不能宣称结束。caller可超时再观察同owner，最终等待进程和Host结果后准确failed；原owner不能因finally清引用而丢失，不得把already-owned悬空当恢复完成。
统一清理路径应容纳同步/异步函数、晚到Host、自然退出/refresh/重连/stop，不以重复调用非幂等disposer补救。保留失败结果，不用catch吞掉错误；进程owner继续清理。增加窄回归及实际managed session reservation跨runtime回归，保留既有59例合同。
先控制测试再desktop+events联合（真实Go构建/测试必须与sources T09测量协调，不能同时重负载）。测试类型与生产增量lint/architecture/diff-check；无需重复T04全量Go。Lead最终构建。报告恢复边界不变，不伪称普通模块重启清除failed reservation。

## Return
按coordination/report-template报告精确改动路径/全部10项候选新SHA、红绿与所有实际退出，停写供sources独立复审。不修改正式Evidence/旧REPORT或扩大阈值/时限。
