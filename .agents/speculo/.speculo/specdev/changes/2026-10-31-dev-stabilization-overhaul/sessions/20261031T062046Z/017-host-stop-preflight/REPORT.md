# 任务回报

Session: 20261031T062046Z
Task: 017-host-stop-preflight
Status: completed

## 聚焦交接

已只读追踪 T06 的真实 TS 消费者、进程所有者及测试入口，未改任何生产或测试文件。当前生产 stop 路径完全绕过 service.shutdown；4秒 TERM/随后1秒 KILL、无退出结果的 exited 和可重入 stop 的 finally closed 共同掩盖真实阶段。建议在现有 desktop session/runtime 中保留唯一清理 owner，以每次调用的期限观察它，而不是用期限终止 owner。T04 的27项及 T03 的4项继续冻结；正式实施仍待 Lead 放行。

## 产物与验证

### 依据与只读范围

current/dev/base 86c500556db1d64865c4cc7f1aff1dd83de071fa。复用 dev/testing/architecture，读取 T06、execution-boundaries、ADR-002、AC-281/282、shutdown.md、006/011/013 已有报告和相关实现。013 是原 reviewer 对 T04 新快照两轴 pass；本报告不替代 Lead 的正式证据或最终联合门。未运行测试、Go 构建、插件构建或任何生产变异；本报告是代码路径事实与实施建议，不宣称动态故障重现。

本地既有 owner/协议实现足以定位问题，不引入第三方库/外部代码，不新做来源许可推断。唯一写入本 REPORT。

### 真实 owner 链与发现

1. UI 页面不拥有进程。`src/modules/huhubot/ui/workbench-page.ts` 创建 ReactSurface，没有把页面 close 绑定 runtime.stop；`module.ts:27` 创建唯一 runtime，`:205` dispose 中 controller.abort、workspace.dispose 后返回 runtime.stop。普通关页不等于停 Runner。`src/app/modules/registry.ts` 正常停用等待模块 dispose；`disposeNow` 明确 Obsidian 不等待 onunload，仅订阅异步失败。不能承诺整个宿主进程退出后 TS 还能继续运行；模块 owner 在宿主仍活着时应持有清理责任，不扩大到改 registry 或 UI。
2. `platform/desktop/runtime/client-runtime.ts:258` 当前 stop：disposed=true，abort lifetime，state=stopping；取 session/pendingSession 后立即清空它们，直接 current.close，等待 exited/Host cleanup，finally 无条件 closed。没有调用分阶段 shutdown。重复 stop 没有 stopPromise：第二次取不到 owner，可能立即 closed；第一次慢退出尚未完成。onConnect/start 尚在进行时 stop 也未统一等待 startPromise 的实际资源交付，现有测试只证明最终 close 被调用，不能证明 stop promise 本身未提前完成。
3. 同文件 start 的 obsolete 分支（约186）在重连前确实等待 obsolete.exited，已有正确的进程收割顺序；但 exited 没有成功/失败语义，所以被强杀后仍可能重开同 Profile。运行中主动 stop 设 disposed 可阻断同实例 start，但不能以此替代真实完成/失败事实；重新模块实例仍依赖 Profile 锁及明确恢复判断。停止期间清空 session 还使 runtime.exited getter 丢失 owner promise。
4. `platform/desktop/transport/managed.ts:338` launchManagedBotSession 仅返回 client、credentials、exited、close，close 是 bot.close。onLaunch 先交 transport close/exited；hello/credentials 失败 catch 关闭并等待退出。这里最适合承载唯一 managed-session 停止 owner，并覆盖尚未完成 hello 的进程。
5. `managed.ts:267` fail 统一处理 close、EOF、写失败、协议消费错误和进程 exit；关闭 credential channel、stdin.end 后默认4000ms发TERM，再1000ms发KILL（选项上限30000）。该期限没有阶段依据，慢刷盘可被强杀；stdout EOF 也能启动强杀，即使 Go 已写最终ACK但进程仍在退出。删除/分离该自动升级逻辑不能只把4000调大。
6. `managed.ts:96` exited 仅 child.once('close') resolve<void>，丢弃 code/signal；stdout end 与 child exit/close 也不是同一事实。即使改为等待真正 child close，非零清理失败或强杀也不能被 runtime finally closed 当成功。需要保留退出观察结果和阶段快照，失败必须维持可诊断失败/恢复状态。
7. 全仓 TS `service.shutdown` 显式调用只有 `transport/runner.test.ts:90` 的 `{accepted:true}` 旧预期，以及`:111` ordinary owner拒绝测试；生产没有消费者。`core/protocol/connection.ts:139` 每次请求已有 timeout/AbortSignal；超时仅删除pending并登记 abandoned关联，不取消Go工作。不能把停止owner绑定 runtime已abort的lifetime signal；否则第一笔停止请求就会被拒绝。每次shutdown的wire waitMs应小于RPC期限，owner持续观察与caller短期限分开，避免最终响应被人为放弃后误报成功。
8. `HapConnection.close/finish`（约505）是通用连接关闭，清pending/reverse/lease，最终transport.close。不应在这个通用接口自动发managed shutdown，避免远程/普通客户端越权。当前仓库生产HapTransport只有DesktopHapTransport；“remote disconnect”是通用协议边界，没有找到另一个远程生产transport可迁移。managed:false仍是本地spawn，但无managed RPC授权：保持普通断连/EOF语义，不能伪装成有阶段确认的正常managed stop。
9. 正式 Profile 位于本机managed root，由Go持锁，runtime不负责删除它。生产目录内没有发现stop后rm Profile的代码。临时目录删除来自 runner.test.ts afterEach、credentials-runner.test.ts afterEach及 services/events/runner.test.ts finally：均已有先close/await exited再rm的顺序，但现有void退出结果不能区分强杀/失败。修后必须保留这个顺序；失败或未退出时保留fixture目录及明确错误，不用finally rm掩盖残余owner。

### 最小实施方案（尚未写入）

- managed session 内创建一次停止过程，保留最新wire事实和真实child退出结果；ready managed client重复调用shutdown观察直到finished，再检查failures、persistenceComplete、profileReleased和executionDrained，最后等待child close及成功退出。finished仅结束清理，profileReleased仅确认释放，两者都不单独证明持久化或进程成功退出。
- caller `timeoutMs/signal`只结束该caller对同一owner的等待；短期限结束仍stopping，后续stop可继续观察同一过程，不重发独立清理、不立即close、不丢进程引用、不重开Profile或删临时目录。可使用本地平台层停止选项与快照类型，不必改变公共wire/API或Go。
- Runtime缓存唯一stop owner promise，保留pending launch/session/start的归属；先同步拒绝新start，再启动停止/必要的未握手EOF处理。晚到launch/Host registration必须并入同一清理完成条件；Host cleanup失败不可finally改closed。重复stop共享owner，caller观察期限可各自独立。
- 正常停止移除自动TERM/KILL升级。显式强制终止若为测试兜底或明确恢复需要，应独立命名、记录forced/nonzero和恢复要求，绝不当普通close成功；不新增UI强制操作。对未握手/协议已坏的进程，可关闭管道启动Go EOF清理并等待真实退出，但无最终事实只能报告未确认/失败，不能凭EOF补造持久化成功。
- 通用BotClient.close继续是断连；managed session停止是owner行为。保留原认证、私密管道、stderr脱敏、写队列界限和Host未知效果义务。若确需改core connection、module或公共API，先报Lead扩范围，不用T06宽目录掩盖跨区修改。

### 精确候选写集与缺口

T06已授权目录内预计必须：

- `src/modules/huhubot/platform/desktop/transport/managed.ts`
- `src/modules/huhubot/platform/desktop/runtime/client-runtime.ts`
- `src/modules/huhubot/platform/desktop/transport/managed.test.ts`
- `src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts`
- `src/modules/huhubot/platform/desktop/transport/runner.test.ts`
- `src/modules/huhubot/platform/desktop/transport/credentials-runner.test.ts`

若为隔离owner逻辑新增文件，建议仅`transport/managed-stop.ts`及同目录测试；真实慢子进程fixture亦放transport目录，实施前明确实际选择，不预先承诺新增抽象。

唯一已定位的潜在目录外迁移：`src/modules/huhubot/services/events/runner.test.ts:47`也传shutdownGraceMs:2000。若删除失效的自动kill配置，需要批准删除该参数；该fixture的close/await exit/rm行为还应只读回归。不能为避免一行扩范围保留双停止协议或误导选项。Go生产、api.ts、module.ts、core/protocol、Agent/PTy、Browser、UI均预期只读。

### 测试缺口与计划

1. 首先新增真实红灯：runtime连续两次stop，保持子进程exit gate不释放，任何一次都不得closed；launch或onConnect晚到时同理。不使用立即resolve exited的mock冒充真实生命周期。
2. managed owner控制回归：第一次requested=true/其余未完成，caller短期限结束但owner继续；再次观察收到真实完成，仍hold child-close gate，state应继续stopping。释放close后才成功。覆盖finished+failure、persistence false、profileReleased false、非零exit、signal、EOF而没有final事实、重复stop/dispose和cleanup抛错。
3. 替换 managed.test.ts 当前“20ms自动杀掉忽略EOF/TERM子进程”的旧合同测试：真实子进程的受控gate超过旧4秒边界仍存活、仍持有fixture资源，明确释放后真实退出；异常/不合作进程只在显式force测试清理，结果为恢复/失败。该现有shebang测试仅Linux执行，跨平台不假称通过。
4. runner.test.ts使用真实Go二进制，移除accepted-only预期，消费相同生产session停止路径；检查锁竞争→短观察未完成→最终退出→同Profile重开、稳定metadata与已提交记录。不要仅在TS返回fake facts证明真实Go清理。慢路径可复用现有受控HTTP/Probe生产者，在TS↔Go fixture中令真实producer待release；无需把Go walSync接缝暴露成生产CLI参数。
5. credentials-runner与events runner回归验证私密通道/Host与事件行为未退化，所有临时根仅在真实child已回收后删除。失败保留目录和PID/exit事实；清理不删除仍被owner使用的根。
6. 既有 `src/modules/agent/services/workspace-service-stop-native.test.ts` 是PTY helper/TerminalSessions/SpaceService链，条件为Linux及已有huhu-pty，验证scope/后代进程/Space writer/Browser lease隔离。它不是Bot停止测试，且涉及冻结Browser混合面；只识别边界，不在T06修改或据其skip声称Bot通过。
7. 正式实现后的顺序验证：定向runtime/managed红绿→desktop完整Vitest（包括真实Go runner/credentials）→相邻events runner只读回归→tsconfig.test类型检查、huhubot architecture、lint。真实Go重型任务与Lead串行协调。Lead在稳定T04+T06输入执行`pnpm check:huhu-bot`及非Browser构建等价序列/预算；不得把worker定向-p1替代原拓扑全量。
8. 注意命令事实：`pnpm check:huhu-bot`实际是`node scripts/build-huhu-bot.mjs --test`，仅Go `test -mod=readonly -timeout 45m ./...`（Windows额外-p1），不运行TS↔Go Vitest。因此Ticket这一命令不能单独证明TS消费者集成，必须另跑上述真实runner用例。原源码脚本的3秒注释虽旧，本次不顺手修改。

## 问题与下一步

预检已完成，无生产写入。Lead放行正式T06 TASK时确认实际文件列表，若删除shutdownGraceMs请追加events runner一行迁移授权；不修改冻结T03或T04。真实慢路径、跨平台退出、调用方期限后继续清理及失败恢复目前均只有方案，尚未执行；不得视为验收通过。模块卸载不被Obsidian等待这一宿主限制如实保留，UI显示留T33。
