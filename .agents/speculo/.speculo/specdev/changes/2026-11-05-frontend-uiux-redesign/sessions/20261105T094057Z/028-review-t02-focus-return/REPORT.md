# 任务回报

Session: 20261105T094057Z
Task: 028-review-t02-focus-return
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，gpt-6.1-sol high；未参与026实现，未委派，未改源码/配置/资产/Git/状态。标准轴 **request-changes**；规范轴 **request-changes**。025三项原反例全部转绿，但新增owner可用性守卫把“页面被存活父modal的Radix隐藏”误判为“owner已销毁”，阻止子层关闭返回仍可用的原控制，确认1项P2。

冻结23文件前后SHA匹配。本人七文件50项DOM、scoped prod/test tsc、变更生产lint均通过；独立24项19通过/5失败，五失败来自同一根因。**明确释放本次冻结供Lead派发修复**；旧报告与原反例保留。本报告完成028审查，不宣布T-02或Goal完成。

## 产物与验证

### 输入、独立性与审查范围

Review mode: working-tree；Risk: high；Independence: required；Strategy: independent；Mode: native。HEAD37fcede4210a19bcc2a74809e7fdd301e5717957。冻结清单 /tmp/huhu-t02-focus-repair/frozen/manifest.json，23文件，digest fcbf558c3332ef56d09de383346b8333aed0b92f02eb5b6706e6fc9c10dad9dc。

相对025仅dirty-modal.tsx、modal-layer.tsx、modal-regressions.dom.test.tsx改变；其余20路径复用025独立审查。前后逐一重算实际SHA，无漂移；23路径git diff HEAD --check退出0。记录在 /tmp/huhu-review-t02-focus-return/before.json 和 final-verification.json。没有将清单伪称完整Git历史diff。

已读028 TASK、026 TASK/REPORT、025 REPORT/原反例、026精确manifest和实际浏览器结果/对应fixture快照；沿用不变的T02、批准DESIGN3 §7、AGENTS/dev/ui及code-review双轴/独立性合同。重点检查逻辑owner捕获、嵌套portal归属、owner卸载与条件Dialog卸载差异、真正FocusScope异步退出后的最终目标。027触摸审计及011可变fixture不纳入本次生产范围；未重复其工作。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P2 · owner存活检查错误使用焦点可用性，吞掉父modal仍打开时的正常子层回焦。**

定位src/ui/react/modal-layer.tsx:269–272，直接错误条件为271行 `if (owner && !available(owner)) return`，关联owningRegion:238–241及available:151–182。

新增template锚记录逻辑页面.huhu-ui。dirty确认关闭时，父Dialog/Sheet仍开着，Radix继续将背景页面及其祖先设为aria-hidden；逻辑owner仍连接，但available(owner)因为aria-hidden祖先返回false。onCloseAutoFocus已preventDefault，随后在合法source恢复前提前return。子确认中的Keep Editing/Esc因此不能返回父层原来的请求关闭按钮。普通嵌套Dialog在生产PortalRoot display:contents下也沿ownerParent找到该页面，遭遇同一错误守卫。

独立实际组件用例（/tmp/huhu-review-t02-focus-return/nested-return.dom.test.tsx）使用真实TestProviders/React/Radix，加入生产src/ui/styles/base.css:11的.huhu-portal-root{display:contents}规则：

- Dialog和Sheet分别defaultOpen且dirty；父内容先有一个无关input，再有Exact dirty source关闭按钮。点此按钮打开确认，分别用“继续编辑”和Esc取消。直接监听实际alertdialog的focusScope.autoFocusOnUnmount，等待事件及排队microtask完成；父dialog仍存在，原按钮仍连接且没有aria-hidden祖先，最终焦点均为body，四项失败。
- 普通嵌套Dialog通过Exact nested source打开子Dialog、Esc只关子层，等待同一真实退出事件；外层仍存在，最终也没有返回原trigger，失败。
- 每例保存settled焦点后，仅调用现有restoreFocus(document,source,null)；原source立即获得焦点且断言通过，再以保存的settled值断言原合同失败。由此区分“合法目标被前置owner守卫拦截”和“目标本身不可用”。未mock该helper，未改生产实现。

最终独立24项中原025的19项全部通过，新5项全部失败。同一嵌套Dialog控制在未应用production contents规则的raw happy-dom中曾通过；补正确CSS边界后失败，因此报告采用最终结果，不用测试环境把PortalRoot当普通block的误绿证明生产行为。

这是存活逻辑owner与焦点候选可用性两种条件混用的具体正确性缺陷，不是要求重构helper或取消aria-hidden过滤。最小修复应区分owner是否仍属于存活Document/区域与该背景区域当前能否接受焦点：父modal仍在时，应允许恢复其合法source或顶层父modal中的合理目标；整个owner已销毁/迁移时仍须取消过期回调。不得简单删除025的root销毁保护、无条件禁用子层回焦，或放宽所有source隐藏过滤。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01违反DESIGN3 §7“子层关闭后回到原控制/合理父区域”的焦点合同；五个反例只计一项根因。普通浏览器trap可能把焦点重新拉回父层首项，仍不能替代返回原控制；本报告没有声称已在Chrome重现body终态，实际body结果来自真实Radix的DOM测试和准确生产CSS边界。

026修复025原三项的具体闭环成立：

| 025原发现/配对控制 | 本次独立结果 |
|---|---|
| 空display:contents preferred区域阻断fallback | 原helper与Sheet→inline取消反例通过；026另加DOM更前的其他owner控制，所属详情仍获焦点 |
| inline dirty discard延迟覆盖opener | leaf1100及580同一真实FocusScope完成信号下，保留distinct opener；原先首项混淆控制已消除 |
| 整个owner卸载抢走其他root焦点 | 原真实trigger/source移除/owner销毁/另一root已聚焦控制通过；不再跨root抢焦点 |
| source移除、owner仍存活 | 原配对控制仍正确聚焦Own visible fallback |
| 条件卸载Dialog组件、owner/opener仍活着 | 新增本范围回归通过，未用entry一卸载就禁回焦的粗略方案 |

owner template无tabindex、可见内容或布局盒，不加入F6候选；无新增全局native监听或第二套Tab trap。ownerParent只用于逻辑portal继承，ref/effect订阅仍有对称清理。之前React19 ref返回清理、传统/对象ref、StrictMode、顶层F6、hidden source、imperative canClose、IME、每Document层栈、DetailPane实例/本地草稿/非受控值/选区/滚动及leaf/main阈值都在50项及原19项中保持绿色。原独立inline document adoption仍通过；未把这一局部DOM证明扩为跨realm生产trap或Obsidian浮窗验收。

### 026实际浏览器证据适用范围

本人读取 /tmp/huhu-t02-focus-repair/browser-settled/result.json：passed、errors=[]、1 matrix case、4语言/Document交互组合、6条详情记录、两Document owner销毁不抢焦点记录。inputDigest为6c4fb206e48ba4dc12995dd367de8ff569aa2f566a0db0b5a5591f8f22798192。

独立重算inputDigest一致；2259个物理输入hash全部匹配当前字节。虚拟输入 /opt/Obsidian/resources/obsidian.asar:app.css 不是普通文件：按runner ASAR header/entry偏移实际提取app.css再算SHA，匹配f612f1e8f36486fa57f3b8bd45f0c848409d5b168002e757a13c6d286a7b4c41；未把路径不存在误报为证据失效。与本次manifest重叠的15个源输入全部匹配。完整核验摘要在final-verification.json。

对应026 fixture-checkpoint/index.mjs:724等处对DetailPane discard确实监听真实FocusScope退出并等microtask，owner销毁段也如此，足以支持上述三项特定浏览器修复事实。父modal取消确认段index.mjs:231–240仅断言父content.contains(activeElement)，没有精确断言原source，不能覆盖S-01。四个组合的宽泛绿色与本次新反例不矛盾。026探针不是Lead最终E2E；本次没有运行或认证worker66项为Lead接受，也不把其余当前可变fixture归入23路径源码冻结。

### 实际检查

全部新增过程材料只在 /tmp/huhu-review-t02-focus-return；唯一仓库写入为本REPORT。

| 检查 | 结果 |
|---|---|
| 前后23文件SHA及对应git diff HEAD --check | 退出0，全部相符，delta仅上述3路径 |
| TMPDIR=/tmp/huhu-review-t02-focus-return pnpm exec vitest run --project dom，选Dialog/Sheet/DetailPane/modal-layer/foundation/prompt/modal-regressions七文件 | 退出0；7文件50 passed；日志owned.log |
| pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-review-t02-focus-return/tsconfig.prod.json --pretty false | 退出0；types-prod.log；真实生产config限定生产范围及global.d.ts |
| 同上，tsconfig.json | 退出0；types-test.log；真实测试config限定23路径及global.d.ts |
| pnpm exec eslint src/ui/react/modal-layer.tsx src/ui/react/dirty-modal.tsx --max-warnings 0 | 退出0，零警告；lint.log |
| TMPDIR=/tmp/huhu-review-t02-focus-return pnpm exec vitest run --config /tmp/huhu-review-t02-focus-return/vitest.config.mts | 宿主退出126；3文件24 tests，19 passed/5 failed；independent.log |
| browser-settled输入/ASAR/摘要核验 | 无hash不符，1 case实际passed；证据范围如上 |
| validate-dispatch stage=dispatch | 退出0，errors=[]/warnings=[] |

原025反例逐字复制到本过程目录，旧目录不改；配置复用仓库dom项目/setup及真实依赖，仅更换include。独立新增用例不使用猜测timer或sleep；其返回完成信号来自生产Radix的真实关闭事件。

## 问题与下一步

已即时向Lead交付S-01及五个精确目标反例，冻结现在释放。请在存活owner/合法source间区分回焦条件后重新冻结复审；增加父Dialog、父Sheet、普通嵌套Dialog的精确原控制断言，等真实FocusScope退出及排队工作后再判定。保留原025三类和条件组件卸载/正常live-region fallback的绿色，不能只改宽泛parent.contains或删除owner保护。

最终冻结fixture、Lead独立原66项组合E2E、生产adapter多Document实际trap/inert与视觉/物理几何、Obsidian主窗/浮窗、全库lint/type/build及产物一致性仍按原计划验收。本次不扩展到027触摸审计，不宣布全票完成。
