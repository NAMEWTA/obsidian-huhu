Session: 20261025T043239Z
Task: 163-global-memory-runtime
Status: completed


本轮完成 T15 的 API、proposal adapter、015/schema 11、HAP/stdio owner 入口、Memory/Events reader 接缝和 Core 组装候选。没有修改 014 SQL、旧 TASK/REPORT 或正式 change 状态，没有提交、推送、发布或归档。

## 聚焦交接

- `OwnerCommands` 只实现 `api.GlobalMemoryAPI`；`ToolProposer` 只实现 `api.GlobalMemoryToolProposer`。普通 `hap.New` 没有 owner capability，`hap.NewOwner` / `stdio.NewOwner` 只由本机 composition 注入；ordinary 与 managed stdio 共用 owner 路径。
- 新增 migration 015 `memory_global_proposals`，在连续 schema version 11 注册。proposal 固定 preview/frozen JSON、actor、target head/hash、expiry、state/CAS、receipt 关联；confirmed facts 仍由 Memory `GlobalFactTx` 唯一写入口负责。
- `globalmemory.Store` 实现 owner propose/resolve、tool propose、ProposalReader 和 Events delivery reader；终态 proposal 读取会清除持久 preview body，只返回 body-free stub。同一 Memory transaction 内完成 epoch/receipt/preview/current qualification/CAS；approve 调 Memory apply，reject 不改 014。metadata-only owner delete 使用 Body=nil；create/update 仍要求 body。
- `memory/global_facts.go` 当前共同作者版本统一 actor `owner|tool`；owner delete 只依 target metadata/CAS，tool 仍要求完整来源。`globalmemory.Store` 通过 `conv.Metadata` 取得真实 tool command epoch。
- Core 安装同一 proposal Store 到 Memory 与 Events，并暴露 `Facade.GlobalMemory`；T06 Broker 的 `SetGlobalProposer` 仍需后续 owner 对真实模型工具消费者做最终链路验收。
- `generate.mjs` 已把两个 global wire method 标为 implemented，并实际运行 generator；methods/schema/golden 与 Go embed 产物已同步。

## 产物与验证

### 代码与合同

新增或维护的主要文件：

- `native/huhubot/internal/adapters/outbound/sqlite/globalmemory/store.go`
- `native/huhubot/internal/application/memory/global/service.go`、`service_test.go`
- `native/huhubot/internal/adapters/outbound/sqlite/migrations/015-global-memory.sql`、`migrations/embed.go`
- `native/huhubot/internal/adapters/inbound/hap/router.go`、`memory.go`、`global_memory_test.go`
- `native/huhubot/internal/adapters/inbound/stdio/server.go`、`global_memory_test.go`
- `native/huhubot/internal/bootstrap/core.go`、`cmd/huhubot/main.go`
- `contracts/hap/v0.1/generate.mjs` 及其真实生成输出
- 设计接缝见本目录 `contract.md`。

关键生成产物 SHA-256：

- `contracts/hap/v0.1/generate.mjs`: `5c87669899a3ff014e9295824ae9d5ff17305ae367605f23401e36e1530090d0`
- `contracts/hap/v0.1/methods.json`: `cbd5e7ca33536cfebee619f6805c28cc22f178b07d48425f59c45f1fad7a1dbf`
- `contracts/hap/v0.1/schema.json`: `4e3bd077dd784b5d9a51a87fc5088627c423093c0174f0c4605584a639a227f5`
- `contracts/hap/v0.1/fixtures/golden.json`: `458a7a49654f29a29f95fffac4044b10496aa9f84e46bce758c67305811bf0f0`
- `native/huhubot/internal/protocol/hap/methods_generated.go`: `cbfeab29e5dad9f4eef8d17e7ead5c0abde7b6e41651bc29030681f155487049`
- `native/huhubot/internal/protocol/hap/schema_generated.json`: `4e3bd077dd784b5d9a51a87fc5088627c423093c0174f0c4605584a639a227f5`

### 实际命令

固定环境：Go 1.26.10 absolute toolchain，`GOTOOLCHAIN=local GOWORK=off GOEXPERIMENT='' GOFLAGS=-mod=readonly GOPROXY=off CGO_ENABLED=0`。每个命令已等待进程退出；没有后台进程。

- `node contracts/hap/v0.1/generate.mjs` → exit 0，生成 72 methods / 313 DTO cases。
- `go test -run '^$' -count=1 ./internal/adapters/outbound/sqlite/globalmemory` → exit 0。
- `go test -run '^$' -count=1 ./internal/application/memory/global` → exit 0。
- `go test -run '^$' -count=1 ./internal/adapters/inbound/hap` → exit 0。
- `go test -run '^$' -count=1 ./internal/adapters/inbound/stdio` → exit 0。
- `go test -run '^$' -count=1 ./internal/bootstrap` → exit 0。
- `go test -run '^$' -count=1 ./internal/protocol/hap` → exit 0。
- HAP focused `go test -run 'TestGlobalMemory' -count=1 -v ./internal/adapters/inbound/hap` → exit 0；普通 Router 无 owner、owner dispatch、invalid result、metadata delete body-free subject 断言通过。
- stdio focused `go test -run 'TestLocalOwnerStdioPhysicallyFencesGlobalPreviewForBothConnectionModes' -count=1 -v ./internal/adapters/inbound/stdio` → exit 0；managed=false/true 均通过。

命令日志在 `logs/06-compile-*`, `logs/07-final-compile-*`, `logs/08-hap-global-memory.log`, `logs/09-stdio-global-memory.log`。

## 问题与下一步

本轮仍是 source/targeted-test checkpoint，以下验收没有宣称完成：

1. 尚未运行 SQLite migration/015 真入口、statement/commit fault、并发 approve/reject、reader 当前来源过滤、恢复/reopen、完整 Core/Application durability 回归；Root 需在统一 Go/DB 窗口执行。
2. 尚未完成 Root 的物理 stdio/三协议 SDK/CLI 联调，也未运行真实 Provider、Obsidian 或目标 OS。
3. Broker/common 的真实 `ToolExecution` consumer 链仍由后续 owner 负责；当前 Core 仅提供 `ToolProposer` 接缝，不能以 wire flag/编译通过代替 model→Run→proposal→owner confirmation E2E。
4. 生成产物已更新 global flags；Root 需将该产物纳入最终输入漂移与全仓回归，确认旧 methods/fixtures 字节未产生无关变化。

本报告不签 T15、G3 或 Goal 的完整闭包；交回 Root 做 manifest、dispatch return、物理 E2E 和最终双轴审查。
