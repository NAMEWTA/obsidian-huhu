# T-06 活动 API 候选与生产调用时序

本轮仅 `/tmp` 契约准备；T-05 产品源码继续 STOPPED，T-06 未解锁。基于已由 Root 核读的 A state proposal、C hooks proposal、B UI readonly，以及当前 Session/managed DTO/attach/records 接缝。以下不是实际 API freeze，也不是实施或验收结果；没有运行 tsc、测试、helper、Provider 或构建。类型块是可落入现有 TS 类型环境的完整草案，语法/依赖静态核对不冒称编译通过。

推荐边界保持：**Session 唯一拥有 activitySequence、活动事实、来源绑定和当前 seen；TerminalSessions 拥有 runtime/lease-SID 权威；SpaceService 单 queue 只存有限完成提示；WorkspaceService 缓存投影和定位；C 只生产证据；B 只呈现/导航/上报 seen。**不创建新 manager、活动数据库、审批 API 或普通 prompt 用例。

## 1. 可直接评审的纯类型候选

建议追加到现有 `src/modules/agent/core/workspace/managed-runtime.ts`。该文件已定义/导入 `AgentId`、`AgentState`、`ManagedRuntimeRef`、`ManagedSessionTarget`、`ManagedFailure`、`ManagedAttachResult`、`ManagedSnapshot`；下方其余名字均在本块声明。具体名称仍待 Root/C/B 准入协商，不让本报告变成跨 owner 协议。

```ts
export interface ActivityMark {
  readonly runtimeId: string;
  readonly activitySequence: number;
}
export type ActivityReason =
  | 'not-observed' | 'disabled' | 'unsupported' | 'legacy-unattributed'
  | 'hook-error' | 'source-mismatch' | 'program-changed' | 'expired'
  | 'capacity' | 'stop-requested' | 'runtime-ended' | 'transport-lost' | 'closed';
export type ActivitySupport = 'observed' | 'unknown' | 'unavailable';
export type ActivityBlocking =
  | Readonly<{ state: 'blocked'; reason: 'permission' | 'question' | 'login' | 'other' }>
  | Readonly<{ state: 'clear' }>
  | Readonly<{ state: 'unknown' }>;
export interface ActivitySourceMeta {
  readonly provider: AgentId;
  readonly kind: 'native-hook' | 'foreground-process' | 'screen' | 'legacy';
  readonly adapterRevision: string;
  readonly observedVersion?: string;
  readonly lifetime:
    | Readonly<{ kind: 'instance'; sourceInstance: string }>
    | Readonly<{ kind: 'unproven' }>;
}
export interface ActivitySourceSnapshot {
  readonly health: 'current' | 'unknown' | 'unavailable';
  readonly reason?: ActivityReason;
  readonly meta?: ActivitySourceMeta;
  readonly bindingId?: string;             // opaque host id; never token/path
  readonly programEpoch?: string;          // host generation; not PID/nativeSessionId
  readonly capabilities: Readonly<{
    activity: ActivitySupport;
    blocking: ActivitySupport;
    foreground: ActivitySupport;
  }>;
}
export interface ActivityFact {
  readonly state: AgentState;
  readonly observedAt: number;             // local adoption clock
  readonly eventAt?: number;               // diagnostic source clock only
  readonly event?: string;
  readonly blocking: ActivityBlocking;
}
export interface ActivityCompletion extends ActivityMark {
  readonly observedAt: number;
}
export interface ActivityCompletionHint extends ActivityCompletion {
  readonly seenThrough: number;            // durable clamp: <= completion sequence
}
export interface RuntimeActivitySnapshot {
  readonly at: ActivityMark;
  readonly revision: number;               // includes seen-only changes
  readonly state: AgentState;
  readonly observedAt: number;             // adoption/invalidation time, unchanged by seen
  readonly source: ActivitySourceSnapshot;
  readonly lastFact?: ActivityFact;
  readonly blocking: ActivityBlocking;
  readonly promptEvidence: Readonly<{
    foreground: 'confirmed' | 'changed' | 'unknown';
    inputReady: boolean;                   // parser/transport evidence, not permission
  }>;
  readonly completion?: ActivityCompletion;
  readonly seenThrough: number;
  readonly unreadCompletion: boolean;
}
export interface ActivityObservation {
  readonly deliveryId: string;
  readonly sourceSequence?: number;        // only a real source's monotonic sequence
  readonly event: string;
  readonly eventAt?: number;
  readonly state?: AgentState;
  readonly blocking?: ActivityBlocking;    // omission does NOT clear an old block
  readonly capabilities?: Readonly<{
    activity?: ActivitySupport;
    blocking?: ActivitySupport;
    foreground?: ActivitySupport;
  }>;
  readonly foreground?: 'confirmed' | 'changed' | 'unknown';
  readonly title?: string;
  readonly resume?: Readonly<{ nativeSessionId?: string; transcriptPath?: string }>;
}
export type ActivityAdoption =
  | Readonly<{ status: 'accepted'; at: ActivityMark }>
  | Readonly<{ status: 'duplicate'; at: ActivityMark }>
  | Readonly<{ status: 'rejected'; reason: ActivityReason }>;
export interface ActivitySourceBinding {
  readonly bindingId: string;
  readonly programEpoch: string;
  active(): boolean;
  observe(observation: ActivityObservation): ActivityAdoption;
  invalidate(reason: ActivityReason): void;
  close(): void;
}
export interface RuntimeActivityBinding {
  readonly runtimeId: string;
  active(): boolean;
  bindSource(meta: ActivitySourceMeta): ActivitySourceBinding | undefined;
  invalidate(reason: ActivityReason): void;
  close(): void;
}
export interface ActivityJoin {
  readonly snapshot: RuntimeActivitySnapshot;
  dispose(): void;
}
export type ActivitySeenUpdate =
  | Readonly<{ status: 'updated' | 'unchanged'; at: ActivityMark; seenThrough: number }>
  | Readonly<{ status: 'rejected'; reason: 'stale-runtime' | 'invalid-mark' }>;
export interface SessionActivityPort {
  getActivitySnapshot(): RuntimeActivitySnapshot;
  observeActivity(changed: (value: RuntimeActivitySnapshot) => void): ActivityJoin;
  bindActivityRuntime(): RuntimeActivityBinding;  // internal orchestration only
  invalidateActivity(reason: ActivityReason): void;
  markActivitySeen(at: ActivityMark): ActivitySeenUpdate;
}
export interface RuntimeHooksRequest {
  readonly target: ManagedRuntimeRef;
  readonly initialProvider?: AgentId;       // launch candidate, NOT discovered capability
  readonly env: Readonly<Record<string, string>>;
}
export interface PreparedRuntimeHooks {
  readonly env: Readonly<Record<string, string>>;
  close(): void;
}
export interface RuntimeHooksPort {
  prepareRuntimeHooks(
    request: RuntimeHooksRequest,
    binding: RuntimeActivityBinding,
  ): Promise<PreparedRuntimeHooks>;
}
export interface ManagedSeenRequest {
  readonly target: ManagedRuntimeRef;
  readonly at: ActivityMark;
  readonly view: Readonly<{ tabId: string; paneSessionId: string }>;
}
export interface ManagedSeenOptions {
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}
export type ManagedSeenResult =
  | Readonly<{
      status: 'updated' | 'unchanged'; target: ManagedRuntimeRef; at: ActivityMark;
      seenThrough: number; mode: 'runtime' | 'restored-hint'; persisted: true;
    }>
  | Readonly<{
      status: 'rejected'; target: ManagedRuntimeRef; persisted: false;
      reason: 'stale-runtime' | 'invalid-mark' | 'not-presented' | 'missing-record';
    }>
  | Readonly<{
      status: 'failed'; target: ManagedRuntimeRef; at: ActivityMark;
      seenThrough?: number; persisted: false; effect: 'none' | 'partial' | 'unknown';
      error: ManagedFailure;
    }>;
export interface ManagedActivityClient {
  getManagedSnapshot(): ManagedSnapshot;
  subscribeManaged(changed: () => void): () => void;
  attachManaged(
    target: ManagedSessionTarget,
    options: Readonly<{ expectedRuntimeId: string; focus: boolean; groupId?: string }>,
  ): Promise<ManagedAttachResult>;
  markManagedSeen(request: ManagedSeenRequest, options?: ManagedSeenOptions): Promise<ManagedSeenResult>;
}
```

接入只需三处字段补充，不重命名现字段：

- `ManagedRuntimeSummary.activityDetail?: RuntimeActivitySnapshot`；`activity: AgentState` 保持原类型，统一从新 snapshot 的有效 state/blocked 优先级投影，不维护另一份可写状态。
- `ManagedSessionSummary.completionHint?: ActivityCompletionHint`：允许后台/无当前 runtime 的提示可查；与 activityDetail 同 tuple 时以当前内存 seen 为准，避免落盘延迟让已查看提示回弹。
- `SessionRecord.completionHint?: ActivityCompletionHint`：可选、有限的一条提示。加载旧记录缺省为无提示，不猜已完成或已看过，不新增运行身份。纯 DTO 由同一处导入，不在 records 抄第二份字段。

`SessionActivityPort`/`RuntimeHooksPort` 是建议结构接口，不产生第二 owner 实例。实际可将方法直接加到现有 Session/TerminalHost，Controller 注入同一个 AutomationHooks 的 prepareRuntimeHooks。C 原 `prepare(agent,env,receive)` 和 NativeHookEvent 完整答案通道保留，不能为了此接口重写 prompt-runner/agent-runtime receipt。

## 2. 单序列、来源寿命与保守规则

1. **Session 唯一计数。**构造时 activitySequence=0、Agent 当前 unknown；TerminalSessions 的 reserve/pending 条目尚无 Session 时 `activityDetail` 缺省，不能替 Session 先造另一个活动计数器。Session 在 Hook/env await 前创建并绑定后，才从同一 owner 发布活动信息。PID adopt 不重置 sequence，也不复活已停止来源。
2. 同步接受一个新有效观察先验证 captured Session/current runtime/binding/programEpoch、检查 sourceSequence/deliveryId，再生成不可变 snapshot 并通知；同枚举的新 delivery 也递增。重复、旧 binding、旧 program source sequence 不递增。contentSequence、ManagedSnapshot.revision、时间戳、seen 不参与计数。
3. HookError/明确换程序/来源到期/stop/root exit/transport lost 使 source 降 unknown/unavailable，并在有效判断改变时推进 activitySequence；保留 lastFact 的原值/时间，当前 state 不是把它改成 idle。重复相同失效不无限造新活动。source 本身的新观测和生命周期通知不能被屏幕 parse barrier 延迟。
4. native stop/lost/root-exit 的 gate 高于所有 Hook。requestManagedStop 不能只依赖 Session.running；目前 running 在 stop-requested 时仍可能为 true。root notice 立即撤销活动可信度，却不终止 T04/T05 的 output→headless parse→captured reply/ACK→最后旧 exit。连接/清理/屏幕 completeness 仍是各自字段。
5. `meta.lifetime.instance` 只证明 C 实际掌握某来源实例，不等于 OS foreground。`programEpoch` 由 A 分配；C 不能根据 nativeSessionId、短命 Hook PID/ppid、事件时间、标题或 resolveCli 让它变成前台凭证。同 Shell 两来源并存而无法择定时 source-mismatch/unknown；不能“最后来事件的赢”。旧 source close 只撤销自己，不撤销后来来源。
6. `blocking` 缺省不清除旧 block；running/idle 枚举也不自动代表权限已批准。明确可信 adapter 事件才可提交 blocking.clear。失效时当前 blocking=unknown，保留 lastFact 中的旧权限/问题和查看入口；seen、TTL、quiet output 都不能放行。`waiting` 不统一称 permission。
7. ActivityObservation.foreground='confirmed' 目前只是候选类型的可表达值，**当前源没有可生产该正面证据的 OS 前台端口**。准入前必须由 C 给出具体机制/能力与时效，否则一律不产生此值；也不能只因 capabilities.foreground='observed' 自动置 confirmed。ordinary prompt T08 保守拒绝 unknown/blocked/代次变更，working 本身不自动拒绝。T06 不实现发送或自动审批。
8. 新交互摘要不含原生全文、prompt、工具输入或环境全集。title/resume 也只能在同一可信 binding 的该次事实内更新，旧 Stop 不覆盖新 attempt 的恢复引用。原 legacy setActivity 可继续服务原调用方，不能赋予新的 foreground/安全能力；既有 AgentState union/菜单消费者保持可工作。

资源候选：一个当前来源、一个 lastFact、一个 completion、常数级 sourceSequence fence；字符串/观察摘要/监听者/去重记录显式有上限。建议 A 默认摘要总 UTF-8≤8KiB、单 id≤256 chars、event≤128 chars、title≤200 chars、resume 每字段≤8192 chars，并在接受前合计校验（8KiB 与 resume 边界冲突时拒绝整观察，不能截断身份）；数字均有限/安全整数。旧完整答案上限仍按原合同独立。无界 C 文件积累、UUID 去重/过期后的重放防护具体机制仍须 C 确认；不能仅上 LRU 后宣称可靠，容量失效须降 unknown。不会因此保留一份无限活动日志。

## 3. 生产 launch/observe 时序

```text
SpaceService verified Session + pre-spawn attempt marker
  → TerminalSessions 同步 reserve(runtimeId)（T03/T04 原门）
  → create TerminalSession；bindActivityRuntime()（同一 runtime、sequence0）
  → Controller/TerminalHost 调同一个 AutomationHooks.prepareRuntimeHooks
      request.target = 捕获稳定 triple，initialProvider 仅启动候选
      Shell 只惰性 spool/env，不改 HOME/账号，不被动安装六家配置
      已有 Agent prepare 保留原明确账号/Manual/YOLO 规则
  → C 每个 await 后检查 binding.active；确认实际 adapter 来源后 bindSource(meta)
  → 返回 env/close；若此时 stop/dispose，close 自有资源，禁止晚 spawn
  → beforeSpawn 及两侧关闭门不变 → captured native spawn/adopt
  → C 有效 source.observe() → Session 同步采纳/sequence++ → cached snapshot
  → TerminalSessions 原 subscribe → WorkspaceService managed projection
  → B useSyncExternalStore 只消费该 projection，无 Hook 回调聚焦
```

启动前早到事件归该已创建 Session 的 binding，不因 PID 尚未 adopt 丢掉后再拿旧 idle 充当前状态。返回后的 hooks close 必须与 A binding close 组合；一次 close 幂等，prepare 晚完成也关闭自己的 spool，不接到新 runtime。模块关闭只撤销所属 scope；不重启共享 helper/Browser。

**原子观察：**observeActivity 同一同步段注册 listener 并返回固定初始 snapshot；该方法不 await、不同步调用 listener 充当第二次 initial。之后每次有效 revision 发布当前 immutable snapshot；dispose 后不再回调。T08 先 join 再判断初始条件，prompt 基线捕获在 submit 前，seen-only revision 不能满足“新 activity”门。B 仍用现有 getManagedSnapshot/subscribeManaged，两者缓存 snapshot 对象只在变化时替换。此处不承诺无限 replay；若需要历史状态匹配，应显式另定有限 ring/gap，不能暗中加入。

## 4. completion/seen：仅提示、有限保存与捕获 N 竞态

**持久合同建议固定一条最近提示，不保存热状态：**runtimeId、completion activitySequence、observedAt、seenThrough。它不是 task/turn、不是邮箱、不决定恢复/停止/输入许可。validator 精确允许字段，runtimeId 非空，sequence 为正安全整数，0≤seenThrough≤completion sequence；时间有限非负。新 runtime 从 0 计数，绝不与旧 runtime 的数值比较。无 token/PID/source instance/capability/foreground 持久化；重启当前活动 unknown/unavailable，旧提示只是历史提示，零 helper/Provider/spawn。

- native completion 事实 C5 使 Session.completion={R,5}；`seenThrough=0`，提示未读。native exit0 不凭空生成 Agent 完成事实。
- 某真实呈现采样 N=5，markSeen({R,5}) 时当前活动已到 N+1=6：仅推进 through5，不能读“当前 seq6”替换请求。若 completion6 已到，仍未读。重新提交同一 N 幂等。
- at.runtimeId 不等于 target.runtimeId、未来 sequence、错误 Space/业务 Session、旧 source 打到新 runtime 均拒绝；不从焦点/cwd/唯一候选补身份。旧标记不能触碰新 Session 实例。
- completion 到磁盘时只能在原 SpaceService queue 中对 exact current attempt checkpoint；同 runtime 较低 completion 不覆盖较高，seen 取同 runtime 的单调 max 并 clamp。已经保存的旧 runtime 提示可在新 attempt 启动后保留为“上一运行提示”；新 completion 可替换这一条，但不能比较不同 runtime 的 sequence 排序。
- seen 落盘需在队列中重读 **当前 hint tuple**；若已被另一 runtime/更高 completion 替换，不能用旧对象整行覆盖。seenN 对同 runtime 新 completion6 仍只推进 through5；对另一 runtime 的 hint 不做任何推进。无需保存活动历史列表。
- 保存失败不回滚已见事实或 native 状态；返回 persisted=false/准确 effect/error，保留脏提示供受控重试。查询不自动重发输入。timeout/abort 只取消该调用者对保存的观察，已接纳写仍由原 writer 隔离，晚成功/失败被收集；T04 strict-drain/写入失败门不许绕过。

**B 的 seen 时点明确为呈现，不是点击：**侧栏行从 immutable snapshot 捕获 triple+N，点击只调用 attachManaged。不能在 await 返回后 get latest N+1 并全清。实际 TerminalHost 的一次 render/呈现采样固定 mark N；仅在所属 doc/leaf 当前、目标 pane 可见且已完成权威屏幕初始安装后调用 markManagedSeen。T05 stream.applied 本身不证明用户看过；仍需这组真实显示条件。

这可由 B 在现 TerminalView 的 `TerminalPresentation.status('ready')` 接缝维护一个仅视图的 ready 标志/可选 presented 回调（当前 ready 只 showStatus），再由 TerminalTabView 以**已渲染的** mark ref 上报。隐藏/resync/dispose 撤销该资格；普通新的 activity render 可重新采样 N，而非异步 continuation 偷读最新 mark。callback 本身不设置焦点。这样不必新增全局 pendingSeen manager 或把 seen 塞进 layout 持久字段。呈现/DOM predicate 只证明显示条件，不能用于 PTY foreground。

对无当前 Session 的 restored-hint：只读占位实际展示该持久 completion tuple 后，可按同一个 markSeen API 更新这一条提示；view.paneSessionId 是实际布局占位引用，绝不可当 runtime authority。服务校验 pane 的稳定 Space/Session 元数据及当前 hint tuple；只改变提示，不创建 Session，不触发 restore/resume。若没有准确旧提示展示，则拒绝 not-presented，不猜旧运行。`mode:'restored-hint'` 明确此区别。

## 5. B 的 exact target/open API 与 split/每调用者 intent

最小沿用已有 attachManaged union，不加一个“处理审批”启动 API：

```ts
const ref = { spaceId: row.spaceId, sessionId: row.sessionId, runtimeId: row.runtime.runtimeId };
const at = row.runtime.activityDetail?.at; // capture, not a command target replacement
const result = await workspace.attachManaged(
  { spaceId: ref.spaceId, sessionId: ref.sessionId },
  { expectedRuntimeId: ref.runtimeId, focus: true },
);
// attached: normal layout/TerminalTabView presents exactly ref.runtimeId.
// pending/not-running/failed: show actual result; no auto-open-record/restart/new capture.
// seen is emitted by the presented view with its captured mark, NOT this continuation.
```

服务端最小顺序：

1. 最外层复制 target/options，检查并捕获 expected runtime；**进入 attaching Map 等待前**为本调用 capture ForegroundIntent/presentationRevision。focus:false 不持前景授权。
2. 合并的工作只 ensure exact runtime 的唯一 pane 引用；禁止共用包含选 Space/聚焦的“整份结果”。key 至少绑定捕获 runtime，旧代完成不能满足新代请求。ensure 本身不 select/show/activate，focus:false 保留现有 active tab/group。
3. 每调用者 await 后独立重验 expected runtime、关闭门、原 intent/revision；需要跨 Space 时沿既有 flush/select，并区分自己受控 select 与期间用户动作。失效不重抓 intent，只回结构化 display-intent-changed。
4. 在最后有效同步段对 captured runtime 调 `focusSession(runtimeId)`；当前 `attach` 已有分支只 activate(found.id)，必须改。核 active tab 与 tab.focusedSessionId 为目标，sessions.focused 也是目标。`focused:true` 表示该用例成功提交了精确布局焦点，不证明 OS foreground/人工已批准。
5. 通过现有 TerminalTabView→TerminalView focus/lease 链显示。用户后续换 tab/Space/leaf/window、close/split/restore 使旧异步结果不能回抢；无需 Sidebar query textarea 或 Controller 无条件 open。事件从不触发这条用例。若未来需要工作台外 GUI 显示，应另复用受控 show 桥；现 controller.show void 日志不能当结构化定位成功。
6. 已有 split A/B 初始 A 时选择 B，只改正确 pane 焦点，不能仅 activeTabId 相同就成功；无 Pane 的 B 只创建一个引用、复用原 runtime/headless/PID。pending 不注册自动迟到跳转。

**全 Vault 待处理投影**直接从现 `getManagedSnapshot().sessions` 派生；不使用 ManagedSessions 的 selected Space+排除已 attach 过滤。当前 Vault 内 background、detached、跨 Space、已附加但 split 未聚焦的项都要可定位，行携原 spaceId+sessionId+runtimeId 和来源/原因。launch-pending 与 permission/question 待处理分别显示，不把 pending 一律称审批；旧持久 completion hint 也不包装成活跃审批。读/订阅/列待处理零 acquire/安装/scan/spawn。CLI 默认查询范围仍由 T07/T08 的显式作用域合同拥有，不据这个 UI 全 Vault提示改变默认。

## 6. 精确实际路径补集与 owner

相对当前 T06 Ticket 建议 Root 准入前精确补齐，下列不是写授权：

| owner | 已有或拟新增精确路径 | 窄用途 |
|---|---|---|
| A | `src/modules/agent/core/workspace/managed-runtime.ts` | 上述纯类型/summary 补字段；旧 AgentState 合同保留 |
| A | `services/terminal/session.ts`、`session.test.ts`；已有 `status.ts`、拟新增 `status.test.ts` | 唯一序列、binding、snapshot/join、legacy 适配、seen、source/native 优先 |
| A | 已列 `services/terminal/sessions.ts`；拟新增 `services/terminal/sessions-activity.test.ts` | 注入 C runtime hooks、早 pending/stop/root/lost、无第二计数器 |
| A | `services/workspace-service.ts`；拟新增 `services/workspace-service-activity.test.ts`；已有 `workspace-service-spaces.test.ts` | 全 Vault 投影、唯一 pane/每调用者 intent、presented seen 验证 |
| A | 已列 `services/controller.ts`；拟新增 `services/controller-activity.test.ts` | 实际 C port 注入、HookError 与通知按新活动水位，而非枚举去重 |
| A | `services/spaces/records.ts`、`records.test.ts`、`space-service.ts`、`space-service.test.ts` | 单 queue 的一条 completionHint validator/checkpoint/seen merge；T04 strict drain 不变 |
| A | 已列 `i18n.ts`、`docs/agent-workbench.md` | 双语来源/失效/提示文案与准确边界；实际 keys 冻结后交 B |
| C | 已列 `platform/desktop/hooks/**`、必要 `detection/**`；补 `platform/desktop/agents/accounts.ts`、`accounts.test.ts` | 同 AutomationHooks runtime scope/来源 producer、Shell 独立 root；不改账号策略 |
| B | 已列 `ui/sidebar/AgentSidebar.tsx`、`AgentSidebar.dom.test.tsx`；补 `ui/terminal/TerminalTabView.tsx`、`TerminalTabView.dom.test.tsx`、`ui/terminal/terminal-view.ts`、`terminal-screen-xterm.dom.test.tsx` | 全 Vault pending 与 exact open、真实 ready/呈现 seen；不重写 renderer/几何算法 |

表中省略路径均以 `src/modules/agent/` 为根。`services/launch/foreground-intent.ts` 与已有 `.dom.test.tsx` 只在原接缝确需修时精确补，不先扩大；不需新 UI control host、WorkspaceUIContext store、native wire、shared frames、Rust或依赖。若 Root 明确分配完整右侧控制宿主，再另核 AgentWorkspacePage/workspace-view 准确路径，不能借本类型草案先实施 T08。

## 7. 准入后第一批可证伪用例与 C 待确认

**有意义红绿（本轮全未运行）：**

- source received→同 state 新 delivery 两次 vs 同 delivery 重复；unknown/legacy/unavailable 无假能力。stop-requested/root notice/lost 发生于 prepare/parse 等待中，迟到 Hook/title/resume 不复活，原 ACK/reply/最后 exit 仍完整。
- Shell A source→B source→迟到 A Stop；同 nativeSessionId 重启但不同 instance；无法区分时 unknown，不能最后事件赢。HookError 后 lastFact retained、blocking 不解除；explicit native unblock 才清。
- atomic join 初始 idle→在下一 task 的 running/idle；独立 wait 当前匹配，prompt 基线不认旧 idle；seen-only revision 不算新活动。observer dispose/上限/抛错不结束运行或阻 ACK。
- completion5 + seen5 正在保存→completion6；旧 seen late resolve/reject；跨 runtime hintN1 与新 runtime completionN2；恢复只有旧提示零 helper；损坏 hint/未知字段/未来 mark 拒绝。writer 挂起的观察 timeout 不取消真实已开始写、更不提前释放 owner。
- 真实 Workspace+Space+TerminalSessions 组合：同 tab split 选 B、后台 B、跨 Space focus:false、并发 focus:false/true 每调用独立、deferred flush/select 后新用户焦点/关闭目标、同 runtime 多 attach 仍一 spawn。断言精确 focusedSessionId、runtime/PID、结果而非仅 tab 激活。
- B 实际呈现：ready 但 hidden/doc 不当前不 seen；点击/attached 尚未 ready 不 seen；render N→effect/persist 前 N+1 不误清；readonly hint placeholder 不能 mint 活动 runtime。待处理事件始终不聚焦、不输入、不 ack 邮箱。
- 原账号 Manual/YOLO 首次确认、system hook用户同组命令/跨 Vault/旧格式移除、Pi settlement/OpenCode root/child、原 native 中文完整答案/receipt/取消保持。普通 prompt 最终 blocked/unknown 拒绝与不重放留 T08生产组合，不提前宣称通过。

**C 必须确认，未确认前不冻结：**

1. 六 adapter 哪些能显式携 Provider 归属、真实 sourceInstance/sourceSequence；command Hook 的旧格式如何准确识别/升级，同时保留用户命令与全局跨 Vault 幂等。nativeSessionId/at/ppid 不是替代品。
2. 可证明的 current activity/source lifetime 范围、明确切源/结束事件、source 并存和晚事件规则；哪些 `blocking.clear` 有真实语义。没有正面 foreground 机制就维持 unknown，不要求本票凭空加入 native 平台。
3. stable deliveryId、unlink/重读错误、spool 文件/bytes/每轮 batch/去重容量上限及失败降级；不能靠无限 Set 或遗忘 LRU 后继续接纳旧完成。sourceSequence 只有来自同实例真实单调序列才可排序。
4. prepareRuntimeHooks 的实际返回 env/close、Shell root 与 guard 字段、prepare/poll/close 晚 await 的所有权检查；不改 HOME/Provider account、不被动安装六家配置、不写真实账号做测试。
5. 交互有限摘要与旧 NativeHookEvent 完整原生答案如何共用一次读取而保留两条各自合同；C 不生成 activitySequence，不把 HookError 转 idle，不把已安装称 supported。

A 可独立确定 Session reducer/提示合并/定位测试的常规工程细节；上述 C producer 能证明什么必须以实际源/夹具冻结，不能在本候选里猜。真实 Provider允许/拒绝、版本差异与宿主 UI 仍由用户端到端验收。SOURCE STOPPED。
