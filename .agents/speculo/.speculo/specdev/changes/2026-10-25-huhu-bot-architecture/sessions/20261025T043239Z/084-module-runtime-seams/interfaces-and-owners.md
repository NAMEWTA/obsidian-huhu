# T20 最小组合接缝与 owner

只读准备；没有启动 T20 实施、UI/模块脚手架、产品或检查。`A` 为 `src/app/`，`P` 为 `src/modules/huhubot/`，`N` 为 `native/huhubot/`。下表行段绑定 source-manifest.json 的实际来源 SHA；Go 正由080/081收尾，所记源码不是联合冻结或验收结论。未来 owner 仍由 Root 正式派遣。

## 实物与尚未装配

| 当前实物/行段 | 实际输入、输出及边界 | 未来唯一责任 |
| --- | --- | --- |
| `A/contracts/module.ts:9–10,43–81,121–154`；`A/manifests.ts:1–31` | ModuleId 类型已有 huhubot；**MODULE_IDS、MANIFESTS 尚未加入它**。ModuleManifest 提供 platforms/defaultEnabled/activation/load；ModuleContext 提供 lifetime/services/settings；ModuleInstance 支持 async activate/dispose 与延迟 pages。 | T20 提供 manifest/module/settings/i18n；MODULE_IDS 在原 T01 公共契约路径，需 Root 给准确维护窗口，不因类型已存在猜开关已可达。 |
| `A/modules/registry.ts:56–71,120–149,157–193` | peek 不激活；acquire 按 owner 激活并返 `{value,revoked}`；watch 只监听发布/撤回。受支持且 enabled 才 load，失败报告并隔离其他模块；服务在 activate 完成后发布。 | T20 复用注册表，不新建服务管理器。建议 on-demand，使未打开 Bot 不加载 SDK/Go/Node/UI；移动端支持标志为 false，并在动态 desktop import 前守卫。 |
| `P/api.ts:878`；`A/modules/registry.ts:268–285` | BOT_CLIENT 是现有唯一 Bot 服务键，类型为实际 BotClient。全 src 检索只有键声明，**没有 provider/consumer 装配**。registry 当前只在 activation provide、deactivation withdraw，没有模块可用的替换 provider 操作。 | T20 与 T01 冻结连接发布/替换语义：不能宣称旧租约里的具体 BotClient 已变成重连后的连接；若需稳定 runtime facade/键或代理，先由公共 owner 定唯一接口。这里不预造 DTO。 |
| `A/main.ts:55–56,78–118`；`src/host/obsidian/storage/device-id.ts:13–40` | 宿主先初始化 vault/device identity；每模块创建自己的 Obsidian Component lifetime，命令/扩展随 lifetime 注册/释放。 | T20 使用已有初始化身份和 context；不借 agent/controller 生命周期，不自行重复初始化/保存设备身份。 |
| `scripts/build-huhu-bot.mjs:8–17,53–94` | 现有五目标 binary/.sha256/.json 构建与校验格式，含版本、平台、架构、HAP0.1、wire schemaVersion1、源码摘要。**这是工程脚本，不是可在插件里调用的受管安装器。** | T27 原 owner 保持资产/发布合同；T20 的 desktop/binary 校验下载、staging/原子替换/离线回退仍未实现，不静态导入构建脚本。wire schemaVersion 不等于 Profile DB 迁移版本。 |
| `src/modules/agent/platform/desktop/pty/binary.ts:12–46,115–219` | PTY 的平台映射、固定版本/digest、每版本路径、认证 stamp、原子临时文件与旧资产保留可作为机制参考。 | T20 只参照，不能跨模块导入此私有 ensureHelper，也不复用 PTY 文件名、环境变量、账号/进程。Bot 需自己的受管资产身份，不回退 PATH。 |
| `P/platform/desktop/transport/managed.ts:16–29,130–151,333–350` | ManagedRunnerOptions 要求已由 install owner 校验的绝对 binary、Profile locator、existing cwd；launchManagedBotSession 返 `{client,credentials,exited,close}`，握手失败 close 并 await exited。无下载、Profile 选择或信任校验。 | T20 持这一个现有 session/transport；不另造 process manager。单用 launchBotClient 成功只返 client，无法从中获取真实 child.exited，模块组合宜保留 session 句柄。 |
| `N/internal/runtime/profile/profile.go:25–48,75–145` | Go 构造 OS managed profiles root 并验证 locator/锁/权限；hello 提供实际 profileId/commandEpoch/revision。Windows LOCALAPPDATA/HUHU、macOS Application Support/HUHU、Linux XDG_STATE_HOME/huhu 均为库外根。 | T20 desktop runtime 的 Profile 选择/设备设置映射尚无 TS 实物；与 T19 维护/恢复约定收敛后消费，不把 `.huhu/huhubot` 当业务 Profile、不从名称猜 Profile ID、不读写 SQLite。 |
| `managed.ts:35–65` | 当前严格环境白名单有 OS/locale/XDG/DBus；没有 PATH/Provider key/SDK selector。当前也没有通用代理/CA键放行。 | T20 如实际需要受控 TLS/代理配置，向 T01 精确请求并验正负例；不能复制 process.env 或认为参数 environment 会透传任意键。 |

P 下 module.ts/manifest.ts/settings.ts/i18n.ts/services/runtime、platform/desktop/runtime、platform/desktop/binary 以及 docs/huhu-bot-runtime.md 均尚不存在。现有 readonly schema/proxy 中 profile.deletePreview/delete、portable.export/importPreview/import 的 implemented=false；只有 profile.status 在此组已装配。T17清除、T18portable、T19完整维护/坏库恢复 UI/Port 仍属后续票，不把已有 base/effects migration backup 保护等同整票能力。坏库/旧程序错误应可解释停止，不通过新建空 Profile 或无限自动重启隐藏。

## Host、凭证与来源装配

| 实际入口/行段 | 复用关系和不可混淆的边界 |
| --- | --- |
| `P/platform/desktop/credentials/client.ts:42–68,142–163`；`managed.ts:121–157,333–345` | 同一受管进程 fd3/fd4 私有匿名 pipe，HAP hello 得到真实 profileId 后做 credential hello；仅 register/status/delete，无 secret resolve。register 消费并擦 mutable buffer，protected/session-memory 为明确请求；失败/断线 unknown 不等于已持久。private EOF/fail 会结束整个 managed session，不能把 close credentials 当作页面取消。T02 原 owner维护，T20只组合。 |
| `P/services/assistant-client.ts:9–46` | 对现有 BotClient 的 Agent/Model facade，绑定打开的 Profile，不重试写入。模型绑定只传 credentialRef；它不拥有秘密或进程。重连后 facade 应绑定实际新 client，不能继续用旧连接；原命令身份由调用方持有。 |
| `P/services/host-write/obsidian-host.ts:19–42` | registerObsidianNoteHost 组合 ObsidianSources/Read/NoteEffects/Write/回执认证，client.setHost 安装本地 handler；**它不调用 host.attach**。需要 workspaceId/originClientId/timers/lifetime，实际 profile/epoch来自 hello，device来自初始化宿主。返 host/sources/effects/writes/dispose，模块持有。 |
| `P/core/protocol/connection.ts:241–249,304–328`；`N/internal/application/api/service.go:75–101` | 本地 setHost 与服务端 attach 是两步。建议先安装 handler，再以真实已实现 capability 显式 attach，回包后 connection 校验并通知 leaseChanged；普通连接无 managed Host 身份。attach 生成新的 leaseId/hostConnectionId/leaseEpoch，当前期限5分钟，重 attach 递增代。 |
| `P/platform/obsidian/sources/sources.ts:55–68,144–207,291–306` | 来源必须实际 captureNote/captureSelection（明确 leaf/view，含未保存文本）或显式 folder/vault metadata capture。lease 变化清 registry/cursor/正文并使旧 handle 失效；openSource 不是任意后台文件读取。T05 原 owner；后续 composer 只附加真实 capture 的完整快照，不构造路径权限。 |
| `P/services/events/event-client.ts:119–124`；`GroupClient:217` | runtime 需把 lease/source/Grant 失效连到投影缓存：保留 factory 原 read/write leaseChanged 回调，再协调 EventClient.leaseChanged 与群 permissionsChanged 等实际入口。factory 目前未自动连接这些 UI/流消费者。成员移除的合法 public History 与真正来源撤权不能混成一种清理。 |

lease 维护是实物前置：现无独立 renew 方法；不能本地改 expiresAt，也不能把新 attach 的代写回旧 source proof。新 lease 使旧来源失效，T16对旧来源资格拒绝是当前行为。长运行的重附着/重新捕获与授权呈现由 T20 与 T01/T05/权限 owner 明确组合；不得无声复制 Grant 或复活旧正文。

`.huhu/huhubot` 只放宿主最小回执/索引，业务数据库仍在库外 Profile。factory 的 ReceiptAuthority 使用 App 本机存储且按 device/Profile 归属；query不生成键，坏/缺键不能自证原 committed。T20复用现有工厂，不在 settings/Vault/普通HAP/日志保存 secret 或回执认证键。

## controller 持有与实际群恢复缺口

| 当前入口/行段 | 正确持有方和页面行为 |
| --- | --- |
| `P/services/events/event-client.ts:47–117,147–181,217–286` | 模块/会话服务持 EventClient，页面 attach 得 EventSubscription；当前没有自动可见性输入。未来页面隐藏若要暂停本地读取，需退页面订阅或由原owner补明确接缝；现有 subscription.dispose 只退订/解除 listener，不 calls runs.cancel/close。reanchor 仅作用于已 attached 目标，先abort旧页清正文，再当前 runs.get/tail；Profile/lease/权限切换、完整 group tuple 及更高 Run revision仍约束缓存。它不是独立业务状态库。 |
| `P/services/groups/group-client.ts:35–61,166–174,217–236` | 每 Session 一个 GroupClient，内部**自己 new 私有 EventClient**，watchRun 返回页面流订阅；自身持 draft/prepared command/public History。setClient 清旧连接缓存并转给内建 events；permissionsChanged清来源授权缓存；dispose释放所有流及内建 events。页面不能 dispose共享 GroupClient，否则其他页面丢订阅/草稿。 |
| `P/services/recovery/recovery-client.ts:30–56,99–127,145–184` | 按 Run/原 Profile/commandEpoch 持有 RecoveryClient，保留prepared exact command和uncertain；inspect只取完整服务端资格/affectedRunIds，ready 不执行。显式resume/retry后用注入的真实投影 owner reanchor目标。断线继续持原实例，setClient(undefined/newBot)不自动业务重播，Profile/epoch变化拒绝；dispose/drained不等于取消 Run 或结束进程。 |

**现有缺口不是已接好：** RecoveryClient 需要 `Pick<EventClient,'reanchor'>`，但 GroupClient 的实际群显示流在 private events，watchRun 的返回值无 reanchor。给 RecoveryClient 另一个空 EventClient 会 no-op，不能证明群页面已恢复。后续原 T13 owner 可在正式窄窗口选择：

- **目标公开转发：** 在 GroupClient 公开限定本 Session/owned Run 的 reanchor 转发，RecoveryClient以该真实目标入口组合；内建 EventClient继续由 GroupClient独占。保留 sticky拒绝、public History、draft与 sibling隔离；disconnect/dispose只走现有setClient/dispose。
- **共享实例注入：** 明确唯一 EventClient owner并注入 GroupClient，约定 GroupClient退出是否释放或退租、setClient谁调用、多个 Session/页面和Recovery共享时的缓存隔离。不能维持当前“GroupClient无条件dispose全部events”又把其当跨会话共享资源。

两者都需要原 T13路径 `P/services/groups/group-client.ts` 及相邻测试的精确窗口，本084不打开、不私取字段、不新增另一份 projection。Root已确认这是未来T20前置接缝。单聊或Root/081独立 EventClient→RecoveryClient代码链不替代群实际展示流的接线证据。

同 Profile/epoch重连建议先绑定真实投影 owner的新 client，再对**原** RecoveryClient.setClient(newBot)；读取可按现有poll策略恢复，StartRun/resume 不自动重播。不能仅重新创建 RecoveryClient来“恢复页面”，丢失的原key/CAS/generation会使uncertain无法正确核查。换 Profile/epoch先清显示权限并保留原不确定命令归属，不能将旧实例换绑执行。公开 History按自己持久seq消费，不由Run流重造。

## 四个关闭条件与不等待 async unload 的路径

| 条件/真实来源 | 现有保证、等待责任和限制 |
| --- | --- |
| **页面/模块资源**：`shell/host/workbench-pages.ts:124–138,180–202`；`A/modules/registry.ts:236–259` | 隐藏保留surface并setVisible(false)，关闭abort页面controller并await surface.onClose。正常停用先模块signal abort/withdraw，再await ModuleInstance.dispose，最后release lifetime。T20停止新本地动作/重连/计时器并退页面订阅；页面不拥有Runner。 |
| **Host真实 Promise**：`P/services/host-write/host-write.ts:32–37,46–88`；connection.ts:462–471 | dispose/lease变化只请求abort；不可取消 Vault Promise继续占App共享quota至settle，drained等待真实Promise。逻辑取消只发一次reply；晚完成可落最小receipt而不补第二reply。T20保留factory句柄并单独await writes.drained；超过自己的关闭等待预算只能报告未排空，不能删除占位或声称无效果。 |
| **Go停受理/排空**：`N/internal/application/api/service.go:49–59`；`bootstrap/core.go:207–284`；`cmd/huhubot/main.go:78–103` | managed service.shutdown ACK只表示RequestStop：同步停准入/请求取消，异步发布持久stop fence、等executor/inspect/producer，再关provider/DB/Profile锁。Core.Close等3秒，超时RECOVERY_BLOCKED，仍保留资源由drain完成；main随后WaitClosed，不把超时当清理完成。TS不能通过ACK推断无外部效果。此为当前源码观察，联合normal尚由080/081收尾。 |
| **真实 child结束**：`managed.ts:87–101,270–303` | close同步void，拒队列、关私有pipe、stdin.end，默认4秒后TERM，再1秒SIGKILL后备；exited等child close事件和句柄。T20明确await session.exited；它证明本地进程退出，不证明Obsidian侧Vault Promise排空或外部Provider成本已知。 |

正常 disable 的最小组合是：先停止本地新动作/自动重连并让页面退租；撤Host租约/阻新Host任务（保留既有最小回执；无当前lease时不调用query）；尝试当前managed service.shutdown/EOF进入同Go关闭网关；立即装好既有session.close后备路径并实际await exited，同时独立await本地controller.drained与writes.drained。具体重叠/超时呈现需T20真实故障测试，不能用串行先无限等Host而永远不触发进程后备终止。

宿主卸载另走 `A/main.ts:158–161` → registry.disposeNow():214–233：Obsidian不await async onUnload，registry同步abort/withdraw并调用dispose，再观察Promise错误；因此T20.dispose必须在第一次await前同步停本地准入/重连并建立close/终止后备。不能只返回一个未来才会启动cleanup的Promise。最终OS结束与不可取消Host的unknown/最小回执按真实事实展示，重开不自动重发写/恢复。Bot只close自身session，不获取AGENT_*、不dispose CLI Agent/PTY；同理CLI agent关闭不应影响它。

## 后续最小实施序列与反例（本次全部 not-run）

1. Root按T20正式窗口校准注册路径与公共service/Group reanchor owner，先以真实ModuleRegistry consumer验证on-demand、移动端unsupported、失败隔离、lease撤销及loading时unload/异步工厂晚到；不注册无实际页面工厂的假产品。T21/22再交生产React页面，由T20接线。
2. 实现独立desktop安装/Profile选择，消费T27实际资产格式及T19约定；验证坏hash/错平台/截断下载/并发安装/离线旧版/被占用资产不执行，旧可用版本保留，不PATH fallback。
3. 由现有launchManagedBotSession做一次process/session创建，安装Host再attach，按hello capabilities显示可用范围，私有凭证明确protected/session-memory；测试keyring不可用仍保留配置、不继承CLI秘密。
4. 模块持Session/Run controllers并发布稳定只读状态；两叶子共享同Run，隐藏/close仅退订，断线/reconnect不重复执行，uncertain保留原key；群测试必须走实际GroupClient展示流而非空projection。未知新贡献者/第100tuple及旧epoch/Grant撤销的缓存边界沿当前既有规则。
5. 在真实CLI/Host受控边界卡住Vault写、已写丢回包、producer拒停：分别观察shutdown ACK、连接closed、Host drained、child exited；disable/unload/activate失败全部Wait/排空或明确unknown，下一进程锁/CP/receipt结果一致。不靠延长测试阈值隐藏故障。
6. T17–19实际接口未完成时按capability禁用相应入口，不能以预留DTO做成功替身；Profile坏库停止/解释，有限退避重启只针对可恢复连接故障，不无条件循环重启坏CP。

视觉只继承DESIGN revision2的唯一final方向。006真实repair-2记录70截图/308断言、摘要96374764bb60e419652b926087a06683eea3c263b9ff98df14a2127812fa6310，明确不是新人工批准；旧check-preview/check-ready曾报摘要不匹配exit126。084不重跑、不改设计/摘要/批准，不把旧readiness文字或离线原型当生产Obsidian验收，也不要求用户重选。LOG051真实Provider/Obsidian/目标OS仍用户后验。
