---
schema_version: 2
session: "20261031T062046Z"
task: "018-host-stop-consumer"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-06
---

## Goal
Astra low实现T06真实宿主分阶段停止，按T04已验收生产合同和017实际调用链；Lead独立验收。

## Inputs
Map14、Ticket06、017 REPORT、T04 Evidence与shutdown.md、dev/testing/architecture、ADR002、execution-boundaries。T04阶段证据已校验0；Lead原拓扑全量Go观察session72395仍运行，禁止Go源码修改和并行重型Go构建/runner测试，先做TS生产与纯控制测试，等Lead通知结束。

## Workspace and Scope
current/dev唯一/home/wta/projects/obsidian-huhu，base86c500556db1d64865c4cc7f1aff1dd83de071fa。只Ticket06 transport/runtime及events/runner.test.ts最窄旧参数/退出清理消费者；临时夹具置就近测试目录。Go/T04/wire/API/module/UI/Browser/PTY只读。Lead独占共享产物、Ticket/Evidence/ledger。无Git或递归代理。

## Acceptance
以017方案为起点，先真实红灯再修。唯一session/runtime owner等待分阶段真实完成、成功child退出和Host cleanup；caller timeout/abort只结束观察，仍stopping且后续能等同一owner。禁止正常close自动TERM/KILL时间升级，也不能把非零退出/信号/EOF当持久化成功。保持尚未hello进程与late start/onConnect的归属；重复stop不能抢先closed，stop中不能重新启动或删临时根。managed:false/通用client.close只是断连，不越权发managed shutdown。异常或明确force路径保留恢复/失败事实，不新UI、不留误导shutdownGraceMs兼容选项。

真实受控子进程超过原4秒还活着，最后释放才退出；真实Go启动/阶段等待/Profile锁/重开及credentials/events同链测试，不用PTY stop-native替代。独立3秒以上fsync接缝已由T04证明，不加生产CLI测试开关。全量Go只观察Go，真实TS↔Go必须另跑已列Vitest。最终测试类型/architecture/lint适用，构建由Lead协调。已授权用户全票实施；必要缺口先报精确路径，不擅扩全模块。

## Return
本REPORT实际变更/红绿/命令/退出/残余，完成停写；高风险需未参与者独立双轴。不要改旧报告或把T04旧全量失败抹掉。
