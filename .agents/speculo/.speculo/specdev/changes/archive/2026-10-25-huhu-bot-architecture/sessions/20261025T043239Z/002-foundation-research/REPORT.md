# T-01 依赖与边界研究

- **Session：** 20261025T043239Z
- **Task：** 002-foundation-research
- **Status：** completed（研究子任务完成；不是 T-01 或产品验收完成）
- **日期 / 环境：** 2026-10-25；Linux amd64；初始 Go 1.27.1，后以 Go 1.26.10 复验；Node v26.11.1。
- **合同：** 已回读 TASK、完整 Map、dev 与 architecture/testing/licensing/build-and-release、T-01、Spec §9–12、ARCHITECTURE、REF-01/02/07/08；最后回读 Map revision 3 / T-01 新写集。未编辑任何生产代码、正式 Ticket/Evidence/Spec/Map/Goal。

## 结论供 Lead 接纳

推荐生产采用 **github.com/ncruces/go-sqlite3 v0.35.6 + Go 1.26.10**，默认 VFS、CGO_ENABLED=0。同一文件库夹具中，ncruces 与 mattn v1.14.52 的事务、WAL、外键、在线备份、运行中取消、跨进程竞争、实际 DB 身份锁、重开和坏库预检均通过。推荐依据是无 CGO 的发行成本与已实测的必需行为，不是宣称某个驱动在所有场景更快。两者实际 SQLite 版本均为 3.53.4。

保留一个生产 driver，SQL/UoW/驱动错误只存在 SQLite adapter。ncruces 有两个本次发现的注意点：

1. 查询取消在约 50 ms 返回 `sqlite3: interrupted`，不满足 `errors.Is(err, context.DeadlineExceeded)`。应用错误归一化应先检查请求 context 是否取消，再处理驱动码；不能按字符串判断业务含义。
2. 对损坏文件调用 Ping 可以成功。启动必须实际读取 schema 并执行 `PRAGMA quick_check` 等完整性预检；明确区分新建空库、正常打开、损坏和不兼容版本，不能失败后重建空库。最终探针证明坏文件保留原字节并返回错误。

版本与来源已经通过 `go list -m -json @latest`、`go mod download -json` 和校验和核验，全部发布日位于近两年活动窗口。最新查询不是随生产自动升级的建议。

| 模块 | 固定版本 / 发布日 | 选择与限制 |
| --- | --- | --- |
| ncruces/go-sqlite3 | v0.35.6 / 2026-09-23 | 生产建议；Go >=1.26.0，MIT，wasm2go，非旧 Wazero 运行时 |
| mattn/go-sqlite3 | v1.14.52 / 2026-09-05 | 对照候选；Go >=1.21，MIT，构建需 CGO/C 编译器 |
| cloudwego/eino | v0.9.22 / 2026-10-19 | 既定 Engine 适配基础，Apache-2.0 |
| eino-ext/components/model/openai | v0.1.13 / 2026-04-16 | Chat Completions / schema.Message |
| eino-ext/components/model/agenticopenai | v0.2.4 / 2026-09-24 | Responses / schema.AgenticMessage，需桥接同一 HUHU Engine 合同 |
| eino-ext/components/model/claude | v0.1.26 / 2026-09-24 | Messages / schema.Message，建议优先于第二套 AgenticMessage 路径 |
| eino-ext/components/model/agenticclaude | v0.1.7 / 2026-09-24 | 已比较替代路径；生产没有真实消费者时无需额外引入 |

所有 EinoExt 模型模块均 Apache-2.0。固定 origin SHA 与 go.sum 摘要在 [direct-licenses.json](artifacts/direct-licenses.json)、[download-modules.json](artifacts/download-modules.json)。依据为实际下载模块而非仓库 HEAD：

- [ncruces v0.35.6 清单](https://github.com/ncruces/go-sqlite3/blob/v0.35.6/go.mod)、[许可](https://github.com/ncruces/go-sqlite3/blob/v0.35.6/LICENSE)、[VFS 限制](https://github.com/ncruces/go-sqlite3/blob/v0.35.6/vfs/README.md)。
- [mattn v1.14.52 清单](https://github.com/mattn/go-sqlite3/blob/v1.14.52/go.mod)、[许可与构建说明](https://github.com/mattn/go-sqlite3/tree/v1.14.52)。
- [Eino v0.9.22](https://github.com/cloudwego/eino/tree/v0.9.22)、[EinoExt 固定模型修订](https://github.com/cloudwego/eino-ext/tree/3603a39473c3e7b2aa3bfc11216487c94b8c7fd9/components/model)。

## 实际 SQLite 探针

源码在 [sqlite-probe](artifacts/sqlite-probe/probe.go)。两个构建标签使用同一主夹具；每次运行使用新的临时目录。运行记录保留首轮失败和修改后的结果，未覆盖失败历史。

| 检查 | mattn v1.14.52 / Go1.27.1 | ncruces v0.35.6 / Go1.27.1 | ncruces / Go1.26.10 |
| --- | --- | --- | --- |
| WAL 开库与 SQLite 版本 | 通过，3.53.4 | 通过，3.53.4 | 通过，3.53.4 |
| Commit/Rollback 后真实行数 | 1 行，回滚未落库 | 同左 | 同左 |
| 外键拒绝无来源行 | 通过 | 通过 | 通过 |
| 未 checkpoint 的 WAL 在线备份 | 20,632 B WAL；backup 1 行，integrity_check=ok | 同左 | 同左 |
| 长递归查询 50 ms 取消 | context deadline exceeded，50 ms | SQLITE_INTERRUPT，50 ms | SQLITE_INTERRUPT，51 ms |
| 另一进程持写事务时拒绝 INSERT | busy，155 ms，无多余行 | busy，155 ms，无多余行 | 同左 |
| DB fd 实例锁：原路径、symlink、hardlink | 三者均 INSTANCE_CONFLICT；释放后可取锁 | 同左 | 同左 |
| 关库重开真实读行 | 1 行 | 1 行 | 1 行 |
| 坏文件 quick_check 与字节保留 | file is not a database；原字节不变 | 同左 | 同左 |

mattn 与 ncruces 的一次探针进程最大 RSS 分别为 8,472 KiB、8,456 KiB；总 wall time 0.23 s、0.22 s。样本很小并含同样的固定等待，不用于宣称吞吐、每连接内存或性能胜负。上游仍明确指出 ncruces 每连接内存较高，应保持一个写连接与有界读池。

第一轮 ncruces 探针退出 1：原因是探针错误假设“取消必包装 context deadline”及“Ping 必读文件”。第二轮改变断言以核验实际合同：有界取消、结合 ctx.Err 判定，及真正读取 quick_check。生产仍需实现相应处理；不能把探针断言修正当生产缺陷已修好。原记录见 [ncruces-result.json](artifacts/ncruces-result.json)，最终见 [ncruces-result2.json](artifacts/ncruces-result2.json)、[mattn-result2.json](artifacts/mattn-result2.json)、[Go1.26.10 结果](artifacts/ncruces-probe-go126-result.json)。

在线备份分别使用驱动真实 SQLite backup API：mattn 的 SQLiteConn.Backup/Step/Finish；ncruces 的 driver.Conn.Raw().Backup。没有复制正在运行的主文件冒充一致备份。完整 Profile 的 Blob 清单/hash、一致版本及迁移回滚仍属于 T-19。

## 实例身份锁建议

SQLite writer busy 只协调事务，不等于“第二 Runner 启动失败”。必须另有整个 Runner 生命周期的实例锁，并在 sqlite.Open/迁移前取得。Linux 探针在实际 DB 文件描述符上持有非阻塞 flock；同一 inode 的 symlink/hardlink 均由内核拒绝第二进程。锁期间不替换/删除 DB，结束后关闭描述符。普通 lock 文件路径或 realpath hash 无法证明 hardlink 别名安全。

ncruces 在 Linux/macOS 默认使用 OFD 锁，Windows 使用 LockFileEx。不要加入 `sqlite3_flock` / `sqlite3_dotlk` 自定义构建标签，它们改变 SQLite VFS 兼容性，也可能与额外实例锁产生冲突。[上游 VFS 说明](https://github.com/ncruces/go-sqlite3/blob/v0.35.6/vfs/README.md)

Windows 不应直接对整个 DB 用 LockFileEx 独占：同进程另一个句柄也不能访问锁区。建议读取真实 volume/file identity，在统一受管锁根使用该身份键取得专门锁；不能对每个传入路径各建一个锁。此建议是待目标 OS 验证的设计，未宣称已实现。[Microsoft LockFileEx 语义](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-lockfileex)

根目录须来自 OS 非同步受管位置；对父路径和 DB 本身核验，正常文件/符号链接/新文件创建分别处理。空库初始创建与锁取得之间的竞态也应纳入 T-01 实际 Runner 测试。这里的权限 0700/0600 和 flock 结果仅证明 Linux；不代替 Windows ACL 或 macOS 真实启动。

## 合并依赖与许可

[combined-probe/go.mod](artifacts/combined-probe/go.mod) 和 [go.sum](artifacts/combined-probe/go.sum) 同时包含 Eino、四个候选模型 adapter 与选定 SQLite driver。以 `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0` 编译并运行成功，实际输出 `sqlite=3.53.4`，stderr 为空；未发起模型请求。完整 MVS 结果在 [combined-modules.jsonl](artifacts/combined-modules.jsonl)。

合并 ncruces 后实际把 `x/sys` 升至 v0.48.0，`x/crypto` 升至 v0.57.0、`x/net` 升至 v0.58.0、`x/sync` 升至 v0.23.0、`x/text` 升至 v0.42.0；分别编译模型/数据库不能替代这次合并结果。主要模型 SDK 依赖为 anthropic-sdk-go v1.56.0、openai-go/v3 v3.44.0，以及 Chat Completions 的 go-openai fork；只留在 adapter 内。

对实际编译的 91 个 runtime module 根级许可文件做了名称/内容及 SHA-256 清单，见 [combined-runtime-license-inventory.json](artifacts/combined-runtime-license-inventory.json)。当前条目为 MIT、MIT-0、BSD-family、Apache-2.0，未出现未分类根文件。该扫描是输入清单，不是全仓逐文件许可审计，也不替代 T-27 从实际发行构建生成 notices。ncruces 的实际 sqlite driver 闭包仅 driver、go-sqlite3-wasm/v6 v6.3.35304（MIT-0）、julianday v1.0.0（MIT）、x/sys v0.48.0（BSD），见 [sqlite-runtime-licenses.json](artifacts/sqlite-runtime-licenses.json)。

EinoExt openai v0.1.13 的下载子模块不带许可全文，已按其真实 origin `0ebab92e14f26088411dbc440a1ebdc904ccd8a1` 回读仓库 `LICENSE-APACHE` 并保留 [固定全文](artifacts/eino-ext-openai-LICENSE-APACHE)，sha256 `69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b`。最初请求该提交的 `/LICENSE` 返回 404，随后 API 目录确认正确文件名，未把不存在误报无许可证。

官方 Go 下载列表当前提供 go1.26.10 与 go1.27.3；本机初始为 go1.27.1。在 Go1.27.1，sonic v1.15.0 降级 encoding/json 并向 **stderr** 打 WARNING，stdout 无污染；分流记录见 [eino-start.json](artifacts/eino-start.json)。Go1.26.10 无该 warning。`toolchain go1.26.10` 是建议/最低选择，不能强制一个更新的宿主 go 自动降级；可复现构建应明确 `GOTOOLCHAIN=go1.26.10` 或 CI 精确版本。[Go 工具链选择规则](https://go.dev/doc/toolchain)

## Eino 高风险接缝

- Eino v0.9.22 的 `adk/chatmodel.go` 明确区分 Message 的 ReAct 循环和 AgenticMessage 的单轮链路，后者尚无模型 stream 的取消监视/重试保证。HUHU 应保持自己的受控循环、Broker 和持久 Run/Effect/CP，不能依据构造函数成功宣称审批恢复已通过。[固定源码](https://github.com/cloudwego/eino/blob/v0.9.22/adk/chatmodel.go)
- Responses v0.2.4 的 NewResponsesModel 接收 ResponsesConfig，可显式 `MaxRetries=0`；必须显式 endpoint、model、APIKey、`Store=false`、`EnableAutoCache=false`，不启用服务端内建工具/MCP。auto-cache 默认行为可能强制远端 Store，不能使用未声明远端保留语义。[固定 Responses 代码](https://github.com/cloudwego/eino-ext/blob/3603a39473c3e7b2aa3bfc11216487c94b8c7fd9/components/model/agenticopenai/responses_model.go)
- claude v0.1.26 与 agenticclaude v0.1.7 不暴露 MaxRetries，而实际 anthropic-sdk-go v1.56.0 默认重试次数为 2。T-10 必须以真实 HTTP 次数验证预算准入；可在 adapter 使用官方 SDK `option.WithMaxRetries(0)` 做 Eino model bridge，或每个实际尝试均进入预算/取消治理，不能宣称普通 config 已关闭重试。[SDK 请求配置](https://github.com/anthropics/anthropic-sdk-go/blob/v1.56.0/internal/requestconfig/requestconfig.go)
- Anthropic direct 模式仍有 model/base URL 或凭证环境回退。受管 Runner 环境 allowlist 不能继承 Provider/CLI 密钥；构造参数必须全显式，ByBedrock/ByVertex 为关闭，避免云认证自动发现。[固定 Claude 构造器](https://github.com/cloudwego/eino-ext/blob/3603a39473c3e7b2aa3bfc11216487c94b8c7fd9/components/model/claude/claude.go)
- 上游 #1119 当前 Closed；关闭状态不能证明 HUHU 的持久 tool interrupt/resume 无挂起。T-08/09/10 仍需独立受控工具、取消、审批、崩溃恢复和真实 Provider 验证。[Issue #1119](https://github.com/cloudwego/eino/issues/1119)

## HAP 可实现边界

三个 API 分离：TS 公共类型/ServiceKey → HAP DTO → Go Application Command/Result。Domain/Application 不导入 SDK、database/sql、HAP 生成类型、Obsidian。Facade 只组合窄用例，stdio 和第二 fake 入站消费者均调用同一实例；可信 RequestIdentity 由连接建立，payload 不接收 principal/Host 自报身份。

T-01 可以定义 Spec §9 完整方法 schema 与分组，但 hello 只宣告已实际装配的方法。未实施方法返回确定错误；不放成功占位 handler。配置变更统一 CommandMeta（commandId、idempotencyKey、profileId、commandEpoch、适用的 expectedRevision），只由应用事务维护幂等和版本。

codec 建议先 io.ReadFull 读 4 B length，检查 `1 <= length <= 1,048,576` 后分配，再校验 kind 与 UTF-8、JSON/envelope。长度含 kind，不含 4 B 前缀；最大 JSON payload 是 1,048,575 B。batch 总帧仍受此限制且最多 8 项，各项独立；不能误作 8 个各 1 MiB。读协程负责关联 response，不被普通业务调用阻塞，否则反向 Host 请求会死锁。双方向 ID 前缀与 pending map 分开，无 ID 写通知不执行；hello 前业务明确拒绝。只有 owner 能 shutdown/Host attach。

所有 seq/revision 保持十进制字符串，避免 TS 64 位精度丢失；UTC RFC3339；错误 data 保持 Spec 已有 kind/reason/retryable/correlationId。半帧 EOF、非法 UTF-8、零长、超限、未知 kind 的关闭行为和 error 帧需由真实两端夹具冻结，不能只靠生成类型。

候选帧大小做了真实 Node JSON 解码微探针：100 次 1 MiB 帧，p50 0.844 ms、p95 2.578 ms；见 [源码](artifacts/hap-size-probe.mjs)、[结果](artifacts/hap-size-result.json)。它只说明此本机解析成本可接受，不是生产流控、fault matrix 或多客户端验收。最终 maxFrame/maxBatch 仍应由 T-01 的 schema/hello/真实 codec fixtures 共同冻结。

## 命令、退出码与未验证项

| 命令 / 子进程 | 结果 |
| --- | --- |
| `go list -m -json <七个模块>@latest`；`go mod download -json` | 全部 0；原始 metadata 已保存 |
| SQLite `go mod tidy`；`go build -tags mattn` / `-tags ncruces` | 全部 0 |
| 首轮 ncruces probe | 子进程 1；两项探针假设错误，原始结果保留 |
| 修订后两个 driver probe + `/usr/bin/time -v` | 两个子进程均 0，9/9 检查 |
| EinoExt 四模块共同 `go run .` / `go build` | 0；Go1.27.1 的 stderr warning 已单独记录 |
| `GOTOOLCHAIN=go1.26.10 go version` | 0，真实工具链已下载 |
| `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go build` 与选定 driver 探针 | 0，9/9 检查 |
| 合并 SQLite + Eino 全部候选 adapter `go build`、运行、`go list -m -json all`、`go list -deps -json .` | 全部 0；运行 sqlite=3.53.4，stderr 空 |
| Node HAP size probe | 0；仅微测量，不是完整 HAP 验收 |
| Cloud runtime 探测 | 当前工具目录无 environment_status；`/etc/codex/network-policy.json` 不存在。正常网络请求及 Go 下载成功，未打印凭证、未改变代理或策略 |

未验证：Windows/macOS/Linux arm64 真机、TLS/OS 凭证/ACL、实际 Runner/TS 客户端及 Host、崩溃迁移和完整 Profile 备份、磁盘满/断电、真实 Provider 请求/工具/取消/恢复、Obsidian、长期负载/性能。没有把编译和官方支持列表作为目标平台运行通过。上游目前列出 Linux amd64/arm64、macOS amd64/arm64、Windows amd64/arm64 的支持，但仍须 T-27 在拟发行目标验证。[上游支持矩阵](https://github.com/ncruces/go-sqlite3/wiki/Support-matrix)

研究源码/结果集中于本 TASK 的 artifacts；数据和二进制仅在 `/tmp/huhu-bot-foundation-research-20261025`。所有探针进程已完成，无后台监听器。文件摘要见 [artifact-sha256.json](artifact-sha256.json)。
