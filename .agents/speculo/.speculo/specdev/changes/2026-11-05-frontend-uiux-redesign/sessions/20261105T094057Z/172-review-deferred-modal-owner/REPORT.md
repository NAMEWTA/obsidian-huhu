# 迟到模态outside事件归属独立审查

Session: 20261105T094057Z
Task: 172-review-deferred-modal-owner
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。本人未参与171实现或Root集成，未委派。先仅核正式旧源/已安装库，收到Root独占冻结通知后才读取171包；只新增本REPORT与/tmp/huhu-deferred-modal-owner-high，没有改正式源/状态/Evidence/index/资产/候选/旧报告或设计，没有新跑Chrome/native/正式66/858。

**standards: pass；specification: pass；Findings: []。** 冻结六路径候选对真实Radix迟到pointerOutside重开脏稿确认框的已定位缺口达到本次集成条件：独立旧源真实屏障红、当前候选相关DOM53项绿，额外真实capture传播2项绿，正常外部pointer/Discard/原稿节点选区/多Doc多根相邻范围保留。171单失败组原完整浏览器verify/exercise的冻结源码图与实际记录亦已核对，但不是本人新跑或完整矩阵通过。

手工把同一nativeEvent在真实capture结束后再次传给lower hook确能覆写内层记录；该方法重入反例没有现有生产可达入口。经Root澄清，不能把人为重投当新用户合同或自动升级P2。本审进一步核实际三Content与多root路径，均无低层后写覆盖；该项仅可选健壮性方法边界，不阻塞本修复，也不冒称所有任意调用顺序都受保护。

原三轮历史保留。Root最后通知第三父轮已结束，真实CLI126、T04执行32项且第32失败，其余12票各66通过；候选仍私有。Root尚须单写、构建、全工程/新输入完整13×66及必要原生门。这里不宣布T04/T14/G-FINAL/Goal通过，不把单组绿叫flake消失或完整产品修复验收。

## 产物与验证

### 冻结输入与最小差异

规范沿已读AGENTS/dev/ui/testing/可靠测试与独立双轴合同、Map60/Goal/DESIGN3/UI002、T02/T04/T14、165/167/170/171原报告。Root冻结/tmp/huhu-dirty-confirmation-repair/ready.patch与manifest.json，patch SHA256 e5ce943aeee0776004f4e2812c9effe53b0756357b138b417a8b460b0433dc2f。六文件均0664，本审逐项当前before/candidate after/mode/patch字节匹配，私有reverse还原全部before；源码冻结前后12个直接上下文与已安装库摘要无漂移。

| 路径 | before SHA256 | candidate after SHA256 |
|---|---|---|
| src/ui/components/alert-dialog.tsx | 600e56e91716349c0f47e518e236fdbde5afa93fec4c87aeec0c843d5a230559 | 544f1169450bbde4e72f04b582d2b800a20609eb25e8ebd24b62f50336e56241 |
| src/ui/components/dialog.tsx | c80bbb1e93c244bcf8cd350bac84b5e988016021439722c1e37c4252c30b648e | 0205b2aa8ee3a493fdbfd5c5ad0ff049fe41ff3d4cab57188e1e1f85207a6d79 |
| src/ui/components/sheet.dom.test.tsx | f7944df6859e0aff7184ce31619c3d7270634e00cd5676ebf31839788fe5e29f | 6482c957104c38a4de68317580e24dfd521fbbd6317b63ff3c014d1dd18ca7db |
| src/ui/components/sheet.tsx | 069cf1c518b5f19222faf07cf29da5e683db0bff95386133404ab5f521246b5c | 33913c934dbfa927f579124a8bff211ff25efb541be317ac24af582ce425d6d0 |
| src/ui/react/modal-layer.dom.test.tsx | 6e808d1b1f4bcd861abe8553c0e9e4135532403920cf730aefee64da6758ea9d | f495337d702dad5b882c16b4d932b4d6dfdd634a1bbb75555012146109b92d84 |
| src/ui/react/modal-layer.tsx | 575ce1d21bfbd618e7669a962a77d10eb03b4fd94f5b37fc767f55301fc11185 | f260339d0fad326b13098b0ee5fe94ea735d208a33f420b4a1d9859ef7c32158 |

四生产源为ModalLayer与Dialog/Sheet/Alert Content转发，两个就近DOM文件仅加强真正deferred与owner边界。dirty-modal未改，class/设计/i18n/字段与业务确认/Discard逻辑没改。私有测试树的六候选字节与冻结包相同，不消费作者可变输入。正式before继续保持旧源，Root等待本审release再应用。

### 当前实际库与因果核对

没有凭包名猜版本：Node createRequire从实际radix-ui/dialog解析到Radix Dialog1.3.1、其实际DismissableLayer1.2.1。读取准确安装路径index.mjs与当前scripts/radix-owner-document.mjs：DialogContentImpl显式deferPointerDownOutside=true、onDismiss调用onOpenChange(false)；DismissableLayer在原pointerdown保存originalEvent，并在Document click后处理outside；项目adapter把Document资源/Node/Event构造映射owner Doc，未消除该defer语义。因此晚期只看top、target.isConnected或事件结束后的composedPath不足。

171 causal-trace.json直接记录confirmChange(false)1329.23ms → sheetOutside(original pointerdown、BUTTON已断开)1342.35ms → requestOpen(false, confirm=false, open=true, dirty=true)1343.10ms；最后实际调用栈包含DismissableLayer.usePointerDownOutside → Dialog.onDismiss → useDirtyModal.requestOpen。它是生产真实Radix控制序列的诊断，不冒充原正式失败当次未记录的stack。第三轮新增观测实际已看到原目标click到达、旧Alert关闭卸载后新Alert重开，与这条可重复路径一致；不再停留于165“单次未复现就无法定因”的旧证据时点，也不将先前诊断绿重写成复现。

本人在独立/tmp复制当前src、必要配置/脚本和六冻结候选（无硬链接），使用原已安装依赖和原测试变换。随后仅将四生产副本换回精确正式旧源、保相同新Sheet回归，运行真正Sheet→Alert→Radix deferred屏障：旧进程exit126，精确失败为active BUTTON不等于原INPUT。不是mock requestOpen、编译失败或仅内部handler测试。finally恢复私有四候选字节；正式库/候选包从未改。

候选同一真正Sheet屏障绿，保原field节点与selection；之后新的合法outside仍产生dirty confirmation，Discard仍关闭并还焦trigger。delay、任意屏蔽时间窗、强制focus、忽略全部outside、仅以disconnected目标猜测均未引入。

### 事件时刻owner与多根/多Doc

当前ModalLayer为WeakMap<Document>有序栈；FloatingOwner使用物理anchor查同Doc中真实包含它的modal，不能因另一root后来开了modal就提升。ReactSurface/ContainerProviders可在leaf被adopt到新Doc后保留root并跟随owner Doc；openReactDialog则真正createRoot到body，只提供ContainerProviders，无法继承原React Modal Context。所以事件发生时同Doc已有lower stack IDs的快照是必要补充，不能只沿Context ownerParent。

候选在真实Content capture使用event.nativeEvent作WeakMap弱键，复制当时currentTarget.ownerDocument、origin entry symbol及同Doc逻辑ancestor/ordered lower symbols。迟到outside只在原记录origin不同、lower集合含当前entry时preventDefault；迟到处理不重新取当前DOM/top/composedPath/ownerParent。其它Doc无相同entry IDs，未捕获/ownerless事件、origin以上/无关entry继续原Radix路径；同entry迁移时旧事件仍按原已捕获关系，新的事件不继承旧弱键。记录不保存字段文本或DOM Entry对象，不新增Document listener、timer、持久状态或明文；Event可回收后弱记录可回收。

三个真实Content接线中，capture在consumer callback前先执行，preventDefault不跳过记录；Sheet/Dialog outside先调用consumer，若已preventDefault则尊重原处理，否则才检查owner。Alert API本身已保护outside，只转发capture，不擅添不存在的outside API。原KeyDown/IME/Escape/open/close autofocus/refs及props保留。

独立相邻验证：

- 既有FloatingOwner多popup retained root、物理owner、隐藏/拆除/关闭、两Doc、lower popup不提升到无关upper等测试全部在本候选下通过。独立root本就不是简单的Context链。
- 本人新增实际openReactDialog独立root对照：Sheet脏稿上从原field打开命令式Dialog，在其真实autofocus屏障发送pointerdown，pointerup/click关闭；真实defer后不重开父确认，原field节点、selection[2,6]与焦点保留。不是仅generic hook模拟独立root。
- 本人新增consumer preventDefault / stopPropagation两种实际嵌套路径：正常顺序打开子Alert再取消，均不重开父dirty confirmation；stop阻止继续传播时不走对应Document deferred outside，未谎称该情形的内层snapshot仍必然被记录。
- 追加真实三consumer capture顺序：Sheet→Alert实际调用顺序sheet-outer、alert-inner；Dialog→Sheet实际dialog-outer、sheet-inner。callback与新hook在组件内相邻执行，因此当前真实外→内流程最终保内层origin。2/2通过，没有找到现有生产低层在内层之后重投同nativeEvent的入口。
- 候选自身真实多Doc/独立root owner测试保留原event在composedPath清空、target断开、parent adoption/rerender后的归属；foreign已捕获modal/未捕获外部事件不跨栈吞掉。它们是hook方法边界，非真正popout像素验收。

相关五文件53/53已通过（候选sheet、modal-layer与既有floating-owner、modal-regressions，另本人独立多root及consumer三项），额外真实capture顺序2/2通过。未因新测试增加正式仓库测试或删除既有断言。

### 方法重入控制的准确限制

按Root最初的优先级风险假设，本人还做了一个**人工方法控制**：先对真实upper节点dispatch pointerdown，lower outside正确prevent；随后手工再调用lower hook的onPointerDownCapture转发同一nativeEvent，unconditional WeakMap.set会把origin变成lower，之后outside不prevent。该方法测试exit126，日志priority.log保留。

这并不是新浏览器正常capture可达路径：现有三个Content只在原捕获阶段各调一次，当前React外→内传播以inner结束；consumer没有随后的任意重投生产调用。Root明确要求区分风险假设与可达性，不以人工调用扩大当前合同。本人据此新增上述实际顺序/consumer控制且全部通过。故该126记录为可选重入健壮性（以后若允许重投，可保更高既有snapshot），不作为当前finding、不声称它会在现有UI发生，也不为此新增产品或第二候选。

### 单组浏览器证据、命令与未验

读取171最终single-final-candidate/result.json，实际status passed/cases1/errors=[]；四生产输入SHA逐个等冻结after，dirty-modal SHA与当前未改源c94b48…相同，T04 driver为当前90b41…原完整verify/exercise。原失败组精确960/zh/paper/indigo/huhu/comfortable15，四Keep观测main/second×system/reduce均有记录（12/11/12/11），两Doc exercise cleanup为mounts3/unmounts3/aborted true/errors空/layerRoots3→3。不是只信passed字段，也不是本人新跑Chrome，更不等于原66或完整矩阵通过。

本人实际命令与退出：

- manifest/输入审核audit.py：exit0。六冻结before/after/mode、私有副本与reverse-before匹配，当前12上下文/库无漂移，最终单组真实浏览器输入图与deferred causal stack核对正确；audit.json保完整摘要。
- 私有旧四生产源+候选Sheet真实屏障：Vitest进程exit126，old-red.log精确focus红；Python控制正确要求此非零并恢复副本，控制脚本exit0。
- 私有五相关DOM文件：exit0，53/53，bounded-green-2.log。真实capture顺序两项：exit0，2/2，actual-order.log（按testNamePattern选择，仅本地其它4项未运行，不改变项目skip）。
- 人工后投lower hook方法控制：exit126，priority.log；按上述可达性边界不是产品finding。
- validate-dispatch：dispatch0；return在REPORT落盘后执行，以实际工具回执为准。末次before/candidate与REPORT回读后停止。

私有准备过程失败已区分：最初workdir未创建导致未启动；脚本symlink的setup被Vitest当外部路径而未加载，改为本审独立scripts副本后正常。consumer控制初版同时initial-open两层，startup aria隐藏令query不到button，改为符合当前真实交互的先开父后开子，未改产品或等待阈值。以上不是产品根因/红绿对照；正式旧源exact-focus红与方法重入负控分别保留，未用测试机制失败冒产品发现。

未执行正式build/全仓type/lint/test、真正宿主/新Chrome、原66/858或用户vault/clipboard/账号；171 ESLint/既定skipLibCheck testtypes只按其冻结输入与报告边界复用，不冒本人重跑。CSS/设计/领域/dirty-modal没有额外修订。真正物理跨窗/完整生命周期与新构建统一门仍由Root持有。

## 问题与下一步

本六路径固定候选在当前真实defer/capture/脏稿/多根多Doc范围内无阻塞finding，可由Root在旧父轮已结束且本审释放后单写。精确根因及确定性旧red→候选green成立；任意手工重投hook不等于现有可达产品路径，不为其发明新合同。

Root继续新输入的构建/工程检查、真正宿主及原完整13×66/父CLI退出；保留前三轮实际失败/143/诊断历史，不用单组绿或观测时序改变推定flake或整个T14已通过。return校验与回读后停止全部读写，释放六路径候选、正式before及全部审查冻结。
