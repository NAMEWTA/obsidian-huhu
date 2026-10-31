# T-02 独立双轴审查原始报告

Reviewer: native:/root/review_browser
Implementer: native:/root/audit_browser（调用方提供的真实实施身份）
Mode: native；未参与本范围实现、未修复源码、未递归派遣。
Input-SHA256: `412b639eaec38c2c7e72de054013a3160cce9e217be53d5d986a118869c510a3`
Observed: 2026-10-26；本报告由独立 reviewer 实际读取、分析与执行反例后写入。唯一写入是本报告。

## review-input

完整固定对象：[T-02-review-input.json](T-02-review-input.json)。上述摘要是整个对象经 `JSON.parse` → `JSON.stringify` 后的 UTF-8 SHA256，区别于对象内部 `scope.input_sha256`。

- 模式：working-tree，显式 17 文件；base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；Map revision 4。
- 开始时逐项验证 17 份 `working_snapshot.after.sha256` 和 6 份来源原字节摘要，全部匹配。
- 结束时重跑相同 `validate-specdev.mjs --review-scope --mode working-tree --base … --file …`：base/head、index SHA、tracked diff SHA、17 文件完整 working_snapshot 全部匹配。
- 结束时 scope 的 inventory/input 摘要变化，差异只有 excluded_paths 新增本次输入 JSON、T-13-review-report.md、`src/modules/archives/core/model.ts`；不属于本审查源码，不据此伪称整个仓库无漂移。
- 根生成物由 Lead 统一更新；本轮没有验证生成后的最终插件和 Worker 组合。

## standards-output

Reviewer: native:/root/review_browser
Axis: standards
Result: request-changes
Input-SHA256: `412b639eaec38c2c7e72de054013a3160cce9e217be53d5d986a118869c510a3`
Observed: 发现以下 4 个可定位的正确性问题；均有生产路径的内存反例，不以 mock 通过数替代浏览器验收。

### S-01 / P2：batch 最终响应绕过新加的 snapshot 过期过滤

- 位置：`src/modules/browser/services/protocol-service.ts:32`，尤其 `:53`；对照 `:96` 的 metadata、`:112` 的 observationCurrent，以及 `:286` 的 batch 逐步执行。
- 可达前提：batch 的较早一步产生 snapshot，随后一步导航/刷新，或批次完成后 transport 最后一次异步所有权检查期间发生导航；Run 本身仍有效。
- 风险：较早记录只在其执行结束时经过 metadata，最后的 batch 分支校验权限后直接 `return result`。同一个已经过期的 snapshot 经 operation.execute 最终边界会剥除正文，经 batch 却仍带着旧 document/viewport 的 nodes 出站。新 guard 未覆盖实际消费者 batch。
- 反例：在内存编译的生产 BrowserProtocolService 上，当前 Page 为 new-document/version 2，记录 snapshot 为 old-document/version 1。最终过滤输出如下：

```text
single operation finalize: {"id":"op","scope":{"pageId":"page"},"state":"completed","error":"observation_stale"}
batch finalize: {"results":[{"id":"op","scope":{"pageId":"page"},"state":"completed","result":{"pageId":"page","spaceId":"space","scope":{"pageId":"page","spaceId":"space"},"runtimeId":"runtime","epoch":1,"documentId":"old-document","viewportVersion":1,"coverage":[],"nodes":[{"name":"old content"}]}}],"completedCount":1}
```

- 依据：dev 的公共契约/真实消费者要求；code-review 风险规则的异步并发与失败保证；本改动明确新增的最终 snapshot 过滤语义。
- 满足条件：在 batch 最后同步响应边界对每一条记录重新应用相同的 observationCurrent/metadata 规则，保留 ticket/state，清除已过期的正文；补充“snapshot→navigate 的同一 batch”和“batch 完成后、guard 前导航”的回归。

### S-02 / P2：外部滚动后新快照仍复用旧 viewportVersion

- 位置：`src/modules/browser/platform/desktop/runtime/driver.ts:1222`、`:1280`、`:1306`；对照仅在旧 ref resolve 路径递增的 `:1359`；消费者 `src/modules/browser/services/protocol-service.ts:112`。
- 可达前提：同一文档内网站脚本、键盘默认行为或其他外部机制滚动，然后直接请求新的 observe，没有先执行旧 ref 动作。
- 风险：observe 只核对本次 DOMSnapshot 和当前 viewport 一致，不与上次发布的 viewport 比较或发布版本变化。新旧快照可以具有不同可见范围而报告同一 viewportVersion；Workspace/RPC 依赖 page.viewportVersion 的迟到检查无法据此识别这次已发生的变化。旧 ref 的 resolve 会自行检测滚动并拒绝，不能补足观察版本合同。
- 反例：使用原 driver-observation fixture、生产 BrowserDriver/NativeCdp，首次 observe 后调用 fixture 的 scroll(50)，直接再次 observe：

```text
external scroll: {"beforeVersion":1,"afterVersion":1,"beforeVisible":true,"afterVisible":false}
```

- 依据：公共版本身份一致性、异步结果不能冒充当前状态；这里不是声称旧 ref 已成功执行了写动作。
- 满足条件：由 viewport 状态 owner 在观察到各 frame 几何/滚动发生变化时推进相应公开版本、使旧 refs 失效并同步 Page 投影；不能依赖调用方先尝试旧 ref 才推进版本。覆盖直接连续 observe、子 frame 外部滚动、以及相关最终 guard 的行为。

### S-03 / P2：子 frame 晚移除会丢弃整页已经取得的局部结果

- 位置：`src/modules/browser/platform/desktop/runtime/driver.ts:1318`、`:1323`、`:1332`。
- 可达前提：main/local 的内容已经读取，随后在 remote AX 读取期间 local frame 被移除；主文档、控制权与其他 frame 保持有效。
- 风险：第一次逐 frame 读取有局部 catch，但最终逐 frame viewport 重验位于该 catch 外；已删除的 child 直接抛 browser_frame_changed。最后的 frames 集合比较也无条件升级为整次失败。动态广告或嵌入 frame 的一次移除即可让其他稳定 frame 的结果全部丢失，没有 coverage/frameErrors 可供调用方解释局部缺口。
- 反例：原 fixture 的第 3 次 Accessibility.getFullAXTree（remote）期间发送 `Page.frameDetached({frameId:'local',reason:'remove'})` 到 main-session；生产 observe 拒绝：

```text
already-captured child detaches during later frame read: browser_frame_changed
```

- 依据：错误/恢复规则要求区分局部失败与整体无效，不能把可保留的有效结果一并丢弃；与本次添加的局部结果模型不一致。
- 满足条件：主文档/权限仍有效时，将晚失效 child 的节点和 refs 移除，把其 coverage 标为 failed/omitted 并给出 frameErrors，保留稳定 frame。新 frame 出现需显式说明未覆盖；主文档或权限变更仍应整体拒绝。用确定 barrier 复验晚 detach/替换与恢复。

### S-04 / P2：visible 模式没有考虑祖先的不透明度

- 位置：`src/modules/browser/platform/desktop/runtime/observation-dom.ts:43`；消费者 `src/modules/browser/platform/desktop/runtime/driver.ts:1298`。
- 可达前提：`<div style="opacity:0"><button>…</button></div>`，button 自身 computed opacity 为 1、有布局框且位于 viewport 内，AX 节点存在。
- 风险：只看节点自身的 computed opacity。父元素为 0 不会把子元素的 computed opacity 改为 0，但整个子树在绘制时透明。因此新 visible 模式仍返回 visually absent 的 button，且标记 visible:true。AX 存在不代表画面可见。
- 反例：仅在原 wire fixture 的内存副本中将 parent layout 的 opacity 字符串设为 '0'、button 保持 '1'，生产 observe(mode:'visible') 输出：

```text
parent computed opacity=0, button computed opacity=1: [{"name":"Main button","visible":true},{"name":"Local button","visible":true},{"name":"Remote button","visible":true}]
```

- 依据：[CSS Color 4 opacity 合成语义](https://www.w3.org/TR/css-color-4/#transparency)；[AccName 1.2 对 opacity:0 仍存在于 AX 的说明](https://w3c.github.io/accname/#computation-steps)。2026-10-26 查证，都是官方来源；这是投影算法反例，未声称实机已经执行。
- 满足条件：计算有效视觉状态时考虑祖先合成至少包括 opacity:0；DOM/AX 的语义模式可以继续返回该节点，visible 模式应排除。补充祖先 opacity=0、正常祖先和恢复可见的回归，不以删除 AX 节点来伪造正确性。

## specification-output

Reviewer: native:/root/review_browser
Axis: specification
Result: request-changes
Input-SHA256: `412b639eaec38c2c7e72de054013a3160cce9e217be53d5d986a118869c510a3`
Observed: 独立按规范核对，以下 4 项阻止 AC-005 全部分项通过。与标准轴是同一批事实的不同依据，不重复计为 8 个唯一缺陷。

| Finding | 严重性与代码位置 | 规范差距与风险 | 满足条件 |
|---|---|---|---|
| R-01 | P2；protocol-service.ts:32、:53 | Spec AC-005，Issue #1 §10.2 观察身份，以及 §10.3 await 后校验：batch 的旧 snapshot 可绕过新增最终 guard。具体可达条件及实际输出见 S-01。 | 所有 batch record 在最终边界重验 document/viewport；补齐两个导航迟到负例。 |
| R-02 | P2；driver.ts:1222、:1280、:1359 | Spec AC-005 要求 viewport/document 版本可观察；Ticket 明确滚动夹具核对版本。直接观察外部滚动前后返回相同版本，见 S-02。 | 直接 observe 即能发布变化后的版本并使旧引用失效；验证 top/child frame 和投影。 |
| R-03 | P2；driver.ts:1318、:1332 | Spec AC-005“部分失败明确”；Ticket“子框架失败明确列出”；Issue #1 §10.2 遇到 frame 不可访问或 target 替换要输出局部状态。晚 child detach 被升级为整页异常，见 S-03。 | 保留稳定 frame，局部失效 frame 通过 coverage/frameErrors 表达；整体失效边界保留。 |
| R-04 | P2；observation-dom.ts:43、driver.ts:1298 | Issue #1 §10.2 SnapshotScope 的 visible 模式与 DOM/布局/可见性组合观察；透明祖先内的 button 仍声明 visible:true，见 S-04。 | 有效可见性考虑祖先 opacity；visible 模式过滤并具备恢复回归。 |

上述路径均相对于仓库根；规范轴代码事实、反例与最小修复条件与 S-01～S-04 对应，未提出额外重构要求。

## 已检查的生产链与来源发现

- 调用链：api.ts BrowserAgentAccess.observe → core/protocol.ts 严格 scope schema → protocol-service → workspace.observe / snapshot operation → adapter → host-main ManagedRuntime.observe → wire WorkerRequest → worker.dispatch → BrowserDriver.observe。另读 CLI schema 注入、RPC server 最后 guard、operation ledger 消费及 sendMaterial 的现有调用。
- scope：frameId、rootRef 同 Page/文档/epoch/frame 绑定、mode 和 nodes/bytes 边界确实沿链转发；覆盖/错误元数据也计入 JSON byte 预算。rootRef 与显式 frame 不一致会拒绝；无当前活动标签回落。
- ref：registry 保持 session/frame/backend 组合；导航、epoch、frame 文档/归属及显式 viewport 变化校验真实存在；异步 observe 后重新验证权限和文档。S-02 是外部滚动版本缺口，不否定这些既有 guard。
- 隐私：password 的 DOM attribute 映射阻止直接 AX value 投影；原始 DOMSnapshot 的 inputValue/attributes/string table 没有直接出站。closedShadow 子树从 ref/nodes 排除并标 partial；尚未证明所有派生敏感文案都不会进入 AX name。
- observe 使用固定隔离世界表达式读取 scroll/innerWidth/innerHeight；未开放任意脚本参数，没有发现新 observe 路径派发 Input、DOM 写操作或 Page.navigate。固定 Runtime.evaluate 不能表述为“完全没有执行 JS”。
- 来源发现顺序：working-tree 无新 commit，commit message 来源不适用；调用方显式 Spec/Ticket/ADR/Issue 冻结正文/SRC-010 已找到；匹配 docs/browser-protocol.md、browser-runtime.md 已找到；无须询问缺少规范。
- 标准来源：根 AGENTS、dev 及其 architecture/testing 参考、eslint/TS/Vitest 配置；搜索未发现额外适用的 CONTRIBUTING/CODING_STANDARDS 或下级 AGENTS。按 Fowler 最低启发式、风险审查、错误/可靠性规则检查，没有为纯风格生成发现。新增界面不在范围，ui 不适用。
- 已实际调用 `.agents/speculo/workflows/specdev/common/skills/code-review/SKILL.md`，并读取 source-discovery、fowler-smells、risk-review、reviewer-contracts、review-evidence、working-tree-review 及 error-handling/test-reliability；按 change-scope 与 research-and-reuse 合同核对范围和官方材料。

## CDP 字段核验与明确限制

查证日期：2026-10-26；使用 [DevTools 官方 browser_protocol.json](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json) 与 [Chromium InspectorDOMSnapshotAgent 源码](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/inspector/inspector_dom_snapshot_agent.cc)。这些是上游当前协议/源码查证，不冒充运行包 `156.0.8078.47` 的二进制实测。

- DocumentSnapshot.frameId 为 strings 表索引；当前解码正确。
- parentIndex 是节点表父索引；当前 subtree 遍历使用该索引。
- layout.bounds 来自 RectInDocument，使用文档坐标；当前与该 frame 的 scroll viewport 比较，并把 bounds 公开标为 frame-local document coordinates，没有按顶层输入坐标使用。
- shadowRootType 是 rare-string 表，Chromium 在 shadow 内节点填写 containing root type；不是仅在一个 ShadowRoot 对象上填写。当前逐节点 closed 判定与此一致。
- DOMSnapshot 的当前上游遍历为 flat-tree，含 shadow/slot 合成；本报告没有据此声称任意站点的 DOM/AX 完整一致或真实 OOPIF 已通过。

单独保留一个未升格为阻塞 finding 的边界：closed shadow 的内部节点被过滤，不代表 host 的公开 AX 名称不含其文本。内存反例将 AX backend 改为 closed child 的 host backend，保留 child 的 closed 标记，可同时得到 closed_shadow_root 和 host name `CLOSED_SHADOW_DERIVED_TEXT`。这符合 [AccName 从 shadow rendered children 计算名称](https://w3c.github.io/accname/#computation-steps) 的语义；源条款未明确要求隐藏 host 的公开名称，因此不擅自把它定为密钥泄露。若产品意图是连这种派生名称也隐藏，需要进一步明确策略及回归。

## 实际检查、反例方法与未验证项

实际检查：完整 17 文件快照/基线 diff 与新增文件；6 份固定来源 hash；上述生产链与规范；两次固定范围验证；4 个定向失败反例与 closed-host 边界实验。没有重新运行作者已报告的 33 文件/185 测试，也没有声称独立复核其通过数。

反例没有修改源码：用 Node `fs.readFileSync` 读取 `driver-observation.test.ts` 首个 `it('observes…')` 前的 fixture，移除 vitest import，增加内存 export；`esbuild.build({stdin,…,bundle:true,platform:'node',format:'cjs',write:false})` 后用 `Module._compile` 加载内存字节。生产 BrowserDriver、registry、NativeCdp、loopback framing 均执行；浏览器响应仍由 wire fixture 提供。各次 finally 调用 cleanup，关闭 driver、socket 和 server。

- S-02：原 fixture；observe → fixture.scroll(50) → observe，打印前后版本与 visible。
- S-03：原 fixture；block 回调计数，到第 3 个 AX 请求时发 local frameDetached，再读取错误码。
- S-04：fixture 内存副本只增加字符串 '0'，将每份文档第一个 parent layout 的 opacity 索引改指向它；button 自身 styles 不变；observe({mode:'visible'})。
- S-01：单独用 stdin 内存编译生产 protocol-service.ts，fake workspace.health 保持同 runtime/epoch，pageList 返回新文档/version 2；对相同旧记录分别调用 operation.execute 和 batch 的 finalize，凭证长度 48，比较最终输出。此实验没有模拟 HTTP，但已静态追踪 rpc-server 最后同步 guard 确实调用该 finalize。

未验证：真实 Chromium/原生 helper/Obsidian/utilityProcess 组合、真实同进程与 OOPIF、四组平台、性能、人工视觉；用户依据 SRC-010 自行验收。真实 native 脚本未运行，其新增夹具只做代码阅读。根 main.js / browser-worker.cjs / browser-cli.cjs 和 generated main bridge 的最终重建及资产摘要由 Lead 后续负责。本报告不确认 T-02 已完成，也不修改 Ticket/Map/Goal 状态。

唯一缺陷计数：4（P2×4）。standards=request-changes；specification=request-changes；skipped_axes=[]。
