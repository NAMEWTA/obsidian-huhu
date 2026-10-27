# T-02 凭证与配置实施预检

Session: 20261025T043239Z
Task: 010-assistant-preflight
Status: completed

## 聚焦交接

T-02 可以按下列合同派代码；无需先访问用户真实 keyring、Provider 或 Obsidian。当前缺口是明确的跨平台 channel/provider adapter 和共享 owner 接缝，不是新的产品决定。所有 T-01 生产源码、schema、正式状态与 Evidence 均未修改；T-01 当前 hardlink/WAL 审查阻断由 Lead 另派原 owner 修复，本次不接管。下一步先完成该依赖修复，再按本文精确写集分配 T-02。

## 产物与验证

### 已核验事实与来源

已按 Map revision 7 → 当前 dev（及 architecture/testing/licensing 的本次适用边界）→ T-02 读取，复用 credential-interface-research、002/004 报告、冻结 TS API、Go Application/Store/CLI。T-02 自有目录尚无实现，不把建议写成当前能力。

1. Node 支持额外 stdio pipe，`ipc` 不是跨语言通道；依据 [Node v26.8.2 官方文档](https://nodejs.org/download/release/v26.8.2/docs/api/child_process.html#optionsstdio)。实际 Linux Node→Go 哨兵探针通过：Node 26.11.1、libuv 1.52.1、Go1.26.10；fd3 请求/fd4 回执，stdout/stderr 均0字节、回执不含哨兵、Go可变输入buffer清零。它只证明本机额外管道，不证明 Windows/macOS。
2. Windows 不是 fd3=HANDLE(3)。固定 libuv v1.52.1 commit `1cfa32ff59c076ffb6ed735bbc8c18361558661f` 的 [process-stdio.c](https://github.com/libuv/libuv/blob/1cfa32ff59c076ffb6ed735bbc8c18361558661f/src/win/process-stdio.c) 定义 CRT table 为 count、flags、handles；[process.c](https://github.com/libuv/libuv/blob/1cfa32ff59c076ffb6ed735bbc8c18361558661f/src/win/process.c) 把 table 放入 STARTUPINFO 的 reserved2。tag/SHA 由 git ls-remote 核验，源码 MIT。微软将 reserved2 标为 CRT 保留字段，故这属于明确的 libuv ABI adapter，不是通用 Win32 fd 契约：[STARTUPINFOW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/ns-processthreadsapi-startupinfow)。不复制 libuv C 实现。
3. `go list -m -json github.com/zalando/go-keyring@latest` 实际返回 v0.2.8，2026-03-23，origin `a8cdfe320cc8bc0534c895a648dc9214715a9da5`，Sum `h1:6sD/Ucpl7jNq10rM2pgqTs0sZ9V3qMrqfIIy5YPccHs=`。下载仅更新模块缓存，未更新产品 go.mod。根 LICENSE 为 MIT；darwin 源文件仍有 Google Apache-2.0 头，T-27 notices 应同时覆盖，不可只看根许可。[固定源码](https://github.com/zalando/go-keyring/tree/a8cdfe320cc8bc0534c895a648dc9214715a9da5)。依赖声明 wincred v1.2.3、godbus/dbus/v5 v5.2.2；x/sys 由生产当前v0.48.0合并（上游最低v0.27.0）。
4. 最新 v0.2.8 的 macOS Set 仍先 Start(`/usr/bin/security -i`)，后检查4096长度，且错误分支未统一Close/Wait、无context。Get/Delete 使用外部命令；Linux Secret Service 走D-Bus、调用也没有请求context；Windows走Credential Manager/wincred并限制secret 2560B。以上均为源码事实，未调用任何真实provider；不把无argv泄漏解释为有界生命周期已满足。

### 拟冻结的专用凭证通道（可直接实现）

使用现有受管父子进程的两个额外 stdio：3=parent→Runner 请求，4=Runner→parent 安全回执。启动仅加不含秘密的 `--credential-channel=stdio-v1`，且要求 `--managed`；普通HAP连接不能获得此入口。受管transport单一owner创建/释放额外pipe，不另起socket listener、不写临时凭证文件。

独立协议不是HAP：`u32BE bodyLength + u8 version(1) + u8 operation + u16BE metadataLength + UTF8 JSON metadata + raw secret bytes`。operation=0 hello、1 register、2 delete、3 status；body≤16384B、metadata≤2048B、secret≤2048B、同时最多8请求、单请求3s deadline，任何无效长度/版本/op/schema即关闭此channel且拒绝登记。元数据显式DTO：hello `{requestId,profileId}`；register `{requestId,profileId,credentialRef,storagePreference:"protected"|"session-memory"}`；delete/status `{requestId,profileId,credentialRef}`。只有register允许raw尾部，且必须非空；其余operation尾部必须空。ref由可信登记服务生成不可复用随机ID，Profile绑定必须匹配已打开DB。业务HAP、argv、env、文件永不承载rawsecret。

安全回执：`u32BE length + JSON {version:1,requestId,profileId,credentialRef,mode:"protected"|"session-memory",state:"available"|"missing"|"failed"|"unknown",reason?:稳定枚举}`，无秘密、hash、OS错误文本。status只返回可用性；不提供parent可读原秘密的get。模型adapter按CredentialProvider port在Go内部resolve。register不自动重放：明确失败才可进入session-memory；protected写超时可能已经提交，回`unknown`并按同ref核查，不能谎称没落OS。delete先核对DB引用/所有权，跨Profile共享ref须经引用Port，不用DeleteAll扫用户keychain。内存模式重开后missing，清退出失效；Buffer/[]byte尽量清零，但JS字符串、Go库string副本和OS内存不承诺绝对可擦除。

Windows实现：GetStartupInfoW取得table，先检查pointer非空、cbReserved2、count 5..255以及`4+count+count*sizeof(uintptr)`不溢出且不超过table；小端读取flags和handles，验证3/4的FOPEN/FPIPE、非NULL/INVALID_HANDLE、与0..2不同、GetFileType为PIPE。复制有效handle后清除inherit，交给Go文件对象；不可直接os.NewFile(3)。异常ABI fail-closed，返回专用channel不可用，不退回HAP/argv。Linux/macOS用固定fd3/4并检验pipe/socket与权限边界。Windows先做合成table正负例+交叉编译和CI对应环境自动化，用户实际Obsidian/libuv组合列user-owned；未知ABI不影响无密钥草稿保存。

provider建议采用Go消费Port：`Put/Resolve/Delete/Status(ctx, ProfileID, CredentialRef, Secret)`，结果带保护模式与稳定原因。Linux/Windows可用go-keyring v0.2.8，但放入一次性受控credential-worker，worker的stdin/stdout是独立内部匿名管道，Supervisor按deadline终止并reap，避免无context调用长期阻塞Runner。worker只接受内部构造的Profile/ref服务名，不接受HAP或任意keychain查询。macOS应自有bounded security adapter：完整命令长度先检查，再spawn `/usr/bin/security -i`，秘密仅stdin；CommandContext+WaitDelay+每分支close/kill/wait，stdout/stderr独立bounded捕获并丢弃原错误。该分支不调用上游有清理缺口的Set；Get同样只在内部pipe返回secret。worker内期限短于外层，确保mac子命令先收尾；不要仅goroutine包同步库后声称已取消。

OS缺服务/锁定/拒绝保护时，明确session-memory退化并在安全状态DTO显示`mode/reason/available`；不自动读取CLI账号/API_KEY环境。受管环境只允许系统必要配置；Linux D-Bus连接所需的DBUS_SESSION_BUS_ADDRESS/XDG_RUNTIME_DIR是连接locator而非模型秘密，需作为显式系统allowlist条目，不能因此合并全部process.env。未验证OS保护现场不成为代码开工门。

### Bot/CAS/生命周期可实施合同

- 新迁移002建立agents、不可变persona_revisions/model_binding_revisions、default-agent唯一标记及本用例首次消费的command_receipts。默认Bot只在同一DB事务首次初始化一次；名字允许重复，ID随机且不复用，不以名称推导身份。仅现有持久Bot进入目录，临时target不经过此create入口。
- 写入口先在短事务按profileId/principalId/method/idempotencyKey读回执；同输入复用结果、异输入IDEMPOTENCY_CONFLICT；随后校验commandEpoch和expectedRevision，CAS更新head（RowsAffected=1），插入发生变化的不可变人格/模型修订，保存回执后commit。冲突不覆盖；网络/OS provider调用不在SQL事务里。回执hash不含secret；secret从未进入该事务。
- Run接收`ConfigSnapshotPort(agentId, personaRevision, modelBindingRevision)`；旧修订永不被update覆写，新受理固定新head。T-02用fake Run消费者消费真实DB旧/新快照，T-03/08接入同Port。ModelBinding区分provider/endpoint/protocol/model与credentialRef，SDK不能依赖环境补值。
- disable先CAS关enabled准入，再由后续execution owner处理已活动任务；对话/成员/记忆通过窄UsagePort返回IDs/counts/revision，不跨层直写其表。当前尚未装配这些上下文意味着无该类对象，未来owner必须显式注入真实Port，测试用非空fake证明阻挡，不能为未来已装配能力保留永远empty默认。
- deletePreview持久短期token绑定Profile epoch、agent revision与usage快照，返回活动/成员/记忆/凭证引用类别。delete重读token和关联版本，有变化CONFLICT；活动/仍绑定成员/需要用户选择的记忆未处置时明确阻挡，不连带清其他Bot。保留最小不可复用身份记录直到所属purge合同失效旧epoch；不永久保留被删人格正文。
- models.test是无附加资料、无聊天记忆、无工具的最小ProbePort。未装配协议adapter返回MODEL_UNAVAILABLE/ADAPTER_NOT_ASSEMBLED；不假报available，不自动换endpoint/协议。models.list只列配置/装配摘要，不擅自用key抓远端目录。

### 共享owner精确请求与T-02写集

以下是实施前由Lead/T-01 owner串行接纳的请求，本研究不直接写：

| owner路径 | 精确改动 |
| --- | --- |
| `src/modules/huhubot/api.ts` / contracts / Go wire DTO | 增加安全CredentialStatus（mode/state/reason），把ModelBindingDraft与服务端ModelBinding revision分离；draft允许缺credentialRef以保存未配置模型，当前model字段必须带server revision且credentialRef必填，不能完整表达此合同。Agent结果增加isDefault或目录defaultAgentId。agents.update/disable/delete与models.bind要求expectedRevision；agents.delete必须id，当前通用DeleteCommand的id可缺。models.test接收draft并返回明确availability/reason/protection摘要。秘密不加到任何HAP DTO。 |
| `internal/application/api/**` | AssistantAPI/ModelAPI窄接口、纯Command/Result、ConfigSnapshot/Usage/CredentialStatus消费者Port；Facade只组合。不要把SQL/HAP/keyring类型引入Application。 |
| `go.mod/go.sum` | 接纳go-keyring v0.2.8及真实生产闭包；完整5目标license/notices由T-27同步，mac自有boundedadapter不用不合格上游Set。 |
| `sqlite/migrations/*.go` / `base/store.go` | 接纳002并串行registry；当前Open仅version0执行001，不能简单CurrentVersion=2便算升级完成。为已有001Profile提供备份/原子002迁移和失败保留，或按T-19正式迁移接缝实现；不能重建库。复用已有Database/WithinTx，不另开第二业务DB。 |
| `inbound/hap/router.go` / bootstrap | 装配真实agents/model handler；hello仅增加已实现项。bootstrap注入同一SQLite assistant adapter与provider/usage ports；启动后初始化defaultBot，再ready。 |
| `cmd/huhubot` / stdio / managed.ts | 可信managed模式附加private管道flags、OS fd/handle适配和关闭；这是T-01/T-20共享owner窗口，不越权塞进T-02旁路进程管理器。 |
| T-27构建/notices脚本与许可 | 按新实际依赖闭包更新，不手改生成通知。 |

T-02自己的实现路径保持票中列出的domain/assistant、application/assistant、sqlite/assistant、002-assistant.sql、credentials、tests/contract/assistant、desktop/credentials、services/assistant-client.ts。上述缺口均可通过精确共享owner请求补齐，不需要新的用户产品决定。

### 可复跑检查与本次执行

本次仅执行公开模块元数据下载/源码回读、Linux额外pipe哨兵；没有OS keyring操作或真实秘密。探针源码在`/tmp/huhubot-assistant-preflight-20261025/{pipe.go,pipe.mjs}`，全部进程已退出。

- `GOTOOLCHAIN=go1.26.10 go list -m -json github.com/zalando/go-keyring@latest`、`go mod download -json ...@v0.2.8`：0；版本/SHA/许可如上。
- `git ls-remote https://github.com/libuv/libuv.git refs/tags/v1.52.1 refs/tags/v1.52.1^{}`：0；annotated tag 48dbd851fe4ad7d1252b75ac907c725a437e1634，commit 1cfa32ff59c076ffb6ed735bbc8c18361558661f。
- `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go build -o /tmp/huhubot-assistant-preflight-20261025/pipe .../pipe.go`、`node .../pipe.mjs`：0；matched/zeroed=true，stdout/stderr=0，responseContainsSentinel=false。
- 待正式代码suite：真实SQLite重开默认ID；同revision并发CAS一胜一冲突；同key重放/异输入冲突；旧/新Run快照；预检后usage变化；缺credentialRef与草稿；protected成功/锁定/拒绝/超时unknown；session-memory清退出；专用frame半帧/oversize/错误profile/无managed/断线/慢消费者；Windows32/64位table合成正负例；mac stub命令长度先验、挂起/早失败的kill+wait；固定哨兵检查业务HAP/日志/argv/env/SQLite/CP/导出不含secret。命令仍为`go test ./tests/contract/assistant/... -count=1`、适用race及TS→Go真实管道。

## 问题与下一步

结论可实施；上述公共DTO、迁移和transport改动须先由Lead承接写集与owner，随后派正式T-02实现。当前T-01 hardlink/WAL数据一致性finding是依赖阻断，由原owner按真实持久提交修复，不能靠删除WAL或改期望绕过。本次未运行Windows/macOS现场、SecretService/Keychain/CredMan、Provider或Obsidian；只列用户后续验收，不将其设为代码开工门。无生产写入、无真实秘密访问、无后台worker或新增listener。
