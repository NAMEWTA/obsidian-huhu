# T-04 repair-1 独立双轴复核原始报告

Reviewer: native:/root/review_browser  
Implementer: native:/root/audit_browser  
Mode: native；延续原独立 reviewer，未参与实现或修复，未递归派遣。  
Input-SHA256: `b192d839451b673485ae377028695d2885b5444ba91f2b01ee59b492817ffe70`  
Observed: 2026-10-27；standards=pass；specification=pass；新 findings=0。

## review-input

完整固定对象：[T-04-review-input-r2.json](T-04-review-input-r2.json)。实际对整个对象执行 `JSON.parse` → `JSON.stringify` 并计算 UTF-8 SHA256，得到上列摘要；没有把内部 scope.input_sha256 当成完整输入摘要。

- working-tree 显式 13 文件，base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；保留 T-02-r3 与 T-03-r2 联合前序语义。13 文件清单、完整 scope、36 项来源及 exclusions 均由输入对象固定。
- 开始逐项核验 13 文件 after SHA256 与 36 份来源原字节 SHA256，全部匹配。相对首轮 T-04，只有 workspace.ts、protocol-service.ts、workspace.test.ts 三文件的 after 摘要变化。新增来源是原始首轮报告。
- 结束实际重跑 `validate-specdev.mjs --review-scope --repo <cwd> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，逐项传入同一 13 个 `--file`：base/head、index SHA256、tracked_diff SHA256、完整 working_snapshot 均 MATCH；36 项来源再次核验无漂移。
- 最后一次范围核验的 excluded additions 仅为本轮 T-04-review-input-r2.json，excluded removals=[]；inventory 不因该新增未跟踪输入而宣称相同。本报告随后作为唯一允许的新输出写入。
- 已读且摘要未变的 code-review/dev、source-discovery、Fowler、risk-review、reviewer-contracts、result-reuse、review-evidence、working-tree-review、架构/测试、范围/研究及错误/测试可靠性规则继续适用。本轮回读入口与原报告，未创建新 Workflow 或正式状态。无界面变更，ui 不适用。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: pass  
Input-SHA256: `b192d839451b673485ae377028695d2885b5444ba91f2b01ee59b492817ffe70`  
Observed: 原 S-01/S-02 均经生产调用链及必要反例复核闭合；未发现新的可达缺陷。具体检查如下。

### 原 S-01 已闭合：以实际文件业务状态发布下载事件

- 当前位置：`src/modules/browser/services/workspace.ts:1391`–`:1397`。handleDownload 在原 owner scope 中等待文件处理，随后通过相同 scope 查询记录，同时匹配 download id/pageId；状态取自记录，in-progress/canceled 映射到 progressing/cancelled，completed/failed 保留。
- 生产接缝仍是 create-workspace 的 download adapter → DesktopBrowserFileService.updateDownload。后者对已终态记录直接返回原结果，因此配额或捕获失败后的迟到原生 cancelled 不会改写 failed；本轮没有修改 FileService 终态规则或放宽 scope。
- `workspace.ts:1320`–`:1327` 与 `:1370`–`:1373`：处理失败、查询异常或缺记录没有证明下载业务失败，只发布固定 code 的 runtimeFault，不伪造 downloadChanged/failed，也不泄露异常消息。取消请求仍按既有失败清理路径执行。
- 下载 owner 仍按 runtimeId/id 固定，发布时检查原 Run active、expiresAt、runtimeId 和 event epoch；替换 Run 不继承旧下载事件。处理后 runtimeId 检查仍保留，没有通过查新 Run 的记录来覆盖原 owner。
- 独立原反例重演：文件端口正常返回，同时其已授权投影是 failed；原生 completed 与后续 cancelled 两次事件均得到 failed，snapshot 同为 failed。再令查询分别返回空记录、抛出带私有字符串的错误，两次都仅得到无 state 的 runtimeFault，输出不含私有字符串。
- 实际定向测试使用真实临时 DesktopBrowserFileService 覆盖 progress、complete、cancel、quota、capture 五种结果；核对终态后取消、原 Run/epoch 迟到隔离和文件名/路径脱敏。另两个用例覆盖记录缺失/查询异常。全部通过。

### 原 S-02 已闭合：空 poll 在最后同步边界也验证完整 replay 门禁

- 当前位置：`src/modules/browser/services/protocol-service.ts:29`–`:34`。finalize 同步调用 workspace.events，复用 RunEvents.poll 的 stream 存在、requiresId、显式 stream 身份、合法 cursor 和保留窗口检查；该调用在最终异步 ownership 检查之后执行，不读 live page/file 端口。
- 重读返回的 rows 被丢弃；响应仍使用此前形成并经 schema 解析的 rows，继续核对各行来源身份，撤权时继续筛为 metadata 类型。因此重验不是把末边界新到达的事件拼入旧响应。
- 独立原反例重演：取得正常空裸 poll 后，通过真实 resumeAgent 130 次触发保留 stream 回收，再对原 Run snapshot 重建。最终裸 cursor 与显式旧 stream 都得到 resync_required；新 snapshot 的显式 stream/cursor 可继续得到 []。重建前正常裸 poll 和显式 poll 均通过。
- 保留窗口对照：原空响应形成后只新增一行时 finalize 仍返回原 []，直接 replay 可读到该新行；累计新增 257 行后，裸和显式旧 cursor 的 finalize 都拒绝为 resync_required；新 snapshot cursor 恢复正常。

### 其余交付与前序保护

输入证实 core/API/schema、RunEvents、Ledger、CLI 及其他测试源码均与首轮相同；本轮回读三文件修复及其调用边界，结合首轮已记录的完整链检查，未发现回退：八类事件与标识/版本字段、256 环和 128 stream、snapshot 重入边界、旧 Run metadata 查询、父连接最终筛选、旧 request epoch 隔离、清理后事实查询和字段白名单均仍成立。Ledger 持久后通知与异常隔离、T-03 的 remainingMs/authority/readonly/去重主体未改，不存在本轮引入的重新派发网页副作用路径。没有新增公共接口、架构依赖或产品文案。

Findings: []。原 S-01、S-02 关闭，不保留为开放问题；未限制新发现数量。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: pass  
Input-SHA256: `b192d839451b673485ae377028695d2885b5444ba91f2b01ee59b492817ffe70`  
Observed: 按 Spec AC-010、Ticket T-04、Issue #1 §14.4 及本轮固定 ADR/docs/SRC-010 核对；原 R-01/R-02 均闭合，没有新增规范差距。

- 原 R-01：事件依据实际业务下载投影发布，配额/捕获失败与 snapshot 一致；终态后原生取消继续保留业务终态。未知结果仅发故障通知，不把查询故障当作已知 failed。满足状态事件作为事实投影的要求，scope 和脱敏保持。
- 原 R-02：最终 transport guard 复用完整 cursor/stream 门禁，空结果没有行也不会绕过 stream 回收/重建及落后窗口检查；失效 cursor 明确 resync。原兼容裸 cursor、有效显式 stream、新 snapshot 后续 cursor 均保留；最终重读不会混入后来事件。
- 首轮其他规范检查的代码与来源摘要未变，复核修复接缝没有改变 RPC/CLI/MCP 共用输入输出 schema、撤权后仅元数据、持久操作事实与恢复边界。T-02/T-03 未变依赖按固定前序证据复用，不把其真实宿主未验事项改写为已通过。

Findings: []。原 R-01、R-02 关闭。规范轴未跳过；skipped_axes=[]。

## reviewer 实际验证与边界

实际执行：完整输入摘要；开始/结束 13 文件、36 来源校验；相同选择的 review-scope 重建；原报告与实际修复/消费者追踪；独立生产 Workspace/Protocol/RunEvents 内存反例及必要对照。

独立反例沿原方法读取 workspace.test.ts 的 fixture 前缀，仅在内存替换 vitest spy，esbuild stdin/write:false 后 Module._compile；使用真实 Workspace/Protocol，不替换 stream registry 或权限判断，finally 释放 gate 并 dispose 工作区。首次 loader harness 因未显式传入 filename 在执行应用代码前触发 Node assertion；补齐内存 harness filename 后重跑成功，没有据该失败声称产品缺陷。最终输出：

```text
original normal-return failure + late cancellation: failed/failed; absent/unreadable projection: runtimeFault only
original bare empty poll after stream eviction/rebuild: resync_required; old explicit: resync_required; rebuilt cursor: []
original empty result does not absorb new rows; retention overrun rejects bare/explicit; fresh snapshot resumes
```

实际命令：

```text
pnpm exec vitest run src/modules/browser/services/workspace.test.ts -t 'projects the actual|does not publish native success|revalidates even an empty|revalidates the retention window'
Test Files 1 passed (1)
Tests 9 passed | 35 skipped (44)
```

该 9 例运行包含真实临时目录文件服务的成功/配额/捕获失败及终态/旧 epoch 路径，不能等同真实浏览器下载验收。作者报告的 5 files/85 tests、CLI、test tsc、定向 lint、architecture 1252 modules、diffcheck 未冒充 reviewer 重跑；本轮按风险只重跑上述必要边界，没有重复整套测试。

未运行真实 Chrome/helper/Obsidian/四平台/人工视觉/性能验收，依 SRC-010 由用户承担；未 build，最终生成物组合由 Lead 串行处理。未扩大 closed-shadow 等前序未定产品策略，未扩大历史恢复权限。唯一写入本新报告，没有修改源码、正式证据/状态、旧报告或产物。

最终：standards=pass；specification=pass；开放 findings=0。交回后停写。
