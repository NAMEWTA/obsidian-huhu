# T-07 独立双轴审查原始报告

Reviewer: native:/root/review_browser  
Implementer: native:/root/audit_browser  
Mode: native；未参与 T-07 实现，沿用独立 reviewer，未递归派遣。  
Input-SHA256: `8714d694f040912733252753c34a3d544ec0ead82bb3b61b0393b938dda7eef3`  
Observed: 2026-10-27；standards=request-changes；specification=request-changes。3 个唯一 P2，均有独立实际反例；不以作者绿色测试数量替代判断。

## review-input

完整固定对象：[T-07-review-input.json](T-07-review-input.json)。实际对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算 UTF-8 SHA256，得到上述摘要；不是内部 scope.input_sha256。

- working-tree 显式 28 文件，base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；按 T-02-r3 至 T-06-r2 联合前序排除未变主体，不把共同 HEAD 当作未提交实现的完整前序。
- 开始逐项核验 28 文件 after SHA256 与 58 项来源原字节 SHA256，全部匹配。完整 scope、sources、exclusions 由输入对象固定，未修改输入。
- 结束实际重跑相同 `validate-specdev.mjs --review-scope --repo <cwd> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，逐项传入同一 28 个 `--file`：base/head、index SHA256、tracked_diff SHA256、完整 working_snapshot 均 MATCH；58 项来源再验无漂移。
- excluded additions 为本轮输入 JSON、sources/archive-portability-preflight.md、sources/archive-tree-preflight.md；excluded removals=[]。不声称全仓没有范围外工作。Map9 已在输入来源中固定；未改其他票或正式状态。
- 读取作者 T-07 Evidence 的最终停写事实，并沿 source-discovery/code-review/dev/ui、risk-review、Fowler、reviewer/reuse/evidence/working-tree、架构/测试、错误/测试可靠性、范围/研究和 design-contract 审查。已读且摘要未变的规则复用；AC-009、T-07、Issue #1 §11/§13/§14 及前序安全条款、ADR/docs/SRC-010/PAGE-004 来源不缺失，无跳过轴。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: request-changes  
Input-SHA256: `8714d694f040912733252753c34a3d544ec0ead82bb3b61b0393b938dda7eef3`  
Observed: 实际追踪文件服务、账本/期限、DOM/native 最终门、组合输入撤权/取消和完整帧流水线。以下 3 项阻止通过。

### S-01 / P2：下载源校验与删除分离，末次替换仍会被清理并标完成

- 位置：`src/modules/browser/platform/desktop/files/file-service.ts:237`–`:248`，重点 `:243`–`:246`。
- 可达时序：completed 下载已捕获固定副本且 cleanup=pending；清理/重试对原 GUID 路径做 fixedCopy，验证摘要后关闭读取句柄，然后按同一 pathname 发 fs.rm。在最后删除发生前该路径被换成另一份文件，删除没有继续绑定已验证对象。
- 风险：前置的摘要拒绝了“校验之前就已替换”的源，却不能授权删除“校验之后才换入”的对象。当前会删除与固定副本不相符的替换内容，并把 cleanup 标 complete；因此替换源保护没有覆盖真正破坏性的末边界。反例不涉及读取真实用户资料或路径逃出临时根。
- 独立临时磁盘反例：真实 DesktopBrowserFileService，先注入一次 source rm 失败得到 completed/pending；随后重试，在实际 fs.rm(source) 执行前，把另一临时文件 rename 到同一 GUID 路径。真实删除继续完成：

```json
{"case":"source replaced between hash verification and rm","replaced":true,"sourceExists":false,"download":"completed","cleanup":"complete"}
```

- 依据：dev 的文件/恢复归属与末边界检查，risk-review 的检查后修改竞态；T-07 的文件内容/归属可验证和错误恢复合同。已有测试只在 retry 前替换内容，未覆盖这次最后 await/删除边界。
- 最小满足条件：清理必须固定它实际取得并将删除的对象；通过受管 claim/移动及身份/摘要核验等可验证方案，使之后换入原路径的对象不被这份旧清理证明授权删除。无法证明时保留 pending/changed，不伪报 complete。不使用无条件重试 rm 掩盖替换，也不删除已捕获的固定副本。
- 必要回归：删除前一刻替换 GUID 源、来源已缺失后同路径又出现文件，以及 restart/retry 的同样窗口；替换物保留，原 captured file/摘要不变，错误可定位。原正常清理及 source rm/sync 故障后重试继续成立。

### S-02 / P2：元数据 rename 已发生后同步失败，回滚删除被新索引引用的固定副本

- 位置：`src/modules/browser/platform/desktop/files/file-service.ts:157`–`:175`，重点 `:170` 与 `:174`；真实接缝为 persist → `platform/desktop/persistence/private-files.ts` 的 atomicPrivateFile（rename 后还有目录同步/校验）。
- 可达时序：capture 已写入固定副本和下载 cleanup 归属；persist 的 encrypted metadata 临时文件已同步并 rename 成 metadata.sealed，之后目录 sync 或末尾校验抛错。capture 仅根据 await 是否正常返回设置 published，没有区分“完全未发布”与“发布已发生但持久性/确认未完成”。
- 风险：catch 删除内存记录、恢复旧 download，再由外层 catch unlinkManaged 删除固定 payload；磁盘新索引却已引用该 payload。当前进程把结果报 failed，下一次加载会 file_corrupt，阻断整个文件集合恢复。不能把目录 sync 抛错解释成 rename 没发生，也不能因此破坏已经发布的引用目标。
- 独立临时磁盘反例：仅对 capture 发布 metadata 时打开 managed 目录的 handle.sync 注入异常；实际 rename 已执行。恢复 fs 端口后，直接创建第二个服务模拟重启，未先 dispose 第一个服务覆盖其索引：

```json
{"case":"metadata rename published then directory sync fails","injected":true,"result":"failed","inMemoryFiles":0,"dataDirs":[],"restart":"file_corrupt","sourceRetained":"captured"}
```

- 这证明目录项发布已经发生；不声称注入 sync 失败时已证明断电持久性。原下载源仍在，但新索引引用的受管副本已被代码删掉。反例在 POSIX 临时目录运行，Windows 的目录同步路径不同，未声称实机复现。
- 依据：error-handling 的未发生/已发生/未知必须分别保留事实；dev 的持久化/恢复一致性。T-07 要求固定副本与清理归属一起可恢复，不能从一次 Promise 拒绝推出可以无条件删除引用目标。
- 最小满足条件：区分未发布失败与已发布/不确定提交，或在清理前通过权威索引回读/恢复协议确定引用；发布可能发生时保留必要 payload/归属，不能留下指向已删文件的索引。结果可以明确 pending/unknown，不能盲目转成功；重新打开与重试应可对账而不重新捕获或覆盖其他文件。
- 必要回归：metadata rename 后目录 sync/末检查失败，立即重启及再次恢复；断言索引与 payload 不相互破坏、已知固定副本保留、cleanup job 可定位。还应保留真正发布前失败会清理本次未引用 staging 的正常补偿。

### S-03 / P2：同版本静止帧超过 3 秒后没有输入恢复路径，原位输入还因此释放 human lease

- 位置：`src/modules/browser/services/workspace.ts:893`–`:918`，重点 `:901`、`:915`；真实 UI 接缝 `src/modules/browser/ui/SpaceViewer.tsx:643`–`:645` 与 send 的 frame_stale → false。driver.watch 的按需首帧/后续 screencast 没有输入前请求新帧路径。
- 可达前提：runtime/Page/document/viewport/lease 均未变，human 仍有效，只是静止页面没有新画面；最后已展示/ACK 帧超过 3000ms。普通 composition start/text/key 与坐标输入一起因时间直接拒绝。
- 风险：服务既不请求一次当前版本校验/新帧，也不提供输入恢复；新增 InlineInput 把这个 send=false 当成需要 releaseViewer 的失败。用户在静止页面停顿后开始输入就会失去控制，需要另行恢复控制才能再尝试。不能用“等待新画面”提示代替一个实际上没有触发的新帧请求。
- 独立服务反例：真实 Workspace/human lease/FrameBroker，ACK 帧后仅推进合成时钟 3001ms，无版本变化，再发 composition start：

```json
{"case":"unchanged human page after 3001ms without new frame","result":"frame_stale","compositionDispatched":0,"refreshWatchCalls":0,"control":"human"}
```

- 独立 UI 接缝反例：真实 SpaceViewer/InlineInput/Provider/共享 UI 的 happy-dom 环境，给 humanInput 端口返回上面的生产 frame_stale 拒绝。页面提示并调用 releaseViewer：

```json
{"case":"InlineInput receives production static-frame refusal","error":"当前画面已过期，请等待新画面后重试。","releaseCalls":1}
```

- 两个接缝分别验证，未声称用真实 Chromium/OS 输入法复现。3 秒 TTL 本身是继承代码；本票完整旧帧/原位输入合同仍要求闭合该路径，新增自动 release 又把普通帧龄拒绝变成撤权。
- 依据：Issue #1 §11.3 明确静止页面不能只因最后帧时间较久而永久拒绝输入，可请求当前版本校验/新帧；AC-009/T-07 的原位输入及不错误干扰人的控制。
- 最小满足条件：区分真实 runtime/document/viewport/lease 失效与单纯帧龄老化。后者有有界校验/请求新帧及明确可继续的用户路径，不能自动复用导航后的旧坐标，也不能对未知已派发文本盲目重发。原位输入不要把仅可恢复的静止帧状态一概升级为 lease 释放；真正组合取消不确定时仍需 blocked/撤销。
- 必要回归：静止且同版本页面停顿后开始/继续 composition 和文本输入，验证有界刷新/恢复，不错误撤权；并保留导航/尺寸/旧 lease/失活 viewer 的硬拒绝、取消确认以及不重发未知提交。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: request-changes  
Input-SHA256: `8714d694f040912733252753c34a3d544ec0ead82bb3b61b0393b938dda7eef3`  
Observed: 规范依据为 AC-009、T-07、Issue #1 §11.2–11.5/§13.1–13.2、恢复/安全条款与 PAGE-004。以下是同三个唯一缺陷的规范差距，不重复计数。

### R-01 / P2：重试清理的证明没有绑定实际被删除的下载源

位置与反例同 S-01。AC-009 要求文件内容与归属可验证，T-07 要求中断保留实际事实及旧授权不可复用；下载固定 GUID 映射不授权删除校验之后换入的另一份内容。满足条件为最后删除仍归属于已验证的源对象，替换或无法确认时保留 pending，不破坏捕获副本。

### R-02 / P2：部分发布失败会破坏固定副本与清理归属的可恢复一致性

位置与反例同 S-02。AC-009、T-07 的中断/摘要/归属，以及 Issue #1 §13.2 的受管文件关联与恢复合同要求保留已发生事实。当前 metadata rename 后 sync 失败会删掉索引引用目标，重启 file_corrupt；未形成“固定副本和 cleanup 同事务”的可靠失败保证。满足条件为发布已发生/未知时可对账、索引与 payload 不相互破坏，不虚报未发生或无条件重捕获。

### R-03 / P2：静止页的输入能力没有达到原文明确边界

位置与反例同 S-03。Issue #1 §11.3 的静止页原条款和 §11.4 的可靠文本/原位 composition，属于本票 AC-009 输入/旧帧范围。单纯 3 秒帧龄在有效 human 控制中直接拒绝且不触发校验/新帧，继而 release viewer，遗漏该合同。满足条件为受当前版本和权限约束的有界恢复；不要求放宽真的旧帧或宣称平台 IME 已验收。

skipped_axes=[]。

## 已核对的生产链与成立部分

- 上传仍只接受 fileId，源文件经私有固定副本/大小/摘要检查；grant 限原 Space 与 agent Run 或 human viewer/epoch，消费一次，重启不恢复 grant。consumeUpload 的实际 hash await 后再次查 TTL，消费证明保存更窄 expiresAt；多个文件取最早期限。
- composition adapter 把 path+期限证明交给 Workspace；Ledger remaining 回调在排队/验证/dispatch-intent 写后取更早期限，明确没有调用 dispatch 的末 guard 失败为 cancelled_before_dispatch。已 active/final 的 operationId 仍复用原结果，不重新 consume 或重派。进入 dispatch 后失败保守 unknown，没有新增网页重试。
- 上传 authority 的 expiresAt 只缩短原 lease，经 Host/Worker/Driver/NativeCdp 的 DOM await 持续检查；wire 带 deadlineAtMs，native gate 在写入 Chromium pipe 前检查原 lease 和该 deadline，不能用较晚证明延长租约。DOM.describeNode 后过期不调用 DOM.setFileInputFiles，已消费票据不自动复活。真实上传服务端/Chromium 文件行为仍待用户验收。
- 下载完成的正常路径把固定 file 与 cleanup pending 放入同一加密 metadata 内容；source rm 或下载源目录 sync 失败保持 completed/pending，重启能读回该归属、重试不重捕获，wrong Space/重试前已换内容会拒绝。S-01/S-02 是该主体之外的末删除与部分发布失败缺口。
- InlineInput 是实际本地 textarea editable，仅 viewer 获得焦点后使用；composition start/update/end/selection/cancel 经 trusted schema → Workspace humanInput/递增序号/当前帧 → Worker → Driver → CDP → native gate；未暴露为 Agent raw input capability。fallback 文本区保留，不借系统 clipboard 注入，不捕获 sibling note 输入。
- native gate 记录 composition 原 session，仅 human 可启动；revoke 先独立 fence，仍有组合时不发新 writer。maintenance 特例只允许在无 lease 时对已记录 session 发空串取消，不开放一般 Input 或旧 Run 权限。Driver 等待已接纳 preedit 及取消 ACK；失败/文档变化/不确定结果不重试去操作另一个 document，控制保持 blocked/必要时停止。
- Host 启动检查 composition/dispatchDeadline 能力，旧 helper 缺字段明确拒绝并给更新运行包提示；不是默默忽略新增安全要求。T-06 的 native ACK 后 Worker 有界收敛和旧结果隔离仍在。
- 草稿 generation 按 lease/控制/可见性/runtime/document 清理，旧异步完成不清新租约下相同文字；InlineInput key 随控制/document 重建，旧 instance 的 failed 回调不能释放新 lease。S-03 指出的是仍有效控制下静止帧失败路径。
- 已实际运行 10000 合成帧的生产 Worker→adaptRuntime→FrameBroker→latestFramePresenter 测试：慢 host credit 和慢 viewer 分别限制 inflight/latest，快 observer 及 fault/status 不被等待，释放后只呈现第一/最新帧。此为真实 TS 组合链和合成数据，不声称实际 IPC 零拷贝、实机 RSS/p95 或真实 Chromium 性能已验。
- 外部依据实际核对 [固定 CDP schema](https://github.com/ChromeDevTools/devtools-protocol/blob/7245ec551bc9d450170193456ab3965bb7e716cb/json/browser_protocol.json) 的候选/取消/selection/insertText 字段，并最终经官方 Gitiles `?format=TEXT` 读取 [固定 input_handler.cc](https://chromium.googlesource.com/chromium/src/+/8f93c3443faacdb1096ada43a496bb07238c3137/content/browser/devtools/protocol/input_handler.cc)：InsertText 调用 ImeCommitText，文本转 UTF-16，组合路由到 focused widget。初次 web 访问失败不冒充已读取，后续原文成功读取才用于判断。使用处保留这些引用与 [noVNC editable 参考](https://github.com/novnc/noVNC/blob/e8b5024d4603587b29ffede4fbd28b1fa2939829/app/ui.js#L1657-L1717)；没有发现引入其代码/依赖的证据，editable 参考不替代本项目行为测试。
- PAGE-004 继承 DESIGN revision2/digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c`；恢复与输入反馈使用既有 UI/t()。真实 390/1440、明暗、焦点/候选窗、OS IME、主窗/popout 与平台体验未运行。

## reviewer 实际实验、命令与未验证项

三个独立反例都执行真实生产类，未改生产代码：

- 下载实验读取 file-service.test.ts fixture 前缀，仅在内存替换 vitest spy，esbuild stdin/write:false 后 Module._compile。使用真实 FileService/SecretProtector 测试端口/临时磁盘；只在精确 fs.rm 前替换合成源，或精确 metadata rename 后目录 sync 注入错误。故障恢复后回读文件、内存和新服务 ready 结果；finally 恢复 fs 端口、dispose 并删除合成根。
- 静止帧实验读取 workspace fixture，在真实 human lease/已 ACK 帧上只推进合成时钟，观察 runtime 调用和 watch；UI 对照用真实 SpaceViewer/InlineInput 的 happy-dom 内存 bundle，业务端口返回服务已证的 frame_stale。两接缝分开，不声称完整真实浏览器 E2E。
- 输入/native/背压的正常和负例实际执行如下，所有源码/临时 bundle 保持 write:false；纯 Rust 测试只在 /tmp 编译单元测试，不启动 helper 集成或 Chrome。

实际命令与原始结局：

```text
pnpm exec vitest run src/modules/browser/platform/desktop/files/file-service.test.ts src/modules/browser/platform/desktop/runtime/driver-ime.test.ts src/modules/browser/services/stream-pipeline.test.ts src/modules/browser/ui/SpaceViewer.dom.test.tsx src/modules/browser/core/protocol.test.ts
Test Files 1 failed | 4 passed (5)
Tests 5 failed | 32 passed (37)
Exit 126；文件服务 5 个用例各报 5000ms timeout。

pnpm exec vitest run src/modules/browser/platform/desktop/files/file-service.test.ts
Test Files 1 passed (1)
Tests 16 passed (16)
Exit 0；Duration 2.67s。

pnpm exec vitest run src/modules/browser/platform/desktop/runtime/driver-observation.test.ts src/modules/browser/services/workspace.test.ts src/modules/browser/services/operation-ledger.test.ts -t 'upload|dispatch-intent|last.*dispatch|pre-dispatch'
Test Files 3 passed (3)
Tests 5 passed | 87 skipped (92)
Exit 0。

CARGO_TARGET_DIR=/tmp/huhu-review-t07-target cargo test --manifest-path native/browser-runtime/Cargo.toml
11 passed；0 failed；Exit 0。
```

第一次超时的 5 例为 remove 清理失败恢复、并发 GUID 导出、wrong-Space removal、同名上传、per-file directory 替换；隔离重跑同文件 16/16 通过，未复现该 timeout，没有证据确定其根因，也没有把它当作已修复或归因为环境。它与作者历史的临时缓存 ENOENT、合成 framing 失败是不同观察；后两者未被 reviewer 复现，不虚构共同根因。本次三项 findings 来自单独确定性反例，不依赖这些 timeout。

作者全浏览器/CLI、末次局部、types/lint/architecture/i18n/diffcheck 回执未冒充 reviewer 重跑。未因为已有绿色回执省略 actual 负例，也没有为了重复全套扩大测试。

未运行真实 Chrome/helper 集成/Obsidian/四平台/OS IME/候选窗/视觉/性能，不读取真实用户资料/账号/系统秘密；按 SRC-010 由用户验收。未构建插件或发行生成物，Lead 最终串行集成。cargo 仅为已授权纯逻辑单元测试，target 在 /tmp。唯一写入本新报告，未改源码、正式 Evidence/Ticket/状态、冻结输入或旧报告。

最终：唯一缺陷 3（P2×3）；standards=request-changes；specification=request-changes；skipped_axes=[]。交回后停写。
