# T-15 repair-1 独立双轴复核

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-15-review-input-r2.json
Input-SHA256: 2120b9536e8ae0ab476d3539bab4816c3eae4f59ecbed2162d233aff0d677e72
Observed: 本 reviewer 未参与实现或修复；只读审查，唯一新持久写入为本报告。r1 报告保留；未改源码、正式 Evidence、Ticket/Map、生成物，未再次派遣。

## 固定输入与范围

完整输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 SHA256 如上。开始与结束逐一核验 12 个 working_snapshot 文件的原文字节/模式、36 个 sources 原文字节，无漂移；HEAD/base 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，stage index 与固定 tracked_diff_command 摘要匹配。相对 r1 新纳入 diff-editors.ts、diff-model.ts、styles/diff.css，原 9 文件中 7 个变化；全部 10 个变化文件实际阅读，2 个未变文件与 r1 摘要一致。

沿 r1 的 T-15、Spec AC-013–016、Issue #2 §7.2、DESIGN PAGE-003、SRC-010 与项目 dev/ui/公共双轴、风险、失败恢复合同复核。来源发现与原报告适用范围保持，补读的真实依赖包括 EditorContextService、review-page.tsx、既有 Resizable 封装，以及已安装 CodeMirror MergeView 的 DOM/滚动宿主源码；未以原型、旧 PR 声明或作者绿色测试代替本次判断。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: pass
Input-SHA256: 2120b9536e8ae0ab476d3539bab4816c3eae4f59ecbed2162d233aff0d677e72
Observed: 重新审查全部实际变化及直接消费者，未发现需请求修改的新正确性、状态、生命周期或项目工程规则问题。

- **固定比较与显示方向：** DiffSurface 只在显示层交换 immutable endpoints；左右正文、标题/路径/问题状态共同从 displayed 派生。requestId 加入 forward/reverse，旧方向的异步 diff 结果不能作为新方向 model 显示；切换/取消仍释放旧 Worker。原 comparison 未被改写，两次交换恢复原方向，差异位置通过 canonical anchor 与 hunk 映射转换。
- **恢复授权保持 canonical：** NoteReviewPage 的 candidate 仍从原 session.comparison 及 mode 计算，prepare 仍发送原历史正文、session.source.path、session.source.leafId。新增“用于恢复的历史版本”文案明确实际来源，显示反向不把当前 B 变成恢复来源。实际生产组件/NoteReviewService/HistoryQueryService 的回归验证了 replace-current 和 create-copy 两种 prepare 参数均不反向，且浏览操作不增加来源 capture 次数。
- **来源订阅与 prepare 门：** EditorContextService.get 返回缓存 context，editor-change 用新对象递增 generation，关闭/换文件返回 undefined。NoteReviewPage sourceContext 的订阅及 changed memo 因真实 context/generation/session 变化失效，避免纯展示偏好引发多余来源读取；prepare 仍即时调用 isCurrentChanged，并核对 beforeText 与固定 B。独立回归覆盖编辑后 restore 禁用、copy 仍可用、显式 refresh 更新 B、迟到/失效计划取消，未因 memo 绕过写入门。
- **真实滚动宿主：** MergeView 的两个 wrapper 列分别是独立滚动宿主，CSS 将外层设为非滚动、两列设为受限高度的 overflow；adapter 使用真实两列 host，而非误监听内部 auto-height scroller。stacked 使用各自 EditorView.scrollDOM。syncScroll 读取 source lineBlock、通过 hunk 映射 target position，再保留行内高度比例，不使用简单整篇百分比；开关更新时卸载旧监听并取消 scheduled/release rAF，destroy 同样清理。unified 没有双端联动，按钮明确禁用。
- **可调上下比例与 DOM 所有权：** stacked 使用既有 ResizablePanelGroup/Panel/Handle，20–80 上下界、5% 键盘步长、水平 separator 语义/名称与双语词典接入。React 拥有分隔组和两个 mount；adapter 仅创建/移除自己的 CM/pane roots，不再清空 React 所有的整个 parent。调整后请求 CM measure，不重采 B。比例、交换和同步偏好放在共同父层；各 loading/三模式消费者传递同一 preferences，布局仍独立保存手动选择。
- 未新增宿主 View、跨模块内部依赖、正文写入或 Git 操作；CSS 仍模块作用域、语义令牌，无新增 `!important`。diff-model.ts 本次只增加有界展示偏好类型/默认值，差异算法与恢复原文合同保持。

Findings: []

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: pass
Input-SHA256: 2120b9536e8ae0ab476d3539bab4816c3eae4f59ecbed2162d233aff0d677e72
Observed: r1 的三个明确核心合同缺口均已按生产入口修复；本轮未发现新增规范偏离。

| 原 finding | 当前满足条件与实际证据 |
|---|---|
| SPEC-01：交换两端缺失 | 通用工具栏有双语可访问“交换显示的版本”；三布局各自执行两次交换，正文、端点标签与原 comparison 不变性通过实际 CM 回归。方向变更只重算固定文本的显示 diff，不重读 Git/来源 B。NoteReviewPage 真实组件测试确认反向后恢复/副本的 canonical 历史 source、当前路径和 source leaf 保持，另显式说明恢复来源。 |
| SPEC-02：同步滚动不可切换 | 两个双端布局均有明确 pressed 状态的开关；真实 MergeView 两列与 stacked 两 scroller 的行块映射回归验证关闭后对侧不动、开启后正反映射，卸载前已排队 rAF 不再改写对侧。三模式 loading 后交换/同步偏好保留；unified 禁用双端同步。 |
| SPEC-03：上下比例固定 | 可访问 separator 实际响应 ArrowDown、Home、End，50→55、80/20 边界及切离/返回 stacked 的比例保留通过回归；历史 loading 后比例 55 仍保留。比例跨 Git 三模式通过共同父层 preferences/各 AsyncDiffSurface 的真实接线核对；模式回归显式验证布局、方向与同步，不把其未单独断言的比例变化误称为单独实机证明。 |

原 AC-013–016 的完整核心回路沿 r1 结论核对：三 Git 模式的 root/merge-parent/rename/MM/特殊路径端点、不可变 B、迟到取消、prepare→checkpoint→revalidate→apply→verify→receipt、restore/undo/copy、批注和持久 sync hold 的核心实现未被本修复修改。此次变更只扩展统一显示与偏好持有，保留 read-only 编辑器及 canonical 写入授权；原 r1 的 89 项定向证据适用未变核心边界，不重复运行以制造新的数量声明。

DESIGN 仍为 revision 2 / digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c` / PAGE-003。本轮对照实际组件与交互合同，未修改设计给实现补票。T-16 按块/F、T-27 受管档案 owner、T-32 文档和生成物集成仍有各自范围，本结论不声明其完成。

Findings: []

## 本轮独立执行与限制

实际执行以下与修复相关的生产消费者回归：

```text
pnpm exec vitest run --no-cache \
  src/modules/versioning/ui/diff.dom.test.tsx \
  src/modules/versioning/ui/sync.dom.test.tsx \
  src/modules/versioning/ui/history/NoteReviewPage.dom.test.tsx \
  src/modules/versioning/ui/history/local-history.dom.test.tsx \
  src/modules/versioning/ui/diff-model.test.ts \
  src/app/editor-panel/context.test.ts

Test Files 6 passed (6)
Tests 42 passed (42)
Duration 3.21s
```

其中实际 CM editor/model、browser Resizable 实现、生产 NoteReviewService/HistoryQueryService/NoteReviewPage 与来源 context 的事件/失败分支都有对应断言。并非仅检查按钮文案存在：覆盖正文和标签交换、canonical prepare 参数/未写入、capture 计数、映射后的滚动位置、rAF 清理、键盘比例与加载/模式持有。DOM 使用 happy-dom，不能证明真实 CSS 几何、触屏拖动或实际宿主滚动表现。

`node --check scripts/obsidian-acceptance/versioning-history.mjs` exit 0；脚本内容相对 r1 未变，本轮只检查语法，**未执行该脚本、Chrome、真实 Obsidian 或原 25 宿主场景**。

作者报告的 26 文件/188 测试、全测试类型、6 生产 lint、CSS 23 文件、i18n 5,072 keys、diffcheck 与全局类型闭合为上游记录，本 reviewer 未标为自己执行；未重复范围外全量检查，也未验证最终 main.js/styles.css 集成。实际 source/字节验证与人工代码追踪是本报告的判断依据，绿色测试数量不替代审查。

按 SRC-010，真实主窗/popout、平台实机、人工视觉/明暗/1440 与 390/触屏和键盘焦点、真实性能测量保持 **user-owned / not-run**。本轮代码双轴通过不表示这些真实验收通过，也不表示整个 change 完成。

Summary-Counts: standards=pass / 0 findings；specification=pass / 0 findings；skipped_axes=none。
Disposition: T-15 r2 固定范围双轴代码审查通过，交 Lead 核验真实派遣、输入与集成状态；已完成本轮审查并停写，不更新正式状态。
