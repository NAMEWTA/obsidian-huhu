# 任务回报

Session: 20261105T094057Z
Task: 032-review-t02-joined-repair
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high独立角色，未参与031实现，未委派。standards **request-changes**；specification **request-changes**。031确实修复了短项横向不足及wrap计算矩形的正面积交叠，但84px wrap仍在原合同的严格内部点center+21.5处出现随邻项焦点改变的CSS命中和真实可信鼠标分发，确认剩余1项P2。它与数学共享边界的触摸半径歧义不同。

原exact-boundary触摸红观察保留且不单独列缺陷；本次新增有效内点红观察不能排除。本人实际Chrome、DOM7项、精确prod/test types、生产lint及七输入前后核验均已完成，源码/CSS无漂移。**明确释放四源码及共享只读输入的本次审查冻结，供Lead派修复。** 只写本REPORT和 /tmp/huhu-review-t02-joined-repair；无共享源/资产/配置/依赖/Git/状态改动，不声明T-02或Goal完成。

## 产物与验证

### 固定输入与独立方法

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；Mode: native。observed HEAD37fcede4210a19bcc2a74809e7fdd301e5717957；不以HEAD代替当前候选字节。实际回读027/031 TASK/REPORT及原JSON/探针/断言、032 TASK、T-02、spec AC-011/012、批准DESIGN revision3 §3.6/§5和既有AGENTS/dev/ui/code-review合同。未参与027或031实现；本reviewer此前模态审查不等于本次joined修复实现。

精确四源码绑定 /tmp/huhu-t02-joined-repair/frozen-sha256.json 与 frozen/；另冻结三个共享只读CSS输入。开始和所有原生采集完成后逐一计算实际SHA，全部匹配，记录 /tmp/huhu-review-t02-joined-repair/input-sha256.json、final-verification.json。

| 输入 | SHA256 |
|---|---|
| toggle.tsx | 0dcc1ff856c104d58c3fc4eb60c4600bad11946c65197aa01e2d68ec72f58c18 |
| toggle-group.tsx | 58ffd7f919df4be72805b7807081d46898ea78d810491a8315f90517cc0dba26 |
| huhu/SettingsFormControls.tsx | 6265e37728e9d84390921173b60a56193178597d55a35d62e344aa7498b44fbf |
| huhu/FormField.dom.test.tsx | 487a79241532289dc9b8c2ab2f83df003c7409bd94ac9156e284d963b4273154 |
| src/ui/styles/base.css | d1587fda54a316bd78c16dab54f2f5aa5eb649d105a2be48029b61d5d21675ec |
| src/ui/styles/tokens.css | 260a007a50e58731b185001024902bf59a722b1d3e387940d0c701dd1d2e582e |
| styles.css | 52208d87949d86a28d1a247441edb3709cd859d0a57e9fe1722368271d7b94c8 |

表内前三文件均在src/ui/components/，第四在其huhu目录。新私有CSS副本SHA与固定styles.css一致。每次独立bundle记录三个生产源SHA并匹配冻结值，真实guarded ownerDocument适配按实际依赖图计数，roving-focus1/focus-scope1/dismissable-layer1，其余严格入口为0；未mock React/Radix或修改node_modules。030模态源码及fixture可变，均不属于本次结论；没有要求全仓冻结或运行共享构建。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**HIT-01-R · P2 · wrap命中cell虽无数学面积交集，严格内部点仍随相邻焦点触发不同项。**

定位src/ui/components/toggle-group.tsx:46–47及80，结合base.css:24–35的44高居中pseudo。新gap使相邻44cell刚好接壤；既有focus:z-10/focus-visible:z-10与当前浏览器实际命中边界共同使接壤前的内部点被邻项抢占。这里不将computed box intersection=0误写为已证明实际partition稳定，也不猜定Chrome内部算法。

实际独立Chrome153、100%缩放、pointer:coarse、原84px wrap的“年/月/日”，两密度均复现：

| 几何/行为 | compact | comfortable |
|---|---|---|
| 年visual | x66,y690,w44,h32 | x66,y688,w44,h36 |
| 月visual | x66,y734,w44,h32 | x66,y732,w44,h36 |
| 年::before border quad | (66,684)–(110,728) | 同左 |
| 月::before border quad | (66,728)–(110,772) | 同左 |
| 固定有效内点 | **(88,727.5)**，年中心y706+21.5 | 同左 |
| focus年时elementFromPoint / trusted mouse / callback | 年 / 年 / a | 年 / 年 / a |
| focus月时同点elementFromPoint / trusted mouse / callback | **月 / 月 / b** | **月 / 月 / b** |

年cell的内部为x66<x<110、y684<y<728；727.5严格在内部，并且就是原center+21.5要求的点，不是728数学边界。读取DOM.getBoundingClientRect/getClientRects、computed ::before top/left/transform/boxSizing及原生CDP DOM.getBoxModel的pseudo border quad：切focus前后上述rect/quad完全不变，仅相邻项z-index在auto/10间切换。故不是源漂移、布局未就绪或用视觉32/36误代命中44。

0.25px纵向elementFromPoint扫描的补充事实：focus年时，中间月有效采样run为[728,771.25)，约43.25px；focus月后边界改变。该run是采样估计，不冒称完整浏览器几何真值；明确的同点trusted事件和回调已足以证明有效partition不稳定。内点radius1触摸仍送年，两密度相同；**本报告不把这个内点写成触摸误分发**，失败是CSS/实际鼠标命中分区与原有效内部点合同。

最小复现：原84px wrap、粗指针、任一密度；依次focus年/月，每次在上述固定点查询elementFromPoint并用Input.dispatchMouseEvent mousePressed/mouseReleased；每次最多一回调，但值由a变b。可直接运行私有interior-browser.mjs，interior-result.json包含完整输入、focus、点、rect/pseudo、扫描、trusted分发与回调；paint-browser.mjs/paint-result.json单独用DOM.getBoxModel确认pseudo border quads。

最小修复须让44独立cell的有效内点在相邻focus变化后仍有稳定归属，同时保留32/36视觉高度、横向partition、无隐形覆盖、键盘focus外框和单次回调。可以重新安排真实占位/分区或层叠，但不要仅删除失败点、将727.5改称边界、依赖Chrome触摸修正，或仅移除z-index后不复测原44内部点。修复后至少保留两密度、84/100 wrap、双方focus、CSS与真实事件的同点对照。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

HIT-01-R是同一剩余缺陷，不重复计数。它未满足032明确保留的严格center±21.5 CSS命中、邻focus变化后的有效分区，以及DESIGN3 §3.6独立粗指针≥44与AC-011共享控件尺寸要求。

独立确认031的已修复部分：sm图标与短中文coarse visual width44、pseudo44×44；细指针minimum32；compact/comfortable视觉高度仍32/36。新增最小宽度与去除canonical min-w-0解决原32/约37的横向短缺。根布局padding/gap实际为扩张留位，coarse行步进44，原84宽现在三行，100宽两列两行；逐对computed pseudo及原生box-model矩形无正面积交集。长标签保持完整较宽控制；没有新变体/并行输入引擎或无关重构。

**数学精确边界的独立判断：** 原point(88,728)确为两44cell的共同边，radius1触摸disk跨两侧。本人重跑也得到elementFromPoint稳定月、touch随预先focus可送年/月；额外unique-touch断言退出1，日志exact-check.log原样保留。单凭这个共享边界disk，不足以断言任何一个有效内部目标未达44；因此不单独列finding，认可仅对该数学边界排除唯一touch送达要求。该判定不授权排除727.5严格内点。上述HIT-01-R是进一步独立采集后确认的新事实，不能被边界分类覆盖。

### 实际执行与证据

环境Google Chrome153.0.8010.47、真实React19/Radix及当前生成CSS，100%缩放。私有新profile分别main/wrap/wrapwide/boundary/interior/narrow/paint；采集顺序执行，各自Browser.close并等自有Chrome退出，没有全局清理。输入无漂移，开始原生采集前已向Lead通报固定CSS匹配。源/测试/进程材料除本REPORT外只写授权/tmp。

| 命令或检查 | 实际结果 |
|---|---|
| node /tmp/huhu-review-t02-joined-repair/browser.mjs | 退出0；20布局观察+2真实键盘，errors=[]；compact/comfortable、fine/coarse实读media匹配；二/三图标、二/三中文、长标签 |
| 同目录wrap-browser.mjs、wrapwide-browser.mjs | 各退出0；各2密度，errors=[]；原84三行、100两列两行，完整edge taps及exact-boundary red观察保留 |
| 同目录boundary-browser.mjs、interior-browser.mjs | 各退出0仅代表采集完成；扫描边界两侧-2/-1/-.5/-.1/0/+.1/+.5/+1/+2、双方focus；有效内点出现上述CSS/trusted mouse红灯 |
| 同目录paint-browser.mjs | 退出0；两密度×双方focus，真实CDP pseudo border box均44×44且不变 |
| 同目录narrow-browser.mjs | 退出0；320 viewport、四密度/指针组合，全部五组（含长标签）无document/group横向溢出，child bounds在容器内 |
| python3 同目录verify.py base | 退出0；基线采集顺序的44内部CSS/touch、单次callback、键盘、矩形不交、320溢出通过；不能替代增强focus对照 |
| python3 同目录verify.py old | 退出1；直接读取027原browser/wrap JSON，短项32/约37<44、原wrap重叠10/6；原反例仍成立，未改旧证据 |
| python3 同目录verify.py exact | 退出1；保留精确边界unique-touch额外失败，不列单独finding |
| python3 同目录verify.py interior | 退出1；严格验证(88,727.5)位于第一cell内部且等于center+21.5，双方focus的CSS/trusted mouse目标不同 |
| TMPDIR=/tmp/huhu-review-t02-joined-repair pnpm exec vitest run --project dom src/ui/components/huhu/FormField.dom.test.tsx | 退出0；1文件7 tests；dom.log |
| pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-review-t02-joined-repair/types.json | 退出0；精确三个生产路径及项目声明/真实依赖；types.log |
| 同命令test-types.json | 退出0；精确四路径及声明/真实依赖；test-types.log |
| pnpm exec eslint 三个生产路径 --max-warnings 0 | 退出0，零警告；lint.log；没有把默认忽略测试列为lint通过 |
| 七输入前后SHA、私有CSS/每bundle三个生产源核验、git diff HEAD --check限定七路径 | 退出0，drift=[]，共享CSS字节未变 |
| validate-dispatch stage=dispatch | 退出0，errors=[]/warnings=[] |

DOM7项覆盖受控值、空字符串/数值与字符串区别、disabled键盘跳过、一次pointer回调及表单/忙碌ARIA；真实Chrome键盘ArrowRight短/长控制各恰好一次b。没有新增class-only几何测试；测量均来自真实CSS/浏览器，未使用happy-dom尺寸替身。原027的JSON和031报告保持原样；新的独立verify.py分别记录baseline绿、原始红、数学边界红及严格内部红，不用采集status=completed代替验收。

## 问题与下一步

HIT-01-R、精确坐标/双方focus/可信事件及最小私有复现已即时发Lead，候选现在释放。请修复实际内部partition后重新生成匹配CSS、冻结输入并独立复审；保持原横向44/无正面积重叠/视觉32或36/原84及100宽/受控键盘绿色，同时增加原center±21.5在相邻focus改变后的CSS与可信事件断言。不要只修额外数学边界，或削弱原有效点要求。

未执行broad build/suite、共享资产生成、最终组合fixture/Lead66或真Obsidian。030模态/fixture仍由其owner继续，其他已冻结不变原语证据可沿用；完整T-02组合验收、真移动Obsidian/WebView、原生popout与宿主平台触摸调整仍按原票保留。本文不宣称全票或Goal完成。
