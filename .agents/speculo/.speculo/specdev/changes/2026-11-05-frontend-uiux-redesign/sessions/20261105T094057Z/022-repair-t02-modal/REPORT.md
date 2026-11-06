# 任务回报

Session: 20261105T094057Z
Task: 022-repair-t02-modal
Status: completed

## 聚焦交接

019 的五类发现均已修复并形成独立冻结检查点，未改写019或011原快照。修复两个自有编译错误；三种 Content 正确组合 React19 返回式清理、传统回调和对象 ref；F6与回退共用可用焦点判断；DetailPane 使用一个稳定编辑器 Portal 宿主跨 aside/Sheet 搬移，保留同一个子实例、受控/非受控草稿、选区和滚动。新增回归从7 failed/3 passed转为12项全通过，连同原有六文件共35项通过，独立原019九项反例/控制也全通过。此报告完成后才进入已另行授权024的显式叶子宽度合同；022不宣称T-02整票完成。

## 产物与验证

### 范围与finding处置

开始回读完整019 REPORT/反例、022 TASK、011冻结21文件、T-02/DESIGN3/dev/ui及已读不变实施合同。保持原分区，只改六个原文件并新增两个文件：

- **S-01/P1**：src/ui/components/dialog.tsx 删除重复 aria-label，保留正确的翻译名称。
- **S-02/P1**：src/ui/react/gallery.tsx 将 CollapsibleContent animation=height 改为已批准 fade；没有恢复 height 兼容变体。
- **S-03/P2**：新增 src/ui/lib/compose-refs.ts；DialogContent、SheetContent、AlertDialogContent 组合内部 ref 和外部 ref，返回 consumer cleanup 时按 React19 调用该 cleanup，传统回调仍收到 null，对象 ref 归零。内部 setContent/ref 绑定稳定，避免仅层级通知引发无意义重绑；不新造资源管理器。
- **S-04/P2**：src/ui/react/modal-layer.tsx 的 F6、原来源及后备扫描共用可用性判断，排除 hidden/inert/aria-hidden、CSS display/visibility/opacity 隐藏、禁用祖先/字段组及不合适 tab 目标；无可用控制时聚焦合理区域。保持 Radix 的 Tab/trap；非模态呈现不注册模态层，也不额外截获 F6。
- **V-01/P1**：src/ui/components/huhu/DetailPane.tsx 只创建一个 DOM 宿主和一个 keyed React Portal，宽度改变时移动宿主而不是重建 children。编辑器逻辑树保持在同一个 Sheet root 内，窄模式继承正确模态上下文，内联模式 modal=false；模式切换不视为关闭。保存/恢复焦点、input选区和同一滚动节点；真正关闭才卸载编辑器并归还焦点，共享 dirty 确认继续有效。
- 新增 src/ui/react/modal-regressions.dom.test.tsx，覆盖上述 ref/隐藏焦点/响应式草稿反例及对称控制。

未修改 primitive/tree/use-density、配置、依赖、共享字典、styles.css/main.js、正式状态/Evidence 或 Git index；无提交、推送和递归委派。fixture继续按011分区独立实施，不属于本次冻结23文件。

### 红绿事实与实际检查

过程材料仅 /tmp/huhu-t02-modal-repair。

| 检查 | 实际结果 |
|---|---|
| 新 modal-regressions 在修复前 | 宿主退出126；10 tests中7 failed/3 passed（regressions-red.log），具体为三种返回式ref清理、隐藏焦点/区域、DetailPane实例丢失 |
| 修复 ref/focus 后、尚未改 DetailPane | 退出126；仅 DetailPane 仍失败（focus-ref-first.log），未通过删断言制造绿灯 |
| 最终七个 DOM文件 | 退出0；35 tests（dom-final.log），包含新12项与原23项 |
| 原019独立 repro 配置直接重跑 | 退出0；9 tests（reviewer-repros-green.log），保留 canClose 三路径、实际 Command IME、StrictMode双Document层栈控制 |
| scoped生产类型：tsconfig.prod.json | 退出0（types-prod-confirmed.log） |
| scoped测试类型：tsconfig.test.json | 退出0（types-test-final3.log） |
| 原范围全部生产路径+新增helper scoped ESLint | 退出0（lint-final.log），零警告、未关闭规则 |
| git diff HEAD --check -- 冻结23路径 | 退出0 |

类型配置由原019的真实 scoped配置扩展，仅增加新增 helper/test；无ignoreDeprecations、any或类型抑制。曾发现新测试 callback 隐式 undefined 触发 noImplicitReturns，显式 return undefined 后测试类型绿色；它不作为产品缺陷红灯。

新回归证明三种Content返回清理按每次detach恰好执行，含StrictMode；对象/传统回调仍正确清空。F6验证隐藏祖先、inert、aria-hidden、display:none与disabled fieldset；恢复分别验证来源移除、来源仍连接但hidden、无可用目标时区域回退。DetailPane回归双向1100↔999保存同一input/Editor实例、局部React状态、非受控值、选区、scrollTop73和列表节点；继续编辑不丢稿，明确丢弃才卸载一次。DOM几何接缝控制真实ResizeObserver入口，不冒充浏览器截图。

### 固定候选与后续边界

原21路径中实际变更：alert-dialog.tsx、dialog.tsx、sheet.tsx、huhu/DetailPane.tsx、react/gallery.tsx、react/modal-layer.tsx。新增 compose-refs.ts、modal-regressions.dom.test.tsx。完整原21+新增2的23文件副本/哈希：/tmp/huhu-t02-modal-repair/frozen/manifest.json。

快照摘要：ec23676b5ae613ad708a66d3013ea2fa8e9dc022e359a0406ce65ab123531445。
基线HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。

本检查点源码冻结，未声称本worker执行最终组合浏览器。011 fixture仍在实施；T-04只读预检另发现叶子宽度/主区宽度区分，Lead已另行授权024增加必需leafWidth prop并验证leaf620/main568与leaf580。它属于原T-02合同补齐，按新任务形成下一检查点；不静默修改022清单或本报告。原全仓模块消费者迁移错误、共享产物与真实Obsidian仍归原owner。

## 问题与下一步

019五类finding无本地剩余失败。接收本022冻结回报后按已授权024顺序补齐叶子度量；最终将022+024及011完整fixture组合冻结，由Lead派发high delta与独立E2E，保留真实宿主和全量集成的待验收边界。
