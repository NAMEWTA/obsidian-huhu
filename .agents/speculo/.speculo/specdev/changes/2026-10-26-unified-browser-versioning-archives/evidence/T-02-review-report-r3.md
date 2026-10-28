# T-02 repair-2 独立双轴复审原始报告

Reviewer: native:/root/review_browser
Implementer: native:/root/audit_browser
Mode: native；保持独立身份，未参与实现/修复、未递归派遣。
Input-SHA256: `f98375f407d27c12af9f80d509aa6c323119fc1d9c0fb4e1cfc7c4ca86d26020`
Observed: 2026-10-26。原 S-05/R-05 反例闭合，原四项修复未回退；本轮未发现新的阻塞问题。两轴分别 pass，结论限于固定源码及本报告列明的自动反例，不代表真实宿主/平台验收已完成。

## review-input

完整固定对象：[T-02-review-input-r3.json](T-02-review-input-r3.json)。Input-SHA256 由工具对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算，区别于内部 scope.input_sha256。

- working-tree 显式 17 文件；base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；本轮 Map `plan_revision: 5`。
- 开始逐项核验 17 文件 after SHA256 与 27 份来源原字节 SHA256，全部匹配。
- 相对于 r2 仅 driver.ts 与 driver-observation.test.ts 改变；其余 15 文件字节一致。按已读取 result-reuse 合同复用不变来源/规则与读取事实，重新审查受影响的两轴及调用链，没有复用旧失败结论作为通过。
- 结束重跑同一 `validate-specdev.mjs --review-scope --mode working-tree --base … --file …`：base/head、index SHA、tracked diff SHA、17 文件完整 working_snapshot 全部匹配；27 份来源再次核验全部匹配。r2 已记录的 Map 漂移在 r3 新输入中已重新冻结。
- 结束 inventory/excluded 变化只有新增本轮输入 JSON 和范围外 `src/modules/versioning/services/history-retention.ts`，不是本审查代码漂移；不据此声称整个仓库无变化。

## standards-output

Reviewer: native:/root/review_browser
Axis: standards
Result: pass
Input-SHA256: `f98375f407d27c12af9f80d509aa6c323119fc1d9c0fb4e1cfc7c4ca86d26020`
Observed: 读取两份实际修复文件并追踪生产事件处理、frame registry、await 后校验、发布前校验与 ref 消费；对比不变消费者及原四项修复。原反例在当前生产代码路径不再成立，没有新增标准轴 finding。

### S-05 关闭依据

- driver.ts 的 frameNavigations 是每 frame 的导航代次；Page.frameNavigated 与 Page.navigatedWithinDocument 都推进对应 frame 的代次，detach/target 清理同步清理相关 registry。
- observe 固定 mainFrameId、主文档身份和主导航代次，check 同时比较它们。这个 check 在异步读取后及发布前执行，因此同文档导航不再因保留 frameDocuments 而漏过。
- child 的 checkFrame、最终 viewport 重验和末段 registry 校验均包含该 frame 的导航代次。局部 child 导航走 failFrame，移除其 nodes/ref/重验项并保留其他 frame；不再把导航前的 child 内容重新赋当前身份。
- 结尾仍允许把主导航代次未变、仅 child 失效后的有效其他 frame 结果绑定当前 aggregate documentId；主导航发生变化会先拒绝，不能到达该发布步骤。
- 新回归使用有序 CDP wire 在指定 AX/最终 viewport 回复前注入事件，没有依靠 sleep；同时断言拒绝、旧 ref/rootRef 无效、无 Input 派发和重新观察恢复。child 用例覆盖 local 与 remote session，核对局部失败和重新观察恢复。

### 原四项没有回退

| 原 finding | 当前核对与 reviewer 实际输出 |
|---|---|
| S-01 batch 最终过期过滤 | protocol-service.ts 字节与 r2 一致；内存调用生产 finalize，过期 batch record 保留 state/id、移除 result、error=observation_stale。 |
| S-02 外部滚动 viewport 版本 | driver 修复保留 publishedViewports 比较/版本推进/旧观察淘汰；main、local 两个反例均 `1 → 2`。 |
| S-03 late child 局部失败 | late local detach 仍保留 main/remote，local coverage=failed；frameErrors 明确。新增 child 同文档导航与已有 OOPIF/replace 回归没有被移除。 |
| S-04 祖先 opacity | observation-dom.ts 字节与 r2 一致；visible 模式透明祖先下 nodes=0，恢复后 nodes=3。 |

标准依据仍为冻结的 AGENTS、dev、architecture/testing 参考、lint/TS/Vitest 配置与 code-review 标准/风险规则。Fowler 启发式未产生额外风格要求。没有扩大闭合任务为无关重构。

## specification-output

Reviewer: native:/root/review_browser
Axis: specification
Result: pass
Input-SHA256: `f98375f407d27c12af9f80d509aa6c323119fc1d9c0fb4e1cfc7c4ca86d26020`
Observed: 对 Spec AC-005、T-02 原票、Issue #1 §10.2/§10.3、docs/browser-protocol.md 的导航/ref 与局部观察合同逐项复核；原 R-05 关闭，原 R-01～R-04 不回退。没有新增规范轴 finding。

- 顶层 fragment/historyApi 导航在 snapshot 的 AX await 与最终 viewport await 期间都会整体拒绝，不返回被重新标成新 documentId 的旧结果；旧引用被拒绝，重新观察返回新 URL/文档身份。
- 同进程 local 与 OOPIF remote 的同文档导航各自只失效该 frame 的本次观察，保留稳定主/其他 frame；coverage=failed、nodes=0、frameErrors=frame_unavailable。旧观察 ref 被拒绝，之后重新观察该 frame 恢复 complete。
- rootRef/frame/mode/budget 的完整转发链与 r2 未变化；公开 schema、Workspace、Host/Wire/Worker 和 CLI 消费继续对应同一协议。没有增加人的当前标签回落、任意脚本参数或网页写能力。
- 源码层面的需求及修复满足当前固定输入；SRC-010 指定的真实 Chromium/Obsidian/四平台/性能/人工视觉验收仍由用户执行，本报告不把它们填写为 pass。

## reviewer 实际反例与输出

仅执行必要、只读源码的内存反例，没有重复全量测试或重新构建根生成物。方法沿 r2：读取当前测试文件首个 `it('observes…')` 之前的 fixture，移除 vitest import、增加内存 export；esbuild `stdin/write:false` 编译后 Module._compile。生产 BrowserDriver、NativeCdp、frame/ref registry 和 loopback framing 实际运行；Chromium/native 回复仍为模拟 wire。finally 关闭全部 driver/socket/server。

本轮 Node assert 反例进程退出码 0，实际输出：

```text
S05 closed AX fragment rejected/no-input/fresh=3
S05 closed AX historyApi rejected/no-input/fresh=3
S05 closed final viewport fragment rejected/no-input/fresh=3
S05 closed final viewport historyApi rejected/no-input/fresh=3
child navigation local failed-local/old-ref-rejected/recovered
child navigation remote failed-local/old-ref-rejected/recovered
S02 remains closed main 1 2
S02 remains closed local 1 2
S03 remains closed stable=main,remote; local=failed
S04 remains closed hidden=0/restored=3
S01 remains closed stale body stripped
```

其中 `rejected` 的实际断言为 browser_document_changed，旧 ref 为 browser_stale_ref；no-input 检查模拟 wire 没有 Input.insertText。child 的 `failed-local` 表示该目标 frame 的局部失败，remote 场景实际检查的是 remote。`fresh=3` 断言导航后的新 observe 能恢复三个 fixture 节点且 URL 对应新导航。

原 S-05 的同一失败时序已复跑；扩展为 fragment/historyApi × AX/final viewport 四个边界。child 实验在第 3 个 AX 回复期间注入指定 frame 的 Page.navigatedWithinDocument；观察结束检查该 child 不在 nodes、其 coverage=failed，旧 ref 拒绝，再次 observe 后恢复 complete。事件和回复共用顺序 wire，没有随机等待。

作者报告 33 files/194 tests、Worker/test tsc、driver lint/diffcheck 已通过；本报告如实标为作者提供的检查事实，不冒充 reviewer 重跑记录。reviewer 的独立证据是上面的实际实现阅读、固定输入核验及定向反例。

## 来源、边界与未验证项

沿用并实际应用已读的 code-review/dev 与其相关引用；本轮 27 份来源含 Ticket、Map revision5、Spec、ADR、Issue 冻结正文、SRC-010、docs 与工程/审查规则，均已验证原字节。只读来源发现结论与前轮一致，没有新界面或新增设计义务，ui 不适用。

CDP 字段语义的官方核验沿 [r1 报告](T-02-review-report.md#cdp-字段核验与明确限制) 保留：frameId 字符串表索引、layout.bounds 文档坐标、parentIndex 与 shadowRootType 的含义不因本轮导航代次修复改变。没有把本轮 wire 反例当作真实 CDP 二进制字段验收。

固定隔离世界 Runtime.evaluate 保留，其表达式只读取 scroll/innerWidth/innerHeight；本轮没有要求“完全无 JS”。closed-shadow host 的公开 AX 派生名称策略仍按前两轮的明确边界保留，没有新增隐藏政策或把未定策略当通过证据。

未运行真实 Chromium/native helper/Obsidian/utilityProcess 组合、四平台、性能或视觉验收；均 user-owned/not-run。未验证最终重建后的 main.js、browser-worker.cjs、browser-cli.cjs、generated bridge 的资产组合；由 Lead 串行处理。代码审查 pass 不替代上述环境验证，也不是整个 change 完成声明。

本轮唯一写入本报告；未改源码、r1/r2 报告、Ticket/Map/正式 Evidence。findings=[]；standards=pass；specification=pass；skipped_axes=[]。交回后停写。
