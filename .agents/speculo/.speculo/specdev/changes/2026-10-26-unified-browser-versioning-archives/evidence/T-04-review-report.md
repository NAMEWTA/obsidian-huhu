# T-04 独立双轴审查原始报告

Reviewer: native:/root/review_browser
Implementer: native:/root/audit_browser
Mode: native；保持独立身份，未参与 T-04 实现，未递归派遣。
Input-SHA256: `b235c51ea97acd94581b492f1035be339560d0633be420705e248efc09e688dc`
Observed: 2026-10-27。standards=request-changes；specification=request-changes。2 个唯一 P2 均有生产类的定向反例。

## review-input

完整固定对象：[T-04-review-input.json](T-04-review-input.json)。摘要由工具对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算，区别于内部 scope.input_sha256。

- working-tree 显式 13 文件；共同 base/head 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`。增量接缝按已固定 T-02-r3、T-03-r2 联合前序核对；没有仅凭共同 HEAD 推断未提交实现。
- 开始逐项核验 13 文件 after SHA256 与 35 份来源原字节 SHA256，全部匹配。
- 结束重跑相同 review-scope 选择：base/head、index SHA、tracked diff SHA、13 文件完整 working_snapshot 全部匹配；35 份来源再次核验全部匹配。
- 结束 inventory 排除项新增本轮输入 JSON、T-16 evidence、archives 的 form-drafts.ts/use-archive-draft.ts，属于范围外变化，不声称整个仓库无漂移。

## standards-output

Reviewer: native:/root/review_browser
Axis: standards
Result: request-changes
Input-SHA256: `b235c51ea97acd94581b492f1035be339560d0633be420705e248efc09e688dc`
Observed: 读取全部固定交付，追踪 Runtime→Workspace→RunEvents→Protocol 最后 guard→RPC/CLI/MCP，以及 Ledger 持久通知。以下 2 项阻止通过。

### S-01 / P2：downloadChanged 使用原生状态，可能把本地失败通知为完成/进行中

- 位置：`src/modules/browser/services/workspace.ts:1389`–`:1390`；实际文件接缝 `src/modules/browser/services/create-workspace.ts:158`–`:175` 与 `platform/desktop/files/file-service.ts:193`–`:214`（后两者是只读追踪的现有消费者/依赖）。
- 可达前提：原生下载仍 progressing 或已经 completed，但 HUHU 本地配额检查、固定副本捕获、摘要/文件读取等失败。FileService.updateDownload 把真实下载记录置为 failed 并返回；create-workspace 扩展请求取消后正常返回 void，不保证这种业务失败会 throw。取消成功是可达的正常端口结果。
- 风险：handleDownload 等待文件处理完成后，不读取实际下载结果，直接把原生 event.state 发布到 downloadChanged。因此同一份可查询投影已经 failed，事件仍可能是 progressing/completed，甚至后续原生 cancelled 又遮盖原本的本地 failed。事件不是该下载业务事实的可靠投影。
- 实际反例：生产 Workspace/RunEvents，文件端口按现有契约完成处理并保留 failed 记录，未抛异常。原生 completed 到达后输出：

```text
download capture failed after native completion:
{
  "events":[{
    "eventId":"id-00000011:1","streamId":"id-00000011",
    "streamSequence":1,"entityVersion":1,"sequence":1,"at":1000,
    "type":"downloadChanged","kind":"downloadChanged",
    "spaceId":"id-00000004","runtimeId":"id-00000006","epoch":3,
    "entityId":"download-one","pageId":"id-00000005","state":"completed"
  }],
  "snapshotDownloads":[{"id":"download-one","pageId":"id-00000005","state":"failed","receivedBytes":0,"totalBytes":10}]
}
```

- 依据：dev 的真实消费者/公共契约一致性；错误/恢复合同要求保留实际部分成功或失败事实。浏览器完成网络传输不证明 HUHU 已成功接收可用文件。
- 满足条件：文件端口回传最终投影状态，或处理后通过已授权 scope 查询实际下载记录；依据业务终态映射发布事件。failed 必须保持 failed，终态不能被后续原生进度/取消覆写为成功或别的状态。补充正常 progressing/completed/canceled 与配额/本地捕获失败、后续取消通知的回归，核对事件和 snapshot 同一实体状态一致；保持旧 lease/Run 的迟到隔离和无文件名/路径泄漏。

### S-02 / P2：空 poll 的最后响应检查漏掉 stream 回收后裸 cursor 必须 resync 的门禁

- 位置：`src/modules/browser/services/protocol-service.ts:29`–`:31`；实际有效性门是 `services/run-events.ts:35`–`:40`，重建入口 `workspace.ts:1001`–`:1004`。
- 可达前提：兼容调用 events.poll 未提供 streamId，原 stream 当时有效且结果为空；handler 完成后、RPC 最后一轮异步 owner 检查期间，128-stream 配额将该 retired stream 回收，events.snapshot 又为同一原 Run 重建新 stream（requiresId=true）。
- 风险：最后 guard 只检查参数里显式 streamId 或每条结果 row 的 streamId；空数组没有 row，裸 cursor 也没有参数 streamId，因此通过。当前同样的 poll 已应抛 resync_required，迟到响应却以成功空数组表示“没有事件”。回收门禁只在 dispatch 阶段执行，不能保护这次末边界。
- 实际反例：生产 Workspace+Protocol，先取得空兼容 poll；通过 130 次正常 resumeAgent 产生流回收，再对原 Run 调用 eventSnapshot 重建；最后执行原响应的 finalize：

```text
empty poll straddles stream rebuild:
{
  "oldStream":"id-00000011-review",
  "newStream":"id-00000662-review",
  "newDirectPollError":"resync_required",
  "finalResult":[]
}
```

- 依据：最终 transport fence 必须与实际 replay 有效性规则一致；空数据不携带来源身份，不能凭“没有不匹配的 row”证明 cursor 有效。
- 满足条件：在最后同步边界复用实际 cursor/stream 有效性门，或保留并比较内部来源 stream 身份；校验必须覆盖空结果、裸 cursor 和 requiresId/保留窗口规则。无需扩大公开接口或读取实时网页/文件端口。增加末次 await 后回收并重建的空 poll 负例，并保留原 stream 中正常裸 poll、正常显式 stream、显式旧 stream 拒绝和 snapshot 后新 cursor 可继续的回归。

## specification-output

Reviewer: native:/root/review_browser
Axis: specification
Result: request-changes
Input-SHA256: `b235c51ea97acd94581b492f1035be339560d0633be420705e248efc09e688dc`
Observed: AC-010 事件类型和重建主线已接真实消费者，但以下 2 项违背可靠投影与失效 cursor 的明确合同。与标准轴是同两项事实，不重复计为 4 个缺陷。

### R-01 / P2：下载事件和完整投影表达不同的业务终态

- 位置：workspace.ts:1389–1390，完整路径与消费者见 S-01。
- 依据：Spec AC-010 要求 download 等状态可投影；T-04 要求事件和 snapshot 重建一致；Issue #1 §14.4 规定 UI 事件是事实的投影通知，状态事件可靠且有界。
- 差距：文件已因配额/本地捕获失败进入 failed，事件仍直接使用原生 completed/progressing。完整反例与风险见 S-01。
- 满足条件：依据实际文件投影终态发布，验证成功、失败和取消后续通知不相互矛盾，保持 scope/脱敏。

### R-02 / P2：末次边界的旧裸 cursor 没有明确要求 resync

- 位置：protocol-service.ts:29–31，run-events.ts:35–40。
- 依据：Spec AC-010、Ticket T-04 的“失效 cursor 不伪装完整”，Issue #1 §14.4 的保留窗口/快照重建，以及本轮已有“重建 stream 后裸 cursor 拒绝”的兼容语义。
- 差距：直接 replay 正确拒绝同一裸 cursor，迟到空 poll 的 finalize 却返回成功 []。完整生产可达时序见 S-02。
- 满足条件：最后同步响应边界也验证当前 cursor/stream 可用性，包括无 row 情况；正常兼容/显式 stream 行为不回退。

## 已核对的生产链与保护

- 八种固定通知存在：spaceChanged、pageChanged、controlChanged、operationChanged、humanRequest、downloadChanged、runtimeFault、cleanupChanged。Runtime 的早 return 分支已补接缝；Space/Page/Control/Cleanup 通过状态差异投影，操作来自 Ledger 的持久提交后回调。
- eventId、streamId、streamSequence、entityVersion 在当前实现中由同一 stream 的递增版本生成。RunEvents 显式挑选元数据字段，固定 fault code；不将 title/URL/请求 message/文件名/命令或凭据 spread 出站。
- 每 stream 256 环、最多 128 保留 stream；落后窗口、未来 cursor、显式旧 stream、已回收 stream 和重建后裸 cursor 的 dispatch 检查实际存在。S-02 指出的是最后异步边界的空结果缺口，不否定这些检查。
- snapshot 在同一同步读取与 cursor 边界组合投影，发生重入更新会重读，持续重入会 resync_required；不能把旧投影与新 cursor 硬拼。最终 snapshot guard 核对 Run、Space、runtime、stream、runEpoch、generation 与 active。
- 原 Run capability/父连接固定归属仍受 queryOwn 控制；撤权后的 snapshot 清空 pages/requests/downloads，仅保留控制/操作/故障/清理元数据。final poll 在父连接或 Run 失效后过滤 live 种类，没有重新授予网页读写能力。
- 下载 owner 绑定原 execution scope，迟到进度不归到新 Run；request 的 document/epoch 和 resolved 的当前归属校验存在。原 Run 的控制/故障/清理事实在 Space 被移除后仍可查。
- Ledger 通知在 checkpoint 写入/读回后发出，observer 异常被隔离；不改变持久操作结果、不重派副作用。T-03 的 deadline、authority、只读关停与原子回收主体没有被本轮通知代码替换。
- RPC 的 events.snapshot/poll 使用同一 core 输入及响应 schema；源码 CLI 和 MCP 复用 parseEventResult，严格拒绝附加 secret 字段。已读对应真实 Node 子进程测试，未重复其运行。
- 当前产品 docs 的跨票汇总和最终生成资产仍由 Lead 后续集成；本报告不把源码接口新增当作最终文档/生成物已同步。

## reviewer 实际检查与输出

实际执行完整输入 hash、开始/结束代码与来源核验；读取 13 文件及前序依赖/文件接缝；运行 S-01/S-02 两个生产类内存反例；另执行正常 stream/重入/溢出/未来 cursor/secret 投影和 Ledger observer 故障的必要对照。

实验方法沿前轮：读取当前 workspace.test.ts describe 之前的 fixture，替换 vitest import 为简单函数 spy，esbuild stdin/write:false 后 Module._compile；真实 Workspace、Protocol、RunEvents、Ledger 执行。文件/runtime 仍是测试端口，未操作真实网页。finally 释放 gate 并 dispose 工作区，没有写源码或临时生成物。

- S-01 的文件端口正常返回 void，同时让 listDownloads 返回 failed 业务记录；这与生产 create-workspace 扩展在 updateDownload 返回 failed、取消成功时的契约一致。订阅 store，等到 downloadChanged 实际出现后读取 snapshot；没有 sleep。
- S-02 使用真实 resumeAgent→seal/open→128 配额回收→eventSnapshot 重建路径，随后调用真实最终 finalize；模拟的是 RPC 末次异步 owner 检查期间的状态变化，没有绕过 capability，也没有使用假的 stream registry。
- 正常对照实际输出：

```text
normal/explicit poll, reentrant snapshot, overflow/future cursor and secret projection: pass
observer exception after durable commit:
{"states":[{"state":"prepared","durable":true},{"state":"dispatching","durable":true},{"state":"completed","durable":true}],"effects":1,"state":"completed"}
```

正常对照验证新 stream 的兼容裸 poll、有效显式 stream、错误 stream 拒绝、重入 snapshot 读取两次后 version/cursor 一致、300 条事件导致旧 cursor resync、新 snapshot cursor 可继续、未来 cursor invalid，以及显式挑选字段不返回 SYNTHETIC_SECRET。Ledger 对照在每个回调中比对已写 checkpoint 状态后故意抛异常，再执行同票重试，effects 保持 1。

作者提供的 34 files/241 tests、Worker/test tsc/lint/architecture/diffcheck、真实 Node CLI/MCP 结果没有冒充 reviewer 重跑。本轮没有无差别重复已有检查；当前两个反例已经说明绿色数量不能替代末边界与文件业务终态的语义核对。

继续应用已读且未变的 code-review/dev 及相关 source-discovery、risk-review、Fowler、reviewer/evidence/working-tree/reuse、错误/测试可靠性、范围/研究合同。规范来源完整，无跳过轴；未新增界面，ui 不适用。

未运行真实 Chrome/helper/Obsidian/四平台/人工视觉/性能验收，SRC-010 将其交用户执行；未 build 或验证最终生成资产组合，由 Lead 最终串行处理。唯一写入本报告，未改源码、正式状态、旧报告或产物。

唯一缺陷数：2（P2×2）。standards=request-changes；specification=request-changes；skipped_axes=[]。交回后停写。
