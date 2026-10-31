# T-02 系统凭证 provider 与私有通道代码候选

Session: 20261025T043239Z
Task: 020-credential-provider
Status: completed

## 聚焦交接

020 获分配的完整 Go 凭证切片已实现，生产与测试 writer 已停写；所有本任务 probe、worker、security stub、真实 Runner 子进程均已 Wait/退出。本报告的 completed 仅为候选返回，不推进 Ticket、Map、Goal 或正式 Evidence，也不声称真实用户 OS 凭证服务通过。独立双轴审查、集成及整体 E2E 仍由 Lead 验收。

工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。本任务只写 `native/huhubot/internal/adapters/outbound/credentials/**`、`native/huhubot/tests/contract/assistant/credentials*` 与本任务报告/日志；未修改 API、SQL、go.mod/sum、CLI/bootstrap、TS、根构建、notices 或正式状态。019 唯一维护共享 API/CLI/catalog/依赖，021 唯一维护 TS transport/client；没有另派 Agent、提交、推送或发布。

冻结的 22 个 owned 源/测试文件逐项 SHA-256 见 source.sha256（历史日志已清理：`logs/source.sha256`），manifest SHA-256 `0f8f6eb223e4e1b9d42f09e258723bbf8f4de357d2b7591a22ec16f29e5e83fc`。当前输入逐项摘要见 inputs.sha256（历史日志已清理：`logs/inputs.sha256`），manifest SHA-256 `88853e0f4f8d56abc4c01406edd438311f83b5a0c411a9411303feb364d7bb09`。

### 已冻结接口与消费者

019 的 `api/credentials.go` 是唯一共享契约：`CredentialStatus{Mode,State,Reason}`、`CredentialMetadata{ProfileID,CredentialRef,Status}`、`CredentialProvider.Put/Resolve/Delete/Status/Close`、`CredentialCatalog.Reserve/Lookup/Update/BeginDelete/FinishDelete`、`CredentialRegistration.Register/Delete/Status`。本 adapter 导出 `NewProvider(Options{Executable,WorkerTimeout,Catalog})`、`NewRegistration`、`OpenManagedChannel`、`ServeChannel`、`RunWorker`，没有平行 API。

实际消费者为：019 的 bootstrap/Core 与 CLI、真实 SQLite assistant catalog 和 assistant/model 用例；021 的唯一 managed.ts transport 与 CredentialClient；Go 内部模型消费者只经 Provider.Resolve 取 caller-owned 字节副本。公开 HAP 无取秘密方法。Catalog 必填，固定 Profile/ref ownership；Reserve 永久拒复用，删除以 BeginDelete 在 SQL 短事务检查模型修订/快照引用并取得 guard，OS 调用在事务外，FinishDelete 回写安全结果。Provider.Delete 直接入口同样使用此 guard。Close/取消造成的失败保持已知 mode 并释放 guard，不把删除卡成永久 in-use。

### 实现选择及失败边界比较

1. 拒绝进程内直接 go-keyring 或 goroutine 包装：同步 D-Bus/CredMan 调用无法随请求取消，超时返回不能证明后台工作停止，不能满足资源 owner/reap 合同。
2. 采用同一绝对、验证为本进程可执行文件的一次性内部 worker。父 supervisor 最多 8 在途、默认最多 2.5 秒，固定 `--credential-worker=stdio-v1`，固定服务 namespace `huhu.bot.v1.<profile>` 和 account/ref；匿名 stdin/stdout 专用协议，不使用 HAP、env、argv、秘密文件或 listener。Linux/mac supervisor 使用独立进程组，取消/超时 kill 并 Wait；stdout/stderr 均有界，原 OS 错误不返回。库不支持 context 的 Linux/Windows 调用由 worker 进程边界终止；无 DeleteAll 或任意 service/query。
3. macOS 不调用上游 Set。自有 `/usr/bin/security -i` adapter 在 Start 前检查完整 escaped/base64 命令与 4096 字节上限，秘密只进入 stdin，Get/Delete 参数无秘密；CommandContext、WaitDelay 与所有分支 Wait，输出有界并清零。worker 内 2 秒期限先于 supervisor 2.5 秒期限。陌生非零退出/失去回执不能证明写未提交，因此保持 unknown。
4. Linux 仅使用显式 DBUS_SESSION_BUS_ADDRESS 或现有 XDG_RUNTIME_DIR/bus socket，禁止 godbus 自动通过 PATH 启动 dbus-launch。worker 环境为明确系统 allowlist，允许上述两个 locator，禁止模型/CLI API_KEY 与 PATH 等环境自动继承。

保护写超时、取消或异常回执丢失保持 unknown，持久 catalog 安全状态并按同 ref Status 核查；不自动重放、不自动落 session-memory。明确选择 session-memory 才在 provider 生命周期保存可变 buffer，注册和 Resolve 都复制，Close 先取消/等待再尽力清零，重开从 catalog mode 判定 missing 且不尝试 protected。JS/Go 字符串副本、第三方库和 OS 内存不承诺绝对擦除。

### 与 021 的最终私有协议

请求为 `u32BE bodyLength + u8 version(1) + u8 op + u16BE metadataLength + UTF-8 JSON metadata + raw secret`。body 最大 16384、metadata 最大 2048、secret 最大 2048；op=0 hello、1 register、2 delete、3 status。requestId=`request:<32lowerhex>`，ref=`credential:<32lowerhex>`；profile 为 1..256 printable ASCII 且必须逐请求匹配实际打开的 DB Profile。仅 register 允许 1..2048 raw tail；其余 tail 必须空。拒绝重复/未知键、null/非字符串、错误 UTF-8、版本/op/长度/required/ref/profile/hello 顺序，并 fail closed。

hello metadata 仅 requestId/profileId；register 增 credentialRef/storagePreference(protected|session-memory)；delete/status 增 credentialRef。回执为 `u32BE length + JSON {version:1,requestId,profileId,credentialRef,mode,state,reason?}`。最终共同决定 mode 含 none（与019安全 DTO一致）：hello 的 ref 空、mode none、state available、无 reason，仅代表通道握手；未知记录 mode none，不伪称受保护或内存可用。register mode 保持请求模式；其他 mode 为已知记录模式或 none。

安全 reason 有限集合：CREDENTIAL_MISSING、CREDENTIAL_DELETED、PROTECTION_UNAVAILABLE、PROTECTION_LOCKED、PROTECTION_DENIED、PROVIDER_FAILED、OPERATION_TIMEOUT、CREDENTIAL_IN_USE、CREDENTIAL_REF_REUSED、CREDENTIAL_REF_INVALID、PROFILE_MISMATCH、REGISTRATION_FAILED、CATALOG_UNAVAILABLE、SESSION_CLOSED、IN_FLIGHT_LIMIT、REQUEST_CANCELED；available 不带 reason。无 secret/hash/OS 原错。

最大 8 已受理未回执，第 9 个 fail closed。空闲等待不设 3 秒超时；收到首字节后半帧限 3 秒，每操作含回执写 3 秒。provider 在期限内返回 unknown 回执时通道保留可直接同连接 Status；客户端 3 秒未收到回执则关闭并重连同 ref 核查，不重放 register。Unix fd3/4 先验证 pipe/socket 与方向，再复制为 non-inherit、nonblocking、pollable descriptors，关闭可打断 I/O；Windows 读取固定 libuv CRT table，检查 count/bounds/flags/handles/pipe、与标准句柄/对端不重复、duplicate 与清除 inherit，未知 ABI 拒绝，不调用 os.NewFile(3)。

## 产物与验证

### 文件

- `credentials/provider.go`：受保护/会话模式、并发/关闭、catalog 登记和删除 guard、安全结果/unknown。
- `credentials/worker.go`、`process_unix.go`、`process_other.go`：一次性 worker 协议、有界输入输出、环境、kill/wait。
- `credentials/keyring_linux.go`、`keyring_windows.go`、`keyring_darwin.go`、`keyring_other.go`、`security.go`：各 OS backend 和明确不支持路径。
- `credentials/frame.go`、`channel.go`、`channel_unix.go`、`channel_windows.go`、`channel_other.go`、`crt.go`：strict framing/receipt、生命周期与平台描述符。
- 同目录 5 个 test 文件以及 `tests/contract/assistant/credentials_cli{,_unix}_test.go`：行为、故障、真实 CLI 和子进程观察。完整准确路径以 source.sha256 为准。

### 自动化结果（最终固定输入）

以下均在 `native/huhubot/`，Go1.26.10，Linux/amd64；所有命令真实 exit 0，无 skip 代替通过。最终输出为原始工具 stdout/stderr；日志不含测试秘密。

| 命令 | 结果/观察 | 日志 |
| --- | --- | --- |
| `go test -mod=readonly -v ./internal/adapters/outbound/credentials ./tests/contract/assistant -count=1` | credentials 8.410s、assistant 4.846s，全部 pass | [final-targeted.log](logs/final-targeted.log) |
| `go test -mod=readonly -race ./internal/adapters/outbound/credentials ./tests/contract/assistant -count=1` | credentials 15.977s、assistant 6.920s，全部 pass | [final-race.log](logs/final-race.log) |
| `go vet -mod=readonly ./internal/adapters/outbound/credentials ./tests/contract/assistant` | exit 0，无诊断 | [final-vet.log](logs/final-vet.log) |
| `GOOS=<target> GOARCH=<arch> CGO_ENABLED=0 GOTOOLCHAIN=go1.26.10 go build -mod=readonly -o <临时目录> ./cmd/huhubot` | linux/amd64、linux/arm64、darwin/amd64、darwin/arm64、windows/amd64 各 exit 0，临时产物已删除 | [final-cross.log](logs/final-cross.log) |

可观察覆盖：

- 真实 SQLite/assistant 模型消费者阻挡引用中 Delete；protected 控制 backend 成功、missing、locked、unavailable、denied、timeout unknown 持久和同 ref status reconciliation；session 输入/输出副本、关闭 buffer 清零、重开失效、Profile 隔离、DB/文件无 sentinel。
- strict request 的所有截断、body/meta/secret 超长、重复/未知/null/UTF8/ref/op/version/tail/hello；真实 ServeChannel+net.Pipe+SQLite 覆盖错误 Profile、hello 前操作、重复 hello、半帧 3 秒、慢消费者 3 秒、8 个 barrier 已就绪请求后第 9 个拒绝并等待取消完成。
- 独立测试可执行程序替换 OS backend，实际匿名 pipe 测试 Register/Resolve/Delete；argv/env 无 sentinel，内部 Resolve stdout 允许必要秘密，父输出安全；明确 readiness 后取消及 deadline kill+Wait，崩溃/丢回执 unknown。mac security stub 证明 Start 前长度拒绝、stdin/base64、挂起取消/Wait、提前关闭/非零退出脱敏和回收。
- 实际产品 CLI build+launch 验证：无 managed 的 private flag 拒绝；worker 精确单 flag、非法帧在 OS 访问前拒绝；Unix 私有 EOF、半帧和 oversize 都取消 Runner 且实际 Wait，业务 stdout/stderr 0 字节。
- Windows CRT 32/64bit 合成合法和 count/bounds/flags/null/invalid/重复/标准句柄别名/未知宽度反例；五目标是编译证据，不冒充现场 OS 保护通过。

021 独立报告本轮 9 文件 64 tests（含 4 条真实 TS→Go private pipe）通过：session register/status/delete/restart-missing、绑定 in-use/解绑删除、HAP 与实际 `/proc` argv/env 无 sentinel、跨 Profile/错误 hello 拒绝、普通 HAP 无 resolve、pending close unknown 与回收。该原始联合输入/结果归 021，本报告引用其原生回传，Lead 应回读 021 REPORT/logs；不把 TS 模拟 peer 当作真实 OS provider。

### 红绿、失败与恢复

[red-green.log](logs/red-green.log) 保留历史真实输出摘录、命令和 exit。有效行为 red 为：strict register 尚未实现；真实模型引用可被直接 Provider.Delete 绕过；protected worker 无回执被错误标 failed。逐项最小实现后对应重跑绿，最终套件仍保留断言。

依赖尚未由019接纳的 readonly setup failure、测试 select 语法错误、隔离子程序缺少 `--` 参数分隔，以及 CLI fixture 在 cancel 后读取 ctx.Err 的误判，均如实保留为环境/fixture 失败，不算有效行为 red。已修复且最终完整回归 pass；未删测试、跳过目标或放宽断言。其余风险测试主要在实现后补齐，不虚称每项都有先红证据。

### 来源与项目规则执行

按 workspace roots/catalog 发现，读取 runtime、Map8 → 当前 dev 及 architecture/testing/licensing/build-and-release → T02，以及 I implementation-procedure/execution-preflight、适用 TDD/并发/资源规则；完整回读010 REPORT和 credential-interface-research。dev 的边界、owner、生命周期、风险验证实际落实于本代码/测试与日志，未把仅阅读入口当作实现验证。

采用010已固定的 `github.com/zalando/go-keyring v0.2.8`（origin `a8cdfe320cc8bc0534c895a648dc9214715a9da5`，MIT；其 darwin 源头含 Google Apache-2.0 但本代码不调用该实现），`github.com/godbus/dbus/v5 v5.2.2`、wincred v1.2.3；本次真实回读模块缓存源码与 license，依赖接纳/生成通知归019/T27。代码为自身实现，未复制 libuv C 或上游 security Set。

平台布局来源为 [libuv 固定源码](https://github.com/libuv/libuv/blob/1cfa32ff59c076ffb6ed735bbc8c18361558661f/src/win/process-stdio.c)、[Microsoft STARTUPINFO](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/ns-processthreadsapi-startupinfow)。mac 错误语义核验 [Apple errSecItemNotFound](https://developer.apple.com/documentation/security/errsecitemnotfound)、[Apple errSecInteractionNotAllowed](https://developer.apple.com/documentation/security/errsecinteractionnotallowed) 及其官方论坛说明；只对明确已知的 missing/locked/denied 作稳定分类，未知退出保守 unknown。

## 问题与下一步

无已知未修复的本切片自动化失败。源码与测试停写；上述命令全部完成，所有本任务拥有的子进程、私有 pipe、临时 binary 均已关闭/Wait/清理。没有访问真实用户 keyring、模型、CLI 账号或 Obsidian，没有索取用户秘密。

未运行项明确为 user-owned / not-run：真实 Linux Secret Service、macOS Keychain、Windows CredMan 的保护成功/锁定/拒绝；Windows/macOS 实机 private handle/pipe 与实际 Electron/libuv ABI；真实 Provider 调用与 Obsidian 交互。这些不能由 crosscompile、合成 CRT 或受控外部程序证明；未知 Windows ABI 代码路径会 fail closed 并允许无密钥草稿保持。

下一步由 Lead 回读019/020/021固定输入、运行独立双轴审查与集成检查，并由T27更新真实依赖闭包许可/构建产物。任何后续 finding 按新任务协调原 owner 修复，不能在冻结候选上继续隐式写入。未请求的提交/发布不属于本任务完成条件。
