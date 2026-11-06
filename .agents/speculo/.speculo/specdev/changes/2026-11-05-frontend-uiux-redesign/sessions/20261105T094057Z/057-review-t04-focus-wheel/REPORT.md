# 任务回报

Session: 20261105T094057Z
Task: 057-review-t04-focus-wheel
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_t04_startup（既有 gpt-6.1-sol high，未参与实现、未委派）。限定054两路径修订，standards **pass**；specification **pass**，无新增阻塞finding，053 P-02已关闭。实际2px solid accent/+2四边绘制、32/44命中及panel/main边界通过；同当前源独立复现wheel在max时无移动/无scrollend的红灯，再以真实负wheel至0并等scrollend、正wheel至180的配对通过，未改Surface/清掉真实意图。独立Shell21、类型/lint0、exact59完整canonical及额外6组双Document命中分区通过，054三canonical的12态48边PNG像素独立重读全过。53源/2251图/CSS/049前后无漂移，**释放本次057 reviewer冻结**；Root仍运行全66的独立冻结和整体验收归Lead，不宣布T-04/Goal完成。

## 产物与验证

### 固定输入、来源与范围

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。observed HEAD `37fcede4210a19bcc2a74809e7fdd301e5717957`。已读057/054 TASK、054 REPORT、053原focus反例与批准DESIGN §3.6/UI-002具体separator规则；沿用当前AGENTS/dev/ui/测试、独立双轴/错误/可靠性合同，当前T-04/Map16/Spec/DESIGN3仍为规范权威。source-files不从commit推断外部来源；sources-manifest.json保存实际规则/设计/配置摘要。

merged53清单 `/tmp/huhu-t04-focus-wheel-repair/frozen-sha256.json` SHA **4f8cd8a0c143219c2fecddfdabb9bd76bc7d9633f4d9af86be2997b638a237ba**；delta2清单SHA `29b4a8e17575c198094f7e018eeaf993ae91cd34c12a2b40cd02eb40b55f9486`。开始/结束逐项匹配当前和 frozen/，与051/053快照相对仅 `src/shell/ShellRoot.tsx`、`scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs` 两条变化；其余51条含WorkbenchSurface及测试逐字相同。scope validator与限定tracked diff-check退出0，before/final-verification.json及source-scope.json可回读。

当前三canonical与本人实际浏览器图均2251输入，inputDigest **a84fc4b24d388bbc4fc45c9c83906a34e9d001412cc83b0bcbe2fbd3cad21ec6**。按实际runner序列重算digest，并逐个检查当前2250实体文件及ASAR app.css：后者由真实header/offset提取校验，非把虚拟colon路径当文件。CSS 1,284,982字节，SHA **70dfb92f8e96fd828019dc6fa6c82790602d276f87c47596fb7a439cf125209a**。开始/结束native drift=[]，共享Root049的13路径也仍匹配原09d071…b241。未变的Intro/Rail、真实opener、state、metrics、scroll lifetime证明继续保留原边界，不冒称本轮全部重跑。

只写本REPORT与 `/tmp/huhu-review-t04-focus-wheel`。正式源码/资产/配置/依赖/索引/Skills/状态/Evidence/Git和所有原证明只读；无修复应用、安装、worktree、提交/推送/发布或全局状态写入。

### standards 输出

Reviewer: native:/root/review_t04_startup
Result: pass
Findings: []

焦点修复使用现有CSS/DOM与原pointer/keyboard机制：separator上下/右各让4px，保留物理32/44命中带；父区保留hit+8px为2px宽、offset2的外框提供空间，总panel宽仍由原navigation.width决定。父区独立full-height边界和separator内部2px非交互强调线保留。没有缩窄目标、用负offset/inset-ring遮掩裁切、新持久化宽度、全局监听或第二焦点引擎；pointer preview/commit/cancel/另一pointer拒绝、Home/End/8px/reset处理未改。

新的wheel准备协议沿已有真实页面/列表运行，在已有top>0时发送CDP负wheel，等实际trusted wheel、scroll、scrollend及top===0，再发原正180并仍要求trusted三事件与top增加。若已经0，只记录此前提而不伪造用户事件。每相位重取实际rect/elementFromPoint/connected/visible/max，listener在新的有界AbortController下于finally清理；未增加10秒截止、删除scrollend、程序性scrollTop=0或把原setup滚动当用户意图。Surface/test没有改动，原WeakMap/generation/scrollDocument及intent保留。

本人独立读并重现原边界：当前生产源下真实wheel从0→180→2580→4980→7380→9780→10294(max)，各次hit=true、owner/connected/visible成立、pendingRestore=false且三trusted事件齐全；在max再+180，仅有trusted wheel，top不变，自然没有scroll/scrollend，原无条件移动协议如实超时。这不是取消恢复覆盖用户值的证据。配对在同当前图重复到max，再真实-10294至0，等scrollend，再+180；10294→0→180两相位均三trusted事件齐全。私有wheel-red/result.json与wheel-green/result.json保留实际记录，不覆盖054历史红绿。

原Keep editing精确条件完全保持：alertdialog消失且activeElement===detailField，失败catch只写诊断后throw，未强制focus/放宽等待。本次独立exact59及054的exact59/320/390当前完整strict流程通过，但054首次Keep editing超时的原因仍未定位；未以通过次数编造其root cause，原失败保留且Root全66门仍有效。

### specification 输出

Reviewer: native:/root/review_t04_startup
Result: pass
Findings: []

**053 P-02关闭。** 当前实际keyboard focus为2px solid accent、offset+2；separator的4px外绘制区落在所属panel列内，四边都真实绘制，没有仅computed值变绿而上/下仍被overflow裁掉。规范解释保持准确：DESIGN §3.6的通用2/+2为当前标准，UI-002具体separator原型的outline:none加强调线没有授权-2；实现采用DESIGN标准并保留有用2px focus/hover/active线，没有修改设计或制造例外。

我用标准库独立解码054保存的真实PNG（读取IDAT/zlib/PNG行过滤，无图像改写或软件安装），按实际rect/viewport比例读取四边中点原像素。exact59/320fine/390coarse × main/second × normal/reduce共12态48点，全部与记录accent RGB各通道相差≤1；independent-png-pixels.json保存每点。fine ink/plum与coarse paper的截图均已目视，完整外框四边可见；与原053内框图明确不同。

额外本人实际Chrome命中/几何控制覆盖paper/ink fine及paper coarse各两个Document，共6组：separator四个近内边点全部elementFromPoint命中自身，panel primary按钮仍真实命中，无透明绘制伪元素拦截；focus line宽2且pointer-events:none。wrapper总宽仍等于保存宽度，main.x===wrapper.right；可见面板内容宽度为wrapper−hit−8，仅比原owned gutter多让8px。示例fine总280、内容240、hit32、上下inset4、高712；coarse总296、内容244、hit44；两例main紧邻所属列且无尺寸侵占。原default272/220–480、main min-width0、52轨和阈值没有改变，完整canonical及21项Shell DOM继续验证拖拽/键盘/重排。

case59协议修复没有减小矩阵或放松被测意图。本人独立完整exact59通过，保持ownerless31<40与lower41<50 blocked-hit、同owner41>40可信点击/精确source、两级Esc/真实Scope、精确CSS580与极小rect容差、dirty input/draft/selection/scroll、设备选择/取消、mobile区别、真实wheel后的180→DOM0→migration180、往返同页/列表/挂载数/current Window、visibility及最终root/Portal/lock清理。054当前320fine/coarse结果同图也完整保留这些断言，未把诊断性的红绿wheeldriver当完整产品E2E。

### 实际命令、结果与证明

所有本人输出仅在 `/tmp/huhu-review-t04-focus-wheel`；真实生产输入与driver/protocol代码分别留摘要，不把原runner hash冒充私有控制。

| 检查 | 实际结果 |
|---|---|
| merged53/delta2/native2251/CSS/049前后SHA；source-files scope；限定tracked diff-check | 退出0，drift=[]；before/final-verification.json、source-scope.json |
| `TMPDIR=/tmp/huhu-review-t04-focus-wheel pnpm exec vitest run --project dom src/shell/ShellRoot.dom.test.tsx` | 退出0，21/21；shell-dom.log |
| `pnpm exec tsc -p /tmp/huhu-review-t04-focus-wheel/tsconfig.json --pretty false` | 退出0，原精确生产/测试/fixture及真实传递依赖0诊断；types.log，不是全仓类型通过 |
| `pnpm exec eslint src/shell/ShellRoot.tsx --max-warnings 0`；node --check正式index.mjs | 退出0，零警告/语法通过；lint.log |
| `node .../driver-case59.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out .../native-exact59` | 退出0，1个完整原case59、双doc、errors[]/最终cleanup；native-exact59/result.json |
| 私有wheel-attribution-driver，同参数，out wheel-red | 宿主退出126；预期max之后正wheel等待移动超时，只见wheel/无scroll/end；wheel-red/result.json |
| 私有wheel-attribution-green-driver，同参数，out wheel-green | 退出0；重复到max后真实负/正wheel恢复三事件、0/180精确值；wheel-green/result.json |
| 私有geometry-driver，同参数，out native-geometry | 退出0，3有界主题/指针样本、6组双doc paint-space/命中/内容-main分区均过；native-geometry/result.json |
| 独立PNG原像素读取054三个canonical截图 | 12态48点全过；independent-png-pixels.json；已目视fine/coarse代表图 |
| 057 dispatch validator | 退出0，errors=[]、warnings=[] |

本人case59 driver SHA `023b9c3e903ab8581235c66110c899f8b2fca1f6295d80f534704b78c963d1fb`；geometry driver `2af1261929192d728d84ec79dc738107d722564b77f40970ad563daeadf46d3a`；wheel红driver `e43aa105be33ff76d1d84370081b299d7596d297c1887fdd47457b369ab2814d`/protocol `07176fe29c0efa81c11bac5643a04b7e52dfef1390dd22553fed58a83aed5f52`；绿driver `a19885fb45106deb32ea2343f08112f7c1dfb61c59a8b06c98275779d7bc0edc`/protocol `238f9799d1a38d8b9a33cb76e687a3d1e4bc391219f2db703b88c0eed66083cc`。private-drivers-manifest.json保存全部私有驱动摘要。红绿均当前2251/a84fc4…ec6图，私有protocol另行标识；054旧red3图是58db…15c，与当前图不同，没有混为“旧红绿输入完全相同”。

旧Root `/tmp/huhu-t04-lead-repair-final/result.json` 回读确认finished、failed59例，最后样本确为960/zh/ink/plum/comfortable15/fine，wheel等待超时；不是手工强停。当前Root `/tmp/huhu-t04-lead-focus-final/result.json` 在最后核验时尚不存在，未读取未完成case结果或宣称66通过。

## 问题与下一步

本次无阻塞finding，053 P-02及实际wheel边界问题在当前限定候选上关闭；050/053原报告及054/Root历史失败保持不可变。**明确释放057 reviewer冻结**，交Lead回读并继续原完整66/本票组合验收；Root66自身冻结仍归Lead处置。

Keep editing历史单次超时保留未定位说明，若新全66再触发，应沿原失败诊断，不降级断言。未跑真实Obsidian主窗/popout/移动端宿主、main.js/build/budget/notices或全局旧consumer；iframe只证明第二Document组件能力。全票/Goal状态与T13–T14集成债务不由本报告推进，无提交/推送/发布。
