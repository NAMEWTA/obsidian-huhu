# 任务回报

Session: 20261105T094057Z
Task: 044-repair-t03-date-composition
Status: completed

## 聚焦交接

五项042发现均已修复并提交冻结候选，供独立high复审；不宣布T-03接受或Goal完成。最终真实共享CSS/源码下，1个320矩阵样例及600个可信命中点、64条实际焦点绘制边检查通过；原040真实IME、双Document迁移、精确回焦、开放卸载和两宿主时区控制保留通过。13个日期源/测试/fixture文件已冻结并停止写入。Root已启动完整原始66矩阵 /tmp/huhu-t03-lead-final；本报告不替其宣称结果。

| 042发现 | 修复与实际结果 |
|---|---|
| S01 范围dismiss草稿错误残留 | opening(false)与opening(true)统一从最新受控value重建草稿；Esc、外部、Cancel不调用onChange，真实props.error和外部替换保留。独立原反例DOM转绿，实际reviewer协议Esc后合法trigger aria-invalid=false且无倒序残留。 |
| S02 实际弹层裁/盖焦点框 | 日期局部Popover外层overflow-visible，内滚动视口水平各4px绘制余量、scroll padding4，day scroll-margin4；保持标准outline2px+offset2px。进一步真实PNG发现选区邻格背景盖住td外框：仅定位td/focus-visible z1，td pointer-events:none、button pointer-events:auto，保留button命中clip。最终16幅实际DateField/Range、首/末列、两Document/两密度截图，四边均各80/80强调色像素；64条绘制边断言全部通过，不用矩形推断实际绘制。 |
| S03 Range纵滚裁44目标 | 原生inner date-scroll-viewport保留纵向wheel/touch/键盘滚动，scrollbar-width:none及WebKit同等隐藏，不占15px宽；Root明确同意此日期局部方案。外浮层312/七列308/每day44不缩，视口clientWidth=scrollWidth=320且scrollLeft=0，未靠横滚补偿。两Document/两密度真正scrollHeight616/628大于clientHeight494/502，可信wheel/touch-pan均改变scrollTop，Tab可见到Cancel/Apply。实际448日格内点和56最底行控制通过。 |
| V01 Today/Clear footer | DateField补齐本地化底部动作，沿既有pick/校验/commit；Today遵守min/max，Clear沿required-null行为，disabled/readOnly不能打开/修改，clearable=false同时取消两处局部clear。DateTime仍仅一个whole-value clear，Today保留时间及调用方zone/校验端口。footer强调色文字对齐UI-002既有--hu-accent-text。 |
| V02 图标/今日标记 | 日历trigger与clear分别内嵌输入左/右，独立--hu-hit单元保留44命中且输入文字留足空间；today改强调色文字、semibold和距底5px的4px底点，selected态沿已有实底/fg；不再粗体下划线。实际截图/伪元素尺寸、颜色、图标rect及真实en/zh footer控制通过。 |

仅日期组合内部增加leading装饰与DatePopupViewport辅助组件，公开index/value/时区端口未变；无新词条、依赖、跨模块导入或第二日期/定位/滚动/焦点引擎。DateTime的clearable=false集成沿040既有接口。严格日期、0000/0..99、边界、无效草稿、开放范围、controlled替换、IME与REQUIRED caller validateValue合同保留。

## 产物与验证

### 批准设计与精确输入

按批准DESIGN3 §3.6/§5/§7及UI-002 final/app.js dateField与final/styles.css 512–558核对：左图标/右清除，今天accent text+4px底点，Today/Clear footer；没有转写原型Air实现。仍只用实际@daypicker/react10.0.2/scoped locale/TZDate/DateLib和既有Popover/Input/Button/FormField；许可/安装收据沿040，未安装或改node_modules源码。

最终Lead共享styles.css 1,283,693bytes，SHA **4628d577624f6b44e1204f7339e3c6dbf5873d98ab59eae5e9bcb717ad280c85**。Calendar SHA **d08b1e7f1b2e6527fd396e5c99bc977a3c09c63cb21c4becdc0b479b9c9bb1a3**、DateField SHA **85c5d34689912ae9d8b9bdbc78e4b4de6e9b2b0db7ad55ab3edaa382f80de07d**均由Root确认后才运行最终canonical证明。共享overlay/i18n/CSS均Lead单写；本worker没有改共享组件/配置/依赖/资产/Git/index/正式状态/Evidence。所有私有CSS试验直接既有Tailwind CLI输出/tmp、既有scopeTailwind处理后补充冻结CSS副本，不生成共享raw/scoped文件。

13文件完整快照 /tmp/huhu-t03-repair/frozen，frozen-sha256.json SHA **68836b5c4fef90eecbd4ec65150159d16d7b9374fe50deea268a8d89f75b6d56**。最终证明2366输入摘要 **2b28798c361f80bdcd1ca6bcd315d569ff7bd1c620715e9b9b1590a0107e0462**，逐项重算drift=[]；所有实际输入字节（ASAR按header提取app.css）另存proof-inputs/。freeze-receipt.json。实际单case runner是040原私有单case副本，SHA b681f9b1801d9f318760913cb3de5991416a90756962e1d0071e32535bc60cac，保留frozen/final-scoped-run.mjs；未改原runner或66矩阵。

冻结路径/SHA：

- scripts/ui-review/fixtures/frontend-redesign/T-03/index.mjs: ca928e8f02fd70092baa4b1d7bb927f493f67f51057d11e9d11be13685f68dd6
- scripts/ui-review/fixtures/frontend-redesign/T-03/index.tsx: a1afd39b2226ebfc44ad1019eb3f672d643826b187693f78a85d726a1a0c8123
- src/ui/components/huhu/date/Calendar.dom.test.tsx: 518fecd3e1f2b533e0379b1a2496970791f4802b3405d35fc3691ee774f03062
- src/ui/components/huhu/date/Calendar.tsx: d08b1e7f1b2e6527fd396e5c99bc977a3c09c63cb21c4becdc0b479b9c9bb1a3
- src/ui/components/huhu/date/DateField.tsx: 85c5d34689912ae9d8b9bdbc78e4b4de6e9b2b0db7ad55ab3edaa382f80de07d
- src/ui/components/huhu/date/DateRangeField.tsx: 04dd05517fa815193164b8e45bb1b9732ed8807597af19e7408d158ea2b5caff
- src/ui/components/huhu/date/DateTimeField.tsx: 742740eb18286331441fa559a683d1eb46fd9c9e76a6b1280e47f680af83cdb3
- src/ui/components/huhu/date/date-composition.dom.test.tsx: 4a7e67985abd3d2fc1557d93b4ccb7f839ab7d297e511ca311cc40aaa4a2c08a
- src/ui/components/huhu/date/date-fields.dom.test.tsx: 7ef730e4f49eeed16de6208f4238e3605605a741c82eb039c4d940a7e09be0a9
- src/ui/components/huhu/date/date-value.test.ts: 5654692a7c235df09e3493818c9475a828ab641aa3069be4441b001db623233f
- src/ui/components/huhu/date/date-value.ts: 4bb56f4606c5818a7d4cc493e56e80a6a614aa4d993a62edf5b5fb34045225e7
- src/ui/components/huhu/date/field-parts.tsx: ff04646f38c72b21925150fad9e092ca15de501b0d91e0246447234f41ac6481
- src/ui/components/huhu/date/index.ts: 5548e2d5f12552a72085297445e03022e95a4d33990e93f7eeafd0a763b65faf

### 真实失败与修复轨迹（原观察全部保留）

- 将042七条实际组件回归移入授权date-composition.dom.test.tsx后，composition-red.log复现Esc/outside两条及缺footer失败；IME两端、普通Enter、Cancel控制原样通过。修复后扩大required/边界、真实外部error/controlled替换、DateTime whole-clear/zone端口、真实en/zh footer，最终24 DOM通过。
- 首次ac6225共享样式下的review-first/result.json已闭合原S01、祖先裁切和右末列鼠标反例：313.5原Δ0变Δ1，Calendar312/grid308/day44。此阶段仍不冒充所有触控/绘制通过。
- popup-detail/result.json捕获有效内点(313.5,790) CSS命中Nov20、鼠标正确，但touch click取整到314而落Calendar DIV，Δday0；这不是中心恰在共享边界。touch-experiment2/result.json私有真实前后控制证实：仅末列按钮向外2px透明命中延续进既有空闲padding，并只放宽该方向clip后，原point变BUTTON/day20/Δ1。Root批准后实现，无相邻日期/Nav/footer面积交叠，物理44/308/312不改；canonical continuation几何断言验证这2px完全在Calendar框内。private源替换/Tailwind补充证明popup-hit-private/result.json完整448通过；outer-bottom-native/result.json另证七个最底行外侧bottom内点鼠标/触控各正确一次，未以右缘修复误送下一天。
- 第一次ffcb canonical虽600命中/祖先矩形绿，实际图像进一步发现Range14右线0像素、Range20左/上线0像素，DateField同条件四边80像素；focus-pixels.json及final-native/截图保留。邻格选区背景遮盖td outline，不能拿“computed outline=2px”说完整绘制。focus-bounded-native/result.json的私有源码替换加最小td绘制层级/指针分区后，两原单元四边各80像素，8条键盘邻焦点下左右/底边鼠标触控均一次正确；Root授权后集成并换4628共享CSS。
- 最终注册fixture直接Page.captureScreenshot，在浏览器Image/Canvas解码截图，按实际outlineColor逐像素断言四条外圈中央strip的actual==expected；此为测试协议，不是生产绘制/定位引擎。并且每个448点都先强制邻格:focus-visible，验证升高的装饰不偷相邻命中。原错误、私有试验、第一次canonical和最终canonical目录分别保留，没有覆盖失败材料。

### 最终检查与实际边界

| 检查 | 实际结果 |
|---|---|
| pnpm exec vitest run --project unit src/ui/components/huhu/date/date-value.test.ts | 退出0；5/5；unit-final.log |
| pnpm exec vitest run --project dom src/ui/components/huhu/date | 退出0；3文件24/24；dom-final.log |
| pnpm exec tsc -p /tmp/huhu-t03-implementation/tsconfig-test.json | 退出0；真实日期生产/测试/fixture及Obsidian声明；types-final.log |
| 七生产文件ESLint --max-warnings0 | 退出0；零警告；lint-final.log。fixture本就被仓库ESLint忽略，其真实构建/运行和TS分别验证 |
| Prettier授权13路径 --check / 原runner guarded --check | 均退出0；format-final.log/fixture-check-final.log；原adapter graphcounts不变，unused roving/menu/select确实0，其余既有项1，未绕过摘要/anchor检查 |
| node /tmp/huhu-t03-repair/final-scoped-run.mjs --suite frontend-redesign --ticket T-03 --matrix redesign --out /tmp/huhu-t03-repair/final-painted-native | 退出0；1基础矩阵样例+完整定向exercise，status=passed/errors=[]。96 standalone +448实际popup +56最底行=600可信点，448点每次邻格keyboard focus-visible并正确CSS目标/一次可信click；两Document/两密度 |
| 实际focus绘制 | 16真实popup焦点图、64条painted边均80/80像素；标准2px/offset2/solid及全部clipping-ancestor bounds也通过。已视觉检查最终range-popup-focus-main-compact-14.png/20.png四线完整，date-popup-focus-main-compact-20.png的footer/左图标/底点正确；图在final-painted-native/ |
| 实际scroll/键盘 | Range viewport clientWidth=scrollWidth=320；scrollHeight616/628>clientHeight494/502，wheelTop122/126、touchTop85；无横滚补偿；两Document/两密度Tab均可见到Cancel、Apply |
| 040保留控制 | final-painted-native/result.json 的realIMEGuard/completedCompositionCommit/adoptedOwnerPortal/exactAdoptedRestore/openUnmountCleanup全true；原Arrow/Enter、嵌套Esc、结构DateTime、两个hostzone日历选择等仍通过 |
| 精确字节/空白 | 13源及2366实际证明输入快照校验drift=[]。新增未跟踪文件逐项git diff --no-index --check /dev/null退出1仅表示有diff，输出全部空/无空白诊断；whitespace-final.json，如实不冒称tracked diff代表完整新文件 |

所有新过程与截图仅/tmp/huhu-t03-repair。夹具给隔离浏览器补充实际Obsidian Node.instanceOf（同owner ctor检查）及原createDiv宿主扩展，才能执行共享Popover的既有原生wheel shim；没有mock几何/样式或拦截生产交互。原生滚动仅平台wheel/touch/keyboard，生产没有新增scroll handler。所有自有Chrome通过Browser.close并等退出。

## 问题与下一步

候选没有已知未闭合的本任务定向失败。源码/fixture保持冻结；仅本不可变报告和快照收尾后释放独立high。Root完整原始66正在/tmp/huhu-t03-lead-final执行，本报告不宣称其结果，也不替代真实Obsidian主窗/popout、生产总build/main.js、notices/bundle/全局旧消费者迁移门。没有重跑/冒认全局552旧消费者账本为绿；本次没有新增依赖/词条/跨区导入，040架构/i18n权限与Lead集成检查保留其明确边界。

DateTime REQUIRED caller validateValue/initialTimeZone未变；native stub ()=>null与DOM caller error只证明UI协议，不证明NY DST gap/fold领域转换，仍归T05/T07真实域验收。两Document是同源iframe，不冒充原生Obsidian popout。

UI-002 footer/图标/今日marker及S01–03组合边界已纳入真实回归；后续若需修复请用新任务，不改本不可变REPORT。不提交、推送、发布或改正式Ticket/Goal状态。
