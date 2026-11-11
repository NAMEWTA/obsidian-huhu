# 任务回报

Session: 20261031T062046Z
Task: 011-stop-repair
Status: completed

## 聚焦交接

010 的 STD-01/SPEC-01 与 STD-02/SPEC-02 修复候选已交回，源码已全部停写。completed 仅表示本次实现交付，不表示独立审查或 Ticket 验收通过；请对新快照交同一 reviewer 复审。旧输入 b33a8e97de87af17fb9fa0b66ebba2318d4aac89dd5285c98439ea67357425af 仍是 fail，不改旧 REPORT。

## 产物与验证

### 范围与行为

current/dev，HEAD 86c500556db1d64865c4cc7f1aff1dd83de071fa。依据 011 TASK、010 原始双轴、dev/testing 及已读 SpecDev 合同；按 Lead T04-D05 消息和 Map revision10 增加同包 server_lifecycle_test.go。没有 Git 写入、子代理、依赖安装、Core/WAL/schema/TS/生成物修改。

本次 8 项写集（均为 native/huhubot/ 下）：

- internal/adapters/inbound/stdio/server.go
- internal/adapters/inbound/stdio/server_lifecycle_test.go
- tests/contract/foundation/stop_repair_test.go
- tests/contract/foundation/shutdown_observer_test.go
- tests/contract/foundation/runner_test.go
- tests/contract/foundation/duplex_test.go
- tests/contract/foundation/default_engine_cli_test.go
- tests/contract/foundation/stop_phases_test.go

stdio 使用同一 requestsMu 协调每个请求 frame 的受理和写完结算，覆盖同步 hello/batch、slots 拒绝与异步 worker。零在途判定与封闭准入在锁内完成，实际 Close 在锁外执行；读线程不能在旧 last=true 与物理关闭之间再次受理。保留显式 shutdown 最终 ACK、非显式停止写后关闭、错误关闭及原始 EOF 行为。私有屏障测试用 channel 明确选择 reader-first/writer-first 两种顺序，验证物理 Close 尚未调用时也不能越过关闭决定受理，无生产测试公共 API。

Go fixture 共享 observeShutdown，在原 caller 总期限内重复请求 waitMs<=1000；remaining deadline 更短时收缩观察时间。中间结果不视为完成，finished 后必须 requested/executionDrained/persistenceComplete/profileReleased 全真且 failures 空，再等待实际子进程退出。runner 原 5 秒、default CLI 原 30 秒及 duplex 原 pipe 5 秒限制未扩大；duplex 严格 errors.Is(io.EOF)。普通进程退出、认证与真实 Core drain 仍由完整包回归覆盖。

### 红绿与失败原始记录

1. 合法重复 hello+shutdown batch 配合受控延迟的前一 shutdown reply，旧输入 `TestHelloShutdownBatchWaitsForEarlierStopReply` 真红灯退出1：`batch dropped admitted reply: EOF`。统一屏障后同例退出0。50ms read deadline 仅检查已挂起 reply 期间连接未被关闭，不以读 timeout 证明最终完成；最终另严格验证 EOF。
2. 提取原单次观察调用行为后，`TestShutdownObserverContinuesAfterIncompleteReply` 真红灯退出1：`returned before final facts: incomplete or failed stop`。循环实现后转绿。此例是受控 callback 合同测试，不宣称模拟真实 Core。
3. Lead 批准追加真实 Core/heldMetadataProbe 场景。实际 Probe 未返回时第一次 wire waitMs=0 必须 requested=true 且其他完成事实为 false；只有 observer 再次调用才释放真实 Probe，随后核对真正 Core 清理结果和 EOF。将循环临时变异回旧单次观察行为，真实用例退出1：`old one-shot caller stopped at incomplete facts`；日志 `/tmp/huhu-t04-repair-real-observer-red.log`。随后恢复循环，没有改 Core/wire。
4. 上述变异及第一轮新用例 race 还暴露测试 cleanup 的独立问题：defer cancel 在 t.Cleanup 前执行，cleanup 选择已取消 ctx 可误报 `probe did not join`。仅把失败路径 join 的等待改为独立 1 秒清理期限；不改变 caller 总期限或任何完成断言。修后 observer 定向 race 退出0。原失败日志保留。
5. 实现期间一轮编译失败为 default_engine_cli_test 缺 wire import；补 import 后定向/完整包均通过。

### 实际命令与结果

以下 Go 命令均 `GOTOOLCHAIN=go1.26.10 GOWORK=off go -C native/huhubot`，顺序执行，没有并行重型 Go。

| 命令 | 结果 |
|---|---|
| `test ./internal/adapters/inbound/stdio ./tests/contract/foundation -run 'TestFinalWriterAndAdmissionBarrier\|TestShutdownObserverContinuesAfterIncompleteReply\|TestHelloShutdownBatchWaitsForEarlierStopReply\|TestManagedShutdownAndCleanEOF\|TestShutdownReturnsCompletedFacts' -count=1` | 0；stdio0.012s、foundation0.284s |
| `test -p 1 ./internal/adapters/inbound/stdio ./internal/bootstrap ./tests/contract/foundation -count=1` | 0；0.124s/4.576s/14.565s；`/tmp/huhu-t04-repair-target.log` 与 .exit |
| `test -race -p 1 ./internal/adapters/inbound/stdio ./internal/bootstrap ./tests/contract/foundation -count=1` | 0；1.510s/20.364s/104.330s；`/tmp/huhu-t04-repair-race.log` 与 .exit。此轮在追加真实 observer 用例前 |
| 追加 `test ./tests/contract/foundation -run '^TestShutdownObserver' -count=1` | 0，0.164s；`/tmp/huhu-t04-repair-observer.log` |
| 真实 observer 单次观察变异 `test ./tests/contract/foundation -run '^TestShutdownObserverWaitsForRealProbeCleanup$' -count=1` | 1；上述明确红灯，并附 cleanup 误报；变异已恢复 |
| 追加 `test -race ./tests/contract/foundation -run '^TestShutdownObserver' -count=1` | 初轮1，仅 cleanup 误报；修正后0，2.127s；`/tmp/huhu-t04-repair-observer-race.log`、`/tmp/huhu-t04-repair-observer-race-retry.log` 及 .exit |
| `git diff --check -- native/huhubot/internal/adapters/inbound/stdio native/huhubot/tests/contract/foundation` | 0 |

## 问题与下一步

- 新 27 项累计候选摘要如下；Lead 固定完整 review input，原 reviewer 复审两轴。本 worker 不自标 pass。
- 006 全量混合输入失败历史不改写。本轮未重复默认 `go test ./...`，T06 最终稳定输入需按原拓扑验收，-p1 仅用于资源协调。
- Lead 已另用 uv 隔离固定工具运行 Python schema 验证0；006 worker 原缺 jsonschema 的失败不改写。
- Lead 冻结构建记录 main.js 整体超预算3234B；本轮仅 Go/fixture，没有提高阈值或重建产物。该问题与 TS 停止消费者集成仍由后继任务处理。
- 无 Windows/macOS/真实 Obsidian 或新增物理磁盘性能证据。本轮不扩大已有 Core/WAL 合同。

### 累计候选摘要（27 项）

```text
e863c01bbc629543d13c1568d3d6c094d82a0debaf3e318e49c420b669db067f  contracts/hap/v0.1/fixtures/methods.json
e6878fcbb1b1d1e2dccc16291af1df31b2b9ee13085b959d57334271efbd45bf  contracts/hap/v0.1/generate.mjs
bdc850e7794ddfd2cb808786158817655a3c3f1cf657e87c652f08bb0d02d21a  contracts/hap/v0.1/schema.json
e429bdc0b28bf659fe2079168cfd8bb7268c28050e654f0158b691bb71266a91  contracts/hap/v0.1/shutdown.md
3e84d2515b1365fea6005286911484fb652fa49a7ea15e3612a8e1a860eb5aab  native/huhubot/cmd/huhubot/main.go
234ce257c3e389ac9cca71e3900c8e31383c8d948c085cd55df78e3e2f8096e8  native/huhubot/internal/adapters/inbound/hap/router.go
8cf6a32fafbcbd828883dc176e977d8de992fc1785da92bc2227d26e7045691b  native/huhubot/internal/adapters/inbound/stdio/server.go
d342d1766df3511b5fb80982c1d989385d9b423944c239ff56ffd86123ce52ca  native/huhubot/internal/adapters/outbound/sqlite/base/store.go
dfd17b10a402b6b64c4b15ac357b5d36772f3a5087cd15905980d721de2c21ed  native/huhubot/internal/application/api/service.go
f3a083208215e977c7ddca75193b6baecfc9647879827d2c89b1a0d5ac776b7a  native/huhubot/internal/application/api/types.go
cff2d581a4e53a983a8becd7de1839d238e75aa3a9f0baf6691d0c325d9d0723  native/huhubot/internal/bootstrap/core.go
8bffedb6e358adf94e7b60f25b598451f595b11de23781fe888af5491e019618  native/huhubot/internal/bootstrap/stop_phases_test.go
3da741b95b812ee711a0276bbb77a96afa55fe96f6c2f2ef708045fccbe9c0b1  native/huhubot/internal/protocol/hap/methods_generated.go
bdc850e7794ddfd2cb808786158817655a3c3f1cf657e87c652f08bb0d02d21a  native/huhubot/internal/protocol/hap/schema_generated.json
ce2a0ffa7d4e6b42704a46de9d8a204dc904a85305aefa68fae71d9f0f6641cd  native/huhubot/internal/protocol/hap/types.go
1d9e08cd52abe6eae925226daf89b717fe6c45c78adb9e88e9f589b23f03ba9c  native/huhubot/tests/contract/approval/checkpoint_inspection_test.go
3b3b4d7fbd1e9faa118972da39aa585ed4dee30702cc08dbc939f68cee9d9d56  native/huhubot/tests/contract/foundation/default_engine_cli_test.go
91857b636130dc89aceca3110bd79a9c81445a9b54f2f788330892809b252c4d  native/huhubot/tests/contract/foundation/default_probe_lifecycle_test.go
f290cfda8c36924d41d9010cfed3477a182dae9f9b9c5fe5bf9ba24c25b00c64  native/huhubot/tests/contract/foundation/duplex_test.go
693fe6d967d759c557b4f45dc85f59c5e043f9809e580173212329ecd407548f  native/huhubot/tests/contract/foundation/recovery_lifecycle_test.go
dbb24a005d8f9712e4dbe831a6eaa88dcb0991aafef579a0393f7745d8051abc  native/huhubot/tests/contract/foundation/runner_test.go
a86800de59a9b5b0824e15b6c9c17b318209eee3f376a587f6378b4e3bf49ada  native/huhubot/tests/contract/foundation/stop_phases_test.go
2f181d5dea616bf9786b93a9387cbe5ad9d8f5cc9df568db1bca9aa95f6795dc  native/huhubot/tests/contract/recovery/producer_test.go
42ae627b43bfb394c27f4976e02e7d0ec52ba0e21dd64d888de1beda6eba448c  src/modules/huhubot/api.ts
3244d55887a0bce2f8b42f9e263a8cf9c01b1005d9bfc253755c795a96e4a10e  native/huhubot/internal/adapters/inbound/stdio/server_lifecycle_test.go
b13b3a79994d9a1cf2858f32d50f429dd4c0ae5de28c41200e27be06b82fab02  native/huhubot/tests/contract/foundation/stop_repair_test.go
ee83c9f9977b0fae9bd522afa428591801b162c27d828a216fb33d29cd1e6685  native/huhubot/tests/contract/foundation/shutdown_observer_test.go
```
