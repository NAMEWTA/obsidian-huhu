# Linux 凭证实际结果修复候选

Session: 20261025T043239Z
Task: 032-credential-result-repair
Status: completed

## 聚焦交接

024 的 STD-01 / SPEC-01 是同一项 P1：Linux 提示取消被误报成功并写入 catalog。本次已从原反例红灯修复到真实 TS→Runner→worker→godbus→受控 Secret Service 绿灯；最终显式无服务目录的私有 bus 下，12 个永久场景、相关三包回归、关键 race 与 vet 均通过。生产/test 已停写，全部本任务进程与临时 binary 已退出、Wait 并清理。completed 只表示交回修复候选，独立复审、工程接纳与正式状态仍归 Lead。

必须保留的验证限制：早期 fixture 使用默认 `--session` 配置，在 fake owner 断线后曾实际尝试激活宿主 Secret Service。是否由该启动读取了真实 keyring 元数据未知，不能宣称此前全部探针完全未触碰真实服务。该缺口和失败日志保留；最终 fixture 与原024取消回放已改用禁止自动激活的显式私有配置，并独立断言离线时只能返回 ServiceUnknown / NameHasNoOwner、没有激活子进程。未向真实服务发送用户密钥；没有读取或处理现存 keyring 进程的环境、内存或存储。

工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。032 只改下述三个源码/测试文件及本任务日志/报告；API、CLI、schema、SQLite、Go locks、TS、工程产物、旧020/029/024报告均保持原字节，没有再委派、提交、推送或发布。Lead 已工具回告当前 r2 固定输入 93 文件/25来源，SHA `886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b`；相对024仅这三个文件变化，其余90文件/25来源相同。该冻结与 Lead 独立结果不是作者自认证。

## 产物与验证

### 原因与最小修复选择

完整回读032 TASK、024两轴报告/原反例及020/029报告，沿已读 Map8→dev架构/测试/许可→T02→I执行规则实施。024输入 `55d6e1f6d1963e68e80e479172dcd4fef110a93a3630dd07fdd4e0a00ce43f8d` 的 go-keyring v0.2.8 在 `secret_service/secret_service.go:176`、`:251` 调用 handlePrompt 时忽略 dismissed，`:211–213` 可以返回 true,nil。原 Linux adapter 将 Set/Delete 的 nil error 视为完成，因而取消 create 报 available、取消 delete 报 CREDENTIAL_DELETED；SQL 在 Status 前已写错。

比较方案后，没有采用“Set/Delete 后再读回即可视为成功”：读回只能描述当时存储，无法恢复明确取消事实，也会把读失败与写效果混在一起。直接改 module cache 或复制整套上游实现会偏离可维护来源与写集。选定原 adapter 内独立的 Linux 窄协议 client，使用现有 godbus SDK 实现所需 Secret Service 方法，准确区分 Completed.dismissed、已知拒绝、锁定、未找到及效果未知；不改公共协议、catalog 或进程管理器。

`keyring_linux.go` 以新 client 取代 Linux go-keyring root import；`secret_service_linux.go` 以规范的 Secret `(oayays)` 结构传原始 bytes，保留既有 profile/ref namespace、受限 SearchItems、单 item 操作。为每次 worker 操作建立专有 D-Bus 连接，固定 Secret Service 的 unique owner，Prompt 信号按 sender/path/interface/member 匹配，先注册 channel 和 AddMatch 再调用 Prompt；类型/对象路径不符按安全失败处理。dismissed=true 明确映射 PROTECTION_DENIED，Unlock 提示使用相同流程，不能继续 CreateItem。成功提示才取方法特定的结果；无提示直接以实际方法回执为依据。

所有调用沿同一有界 worker。超时/断线不能声称写入未发生，保持 unknown 与同ref Status 核查，不重试、换ref或自动退回 session-memory。Session / match 清理有50ms边界，外层 supervisor2.5秒 kill+Wait、CLI独立3秒硬退出未修改。原 DBus locator 约束保留，不通过 PATH 启动 dbus-launch；正常产品对已注册 Secret Service 的激活行为仍按现有 OS 服务合同，测试环境单独禁止激活。

### 原024反例红→绿和最终安全回放

[原始红灯](logs/01-original-replay-red.log) 来自新构建实际产品CLI、实际生产 TS managed transport 和024受控服务；执行保存的 `python3 logs/00-original-replay.py`，exit 1，两项 violation 均重现。取消 create：服务未写，回执与 catalog BEFORE status 却 available，随后 Status missing；取消 delete：服务保留，回执/catalog 却 missing/CREDENTIAL_DELETED，随后 Status available。不是编译或替身 callback 失败。所有 child 已 Wait。

生产修复后同一回放脚本/取消响应得 [02原绿灯](logs/02-original-replay-green.log)，exit 0，两项回执及 Status 前 catalog 都 failed/PROTECTION_DENIED；create Status missing，delete Status available。01/02采用历史默认 session bus 配置，只保留为红→绿记录，不据其宣称完整隔离。

发现自动激活风险后，仅调整 bus 隔离方式，不改这两个取消输入、受控服务的“无写入/无删除 + Completed.dismissed=true”响应或生产调用链。执行 13-isolated-original-replay.py（历史日志已清理：`logs/13-isolated-original-replay.py`），exit 0，[最终原反例回放日志](logs/13-original-replay-isolated-green.log) 明确 `CATALOG_BEFORE_STATUS` 均 failed/PROTECTION_DENIED、bus stderr为空、两项 cancellation violation 均消除、ALL_CHILDREN_REAPED true。回放临时目录 `/tmp/huhu-credential-result-repair-pze71r3r` 及其中 binary 已在全部进程 Wait 后删除；保存脚本是历史证据，不保证脱离当时构建目录独立可执行。永久 Go 测试负责可重复验收。

### 永久实际链路测试与逐场景观察

新文件 `native/huhubot/tests/contract/assistant/credentials_dbus_linux_test.go` 的永久入口 `TestCredentialActualSecretServiceOutcomes` 构建实际 `cmd/huhubot`，用现有 pnpm/esbuild 打包生产 `src/modules/huhubot/platform/desktop/transport/managed.ts`，Node 调用 `launchManagedBotSession`，沿私有 pipe→真实 Runner/provider→真实独立 worker→实际 godbus 到隔离服务。只有外部 Secret Service 是受控服务进程 `TestCredentialSecretServiceProcess`，没有替换生产 TS/provider/worker 或使用 callback 伪称 OS 验收。

下表每个名字均是永久 `TestCredentialActualSecretServiceOutcomes/<场景>`。结果列为本次实际观察，catalog 均在调用 Status **之前**直接读真实 SQLite；storage 是服务端实际保留 item 的布尔值，不从 client receipt 推断。全部 mode 保持 protected，deleting=0。正常控制项先真实 Register available，再 Delete；表中给最终删除结果。全12项的详细日志见 [14-final-isolated-dbus.log](logs/14-final-isolated-dbus.log)。

| 场景 | 操作结果 / reason | catalog BEFORE Status | 服务实际存储 | 同ref Status |
| --- | --- | --- | --- | --- |
| cancel-create | failed / PROTECTION_DENIED | failed | false | missing |
| cancel-delete | failed / PROTECTION_DENIED | failed | true | available |
| success | missing / CREDENTIAL_DELETED | missing | false | missing |
| prompt-success | missing / CREDENTIAL_DELETED | missing | false | missing |
| denied-create | failed / PROTECTION_DENIED | failed | false | missing |
| denied-delete | failed / PROTECTION_DENIED | failed | true | available |
| unlock-cancel | failed / PROTECTION_DENIED | failed | false | failed |
| unlock-success | missing / CREDENTIAL_DELETED | missing | false | missing |
| locked | failed / PROTECTION_LOCKED | failed | false | failed |
| unknown-create | unknown / OPERATION_TIMEOUT | unknown | true | available |
| disconnect-create | unknown / OPERATION_TIMEOUT | unknown | true | failed，服务离线 |
| spoof-cancel | failed / PROTECTION_DENIED | failed | false | missing |

prompt-success / unlock-success 把 Completed 信号放在 Prompt 方法回执之前，验证先订阅后触发；spoof-cancel 先发错path、另一unique sender伪信号，再发真正取消，验证不接纳伪完成。unknown-create 写入后不返回，结果保持unknown，原ref核查available；disconnect-create 写入后断开，结果unknown，后续服务离线不伪称missing或启动替代服务。测试断言单一catalog记录及实际create/delete计数，避免隐含重放/切换保护。既有 `TestDirectProviderDeleteHonorsModelReferences`、`TestProtectedFailureAndSameRefStatusReconcile`、`TestProtectedWorkerFailureCannotClaimWriteDidNotCommit` 等继续通过，保留共享ref引用阻挡与未知效果边界。

每次测试断言调用方 buffer清零、HAP响应不含哨兵、client stdout不含哨兵、实际临时Profile全部文件不含哨兵。受控服务只将存储布尔值/操作计数等元数据写日志，不将secret落盘。既有 `TestSupervisorUsesPrivatePipeAndFiltersAmbientCredentials` 等实际process测试继续验证argv/env/私有stdin与秘密隔离；这些是本次回归证据，不把 fake service 当作真实用户 keyring现场验收。

### 隔离缺口、修正及进程证据

早期为强化清理加入stderr断言后，[08](logs/08-final-dbus-cleanup.log)、[09 race](logs/09-final-dbus-cleanup-race.log)、[11 diagnostic](logs/11-disconnect-fixture-diagnostic.log) 均保留 exit 1：默认 `dbus-daemon --session` 读取宿主服务目录，fake断线后实际记录 `Activating service name='org.freedesktop.secrets'` 和 `discover_other_daemon: 1`。不能因为主要业务断言曾绿就覆盖此失败，不能确认该启动是否读取真实keyring元数据。发现后停止默认配置复跑，没有触碰现存服务来“清理”。这些历史日志与先前03/04的结果都不用于证明最终安全隔离。

按Lead指令，唯一最小只读观察为 `ps -p 5192 -o pid,ppid,lstart,comm`：[进程观察](logs/11-preexisting-process-observation.log) 记录PID5192、PPID3583、启动 `Fri Oct 23 18:40:25 2026`、comm gnome-keyring-d，观察UTC `2026-10-25T07:23:05.148676+00:00`。它早于本轮10月25日任务，不能算本次创建的子进程；该依据仅说明既有PID的时间归属，不证明激活尝试无其他副作用。未读取该进程环境/内存/keyring或向其发信号。

最终源码创建唯一短私有socket、临时HOME/XDG，仅用显式XML busconfig，不含 include、standard_session_servicedirs、servicedir、servicehelper。每场景在fake owner注册前独立 `ListActivatableNames`，只允许 org.freedesktop.DBus；访问离线 Secret Service 必须 ServiceUnknown/NameHasNoOwner。每场景结束检查 daemon `/proc/<pid>/task/<pid>/children` 为空；disconnect额外验证GetNameOwner=NameHasNoOwner、Collections=ServiceUnknown，日志activation-processes=0。12项最后实跑与race都通过。daemon、受控服务与client均登记清理、有限等待、超限kill兜底并Wait；stderr和非预期exit均会使测试失败，不会吞掉race或激活诊断。当前所有本任务会话已经结束，临时目录/socket/binary均清理；Lead自己的并行复验进程不属于本声明。

### 最终命令及真实结果

除标明外 cwd 为 `native/huhubot/`，实际 Linux/amd64；下列各次调用均真实 exit 0，未放宽旧断言或把先前默认bus运行冒充最终安全通过。

| 命令 | 结果 | 原始日志 |
| --- | --- | --- |
| `go test -mod=readonly -v ./tests/contract/assistant -run TestCredentialActualSecretServiceOutcomes -count=1` | 最终安全bus12场景，6.234s | [14](logs/14-final-isolated-dbus.log) |
| `go test -mod=readonly -race ./tests/contract/assistant -run TestCredentialActualSecretServiceOutcomes -count=1` | 19.563s | [15](logs/15-final-isolated-dbus-race.log) |
| `go test -mod=readonly ./internal/adapters/outbound/credentials ./tests/contract/assistant ./tests/contract/foundation -count=1` | 当前最终输入8.232s / 17.908s / 3.674s | [17](logs/17-current-regression.log) |
| `go test -mod=readonly -race ./internal/adapters/outbound/credentials ./tests/contract/assistant -count=1` | 当前最终输入15.807s / 33.883s | [18](logs/18-current-race.log) |
| `go vet -mod=readonly ./cmd/huhubot ./internal/adapters/outbound/credentials ./tests/contract/assistant` | 无诊断 | [16](logs/16-final-vet.log) |
| `CGO_ENABLED=0 GOOS=<os> GOARCH=<arch> go build -mod=readonly -o <临时binary> ./cmd/huhubot` | linux/amd64、linux/arm64、darwin/amd64、darwin/arm64、windows/amd64五目标exit0；临时binary删除。此后只有测试隔离配置变化，生产SHA未变 | [06](logs/06-final-cross.log) |
| `go mod tidy -diff` | exit0、无diff，未请求共享锁窗口 | [07](logs/07-module-graph.log) |
| 核对source/inputs逐文件SHA | exit0，当前源码、共享接缝、旧报告均与manifest一致 | [20](logs/20-freeze-check.log) |

最终三包包含 `TestCredentialWorkerExitsWithoutParentSupervisor` 的半帧/完整帧不EOF3秒退出测试，以及supervisor实际取消/deadline kill+Wait、private EOF/半帧与Runner退出、unknown同ref核查等既有覆盖。Lead另已原生回告当前输入独立12场景+worker时限、TS private4项及diff-check exit0；其原始证据由Lead持有，本报告不冒称作者运行。

### 来源、依赖与冻结摘要

新Linux协议代码为按官方接口自行编写，没有复制或改编go-keyring、其他Secret Service client或规范示例实现；只直接import已锁定的 `github.com/godbus/dbus/v5` 加标准库。规范依据为 [Prompt语义](https://specifications.freedesktop.org/secret-service/latest/prompts.html)、[Prompt.Prompt/Completed](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Prompt.html)、[Service.OpenSession/Unlock/ReadAlias](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Service.html)、[Collection.CreateItem/SearchItems](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Collection.html)、[Item.Delete/GetSecret](https://specifications.freedesktop.org/secret-service/latest/org.freedesktop.Secret.Item.html)、[Secret结构](https://specifications.freedesktop.org/secret-service/latest/types.html)。URL与固定依赖来源已告知025。

实际查阅的固定SDK：godbus v5.2.2，commit `a8ac15ba63645f02ffd57f4b443203279ab40b30`，BSD-2-Clause（Georg Reinke/Google版权）；go-keyring v0.2.8，commit `a8cdfe320cc8bc0534c895a648dc9214715a9da5`，root MIT，仅定位其取消处理缺陷；Windows继续使用既有keyring+wincred v1.2.3，没有改其代码。完整module/实际各目标GoFiles许可union、正式notices及Linux CI辅助工具归025工程owner，不用Linux import减少来擅删module许可。

19-production-go-files.json（历史日志已清理：`logs/19-production-go-files.json`） 来自实际 `GOOS=<os> GOARCH=amd64 go list -mod=readonly -deps -json ./cmd/huhubot`，不是强行指定未使用包：Linux运行依赖godbus30个GoFiles，不含go-keyring root；Windows keyring4个、wincred4个GoFiles，逐文件SHA已固定。manifest SHA `8acd7939a42947e1d3d7306f6399f3e1eeb8021910361de079ce4b9f93475e49`；本作者登记两目标，025负责最终五目标union。go.mod SHA仍 `b0dbcd2d694eccaedc15a7074bd91bcb66db9f07c5ab341a3df721a7ee829c3b`，go.sum仍 `2ca8fb2885f97742652fe42d605803322fd64c0779a1f6fff48d819cc43fa816`，`tidy -diff`真实无差异，未忽略import造成的可观察metadata漂移。

本次三个文件最终SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `native/huhubot/internal/adapters/outbound/credentials/keyring_linux.go` | `6c85c5095c54b7e48139d637d5fce1192c33812c9f2610fab450c513fb440892` |
| `native/huhubot/internal/adapters/outbound/credentials/secret_service_linux.go` | `eaf37195a1329ccef71c1255c9ae205701a97b54953ab6111ecda594726f9c21` |
| `native/huhubot/tests/contract/assistant/credentials_dbus_linux_test.go` | `0786c93b03a4920bc8b9fb2efb13174d1f4cde70d5e47aca3f3c9460f6ea0fed` |

source.sha256（历史日志已清理：`logs/source.sha256`） manifest SHA `6a3edec4cceab64bba123993bd6a24987c12229256b1f88049f8f07a1a5fbcc7`；inputs.sha256（历史日志已清理：`logs/inputs.sha256`） SHA `4e3f3bed9cfa1ec393ac5fe2d9eb5c1bf2bde40b953cf748c1b4adde0338e0cf` 固定TASK、020/029/024报告/原始反例、CLI/worker/API/catalog与locks。旧报告未覆盖，修复前失败仍可回读。

## 问题与下一步

本作者没有残留活动writer、probe或未处理失败；历史自动激活缺口及“不确定是否读取过元数据”保持明确记录。修正后的12场景验证了禁止激活的私有bus边界，不能据此倒推早期完全未触真实OS服务。

真实用户 Linux Secret Service保护、macOS Keychain、Windows CredMan、真实Electron/libuv/Windows管道和实际模型/Obsidian操作仍为 user-owned / not-run；跨编译与受控D-Bus不替代真实三OS现场。永久Linux测试明确要求dbus-daemon、node、pnpm/esbuild、python3 sqlite3，缺工具即失败；工程安装/CI适配由025在Lead授权窗口维护，本作者未写工作流。

交Lead以当前冻结候选进入新的独立两轴复审和工程接纳；本REPORT不修改024 request-changes，不批准T02正式依赖门，也不启动发布。回交结构检查按 `validate-dispatch.mjs --stage return` 执行，实际输出另存本任务日志。
