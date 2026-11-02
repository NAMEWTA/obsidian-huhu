---
schema_version: 2
session: "20261031T062046Z"
task: "017-host-stop-preflight"
kind: research
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-06
---

## Goal
Astra low只读预检T06真实TS宿主停止消费者，待T04正式证据门完成再实施。

## Inputs
Map12、T06、dev/testing/architecture、spec AC281/282、ADR002、T04当前27项合同及shutdown.md、006/011/013报告、execution-boundaries。

## Workspace and Scope
唯一current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。所有源码只读，只写本REPORT；禁止生产/Git/生成物/正式Evidence写入。无递归派遣。

## Acceptance
核对全部service.shutdown调用、UI close→supervisor/transport/runtime→process/profile/temp目录owner链，哪些固定timeout/close promise会误报完成，既有stop-native和TS-Go tests真实入口，列精确文件范围缺口、最小改动与验证计划。不得假设Go四阶段等于进程exit；caller期限过后owner继续清理，profileReleased/finished/failure/EOF各语义不能混同。明确managed owner停止与remote disconnect边界，超时不能重新start或删临时目录。测试需可控慢cleanup、真实子进程/锁重开、重复stop/dispose、失败状态。不改UI，展示留T33。

## Return
本REPORT按coordination模板，只读事实与路径/测试清单，Lead放行正式实现前不写生产。
