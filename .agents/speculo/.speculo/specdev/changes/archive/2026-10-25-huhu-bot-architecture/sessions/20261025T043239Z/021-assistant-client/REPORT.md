# T-02 桌面凭证管道与 Bot/model 应用客户端

Session: 20261025T043239Z
Task: 021-assistant-client
Status: completed

## 聚焦交接

已实现桌面端凭证专用客户端、绑定本机 Profile 的 AssistantClient，并在原有唯一 ChildProcess 管理器中创建和回收 fd3/fd4 匿名 pipe。公共 API/schema 只消费 019 的冻结输入，私有字节协议与 020 逐项确认；没有增加公共 HAP 凭证方法、第二个进程管理器或 UI 装配。当前完整 huhubot 回归为 9 文件、64 tests 通过，包括 4 个真实 TS→Go 匿名管道测试，生产/测试类型、定向 lint 与两个架构检查均通过。生产与测试源码、测试进程均已冻结；候选返回 Lead，019/020 的最终 Go 输入固定后可直接重跑本文稳定入口，并由 root/T27 承接完整 build/lint/notices。

## 产物与验证

- 实际作者：`/root/foundation_client`，没有再派遣、提交、推送、发布或修改正式 Ticket/Map/Goal/Evidence。
- Workspace：`/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。huhubot 为本 Change 尚未提交的新目录，不能用空 git diff 冒充无修改。
- 写集：`platform/desktop/credentials/{protocol,client}.ts` 与对应测试；`platform/desktop/transport/managed.ts`、`managed.test.ts`、原 `runner.test.ts`、新增 `credentials-runner.test.ts`；`services/assistant-client.ts` 与对应测试。精确 10 文件摘要见 [files-sha256.json](files-sha256.json)，冻结合同与所用规则见 [inputs-sha256.json](inputs-sha256.json)。没有修改 API/schema/Go/package/lock/docs。

### 方案、合同与真实消费者

完整回读 010 报告和 [credential-interface-research.md](../../../evidence/credential-interface-research.md)，比较了复用当前子进程的两个额外匿名 pipe，以及另建通用 HAP/IPC/socket/进程入口。采用前者：Node 的额外 stdio 与 libuv CRT table 已有固定官方来源及 Linux 探针，所有 pipe 交同一 transport 生命周期关闭；后者会增加秘密进入业务通道或第二套资源管理的边界。TS 自行编写窄协议 codec，没有复制外部实现、新增依赖或重新研究已固定的库设计；Windows CRT table 与 OS Provider 的实现和许可仍由 020/019/T27 负责。

双方最终冻结：`--credential-channel=stdio-v1` 仅可用于 managed；fd3 写请求、fd4 读安全回执。请求为 u32BE 长度 + v1/op/u16BE metadataLength + UTF-8 metadata + raw secret；body≤16384、metadata≤2048、secret 1..2048，只有 register 可有 raw tail。op 0/1/2/3 分别 hello/register/delete/status；requestId 为 `request:<32lowerhex>`，ref 为 `credential:<32lowerhex>`，TS 使用 `randomBytes(16)`，Go catalog 永久拒绝复用。回执含固定字段 version/requestId/profileId/credentialRef/mode/state/reason，mode 为 protected/session-memory/none；hello 的 ref 为空、mode none、state available、无 reason，只表示通道就绪。020 最终允许 16 个固定 reason；TS 拒绝未知字段、重复键、非 UTF-8、未知状态/模式/reason、available 携带 reason，以及逐请求 id/Profile/ref/注册模式不匹配。错误 Profile 的 private hello 会关闭通道和 Runner，没有 safe ack；这与普通 HAP 的 PROFILE_MISMATCH 错误分开验证。

`DesktopCredentialClient` 是桌面专用 write-only 注册服务，不提供 get/resolve-secret。register 消耗调用者可变 Uint8Array，并在返回前清零该 buffer；编码副本在 write callback、超时或关闭时清零。不能承诺擦除既有 UI 字符串、运行时、Go 库和 OS 的所有副本。最多 8 个在途/保留写入，3s 请求及半帧期限，idle 不计时；过量、半帧、坏回执、EOF 和写入错误关闭两条 pipe 并让原 transport 回收子进程。未确认的登记返回原 ref 的 unknown，超时为 OPERATION_TIMEOUT，关闭为 SESSION_CLOSED，不自动重放、改 ref 或自动降级为 session-memory；有合法 protected unknown/failed 回执时可同连接查询原 ref。

`launchManagedBotSession` 消费原 `DesktopHapTransport`、`HapConnection` 与 HAP hello，随后以该 Profile ID 握手 private channel，返回同一进程的 BotClient、credentials、exited、close；失败路径 close 并 await exited。原 `launchBotClient` 保持兼容，普通连接在 spawn 前拒绝 credentialChannel。环境只新增 DBUS_SESSION_BUS_ADDRESS、XDG_RUNTIME_DIR 两项系统 locator；原有 PATH/SDK/API_KEY/runtime injection 排除保留。

`AssistantClient` 的真实消费者为统一 BotClient 分组方法与方法级 runtime schema，不缓存第二份 DTO 或持久化模型配置。它提供 Bot/model 的创建、列表、读取、更新、禁用、删除预览/确认、绑定及测试，使用已打开 Profile；调用者 CommandMeta、CAS revision、idempotencyKey、CallOptions 原样传递，不自动重试写命令或覆盖冲突。草稿不要求 credentialRef/server revision；模型适配器未装配的真实 MODEL_UNAVAILABLE/ADAPTER_NOT_ASSEMBLED 继续抛给调用方。按 TASK 不提前注册模块；T20/后续 UI 通过本服务接入。

### 红绿与恢复记录

1. [01-protocol-red.log](logs/01-protocol-red.log)、[03-client-red.log](logs/03-client-red.log)、[06-assistant-red.log](logs/06-assistant-red.log)：先写调用生产入口的测试，均因对应实现尚不存在退出 126；没有把加载失败计作行为覆盖。随后 codec、真实 Node stream 通道和真实 HapConnection facade 测试转绿，见 [02-protocol-green.log](logs/02-protocol-green.log)、[04-client-first.log](logs/04-client-first.log)、[07-client-wrapper-green.log](logs/07-client-wrapper-green.log)。
2. [14-credentials-green.log](logs/14-credentials-green.log) 实际是中间失败日志，保留原文件名：新增“已获 receipt 但 write callback 未结束”的保留写入计数后，测试尚未等待 hello write callback，8 项 pending 的预设越过了真实 8 项总保留上限；调整测试等待真实 nextTick 后才填满八项，没有放宽生产上限。同轮真实 Runner 的稳定 CAS reason 是 REVISION_CONFLICT，测试原先误写 REVISION_MISMATCH；据实际 Go 合同修正，未改服务端结果。
3. [16-foundation-first.log](logs/16-foundation-first.log)：62 passed/1 failed，失败是旧 T01 对未装配 agents.get 的 METHOD_NOT_AVAILABLE 预期；T02 实际装配后为 NOT_FOUND/AGENT_NOT_FOUND。仅更新此断言，保留所有既有日期、Unicode、wire、Host、错误、竞争 writer、hardlink、EOF/退出覆盖。最终 [17-foundation-green.log](logs/17-foundation-green.log) 为 64/64 全绿。
4. 首次生产 tsc 命令遗漏项目既定 skipLibCheck，退出 126；[05-tsc-first.log](logs/05-tsc-first.log) 保留第三方 JSX/linkedom/Obsidian 声明错误及本次 Uint8Array 默认参数推断错误。修正本次类型问题后按项目命令通过生产/测试 tsc。首次 lint 的两项未知 catch 值 Promise.reject 也已改为 async 原生拒绝，首次测试类型的可选 request id 经显式校验收窄，日志不删改。

### 稳定真实 TS→Go 入口

`pnpm exec vitest run src/modules/huhubot/platform/desktop/transport/credentials-runner.test.ts` 会构建当前 Go 1.26.10、CGO=0 Runner 到临时目录，在隔离 HOME/XDG_STATE_HOME/LOCALAPPDATA 的真实 Profile 运行；不使用 fake HAP 成功 handler，也不访问真实 OS keyring 或 Provider。4 tests 覆盖：

- session-memory 登记、status、无凭证草稿保存、相同命令回放结果不变、模型未装配真实拒绝、绑定后安全状态、旧 revision 冲突、引用中拒绝删除、解绑后删除、第二 ref 重启后 missing；安全 HAP 快照与 private receipt 不含哨兵，Linux `/proc` 实际 argv/env 也不含哨兵。
- 另一个隔离 Profile 对原 ref 只见 none/missing，不跨库查询；HAP 绑定该 ref 拒绝 CREDENTIAL_MISSING；private hello 的 Profile 不匹配关闭并等待进程退出。
- 普通 HAP 实际发送 credentials.resolve 后被 METHOD_NOT_AVAILABLE 拒绝，无法开 private pipe。
- 登记尚无回执即 transport.close 返回同 ref unknown/SESSION_CLOSED、等待所有 pipe 和子进程退出，安全 stderr 不含哨兵，随后同 Profile 可重开 health。

私有错误请求的 ref/op/body/meta/tail/UTF-8/半帧/重复字段/超限等，TS 本任务有生产 encoder 与真实 stream 拒绝测试；020 的 `internal/adapters/outbound/credentials/{frame,channel,provider,worker}_test.go` 另以真实 ServeChannel/net.Pipe/SQLite 和受控 OS backend 验证原始畸形帧、慢 consumer、9th in-flight、provider unknown 同 ref 核查、真实隔离 worker 的取消/回收。该事实来自 owner 回告，未冒充本任务执行其完整 Go suite。TS 的 protected failed/unknown 回执测试是可控字节 peer，证明不自动 fallback/replay；不是 OS keyring 验收。

### 最终检查

| 命令 | 退出 | 实际结果 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/huhubot` | 0 | 9 文件、64 tests；[17-foundation-green.log](logs/17-foundation-green.log)，41.92s |
| `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.json` | 0 | [18-production-tsc.log](logs/18-production-tsc.log) |
| `pnpm exec tsc --skipLibCheck -p tsconfig.test.json` | 0 | [19-test-tsc.log](logs/19-test-tsc.log) |
| `pnpm exec eslint src/modules/huhubot/platform/desktop/credentials src/modules/huhubot/platform/desktop/transport src/modules/huhubot/services --max-warnings 0` | 0 | [20-lint-final.log](logs/20-lint-final.log)，零警告 |
| `pnpm test:architecture` | 0 | [13-architecture.log](logs/13-architecture.log)，1201 modules，无违规；此后只改现有实现/断言，导入图未变 |
| `pnpm test:huhu-bot-architecture` | 0 | [21-go-architecture.log](logs/21-go-architecture.log) |
| `validate-dispatch.mjs ... --task 021-assistant-client --stage return` | 0 | [22-validate-return.log](logs/22-validate-return.log)，errors/warnings 均为空 |

64 tests 内的方法样本校验循环当前消费 169 cases（123 正向、46 负向），样本不另计作 169 tests；唯一 schema 与 API 由 019 更新并冻结，未复制为手写 TS 检查表。输入摘要不把仍由 019/020 维护中的 Go 生产源码冒充已经固定的整合快照；本次构建到的是运行时当前实际 Go 工作树。所有本任务 Runner/Vitest/tsc 子进程均已等待完成，临时目录由 afterEach/afterAll 回收。

## 问题与下一步

本切片无已知未实施项，已停止源码 writer。019/020 的最终 Go 工作树固定后，Lead 应重跑上述稳定真实管道入口、完整 huhubot 回归并由 root/T27 串行做全插件 build、全仓 lint、notices/目标资产；本报告不将定向检查冒充该最终整合门。

未现场验证：真实模型、真实 OS keyring 的解锁/拒绝/持久化、Windows/macOS 具体 Obsidian/libuv 运行组合，以及 Obsidian UI。按用户口径，这些为 user-owned；本任务不索取真实秘密、不将受控 stream/provider 测试称作现场验收。completed 仅表示候选交回，正式 T-02 验收与后续 UI 装配由 Lead 接管。
