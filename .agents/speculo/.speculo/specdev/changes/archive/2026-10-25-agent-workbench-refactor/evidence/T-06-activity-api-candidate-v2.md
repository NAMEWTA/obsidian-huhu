# T-06 活动 API 候选 v2（只读收口）

仅 `/tmp` 候选，GP019/Map20 不变。T-05 全源、target 和正式合同保持 STOPPED；T-06 未解锁，没有 API freeze、编译、测试、Provider/Chrome/helper 运行或产品验收。本稿替代 v1 中的候选语义，不覆写 v1；来源 SHA/字节/UTC 与末次漂移检查见配套 JSON。沿用 Root 已接受的 Session 唯一 owner、C 五答及 signal/异步 close 方向，数值均为正式准入前工程建议。

职责不变：TerminalSession 拥有唯一 activitySequence、来源事实、当前完成/seen；TerminalSessions 拥有 runtime 与 captured native lease/SID；AutomationHooks 原 owner 生产并验证 Hook 证据；WorkspaceService 投影/精确定位；SpaceService 单 queue 保存一条有限提示；B 只消费和上报真实呈现。无新运行 manager、活动数据库、通用审批或 T08 prompt 实现。

## 1. 相对 v1 的精确语义差异

1. RuntimeHooksRequest 增 `signal?:AbortSignal`；PreparedRuntimeHooks.close 改 `Promise<void>`。撤销 binding/回调发生于首个 await 前，Promise 表示真实自有 scope 清理；同 owner 收集晚结果，不再把 void/fire-and-forget 当清理完成。
2. lifetime 的 `instance` 收窄为 `registration`，只表示 Pi/OpenCode 一次 initializer 注册闭包。四 command 固定 unproven，无 sourceSequence；旧格式不借 initialProvider/事件名推断 Provider。unproven 可展示 lastFact，不能成为当前完成/可信 blocking/安全 prompt。
3. 新 snapshot 明列有限 `sources`；`source` 只是聚合判断。多个尚未撤销的可竞争 registration 无法可靠择一时 source-mismatch/unknown；最后一个事件不能覆盖为“当前来源”。lastFact 归自己的 binding，保留可追溯身份。
4. observation 的 blocking 使用配对 blockId；clear 必须匹配同 binding/epoch/registration 的实际未闭合 block，并通过 adapter 语义白名单。普通 state/Stop/TTL/seen 不清 block。增加显式 `completion:'turn-finished'`；枚举 done/idle 本身不制造完成提示。
5. T06 promptEvidence.foreground 固定 unknown，不留 producer 正面赋值入口；capability.foreground 也固定 unknown。installed、resolveCli、当前 Hook、quiet output、DOM focus 均不能改变它。T08 必须另补实际前台证据和 Linux 正向路径，不能以所有拒绝完成协作验收。
6. 8KiB 明确为**整个活动摘要 JSON 的编码后 UTF-8 字节**；所有字符串子上限改按 UTF-8，aggregate 优先。拒绝超额身份而非截断接受。与 C 固定槽/有限读/去重 fence 分工见第 5 节。
7. 新增持久提示背压：一个真实在途写、每目标一份合并待写提示、整体 dirty 目标/观察者有限。completion/seen 不逐事件入 queue/积攒 Promise；已开始写不可取消、晚结果和 writer 隔离仍按 T04。
8. v1 launch 图中“Session 在所有 env/helper await 前已存在”不作为事实：当前生产是 managed reserve/pending 先发布，实际 Session 后创建；在 Session 存在前 activityDetail 缺省/unknown，不另造计数器。新的 Hook producer 必须在 Session 创建/绑定后才接入。
9. T06 只承接 DESIGN PAGE003 的原生终端人工处理/准确能力提示子合同；保留 PAGE003 绑定，完整右侧 prompt/wait/control 宿主仍属 T08/T09，不扩大到 AgentWorkspacePage/workspace-view/ui-control。

其余 v1 的稳定三元身份、atomic join、捕获 N 的 seen、精确 split 定位、每调用方前景意图及无自动输入保持。

## 2. 可落入现有类型环境的候选

建议仍在 `src/modules/agent/core/workspace/managed-runtime.ts` 声明；AgentId、AgentState、ManagedRuntimeRef/Target/Failure/AttachResult/Snapshot 已在该文件环境存在。以下是完整结构草案，未编译、未跨 owner 冻结。纯类型不导入 platform/services/Node。

```ts
export interface ActivityMark {
  readonly runtimeId: string;
  readonly activitySequence: number;
}
export type ActivityReason =
  | 'not-observed' | 'disabled' | 'unsupported' | 'legacy-unattributed'
  | 'hook-error' | 'source-mismatch' | 'program-changed' | 'expired'
  | 'capacity' | 'invalid-observation' | 'sequence-gap'
  | 'stop-requested' | 'runtime-ended' | 'transport-lost' | 'closed';
export type ActivitySupport = 'observed' | 'unknown' | 'unavailable';
export type ActivityBlockReason = 'permission' | 'question' | 'login' | 'other';
export type ActivityBlocking =
  | Readonly<{ state: 'blocked'; reason: ActivityBlockReason }>
  | Readonly<{ state: 'clear' }>
  | Readonly<{ state: 'unknown' }>;
export type ActivityBlockingObservation =
  | Readonly<{ state: 'blocked'; reason: ActivityBlockReason; blockId: string }>
  | Readonly<{ state: 'clear'; blockId: string }>;
export interface ActivitySourceMeta {
  readonly provider: AgentId;
  readonly kind: 'native-hook';
  readonly adapterRevision: string;
  readonly observedVersion?: string;
  readonly lifetime:
    | Readonly<{ kind: 'registration'; sourceInstance: string }>
    | Readonly<{ kind: 'unproven' }>;
}
export interface ActivityFact {
  readonly state: AgentState;
  readonly observedAt: number;
  readonly eventAt?: number;
  readonly event: string;
  readonly blocking: ActivityBlocking;
}
export interface ActivityCapabilities {
  readonly activity: ActivitySupport;
  readonly blocking: ActivitySupport;
  readonly foreground: 'unknown';
}
export interface ActivitySourceSnapshot {
  readonly bindingId: string;                 // opaque host id, never token/path
  readonly programEpoch: string;              // host generation, never PID/nativeSessionId
  readonly meta: ActivitySourceMeta;
  readonly health: 'current' | 'unknown' | 'unavailable';
  readonly reason?: ActivityReason;
  readonly capabilities: ActivityCapabilities;
  readonly lastFact?: ActivityFact;
}
export interface ActivityCompletion extends ActivityMark {
  readonly observedAt: number;
}
export interface ActivityCompletionHint extends ActivityCompletion {
  readonly seenThrough: number;
}
export interface RuntimeActivitySnapshot {
  readonly at: ActivityMark;
  readonly revision: number;                  // includes seen-only changes
  readonly state: AgentState;
  readonly observedAt: number;
  readonly source: Readonly<{
    health: 'current' | 'unknown' | 'unavailable';
    reason?: ActivityReason;
    bindingId?: string;                      // only unambiguous eligible source
    capabilities: ActivityCapabilities;
  }>;
  readonly sources: readonly ActivitySourceSnapshot[]; // bounded, not a history log
  readonly lastFact?: ActivityFact;            // only attributable single-source display
  readonly blocking: ActivityBlocking;
  readonly promptEvidence: Readonly<{ foreground: 'unknown'; inputReady: boolean }>;
  readonly completion?: ActivityCompletion;
  readonly seenThrough: number;
  readonly unreadCompletion: boolean;
}
export interface ActivityObservation {
  readonly deliveryId: string;
  readonly sourceSequence?: number;
  readonly event: string;
  readonly eventAt?: number;
  readonly state?: AgentState;
  readonly blocking?: ActivityBlockingObservation;
  readonly completion?: 'turn-finished';
  readonly capabilities?: Readonly<{
    activity?: ActivitySupport;
    blocking?: ActivitySupport;
  }>;
  readonly title?: string;
  readonly resume?: Readonly<{ nativeSessionId?: string; transcriptPath?: string }>;
}
export type ActivityAdoption =
  | Readonly<{ status: 'accepted' | 'duplicate'; at: ActivityMark }>
  | Readonly<{ status: 'rejected'; reason: ActivityReason }>;
export interface ActivitySourceBinding {
  readonly bindingId: string;
  readonly programEpoch: string;
  active(): boolean;
  observe(value: ActivityObservation): ActivityAdoption;
  invalidate(reason: ActivityReason): void;
  close(): void;                              // synchronous evidence revocation only
}
export interface RuntimeActivityBinding {
  readonly runtimeId: string;
  active(): boolean;
  bindSource(meta: ActivitySourceMeta): ActivitySourceBinding | undefined;
  invalidate(reason: ActivityReason): void;
  close(): void;                              // revokes children synchronously
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
  bindActivityRuntime(): RuntimeActivityBinding; // internal orchestration, same owner
  invalidateActivity(reason: ActivityReason): void;
  markActivitySeen(at: ActivityMark): ActivitySeenUpdate;
}
export interface RuntimeHooksRequest {
  readonly target: ManagedRuntimeRef;
  readonly initialProvider?: AgentId;          // launch candidate, not evidence
  readonly env: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}
export interface PreparedRuntimeHooks {
  readonly env: Readonly<Record<string, string>>;
  close(): Promise<void>;
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

字段补充仍只有：ManagedRuntimeSummary.activityDetail、ManagedSessionSummary.completionHint、SessionRecord.completionHint，均可选。summary/activity 继续 AgentState 联合，旧记录缺字段合法。Session 的旧 Activity/setActivity/status 接口保留；内部交同一 reducer，旧枚举/输出不能晋升成新 lifetime/foreground/完成证据。`kind:'legacy'` 不再是能 bind 的新 producer：旧无归属格式仅走兼容事实/legacy-unattributed 诊断。不要从 initialProvider 给旧格式补新身份。

sources 数组只保留有限来源槽的最后事实/状态；无每事件历史。聚合 lastFact 只用于明确标注“最近观察”的展示，不是当前性；多来源时 B 从各项显示出处，聚合不选择最后事件。epoch/sourceInstance/bindingId 从不持久化为重开权限。

## 3. Lifetime、blocking 与 completion 的采纳门

| producer | 可归属范围 | T06 可采纳内容 | 禁止推断 |
|---|---|---|---|
| Claude/Codex/Gemini/Grok command | 已审定新 adapter 固定 provider；同 scope，不掌握同一程序寿命 | unproven lastFact、来源未知诊断；原完整答案仍走既有自动化合同 | eventAt/hrtime/PID/ppid/nativeSessionId 变 instance；旧 Stop 成当前 completion；state=running/Stop 清 block |
| Pi extension | 一次 initializer 的 UUID/单调序号；显式注册，已实现 session_shutdown 可新增 close 通知 | 该 registration 内有序事实；pending/settled 和实际 UI prompt 配对 | 注册等于进程/前台寿命；重载/同 nativeSessionId 视为同一注册；session_shutdown 合成虚构 Stop |
| OpenCode plugin | 一次 initializer 的 UUID/单调序号；root 会话与 registration 分开 | 同注册 root 事实，真实完成答案；permission/question subtype 保留 | 多 root/重载挑最新；静默证明 shutdown；目前不存在的 answer/clear 外部 API |

采纳顺序固定：current Session/runtime → captured binding/epoch 未撤销 → 有限字段 → delivery/sequence fence → adapter 语义 → lifecycle/竞争优先级 → 原子发布。C 不生成 activitySequence；A 不重读文件或维护另一份 C 去重集合。

- `health:current` 只表示该注册来源的近期有效事实，**不是 OS 当前前台**。四 command 即使新 provider 可归属，health 仍 unknown/lifetime-unproven；其 Stop/AfterAgent 的 completion 标志应不产生，A 也防御性拒绝此标志。保留 lastFact，completion 不变，不增加“当前完成”未读点。
- 同一 runtime 中两个未确认结束的注册来源、不同 root/重载或无法排除旧来源，聚合立即 source-mismatch/unknown。可保留分别健康的 source facts，但聚合不得完成/解阻或授予 prompt。只有真实 close/已验证失效撤销竞争项，不能因另一项更新、到期或“较新”默默换主；若无法证明来源唯一性则持续 unknown。关闭旧 binding 不影响新 binding。
- completion 仅在唯一、未撤销、允许该事件语义的 registration 上接受显式 turn-finished，且无 unresolved blocking/序号缺口/HookError。它表示观察到一轮结束，**不表示任务成功、进程结束、已批准或可输入**。native exit0 不生成 Agent completion。StopFailure/取消保留失败/中断事实，不能把它写成成功提示。
- blocking.clear 必须在**同 bindingId/programEpoch/sourceInstance**，匹配当前未闭合的 blockId；C 保留真实事件类别，A 核 allowlist。Pi 只有实际 ui_prompt_start/end 配对可候选 clear，未知类别为 other；不可用映射后的泛 PreToolUse 代替。OpenCode 当前只报 permission/question 的 block，不捏造 clear。四 command 不具 registration 配对，不能给出可信 clear。
- 一个 source 同时出现多个无法配对的 outstanding prompt，当前 blocking 降 unknown，不无限保留 block Map。建议只保存一个匹配 blockId；新未匹配 start 不覆盖旧门然后允许 end 错清。blockId 是匹配标识，不是权限批准凭据。
- running/idle/Stop、seen、TTL、quiet 和 inputReady 均不能 clear。失效把有效 blocking 置 unknown，lastFact 保留原 blocked 原因供人工定位；绝不变 clear。unproven 最近 PermissionRequest 也应显示“曾观察/当前性未知”，不是确认当前审批。
- native stop-requested、root notice、transport-lost、close 高于 Hook，立即撤销当前证据；晚回调只拒绝，不复活输入/来源。T04/T05 output→parse→captured reply/ACK→最后 exit 继续，不等屏幕 barrier 才作活动失效。
- 建议 freshness 上限 30s 只用于**降级**，不宣称每 30s 必有 heartbeat，不将静默变完成。新证据可更新自己的事实，但已撤销 lifetime、全 scope capacity fence 或竞争未知不能靠新 delivery 自动洗白。版本未知保持缺省；adapterRevision 不是 Provider 版本。

## 4. 唯一 sequence、atomic join、launch/close

Session 初始 sequence=0；每个新接纳事实（即便同一 state）和有实际有效状态变化的失效递增，重复/旧 source 不递增。revision 可另含 seen-only 更新；contentSequence/日期/ManagedSnapshot.revision 均不是 activitySequence。安全整数到上限时 fail closed/capacity，不回绕。sources/lastFact/snapshot 不可变，缓存对象只有 revision 变化才更换。

observeActivity 在一个同步段注册 listener 并返回当时 snapshot；不 await，也不重复同步调用 listener 当 initial。之后通知按 revision，重入最多保留一份最新 snapshot，不堆每事件队列；dispose 后不回调，单 listener 异常隔离/移除，不破坏 native ACK 或其他 listener。上限先准入，不能注册后再数。T08 将来 join 后先读 snapshot，seen-only 不满足“新 activity”；本轮不实现 wait/prompt。

```text
SpaceService verified admission/attempt marker
 → TerminalSessions 同步 reserve/publish launch-pending（保持 T03/T04 门）
 → 原 helper/environment 受原关闭门约束；尚无 Session 时无 activity 计数
 → 创建唯一 TerminalSession → bindActivityRuntime（一次）
 → 同 AutomationHooks.prepareRuntimeHooks({capt获 triple, env, signal}, binding)
     Shell statusHooks 只准备 scope/env，不被动安装六家、不改 HOME/account/argv
     Agent 沿原显式账号与 Manual/YOLO 路径；initialProvider 只是安装/启动候选
 → C 每个 await/插 slot/读后回调重验 signal、slot 对象、owner 与 binding.active
 → beforeSpawn 前后原 runtime/Space/quiesce 两侧闸 → 原 captured native spawn
 → C observe → Session reducer/sequence → Sessions → Workspace cached projection → B
```

signal 只取消未完成 prepare 的接纳/观察，不声称撤销已开始的文件写/全局安装。prepare 晚返回必须同步撤 evidence，再 await 清理自己的 scope；不能挂到新 runtime。Prepared.close 首个 await 前移除 slot/撤 binding，随后同一 Promise 等待真实自有文件/回调收束；重入返回同 Promise，失败准确传播。同 AutomationHooks owner 持有 legacy void wrapper 发起的 cleanup Promise，dispose/drain 收集；不重启共享 helper/Browser，不删除其他 Vault 的全局配置。实际已开始安装仍由原安装 owner 收束。

现 Controller 和 AgentRuntime 各有 AutomationHooks 实例；C 的资源池必须共享，而不是每实例复制上限；scope 总数包含 preparing/live/closing 和未清完 orphan。各实例只关自己的 scope，公共池的 token/文件所有权不进入 A DTO。scope/token/root 不因 UI 查询或列表构造而创建。

## 5. 摘要、spool、去重的有限接缝

C 只读建议在本轮由单一通用槽修订为 small/large 两 lane，避免正常 Start/Prompt/Tool 突发击穿旧候选。最终只读 profile `/tmp/huhu-t06-hook-resource-profile.md` 已全文回读，SHA256 `f3f61cea0acba0ed9ab60e76775ce93452efcde04511b94ced032769fabe576e`；正式 packet 尚未冻结。以下 N/G/E 等是**拟新增 enforce 要求，不是当前代码已达成**。当前 post/poll 的无总预留、readdir/sort/readFile/unlink 行为仍是已读源码事实，未运行容量实验。

| 项 | 候选数值/含义 |
|---|---|
| Hook scopes | 共享资源池最多 32 个 preparing/live/closing scopes；独立实施，不借 native 32 PTY cap |
| small lane | 每 scope N=8、池总 G=128；单 envelope≤64KiB；承接常见状态/metadata事件 |
| large lane | 每 scope N=2、池总 G=4；E=16MiB+64KiB；保留原2MiB native answer，最坏JSON六倍转义仍可容纳 |
| stdin collectors | 池总 C=4，各≤16MiB；采集前原子取得collector，每scope最多一个有限等待ingress ticket；等待不积累stdin |
| reader | 单reader，每轮最多 small16+large1，有限公平scope轮转；积压立即下一task续读，300ms只作空闲唤醒；实际同一打开文件限读该lane E+1 |
| unproven delivery IDs | 每 scope D=4096、最多 32×4096=131072；ID 有界；不 LRU 遗忘后继续当新事件；真序号来源不逐事件永久记UUID |
| registered sequence | 同 registration 正安全整数 high-water；最多 8 个待重排摘要×8KiB/source，缺口/窗口溢出 unknown |
| A source-lifetime 槽 | 每 Session≤8（含已关闭 fence，不为清表复用身份）；超限拒新来源/unknown，直到真实 runtime binding 收束 |
| A listeners | 每 Session≤32；同步订阅初始及最多一份 pending 通知，不为每 delivery 保留一个 Promise |

publisher 必须用固定池/槽的 atomic exclusive create；collector、ingress ticket、lane slot 所有权分账，不能读完任意stdin后才抢额度，也不能 readdir-count 后大家一起分配。`.pending`、unlink 失败 tombstone、closing scope 都仍占槽；不按 PID/mtime 窃取。每 scope 的 constant fault/overflow marker 和池元数据也有固定容量：候选全pool固定元数据≤256KiB、scope≤2KiB、publication claim/reference各≤512B、fault≤512B/scope、ingress ticket≤256B、collector claim≤512B；写入前准入。满池/无法验证归属准确拒绝，不借生成新 scope/instance 清表。若 fault marker 本身写失败，不能许诺立即 visible；现有可信度必须有有限 freshness 降级，不能继续称 current。

**8KiB 活动摘要**是 ActivitySourceMeta/host 元数据与一次 ActivityObservation 的完整 allowlist JSON 编码总额，包含字段名、JSON escaping 和身份字段；不是只数 title/data，不含完整原生答案。建议逐字段 UTF-8 上限：provider/instance/adapterRevision/observedVersion≤128B；deliveryId/bindingId/programEpoch/blockId≤256B；event≤128B；title≤512B；nativeSessionId≤1024B；transcriptPath≤4096B。总额仍≤8192B。provider 同时必须是 AgentId 枚举，instance/delivery ID 可进一步按实际 UUID 格式校验；不能因上限较大接受任意对象/数组/非有限数。

编码前先验证固定 key 数、字段类型/逐字段 UTF-16 扫描上界，再用有界 UTF-8/JSON escaping 计数计算确切总额，只有≤8KiB 才分配摘要 JSON；不得先 JSON.stringify 任意 Provider 对象再量。原完整 payload 一次有界读/解析后由 C 分路，Activity 不再复制 answer/prompt/tool/env。任一身份/恢复字段超限拒**整活动摘要**、降 unknown/capacity，不截断身份后采纳；合法旧完整答案按原通道处理，不把摘要拒绝变成成功 Stop。

**delivery 与 sourceSequence 是两种 fence：**C 在回调前登记同一 physical publication 为 consumed；unlink/callback 失败不能再次分发原答案/摘要。固定槽 tombstone 保留到删除确认，重试次数有界。unproven command 用 bounded deliveryId 记录；D 到上限即活动 source fail closed，不接受后续新 Stop，也不清 LRU。registered source 用真实 sequence high-water 加有限 reorder，不为每条永久保存 UUID；旧序号拒绝，有限窗口按序交付；缺口不能用 eventAt 排序补齐。

A 不复制 C 的 4096-ID Set；C 已建立 identity/reorder fence，A 仍在自己的 8 个来源槽保存 sourceSequence high-water/current block/close fence，拒旧 binding，并只对 C 已消费的 typed observation 计数。A 对未证明有序的 command 不自行生成 sequence。摘要失败不能触发第二次 legacy callback。

D 满后不能宣称全局 UUID exactly-once 仍可无限成立：活动 fail closed；旧完整答案若仍接收新的 physical publication，C 必须保留固定 slot/consume fence 和原 AgentRuntime receipt/since/subagent/cancel 校验，不能因活动重试重触发旧答案。如果实际实现无法保留该原合同，准确返回原答案通道容量/来源错误，不静默丢弃或无 fence 重放。这里是 C 实施必须验证的边界，不新增一个答案 manager。

数值界只覆盖本合同的保留逻辑对象/文件额度。仅槽payload上界为 small128×64KiB=8MiB，加large4×(16MiB+64KiB)=64.25MiB，共72.25MiB；collector4×16MiB另64MiB，不能重复把它当同一份槽内存而漏账。reader lane E+1、bounded decode/JSON、publisher编码临时副本/已消费tombstone及元数据仍须C profile分项保守计量，不能把72.25MiB叫全部峰值。它不等于 V8 RSS、磁盘物理块或整个插件内存的绝对证明。旧未升级 publisher 不可宣称受新槽/编码上限约束；当前性必须 unknown，不主动删除真实用户目录来制造容量通过。

## 6. completion/seen 的有限持久化与慢 writer

一条 CompletionHint 仅包含 runtimeId、正安全整数 activitySequence、有限 observedAt、0≤seenThrough≤completionSequence。不是运行权威、批准/任务数据库或 mailbox ack；重开只显示历史提示，零 helper/Provider/spawn/旧 PID kill。四 command 的历史 Stop 不能新建 current hint。旧记录无字段合法，validator 严格 allowlist。

- markSeen 必须捕获 N；活动到 N+1 后只推进 throughN，不能读最新再全清。同 runtime seen 单调 max，completion 单调；不同 runtime 的 sequence 绝不比较。
- 写前在原 SpaceService queue 重读 exact current attempt/hint tuple；旧 runtime/旧 source 回调不能覆盖新 attempt/title/native refs；seenN 不能用旧整行覆盖 completionN+1。若新 runtime 已取代，旧提示可以保留为历史，但不能按旧 callback 替换新提示。
- B 只在目标 pane 的权威屏幕初始安装完成、真实可见且所属 doc/leaf 当前时上报**该次 render 捕获的 N**。点击、attach resolved、screen applied、清 tab.unread 均不自动 seen；也不证明 OS foreground。readonly 占位只能标已展示的原 hint tuple，不 mint Session。

**新增有限写策略（仍属 SpaceService，同 owner）：**

1. 自动 completion/seen 更新不每事件调用 queue.run。建议只有一个实际在途 hint 写；最多 32 个 dirty-target 槽，每 target 一份最新合并值（含稳定 target/runtime tuple、completion/seen 水位、该目标最新有限失败状态）。同 runtime 合并 completion/seen 单调最大；换 runtime 按已接纳 attempt 身份替换，不比序号大小。不排每次事件的副本、closures 或 Promise。
2. 在途写捕获自己的 immutable intent，后续变更只合并到该目标一个 pending intent，不修改在途对象。真实 settlement 后才择下一份；已完成 intent 未覆盖最新水位就再发一个合并写。全局 queue 同时仍可容纳原 Space/布局操作，但此通道最多贡献一个已提交 hint 写，不把 32 个 dirty 项一次全 enqueue。
3. markSeen 调用者观察者总数建议≤32；同目标重复请求复用现有 intent，只有有界 waiter 记录。超限先准确返回容量失败/persisted=false，不建立新 Promise 链。caller timeout/abort 移除其 waiter，不取消实际写，不释放 writer，也不丢 pending/失败。内存 seen 已变化与 persisted=false 必须如实返回，不能声称回滚。
4. dirty-target 满时不驱逐旧未持久意图或 LRU 清失败；新目标的当前 Session 仍可保留自己的常数级 completion/seen 事实，但本次 durability admission 准确失败/capacity、persisted=false，展示可见。不要声称已保存。受控显式后续重试才重新接纳，不重放输入/原答案。最多每目标一份 failure/dirty 状态，不留每次失败历史。
5. 成功只满足其实际覆盖的 tuple/水位；晚 resolve/reject 对应原 intent，不能清另一 runtime/更高水位的 pending 或错误。错误有限聚合并保留原 cause；调用者观察已超时仍收集真实结果。若真实 IO 挂起，dirty 槽/writer 继续隔离，而不是为了有界观察提前让另一实例写。
6. 关闭先同步关新动作/撤 sources，仍接收最后 native/cleanup/checkpoint 意图；completion/seen 调度停止接纳后 strict-drain 真实在途及有限 pending。原 T04 15s caller 观察封套不取消 disk：超时准确 reject，owner 继续持有真实 queue/lease与晚结果，直到真实 settlement/strict-drain 才允许 release。不得清 maps 丢最后 notice，不在 writer 关闭后偷偷晚写。

可证伪用例（本轮未运行）：挂起一个 hint write，连续一万次 completion/seen 后只一个 in-flight+一份同目标 pending、≤32 waiter；N/N+1 与跨 runtime late success/reject 不回退；dirty32后第33目标拒绝、不驱逐前32；abort/timeout 后晚成功可查、晚失败准确收集；关闭等待仍推进 native cleanup，但 writer 不先释放；源关闭后无新 completion 自动延长 drain。

## 7. B 精确定位、呈现 API 和范围

B 仍沿已有 getManagedSnapshot/subscribeManaged，不读 C spool，不新 store。待处理从全 Vault sessions 投影，包含 background/detached/跨 Space/已附加但 split 未聚焦；不搬用当前 Space+排除 attached 的旧过滤。launch-pending、曾观察 blocked/当前 unknown、failed/interrupted 和合格未读完成分别表达；无来源能力不能称可审批。

```ts
const target = { spaceId: row.spaceId, sessionId: row.sessionId };
const runtimeId = row.runtime.runtimeId;
const mark = row.runtime.activityDetail?.at; // capture N for presentation, never target inference
await workspace.attachManaged(target, { expectedRuntimeId: runtimeId, focus: true });
// pending/not-running/failed: show exact result; never auto fallback/restart/recapture intent.
// Actual presented view later submits its captured mark via markManagedSeen.
```

A 在 attach 入口复制 target/options，并在任何 attaching Map 等待前捕获**本调用者** intent/revision。合并只共享 ensure exact runtime pane 的 Promise，不能共享含 select/show/focus 的整份结果；key 含 runtime 代次。focus:false 不 select/open/focus，也不能继承另一 focus:true 的结果。跨 Space flush/select 每次 await 后核原 intent/expected runtime/关闭门，失效不重捕获。

当前生产 existing-pane 分支只 activate(tab)，同 tab split 可能仍指旧 focusedSessionId；最小修复是在最终有效同步段调用 focusSession(exact runtime)，确认 tab.focusedSessionId 与 Sessions.focus 都为捕获目标。不 query textarea、不在 Hook 回调聚焦，不因 pending 注册自动迟到跳转。`focused:true` 只说明提交了精确布局焦点，不是用户已读/OS前台。

T06 不新增完整控制宿主，也不修改 AgentWorkspacePage/workspace-view/ui-control。B 可在原 Sidebar/TerminalTabView/TerminalView 中接 ready/presented seen；对 blocked 用户只“查看原终端”人工操作。应验证同一原终端中的允许/拒绝后，以真实 adapter 证据变 clear/仍 blocked/unknown，零自动按键、零新运行。真实 Provider 人工允许/拒绝及平台版本仍由用户 E2E；受控证据/DOM 不冒充真实认证。

## 8. 精确准入路径与顺序

本稿不授予写入。相对 v1 不新增 manager/native/T08 路径；正式 ticket/packet 由 Root 在 T05 审查后统一定。

- **A**：`src/modules/agent/core/workspace/managed-runtime.ts`；`services/terminal/{session.ts,session.test.ts,status.ts,status.test.ts(新增),sessions.ts,sessions-activity.test.ts(新增)}`；`services/{workspace-service.ts,workspace-service-activity.test.ts(新增),workspace-service-spaces.test.ts,controller.ts,controller-activity.test.ts(新增)}`；`services/spaces/{records.ts,records.test.ts,space-service.ts,space-service.test.ts}`；`i18n.ts`、`docs/agent-workbench.md`。foreground-intent.ts/已有 DOM 测试仅实际必要时精确补。AgentRuntime 若仅原 wrapper 继续可不用改；若 async close 的实际关闭收集确需改它，先向 Root 报 `services/agent-runtime.ts` 和相邻 dispose 测试闭包，不能静默越界或丢原 receipt。
- **C**：`platform/desktop/hooks/{automation-hooks,native-extensions,event-payload,spool-guard,system-hooks}.ts` 和其既有精确 tests（含 remove-status-hooks.test.ts）；`platform/desktop/agents/{accounts.ts,accounts.test.ts}` 的独立系统 runtime 根提取。C 最终 profile 另提出纯内部 `platform/desktop/hooks/hook-spool.ts` 与 `hook-spool.test.ts` 两条精确新增路径，统一生成脚本/limits/reader，仍属同 owner、非新服务；须 Root 正式纳入后才可写。`hook-entries/settings-write` 仅实际必要再报告。C 独占原生答案/publisher/reader/全局安装迁移及共享 resource pool；不生成 A sequence/seen。
- **B**：`ui/sidebar/{AgentSidebar.tsx,AgentSidebar.dom.test.tsx}`；`ui/terminal/{TerminalTabView.tsx,TerminalTabView.dom.test.tsx,terminal-view.ts,terminal-screen-xterm.dom.test.tsx}` 的真实呈现/seen 接缝。无需改屏幕协议/renderer 算法/几何 owner；无 AgentWorkspacePage/workspace-view/ui-control。

以上省略前缀均为 `src/modules/agent/`。Root 可先准入纯 DTO/Session public API，再 C producer 接线及 A reducer/持久写闭包，最后 B UI；跨 owner 实际源码/签名由 Root 核 SHA 后冻结。此稿不是该 freeze。

## 9. 必需验证与剩余决定

准入后必须以真实组合反例验证，当前均未运行：

1. 四 command 旧 Stop 晚到只 lastFact，无 completion/unread/clear；旧格式不从 initialProvider 升格。新相同 state delivery 有新 sequence；同 delivery/旧 sourceSequence 不新增；D满无遗忘重接。
2. Pi registration 重载/close/Prompt pair 与 OpenCode 多 root 并存；一方关闭不能误关另一方；未配对 end、第二 outstanding block、generic PreToolUse/Stop/seen/TTL 均不 clear。
3. prepare 的每个实际 await、插 slot、读后回调与 close/abort/quiesce 交错：无晚 spawn/晚事件，实际 cleanup Promise idempotent且被收集；两 AutomationHooks 实例总容量仍一个池。
4. 小 N/G/E/D 的真实 publisher/reader：collector先准入、有限ingress等待、small/large正常突发与跨scope公平、pending崩溃占槽、读同一文件E+1、unlink/callback失败不重复答案/摘要、overflow marker失败的 freshness降级；中文/转义答案保持2MiB原合同，摘要8KiB/身份边界拒绝不截断。不得改真实账号/用户配置作测试。
5. atomic join/重入/observer cap；native root/stop/lost 优先但原 reply/ACK/drain仍完成；activity/content/seen 三水位互不替代。持久背压与慢writer用第6节负例。
6. 生产 Workspace+Space+Sessions：split精准B、跨Space/background/并发不同focus、deferred flush/select期间用户改焦点；零spawn/输入fallback。B ready/visible/doc/pane检查与 renderN→N+1竞态，原TUI人工处理证据准确反映允许/拒绝/unknown。

**剩余 Root 产品决定：无。**Root 已明确 T06 foreground=unknown、PAGE003 子范围和 T08 正向依赖。仍待正式准入时核验的工程项是 C profile 的实际共享池与 full-answer 去重边界、实际 TS 接口编译、fixture 和上述红绿；它们不是用户问题，也不授权当前写源。字段/数值可在正式 packet 前以同 owner 的可证实现收敛，不能把未验证建议叫已支持。

T08 不在此实施：至少 Linux 生产真实 prompt 正向（准确目标、queue/written）与换组/换实例/blocked/旧来源负例；OS查询与写非原子，written不等于Agent消费。Windows未证明前保持unknown/unavailable；不能以resolveCli/安装/DOMfocus补证。完成 T06 不宣称已完成T08跨平台协作。

READ-ONLY SOURCE STOPPED。仅本 v2 与配套 source-observation JSON 为本轮输出，v1、仓库、正式工件、target、依赖和 helper 副本均未写入。
