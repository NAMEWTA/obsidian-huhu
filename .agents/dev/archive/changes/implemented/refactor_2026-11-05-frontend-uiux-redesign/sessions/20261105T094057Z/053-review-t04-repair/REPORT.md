# 任务回报

Session: 20261105T094057Z
Task: 053-review-t04-repair
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_t04_startup（既有 gpt-6.1-sol high，未参与实现、未委派）。standards **pass**；specification **request-changes**：050 的 S-01/P-01/V-01 均已实证关闭，但 Lead 补充要求核对的 separator 焦点偏移确为 -2px，仍偏离 DESIGN §3.6 的 +2px，新增一项 P2。Intro 6/6、独立原失败及未提交 DOM 控制 2/2、精确类型/生产 lint0；独立当前320fine完整 canonical、双主题/双 Document 的 Rail 常态/可信 hover 通过，强制580叶详情1440宽的负控制被正式断言准确拒绝。53源/2251图/CSS/共享049结束无漂移；**释放本次053 reviewer 冻结**，Root 正在运行66的独立冻结和处置仍归Lead，不宣布全票/Goal完成。

## 产物与验证

### 固定输入与审查范围

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。observed HEAD `37fcede4210a19bcc2a74809e7fdd301e5717957`。读取053/051 TASK、051最终REPORT、原050报告/反例/私有浏览器配对；沿用未变化AGENTS/dev/ui/测试/Obsidian生命周期与SpecDev独立双轴/错误/可靠性合同。规范来源仍为 T-04/Map16/Spec、批准DESIGN revision3/UI-002；sources-manifest.json 留实际规范/标准字节。按Lead补充只读指令检查同属冻结53源的 ShellRoot separator，未因此扩大写集。

051五路径 delta manifest SHA **8f883ddcb20ce7a419a1181bf70b71585eaa33642c2bb1417793ec987bdc1ac7**；合并53路径 manifest SHA **fcb7cfb28e110fb5a7cd8f1ecbc833eb1c84ddce8afca1078b1018e2a36b9974**。相对050/041原快照正好五条变化：IntroModal/Intro DOM测试/Rail/T-04两个fixture；其余48条逐字相同。五条与合并53条开始/结束都同时匹配当前及 frozen/；公共source-files scope与限定tracked diff-check退出0。

2251 native输入清单文件SHA `54b73bb5bd687e30679759a3e7c31c96fd2f8310b78212fe33f73575870c48c0`；按runner原JSON字节序列重算 inputDigest **621e0f8bbfa16988d03f8f78d893e20b52702d34c1ce4eaaa9be88278ebef3cd**。2250实体文件和ASAR内app.css分别按真实字节、header/offset提取，与当前/frozen-inputs匹配；CSS SHA **a4d860fcaa6dcc07fbdbff6dddb3f5b86021a5adfe06b39838ecb7bdd4b527a1**。before/final-verification.json 保存结果，drift=[]。共享Root049的13路径当前仍全部等于09d071…b241快照，取消/真实opener/state/metrics等结论保持原限制。

仅写本不可变REPORT及 `/tmp/huhu-review-t04-repair`；所有正式源码/资产/配置/依赖/索引/状态/Evidence/Git只读，无修复应用、安装、worktree、提交、推送或发布。051类型曾拒绝私有非公开onEntryFocus的历史材料保留；当前正式fixture已移除该prop，未cast/suppress/改公共API，实际类型复跑为0。

### standards 输出

Reviewer: native:/root/review_t04_startup
Result: pass
Findings: []

**050 S-01关闭。** 实际IntroModal在清理DOM之前计算 `opened && disposeContent && contentEl.querySelector('.huhu-design')`，之后才dispose/empty/onSeen。不是仅凭import已resolve或保存函数就确认。onOpen原先清空旧内容/句柄和推进generation，cancel先清opened并作废generation，晚import/重开仍隔离。

本人原050 failed-import测试原断言未变，当前关闭真实alert/retry UI后seen保持0。独立再补“lazy模块已返回可调用dispose，但还没有提交任何Intro DOM”的控制，实际IntroModal关闭后seen仍0且dispose一次，证明真实DOM门不是形式判断。仓库当前6项用实际Intro内容验证：pending close不确认、失败关闭不确认、重新打开失败后点重试→真实成功树→用户确认一次、再次失败不追加确认，及mounted/late-import/failed owner cancel清理。原successful acknowledgement行为保留，没有为了错误路径一律禁止seen。

五路径delta未引入新生命周期/状态/接口问题：Rail仅active样式；fixture有界独立React roots走原HuhuProviders/Portal/Modal stack，key关闭先unmount再remove、计数对称；真实菜单回调、Scope退场/精确来源和原dirty/device/wheel/adoption/visibility协议仍保留。没有新焦点/取消引擎或全局监听。原050 unit43、未触及的DOM/lifecycle/scroll retention、049共享证明按原范围复用，没有伪造整套重跑。

本次新增separator问题属于规范轴。实际键盘仍可到达、focus-visible=true、2px solid accent清晰存在，ArrowRight也真正修改宽度；未观察到可达性或功能失败，故不在标准轴复制一个缺陷。

### specification 输出

Reviewer: native:/root/review_t04_startup
Result: request-changes

**050 P-01关闭。** actual Rail active使用raised/accent、card阴影加line rim、3px marker（上下9px、右圆角3px），hover保持raised。本人独立Chrome量测 paper/ink × main/second × normal/可信鼠标hover共8态：paper bg255/255/255，ink37/35/31，分别准确等于同主题raised；marker3、top/bottom9、radius-right3，button36/radius8；阴影及rim存在，hover不回soft。样式及截图已目视；原320fine正式fixture还精确比较accent/语义shadow参照。粗目标44、键盘/上下文owner由未变协议及当前390coarse固定图证明保留。

**050 V-01关闭。** 正式fixture已持久加入实际components的ownerless31<Sheet40与lower physical owner41<later unrelated Dialog50，量真实elementFromPoint，低层itemHit均false，后开Dialog已拥有焦点；受控程序性背景打开只作负向准备，没有冒称可信点击。同owner菜单41/Sheet40则以CDP真实source/item命中点击，selections恰增1并回精确trigger；重开后继续两级Escape、真实FocusScope unmount与精确原header opener。main/second均执行，finally/exercise关闭所有新增roots，layer mount/unmount3/3及Portal/pointer/scroll locks检查通过。

本人独立执行完整当前320fine canonical，2251图与621e…ef3cd相同，status=passed/errors[]；实际各doc上述正/负控制与原详情/轮询/迁移/可见性等流程均保留通过。051当前320fine-public-api、390coarse-final固定结果也逐一回读匹配同图，不再使用非公开prop早期结果作为当前证明。

**原Root浮点失败的语义修正通过。** 原失败579.9999389648438!==580材料保留。新fixture读取前等待真实有限WebAnimations完成，精确computedCSS断言360/580，只有DOMRect允许绝对误差严格小于0.01；actual leaf580/620、main568、1324/main1000与1323/main999、节点/草稿/选区/scroll等仍精确检查。本人通过私有driver在真实580叶的真实Sheet上仅注入DOM style width1440，未修改生产源或断言；正式fixture立即在index.mjs:482的精确CSS断言以1440!==580失败，negativeWidthApplied=true。说明容差没有掩盖原1440相对580问题。

**P-02 · P2 · Separator焦点偏移仍为-2px，未符合批准DESIGN的+2px。**

定位 `src/shell/ShellRoot.tsx:220` 的 `focus-visible:outline-offset-[-2px]`。Lead在本轮补充要求核对该现有53源；原050未报告不能构成设计豁免。DESIGN §3.6明确 `outline:2px solid var(--hu-accent)`、offset2，只有输入框的强调边框/3px光晕被列作例外。

实际Chrome paper/ink × main/second，在真实聚焦separator后通过CDP ArrowRight触发键盘模式：activeElement准确为separator、focusVisible=true、outlineStyle=solid、outlineWidth=2px、outlineColor正确为accent，**outlineOffset全部-2px**；aria width从272→280等真实响应。截图显示32×720整条命中带的内描边，native-separator-focus/result.json及separator-*.png保存并已目视。不是根据class推测或DOM伪几何。

保留一个不能省略的来源细节：批准UI-002 final/styles.css:607–610的具体 `.panel-resize` 原型使用 `outline:none` 加2px强调线，而其全局focus token同为+2。因此原型确有具体separator焦点表达，但它也不是当前-2外框；没有找到准许生产separator改用-2的正式DESIGN例外或批准记录。按当前DESIGN规范轴交回偏差，不把“防全高裁切”的实现解释当批准。

最小满足条件是在不改变32/44命中、拖拽/8px键盘、panel272/220–480和现有区域焦点机制的前提下遵循现行+2标准，并验证外描边可见/不被裁切；若要保留另一表现，需由原设计owner处理明确例外，不能在本review自行改DESIGN消除finding。Lead已收到实际量测和原型差异。

### 实际命令与结果

私有所有输出在 `/tmp/huhu-review-t04-repair`，使用真实项目dom/setup/types/lint与当前生产源。

| 检查 | 实际结果 |
|---|---|
| delta5/merged53/2251 native图/CSS/共享049前后SHA，source-files scope、限定tracked diff-check | 退出0，drift=[]；before/final-verification.json、source-scope.json |
| `TMPDIR=/tmp/huhu-review-t04-repair pnpm exec vitest run --project dom src/app/intro-modal.dom.test.tsx` | 退出0，6/6；intro-dom.log |
| `pnpm exec vitest run --config /tmp/huhu-review-t04-repair/vitest.config.mts` | 退出0，原failed-import+独立uncommitted DOM共2/2；independent-intro-final.log |
| `pnpm exec tsc -p /tmp/huhu-review-t04-repair/tsconfig.json --pretty false` | 退出0，精确生产/测试/fixture+真实传递依赖0诊断；types.log。不是全仓类型通过 |
| `pnpm exec eslint src/app/intro-modal.ts src/shell/rail/Rail.tsx --max-warnings 0` | 退出0，零警告；lint.log |
| `node .../driver-320fine.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out .../native-320fine` | 退出0，1完整原计划样本，双doc/errors[]/cleanup全过；native-320fine/result.json |
| 私有rail-paints-driver同参数，out native-rail-paints | 退出0，2有界paper/ink量测样本，双Doc8个正常/hover态全过；computed与截图 |
| 私有width-negative-driver同参数，out native-width-negative | 宿主退出126；预期失败在真实1440!==580断言，mutation applied=true；不是产品失败 |
| 私有separator-focus-driver同参数，out native-separator-focus | 退出0，2有界量测样本，真实键盘及双主题/doc的-2px证据；不是规范通过证书 |
| 053 dispatch validator | 退出0，errors=[]、warnings=[] |

本人320driver SHA `06dd05d2340af452eb13032e2c919fb6fbe1222a01014fdd238ed60ae862aac8`；rail量测driver `20967448ffc2f83fa3b393e6e145f6b87c8017c129e173af77cdf29516ca6a12`；separator量测driver `9e0a5fb6d0cac99ae61baa181e6c4bdc308ee36de3e26e67479dd694acf60a26`；width负控制driver `276eb011f1da00ca86b11aa4ed04d4b06924062df960f3f562af3711584b39e7`。private-commands-manifest.json保留私有测试/driver摘要；全部浏览器production输入仍为2251/621e…ef3cd，私有driver另行标识，没有把runner原hash冒充当前私有控制代码。

最终读Root `/tmp/huhu-t04-lead-repair-final/result.json` 尚不存在（全66仍运行），故没有采信未完成的case计数或声明66通过。未重复build/main.js、全局类型、budget/notices、真实Obsidian主窗/popout/移动端；iframe是真实第二Document，仍不是Obsidian宿主。

## 问题与下一步

050三项与binary-float语义修正均已关闭，原050 request-changes报告及红灯材料不改写；仅新增P-02规范缺口待Lead处理。**本次053 reviewer冻结明确释放**；Root66的独立输入冻结、是否中止/重建新图继续由Lead负责，本文不授权绕过其检查。

请最小修复separator焦点表现或由原设计owner明确裁定，保留当前成功回归及负向宽度控制，再冻结受影响源/样式验证。T-04/Goal状态、完整66与宿主/全局集成/T13–T14债务均不由本报告推进；无提交/推送/发布。
