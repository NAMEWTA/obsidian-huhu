# 137：记忆 typed 返回编码前校验修复

Session: 20261025T043239Z
Task: 137-memory-result-validation-recovery
Status: completed

## 聚焦交接

本次仅修复 F-133-01 的纯 Go API typed Memory/context 返回门。公开 Router 的原始返回测试先红后绿；Go 1.26.10 的最终 `api`/`hap` 定向测试与 vet 均为实际 exit 0，35 个固定闭包输入在检查期间无漂移。代码候选交回 Root 独立复审；没有修改 TS、schema、Core、SQLite、lock、生成器、正式 Evidence 或票状态。所有本人启动的产品检查进程均已 `communicate`/Wait，当前无进行中进程。

## 产物与验证

- `native/huhubot/internal/application/api/memory_result_validation.go`：纯 helper 在 JSON Marshal 前验证 SourceSnapshot/SourceScope 的必需 ID、UTF-8、scopeResourceIds、正 Decimal、hash、kind、range，以及可选 title；RunUsage 允许原合同的零和省略值。
- `native/huhubot/internal/application/api/memory.go`：Body、candidate、job/run、settings 分支复用 helper，补可选 ID、Reason、Usage 与 eligible settings Reason 的编码前检查。原 `CanonicalMemoryInputBinding`、body-free manifest helper、DTO/wire 形状和预算常量未改。
- `native/huhubot/internal/application/api/context.go`：view/entry 的 Reason、SourceRefs 和可选元数据在编码前检查 UTF-8 与嵌套来源，保持 context.get 整包 `262144` 字节预算，无单 entry `245760` 字节限制。
- `native/huhubot/internal/adapters/inbound/hap/memory_result_validation_test.go`：真实 `protocol.hello`→公开 Router→显式 fake MemoryAPI 的永久回归，验证错误是 `INVALID_APPLICATION_RESULT`，并保留 512 字节多字节 ID、MaxInt64、Unicode、零/省略用量及大 context 页正控。fake 仅证明输出门，不冒称真实 Store/SQL producer。

源码与本任务日志、报告的逐文件 SHA256 见 `manifest.json`。旧 132 API helper/golden 由完整 `api` 包测试覆盖；没有更改旧样本或代码。

## 固定输入与检查回执

最终环境：`/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go`，`GOWORK=off`、`GOEXPERIMENT=`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`、`CGO_ENABLED=0`、`GOTOOLCHAIN=local`。`12-go126-list` 的 156 个实际测试依赖包中，本仓目录仅 `application/api`、`adapters/inbound/hap`、`protocol/hap`（加 hap external test 包），无 Core/SQL；见 `logs/17-closure-summary.json`。最终 35 文件与模式固定输入见 `logs/11-go126-input.json`，检查后 `logs/15-go126-drift.json` 的 drift 为 `[]`。

| 回执 | 实际命令/输入 | exit | Wait 秒 | 结果 |
| --- | --- | ---: | ---: | --- |
| `logs/01-red` | 初版永久 Router 来源反例，默认 Go 1.27.1 | 1 | 8.204326 | 9 个目标反例原红；后被准确版本复现取代 |
| `logs/02-red` | 扩展 Job/context/settings 反例，默认 Go 1.27.1 | 1 | 0.332320 | 8 个分支及 settings 原红；后被准确版本复现取代 |
| `logs/11-go126-version` | 明确 Go 1.26.10 | 0 | 0.003951 | `go version go1.26.10 linux/amd64` |
| `logs/12-go126-list` | `go list -deps -test` 两目标 | 0 | 0.034391 | 纯 API/HAP/protocol 闭包 |
| `logs/16-go126-red` | 133 冻结旧 `memory.go` SHA `855d2374…`、旧 `context.go` SHA `dc8403b6…`、当前永久 Router 测试，隔离纯模块 | 1 | 0.554703 | 18 个目标反例原红；合法正控通过；输入摘要见 `16-go126-red-input.json` |
| `logs/13-go126-test` | `go test ./internal/application/api ./internal/adapters/inbound/hap -count=1 -v` | 0 | 0.647856 | API 全包及 Router 回归绿 |
| `logs/14-go126-vet` | `go vet ./internal/application/api ./internal/adapters/inbound/hap` | 0 | 0.134359 | 无报告问题 |

所有表中命令由 Python `Popen` 后 `communicate` 实际 Wait，原输出、参数、退出码、时间在同名前缀 `.log`/`.json`。`03–10` 是默认 Go 1.27.1 的探索/复测（list/test/vet exit 0，输入无漂移），已由 `11–15` 的 Go 1.26.10 最终回执取代；未把工具链差异隐去。隔离红灯仅复制 133 已冻结的两个旧生产文件与当前纯 API/HAP/protocol 闭包，不在原工作区回退源码；原旧文件 SHA 与 133 报告一致。

回归结果：512 UTF-8 字节来源 ID 和 MaxInt64 revision/epoch 通过；513 字节 ID、越界正数、非法 Go UTF-8、SourceScope、scopeResourceIds、Body.JobID/user CreatorAgentID、candidate/job/Run Reason、Run.Usage、eligible settings Reason、context view/entry Reason/SourceRefs/可选元数据被拒绝。`InputTokens`/`OutputTokens` 的 `0`、空省略及 MaxInt64 仍通过。合法 context 页实测编码 `249267` 字节（大于普通 object 的 `245760`，小于整页 `262144`）通过；超整页反控被拒。

## 问题与下一步

未运行 Core/SQL、真实来源受理、真实 BotClient、默认装配、全部 Go 矩阵、真实模型、Obsidian 与目标 OS；这些不是本纯输出门的通过声明。正常来源资格、权限与实际 producer 仍由 Store 检查。F-133-02 的 TS 修复属于 136 原 owner，本任务不改。Root 应基于本轮新源码输入独立复审并继续共同代码门；133 的 request-changes 历史结论保持原样。无提交、推送、发布或归档。
