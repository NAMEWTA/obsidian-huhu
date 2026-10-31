# T05 A 实际公共接口回执

供 Root 核读后冻结并派 B；不是整票验收。public DTO/签名/键本回执后不自行改动，内部实现继续。不可变源码副本在 `/tmp/huhu-t05-a-api-source/`，清单 `/tmp/huhu-t05-a-api-source.json`。

实际纯合同：`core/terminal/frames-screen.ts`。ScreenMark runtimeId/contentSequence；snapshot-begin/links/row/end、patch/patch-part/resync-required；双 buffer/cell bit words+有效extended/linkKey；结构 ops 与有序effects；snapshot/nativeGeometry 区分 requested/queued/applied/superseded/none/unknown。B不得把 authority geometry 当 OS 已确认。profile有限但数值仍 provisional，后续压力证据/调整先通知Root。

TerminalSession 实际公开方法：

```ts
openScreen(options: Readonly<{after?: ScreenMark}>, sink: ScreenSink): ScreenStream;
readScreen(request: ScreenReadRequest): Promise<ScreenReadResult>;
getScreenUsage(): Readonly<ScreenUsage>;
getScreenProfile(): Readonly<ScreenProfile>;
registerView(viewId: string): ScreenViewLease;
setViewVisible(lease: ScreenViewLease, visible: boolean): void;
setViewFocused(lease: ScreenViewLease, focused: boolean): boolean;
unregisterView(lease: ScreenViewLease): void;
requestViewSize(lease: ScreenViewLease, grid: ScreenGrid): Promise<ScreenGeometryResult>;
submitInput(data: string|Uint8Array, options?: NativeInputOptions): SessionInputSubmission;
submitPaste(text: string, options?: SessionPasteOptions): SessionInputSubmission;
```

ScreenStream.applied(mark)只退该observer引用，不是native ACK；sink可同步回调，初始化时应在open返回赋值后再applied（例如microtask）。snapshot分块全部完成才applied(snapshot-end.at)，完整patch/parts提交后applied(to)。慢/异常observer只重同步/释放自身。reset/raw replay不得作为projection fallback。read cursor绑定runtime/稳定snapshot/expiry，未知/超限准确返回。

```ts
const lease = session.registerView(viewId);
session.setViewVisible(lease, active);
session.setViewFocused(lease, active && focused); // 显式当前GUI资格，不能用fit抢owner
const result = await session.requestViewSize(lease, proposed);
// 所有显示仍只按screen frame.geometry resize，不直接采用proposed。
// 隐藏：setViewVisible(false)；失焦：setViewFocused(false)；卸载：unregisterView。
```

Source唯一私有adapter：`XtermScreenSource(model,profile,onFault,reserve)`，capture/takeStructure/takeEffects/usage/beginParse/dispose。只导出源primitives，不给target续raw。C冻结的NativeInputSubmission原样消费，结果字段state；SessionInputSubmission加runtimeId，SessionPasteOptions加appendEnter。inputDiagnostic为结构化none/unknown；legacy手工void不造queued/written，以legacy-unconfirmed标未知。Controller的typeWhenReady分类待A内部接线。

双语键已实际落 agent/i18n.ts：resourceLimit、sizeRejected、resync、unavailable、inputNone、inputUnknown、inputUnsupported、inputClosed、reasonCapacity、reasonCancelled、reasonInvalid，均有agent.screen.前缀。B消费这些键，缺键经Root协调，B不写词典。

真实检查：首个缺stream行为红→parsed半CSI水位连续性绿；受控8工作量阈值的REP/S/T各9参数红→公开完成CSI准入绿（5tests/0skip）；scoped生产API类型exit0。原件均保留。完整容量前预留/raw隔离/最后exit/parts/native强输入/分页/慢observer组合仍在实现，不能把首批绿写成完整AC通过。没有运行helper/build/full lint或改依赖。

|实际源|SHA256|
|---|---|
|`src/modules/agent/core/terminal/frames-screen.ts`|`d90e551417eb530f57edbffbb2ee0478be0b34d1b96ef7200c7d62c0d20b13fa`|
|`src/modules/agent/services/terminal/session.ts`|`57de119133175f9ddb0acd94391d4b02ff82cd3ff6c218afa1eb19d37efd91ac`|
|`src/modules/agent/services/terminal/session-screen.ts`|`d1ed16e31234bc11d06087365e07e5a4eea09bcb37c34998cc735b94fa53d6f8`|
|`src/modules/agent/services/terminal/session-screen-xterm.ts`|`9d08daf234b2c88ba3e2c6806a153321cf9b2eb60365f7ce1db13b8c4540a3cf`|
|`src/modules/agent/i18n.ts`|`1e13acf34bbb020e39258c484511953531ac08d44242d91aec35ecf14b3049a8`|

公共签名/DTO/键停改；A内部继续，非SOURCE STOPPED。
