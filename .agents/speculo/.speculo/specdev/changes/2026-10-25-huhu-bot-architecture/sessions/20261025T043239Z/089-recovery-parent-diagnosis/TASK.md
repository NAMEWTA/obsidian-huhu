---
schema_version: 2
session: "20261025T043239Z"
task: "089-recovery-parent-diagnosis"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-12
---

# waiting parent候选页的只读可达性诊断

## Goal

由原T12 owner /root/credential_provider核对ReadyParent链的先LIMIT后过滤机制，构造真实可达、可证伪的公开消费者反例或给出为何当前合同不可达的依据。沿既有gpt-6.1-sol/xhigh偏好，不再委派。此任务不授权生产或永久测试修复，不推进正式状态。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map21/Goal20，28票55AC。复用已读AGENTS、dev/testing、I error/test-reliability，按当前T12/T16合同核对。

083最终REPORT SHA256 7b11ef852cb906956d354fcfc6d8def4afb3670c1a4683c6a43cdaa17e1bead6及Root evidence/083-lead-return.json；已确证F-083-01只关于accepted/recovering扫描，088正在由原T03/T06 owner修复。此处usage/waits.go:123 nextReadyParentInTx → usage/finalize.go ReadyParentInTx → execution/executor.go Claim，静态LIMIT128在waitReady/Claim之前；尚不是另一个已实测finding。参考evidence/T-16-logs/claim-scan-supplement-map21.md。

## Workspace and Scope

只写自己的REPORT/log、外部固定副本/overlay与探针准备。生产、永久测试、旧REPORT、正式Evidence/Map/Goal全部只读。当前088持唯一Go检查窗口：先只读/准备，不编译、不启动测试/Runner；收到Root原生明确交接后才顺序执行必要有界实验。固定诊断输入可选083外部不可变副本 /tmp/huhu-review083-yi8bg_f3 的原280文件（manifest见083/logs/00-probe-input.json），不得覆盖原件；可复制到自有临时目录。不能在088正在变动的共享源上冒称固定输入。

## Acceptance

从公开受理、同Executor、真实delegate/结果或问答/CP事实进入，SQL只读回与明确故障注入，不直接伪造Run/parent state。先考虑真实RUN_QUEUE_LIMIT128、MaxChildren/Depth、Root/Profile child slots与WorkerCapacity约束；原083先新建晚root的两种构造实际被队列容量拒绝，不重复当产品红。

判断超过128个waiting parent是否合法可达（可以先合法受理roots再实际产生后代/等待，不假定根数等于parent数），后方ready结果是否会被较早不ready/恢复闭门/slot满候选遮蔽。用可控屏障保存正常与故障窗口；若有反例，给同输入反向控制，仅改变一个真实允许动作。失败前提/编译/测试错误与产品断言严格分开，有限观察结合实际循环解释，不夸成已证明的无限时间。

如确证，只给原owner最小修复路径/内部合同、边界与验证闭包；不写生产。考虑有界跨Claim分页、提交成功后游标发布、最终同Tx授权/slot/claim、父结果/来源消费唯一性以及取消响应。T03/T06 writer仍是088，不向其写集落地。若当前合理界限下不可达，以具体控制和代码依据关闭该疑点；不为了finding扩大产品容量或无界负载。

所有真实子进程/Core/producer必须最终Close/Done/Wait，失败原日志保留。无真实Provider、OS keyring或用户Vault；现场操作继续用户后验。

## Return

REPORT首h2前Session/Task/Status；固定源SHA、假设/实际前提、命令exit/Wait、数据读回、正常/反向控制、确证/推断/未验证和精确建议可回读。所有自有writer/进程结束后亲自return0，再实际MESSAGE+FINAL。completed只表示诊断交付，不表示T12/T16/G1通过。
