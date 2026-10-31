# T-04 TS/native 最小运行接缝提案（只读，未冻结 API）

2026-10-25；GP-014 / Map15；workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，派单 base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。Root 已通知 T-03 第二轮两轴通过并 done；T-04 尚未获实现授权。本件仅供 Root 精确派单与 A/C/B 冻结合同，不修改 Spec，不表示实现、测试或平台验收通过。

输入是 T-04 `04-stop-and-recovery.md`、Spec §3.3/3.8/3.9 与 AC-027/028/029/056/058/060、实施合同 §3/4、当前 T-03 源，以及 `/tmp/huhu-t04-lead-refresh.md`、`/tmp/huhu-t04-native-design.md`。后两份是机制建议；其中“现有 exit/closed 或许足够”的旧建议不采用：当前两事件只证明根状态/连接丢失，无法证明受管范围 cleanup，必须有结构化新证据。

**建议只沿现有 owner 增量实现：TerminalSessions 仍是唯一运行 owner；SpaceService 仍是唯一持久队列；WorkspaceService 编排并投影；NativeHost 管捕获 generation/lease/sid，Rust 管真实进程与清理。** 不增加运行平台、业务数据库、daemon、cgroup、提权或独立任务队列。

## 1. 当前真实接缝与必须改变的顺序

- `services/terminal/sessions.ts`：`reserveManaged` 已在 verified commit 后同步发布 pending，运行绑定为 stable Session → runtime → 捕获 lease/route/sid；本票保留。`end` 仍 void，`remove` 会人工 `exit(-1)`，`dispose` 先清 model/route 再等 release，均不能充当“已收束”证明。
- `terminal/session.ts`：`adopt` 已不复活早 exit；`exit(null,null)` 已是 disconnected/未确认，不能退回成功0。user input、parser reply、parse ACK 现在分别有入口；停止只关闭 user input，不能通过提前改变 connection/销毁 headless 丢掉 output/reply/ACK。
- `spaces/space-service.ts`：所有 v2 写入和 recovery/readback 经单一 `mutate` permit 队列；`prepareSession` 的已提交记录没有 runtime attempt 标记，突发宿主死亡后无法区别“从未启动”和“曾开始但未知”。`records.ts` 严格 Session 字段白名单也尚无 archive/outcome。
- `workspace-store.ts` 的新 Space bridge `flush` 已严格 reject，不必重写 merge。它的 `dispose` 会在 finally 释放 Space writer；`controller.ts.dispose` 目前与 terminal dispose 并发并较早调用 workspace.dispose。因此需拆清 quiesce → stop/收集证据 → checkpoint → strict drain → release，不能等 writer 已关再保存结束/残留事实。
- `src/host/desktop/native/host.ts`：`owner.running.exited` 在根 exit、spawn rejection、generation failure 都会 resolve；`release` 等这个 promise或5s，并在 finally 移 owner。这是资源等待，不是全范围清理证明。
- `native session.rs`：根 wait + DRAIN 后删除 live；根先退可能留下另组/持 PTY 后代，后续 end 已找不到对象。Unix 当前 clone_killer 是根 SIGHUP，不是整个组 SIGKILL；Windows helper-wide Job 不能用于单 Session stop，且其 Win32 失败尚未检查。T-03 的 typed spawn rejection/none 证据必须原样保留。

## 2. 推荐冻结的公开 DTO/方法

身份仍为 `ManagedSessionTarget {spaceId,sessionId}`、`ManagedRuntimeRef {…target,runtimeId}`。请求 stop 必须有完整 runtimeId；不能在 await 后把“当前运行”替换进去，更不能按 PID/cwd/焦点猜目标。native sid/lease 不进入业务寻址。

建议在 shared/native 的纯类型中定义一次下列 `TerminationEvidence`，core DTO 仅 type-import 其安全证据部分；wire envelope 的 sid/requestId/sequence 留在 host 层。字段名在 A/C 开工前共同冻结：

```ts
type RootEvidence =
  | { state: 'running' | 'unknown'; code: null; signal: null }
  | { state: 'not-started'; code: null; signal: null }
  | { state: 'exited'; code: number | null; signal: string | null };
// exited 必须来自真实 wait/进程句柄确认。code/signal 都未知也不推导0；
// 旧 exit(null,null) 缺这种新证据，只能映射 unknown。
interface TerminationEvidence {
  root: RootEvidence;
  cleanup: {
    state: 'pending' | 'confirmed' | 'partial' | 'unknown';
    scope: 'not-started' | 'unix-session' | 'windows-job' | 'root-only';
    reason?: 'legacy-helper' | 'wait-failed' | 'scope-unverified'
      | 'residuals-present' | 'signal-failed' | 'deadline'
      | 'escaped-member' | 'transport-lost';
    remainingKnown: number | null; // 有界诊断计数；null不是0
  };
  output: 'drained' | 'truncated' | 'unknown';
}
interface ManagedStopState {
  requestId: string; requestedAt: number; force: boolean;
  phase: 'stop-requested' | 'settled';
  outcome?: 'confirmed' | 'partial' | 'unknown';
}
// 增量字段：ManagedRuntimeSummary.stop?、termination?；inputReady在stop后为false。
// 原phase仍描述实际连接/根状态，stop.phase单列，避免把仍可收output的连接先断开。
type StopResult = {
  target: ManagedRuntimeRef;
  status: 'stopped' | 'pending' | 'failed';
  effect: 'none' | 'partial' | 'completed' | 'unknown';
  termination: TerminationEvidence;
  persisted: boolean;
  error?: ManagedFailure;
};
type ArchiveScope = {kind:'session'; spaceId:string; sessionId:string}
  | {kind:'space'; spaceId:string};
interface ArchivePlan {
  scope: ArchiveScope;
  members: readonly {spaceId:string; sessionId:string; runtimeId?:string}[];
  fingerprint: string; // 目标成员/当前attempt代次，非全库revision、非授权凭据
}
interface ArchiveResult {
  scope: ArchiveScope; status:'archived'|'incomplete'|'failed';
  effect:'none'|'partial'|'completed'|'unknown';
  rows: readonly ArchiveRow[]; error?:ManagedFailure;
}
interface ArchiveRow {
  target: ManagedSessionTarget & {runtimeId?:string};
  status:'not-running'|'stopped'|'incomplete'|'failed';
  effect:'none'|'partial'|'completed'|'unknown';
  termination?:TerminationEvidence; persisted:boolean; error?:ManagedFailure;
}
```

唯一推荐方法集（WorkspaceService，UI/未来 CLI 同用）：

```ts
stopManaged(ref: ManagedRuntimeRef,
  options?: {force?:boolean; timeoutMs?:number; signal?:AbortSignal}): Promise<StopResult>;
waitManagedStop(ref: ManagedRuntimeRef,
  options?: {timeoutMs?:number; signal?:AbortSignal}): Promise<StopResult>;
previewArchive(scope: ArchiveScope): Promise<ArchivePlan>;
archiveManaged(plan: ArchivePlan,
  options?: {timeoutMs?:number; signal?:AbortSignal}): Promise<ArchiveResult>;
```

`stopManaged` 在第一个 await 前同步校验代次、关新用户输入、发布 stop-requested、标记本次 pending admission 不准再 spawn；并发请求复用 ManagedEntry 内同一 stop 状态/结果。显式 force 只升级该代次，普通 wait 不重复发信号。`waitManagedStop` 仅观察现有运行，绝不启动 helper/停止/重启。signal/timeout 只停止当前观察；stop 已发生则保留 partial/unknown 及 target，不撤销 kill、不重发、不自动换代次。`stopped` 只允许 root 已确认退出且 cleanup.confirmed，或能证明 not-started；`phase===exited`、根 code0、EOF、kill返回成功都不够。

保留现 `getManagedSnapshot/subscribeManaged`，B 不另造 stop registry。新增 error 顶层只用已有合同类别；ManagedErrorCode 需补 WAIT_TIMEOUT/WAIT_CANCELLED，archive集合变化用 STALE_RUNTIME/reason=archive-scope-changed。暂时归档闸用已列 SOURCE_UNAVAILABLE/reason=archive-in-progress（SpaceErrorCode 补该已存在公共类别），不是伪装磁盘坏/权限确认。i18n/key 与 nextAction 由 A 独占先冻结，B 只消费；建议 stopping、cleanupPartial/Unknown、waitTimeout/Cancelled、archiveChanged/Incomplete、restoredUnconfirmed、shutdownIncomplete，沿现 en/zh。

建议 snapshot 的 Session行另加 `archived:boolean`（含父Space归档）和 `restore?:{state:'ended'|'unconfirmed';canRequestContinue:boolean}`。`canRequestContinue`只表示允许请求现有显式继续用例，仍须重验目录/账号/能力，不授权直接spawn；active/pending/stop-requested、archive gate、已归档、unconfirmed/失联均false。旧v2无attempt不能凭Pane缺失推断从未运行，保守待核实，且不借本票补T15迁移。ArchiveRow允许runtimeId缺失，避免给从未运行的空记录发明runtime。B可先按以上字段核对消费缺口，只有A实际落源冻结后才接线。

## 3. 单 writer 的 pre-spawn checkpoint 与归档闸

**持久最小扩展：** `SessionRecord.archived?:boolean` 与单个 `lastAttempt?`；后者是 bounded恢复事实，不是 Run/任务历史：`{runtimeId, acceptedAt, state:'unconfirmed'|'not-started'|'settled', stopRequestedAt?, termination?}`。不要持久 native sid/endpoint，PID即使诊断也不能作为重开后 kill/attach 凭据。老 v2 缺这些可选字段仍有效；更新白名单/严格校验及黄金读回，不进行 T-15 旧格式 writer 迁移。

`prepareSession` 在同一 mutation/verified commit 中保存 Session 和新 attempt.runtimeId/unconfirmed，再返回 `SessionAdmission {record,runtimeId,cwd,beforeSpawn}`；TerminalSessions 在返回后的同一同步段 adopt 这个已提交 ID 并发布 pending，随后才 await Provider/permission/helper等。生成 UUID 是持久准入引用，不在 SpaceService 建运行对象或第二 manager。不得先覆写旧 unconfirmed attempt 再交 reserve 检查；队列内先拒绝尚未核实的旧代次。已确认 not-started 或 settled 的原 Session 才可接受下一显式 attempt。所有 T03 managed/旧交互 start/resume/split/restore 接线都采用该 marker。

这样 archive preview 即使撞上“commit已完成、调用者reserve continuation尚未执行”，也能看到精确在途 attempt；突发 Host/Obsidian 死亡时 disk 已有未确认事实。恢复读到 lastAttempt 只投影 inactive/已结束或待核实，绝不填入活的 managed.current、复用旧 SID、按旧PID杀进程、自动 helper/Provider/扫描或补发输入。普通 open/reopen仍零spawn；显式继续已结束记录产生新 runtime；未确认旧attempt返回准确未知，不提供本票未批准的“随便清除未知”旁路。

**归档序列（A独占 SpaceService queue）：**

1. `previewArchive` 在现有 queue 的短一致读取点冻结稳定 Session集合及 attempt.runtimeId；无 stop、无 helper、无归档标记/准入闸。GUI完成确认前取消是零归档副作用。它包含没有 Pane、launch-pending、已退出但清理尚未核实的记录。
2. 用户确认后 `archiveManaged(plan)` 在同一 queue 里获取仅该 Scope 的 transient admission gate，并比较冻结成员/代次。若新 Session/新 runtime 已出现，立即释放闸、返回 stale，零停止；B重新展示范围，不能把未见对象追加进旧确认。普通 exit/清理进展不必使确认因无害状态变化反复失效。
3. gate既作用 `prepareSession` 队列内准入，也作用已有 admission.beforeSpawn 的每个异步最终门。取闸后一个同步循环先关闭全部捕获运行的 input/未发送启动，再 await逐对象停止；尚未 reserve 的已提交 attempt也被标为取消。取消标记绑定 attempt，不因稍后释放scope闸而重新放行晚到准备结果。
4. 离开 mutation queue 等待真实 root/cleanup；别的 Space仍能保存/启动。stop-requested/最终证据用同队列逐对象 checkpoint，按 expected attempt ID 比较后 merge，旧回调不能覆盖新代次/归档记录。
5. 所有捕获对象都确认且 checkpoint/drain成功后，再短入 queue 重验集合/gate/代次并提交 archived。Space只提交父 archived 标记，历史/Session/布局引用不删除；Session归档只标目标。Space归档若正选中则清除显式选中ID，不猜另一个Space。未核实对象、持久失败、timeout或取消观察，返回 rows/incomplete，不写成功归档；已停止对象不会被“回滚成运行”。本次不自动部分归档子Session，也不做晚到自动归档 continuation；以后重新 preview/确认。
6. finally释放 transient gate；有意停止的 attempt仍输入关闭、启动取消/清理责任仍在原 owner。gate释放不是撤销 stop。重复 archive读取事实/明确重验，不能重复spawn或丢历史。

建议 SpaceService 内部短方法 `inspectArchive(scope)`、`acquireArchive(plan)`→`ArchivePermit`、`checkpointAttempt(ref,outcome)`、`commitArchive(permit)`；permit只关准入，不持有 activePermit/磁盘锁跨进程等待。Workspace不能直接写 records或自行整份 setState。新 Space archive字段已有；Session字段才需扩展。

## 4. TS↔Rust 唯一 wire 草案及 lease语义

建议保持 stdio protocol3 的兼容外壳，以 hello 可选 `capabilities.terminalTermination=1` 声明新能力。复用 end 控制帧，加可选 requestId；新增一个版本化事件，不让两方各自猜 exit 附加字段：

```json
{"type":"end","sid":9,"force":false,"requestId":"stop-uuid"}
{"type":"terminal-termination","version":1,"sid":9,"requestId":"stop-uuid",
 "sequence":2,
 "evidence":{"root":{"state":"exited","code":7,"signal":null},
 "cleanup":{"state":"confirmed","scope":"unix-session","remainingKnown":0},
 "output":"drained"}}
```

requestId对自然退出可缺；sequence是同native Session内单调序号，host回调始终捕获原 generation/lease/sid，业务再校验expected runtime。新spawn的 `spawned.pid` 继续表示用户程序，不可悄换成Windows bootstrap anchor。root“exited且code未知”可表示句柄已wait确认但结果读取失败；既有数字 SessionEvent 不因此制造exit0，旧 null/null无新证据仍unconfirmed/disconnected。

`NativeEvents.termination?`、`NativeConnection.terminalTermination?:1`、`requestStop?(sid,{requestId,force})` 为增量内部API；真实helper实现发送end及codec验证。旧helper不宣称支持时可走原end，root证据保留，cleanup=root-only/unknown，不能归档成功。T03结构化spawn rejection的none仍能证明not-started；没有field/未知field仍unknown，不解析错误文案。

建议C先实际冻结的精确TS接缝如下（均在现shared/native/host.ts，不新造protocol.ts）：

```ts
interface NativeTerminationNotice {
  version: 1;
  requestId?: string;
  sequence: number;
  evidence: TerminationEvidence;
}
// 与现有接口合并的增量：
interface NativeEvents {
  termination?(sid: number, notice: Readonly<NativeTerminationNotice>): void;
}
interface NativeConnection {
  readonly terminalTermination?: 1;
  requestStop?(sid: number, options: Readonly<{requestId:string; force:boolean}>): void;
}
// release仍Promise<void>；不完整时reject，错误携captured sid逐项证据：
class NativeReleaseError extends Error {
  constructor(readonly outcomes: readonly {sid:number; notice?:NativeTerminationNotice;
    reason:'timeout'|'disconnected'|'cleanup-incomplete'}[]) {
    super('Native terminal cleanup was not confirmed');
  }
}
```

A在原 `ensureHelper` 捕获回调中消费 `termination:(sid,notice)=>acceptTermination(capturedLease,sid,notice)`，只更新原route/ManagedEntry，再按expected current runtime投影/保存；旧对象仍保留自身cleanup责任，不能因不是current就误杀新对象或丢掉旧清理。A发请求始终取launch时捕获的lease/sid；字段不从当前全局helper重算。shared evidence类型C唯一写，A仅type-import及映射业务target，双方不各定义一套字段。

**拒绝/兼容规则须写成fixture断言：** 主hello `accepted!==true` 或 protocol!=3仍由现start握手拒绝并清理，不进入业务。相同protocol但cap缺失/版本不认识，`terminalTermination`不宣称为1，`requestStop`不得发送声称受支持的新请求；A若为停止/卸载采用legacy end，返回root-only/unknown，不能补造新证据或自动重启/升级helper。cap=1也不能凭numeric exit当cleanup capability：只有匹配sid/generation、有效version/sequence及字段的notice可推进cleanup。无cap的伪新事件、缺/坏evidence或未知version不使目标变成功；保留诊断并有限等待→unknown。单sid坏业务证据不主动杀共享helper/Browser；帧协议整体损坏仍沿原Host失联路径准确通知所有owner。

fixture还必须校验跨字段约束：root-only绝不能confirmed；confirmed只能是匹配平台的完整受管scope、remainingKnown=0、root已wait确认退出，或root/cleanup同时证明not-started。running/unknown root + confirmed cleanup、scope不符、负数/非整数计数均拒绝，不能仅检查字段类型就推进成功。output截断与进程收束独立，不据truncated/EOF推断清理范围为空。

**共同契约必须先交付一份** `test/fixtures/native/terminal-termination-v1.json`（拟新增，由C唯一写）。包含requested/root先退/confirmed/partial/knownescape/null-null/legacy无字段/坏字段/旧sequence/错误sid等正负例。Rust serde/stdio与TS helper/NativeHost各读取同一原件逐字段验证，Node纯类型和Rust字段命名一致；fixture SHA冻结后才能并行接线。不是引入T07全命令schema生成平台。

NativeHost继续保留 `release():Promise<void>` 兼容外形，但成功必须等待该 owner捕获目标的 root+cleanup确认；typed拒绝可携逐sid evidence。根exit、generation失败、5s定时器只结算观察/失败，不能resolve cleanup成功。关闭capability后旧输入拒绝，cleanup路由/晚spawn清理仍留至结算/预算；未确认时保存原对象清理责任，不靠删owner宣称没进程。单Session stop或Agent lease release不得Terminate helper-wide Job/kill helper、不得release Browser Cookie/history lease；只有所有owner释放的共享宿主退出路径才关整个helper。

native清理控制不能占stdin主读循环或Cookie线程；等待/ConPTY Close在独立路径进行，不持全局live/master锁阻塞force。TS不能在stop-requested就清route/model；继续receive→parse callback→captured ACK及协议reply，清理后还有parse barrier，最后才dispose。cleanup进程证据与output drained/truncated分列，不能用截断EOF当全树证明。命名预算沿现GRACE=2s/DRAIN=3s起步，单次总deadline与Host release等待由A/C统一固定（建议观察上限10s），请求重入不延长原deadline，force只跳过宽限；耗尽准确unknown/partial，非成功。

## 5. shutdown / strict drain /平台边界

Controller先置 stopped、阻断所有managed/旧低层新动作；取消未发送attempt与等待，但保留输出/退出处理。启动已捕获目标的有界停止，同时quiesce会再写布局/统计/历史等owner；先等stop结果，再经Space queue保存每对象结束或残留checkpoint，严格flush布局与records，然后才释放writer/native引用及模型。`workspace-store.dispose`需拆出“停止UI写/strict drain”和最终“释放Space writer”，不能当前一到dispose就把后续checkpoint门关掉；保留现merge，不重写T02。

成功路径严格 drain后release。若末次保存失败，旧verified pre-spawn unconfirmed marker仍可保守恢复；先终止/拒绝所有晚写并保留明确PERSISTENCE_FAILED/未完成报告，再做有界释放，不把finally释放当成功确认。不能丢完内存后报“已保存结束”。无verified marker的迁移旧路径不得伪造完整恢复证据；T14完整业务绑定仍归T14，本票仅保留其既有取消/全文/去重合同和原生停机最小适配。

| 平台/范围 | 可承诺的最小证据 | 必须保留的不完整分支 |
|---|---|---|
| Unix正常组及同OS Session的job-control另组 | 捕获原root/出生身份/TTY/SID；重验自有组后HUP/CONT，期限后真正SIGKILL；根wait与该受管范围观察/清理分别确认。根先退也不删除清理对象/跳过force。 | 枚举/身份失败、已知残留或观察到setsid逃逸为partial/unknown；不杀同用户任意进程。只对初始PGID/tcgetpgrp发信号不足以确认job-control范围。 |
| Windows | C建议的同helper受控bootstrap+私有gate、逐Session Job，payload在Job生效后才执行；根是实际payload，Job ActiveProcesses归零与root wait分别确认；检查所有Win32返回值。 | Assign裸payload存在抢跑窗口，不能当完整方案；bootstrap/gate/状态通道失败先收束本次对象，不回退裸spawn；单Session只操作自己Job，Browser/另一PTY不受影响。 |
| 旧helper/断连/宿主崩溃 | 保留旧root状态、native失败事实和持久attempt；恢复非活动、只读可查。 | root-only/无cleanup/unknown code不当成功，不据旧PID kill或自动换代次。 |

“确认”是**已界定受管范围**的确认，不要求证明全世界不存在任何不可观测任意daemon。Root已明确Spec/NFR允许未核实残留持续可见；正常Unix范围/Windows Job可正常完成，不把缺任意daemon绝对证明设成日常永久阻塞。已知逃逸、正常job-control范围缺失、身份不能核实则不能暗降成功。WMI/服务/WSL guest、主动脱离等超出正常继承机制的保证不凭此扩大。

没有当前新增产品问题必须问用户。需正式Spec owner决定的只是在实施中**想改变合同**时：允许已知残留/unknown也归档、自动清除未知并重启、扩大到任意外部daemon/提权平台，或把无法核验的正常平台范围改成支持成功。这些不能由工程fallback代写。本提案默认不采取；Windows内部IPC选择、预算、故障注入、SDK最小适配是Root/C的工程决定。若macOS观察接口只能降级，准确返回能力/未知并在平台验收标明，不能借Linux通过宣称Mac完成。

## 6. 精确分工/需补写集

以下只是建议授权范围，当前仍全部禁写。A/C先共同冻结shared evidence、共同fixture与SessionAdmission.runtimeId，再各自冻结公开方法/keys，B随后接线；都只消费别人的owner。

- **A TS业务/持久唯一writer：** 当前Ticket已覆盖services/terminal/**、workspace-service*.ts、controller/module、i18n/docs。必补 `src/modules/agent/core/workspace/managed-runtime.ts`；`core/space/errors.ts`；`services/spaces/{records.ts,records.test.ts,space-service.ts,space-service.test.ts,space-service-recovery.test.ts,messages.ts}`；`services/workspace-store.ts`及`workspace-store-spaces.test.ts`（仅quiesce/drain/release/归档layout接线）；`services/controller-stop-recovery.test.ts`（拟新增）；`services/workspace-service-stop.test.ts`（拟新增）。pending权限modal取消需要 `services/launch/launcher.ts`及`launcher-space.test.ts`，`services/launch/managed-errors.ts`作错误映射；其他launch文件仅真实必要时再报告，不提前扩大。
- **C Rust+native-wire唯一writer：** 已列 `native/pty-server/src/{session,job,main}.rs`与tests/**；必补 `src/shared/native/host.ts`、`src/host/desktop/native/{host,helper}.ts`与`host.test.ts/helper.test.ts/host.integration.test.ts`；共同fixture `test/fixtures/native/terminal-termination-v1.json`。协议常量实际在`src/shared/native/frames.ts`，仅若确需变major才补；本提案建议可选capability增量不改major。Windows bootstrap拆分时补`native/pty-server/src/bootstrap.rs`；选named mapping状态通道时补Cargo.toml最小windows-sys Win32_System_Memory feature，ACL实际调用若要Authorization再精确补，不升级依赖/直接改registry。新真实树测试建议 `native/pty-server/tests/session_tree.rs`、`windows_session_job.rs`，隔离subreaper夹具如需拆文件再列`tests/support/tree_fixture.rs`。
- **B UI唯一writer：** 已有sidebar/**含实际 `ui/sidebar/SpaceNavigation.tsx`（不是ui/create下）。补 `ui/terminal/TerminalTabView.tsx`及其DOM、`ui/terminal/confirm.dom.test.tsx`；必要sidebar逐对象归档/确认DOM就近新增。保留现SessionCard/terminal菜单、Browser/Page导航。关闭视图仍detach；stop与archive独立文案/确认，pending/partial/unknown/保存失败按DTO显示；取消/旧modal晚结果不关闭新实例、不抢焦点。B不写i18n或stop状态机。
- **Root：** Ticket/Map/Goal/正式Evidence、统一native构建顺序、main/styles/预算、整合检查与独立双轴审查。T03生成物/视觉不由本只读任务重跑。无当前必需api.ts、T05屏幕协议、T07 gateway、T14业务消费者迁移或T15/16迁移平台写集。

## 7. 开工后必须先红再绿的最小验证

1. pending卡在Provider/modal/helper/environment/hook/beforeSpawn：stop先发布/关门，取消后释放旧await零spawn；spawn已送后的late成功按原lease/sid回收，不误杀新代次。stop取消/timeout不撤销停止、不重发，重复stop一次效果，force升级不延deadline。
2. root先退出、HUP忽略子孙继续/另job-control组、流控暂停：root code0不提前归档，真正SIGKILL/范围证据收束；已知setsid/身份变化准确partial/unknown。保留早exit7/nullnull/旧sid隔离和receive→parse→ACK/reply负例。
3. archive preview→确认之间新增Session/attempt：返回stale零stop；commit→reserve continuation之间race也在plan里；闸后晚launch零spawn/准确late清理；A归档等待时B Space写入可完成；一个对象清理/保存失败返回rows且父archived=false，取消确认零效果。
4. pre-spawn attempt保存失败零helper/spawn；在保存成功后模拟突发Host死亡，从真实文件重开显示未确认且零spawn/输入/旧PID kill。final checkpoint/drain失败保留有效marker，不先释放writer后继续旧写；成功 shutdown先记录、drain再release。原Browser Cookie lease在单stop/Agent停用中仍完成。
5. A/C同一JSON fixture正负例+真实stdio联通；旧helper缺证据不成功。Linux树夹具用自己创建的隔离协调进程/subreaper wait自有子孙、finally wait helper并删临时根；不扫描/杀别的进程。Windows交付cfg测试与注入失败序列，本机无法运行不冒称通过；真实Obsidian/Provider/五平台仍交用户。

来源机制/许可/近两年活动已由C官方研究记录：WezTerm MIT、Alacritty Apache2、Microsoft Terminal MIT及Microsoft/Apple/Linux官方API；本轮复用其原始取证，不新抓远端、不复制代码。底层primaryURL与限制详见 `/tmp/huhu-t04-native-design.md` 和 source-observation引用的40响应清单，不能把这些阅读写成产品测试通过。

只读实际源SHA/时间和T03 A24逐文件一致核对见 `/tmp/huhu-t04-runtime-source-observation.json`。没有运行测试、lint、构建、helper/native/用户程序，没有写repo/target/Git/正式工件；仅本Markdown及该JSON。**READ-ONLY STOPPED。**

Root随后通知已完成确定写集补齐，GP-015/Map16、T04 frontier唯一；本件输入观察保留原GP-014/Map15时点SHA，不回写历史。正式开工packet须绑定Root的新版本。建议分工正是C独占shared/native+desktop native+Rust+共同fixture、A独占业务/records/checkpoint/DTO/i18n、B等A接口后独占UI；本件没有据此获得生产写权限。
