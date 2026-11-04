---
schema_version: 2
session: "20261031T062046Z"
task: "029-scale-cleanup"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-09
---

## Goal
native:/root/sources（Astra low）完成028后，修正Lead验收T09发现的fixture清理归属缺口：WaitClosed的6秒observer超时后t.Error即离开Cleanup，t.TempDir会删除尚在清理的Profile。新fixture不得回退T04的真实完成合同。

## Inputs
Map17、Ticket09/dev/testing、021 REPORT、T04真实WaitClosed合同与原私有内存fixture仅作为参考（旧辅助缺陷不自动复制）。T09八项规模证据当前未被验收，原数据有效需保留。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。仅写native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go、docs/e2e/dev-overhaul/storage-scale/README.md及本REPORT。其他测量JSON/log/inputs与主测试冻结。无产品/Git/远程/递归代理或预算变化。

## Acceptance
确保RequestStop后最终等待实际Core结束，observer timeout不能使TempDir先删除。可直接按真实WaitClosed(background)归属等待，整体测试进程时限继续保留；不得用固定sleep/更大超时冒称完成。最终失败准确t.Error且真正已收敛。无需为单行清理改动造镜像测试；实际50 Run接缝含真正Core收尾通过足够，100/200测量路径与生产输入未变不重复。保留原测量夹具SHA与当前清理修正SHA的区别，说明采样数值不受结束后的cleanup改变，不篡改旧原始结果；README复跑链接/语义同步。
如发现其他新增fixture跨平台路径问题，先核对既有代码/实际证据向Lead报告，不额外扩大生产范围。

## Return
按标准REPORT列红风险证据（静态控制流，不伪造行为red）、改动SHA、真实50命令/退出与原测量复用理由，停写交Lead。与bundle协调Go窗口，避免真实runner同时构建/运行。
