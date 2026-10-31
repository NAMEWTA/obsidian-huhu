# T-05 独立审查后的同范围修复 Packet

本Packet沿用户全18票Agent Team实现与代码验收授权、GP-019/Map20、T05原合同；不需新增产品决定。真实E2E仍由用户执行，无提交、推送、PR、发布、归档或真实账号写入。Root为唯一正式状态及生成物owner，三位实现者沿实际gpt-6.1-sol/xhigh身份。当前工作区/HEAD、逐源摘要与唯一写集见T-05-repair-round1-input.json。未列文件只读，不能用旧宽写集覆盖本次窄分配。

## 输入、复盘与恢复

按原Map→dev/ui→T05和specdev-i-implement执行repair；已读且SHA未变的规则/固定xterm MIT研究可复用。沿DESIGN revision1、PAGE-001、AC-061和digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab，不重选视觉方案。上游T04 done/G01代码关闭，T06实施仍锁定。

双轴原报告T-05-review-round1.md SHA d8b6a3956d16d092ab2d9b2f85da76aa53dfcf92d5c06fb3c56aee90f0998cc0与T-05-review-round1-root-audit.json是本轮新增输入。原有效探针/装配失败、C物理Outbox实验、Root三个组合均保留。原周期attempts3结束，未通过验收；Root在T-05.md#review-receipt已复盘。新周期采用真实生产调度屏障、stock语义对照、实际状态消费和容量闸反例，明确责任与以下接口后重新计数0/3。原压力attempt2主因未知，不据Outbox新反例或后来全绿声称已修。

## 已冻结的跨owner接缝

### C → A：设备回复失败

C在shared/native/input.ts定义并从host.ts导出：

```ts
export type NativeReplyFailure =
  | { readonly state: 'none'; readonly reason: 'capacity' | 'closed' | 'invalid' }
  | { readonly state: 'unknown'; readonly reason: 'transport-lost' | 'write-failed' };
```

host.ts定义NativeReplyError extends Error，readonly failure: NativeReplyFailure；NativeEvents新增可选replyFailure(sid, failure)。保持NativeConnection.reply(sid,data):void，本地同步拒绝只抛typed Error，远端只事件，不同一次既抛又事件。现有generic error不能靠文案猜typed原因。wire为严格kind1 `{type:'reply-failure',sid,state,reason}`，不带自由message，不伪造op/generation。

NativeHost沿captured generation/owner/SID路由；释放期间原drain仍可传诊断，不影响Browser/其他owner。native每原Session首故障常数latch、一个≤256B独立预留槽，沿32 active/pending/retiring SID上限（≤8KiB/32frames），不可被普通control洪泛挤掉；后续拒绝不重复入队。所有已产生且成功准入的fault进入同SID stream/fence，实际write完成后归还预算；slot清理由真实生命周期负责，不因未知SID新建无限Set。控制通道真实断裂沿closed/transport-lost收束，不声称诊断已送达。

仅实际拒绝/丢弃未claimed reply为none；实际completed(false)为unknown/write-failed；真实断链为transport-lost。close看见claimed不能提前假称写失败，不等待未来writer结果或形成writer→master close→exit死锁。首故障只描述该次失败，不声称之前回复都没有效果。继续parse/raw ACK/stop，绝不把reply转用户输入躲预算或重放。

### A → B：reset和独立诊断

不新增public reset DTO。XtermScreenSource用已解析ESC c handler（return false，仍由唯一headless parser执行）记录reset语义；commit使用既有replace-buffer.reason='reset'，优先于普通buffer-replaced/外层reason。每个RIS在原有effect序列产生sync-output(false)并推进lastSyncCommandId，序号不归零；同批后续2026h/l按真实解析顺序保留。分片ESC/c、菜单reset、normal/alt一致；普通buffer-replaced不能无条件清选择。source cursorBlink/colors等sidecar依stock真正reset语义核对，B只执行必要显示副作用，不将raw再次送renderer。

A导出/提供：

```ts
// Existing fields retained; each channel owns its own localized message.
SessionInputDiagnostic: existing fields + readonly message: string;
SessionResizeDiagnostic = Readonly<{
  runtimeId: string; requestSequence: number; op?: number;
  geometry: ScreenGrid; state: 'none' | 'unknown';
  reason: NativeInputFailure['reason']; message: string;
}>;
SessionReplyDiagnostic = Readonly<NativeReplyFailure & {
  runtimeId: string; sid: number; message: string;
}>;
// TerminalSession fields
resizeDiagnostic?: SessionResizeDiagnostic;
replyDiagnostic?: SessionReplyDiagnostic;
// Captured native event/local typed exception converge here.
replyFailure(value: NativeReplyFailure): void;
```

resizeSequence仅真正lease/model准入后的native回调同步递增；捕获sequence/op/runtime，所有queued/finished/throw/reject均完整处理，晚失败不覆新成功。原尺寸失败不能因新requested尚未应用就伪称恢复；只由当前applied清除，或当前新故障替换，superseded不等于applied。模型requested和native实际结果分开，不伪造模型回退。停用/卸载/换owner不让旧异步结果污染新请求；解析和ACK不等待OS resize。

reply首故障sticky单槽，后续成功不抹除已丢失事实。Session捕获本地NativeReplyError和远端replyFailure，常数诊断，关闭新用户输入，并至多一次请求原captured port.resourceLimit/stop（必要时同原port.end回退）；继续parse/ACK及新设备查询的原reply通道，不abandon、不伪造screen fault、不等待reply后再ACK、不重发失败查询。typed以外异常保守unknown，不逃出headless parse callback。已结束/失联runtime只记录准确结果，不反复stop。

B原role=status按固定有限通道组合screen/input/resize/reply本地化message；不借共享session.error辨认通道，ready不能吞掉持续故障。A唯一写i18n en/zh，B依diagnostic.message无需新增词典owner。Session.error保留旧消费者兼容但不作为新诊断真相来源。

## 分工、顺序与验证

C：STD/SPEC01、04的native/shared/host生产和测试。Outbox把全部reserved input/resize各阶段放同SID既有FIFO，保留receipt reserve/物理write返还、公平轮转、raw→notice→exit；不能只移终态。用Outbox.new/run生产调度而非cfg(test) channel bypass，覆盖全部wheel phase、多SID、完整阶段、budget返还、未知断线；Node/native frame/bytes/perSID/helper/closed/write-failed与SID隔离、诊断洪泛自身上限需实际测试。

A：STD/SPEC02 source reset、STD03 resize当前请求诊断、STD04 Session/Sessions消费与收束。先以独立原probe作为既有红灯，再将稳定反例放入已分配测试；包括raw分片、多RIS/2026同批、菜单reset、备用屏、reply容量/失联不阻ACK/只收束所属runtime、晚resize结果与后续成功。Session三类message保持双语并更新用户说明的实际失败边界。C公开类型稳定回执前可做reset/resize，reply接线不得靠另一份临时类型通过。

B：STD/SPEC02 target交互语义与STD03/04可见状态，在四条分配路径内完成。等A实际接口回执后消费，不能自造DTO。将stock对照、selection、sync token本地timeout、normal/alt/raw RIS/菜单reset、运行中throw/none/unknown→applied、两观察者一致/size owner不漂移和卸载无写加入生产DOM/Chrome。无需更改TabView非运行overlay或页面版式。

原独立probe的失败是有效红灯，不强求重跑完全相同输入；新增未被覆盖风险需有意义负例。记录每次实际命令/时间/退出码/原日志、源摘要与失败，不覆盖历史文件。局部单元检查可按不冲突输入运行；全局build/lint/整合/Chrome Root验收在所有相关源停止后执行。不要并行运行真实PTY压力或偷偷降低并发/工作量/预算。C可独占Rust编译与定向native验证，最终交一个唯一/tmp不可变Linux helper（mode555、SHA、实际12源/Cargo快照）给Root；真实Windows只交叉类型不声称实机。

返回/tmp/huhu-t05-repair-{a,b,c}-handoff.md、*-source.json和*-checks.json，附实际原件路径、SOURCE STOPPED、未验证边界。Root统一重建main/styles、复核变化预算、运行组合和受影响Chrome、冻结新交付后交原独立reviewer复核两轴；不把代理自报直接改done。若路径/接口/行为超出本Packet或同一失败无新证据，停止受影响分支报告Root，不问用户重复授权、不改无关代码。
