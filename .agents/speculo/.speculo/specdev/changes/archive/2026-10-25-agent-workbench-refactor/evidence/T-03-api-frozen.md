# T-03 A → B 接口冻结回执

2026-10-25；本回执只冻结供 B 消费的 DTO/签名/keys，不声明 A 实现或本票验收完成。T-02 最终 saveLayout({base,value})/队列 updateLayout 仅消费，不改其 owner。A 后续继续内部实现与测试；B 等 Root 单独解锁。

唯一运行 owner=TerminalSessions；持久 owner=SpaceService；WorkspaceService 缓存只读 snapshot。

## 可直接接线

```ts
const result = await workspace.createManagedInteractive({kind:'agent',agentId:'codex',spaceId, title,foreground:!background,groupId});
// only created → onDone；cancelled 保留输入；failed → t(result.error.messageKey)。
const snapshot = useSyncExternalStore(workspace.subscribeManaged, workspace.getManagedSnapshot);
const rows = snapshot.sessions.filter(row => row.spaceId === spaceId);
const result2 = await workspace.attachManaged({spaceId:row.spaceId,sessionId:row.sessionId}, {expectedRuntimeId:row.runtime?.runtimeId});
// pending/not-running 只呈现结果，不调用 restore 或 launch。
```

公开签名：createManaged(ManagedCreateRequest):Promise<ManagedCreateResult>；createManagedInteractive(ManagedInteractiveCreateRequest):Promise<ManagedCreateResult>；getManaged({spaceId,sessionId}):ManagedSessionSummary|undefined；listManaged(spaceId):readonly ManagedSessionSummary[]；getManagedSnapshot():ManagedSnapshot；subscribeManaged(()=>void):()=>void；attachManaged({spaceId,sessionId},{expectedRuntimeId?,focus?,groupId?}?):Promise<ManagedAttachResult>。现 close/closePane 签名兼容，terminal 语义仅 detach。subscribe/getSnapshot 为已绑定 arrow 方法，可直接传 React。

纯 DTO 原件是 core/workspace/managed-runtime.ts。sessionId=稳定持久 SessionRecord.id，runtime.runtimeId=本次运行代次；native sid 不暴露。snapshot={revision,sessions}，session.runtime 可缺失，viewState=background|attached|detached|restored；runtime.phase=launch-pending|connected|failed|cancelled|disconnected|exited。inputReady 不能当通用键盘门或任务成功。已记录取消独立 phase/文案，避免把用户取消显示为启动失败。

create result=status created(effect completed,session含runtime) | cancelled(effect none/partial,reason space-selection/permission-confirmation,session?) | failed(effect none/partial/unknown,error,session?)。已知目标在 session 中保留。error={code,reason,messageKey,nextAction,details}；错误键精确联合位于 DTO。无原始 env/异常全集入 UI。

严格 create 默认后台/非交互，Space 必填，永不弹框。GUI create 默认前台但 foreground:false 仍允许原首次权限确认。后台不建 Pane/select/open/focus；前台迟到用户意图失效则留后台。attach 默认 focus:true；pending 无自动 continuation；restored 普通打开零spawn。B 不自己实现运行 registry。

## A 已落地 en/zh 键

agent.managed. 前缀：name、backgroundChoice、starting、connected、failed、cancelled、disconnected、exited、background、detached、restored、open、closeView、closeViewHint、notRunning、invalidInput、permissionRequired、programMissing、accountUnavailable、unavailable、moduleInactive、targetMissing、staleRuntime、effectUnknown、launchFailed。确切 en/zh 原件在 i18n.ts。closeViewHint 仅用于仍活动 runtime；原明确 stop 文案保留。错误复用 agent.spaces.error.required/ambiguous/missing/scope/owner/directory/save。

## 输入/检查事实

首次生产 tsc 报旧调用名 setTitle 不存在，已改为真实 rename；随后 `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.json` exit0，原日志 /tmp/huhu-t03-interface-tsc-green.log。本轮没有构建产物/整库 lint。首条真实 SpaceService+WorkspaceService+TerminalSessions detach 回归已 red→green；其余内部启动接线/类型闭包/负例尚在进行，不把本回执当完成。

WorkspaceService 全文件 SHA 仅标识此刻实际落源版本；A 还会改内部实现，但不无通知更改以上公开合同。DTO 与键若需变更先给 Root/B 新冻结回执。无新增票外必需路径，Controller/所属 doc/leaf 的 foreground intent 接缝由 A 接通。

| 原件 | SHA256 |
|---|---|
| `src/modules/agent/core/workspace/managed-runtime.ts` | `2a615a02a848afaaa5872dfcefd701fc607d6b2a26368aa1bcfcf61cf8027ee7` |
| `src/modules/agent/services/workspace-service.ts` | `331849fa1d9b9bda39e03a853dfbe55f62e78743258ecccbf9f824b2957d0277` |
| `src/modules/agent/i18n.ts` | `9c559aa6711bdaf2473df4c9ac4b657b82662e28dde3d9bf5a8c4a3ea0776ee3` |
| `src/modules/agent/services/launch/managed-errors.ts` | `efe883107cd23579fbd760e5c052eecc086a9a1af53925b9346c38772242f703` |
| `src/modules/agent/services/launch/foreground-intent.ts` | `78feafae2fd6faac0e6eb69418b1a02c775b0349e0246eea2e291f03452e4e65` |
| `/tmp/huhu-t03-interface-tsc-green.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
