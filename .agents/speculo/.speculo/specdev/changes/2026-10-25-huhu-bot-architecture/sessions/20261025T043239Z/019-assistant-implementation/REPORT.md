# T-02 助手、配置修订与同库事务实现回执

Session: 20261025T043239Z
Task: 019-assistant-implementation
Status: completed

## 聚焦交接

本片实现了真实 SQLite 助手用例与公共 Facade/HAP/CLI 装配，worker 独立退出时限的窄修复及代码层检查也已完成。completed 仅代表候选交回，待 Lead/独立审查验收；正式 Ticket/Map/Goal/Evidence 仅由 Lead 维护。本片没有提交、推送、发布或再派遣。

作者为 `/root/foundation_go`。原派遣记录 requested model 为 `gpt-6.1-sol`、reasoning effort 为 `xhigh`；这是 Lead 派遣记录，工具没有提供独立底层模型鉴定。020 凭证 adapter、`credentials*` 测试由 `/root/credential_provider` 实现，021 TS 消费者由 `/root/foundation_client` 实现；本片不冒领这两部分作者身份。

实际工作区为 `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。复用已批准 T-02/019、010 研究与本轮原 owner 维护授权；没有创建第二数据库或平行公开 API。

### 已冻结并被真实消费的合同

- `src/modules/huhubot/api.ts`：Draft 与服务器修订分离；model draft 可没有 credentialRef；Agent 返回 `isDefault` 与安全 `CredentialStatus`；T02 update/disable/bind/delete 的 CAS 必填，delete 的 id 必填。其他票 CommandMeta 的可选字段没有被不必要地全局改成必填。
- `internal/application/api/assistant.go`：具体 AssistantAPI、配置快照、Usage、最小 ModelProbe Port；`credentials.go`：provider、registration、catalog Port。API 仅依赖标准库。
- 唯一 HAP schema 仍从公共 BotMethodMap 生成，Go 运行时嵌入同字节 schema，TS owner 使用同一 JSON。HAP `schemaVersion=1` 不变；SQLite `user_version=2` 是独立概念。
- 私有通道仍是 010 冻结的 stdio-v1：受管父子 fd3/fd4、版本/操作/metadata/secret 有界帧。CLI 只在 `--stdio --managed --credential-channel=stdio-v1` 下接纳通道；worker 只能用单独 `--credential-worker=stdio-v1`。秘密不进入业务 HAP、argv、普通环境、数据库或回执。private profile mismatch 会关闭通道；公共业务 profile mismatch 返回稳定 Fault。

公共 API SHA256 为 `2b5b39827d03cfa273d349502b6f7db863e1f3300199df55b107b89a4b58d83f`；schema 为 `ba9c50e3f602db52e66319c0e114c2dc57e373bdddeee418437ff4904252591c`。生成物含 61 方法、122 params/result shape、169 共享方法样本。

## 产物与验证

### 采用方案及真实消费者

比较后采用同一 SQLite UoW 中的 CAS、immutable revision、receipt 与引用，而非配置 JSON 最后写入覆盖；采用独立匿名管道与一次性 worker，而非把同步 keyring 放进超时 goroutine 或把秘密放入 HAP。010 对 go-keyring 各 OS 的官方实现、macOS 参数/清退限制和 Windows CRT extra stdio 的研究继续作为来源；020 提供具体 adapter，本片负责实际 CLI/bootstrap 消费。

`application/assistant.Service` 的 Repository 由 `sqlite/assistant.Store` 实现，使用 T01 原有 base.Store 的同一连接/UoW。HAP router 与021实际 TS BotClient 消费 AssistantAPI；配置 Port 的 fake Run 真实准入、持有旧修订并执行人格，再由新 Run 消费新 head。020 Registration 真实消费 catalog；模型 probe/查询投影真实消费 CredentialProvider；生产尚未装配的 Run/session/memory 上下文通过 `UnassembledUsage` 明确返回 `CONTEXT_NOT_ASSEMBLED`，测试另注入非空 UsagePort 证明阻删，不把未知当永久 empty。

实现路径包括：

- `native/huhubot/internal/domain/assistant/validation.go`、`application/assistant/{ports,service}.go`、`application/api/{assistant,credentials,types}.go`。
- `sqlite/assistant/{store,credentials}.go`、`migrations/002-assistant.sql`、迁移注册与 `sqlite/base/store.go`。
- `internal/bootstrap/core.go`、`cmd/huhubot/main.go`、inbound HAP assistant/router、共享 schema/DTO/fixture 生成物、公共 `api.ts`。
- `tests/contract/assistant/` 下本片八个用例，以及两处受影响的 foundation 测试。020 的 credentials 测试仍由其 owner 维护。

### 持久化、删除与恢复

默认 Bot 一次初始化；随机 ID 对现存与 tombstone 都检查不复用，名称允许重复。事务先检查 Profile/epoch，再查按 Profile/principal/method/idempotencyKey 分区的 receipt，同输入返回旧结果，异输入冲突；随后才做 agent revision CAS。人格与模型修订固定，持久 pin 保留在途引用，释放后清理无 head/pin 的旧正文。模型解绑再绑定不会重用在途修订号。

disable 与配置准入共用短事务边界；新准入立即被拒绝。删除预检绑定 principal、Profile、epoch、agent revision、Usage digest、持久 pin clock 和五分钟期限。活动任务、群成员、记忆、配置 pin 都阻止不安全删除；引用变化、配置变化、过期均要求重新预检。删除只删除目标 Bot，清除人格/模型及其含正文 receipt，增加 commandEpoch；旧 epoch 在 receipt lookup 前拒绝。`secure_delete` 和删除后的 WAL checkpoint 使回归测试在活动 DB/WAL/SHM 中找不到已删除人格哨兵。

凭证只保存随机 ref、Profile、mode/state/reason 和内部删除 guard。Reserve 永不复用 ref；BeginDelete 在同一事务检查当前/在途模型引用并置 guard，阻止 OS 删除期间的新绑定；OS 调用发生在事务之外。启动时 session-memory 明确变为 missing，前一进程未完成删除 guard 变为 unknown，之后可同 ref 核查。受保护结果不确定不会自动改用内存覆盖。

002 使用原 DB 的串行注册。schema1 升级先通过 `VACUUM INTO` 生成含已提交 WAL 的私有一致备份并 fsync，再原子迁移；失败保留原版本、原身份和备份。坏 SQL 故障测试证明部分 DDL 回滚，恢复原迁移后可正常重开。本票不声称完成 T19 的全部备份/恢复产品流程。

配置草稿可未绑定模型或未配置凭证。生产 `models.test` 没有 protocol adapter 时返回 `MODEL_UNAVAILABLE/ADAPTER_NOT_ASSEMBLED`，不会假报连接成功；测试注入最小 Probe，传入原协议、endpoint、modelId 与内部解析的 credential，不传资料、历史、记忆或工具。未读取 CLI/env 模型密钥。配置 JSON 和分页有明确预算，保证大人格列表能分页落入 HAP 帧预算而不跳项。

### 实际红灯与恢复

原始日志均位于本目录 `evidence/`：

1. `01-persistence-red.log`：真实 Profile 上 Assistant facade 尚未装配，目标测试失败；实现后同一公共入口通过。
2. `02-deletion-red.log`：pin 释放后旧 preview 曾返回成功而非 stale；加入持久 usage clock 后通过。
3. `03-session-status-red.log`：会话凭证重开未投影为 missing；修正带 error 的安全 missing 状态投影，并在 session 启动复位元数据后通过。
4. `08-worker-deadline-probe-red.log`：独立真实 CLI worker 只收到半帧且 stdin 保持开启，3.4 秒后仍存活；探针已 kill/wait 清理，stdout/stderr 均无输出。此项由 Lead 授权仅 main.go 窄修复，在独立 worker 分支增加三秒进程 watchdog，正常返回先停止 watchdog；029 owner 独立补红→绿。其真实 CLI partial-frame 3.008s、complete-frame-without-eof 3.010s 均自行 exit 1、forced-by-test=false，已 Wait，stdout/stderr=0 且没有 Profile/DB 副作用；证据见029的 `logs/01-independent-worker-red.log` 与 `logs/02-independent-worker-green.log`。两次红灯及修复前结果均保留。

其他追加的迁移、TTL、共享引用、分页与严格 DTO 用例如实作为补充验证，不声称每个补充断言都在实现前有独立红灯。实现过程中出现过一处 `:=` 编译错误，已更正；受影响旧 foundation 的 unavailable 断言移至仍未装配的 runs.get，新增助手方法另有实际成功/失败覆盖。原 substring 边界检查把本 module 路径中的 obsidian-huhu 当作宿主依赖，现检查实际 `"obsidian"` 包名；独立 Go import 架构检查仍通过。

### 检查回执

修复前已冻结快照为 `evidence/source-snapshot.json`，72 files，tree hash `9ecff88e1dc64396b6303830845d55006942eed99da22b595c89811123449ea6`。这是明确 scope 的源码哈希，不冒充 T27 资产 build hash。最终权威 r2 为 `evidence/source-snapshot-r2.json`，72 files，tree hash `e5576532c92a1c77b1d832735476db018bb655d8ebcd71178dbaf0a4a8ecca06`。相对初轮仅两处变化：本片维护的 `cmd/huhubot/main.go`（SHA256 `7e141fcc3662257193f402f1a25af7353cdef3e3692b08266c9731b554f7d28f`）和029 owner新增回归的 `credentials_cli_test.go`。其余 API/schema/依赖锁/业务源码与初轮相同，旧快照和日志保留。

| 命令/观察 | 实际结果 | 原始证据 |
| --- | --- | --- |
| `GOTOOLCHAIN=go1.26.10 go -C native/huhubot test ./... -count=1` | exit 0；credentials 8.551s、assistant 5.309s、foundation 6.121s | `04-go-full.log` |
| 关键 CAS、credential guard、delete 的 assistant `go test -race` | exit 0，1.287s | `05-go-race.log` |
| `go -C native/huhubot vet ./...` | exit 0 | `06-go-vet.log` |
| Go 架构检查 | exit 0，10 production files | `07-schema-architecture.log` |
| 固定 Python JSON Schema 验证 | exit 0，122 shape、169共享样本、25 decimal负例 | 同上 |
| 临时隔离树重新运行 generator，六个产物逐字节比较 | exit 0；未写冻结源码 | 同上 |
| 五目标 `go list -deps` | 每目标成功，记录实际 runtime union；不是实机运行或资产构建 | `runtime-module-union.json` |
| r2 `go test ./... -count=1` | exit 0；credentials 8.306s、assistant 11.511s（含新增独立worker回归）、foundation 5.447s | `09-go-full-r2.log` |
| r2 `go vet ./...` 与 CGO0 五目标 CLI 临时交叉编译 | 全部 exit 0；linux amd64/arm64、darwin amd64/arm64、windows amd64；临时产物已清理 | `10-vet-cross-build-r2.log` |

Go module 已 tidy。新增实际运行依赖为 go-keyring v0.2.8（MIT）、godbus/dbus/v5 v5.2.2（BSD-2-Clause）、wincred v1.2.3（MIT）；对应固定公开来源为各仓库同 tag 的 LICENSE，010 保留上游审计来源。go-keyring 的上游 darwin 源有 Google Apache-2.0 头，但当前 mac adapter 自有实现且实际 Darwin runtime graph 不链接 keyring/dbus/wincred。完整 runtime union 已交025，依赖自身 test/tool module 不混称运行依赖。go.mod SHA256 `b0dbcd2d694eccaedc15a7074bd91bcb66db9f07c5ab341a3df721a7ee829c3b`，go.sum `2ca8fb2885f97742652fe42d605803322fd64c0779a1f6fff48d819cc43fa816`。

dev Skill 实际用于边界、持久化、测试和依赖检查；入口 SHA256 `5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293`，architecture/testing/licensing/build-and-release 对应当前 Task 输入并已回读。上述可回读产物与检查是执行证据，不把只读入口声称为 Skill 通过。

## 问题与下一步

源码、测试 writer 已停写，作者启动的 Go/CLI/worker 探针均已退出并 Wait，临时编译目录已清理；最终 return 校验结果另存 `evidence/11-return-validation.log`。Lead 已接手修复后真实 TS→Go 凭证联调作为 Lead-owned E2E，未要求021重复执行。候选交回后需 Lead/024 独立双轴审查、025 许可与五目标资产集成、Lead 最终 build/lint；这些不由本片自审替代。

T03 的 StartRun 必须在同一 SQLite 短事务提交配置引用、归属、首事件与 receipt。本票单独 AcquireSnapshot/ReleaseSnapshot 只证明 T02 immutable 引用和删除保护，不能让后续用例把准入与 Run 提交拆成两个事务或遗留无归属 pin；同库 base UoW 是后续 adapter 的接缝。Run/session/memory 真正装配后必须注入实际 UsagePort 并按其事务归属维护引用，不能继续使用 UnassembledUsage 冒充真实空集合。

没有运行真实模型 endpoint、真实用户 OS keyring、macOS/Windows 真机或 Obsidian 交互；本轮使用隔离 Profile、固定非真实哨兵和 fake probe/worker。真实环境操作由用户执行，未被升级为代码开工门。根产物、许可文档与正式状态不在本片写集。
