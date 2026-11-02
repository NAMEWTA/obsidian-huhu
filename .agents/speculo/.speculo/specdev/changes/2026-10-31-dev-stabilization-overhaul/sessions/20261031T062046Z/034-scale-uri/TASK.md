---
schema_version: 2
session: "20261031T062046Z"
task: "034-scale-uri"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-09
---

## Goal
native:/root/sources（Astra low）修正029自查发现的新增fixture只读DB URI特殊字符风险，完成可回读反例与窄修正。旧029报告已完成不覆写。

## Inputs
Map17、Ticket09、021/029 REPORT、dev/testing，生产base/store.go的sqliteFileURL实际规则。无需新外部材料或生产helper导出。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。只写native/huhubot/tests/contract/performance/dependency_scale_fixture_test.go、docs/e2e/dev-overhaul/storage-scale/README.md及本REPORT；可以在同一fixture文件增加必要接缝测试。全部生产、原测量JSON/log/inputs、主规模测试冻结，无Git写入/远程/递归代理。

## Acceptance
先用真实含本平台合法特殊字符目录证明原file:+path+?mode=ro URI解释会读错/失败，再用与生产已验证路径编码规则一致的URI构建修复，保留mode=ro并验证实际不能写。Windows盘符/反斜杠用生产方式转义且明确本机未运行Windows，不能用Windows非法文件名伪称Windows行为测试。优先就地本仓复用思路，注明来源，不扩公共API。
保留原规模测量fixture SHA和029清理修正、当前编码修正三者关系；采样动作与统计未变，不重跑100/200。029真实50已证明cleanup，本轮URI实际DB接缝足够；只有新修改影响规模路径才补50，避免无理由重跑。原报告/日志不改写。

## Return
标准REPORT列实际反例/修后命令退出和候选8项新摘要，停写交Lead；之后可接033 T06独立复审，不参与T06任何修复。
