# T-02 repair-1 独立双轴复审原始报告

Reviewer: native:/root/review_browser
Implementer: native:/root/audit_browser
Mode: native；同一独立 reviewer 继续复审，未参与实现、未修改源码、未递归派遣。
Input-SHA256: `99b7b2dec9d390e552b1b75b8d13f5ed7e882f9d9a56a91c81b6275ce408f69f`
Observed: 2026-10-26。原 4 项反例已闭合；发现 repair-1 引入的 1 项导航竞态。两轴均 request-changes。

## review-input

完整固定对象：[T-02-review-input-r2.json](T-02-review-input-r2.json)。摘要由实际工具对完整对象执行 `JSON.parse` → `JSON.stringify` 后计算，不是内部 scope 摘要。

- working-tree 显式 17 文件；base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`。
- 开始时逐项核验 17 文件 after SHA256 和 27 份来源 SHA256，全部匹配。
- 与 r1 对比只有 5 个审查文件变化：driver.ts、driver-observation.test.ts、observation-dom.ts、protocol-service.ts、protocol-service.test.ts。另 12 文件字节不变，重新核对接缝并沿用原读代码事实，不把 r1 失败结果改写为通过。
- 已读取 result-reuse 合同，因相关代码变化重新运行两轴；仍使用 code-review、dev 与已读且摘要未变化的规则。
- 结束时重新执行相同 review-scope 选择：base/head、index SHA、tracked diff SHA、17 文件完整 working_snapshot 全部匹配。
- 来源结束时存在已确认漂移：tickets-map.md。首次发现时当前 SHA256 为 `d7c5ad59f8d30c28397d0e11c2a9bc37a388f6eed77b3402c2a0b93d411a4cfd`，输入为 `1f16f163c46b5d9cd4587392e6c5d3c15c10a0cf3c5ee35e3f24167241e5bae1`。Lead 随后明确告知为无关 T-18 补共享 host guard/i18n 写集、Map revision 4→5；T-02 原票和源合同未改。其余 26 份来源结束核验匹配。本报告不宣称所有来源终态一致，下一轮必须冻结当前 Map。
- scope inventory 的排除路径另新增 r2 输入本身，不是审查代码漂移。

## standards-output

Reviewer: native:/root/review_browser
Axis: standards
Result: request-changes
Input-SHA256: `99b7b2dec9d390e552b1b75b8d13f5ed7e882f9d9a56a91c81b6275ce408f69f`
Observed: 原 S-01～S-04 修复已按真实生产实现复验；新增 S-05 如下。

### S-05 / P2：顶层同文档导航期间的旧观察被重新标成当前文档

**位置：** `src/modules/browser/platform/desktop/runtime/driver.ts:1231`、`:1353`、`:1354`；事件来源 `:660`–`:681`。

**可达前提：** observe 已创建结果、读取 DOMSnapshot，并等待 Accessibility.getFullAXTree；主 frame 此时发生 hash/history 导航，Chromium 发 `Page.navigatedWithinDocument`。控制权和 viewport 均不变。这是现有 CDP event handler 实际消费的事件，不要求任意调用方脚本能力。

**问题与风险：** repair-1 把在途检查从整个 page.documentId 换成 main frameDocuments。frameDocuments 只在 Page.frameNavigated 分支推进，同文档导航分支仍只推进 page.documentId、清空已登记 observations 并更新 URL。因此新的 check 不会拒绝顶层同文档导航。结尾又无条件把已经取得的结果及 refs 的 documentId 改成当前 page.documentId，导致旧观察通过后续 workspace/protocol 的身份比较，并重新登记有效 ref。返回的 URL 仍是操作开始时的旧 URL；SPA 导航时还可能组合导航前后的 DOM/AX 信息。

**实际只读反例：** 内存加载当前 r2 wire fixture，执行生产 BrowserDriver、NativeCdp、registry。先取得一次观察，然后在第二次观察的第一个 AX await 期间按顺序写入顶层 navigatedWithinDocument 事件和 AX 回复。返回的观察没有拒绝，documentId 已是新值，URL 却仍为旧值。随后使用其 ref 执行 fixture 内 fill，真实生产 driver 已派发 Input.insertText 到模拟 wire。

```text
same-document top navigation during observe:
{
  "initialDocument":"ccc90bd9-9b44-4213-8fb2-0c692ddae670",
  "resultDocument":"fb1fcd95-94d3-4a25-b363-255786604712",
  "url":"about:blank",
  "nodes":["Main button","Local button","Remote button"],
  "pageEvents":[{"documentId":"fb1fcd95-94d3-4a25-b363-255786604712","url":"https://fixture.invalid/#changed"}]
}
in-flight ref accepted after top hash navigation: true
```

UUID 是此次实际输出，不是测试固定值。实验只写入本地模拟 CDP socket，未操作真实网页。

**依据：** dev 的公共契约/调用方一致性要求；code-review 风险合同的异步状态与错误保证；repair-1 应保留“主文档或权限变化仍整体拒绝”的修复边界。r2 原有“navigatedWithinDocument 后旧 ref 拒绝”回归只检查已登记的旧观察，没有覆盖正在生成、随后重新登记的观察。

**最小满足条件：** 为主 frame 的所有需使观察失效的导航维护可比较代次，包含 Page.navigatedWithinDocument，并在每个 await 后及发布前检查。保留对子 frame 失败的局部结果修复，但不能把顶层导航前的结果/refs 通过改写 documentId 移入新代次。补充确定 barrier 的顶层 hash/history 导航在途负例，断言 observe 拒绝、结果/ref 不重新登记，并保留原 late child detach/replace 的成功回归。对子 frame 同文档导航也应核对其 frame 代次及局部失效语义，避免同类漏检。

## specification-output

Reviewer: native:/root/review_browser
Axis: specification
Result: request-changes
Input-SHA256: `99b7b2dec9d390e552b1b75b8d13f5ed7e882f9d9a56a91c81b6275ce408f69f`
Observed: 原 R-01～R-04 对应修复成立，但新 R-05 阻止导航/ref 部分通过。Map 的已知无关漂移单独保留，不以它掩盖已确认代码问题。

### R-05 / P2：同文档顶层导航未使在途 snapshot/ref 失效

- 路径/位置：driver.ts:1231、:1353、:1354，对照 :660、:679；相对于项目根的完整路径见 S-05。
- 规范：Spec AC-005 要求导航后旧 ref 拒绝、document 版本身份可观察；Ticket T-02 要求导航后旧引用拒绝；Issue #1 §10.2 引用绑定 frame/document 与 §10.3 每个 await 后继续核验 operation/runtime/epoch；当前 docs/browser-protocol.md 也规定页面文档变化使相关引用失效。
- 具体差距：一次导航前已经开始的 snapshot 在顶层 hash/history 导航后没有拒绝，反而被重新赋当前文档身份，其 ref 可以进入写派发。它不能因返回时 UUID 与当前投影一致就算“当前观察”。完整生产可达反例与真实输出见 S-05。
- 满足条件：保持子 frame 局部失败语义，同时检测所有顶层导航代次；在途旧观察拒绝且不能重新登记可执行 ref；补充主/子同文档导航的确定边界负例。

## 原四项修复的独立核对

下表“闭合”只表示原反例与该项代码修复通过本轮独立复核，不表示 T-02 整体或真实宿主验收通过。

| 原 finding | 修复事实 | reviewer 实际反例输出 | 结论 |
|---|---|---|---|
| S-01/R-01 batch 最终漏过滤 | batch 最后同步分支对每条记录调用 metadata；没有修改原记录对象。新增测试覆盖同 batch 后续导航及最后 guard 前 viewport 改变。 | `{"results":[{"id":"op","scope":{"pageId":"page"},"state":"completed","error":"observation_stale"}],"completedCount":1}` | 闭合 |
| S-02/R-02 外部滚动版本不推进 | publishedViewports 按 frame/document 记忆发布几何；最终观察发现变化时推进公开 viewportVersion、更新 refs 并发布 Page 事件。新增测试同时检查 main/local 与旧 ref 拒绝、重复读取不反复递增。 | main: `before=1,after=2,visible=false`；local: `before=1,after=2,visible=false` | 闭合 |
| S-03/R-03 late child detach 整页失败 | failFrame 删除该 frame 的节点/ref/后续几何重验；末段降级明确 coverage。新 frame 记 omitted；新增用例覆盖 child detach/replace、晚 OOPIF replacement 和恢复。 | main/remote 保留；local coverage `failed,nodes=0`；`frameErrors=[{frameId:'local',code:'frame_unavailable'}]` | 原反例闭合；导航放宽引入 S-05 |
| S-04/R-04 祖先 opacity 被忽略 | DOM 节点增加 transparent，selection 按 parentIndex 扩散到后代；visible 与 semantic 区分保留。新增用例覆盖透明和恢复。 | `{"hidden":0,"restored":3}` | 闭合 |

## 本轮方法、证据与未验证项

实际复核了 r2 五文件实现/回归差异和其余 12 文件快照身份，沿 API→schema→protocol/workspace→adapter→host/wire→Worker→driver/CLI 复核修复接缝。27 份输入来源覆盖 Ticket/Map/docs/工程与审查规则；不再把原规范来源清单当作本轮完整清单。AGENTS/dev、范围、研究、错误/可靠性规则均沿原合同执行；原官方 CDP 字段核验仍适用，没有用 mock 数量证明字段真实语义。

没有无理由重新运行全量测试。作者报告的 26/26、33 files/192 tests、Worker/test types、lint/diffcheck，以及 Lead 的测试类型结果，在本报告中仅作为其提供的检查事实，不冒充 reviewer 亲自执行。

reviewer 实际执行的反例全部为只读源码的内存编译：用 `fs.readFileSync` 读取 r2 `driver-observation.test.ts` 首个 `it('observes…')` 之前的 fixture，移除 vitest import 后添加内存 export；`esbuild.build({stdin,write:false,bundle:true,platform:'node',format:'cjs'})`，再 Module._compile。没有写临时源码/生成物。finally 关闭全部 driver/socket/server。协议反例同样内存编译生产 BrowserProtocolService，用当前 pageList/health 与过期记录比较最终响应。

S-05 在该 fixture 的核心步骤如下（fixture 是内存 export，不是新增仓库文件）：

```ts
const f = await fixture();
const initial = await f.driver.observe('page', f.lease);
let triggered = false;
f.block(async () => {
  if (!triggered) {
    triggered = true;
    f.event('Page.navigatedWithinDocument', {
      frameId: 'main', url: 'https://fixture.invalid/#changed'
    }, 'main-session');
  }
});
const changed = await f.driver.observe('page', f.lease); // 实际未拒绝
await f.driver.execute('page', {
  kind: 'fill', observationId: changed.id,
  ref: changed.nodes[0].ref, text: 'review-fixture'
}, f.lease); // 当前 fixture 实际收到 Input.insertText
```

事件和后续 AX 回复使用同一个模拟 CDP socket 顺序写入；没有靠 sleep 制造时序。它证明生产事件 handler/await/ref registry 行为，不能替代真实 Chromium 的事件集成验收。

固定隔离世界 Runtime.evaluate 继续仅执行读取滚动与 viewport 的固定表达式；没有要求移除它，也没有声称“完全无 JS”。closed-shadow host 公开 AX 派生名的未定策略继续保留 r1 限制，本轮未扩大隐藏策略或新增相关 finding。

未运行真实 Chromium/helper/Obsidian/四平台/性能/人工视觉验收；SRC-010 将其交用户执行。未重建或验证根 main.js、browser-worker.cjs、browser-cli.cjs、generated bridge 的最终组合，仍由 Lead 串行负责。未改 Ticket/Map/正式 Evidence/旧报告。

唯一新缺陷计数：1（P2）；原 4 项反例闭合。standards=request-changes；specification=request-changes；skipped_axes=[]。报告交回后 reviewer 停写。
