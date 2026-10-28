# T-06 独立双轴审查原始报告

Reviewer: native:/root/review_browser  
Implementer: native:/root/audit_browser  
Mode: native；未参与 T-06 实现，沿用独立 reviewer，未递归派遣。  
Input-SHA256: `738244fa4bcd20ef7a842e693a1e716358dd28404ad7a090c38b53fb8f053c92`  
Observed: 2026-10-27；standards=request-changes；specification=request-changes。1 个唯一 P2，有实际生产服务类的可重复反例。

## review-input

完整固定对象：[T-06-review-input.json](T-06-review-input.json)。实际对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算 UTF-8 SHA256，得到上列摘要；没有使用内部 scope.input_sha256 替代完整对象摘要。

- working-tree 显式 17 文件，base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`。T-02-r3、T-03-r2、T-04-r2、T-05-r2 联合前序的未变内容按固定证据和实际依赖追踪，不把共同 HEAD 当成未提交实现的完整前序。
- 开始逐项核验 17 文件 after SHA256 与 53 项来源原字节 SHA256，全部匹配。完整 scope、sources、exclusions 以输入对象为准，未修改输入。
- 结束实际重跑同一 `validate-specdev.mjs --review-scope --repo <cwd> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，逐项传入相同 17 个 `--file`：base/head、index SHA256、tracked_diff SHA256、完整 working_snapshot 均 MATCH；53 份来源再验无漂移。
- excluded additions 是本轮输入 JSON、T-20-review-report-r2.md、T-21.md、sources/browser-files-input-preflight.md；excluded removals=[]。它们不在冻结代码/来源内，不声称全仓库没有其他工作。Map8 已在输入中冻结，不把未来 T24 范围补充当成本票代码。
- 继续应用已读、摘要未变的 code-review/dev/ui、source-discovery、Fowler、risk-review、reviewer/reuse/evidence/working-tree、错误/测试可靠性、架构/测试、范围/研究和 design-contract。规范包括 AC-003/004/008、T-06、Issue #1 完整生命周期/接管条款、ADR/docs、SRC-010、DESIGN revision2/PAGE-004 和封板来源。无规范缺失或跳过轴。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: request-changes  
Input-SHA256: `738244fa4bcd20ef7a842e693a1e716358dd28404ad7a090c38b53fb8f053c92`  
Observed: 已检查启动/回收、desired Page 重试、Host/Worker 收敛、native gate 依赖、查看器存活与实际 UI/root 调用链。以下 1 项阻止通过。

### S-01 / P2：旧 stop 的最终持久化窗口接受新 start，随后 stop 却被错误合并到旧实例

- 位置：`src/modules/browser/services/workspace.ts:1253`–`:1258`，重点 `:1255` 的无条件合并；窗口来自 `:1280`–`:1297`，另一个入口是 `:454`–`:475` 的 startOwned。
- 真实时序：
  1. stopOwned 已回收旧 runtime，内部状态改为 stopped、清掉 runtimeId，然后仍在等待最后一次 catalog 持久化。stops 表中旧 Promise 尚未移除。
  2. 另一个 Space 的正常原生 page 事件调用 notify，可把这个内部 stopped 状态发布给其他工作台窗口；此时不仅是不可见的私有状态。
  3. 用户/消费者对该 Space 调用 startSpace。startOwned 只查 starts 和 stopped/faulted，未隔离仍未完成的 stop，于是接受新 start 并推进新的 intent，进入 starting/等待 catalog 写队列。
  4. 再对这个已经接受重开的 Space 调用 stopSpace。它直接复用旧 stops Promise，跳过 stopOwned/newIntent，没有取消新 start，也没有停止其新 runtime。
  5. 放行目录写入后，两个 stop 都成功结算；新 start 随后完成，最终为 ready，新 runtime 从未被 stop。
- 风险：针对重开过程的较晚停止请求被旧实例的去重吞掉。普通 stopOwned 本应通过 newIntent 取消在途 start；这里的提前返回恰好绕过该保证。多个窗口共享模块服务且各自有本地 pending 状态，单个组件禁用按钮不能修复服务层时序。停止回执不能代表该次较晚请求已作用于当前启动代次，页面/网络活动可能在其后继续。
- 独立反例：真实 BrowserWorkspaceService、持久写队列、FrameBroker/账本，使用现有合成 MemoryPersistence/FakeRuntime 端口。实际创建两个 Space；截住第一个 Space 最终 stopped catalog 写入，第二个 Space 发正常 page 事件；确认 getState 已显示 stopped 后依次调用 startSpace、stopSpace，再放行并等待所有调用完成：

```json
{"case":"stop/start/stop during final stop catalog await","status":"ready","newRuntime":"id-00000011","oldRuntime":"id-00000006","newRuntimeStopCalls":0}
```

- 不是在停止已结算后随意另开：新 start 与较晚 stop 都在旧 stop Promise 尚存的最后 await 窗口内发起。现有“两个 stop 都等待同一个 native stop，全部完成之后再 start”的绿色用例没有覆盖这个交错。
- 依据：dev 的并发/状态归属、error-handling 的完成事实；Fowler/risk-review 的异步 owner 与旧回调不得作用于新代次。服务已有 start intent/stop 取消模型，去重必须尊重该模型，不能仅按 Space ID 复用上一代停止结果。
- 最小满足条件：生命周期在同一 Space 上有一致的 start/stop 边界。可以在旧 stop 完成前拒绝/等待新 start，也可以按代次/intent 只合并同一停止目标；已经接受新 start 时，后来的 stop 必须针对它推进取消并等待所需回收，不能只返回旧 Promise。保留普通同代 stop 合并、失败可重试、旧 profile/desired Page ID、不由旧 stop 回收后来合法 runtime 的保护。
- 必要回归：在最终 catalog await 截住旧 stop，以另一 Space 的真实通知暴露 stopped；验证 start→stop 的较晚停止不被吞掉。若选择暂不接受重开则明确失败/等待；若接受则最终停止或可解释取消，不出现两个 stop 成功而新 runtime 无停止调用且 ready。保留旧 stop 完全结算后正常重开成功。

Findings: [S-01]。未发现其他可证实的阻塞缺陷；不限制发现数量。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: request-changes  
Input-SHA256: `738244fa4bcd20ef7a842e693a1e716358dd28404ad7a090c38b53fb8f053c92`  
Observed: 主体已满足早失败定位、失败页单独重试、独立 revoke/有界收敛和查看器失活的代码合同；以下为同一个唯一缺陷的规范差距，不重复计数。

### R-01 / P2：停止/重开重叠时，较晚停止没有作用于当前启动代次

- 位置、实际时序、输出同 S-01。
- 依据：AC-008 及 T-06 的 Space 重开/停止失败恢复合同；Issue #1 §7.2 INV-02/INV-08/INV-12、§7.3 的生命周期与控制权状态、§8.1 的 runtimeInstance 归属和 §15.5 的重开规则。停止与在途重开的取消/回收必须仍受当前生命周期 owner 管理，不能把上一实例的结果当作后来请求的完成事实。
- 差距：较晚 stop 发生时 startOwned 已建立新 intent，但 stopSpace 仍只按 Space ID 合并旧 Promise，跳过取消/停止新 intent；回执成功后仍发布新 ready 实例。普通单代停止和重开正确，不能证明该交错正确。
- 满足条件：同 S-01 的 start/stop 互斥或代次感知合并，并补实际最终持久化窗口的跨消费者反例；不删除旧 profile、不重 seed、不自动恢复旧租约/网页副作用。

Findings: [R-01]。skipped_axes=[]。

## 已核对的生产链与成立部分

- 模块 composition 和公开 workspace API 仍是实际 owner；Agent consumer 通过公开 viewer/API 访问，personal 不发 Agent Run，browser 不依赖 Agent 会话才能存在。模块生命周期注册 dispose，未改为 Agent 关闭即删除 Space。多 Space 使用不同 runtime/profile 路径，复用既有受管目录与所有权校验。
- startOwned 将首次 persist/reclaim/start 纳入失败处理：未拿到 runtime 时独立 reclaim，startAttempted 区分是否需要本次 runtimeId；确认回收则 faulted/paused 并保留旧 profile/完整 desired pages，不能确认则 quarantined/blocked 留定位。没有把旧 Space 重开失败导向新建资料删除。新建失败仍由原 catalog/cleanupSpace 路径处理，确认归属后才删除本次新资料。
- 逐页恢复保持原 Page ID 和完整数组，成功页与失败页并存；原生 page/page-closed 对 pending/failed desired 页不覆写成关闭。retryPage 经 workspace 管理 authority/账本/串行 action，只重试目标 ID，禁止重试已经成功的页，不重建成功页或重新 seed。
- driver.createPage 将失败 target 的关闭纳入 await，close receipt 必须 success=true；确认关闭后只清除该 target/session 映射，旧 detach 不删除替代页。创建结果 unknown/无法确认 target 关闭时发故障，不能继续以可重试普通失败掩盖未知资源。已读真实 NativeCdp 的 outcome_unknown、传输失败和故障传播，不只读其 mock。
- Host ManagedRuntime.setControl 先独立发 native control 并核验 epoch/sequence/transport ACK，再等待 Worker control（5 秒）。Worker 镜像新 epoch 是 urgent，但 handoff response 要等此前普通 queue 与已接纳的 urgent dialog/chooser；超时/unsettled 时 Workspace 不发布 human lease，继续撤销/必要时 stop，双方 blocked，不自动续接旧 Run。
- 实际读取 native/browser-runtime/src/main.rs/gate.rs：control_pending 和 writer gate 使 revoke 不排普通 Worker mailbox；完整有限 Gesture 在原生入队前验证，半个 down/up、跨 session 或不支持手势不被当可完成事务放行，写失败为 unknown/关 gate。未运行真实 helper，也不声称原生/OS 集成已验。
- 旧 Agent Run 在 newIntent 撤销并 seal，observe/action/Protocol 最终 guard 和 driver epoch/document 校验仍在；派发后结果保留 completed/failed/unknown 事实，不因超时自动重派。此前 T-02/T-03/T-04/T-05 的安全主体按未变依赖核对，没有为本次接管开放旧读写能力。
- SpaceViewer 唯一生产 subscribeFrames 消费者提供可信本地 isAlive；FrameBroker.has/deliver 在失活/抛错时移除查看器、清帧并停止无消费者 watch。human/request 授权先查 frames.has，后台 tick 失活时 pause，不因残留 frame 续租。
- 独立实际检查失活边界：原 human 查看器 isAlive=false 后，在下一 tick 之前 pageAction 已拒绝 human_lease_expired，runtime 未多读一次；tick 后状态 paused、native lease=false。不是只等到两分钟过期。
- 完整 UI 链已追踪：module → workbench-page/ReactSurface → ContainerProviders/useContainerDocument → BrowserWorkspace → SpaceViewer；隐藏/关闭/root unmount 与 pagehide 释放原 viewer，ContainerProviders 按 DOM adoption 更新所属 Document/Portal，viewer/window identity 随 ownerDocument 重建。仅离线代码/DOM 能证明这些接缝，真实主窗/popout 仍由用户验收。
- PAGE-004 使用既有控件/t()，失败页给原 ID 的 retry，faulted Space 可重开，unsettled 有明确停止/重开解释；控制按钮在网站 action 等待时仍能请求暂停/接管。DESIGN revision2/digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c` 与封板来源未变。没有重新选择设计或以 DOM 充当视觉批准。
- 最终资产仍由 Lead 串行集成；源码检查不等于当前已提交 main/Worker 生成物或真实 nativehelper 已更新。

## reviewer 实际证据与命令

实际执行完整输入摘要、开始/结束 17 文件及 53 来源校验、同选择 review-scope 重建；读取全部交付及实际相关 native、CDP、adapter/root/viewer 依赖。没有仅按作者新增测试清单验收。

S-01 与失活对照沿前轮方式：读取当前 workspace.test.ts 的 fixture 前缀，只在内存替换 vitest spy，esbuild stdin/write:false 后 Module._compile；真实 Workspace/账本/控制和持久写队列执行，runtime/persistence 为合成端口，不操作真实网页。finally 释放 gate、dispose 工作区，没有写源码或临时生成物。

失活实际输出：

```json
{"lostViewerBeforeTick":"human_lease_expired","extraRuntimeReads":0,"afterTick":"paused","remainingLease":false}
```

另将真实 worker.ts 在内存 bundle/vm 中运行，仅替换 Driver 为可控异步端口；分别挂住控制前已接纳的 urgent dialog/chooser，确认 control 立即镜像，但 handoff result 不早发，放行后结果顺序为 [旧动作,control]：

```text
prior urgent dialog: control mirrored immediately, handoff receipt after old action settles
prior urgent chooser: control mirrored immediately, handoff receipt after old action settles
```

此实验验证真实 Worker 调度；不把 synthetic Driver 当作真实 Chromium/native gate 验证。

实际风险定向测试：

```text
pnpm exec vitest run src/modules/browser/platform/desktop/runtime/driver-lifecycle.test.ts src/modules/browser/platform/desktop/runtime/host-control.test.ts src/modules/browser/platform/desktop/runtime/worker-control.test.ts src/modules/browser/services/workspace.test.ts src/modules/browser/ui/SpaceViewer.dom.test.tsx src/modules/browser/ui/BrowserWorkspace.dom.test.tsx -t 'early|coalesces overlapping|retries only|lost human|both writers|handoff|Worker|failed-target cleanup|liveness|failed desired Page'
Test Files 6 passed (6)
Tests 15 passed | 59 skipped (74)

pnpm exec vitest run src/modules/browser/ui/BrowserWorkspace.dom.test.tsx -t '^retries a failed desired page'
Test Files 1 passed (1)
Tests 1 passed | 9 skipped (10)
```

实际合计 16 个定向用例通过，覆盖 early reclaim/start、unknown 所有权、普通重叠 stop、partial Page retry、失败 target 清理、native ACK/Worker 5 秒边界、查看器失活和实际恢复 UI；S-01 的末次持久化交错仍不在这些绿色例中。没有把作者 39 files/323 tests、test/worker tsc、10 生产 lint、architecture 1258、i18n 5198 的回执冒充 reviewer 重跑，也没有无差别重复整套。

未运行真实 Chrome/helper 集成/Obsidian/四平台/人工视觉/性能，不读取真实用户资料/账号/系统秘密；按 SRC-010 由用户验收。未 build 或改生成物，Lead 最终串行处理。唯一写入本原始报告，未改源码、正式 Evidence/Ticket/状态、冻结输入或旧报告；T20/T21 及其他范围未写入。

最终：唯一缺陷 1（P2）；standards=request-changes；specification=request-changes；skipped_axes=[]。交回后停写。
