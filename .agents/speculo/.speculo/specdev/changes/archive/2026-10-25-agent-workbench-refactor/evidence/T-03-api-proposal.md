# T-03 API 简明提案（只读，待 Root/A 冻结）

本轮仅观察源并写本 `/tmp` 报告，没有修改仓库、正式计划/证据/产物或 Git，没有构建、测试、启动 helper/PTY/Provider，也没有派子 Agent。本提案不是已实现 API、ready/done 判定或产品测试证据。沿此前 dev/ui 规则与 dispatch-preflight 收敛接口，不新增产品范围或外部依赖。

Root 提供的 T-02 round2 输入标识为 `48497f9ed2f152160f58af21073bb0dc5b96c1ebf245372c75264adbf6ba2b96`；随后 Root 明确告知 select 与 background append 出现新的交错反例，T-02 尚未通过，原 owner 仍分析/修复。因此本报告中的当前源摘要只标识本次观察，不把现有 workspace bridge 当作最终验收接口。实际派单须消费 Root 后续新 baseline/T-02 Evidence。

## 1. 唯一 owner 与现有接线

**唯一内存运行 owner 选定现有 `TerminalSessions`。** 它同时拥有 reservation/current 索引、TerminalSession/headless、捕获 native lease/sid、启动结算与事件路由；不新增平行 ManagedRuntimeService 或 managed 持久 store。SpaceService 继续唯一持久 Space/Session/layout writer。WorkspaceService 只编排准入、launcher、显示和缓存只读投影；原 `identities` 应合入 TerminalSessions 的权威 binding，而非另留可独立变化的身份表。

| 当前源码位置 | 实际接缝与 T-03 必须改变的边界 |
|---|---|
| `services/spaces/space-service.ts:12,128,241,244` | `SessionAdmission {record,cwd,beforeSpawn}`；prepareSession 经同队列 verified commit 返回，updateLayout 已是队列内 transformer。beforeSpawn 再验 writer、物理目录/授权及持久 Session。T-03 不另写 records、不复制 guard，不根据布局/cwd 猜 Space |
| `services/workspace-service.ts:58,75,137–182` | 现 launch port 仅在 await 后返回 TerminalSession，identities 也在 await 后绑定，身份过晚。改成 commit 后立即同步 reserve，再调用任何启动准备 |
| `services/terminal/sessions.ts:177–264` | 当前 await helper/environment 后才创建 TerminalSession。保留 T-01 captured helper/alive/lease 清理，接受事先保留的 runtime 身份；helper/账号失败也不能使尝试不可查 |
| `services/workspace-service.ts:106–135,307–338,430–458,465–523` | attach 默认 activate/focus；close/closePane 调 remove；restore 会 spawn。分别改为显式显示意图、仅 detach 和普通打开零 spawn |
| `services/controller.ts:159–195,498–546,667–709,883` | 实际装配、start/show/open、captureLaunchHost、status 均在此。后台不 place/open/focus，status 取 managed 投影；不能只改 UI 漏掉 controller 直达路径 |
| `services/launch/launcher.ts:36–78,123` | 复用原 confirmLaunchPermissions→resolveCli→accountEnv→accountArgs/launchArgs；当前 Notice+void 早退需转换成可分类结果。权限确认与是否显示终端独立 |
| `services/terminal/session.ts:232,281,303,367` | 同一个 headless 保留；attach 不得复活已退出状态，exit(null,null) 不得折为成功0；receive→parse callback→ACK 与订阅 parse barrier 保留 |

身份的唯一词义：新 DTO 的 `sessionId` 就是稳定业务 `SessionRecord.id`（stableSessionId）；`runtimeId` 是每次启动独立代次，可继续采用现 `TerminalSession.id`；`nativeSid` 是捕获 lease/generation 内的原生传输 sid，不进业务/UI DTO，也不是 Provider 的 `nativeSessionId`。布局现有 `sessionIds`/paneLayout.session 暂仍引用 runtimeId；恢复元数据沿用真实字段 `ResumeInfo.spaceId/persistentSessionId`，不改成另一套拼写。

## 2. A 先冻结给 B 的唯一纯合同

拟新增 `src/modules/agent/core/workspace/managed-runtime.ts`。这里只含类型，不引用 services/React/Obsidian、TerminalSession、env 或存储。

```ts
interface ManagedSessionTarget { readonly spaceId: string; readonly sessionId: string }
interface ManagedRuntimeRef extends ManagedSessionTarget { readonly runtimeId: string }
type ManagedPhase = 'launch-pending' | 'connected' | 'failed' | 'cancelled' | 'disconnected' | 'exited';
type ManagedEffect = 'none' | 'partial' | 'completed' | 'unknown';
type ManagedErrorCode = SpaceErrorCode | 'STALE_RUNTIME' | 'MODULE_INACTIVE'
  | 'CONNECTION_UNAVAILABLE' | 'SOURCE_UNAVAILABLE' | 'AGENT_BLOCKED' | 'EFFECT_UNKNOWN';
type ManagedErrorKey =
  `agent.managed.${'invalidInput' | 'permissionRequired' | 'programMissing' | 'accountUnavailable'
    | 'unavailable' | 'moduleInactive' | 'targetMissing' | 'staleRuntime' | 'effectUnknown' | 'launchFailed'}`
  | `agent.spaces.error.${'required' | 'ambiguous' | 'missing' | 'scope' | 'owner' | 'directory' | 'save'}`;
interface ManagedFailure {
  readonly code: ManagedErrorCode;
  readonly reason: string; // A 固定的有限原因，不解析人类文案判断重试
  readonly messageKey: ManagedErrorKey; // §5 的错误键联合，含列明的已有 Space 键
  readonly nextAction: 'correct-input' | 'choose-space' | 'configure-program' | 'configure-account'
    | 'confirm-permissions' | 'open-terminal' | 'inspect-runtime' | 'retry-explicitly';
  readonly details: Readonly<Record<string, string | number | boolean>>;
}
interface ManagedRuntimeSummary {
  readonly runtimeId: string;
  readonly phase: ManagedPhase;
  readonly activity: AgentState; // 现有 core/workspace/model 的类型
  readonly inputReady: boolean; // 保留现有 agent 输入证据；不是模型任务成功或通用 TUI 就绪
  readonly pid?: number;        // 诊断值，可缺失，不能作为身份/存活证明
  readonly exit?: { readonly code: number | null; readonly signal: string | null;
    readonly confirmed: boolean };
  readonly error?: ManagedFailure;
}
interface ManagedSessionSummary extends ManagedSessionTarget {
  readonly kind: 'shell' | 'agent'; readonly title: string; readonly createdAt: number;
  readonly agentId?: AgentId; readonly accountId?: string;
  readonly runtime?: ManagedRuntimeSummary;
  readonly viewState: 'background' | 'attached' | 'detached' | 'restored';
}
interface ManagedSnapshot { readonly revision: number; readonly sessions: readonly ManagedSessionSummary[] }
type ManagedCreateRequest = { readonly spaceId: string; readonly title?: string;
  readonly foreground?: boolean; readonly groupId?: string } & (
  { readonly kind: 'shell'; readonly shell?: ShellChoice } |
  { readonly kind: 'agent'; readonly agentId: AgentId; readonly accountId?: string }
);
type ManagedInteractiveCreateRequest = { readonly spaceId?: string; readonly title?: string;
  readonly foreground?: boolean; readonly groupId?: string } & (
  { readonly kind: 'shell'; readonly shell?: ShellChoice } |
  { readonly kind: 'agent'; readonly agentId: AgentId; readonly accountId?: string }
);
type ManagedCreateResult =
  | { readonly status: 'created'; readonly effect: 'completed';
      readonly session: ManagedSessionSummary & { readonly runtime: ManagedRuntimeSummary } }
  | { readonly status: 'cancelled'; readonly effect: 'none' | 'partial';
      readonly reason: 'space-selection' | 'permission-confirmation'; readonly session?: ManagedSessionSummary }
  | { readonly status: 'failed'; readonly effect: 'none' | 'partial' | 'unknown';
      readonly error: ManagedFailure; readonly session?: ManagedSessionSummary };
type ManagedAttachResult =
  | { readonly status: 'attached'; readonly target: ManagedRuntimeRef; readonly tabId: string; readonly focused: boolean }
  | { readonly status: 'pending'; readonly target: ManagedRuntimeRef }
  | { readonly status: 'not-running'; readonly target: ManagedSessionTarget }
  | { readonly status: 'failed'; readonly target: ManagedSessionTarget; readonly error: ManagedFailure };
```

`SpaceErrorCode`/`AgentId`/`ShellChoice`/`AgentState` 从既有 core 类型 import。两种 create request 显式保留 shell/agent 判别联合，避免普通 Omit 丢失分支字段。

`runtime` 缺失仅表示本激活期无该 Session 的运行对象；重启恢复记录是 `viewState:'restored'`，不冒称运行。attached 只表示仍有布局显示引用，不等于 renderer 此刻可见。background 是尚未附加显示，detached 是已有显示被关掉。失败/已退出 runtime 仍可留存最后屏幕并附加查看，viewState 与运行 phase 独立。新增字段均为内存投影，不增加持久 schema。

## 3. WorkspaceService 对 B 冻结的方法

```ts
// 严格用例：spaceId 必填并精确核验；默认 foreground:false；永不弹框/自动确认。
createManaged(request: ManagedCreateRequest): Promise<ManagedCreateResult>;
// GUI 主动入口：允许显式 Space 选择及原 Manual/YOLO 首次确认；默认 foreground:true。
createManagedInteractive(request: ManagedInteractiveCreateRequest): Promise<ManagedCreateResult>;
getManaged(target: ManagedSessionTarget): ManagedSessionSummary | undefined;
listManaged(spaceId: string): readonly ManagedSessionSummary[];
getManagedSnapshot(): ManagedSnapshot;
subscribeManaged(listener: () => void): () => void;
attachManaged(target: ManagedSessionTarget, options?: {
  expectedRuntimeId?: string; focus?: boolean; groupId?: string;
}): Promise<ManagedAttachResult>; // focus 默认 true，这是明确用户“打开”动作
// 现有调用方兼容保留；terminal 分支仅改布局/显示引用，不 end/remove/dispose。
close(tabId: string, confirm: ConfirmFn): Promise<void>;
closePane(runtimeId: string, confirm: (message: string) => Promise<boolean>): Promise<void>;
```

两种 create 共用一个内部实现，仅内部 LaunchContext 区分 `interactive/noninteractive`；foreground 绝不推导 interactive。GUI 勾选“后台启动”调用 interactive wrapper + foreground:false，仍可进行原首次权限确认，但不打开新终端；CLI/后台自动化只调用严格入口，首次确认未具备时返回 `AGENT_BLOCKED/permission-confirmation-required`，不弹框、不自动确认。机器请求字段不能提供“interactive:true”来绕过这个入口边界。

GUI 未传 Space 时先 requireSpace(interactive:true)；无 Space 引导已有创建/选择流程，取消 `effect:none`、无 Session/运行。给定的 Space 已失效则明确失败，不能偷偷换 Space。绑定在选择确认时冻结；账号 ID、CLI/权限模式/env 配置引用在接纳时捕获，不在后续 await 后从当前焦点或设置重算。严格 request 不接收 cwd/file/env；目录只能来自 admission。

旧 newTerminal/newAgent 保留原参数/Promise<runtimeId|undefined> 兼容入口，委托 interactive；取消可 undefined，失败保留带稳定 code/effect/已知目标的错误供原 catch/report。B 的新建名/后台功能改消费新结果，不依赖 undefined 判断所有失败。原 options.cwd 不得覆盖 committed admission.cwd。原 split/restore 显式继续仍沿同一准入/reservation；普通 open/reopen/attach 一律不委托启动。

`getManagedSnapshot()` 读缓存不可变对象，只有 Space records/runtime/layout 投影变化才替换并 revision++；subscribe 只通知变化且退订幂等，dispose 清理订阅。B 用 `useSyncExternalStore` 订阅服务缓存，在本地按已选稳定 Space ID 过滤；不得在 getSnapshot 每次新建数组，或另建 Zustand authoritative managed store。get/list 是同步只读，不获取 helper、扫描历史或启动任何进程；找不到 Session 或 spaceId 不匹配返回 undefined/空列表且不猜目标。

attach 先核验稳定目标与 expectedRuntimeId；指定旧代次则 STALE_RUNTIME、零原生副作用。当前 pending 返回 pending，不另启也不挂一个稍后自动抢焦点的 continuation。存在 TerminalSession 时复用同 runtime/PID/headless，去重显示引用；无 runtime 返回 not-running，普通打开只显示已恢复/未运行信息。已有终端关闭路径与 Browser 下载确认分别保留语义；真正 stop 继续明确入口，T-04 实现其严格结果。

## 4. A 内部必须固定的顺序和后续票接缝

1. `await spaces.prepareSession(...)` 返回 verified record 后，在**同一同步段**调用 `TerminalSessions.reserveManaged({spaceId,sessionId,...}) → ManagedRuntimeRef` 并发布 launch-pending，再允许 provider 权限/CLI/account/helper/env/hook 的任何 await。reserve 校验当前同 Session 没有未结算/活动代次，重复继续返回明确冲突或已有代次，绝不覆盖 map 后再 spawn。持久 commit 所需 await 不属于“禁止的启动准备 await”。
2. 底层 `TerminalSessions.create` 接收这个 reservation（不是再随机生成第二 runtimeId）；其 create 结算/失败更新同 entry。TerminalSession 尚未构造、nativeSid 尚未分配时也可查 pending；任何准备失败/GUI 权限取消，已保存记录与失败/取消尝试仍可核对，不能删了伪装 effect:none；用户拒绝首次确认标 cancelled，不伪装成运行失败。
3. entry 保留 `reserved/preparing/spawn-sent/adopted` 内部 stage、结算 promise、captured lease/generation+sid。helper/environment/hook/最后 beforeSpawn 都不占 SpaceService 磁盘 permit；beforeSpawn 仍在 native spawn 紧邻边界运行，随后重验 disposed/expectedRuntime。native sid 不能脱离 captured lease/generation 独立路由。
4. Rust 可能先 exit 后 spawned：adopt 将 pid/port 绑定与 connection 状态转换分开，只在准确 reservation 仍可采纳时 connected；已有 exit/lost/failure 不被晚到 reply 复活。null/null exit 保留未知证据，投影 disconnected+confirmed:false，不显示 code0 或成功结束；T-04 后续扩严格 outcome 不需要重建 owner。
5. foreground 提交时捕获显示意图，用户主动 activate/selectSpace/close/焦点转移使其失效（包括外部 leaf/window 的新焦点，不能只比较相同 Tab ID）。晚到成功若意图失效，保留在原 Space 的无 Pane后台，不调用 selectSpace/attach/open/focus。新建菜单自身退出/权限 modal 关闭的受控焦点恢复不能误判成用户换目标。后台从始至终零显示副作用；明确后续 attach/focus 可定位原 Space，归属永远不迁移。
6. close Tab/Pane 仅移除布局引用/renderer订阅；不调用 sessions.remove/end、model.dispose，不取消 pending 启动。模块 dispose 则同步关门且保留该次 captured lease/sid/promise 直到迟到 spawn 被回收；不能把“关视图不杀运行”套到模块关闭。input/Hook/output/exit/adopt/read/subscribe 均捕获或核验 runtime generation，旧事件只作用原代。
7. 保留 receive→headless parse callback→captured ACK，ACK/协议 reply 与新用户输入门禁分离；port 可在 spawn reply 前提供解析/ACK，connected adoption 不作为 ACK 开关。保留可 await 的 parse barrier，T-05 可在同代对象追加 readScreen/subscribeScreen 的 sequence/cursor/geometry。stop-requested 只关新输入，不能提前丢 output/exit/ACK；detach 不 dispose model。T-03 不提前实现分页/完整 screen 协议、stop/archive 或 resize 仲裁。
8. 六 Provider 原 catalog/resolveCli/launchArgs/accountArgs/accountEnv/Hook 链及 env 覆盖顺序复用；保留系统空 accountId 与托管账号差异、Codex 参数/`--`、Pi transcript locator等原行为。账号冻结到 SessionRecord；HUHU_SESSION_ID 目前是 runtimeId，不无声改成稳定 Session ID。Manual/YOLO 意图及首次确认不变化；T-14 的旧业务适配继续消费本接缝，不创建“无 Space 业务运行”例外。

当前 T-02 队列化 updateLayout 是所需入口形状，但 select/background append 的交错失败仍须原 owner 修正并给新 Evidence。T-03 不用陈旧完整 layout save 覆盖新 append，也不自行另写 bridge“补偿”前序缺陷。这是当前实际实施门槛，常规 DTO/owner 选择无需再问用户。

## 5. 创建结果、错误与 A 独占 en/zh 键

- created/completed：已确认完成本次启动接纳，不代表 Provider 任务成功；合法 early exit 返回真实 phase/exit，不能强设 connected。后台结果无 Pane 也成功。
- cancelled/none：Space 选择前取消，没有 record/runtime/process。cancelled/partial：已 commit/reserve 后用户拒绝原首次确认，仅持久/尝试效果，零 spawn；Session 可查。不是 WAIT_CANCELLED（后者留给机器等待取消）。
- failed/none：参数/绑定在写入前拒绝，或能证明记录写入未发生，绝不 spawn。failed/partial：record 已提交，明确未发 spawn 的程序/账号/权限/helper准备失败。保存/回读失败若底层写入可能已发生也必须 partial/unknown，不能因 prepareSession 未返回就宣称磁盘零效果；仍零 runtime reserve/零 spawn，按 SpaceService 恢复证据处理。failed/unknown 还覆盖 spawn 已发送后失去结果；保留已知 Session/runtime，禁止自动重启。机器断线/取消等待不得直接转发为 create 的 abort/end，不重发有副作用请求（T-07 封装）。

| code / 有限 reason | UI 键 / 后续动作 |
|---|---|
| INVALID_ARGUMENT / invalid-name、invalid-request | managed.invalidInput；修正参数 |
| TARGET_REQUIRED、TARGET_AMBIGUOUS、TARGET_NOT_FOUND / missing-space、SCOPE_MISMATCH、OWNER_CONFLICT、DIRECTORY_NOT_AUTHORIZED、PERSISTENCE_FAILED | 复用已有 spaces.error.required/ambiguous/missing/scope/owner/directory/save；原 code/details 保留，不合并成“启动失败” |
| TARGET_NOT_FOUND / missing-session；STALE_RUNTIME / runtime-changed | managed.targetMissing / staleRuntime；刷新明确目标 |
| CAPABILITY_UNAVAILABLE / provider-disabled、unsupported-platform；MODULE_INACTIVE / module-off | managed.unavailable / moduleInactive；配置/打开入口，诊断不自动激活 |
| SOURCE_UNAVAILABLE / program-missing、account-unavailable | managed.programMissing / accountUnavailable；配置程序/账号 |
| AGENT_BLOCKED / permission-confirmation-required | managed.permissionRequired；交互确认，非交互不弹框 |
| CONNECTION_UNAVAILABLE / helper-unavailable、prepare-failed | managed.unavailable；已知没 spawn 才可显式重试 |
| EFFECT_UNKNOWN / spawn-result-lost、exit-unconfirmed | managed.effectUnknown；先查询原 Session/runtime |
| 其他确定的启动拒绝 | 使用上述稳定顶层 code+有限 reason，managed.launchFailed；不暴露 env/凭据/原始异常全集 |

所有新键前缀固定 `agent.managed.`，A 独占 i18n.ts，B 只消费；ManagedErrorKey 是下表错误键（从 invalidInput 起）及上表复用 Space 错误键的精确联合。提示只有在准确事实匹配时显示，closeViewHint 仅用于仍活动 runtime。

| suffix | en | zh |
|---|---|---|
| name | Name (optional) | 名称（可选） |
| backgroundChoice | Start in background | 在后台启动 |
| starting | Starting… | 启动中… |
| connected | Connected | 已连接 |
| failed | Start failed | 启动失败 |
| cancelled | Start cancelled | 启动已取消 |
| disconnected | Disconnected | 已断开 |
| exited | Exited | 已退出 |
| background | Background | 后台 |
| detached | View closed | 视图已关闭 |
| restored | Restored record · not running | 已恢复记录 · 未运行 |
| open | Open terminal | 打开终端 |
| closeView | Close view | 关闭视图 |
| closeViewHint | The process keeps running. Reopen it from the session list. | 进程会继续运行，可从会话列表重新打开。 |
| notRunning | No active terminal. Start or continue explicitly. | 当前没有活动终端，请明确启动或继续。 |
| invalidInput | Enter a valid name and launch configuration. | 请输入有效名称与启动配置。 |
| permissionRequired | Confirm permissions before starting this agent. | 启动此智能体前需要确认权限。 |
| programMissing | The configured program is unavailable. | 配置的程序不可用。 |
| accountUnavailable | The selected account is unavailable. Review its settings. | 所选账号不可用，请检查账号设置。 |
| unavailable | This terminal capability is unavailable. Review its settings. | 当前终端能力不可用，请检查相关设置。 |
| moduleInactive | Open HUHU before starting this terminal. | 请先打开 HUHU，再启动此终端。 |
| targetMissing | This session no longer exists. Refresh the session list. | 此会话已不存在，请刷新会话列表。 |
| staleRuntime | The terminal changed. Refresh and select it again. | 终端运行已变化，请刷新后重新选择。 |
| effectUnknown | Startup may have occurred. Check this session before starting again. | 启动可能已经发生，请先核对此会话，再决定是否重新启动。 |
| launchFailed | The terminal could not start. Review its configuration. | 终端未能启动，请检查启动配置。 |

继续复用 common.cancel/confirm、原 Agent 名、workspace.newTerminal、agent.yoloTitle/yoloDescription；close-view 不得复用表示终止进程的 agent.workspace.closeConfirm/agent.endConfirm。此清单不要求改写现有明确 stop 文案。

## 6. A/B 派单及精确新增路径

A 唯一写 core/workspace/managed-runtime.ts、services/terminal/**、services/launch/**、WorkspaceService/Controller、相关既有测试、i18n.ts、用户说明；先冻结本合同与真正可调用的方法再让 B 接入。B 唯一写 ui/create/**、AgentSidebar.tsx/其 DOM 测试、TerminalTabView.tsx/其 DOM 测试；只读消费 service snapshot，不动服务/core/i18n。Root 保留生成物、正式证据/票据及串行整体验收。并行仅是同 T-03 的不重叠写集，不越过 T-02 依赖。

确需拟新增的精确文件仅两项（均已在当前 T-03 写集覆盖）：

1. `src/modules/agent/core/workspace/managed-runtime.ts`：上述纯 DTO/结果/错误类型。
2. `src/modules/agent/services/controller-managed-runtimes.test.ts`：controller 实际装配链、strict/background 不 open/focus、早期失败身份及模块关闭晚到清理。

其余可扩现有 workspace-service[-spaces].test.ts、terminal/sessions-space.test.ts、sessions-cancellation.test.ts、session.test.ts、launch/launcher-space.test.ts 以及现存两个 DOM 测试。

Root 的补充调用图已纳入：controller.start 当前经 launchHost.start（主要旧 resume）使用，GUI managed agent 是 captureLaunchHost→sessions.create；AutomationRuntime 的直接 create 属 T-14 完整迁入。本票将新 managed/GUI 及触及的旧交互 Controller.start/resume 最小闭合到明确 Space 和早期 reservation，不把最低层 create 强改成迫使 prompt-runner/automation 同票迁移的全局必填合同，也不改旧原生全文结果/去重/取消语义。直接 create 的过渡接缝不是永久无 Space 业务例外；最终仍由 T-14 强制所有旧业务绑定。无因此新增的 controller 外必需路径。**没有新增必需的票外路径**；不新增 managed-runtimes.ts manager、不改 SpaceService/records、workspace-store、NativeHost/shared wire、Rust 或账号平台实现。若前序 bridge 修复需要这些文件，由 T-02 原 owner/Root 处理，不纳入 B 的实现。

解锁后最小自动化接缝：保存失败零spawn；deferred provider/helper/env/Hook时 pending 已可查；同Session并发零重复spawn；GUI后台仍首次确认而无Pane/焦点；严格入口缺绑定/首次权限拒绝不弹框；用户更换焦点后迟到成功不抢回；detach继续输出/ACK、attach同对象/代次/PID且spawn计数不变；ordinary restored open零spawn；exit先于spawned不复活；null/null不成功0；dispose晚spawn仍captured cleanup；六Provider账号/argv fixtures保持。这里只列后续可验收接缝，未运行，真实 E2E 仍由用户验收。

## 7. 本轮实际读取输入摘要

以下 SHA256 取自本轮报告写入时的只读回读；正文源位置是当前文件行号，不是未来提交行号。T-02 可变源后续失效时重读，不把表中 hash 伪装成 Root 新冻结输入。

| 输入 | SHA256 |
|---|---|
| `src/modules/agent/services/spaces/space-service.ts` | `b16669c6a563d0f49c361e298246f7f9dea4d124994913fb0846a2ad10c72a91` |
| `src/modules/agent/services/spaces/records.ts` | `1f6ac211a8ba2933532acb1fe70e124297e2f975952bc6c12f75a46fd1c795b3` |
| `src/modules/agent/services/spaces/messages.ts` | `bc1fe43f7f31b0c89a946e224d110d12fd45d71d4471eb915a2dfd573fd48c83` |
| `src/modules/agent/services/workspace-service.ts` | `cea0352bb080394344b99bd946f208ba9d96f900f5ac7946117670b21e85d8fa` |
| `src/modules/agent/services/terminal/sessions.ts` | `94069dfd409b84eb96314d0fa827e9fcf01e3a6a0e9ea2c913c4cc0f1f61d323` |
| `src/modules/agent/services/terminal/session.ts` | `483203afdcb172c92e934bd2db6c95ef180fdc703f1e53eea4a9f9da2277072b` |
| `src/modules/agent/services/controller.ts` | `4aaeae21fe5c032d4df4944fd7c6e3502d09a01fda0be453374a83d7c9c48336` |
| `src/modules/agent/services/launch/launcher.ts` | `70ec678f407c442f7bdfd1f7f586b5c2541e8f40c0c7dc9c65c5de11f1b38dc3` |
| `src/modules/agent/core/workspace/model.ts` | `a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a` |
| `src/modules/agent/core/space/errors.ts` | `8159653372f3b24851644c4933b3a251584ae75faddd670bb385c9d78898062e` |
| `src/modules/agent/ui/create/Omnibox.tsx` | `9a070017f6272694033f120c0750cdb2b844205cd2fccd9ca7aa5483f5be99b2` |
| `src/modules/agent/ui/create/SpaceEmptyState.tsx` | `9734d3964a4f718301cf9d9cefb35d18ed30c51444c10a96bc0a4ee134fac388` |
| `src/modules/agent/ui/create/space-errors.ts` | `9ca2dbb4c37e03decfd5d9c0d474238be743fa5dc80e0f52cb7763a26d06784c` |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | `29e6842a70efca313e8e5ca5f19682f464c20b062bb88e43700d964ee33b5a3a` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `5a6e005dd77ff978f0daf1ba49742d10ab0ace4e4e31a85b18d2ffa4434ed53f` |
| `src/modules/agent/i18n.ts` | `8525a772108fa99bdb8e641f55db55512602ef19764e0d1b49ea7c6c87a89259` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md` | `dbdf0c05167acb300d004dd09df771184a46c2b735eda9b89fb32a8ee90e1ca1` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md` | `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md` | `f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-preflight.md` | `e0138470c3eceb80841cc61da75b60dbcab91288aec8bd38759cbe3067a1c65b` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05-preflight.md` | `c43e6573160d2e0c7dbaadc0e1d91216a92ccdd8c88a109fa0cc0cb2e0876acd` |
| `/tmp/huhu-t03-dispatch-ready.md` | `cdf4c86f54e1fd1120f841bc4361cc3fe5cdbac8e748d1daca4a4d5770744f11` |

本提案复用前次 reference-notes 已核验的 owner/runtime/attach 机制及许可证据，本次仅收敛既有类型与生产接线，无新陌生机制/依赖/外部代码，不重复外部研究，也不复制参考代码。
