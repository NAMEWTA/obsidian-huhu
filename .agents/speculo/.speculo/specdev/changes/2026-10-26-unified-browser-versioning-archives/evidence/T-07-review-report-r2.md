# T-07 repair-1 独立双轴复审原始报告

Reviewer：native:/root/review_browser（gpt-6.1-sol / high）；Implementer：native:/root/audit_browser。独立身份延续初审，未参与实现或修复，未再派遣。Lead：native:/root。Mode：native；review_mode：working-tree。

本轮标准轴 **pass**，规范轴 **pass**。初审三个唯一 P2（S-01/R-01、S-02/R-02、S-03/R-03）均闭合；本轮没有新增可确认 finding。结论限固定交付的代码审查和实际执行的自动接缝，真实宿主/平台/视觉/性能验收仍未运行，不表示 Ticket 已完成全部人工验收。

## review-input

完整固定对象为 [T-07-review-input-r2.json](T-07-review-input-r2.json)，包含原始完整 `scope`、59 项 `sources` 和 `exclusions`；未改写或缩减该对象。实际对文件执行 `JSON.parse` → `JSON.stringify`，按 UTF-8 计算完整对象 SHA256：

`c6219c36d95c78a25c89df8eae0e9ae5578e1ef5ba65db83721a321db53514b8`

这不是 scope 内部 input_sha256。base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；显式 28 个完整交付文件，联合前序仍为 T-02-r3/T-03-r2/T-04-r2/T-05-r2/T-06-r2，Map9。

开始核验结果：28 项 working_snapshot.after 原字节 SHA256 全匹配；59 项来源原字节 SHA256 全匹配，drift=[]。与初审冻结输入逐路径比较，相对初审实际变化恰为以下 10 路径：

- `src/modules/browser/core/files.ts`
- `src/modules/browser/i18n.ts`
- `src/modules/browser/platform/desktop/files/file-service.ts`
- `src/modules/browser/platform/desktop/files/file-service.test.ts`
- `src/modules/browser/services/workspace.ts`
- `src/modules/browser/services/workspace.test.ts`
- `src/modules/browser/ui/BrowserActionError.tsx`
- `src/modules/browser/ui/InlineInput.tsx`
- `src/modules/browser/ui/SpaceViewer.tsx`
- `src/modules/browser/ui/SpaceViewer.dom.test.tsx`

其余 18 路径逐字节相同，含两个 native 文件。实际回读初审原始报告 [T-07-review-report.md](T-07-review-report.md) 及作者 T-07 Evidence 的 repair-1 最终回执；沿用不变代码的既有检查事实，不把初审 request-changes 整体复用成 pass。两个受影响轴均重新判断，并重演三个原反例。code-review/dev/ui、风险、错误与测试可靠性、scope/reuse/design 等既读规则来源均经摘要复验后复用，重新读取相关技能入口、risk-review/result-reuse/review-evidence 及当前票、原条款和消费者。

结束实际用同一 28 个 `--file` 重建 scope：

```text
node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --review-scope --repo <当前工作区绝对路径> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa [逐项同一28路径的 --file]
base_sha MATCH
observed_head MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
working_snapshot MATCH
59 sources: sourceDrift=[]
canonicalSHA: c6219c36d95c78a25c89df8eae0e9ae5578e1ef5ba65db83721a321db53514b8
```

首次结束核验的 excluded additions：本轮 r2 input、`evidence/T-21-review-input-r3.json`、`sources/joint-build-preflight.md`；excluded removals=[]。报告写入后再验的 excluded additions 完整集合为本轮 r2 input、本新报告、`evidence/T-21-review-input-r3.json`、`evidence/T-21-review-report-r3.md`、`evidence/T-22.md`、`sources/joint-build-preflight.md`；removals 仍为空，代码及 59 来源仍全匹配。范围外工件变化不等于本票代码/来源漂移，也不声称全仓没有其他工作。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: pass  
Input-SHA256: `c6219c36d95c78a25c89df8eae0e9ae5578e1ef5ba65db83721a321db53514b8`  
Observed: 完整固定 28 路径及实际依赖按风险复核，10 个修复路径和新增恢复消费者实读；原三项均在生产接缝独立反例中闭合。findings=[]。

### S-01 闭合：先取得源对象，只删除 claim

`platform/desktop/files/file-service.ts:258`–`:287` 的清理先持久化当前固定副本/cleanup 归属，使用受管下载目录内由 fileId 决定的私有 claim 目录。若没有既有 claim，就原子 rename 当前 GUID 源到 claim；随后的摘要核验和删除只针对 claim。原 GUID 后来换入的对象不会被旧证明授权删除。最后原 GUID 仍有对象则拒绝 complete、保留 pending；changed claim 尝试无覆盖恢复，原位已有新对象时保留 claim，不能覆盖新对象。

独立重演初审末次删除边界：实际 fs.rm(claim) 执行前，另一个合成文件 rename 到原 GUID 路径；同一真实 FileService 正常走过捕获和清理，再直接重开并 retry。结果为 completed/pending，replacement 内容保留，retry=file_changed，固定副本仍只有原一个。没有继续执行 fs.rm(GUID)。

新增恢复边界也独立执行：真实 rename 源到 claim 后注入中断，并在原 GUID 放入新对象；重开使用同一 fileId/claim 定位。旧 claim 摘要正确时只删旧 claim、仍因新 GUID 保留 pending；claim 内容已变时 claim 与新 GUID 都保留、file_changed。固定副本 ID 不变，未重新捕获。25 项实际文件测试还覆盖 claim 前中断、原物缺失后新到、remove/sync 故障、重启、wrong Space 与旧摘要等边界。未把临时目录模拟恢复称为断电或实机文件系统证明。

### S-02 闭合：异常后认证回读，可能引用则保留并返回 unknown

`file-service.ts:152`–`:196` 在原子元数据写开始前转 publication=unknown，只有认证读取权威 metadata 并确认本次随机 fileId 未被引用，才允许未发布补偿。认证失败保留 unknown；已引用或 unknown 都保留 payload 和内存 cleanup 归属，并抛 `file_publication_unknown`，不向首次调用返回成功。`updateDownload` 的 `:250` 继续上抛这个错误，不覆盖成 failed 或重新捕获。原文件路径/Scope/grant 权限未被放宽。

独立重演实际 metadata rename 已发生、后续 managed 目录 handle.sync 抛错的原反例；也执行同边界加一次权威读取不可读。两者均返回 file_publication_unknown，内存固定副本仍在；恢复 fs 端口后，不先 dispose 原服务，直接创建新服务读盘，ready 成功、相同文件和 completed/pending cleanup 可见。显式 retryCleanup 后 complete，副本数量保持一。这里确认的是 rename 已发生且引用目标未被破坏，不推导 sync 抛错时的断电持久性。

相反，实际 metadata rename 之前就拒绝、认证旧索引证明未引用时，本次 payload 被补偿，内存/新服务文件列表为空，data 无悬挂分配。原三态区分未被“全部保留”替代，也未把读取失败解释成空索引。

恢复消费者实读 `services/create-workspace.ts:159`–`:210`、Workspace.handleDownload/listFiles/listDownloads/retryCleanup、BrowserWorkspace 文件抽屉与 cleanup 提示：首次 publication_unknown 从文件端口拒绝，事件链落 runtimeFault；固定内容及 pending cleanup 可以查询，用户显式清理重试先持久化索引再动源。原 terminal 重复路径复用已有 fileId/状态及 error，不进入 capture；unknown 没有产生可再次消费的上传 grant。用户删除固定文件也先尝试 pending cleanup，不能跳过已知归属。新增错误码在所属 en/zh 词典和 BrowserActionError 注册，不输出路径或秘密。

### S-03 闭合：帧龄只触发有界当前版本校验，await 后再验权限

`services/workspace.ts:884`–`:943` 先继续硬拒绝 runtime/Page/document/viewport/epoch/旧坐标序号不符的帧；单纯超过 3000ms 的已 ACK 帧改为在原 actions 队列内做只读 interactive observe（maxNodes=1、maxBytes=1024），由 Workspace host scheduler 设 1500ms 截止。observe 后重新 human 校验，再核对 observation 的 runtime/document/viewport/epoch/Page/Space 与原帧，首次 execute 前再查当前 Page/version。超时只拒绝这次尚未派发的输入，不补发迟到文本；只读 observe 的迟到结果不会再次调用 execute。定时资源 finally 释放。

独立真实 Workspace/human lease/FrameBroker 实验：ACK 后仅推进合成时钟 3001ms，composition start 成功派发一次、observe 一次、仍是 human。分别在 observe await 内改变 document、viewport、撤租约、释放 viewer、停止 runtime：全部零 input execute。独立触发宿主 scheduler 1500ms 回调得到 frame_stale，随后放行旧 observe，仍零 execute。每个实验均记录同一个 1500ms deadline 和一次 timer 取消，不靠等真实页面产生新帧。

UI 消费者为真实 SpaceViewer.send 和 InlineInput。`SpaceViewer.tsx:256`–`:279` 对可恢复 frame_stale 不释放仍有效 human lease；对不确定 composition cancel 仍 releaseViewer，让既有原 session 取消 ACK/blocked 链收敛。旧 async 继续比较原 lease，InlineInput 的控制/document key 和本地 draft generation 未放松。`InlineInput` 不再把每个 send=false 自动当作释放控制；blur 取消仍显式送入带 settleFailure 的可信入口。

独立 happy-dom 真实组件接缝将 humanInput 首次拒绝为 frame_stale，releaseViewer=0；随后真实 blur cancel 拒绝为 outcome_unknown，releaseViewer=1。没有把 OS composition 或真实 Chromium 当作已测试。

### 其余适用标准风险

不变 18 路径的字节与来源/配置相等，复用初审所记录的上传 grant/单调期限/账本去重/DOM 后最终 gate、native composition 原 session 取消、旧 helper 能力拒绝及 10000 帧生产组合链证据；本轮没有不必要地重跑 Rust 或全套。修复没有添加 Agent raw input、主线程网页脚本/页面写入、系统 clipboard 捷径、跨区导入、新依赖或持久协议删减。相对输入的范围/秘密处理/生命周期检查未发现新增可确认风险。不变链的实际覆盖与限制仍见原报告，不扩大为真实平台性能或 native 集成保证。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: pass  
Input-SHA256: `c6219c36d95c78a25c89df8eae0e9ae5578e1ef5ba65db83721a321db53514b8`  
Observed: AC-009、T-07、Issue #1 §11.2–11.5/§13.1–13.2 及权限/恢复条款、ADR/docs/SRC-010/PAGE-004 的代码范围重新判断；三项原规范 finding 闭合。findings=[]；skipped_axes=[]。

- **R-01 闭合**：AC-009 文件内容与归属证明落实到破坏性删除所用对象；原 GUID 发生替换或 claim 内容不符时保留新对象和可定位 pending。原下载固定副本/摘要/Scope 不变。证据与 S-01 相同，不重复计唯一缺陷。
- **R-02 闭合**：中断时不再从 Promise 拒绝推定未发布，不删除可能被权威索引引用的 payload；首次结果明确 unknown，认证未发布仍能补偿，重开/显式 cleanup 能对账而不重新捕获网页结果。实现满足本票代码范围的部分发布和恢复合同。断电、平台文件系统差异仍未验证。
- **R-03 闭合**：Issue #1 §11.3 明确的静止页面恢复路径实际进入生产 humanInput，旧帧版本与当前权限仍受检查；§11.4 原位 composition/可靠文本入口不因单纯帧龄错误撤权，也不重试不确定已派发文本。真正 cancel 不确定仍走撤权/blocked 原链。
- **AC-009 其他分项**：一次性上传内容固定/Run 或 human scope/期限，从 composition→Workspace→Ledger/Worker→Driver→native deadline gate 未退化；下载仍使用目标 GUID 和明确业务状态/摘要，没有猜文件或后台打开；InlineInput 仍只在当前 human viewer 焦点使用，fallback 文本区保留、host note 不被全局捕获；背压保持 host 与 viewer 两条 ACK 和有限 inflight/latest，状态通道不等待最慢像素消费者。相同字节链复用初审真实合成测试证据，不声称本轮重跑。
- **设计与产品反馈**：PAGE-004、DESIGN revision2/digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c` 和批准来源保持。新增 unknown 提示为所属 t()/en/zh，恢复入口沿既有文件抽屉；DOM 检查限行为。390/1440、明暗、主窗/popout、原生候选窗及视觉体验仍由用户验收。

## 实际实验、命令与原始结局

独立实验均以 Node stdin 的 esbuild `write:false` 内存 bundle 加载实际生产类/组件；fixture 仅替换 vitest spy/注册器，不修改生产源码。文件实验使用真实 FileService、TestBrowserProtector 与自动创建的合成临时磁盘根。精确注入 fs.rm/rename/目录 handle.sync/一次认证读取失败，终于恢复原 fs 端口并删除本实验根；新服务读盘之前没有 dispose 原服务去覆盖索引。以下为本轮实际 stdout（随机 fileId 用“same original ID”归纳，其他字段原样）：

```json
{"case":"last deletion boundary swaps GUID occupant","hit":true,"state":"completed","cleanup":"pending","replacement":"replacement","retry":"file_changed","fixedCount":1}
{"case":"metadata rename then sync rejects","unreadable":false,"hit":true,"readFailed":false,"result":"file_publication_unknown","memoryFiles":1,"restartFiles":1,"restartState":"completed","restartCleanup":"pending","afterRetry":"complete"}
{"case":"metadata rename then sync rejects","unreadable":true,"hit":true,"readFailed":true,"result":"file_publication_unknown","memoryFiles":1,"restartFiles":1,"restartState":"completed","restartCleanup":"pending","afterRetry":"complete"}
{"case":"authoritative old index proves unpublished","result":"synthetic before rename","memoryFiles":0,"dataDirs":[],"restartFiles":0}
```

claim 后中断的两个实际结果：

```text
changed=false: retry=file_changed, source='new GUID occupant', claim=ENOENT,
               fixedIds=[95ea4007-3d75-4c42-b48b-fcd884d3dff5], originalFileId=95ea4007-3d75-4c42-b48b-fcd884d3dff5
changed=true:  retry=file_changed, source='new GUID occupant', claim='changed claim',
               fixedIds=[927ba392-0e7d-483c-b4d0-a8d0ef2d763a], originalFileId=927ba392-0e7d-483c-b4d0-a8d0ef2d763a
```

真实 Workspace 独立内存实验读原 fixture 前缀，在 ACK 帧/human lease 上仅推进合成时钟；对 observe await 精确挂闸，按下表施加单变量。挂闸/定时回调控制只是合成端口，不是实际 Chrome 或系统时钟证明。

| observe 内边界 | 返回 | input execute 次数 | observe 次数 | scheduler ms / cancel 次数 | 结束控制 |
|---|---|---:|---:|---|---|
| 无变化，静止 3001ms | dispatched | 1 | 1 | 1500 / 1 | human |
| document 变化 | frame_stale | 0 | 1 | 1500 / 1 | human |
| viewport 变化 | frame_stale | 0 | 1 | 1500 / 1 | human |
| pause 撤权 | human_lease_expired | 0 | 1 | 1500 / 1 | paused |
| release viewer | human_lease_expired | 0 | 1 | 1500 / 1 | paused |
| stop runtime | runtime_not_ready | 0 | 1 | 1500 / 1 | paused |
| 触发 deadline，再放行旧 observe | frame_stale | 0 | 1 | 1500 / 1 | human |

真实 React/SpaceViewer/InlineInput/TestProviders 的独立 happy-dom 内存实验（先 takeover/帧 ACK，再操作 composition/blur）：

```json
{"case":"real InlineInput consumers","frameStaleReleaseCalls":0,"unknownCancelReleaseCalls":1,"inputCalls":2}
```

以上三个 stdin 实验命令均 exit0。文件实验注入点位于实际生产调用前/后而非只模拟最终返回；Workspace 实验确认的是是否调用执行端口，DOM 实验确认的是是否释放当前控制，未冒充 native 网页端到端。

随后按风险串行实际运行：

```text
pnpm exec vitest run src/modules/browser/platform/desktop/files/file-service.test.ts
Test Files 1 passed (1); Tests 25 passed (25); exit0; Duration 1.35s.

pnpm exec vitest run src/modules/browser/services/workspace.test.ts -t 'static|download|upload|converge|viewer|input'
Test Files 1 passed (1); Tests 19 passed | 43 skipped (62); exit0; Duration 746ms.

pnpm exec vitest run src/modules/browser/ui/SpaceViewer.dom.test.tsx
Test Files 1 passed (1); Tests 11 passed (11); exit0; Duration 1.68s.
```

本轮所跑定向没有出现超时、file_closed、ENOENT 或 owned_by_other_instance；这不证明历史间歇失败的根因已定位或已修复。作者 Evidence 保留组合超时/file_closed、tmpfs 361/362、同环境隔离 5/5、最终 `/tmp` 串行 362/362 的实际差别，本轮不把串行通过或空间恢复解释为共同根因。初审 reviewer 组合 timeout 与隔离通过也保留原报告，不撤回该事实。未重复作者全套、types/lint/i18n 或不变 Rust，作者回执未冒充本轮执行。

## 未验证边界与交回

未运行真实 Chrome/helper 集成、Obsidian、Windows/macOS/Linux/四平台、OS IME/候选窗、主窗/popout 实机、视觉或性能验收；不读取真实用户资料/账号/系统秘密，不构建插件/发行生成物。按 SRC-010 由用户负责真实验收，Lead 负责最终生成物串行集成。合成临时磁盘和目录 sync 注入不证明断电持久性；tmpfs 历史不替代磁盘恢复证明。官方 CDP/Chromium/noVNC 固定引用没有变更，本轮复用初审已实际读取的原文与使用处来源，不声称重新联网读取。

唯一持久写入本新报告；未改源码、正式 Evidence/Ticket/Map/状态、输入、原报告或其他票工件。无新增可确认 finding；原三项闭合；standards=pass；specification=pass；skipped_axes=[]。交回后停写，正式状态由 Lead 核验后处理。
