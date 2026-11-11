Session: 20261025T043239Z
Task: 160-global-memory-api
Status: completed

## 聚焦交接

本次只完成 T-15 所需的 **纯 API/内部能力阶段**。[准确签名与接线合同](contract.md) 已原生发 Root、原 Memory owner（161）和原 Events/Grants owner（162）。T-15 的 SQLite proposal、014 事实 Tx、HAP、Broker、三 SDK、物理投递、联合召回及运行验收尚未完成；两个 global wire 方法的 `implemented` 仍均为 false，不据本报告签 AC-020/022 或 T-15。

仅修改 `native/huhubot/internal/application/api/memory.go`、`tooling.go`，新增同目录 `global_memory.go`、`global_memory_test.go`。`ValidateMemoryResult` 现在可接受合法 pending proposal、proposal Get/List、body-free terminal stub 与 resolve Receipt，并严格拒绝 UTF-8/正文 hash/状态/target CAS/expiry/预算错误。新 `GlobalMemoryToolDraft` 只含 operation/target/scope/text/expectedRevision，`GlobalMemoryToolProposal` 只含安全 handle；`GlobalMemoryToolProposer` 与现有 owner `GlobalMemoryAPI` 是独立能力。纯调用/结果验证禁止混合 Effect/Collaboration/Resolve 负载。旧工具字段为 `omitempty` 零值，未改变旧 HAP DTO 或生成物。

Root 对 158 的两项处置已落实为合同边界：未知 `AllowedTools` 配置继续兼容，不普遍收紧；普通和 managed 本机 stdio 都属于 owner 命令路径，`ManagedOwner` 不是确认权限证明。当前任务没有写配置/Broker/stdio 文件。

## 产物与验证

- Go1.26.10 绝对路径，`GOTOOLCHAIN=local GOWORK=off GOEXPERIMENT='' GOFLAGS=-mod=readonly GOPROXY=off CGO_ENABLED=0`。`go version` 与 `go list -json -test ./internal/application/api` 实际退出 0；闭包仅 API 包与标准库。初次把 go list 的合成 `api.test` 缓存文件当源码，输入解析器 `ValueError` 已保留于 `logs/03-input-first.error`；改为只纳入真实 API 目录后，固定 27 个真实输入，`logs/03-input.json` 记录 SHA。
- 红灯：新增公共结果反例下 `go test -run TestGlobalMemoryPublicResults -count=1 -v ./internal/application/api` 实际 test exit 1，旧 `ValidateMemoryResult` 拒绝合法 proposal；原 stdout/stderr 与 receipt 在 `logs/02-red.*`。
- 绿灯：落生产后 `go test -run TestGlobalMemory -count=1 -v ./internal/application/api` 与 `go test -count=1 ./internal/application/api` 实际退出 0，均已完整 Wait，见 `logs/04-green-focused.*`、`logs/05-api-all.*`。`gofmt -l` 输出空；最终 27 输入相对测试前零漂移，4 源 SHA/mode 见 `logs/06-freeze.json`；两个 methods flag 实际均 false。
- `contract.md` 固定后续 Memory `WithGlobalTx`/Prepare/Apply/Check、globalmemory repo、Memory ProposalReader、Events 物理 reader 的 adapter 侧签名和同 Tx 顺序；应用/领域不引 SQL，015 不另建事实账本。工件和源码摘要见 `manifest.json`。交接结构校验回执见 `logs/return.json`。

## 问题与下一步

Root 可在冻结的 API checkpoint 上调度 161/162 及 015/服务/Core/Broker 作者。后续必须从真实 claim/Run 与已消费闭包证明模型来源，在一笔 Memory-owned Tx 原子写 proposal/确认/receipt；HAP owner 构造与两个方法可用性须待全链就绪；Events 要在 queued frame 写前复核 proposal 与来源。纯 API 验证既不证明这些运行资格，也不证明 Provider/Obsidian/目标 OS；其测试不替代 Lead 的完整 Go/物理 stdio/独立双轴审查。
