# 135 首次diff焦点修复独立窄审

Session: 20261105T094057Z
Task: 135-review-initial-diff-focus
Status: completed

## 聚焦交接

Reviewer: native:/root/review_t07；sol high；Strategy independent；Risk high；Independence required；Mode native。未参与134诊断/候选或Root实际合入，无委派。仓库唯一新增本不可覆盖REPORT；过程与独立临时profile仅在 /tmp/huhu-initial-diff-focus-high，未改source、assets、state、Evidence、index或真实vault/clipboard。

**standards: pass；specification: pass；Findings: []。** 确定性的首次可信Tab→真实FileDiff forceRender→Enter缺口已独立旧红/当前绿确认；两Doc连续paint仍精确同line/side/owner，12取消轴通过。keyboard及6必要上下文始末hash/mode drift=[]，return通过后明确释放。133/127/095其它结论按未变范围及原边界复用，不把本窄审称为最后正式66、真实Obsidian popout或130偶发失败确切根因证明。

## 产物与验证

### 输入、差异与复用边界

沿已解析workspace/catalog，复用已读未变AGENTS、dev/ui/testing与独立review/risk合同；回读135 TASK、Map51、Goal/Spec/T16、DESIGN3/UI002批准设计（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）、133与134报告、真实before/ready.patch/after及相邻调用。标准来源为真实FileDiff/owner Document、共享IME及生命周期合同；规范来源为首次聚焦/行身份/外焦取消与T16复用公开库。无PR/commit-message引用，source-files不以HEAD替代dirty before。

133 REPORT SHA256 e72bc8487952bfc9dd1f2d73b4b174031b1786a984d9574f2c94a993c2557bf9已核验。其F7/Shift+F7、长文件虚拟hunk、严格Shadow32/36/44与外部owner取消结论在本次未变DiffSurface/Multi/theme/fixture范围复用；095引擎/事务语义、127既有连续postRender所有权结论仅按原范围复用，未当作本人本次运行。

唯一产品改动 src/modules/versioning/ui/diff/keyboard.ts：before SHA256 a160dad6b91b9ca2fe91493e2ae4908d31690a30112f19dc8972e5876dc7d304 → after/当前8dc703e02946e352c879f065bdad801ce83aff0938f6aaa08ee09bc7a5a12efc；before/ready/current均0664、非symlink。ready.patch SHA256 db33de4bd99e0d6f07324a9242419d8ea4b67b72d9bdca61ef6eb2ce4ea220d8。完整diff仅把已有owner建立从Enter搬至gutter.onfocus、Enter保留原setSelectedLines、unbind新增onfocus=null。其余guard/rendered/release代码与相邻生产源未改，无新API/引擎/等待/重试循环。

/tmp/huhu-initial-diff-focus-high/frozen.json固定keyboard、DiffSurface、MultiDiffView、theme、T16 TSX/MJS fixture与实际styles.css共7项，SHA256 19cbc8659ea08513d1799551af4bd3592d4cc84ae412ae3433b5adeb3307d20a；六上下文与133/134输入字节/模式一致。当前源正控编译图的七项实际input SHA均匹配冻结值。Root并行的一组运行没有写入这些源。

### standards 输出

Reviewer: native:/root/review_t07；Result: pass；Findings: []。

首次focus即按真实gutter line/side、node、owner Document/window、instance.fileDiff metadata建立原WeakMap owner；不必先Enter创建selection。onPostRender仍只在原node/metadata/owner可用、可见且真实文档焦点未离开时找同line/side当前gutter并恢复。恢复触发目标onfocus后，旧owner listener先释放、新owner继续持有；没有重复全局owner或定时refocus。其他Document、metadata身份改变、隐藏/卸载、外部焦点继续按原guards取消。

Enter handler仍只在原isComposing=false/Enter分支preventDefault，按原Shift+previous构造SelectedLineRange并调用库setSelectedLines；未改选区、IME或库键盘引擎。解绑调用原release，清onkeydown、onfocus与本层属性；DiffSurface及MultiDiffView仍经真实onPostRender/unmount接入同一绑定。

**独立负控成立。** 私有runner只给keyboard加入暴露真实FileDiff实例/记录postRender的观察代码，明确加载冻结旧before.ts；不替换焦点或选区逻辑。真实Chrome trusted Tab进入line1，真实instance.render({fileDiff,forceRender:true})后原节点断开、docActive=BODY；随后trusted Enter keydown/up实际target=BODY，copybar等待超时，实际退出126。不是构建/启动失败，也不是仅程序focus制造的假问题。negative-tab/result.json保存完整事件链/finishedAt。

**当前源正控成立。** 同一真实库/观察接缝默认读取当前workspace keyboard；额外在Enter前两连续rAF逐值断言。main与second均保留line1、deletions、ownerDocument正确、connected=true、Document activeElement为该diff host；trusted Enter后实际选line1、React copybar出现。两Doc均passed/errors=[]。这是强制真实库回收窗口的确定性控制，不宣称强制了自然highlighter的到达时间。

**取消/释放成立。** 当前源两Doc×external、shadow-external、foreign Document、metadata identity、hidden→visible、unmount共12轴：均先聚焦gutter、尚未Enter即执行取消动作，再forceRender，未抢回gutter；外部按钮保持active。dispose后两Doc worker created=terminated=25、live=0、URL=0，无残留已跟踪listener；Tab正控各9/9、live/URL/listener也为0。源码清onfocus与这些真实取消控制共同证明未以首次focus owner换来抢焦点或资源遗留。

### specification 输出

Reviewer: native:/root/review_t07；Result: pass；Findings: []。

135的首次聚焦缺口达到最小解除条件：真实可信Tab在尚未Enter时即拥有保焦点语义，FileDiff回收后同owner/file metadata/line/side保持，随后原选择功能可用；原取消条件和解绑保留。修复复用既有库onPostRender与原owner，不新建键盘/虚拟化/focus引擎，不靠sleep、重试Enter或循环refocus换绿。

134原programmatic focus配对、无观察overlay完整99states/16virtualHunks与12取消证据作为已读作者背景，133其它已独立范围继续复用。本review独立运行的是可信Tab负对照、加强后的两Doc正控制及12取消轴；没有冒称重跑完整99states/66，也没有据此追溯130最后一次缺事件链的偶发copybar超时。Root仍负责最后正式同构建验收。

### 本人实际命令与诚实边界

公共参数为 --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-initial-diff-focus-high/<结果目录>；runner仅选1组390/zh/paper/coarse启动，然后执行对应窄控制，不是66矩阵。

| 检查/命令 | 实际结果 |
| --- | --- |
| validate-dispatch.mjs --task 135-review-initial-diff-focus --stage dispatch | 0，errors=[]/warnings=[] |
| before/ready/current、七源与上下文hash/mode始末审计 | 0；start-audit.json/final-audit.json，drift=[] |
| FOCUS_KEYBOARD=/tmp/huhu-initial-diff-focus/before.ts node /tmp/huhu-initial-diff-focus-high/tab-runner.mjs <公共参数negative-tab> | 126；预期旧源真实症状红，Tab first Enter copy bar超时，negative-tab.log/result.json |
| node /tmp/huhu-initial-diff-focus-high/positive-runner.mjs <公共参数positive-tab> | 0；两Doc、Enter前2paint精确身份、可信选择/copybar、cleanup通过 |
| node /tmp/huhu-initial-diff-focus-high/guards-runner.mjs <公共参数guards> | 0；12取消轴、cleanup通过，errors=[] |
| pnpm exec tsc --noEmit --pretty false -p /tmp/huhu-initial-diff-focus-high/tsconfig-owned.json | 0；types-corrected.log；当前keyboard及实际类型依赖/仓库声明，非134 CompilerHost替换、非全仓types |
| pnpm exec eslint src/modules/versioning/ui/diff/keyboard.ts --max-warnings 0 | 0；lint.log，零警告 |

临时tsconfig第一次置于/tmp未指定typeRoots，出现无法找到node类型的设置诊断、实际退出126；补正确仓库typeRoots后通过，未改生产或类型断言。所有过程均留本task/tmp，未改原134脚本/旧counter。

观察instrumentation仅插入__diagnosticInstance与focusTrace postRender记录，实际forceRender调用仍为真实Pierre实例。负控编译源明确为旧before，而runner常规inputs读取的是当前live文件，故不把负控inputs中的live SHA误称旧bundle SHA；compile-source-audit.json分别记录旧/当前原源及观察后编译源摘要。正控读取当前源，无候选行为overlay。runner与driver只在/tmp派生，不合入诊断属性。

真实React/FileDiff/worker/Chrome CDP与实际styles.css用于上述native控制；second是同源iframe，未覆盖真实Obsidian popout、真实fine硬件媒体、系统clipboard或用户vault。未build、全仓、正式66、提交或更新状态/Evidence。实际source/trace与有限控制足够本缺口，不继续扩张推测树。

## 问题与下一步

本次无待修finding，确定性首次focus窗口关闭。Root可准备最后正式66及既定宿主门，继续保留130历史偶发失败未精确归因的事实，不将它泛化为仍存在已复现缺口或反称其原因已知。REPORT不可覆盖；return通过后七项冻结明确释放，停止本审查写入，不推进Gate。
