# T07 A 后续生产业务接线正式派单

Root 已核验 B 实际控制 API。本任务仅随真实 followup_task 投递生效；解锁原 A22 的其余15路径以及原A7必要集成修改。

沿原 T-07-task-a.md、GP022/Map23、唯一 current workspace/HEAD33c21e0、原 gpt-6.1-sol/xhigh。原 A22 的其余15路径本次解锁；原A7允许在本票实际集成所需的范围补接缝，不改变独立 Pane 标题、原运行身份、T06 前景/状态或旧消费者合同。Root 保留正式工件、全局检查、预算/根生成物；不得提交、推送、发布、归档或启动用户账号/用户库。

C 实源见 /tmp/huhu-t07-c-wire-handoff.md/.json 与 T-07-c-wire-root-audit.json（97443e9619c966ea997d464c33eb8a3d54664b2126de0dd6d7d3080ac74337cf），以实际 generated DTO/codec 为准。未来 T08–12 操作不可注册，准确 unavailable/effect none。任何需要改 wire/host 的缺口报 Root，不手抄另一套协议或绕过 B 的私有句柄。

Scope 修正按 T-07-scope-adapter-decision.md：原业务 scope 补捕获 vault.rootPath，保留 physicalRoot，唯一适配映射 wire root=physicalRoot；核验原路径与物理身份，增加 rootPath 不等于 canonicalPath 反例。不要用 cwd、焦点、唯一 Space 或新 UUID 补作用域。

生产 dispatcher 同步 capture 后才 await scope；admit 一次，在实际副作用前完成最坏 target/progress/final 表达容量检查。明确 Session 可解析其原 Space，显式 Space 冲突及跨 Vault/root/device/instance/旧runtime 拒绝。所有 fresh 启动必须有效 Space；绑定不可在 await 后随 UI 改变。只读 query/stop 不排到磁盘/历史慢队列，读取不 attach、不 markSeen。

首次 managed launch 复用 commit→同步 reserve→onReserved→prepare 顺序，bound PTY lease.acquireControl 不通过 ensureHelper 回入。routeEnvironment 只使用捕获 ref/registration/lease；Hook 初始注入后，在原 beforeSpawn await 与 stop/remove/expected-runtime 门完成后，于同一同步段 assertCurrent→覆盖受保护env→捕获helper.spawn，中间无新await。HUHU_SESSION_ID 仍是 runtime，稳定Session键来自 C canonical。

Capture execute 一次同步交接；router finally/disconnect 只能 dispose 尚未转交的 capture，不撤已接纳业务或显示 owner。onReserved/progress 只提供有界最新观察，观察失败不反向取消或重试。取消前后的 effect 依据原 admission/实际效果，不把超时当 none；保持准确 target 供后续查询。

read 按完整 envelope 和最坏转义预算选择 raw bytes，并沿同一个 ScreenRead snapshot/cursor；不得截正文却沿旧cursor跳字。外层 cursor 绑定 scope/Space/Session/runtime；list/explain 逐完整row计费并绑定 query/revision/位置，变化要求 resync，不缓存无界 Vault 快照。超大单row/metadata 在副作用前返回 capacity。

真实 /services/control/control-native.test.ts 必须经新 huhu CLI→broker→B host→生产 router/SpaceService/WorkspaceService/TerminalSessions→同 helper spawn/read/stop。B 脚本只装配/采证，不建固定回答业务替身。Root 尚未冻结新双bin时保留待验并继续独立定向测试；required 缺bin必须失败，绝不 skip 记通过。最终涵盖同 Vault 跨Space后台B不抢A、旧runtime/冲突Space、scope await失效前景token、rename保存失败、read不seen、首用回入与慢历史/磁盘不堵query/stop。

先准确红灯，再最小实现和相关回归。只跑定向自有检查，记录真实argv/UTC/输入/exit/原输出/漂移；既有A7原件不覆盖，后续交接使用新的阶段文件名。所有 owner STOP 后 Root 统一 build/lint/guards/真实binary闭包/独立双轴。任何必需路径不在 A22 中，先交 Root 解决。最后返回完整 A22 实际 source/diff/checks/handoff 与 SOURCE STOPPED。

Root 已回读 A 实源预检，审计 `T-07-a-routing-preflight-root-audit.json` SHA256 `0bfe66ba3ebf0a6c4e0c93e984176d6c21ce00cfe3045f7136d36636b3dc8218`。局部 paging 决定：外部 `limit` 为请求的最大行数，进入原 readScreen 前取 `min(requested/default, current profile.maxReadRows)`；返回 data 中公开本页实际 `maxRows/maxBytes` 上限，并把这些 metadata 计入 H。合法 limit1000 在 profile200 下可返回最多200行和同snapshot真实nextCursor，不假称取到1000行，不扩大旧profile，不改 C schema。增加连续分页无跳字/同cursor重读的反例。`agent.explain` params={} 保持，返回完整有界摘要；超限capacity，不私添 cursor 或悄悄截 row。


B 实际 API：`/tmp/huhu-t07-b-control-api-handoff.md/.json`；原件与5次真实命令已保存于 `T-07-b-control-api-root-audit.json`，SHA256 `22703ac3d67cb83a24110707bcf9d895be0e270f41f2afc45af08b783c3b302c`。公开来源 `src/shared/native/host.ts` SHA256 `2dee3805750c0eb31464b7729aac8f2cf9639a6bd5f2b2ad6b9b89b704e48e39`；只消费 NativeLease.acquireControl/registerControl、NativeControlCall 和 NativeControlRegistration 的 current/admit/progress/result/close。当前 API 交接验证为受控 stdio 1test/0skip、scoped types/lint，非最终原生或业务验收。B 即将继续压力修正，公开端口保持；定向检查如遇输入漂移准确记录，最终闭包由全部 STOP 后 Root 执行。

本次完整唯一 A22 写集：

- `src/modules/agent/core/control/context.ts`
- `src/modules/agent/services/control/router.ts`
- `src/modules/agent/services/control/commands.ts`
- `src/modules/agent/services/control/paging.ts`
- `src/modules/agent/platform/desktop/control/environment.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/workspace-service.ts`
- `src/modules/agent/services/terminal/sessions.ts`
- `src/modules/agent/services/controller.ts`
- `src/modules/agent/module.ts`
- `src/modules/agent/i18n.ts`
- `src/modules/agent/services/control/router.test.ts`
- `src/modules/agent/services/control/commands.test.ts`
- `src/modules/agent/services/control/paging.test.ts`
- `src/modules/agent/services/control/router-foreground.dom.test.tsx`
- `src/modules/agent/services/control/control-native.test.ts`
- `src/modules/agent/platform/desktop/control/environment.test.ts`
- `src/modules/agent/services/spaces/space-service-control.test.ts`
- `src/modules/agent/services/workspace-service-control.test.ts`
- `src/modules/agent/services/terminal/sessions-control.test.ts`
- `src/modules/agent/services/controller-control.test.ts`
- `src/modules/agent/module.test.ts`
