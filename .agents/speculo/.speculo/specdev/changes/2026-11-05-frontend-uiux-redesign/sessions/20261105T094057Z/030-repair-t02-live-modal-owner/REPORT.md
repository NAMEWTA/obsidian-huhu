# 任务回报

Session: 20261105T094057Z
Task: 030-repair-t02-live-modal-owner
Status: completed

## 聚焦交接

028的五个精确source反例全部修复：owner存活/可见与焦点目标可用性分离，严格目标过滤保留。正常动效进一步验证出父Dialog早于dirty子确认退出，source暂时仍被子层aria-hidden；经Lead明确纳入同030范围，改为等待所属关闭子Content的真实FocusScope退出后再恢复。无固定sleep、marker启发式、全局焦点监听或放宽隐藏目标。

最终七文件60项DOM、独立原24项、scoped类型/lint/diff均通过。干净原生产打包小探针passed/errors0：1个矩阵样本，显式CDP normal+reduce，共8组语言/Document交互、40条精确嵌套source、12条详情保留与4条owner销毁记录。它不是最终66例验收；未在031 joined修复与新增几何fixture整合前重跑66。源码/测试及当前fixture已冻结，等待独立复核与后续整合任务。011/026等旧报告未改。

## 产物与验证

### 改动与根因闭环

相对026，只改modal-layer.tsx、modal-regressions.dom.test.tsx及T02 fixture/index.tsx、index.mjs。其余21条生产/测试路径保持原字节；dirty-modal.tsx也未改。

- **028 S-01**：liveOwner仅判断所属区域仍在正确Document、连接且实际可见；背景aria-hidden不再作为owner死亡依据。真正source/F6/候选仍由available严格过滤aria-hidden、hidden、inert、禁用与CSS隐藏。没有读取data-aria-hidden来猜owner状态。Dialog/Sheet Keep Editing与Esc四项、普通嵌套Dialog一项，均在真实FocusScope退出和排队工作完成后断言原source，而非宽泛parent.contains。
- **正常动效关闭顺序**：直接监听已脱离DOM的生产Content Scope退出，确认父Dialog先退出时，dirty-trigger的SECTION仍为aria-hidden/data-aria-hidden；错误回退为可用的Notice Retry，稍后子确认才解除隐藏。正常动效trace保存在browser-exit-trace/result.json；这不是猜测计时。生产层保留已注册Content引用，按Document与逻辑owner找仍连接且closed的子Scope；父恢复等待其一次真实退出信号，再重验owner、source、当前top modal与新焦点意图。隐藏过滤不放宽。
- **待恢复生命周期**：每owner最多一项待恢复，新请求移除旧监听；owner销毁/迁移取消，结束移除所有一次监听；新有效焦点或新顶层modal建立意图时不抢焦点。条件卸载Dialog但页面仍存活依然恢复。新增受控真实Presence动画退出测试，保留“父先退出、child仍连接且source被隐藏”的事实，再发实际animationend、等真实Scope退出；没有fake timer或固定等待。配对验证owner卸载、新焦点、新modal和actual queued owner跨Document迁移。
- **Document负控制**：早期直接helper负控制被更强的真实queued路径替代：父实际Scope退出产生待恢复，child仍在退出；将整个owner容器adopt到iframe，再结束child退出。旧Document回调不能进入新Document抢焦点。仅临时撤掉deferred Document守卫，选中该用例红1项；恢复原源码后绿。测试先显式卸载adopted React root再移除iframe，避免测试清理本身产生removeChild误报。

生产等待依赖安装的Radix FocusScope实际focusScope.autoFocusOnUnmount事件，不假称公共稳定API。现有严格适配器scripts/radix-owner-document.mjs和scripts/ui-adapter-inputs.json绑定已发布源：react-focus-scope/dist/index.mjs为1份、SHA256 52da53d1da1626ab3bde726e5195e1f5062a6f170755131991225517dc980957；生产打包仍做hash与图数量校验。未来依赖源/hash变化必须重审此事件契约；本票真实DOM与原打包浏览器控制同时约束该行为。未修改node_modules或适配guard。

### 实际红绿与检查

全部原始材料只在 /tmp/huhu-t02-live-owner-repair。

| 检查 | 实际结果 |
|---|---|
| 原028独立24项 | reviewer-red.log：退出126，5 failed/19 passed；reviewer-final.log：退出0，24 passed；原025控制均保留 |
| 本仓复制五个精确source控制 | own-red.log：退出126，5 failed/21 passed；最终本文件31项通过 |
| 父先退出/child动画后退出 | parent-exit-red.log：退出126，1 failed/26 passed；真实animationend+Scope信号转绿，另增加三种新意图/销毁及迁移配对控制 |
| 实际queued迁移控制暂撤Doc guard | queued-document-red.log：子进程退出126，1 failed/30 skipped；原源码finally逐字恢复；queued-document-final.log退出0，31 passed |
| 七文件完整范围 | dom-frozen.log：退出0，60 passed，保留原50的草稿/ref/StrictMode/F6/IME/canClose/owner/leaf等风险 |
| 生产/测试 scoped tsc | 既定--noEmit --skipLibCheck，types-prod-final.log、types-test-frozen.log均退出0 |
| fixture scoped tsc | types-fixture-final.log：退出0 |
| scoped生产ESLint零警告 | lint-final.log：退出0 |
| git diff HEAD --check目标路径 | diff-check.log：退出0 |
| 原runner同实现的单例native探针 | native-final/result.json：passed，errors0；8组/40精确source/12详情/4owner；没有执行66 |

小探针副本/tmp/huhu-t02-live-owner-repair/desktop-probe.mjs只将矩阵选择限定desktop390/zh/ink/1x；实际生产imports、样式、ASAR与严格适配器沿用原runner。fixture exercise明确设置CDP prefers-reduced-motion为no-preference和reduce，并在每种模式重置viewport/touch、配置motion:system；不靠最后一例原矩阵留下的reduce状态。八组分别为normal/reduce×en/zh×main/second，原source必须在实际Scope退出及排队工作结束后相同。

早期正常动效失败、trace和首轮正常/减少组合失败均保留。后者在另起Sheet前只等父Dialog DOM消失，仍在退出的旧Alert匹配了新确认选择器；修复为整个modal subtree退出与有限动画/焦点状态完成后才进入独立下一场景，未更改产品期望。最终成功探针没有外部CDP干预。无额外全库构建或可选检查升级。

### secondary几何与当前输入

fixture在visibleFrame后读取并断言每个owner Document的clientWidth、innerWidth、iframe bounding width与实际Dialog bounding/computed width，期望仍为min(512,该Document viewport−32)，不根据截图像素改产品规格。

native-final原样本实测：主Document viewport390、Dialog358；secondary顶层垂直滚动条使可用CSS viewport375，frame375、inner375、Dialog343，DPR1、body zoom1。新截图component-dialog-390-zh-ink-...-second.png人工复看宽度正确343。先前mobile390探针两Document viewport390/Dialog358。旧011约164截图没有同步几何记录，不能倒推出历史具体原因；当前源宽度规格未改，新增读数/断言绑定on-screen实际布局并防止以后用截图像素误判。后续全矩阵仍须覆盖所有缩放/视口，不将两个局部测量扩称全部视觉验收。

最终native inputDigest：6514fa7a3fd82cd885e6d9c117317e44cb50071a842901b3f03d0adcf0bb0758。
固定共享styles.css由Lead构建，SHA52208d87949d86a28d1a247441edb3709cd859d0a57e9fe1722368271d7b94c8，1,276,445字节；本worker没有资产写入。全部普通编译输入重新hash drift[]，记录frozen/native-input-check.json。

### 全局类型事实与冻结

Lead提供最新实际全局tsc：/tmp/huhu-t02-lead-verification/types-global.log，退出126；types-global-summary.json为552 diagnostics/170 files，T02自有代码无错误，ui/calendar归T05、shell归T04，其余消费者按原账本迁移。这个结果由Lead执行，本worker仅核对提供的摘要，不能把局部绿色写成全库绿色。011不可变报告之后的028发现与本全局事实由本030补记，不回写旧报告。

25条精确源/测试/fixture副本：/tmp/huhu-t02-live-owner-repair/frozen/manifest.json。
摘要：df799c9213927dbf1b361788b108d8ff029cb595951bed055f0e9b4305d95f51。
基线HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。
其中23原生产/测试只有上述2路径变化；另2为当前fixture。没有其他源、共享字典/配置/依赖/assets、正式状态或Git index写入，无提交/推送/委派。

## 问题与下一步

本范围已知source/退出顺序/待恢复意图控制全部绿色，生产与当前fixture冻结。等待独立high delta；031短/icon joined几何已由其worker单独交付，但本fixture尚未加入该完整覆盖，按Lead安排另开整合任务后再跑原始66及独立E2E。011/026与所有失败证据保持不变。真实Obsidian主窗/浮窗、全库迁移和最终产物由Lead集成验收；不宣称T02或Goal完成。
