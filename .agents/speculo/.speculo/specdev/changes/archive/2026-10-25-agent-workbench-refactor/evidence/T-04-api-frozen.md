# T-04 A 公共接口冻结（内部实现继续）

2026-10-25T09:49:00.428005+00:00

公开DTO/四方法/下列en与zh键自此停改；如确需改变先通知Root与B。整文件SHA仅此观察时点，Workspace内部和terminal/Space仍继续实施。

DTO权威：`src/modules/agent/core/workspace/managed-runtime.ts`。Native TerminationEvidence复用C唯一shared合同，无另建副本。

```ts
stopManaged(ref: ManagedRuntimeRef, options?: ManagedStopOptions): Promise<StopResult>;
waitManagedStop(ref: ManagedRuntimeRef, options?: Omit<ManagedStopOptions, 'force'>): Promise<StopResult>;
previewArchive(scope: ArchiveScope): Promise<ArchivePlan>;
archiveManaged(plan: ArchivePlan, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<ArchiveResult>;
```

UI：沿现有 getManagedSnapshot()/subscribeManaged() 读取缓存投影。summary.archived（optional为旧fixture兼容，生产始终boolean）；summary.restore?={state:ended|unconfirmed,canRequestContinue:boolean}，canRequestContinue只表示允许显式发起再校验，不能自动spawn。runtime.stop?/termination?为只读当前代次事实。stop/force只针对完整ref，expected runtime不匹配拒绝；wait取消/超时不撤销停止。

停止成功只看 status=stopped 且 persisted；archive成功只看 status=archived。pending/failed/incomplete需展示error及逐对象rows，不自动重试。archive preview只读，confirm后将原plan传回（不可自行重建scope）。取消confirm零effects。归档保留Session/history/layout引用。

en/zh新增键（相同suffix，prefix agent.managed.）：
- `agent.managed.stop`
- `agent.managed.forceStop`
- `agent.managed.stopConfirm`
- `agent.managed.stopRequested`
- `agent.managed.stopConfirmed`
- `agent.managed.stopPartial`
- `agent.managed.stopUnknown`
- `agent.managed.stopDetails`
- `agent.managed.waitTimeout`
- `agent.managed.waitCancelled`
- `agent.managed.archive`
- `agent.managed.archiveSpace`
- `agent.managed.archiveConfirm`
- `agent.managed.archiveChanged`
- `agent.managed.archiveIncomplete`
- `agent.managed.archived`
- `agent.managed.recoveryUnconfirmed`
- `agent.managed.recoveryEnded`
- `agent.managed.continue`
- `agent.managed.restart`
- `agent.managed.checkStop`

调用示例：
```ts
const plan = await workspace.previewArchive({kind:"space",spaceId});
if (await confirm(t("agent.managed.archiveConfirm",{title,count:plan.members.length}))) {
  const result = await workspace.archiveManaged(plan);
  // 根据result.status和rows显示结果，不因等待取消重发stop。
}
const result = await workspace.stopManaged({spaceId,sessionId,runtimeId});
```

实际源码SHA：
- `src/modules/agent/core/workspace/managed-runtime.ts` a543fc74b401d8eb5917286a2007db147442877bd6aeed38be3f3b39b66784fd
- `src/modules/agent/services/workspace-service.ts` 902cd834289ed6e6456c49ade2bf09d8dab57600ee0b63fef48d7f6a58eebbd0
- `src/modules/agent/i18n.ts` 682ae35d1b9ef73146ad4fcf29791ceff05a5b7870f6fd575b7cfa3384d83911
- `src/shared/native/host.ts` f1521198d3e5574a544594437f3356c5cb07c3f4185e2693fd85f45ff7012764
- `src/shared/native/termination.ts` 945723a552a262d284024f7789c73aff3c5a671568afd55a04964bd0ac03c687

已执行durable/archive/records有意义红绿；此回执不宣称整票完成或真实E2E通过。
