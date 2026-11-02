---
schema_version: 2
session: "20261026T045732Z"
task: "023-t08-shutdown-result-continuation"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

原Lead codex:/root沿完整18票/Agent Team授权，交同一codex:/root/prepare_t08_full_cli、既有gpt-6.1-sol/xhigh继续020未完成的F6关闭结果修复。仅正式增加一条已被新语义影响的旧测试fixture，不改变产品行为、原F6验收或模型分工。不递归派遣，不提交/push/PR/发布/归档；Root最后整合和完整R4，真实Obsidian/Provider/OS IME/五平台仍由用户验收。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor；session20261026T045732Z；HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal。当前GP031/Map32，T08 in_progress；恢复周期1attempts1，下一Root整合计2，旧周期3不重置。

先读当前Map→适用dev→T08→Goal及本023；复用已读未变规则。必须完整回读020 TASK/REPORT：sessions/20261026T045732Z/020-t08-shutdown-result-repair/TASK.md SHA18ce1e836252b8bf4f1530265f0bb2de17bd448cfcf6ccbfb56d76d237f1df66，REPORT SHA9dcf9a31e5e413259ed842971fb8454fa42771413f9b4de624f09f7a85f4abea。020 Acceptance/Verification全部继续有效，本TASK只覆盖当前scope/输入/续派身份，旧TASK不改。

原正式F6 packet evidence/T-08-shutdown-result-packet.md SHAb6d9c9fa5eae76d755babee02aef54667ecb3b89be832d972f99ec5f2320e14e；本次scope补齐 evidence/T-08-shutdown-fixture-scope-extension.json SHA9cc18803fc164cae6e4f8ce9206d466bf1119960e4dc454cbd87e6b6e9df51bd；r5 allocation SHA88978ec8a462ca88a426c8bfe8e98591aa6346739779edc916b49ae181e140a7。总88路径A34/B16/C33/Root5，当前唯一修复写集11路径，分组不是其它writer许可。

Root已核020 SOURCE STOPPED且001–004均终止，2072产品对r4派前只有3源变化/模式600，其余无漂移：desktop/native/host.ts f8d2ac4e6ab8d8dcf13f0ee077e687763371f479428aefff0664e888d32da428，helper.ts 12f639a3a2a55686cf8e0ffb9e2f05672afe15d7861109dd4f64f1890d57e8e7，shared/native/host.ts 55550d57db87996a0c885f7e96d6675ad6274161f971613f526267126f712c1f。020候选并未接受为green。新Root preflight /tmp/huhu-t08-root-r5-preflight-inputs.json SHAd632d63372c6e45c0b01f204dd3ea1b0c649e0055e08744b4882bcf4d72c3dbc，2144输入/2072产品/74本票变化，写集外[]。

020原件 /tmp/huhu-t08-shutdown-result-0ee4bbc8 全部只读：002真实Host红exit1，native本身exit1却被lease/host dispose吞掉；003原6fixture组75s外层TERM exit143/timed_out；004新增helper.test --bail1首项5s超时exit1、其余未完成。checkpoint-source SHA4191ec6550c8878c288a5d48f3203e1265bbef45ca3d93cb1f671b7e32562d85与diff保留原候选。Node官方 https://nodejs.org/api/child_process.html#event-close 区分exit与stdio close；Root实际回读两处normal fake只有exit。原helper.test SHA b077bccb0f4a5e4196c59bc5dd1415662b13fedb6b50d054236f7cb377004ae3，仍等于T08起点。

017 immutable pair不变：/tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty SHA950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843（31119408B0555）；同目录huhu SHA63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74（15428448B0555），producer SHA5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3（0444）。Rust及native142/producer未变，不重build。

## Workspace and Scope

仅以下11产品路径由你在实际023投递后唯一写入：

- src/host/desktop/native/host.ts
- src/host/desktop/native/helper.ts
- src/host/desktop/native/host.test.ts
- src/host/desktop/native/helper-stream.test.ts
- src/host/desktop/native/helper-control.test.ts
- src/host/desktop/native/helper-editor.test.ts
- src/host/desktop/native/host-control.test.ts
- src/host/desktop/native/host-editor.integration.test.ts
- src/shared/native/host.ts
- src/shared/native/lazy-host.test.ts
- src/host/desktop/native/helper.test.ts

新增helper.test.ts只允许两处normal stdin finish callback模拟exit(0,null)→close(0,null)，保留七项原风险/断言。若还需其它变化，先报告Root再正式更新，不自己扩大。其余原十路径按完整F6必要修复/测试，未强制每条必改。所有其它产品含Rust、UI、业务/controller、协议/generator、main/styles/预算/notices、锁/依赖均STOP只读；不改node_modules、旧TASK/REPORT/probe/bin。

只另写本023 REPORT及新的/tmp/huhu-t08-shutdown-continuation-*原件；可引用已验证历史CAS，不能覆盖020 R或旧失败。Root会追加本次实际派遣行政记录，不改产品。022另一路T10只读准备不取得任何产品writer。

## Acceptance

完成020全部六项Acceptance，真实red已存在无需形式重跑相同旧红；基于当前source新编译真实Host→Helper→017bin，准确显示最后释放失败/保存sentinel，普通EOF仍green。NativeShutdownError.outcome和不reject物理fence方案只是中间候选，须通过实际语义和测试，不为保留候选实现而修改合同。

尤其保留：code0无signal正常、非0/信号/forced/未知退出准确失败、bounded最后stderr、exit先到但stdio晚到；立即关闭admission与原operation/frame物理收束分开；重复helper/lease/Host dispose观察同次结果；已gone失败不永久堵新明确acquire，未gone阻止第二helper，超时后迟到exit只退休原代不自动重启；原startup与cleanup、NativeReleaseError.outcomes与最后shutdown双错误完整；其它Cookie/history owner继续活。不要靠解析本地化错误文本决定重开，不把error事件当实际exit，不让旧代回调清新代。

## Verification

补齐正常fake真实Node事件时保留未知/非0/无close的单独负例。003/004原失败保留，不提高测试timeout掩盖错误、不吞dispose失败、不删断言。执行实际受影响Host/helper/lazy-host定向回归，helper.test.ts全七项，生产/测试类型及相关lint；所有实际argv/UTC/exit/raw/前后输入和PID/locator/socket观测可回读。Root另补Browser模块/Sessions/Controller消费者、最终根构建/真实预算归因、完整官方Pi组合与R4；不要全仓/full native/根build。

## Return

原子写本023 REPORT：有效Session/Task/Status、“聚焦交接”“产物与验证”“问题与下一步”；清晰区分020检查点和本次最终候选。源/模式/全部差异、准确公共error语义、真实red/green、原失败、资源归属清理与未验边界完整可回读。写后实际return checker存独立raw，再明确SOURCE STOPPED。候选交回不是T08/Goal完成；Root唯一接收和改正式状态。
