# 任务回报

Session: 20261105T094057Z
Task: 019-review-t02-modal
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain；未参与011/本候选实现，未改源码、依赖、产物、配置或状态，未委派。标准轴 request-changes，规范轴 request-changes，共3项P1、2项P2：两个本范围编译点、DetailPane跨断点丢草稿、隐藏焦点候选与React19 callback-ref清理丢失。原23项DOM测试和局部lint通过，但独立9项压力回归得到6 failed/3 passed，不能以原绿色数量覆盖这些结果。**本 reviewer 明确释放21路径冻结供Lead派发修复**；T-02完整fixture仍在实施，不纳入本次最终证据。

## 产物与验证

### 固定输入与独立性

Review mode: working-tree；基线HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。Strategy: independent；Risk: high；Independence: required；Mode: native。实现者为native:/root/implement_t01及该分区实际writer；本reviewer未参与实现，Lead核验真实派遣/返回关联。

精确21路径由 /tmp/huhu-t02-implementation/modal-frozen/manifest.json 绑定，digest aea19368637ffb38048cdc3fcf6f095a750499bbe4988982f3722b94c7078876。开始及结束逐一重算实际SHA256，全部匹配；tracked diff相对HEAD检查，新文件另读实际字节；git diff HEAD --check对21路径退出0。原writer实际消息明确冻结这21路径，因此按019授权在011最终REPORT前审查；没有把仍写入的T-02 fixtures当作冻结输入。

读取AGENTS、dev/ui及已读不变的code-review/risk/范围/错误与测试合同；本次规范来源为T-02、scope ledger中的Lead收窄分区、spec AC-011–013、DESIGN revision3 §3–7及UI-002既有批准。实际检查dirty-modal/modal-layer/imperative dialog、Dialog/Sheet/Alert/Command、ConfirmDialog/DetailPane、菜单/Popover/Tooltip/Sonner、gallery/prompt及21路径测试；追踪safe/automations/task等实际imperative消费者。016 primitives与017 tree结果保持独立，不把它们的执行声明当作本人证据。原失败/修复报告未改写。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P1 · 关闭按钮重复属性使本文件无法通过TypeScript。** 定位src/ui/components/dialog.tsx:83、88：同一个Button写两次aria-label。局部真实test config的tsc明确报TS17001。这是冻结源内问题，非其他并行分区暂态错误。最小修复只保留一份正确属性，不关闭检查；重新跑本分区类型检查及关闭按钮相关行为。

**S-02 · P1 · gallery仍使用已删除且不符合动效合同的height变体。** 定位src/ui/react/gallery.tsx:540，`CollapsibleContent animation="height"`。当前真实Collapsible只接受none/fade，scoped tsc报TS2322。DESIGN§3.6只动画transform/opacity，因此修复应迁移gallery到当前已批准变体，而非为通过类型检查恢复height动画兼容分支。这里准确组件为CollapsibleContent，不是Tabs；旧即时消息中的误称已向Lead更正。

**S-03 · P2 · 三种Content包装丢弃React19 callback-ref返回的清理函数。** 定位DialogContent的src/ui/components/dialog.tsx:138–142、SheetContent的sheet.tsx:116–120、AlertDialogContent的alert-dialog.tsx:110–114。新包装调用consumer ref(node)但不保留/返回其cleanup，之后仅调用ref(null)；采用React19返回式清理的消费者因此永远无法释放其监听/observer。

独立三份真实组件回归分别传入`ref={node => { if (node) return cleanup; }}`，卸载后cleanup均零次。不是对象ref或传统ref(null)路径的问题，而是当前公共ref类型允许的React19合同被包装破坏。最小修复需组合内部modal ref与外部ref，遵守返回清理和传统null回调两种生命周期，保证每次detach只清一次；复用已有合适模式，不新增平行资源管理器。Popover已有attachPopoverContent会处理forwardedRef返回cleanup，可作本仓库语义对照。回归应包含三组件、对象ref及返回式/传统回调，必要时包含StrictMode/re-render。

**S-04 · P2 · F6与关闭回退会选择隐藏/不可用的焦点目标。** 定位src/ui/react/modal-layer.tsx:142–147、164–168、178–190。firstFocusable直接返回第一个匹配，不看hidden/inert/可见性；F6只检查节点自身hidden，忽略隐藏祖先。当前对source的可恢复判断也只有连接/Document检查，没有确认仍可接受焦点。

独立实际组件反例：opener移除后，所在HUHU区域先有hidden button再有可用fallback，关闭后候选为hidden button而非可用fallback；顶层Dialog中First后放hidden容器内button，再放Next visible，F6选择Hidden child。happy-dom实际允许焦点进入这些隐藏候选，不能据此宣称浏览器也会聚焦隐藏元素；但生产算法确定选错候选，真实浏览器拒绝该focus时也不会自动遍历到可用后备。

最小修复：统一校验实际可用焦点候选（含祖先hidden/inert、禁用与显示状态），用于F6、原source及后备扫描；无可用控制时聚焦合理区域，不能遇首个不可用节点就停止。保持Radix管理Tab/trap，不借此另造生产焦点陷阱。新增隐藏祖先、hidden source/fallback和无可用目标反例，并在最终浏览器确认实际焦点。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01/S-02阻止本分区集成，S-03违反生命周期合同，S-04违反DESIGN§7的顶层F6与来源消失后的合理焦点回归；同一问题不重复计数。另有一项草稿保留缺陷：

**V-01 · P1 · DetailPane跨响应式断点重挂表单，绕过dirty保护丢失草稿。** 定位src/ui/components/huhu/DetailPane.tsx:40–77。inline分支在aside内渲染children，窄宽分支在Sheet Portal内重新渲染同一children；切换时旧编辑器被卸载、新编辑器从初始值挂载。

独立反例使用真实DetailPane、现有测试同类ResizeObserver/clientWidth几何接缝：width1100、open=true、dirty=true，字段初始before，编辑为unsaved，再触发width999；字段立即回before，未请求关闭或确认。其公开children为任意ReactNode，实际编辑器可以持有本地状态；注释“callers own draft”不能使展示组件的隐式重挂安全。父级完全控制每个字段虽可掩盖此个案，不能证明组件保留传入编辑器的draft与lifetime。

最小修复：仅切换inline/Sheet呈现时保留编辑器实例/草稿及表单生命周期；resize不能被当作丢弃操作。至少验证双向断点变化、带本地React状态和非受控字段的dirty编辑器、列表DOM/滚动保留、确认取消/放弃路径。不能仅增加固定key或在重新挂载后静默重置来通过测试。

### 其他已检查合同

- 原有23用例证实普通dirty Dialog/Sheet的取消、Esc、遮罩先确认，继续编辑保留输入、明确discard才关闭；ConfirmDialog失败保留/报错/重试成功，未见用隐藏失败或强制dispose制造绿色。
- 独立canClose反例控制通过：imperative内容按钮、X、返回handle.close三条路径均经veto且不dispose；owner移除仍无条件释放并只onClose一次。首挂前pending close用例亦在原测试中通过。
- 独立真实Command IME测试通过：组合Enter不执行，结束组合后的普通Enter仍执行。并非只拿Input/Prompt测试推导Command。
- 独立StrictMode纯层栈用例通过：同Document父40/子50、toast65；另一Document根40/toast55；卸载第一Document嵌套后其toast回45，第二Document不变。源码未新增全局native键盘监听；useSyncExternalStore和entry effect都有对称清理。该测试验证逻辑栈，不冒称已验证跨realm的生产Radix trap。
- Portal继续取所属Document容器，实际modal/trap/inert仍交Radix；FloatingLayer仅传递父层偏移，没有另造Tab trap。菜单/Popover/Tooltip样式经父上下文生成，Toast独立非模态层；nested Command→confirmation的基础顺序/Esc现有用例通过。
- DetailPane阈值1000对应360详情后保留640主区，窄宽走共享Sheet；现有测试只断言列表节点未重建，没有覆盖V-01编辑器节点/草稿。样式使用HUHU token，未发现需要额外无关重构的Fowler命中。

### 实际检查

环境：Linux/Node26.11.1/pnpm11.1.3、真实React19/Radix/cmdk。全部新增过程文件仅 /tmp/huhu-review-t02-modal；唯一仓库写入为本报告。

| 检查 | 实际结果 |
|---|---|
| 21路径SHA256前后核验、相应git diff HEAD --check | 退出0，无漂移；manifest摘要匹配 |
| pnpm exec vitest run --project dom src/ui/components/dialog.dom.test.tsx src/ui/components/sheet.dom.test.tsx src/ui/components/huhu/DetailPane.dom.test.tsx src/ui/react/modal-layer.dom.test.tsx src/ui/react/foundation.dom.test.tsx src/ui/react/prompt.dom.test.tsx | 退出0；6文件/23 tests |
| pnpm exec eslint <manifest中全部非测试生产路径> --max-warnings 0 | 退出0，无警告 |
| pnpm exec tsc -skipLibCheck -p /tmp/huhu-review-t02-modal/tsconfig.json --pretty false | 宿主返回126；仅上述TS17001/TS2322，均在本范围路径；未加ignoreDeprecations/类型抑制 |
| pnpm exec vitest run --config /tmp/huhu-review-t02-modal/vitest.config.mts | 宿主返回126；9 tests，6 failed/3 passed：hidden fallback、F6隐藏祖先、responsive draft、三种ref清理失败；canClose、Command IME、StrictMode/Document栈控制通过 |
| validate-dispatch，stage=dispatch | 退出0，errors=[]/warnings=[] |

独立反例与配置为 /tmp/huhu-review-t02-modal/repro.dom.test.tsx、vitest.config.mts。使用原dom项目/setup/真实库，仅改变测试选择；没有mock dirty/layer/Dialog/Radix/cmdk。DetailPane几何替身仅控制真实ResizeObserver入口，与原测试接缝一致；未冒充实际浏览器布局。源码检查以21路径冻结为准，没有依赖可变fixture的最终截图或全库检查。

## 问题与下一步

五类发现及反例已即时发给Lead；现在可由原owner批量修复，重新冻结后独立复审。优先清除两个自有编译错误与resize丢草稿，再验证ref/focus公共合同。旧测试绿色不覆盖本报告红灯；不修改旧报告或关闭规则来消除证据。

仍待Lead/fixture owner：完整组合浏览器、生产构建实际Radix adapter、nested portal/trap/inert、弹窗多Document/IME/键盘、实际CSS几何与视觉、全库lint/type/build及产物一致性。本次raw happy-dom验证不是已打包adapter的浏览器证明；其他T-02并行分区错误和指定后续消费者迁移保持原归属。本报告不宣布T-02或Goal完成。
