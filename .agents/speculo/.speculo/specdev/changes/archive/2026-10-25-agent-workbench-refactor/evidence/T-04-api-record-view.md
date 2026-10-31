# T-04 只读记录视图接口增量冻结

原四方法/DTO不变；以下实际公开方法停改，内部实现继续。

```ts
openManagedRecord(target: ManagedSessionTarget): Promise<
  {status:'opened'; target:ManagedSessionTarget; tabId:string} |
  {status:'failed'; target:ManagedSessionTarget; error:ManagedFailure}
>;
```

从持久Session/已有同stableSession Pane创建或复用真实布局占位，零helper/scan/spawn。占位ID不进入TerminalSessions runtime authority。按现有foreground intent和presentation revision保护。成功后UI可显示该视图；启动仍只由显式 `restore(tabId, undefined, true)`（重启）或 `restore(tabId, undefined, false)`（继续）触发。unknown恢复门拒绝；Agent continue缺原生来源明确 SOURCE_UNAVAILABLE:resume-source-unavailable，不降成空会话。Shell采用restart。取消/失败不自动打开或启动其他会话。

终止checkpoint按exact attempt保存已有runtime捕获的nativeSessionId/transcriptPath；旧代次不能覆写新代次。恢复无Pane Shell原配置/稳定身份、零native打开、Agent缺来源拒绝、unknown拒绝已经真实组合12tests通过（/tmp/huhu-t04-a-recovery-open.log），不是产品E2E。

新增已授权en/zh键：agent.managed.shutdownIncomplete = Some terminal cleanup or saved results could not be verified. / 部分终端的清理或保存结果未能核实。

观察UTC 2026-10-25T10:04:42.356460+00:00

`src/modules/agent/services/workspace-service.ts` SHA256 17a9582150b769867195d3a2782c2b67912640dac229cab3c43683b9fb139869

`src/modules/agent/i18n.ts` SHA256 223a12cb6b915ddc4f486074b8c38f2d5b00e2f1d3067799b195cce42b280ef8
