# 任务回报

Session: 20261105T094057Z
Task: 043-propose-cross-root-overlay
Status: completed

## 聚焦交接

仅交付私有可应用候选，未集成共享源码或宣布T04完成。原始Shell反例确认独立导航React根移进NavSheet后，React ModalContext未跨根，Dropdown仍31低于Sheet40。私有候选修复此层级归属；原始反例和配对控制及已有模态回归共48项DOM通过，类型/ESLint通过。真实浏览器命中/Esc门仍未通过，必须在Root实际Shell夹具完成，不冒充DOM证据为native通过。

Root可审阅并应用 /tmp/huhu-cross-root-overlay-proposal/reviewable.patch（7个共享源+一个建议测试，SHA27fed5c23f294d72ed13acd222b8cbd4a09955f4ed670689dc81adfa6582acbc）；git apply --check退出0。源码单独candidate.patch，测试单独test.patch。原始Shell反例已经在仓库，不复制或修改它。

## 产物与验证

### 比较与候选

全局最高modal+1会把不相关背景popup提高到另一个模态之上，拒绝。Shell私有z-index覆盖不能覆盖Popover/Tooltip/ContextMenu及未来使用方，拒绝。仅CSS继承也无法让Portal脱离原DOM后保持所属层级，拒绝。选择沿既有Document stack按物理所属modal查找，再保留同owner的浮层逻辑递增。

最小候选触及共享路径：
- src/ui/react/modal-layer.tsx：新增FloatingOwner/FloatingContext；一个不可见template锚点记录每个Radix Root实际DOM区域，严格同Document、isConnected、可用祖先和现有liveOwner检查，查找确实contains(anchor)的现存modal entry。仅按该entry在既有stack的位置推导40+index*10，不取全局最高项。无物理owner时保留原逻辑上下文或30；同owner既有floating层级更高时保留，新的ModalContext覆盖不同owner的旧floating context。useOverlayStyle与FloatingLayer统一读此归属，FloatingLayer只递增浮层上下文。setContent仅身份变化时通知现有stack订阅者，使跨根消费者看到真实content注册/移除；不新增DOM observer、持久化、监听系统或焦点/trap引擎。
- src/ui/components/{dropdown-menu,popover,tooltip,context-menu,hover-card,select}.tsx：每个已有Radix Root外包FloatingOwner，children/props/控制端口/Portal/Radix生命周期保持。后三个额外入口是现有useOverlayStyle家族，需要同一归属规则，避免只修菜单留其它入口31。
- 建议新增 src/ui/react/floating-owner.dom.test.tsx，完整可应用测试在test.patch。测试只引用现有组件，不改生产CSS或构造fake layer。

原始摘要before-sha256.json、原文件before/、候选candidate/、冻结frozen/均在 /tmp/huhu-cross-root-overlay-proposal。7生产文件摘要：

- src/ui/react/modal-layer.tsx: 4872cd6247dd11bc823cf0209cca5fef4a4ebf3f02b34463db357c3c101f7a0e
- src/ui/components/dropdown-menu.tsx: 7f1944411360c2a4f95b8a2b0e7d5043cca09ddf2fad111b9e5b4aca44aa024e
- src/ui/components/popover.tsx: db6de0c1c24a3d769c5f0bec0d35cb6f551041f8583fb5d8d519df9ceef900b0
- src/ui/components/tooltip.tsx: a39804fe63dde1eeae05bb7ffdc64b394fd225c338b89dce25adfb7634187d89
- src/ui/components/context-menu.tsx: 3809b9ded92662ed1a73dfa70199866c502572b94987f3239f975d192611c5f1
- src/ui/components/hover-card.tsx: 714f00d38e5e9111aa3fda1ee4e366384eceabfa186639a601d9d20a83f00500
- src/ui/components/select.tsx: 378b4b4fdf46f283c5fcfed48c425ddc3d4eeeb9b5ff8931cca703dc846c4545

candidate-sha256.json固定候选7文件；frozen-manifest.json SHA d629deae01c4a6ac86ddad6e8195830a1364aa2e4ceb8a71e940d8b00caffa0d。私有补丁源码/测试已停止写入。最终final-readonly-receipt.json：7共享原源drift=[]，T03已冻结12源/夹具drift=[]。仓库业务/配置/依赖/资产/测试源、Git/index、状态/Evidence均未写入；无安装、worktree或委派。

### 实际检查

- 原始Shell测试直接读取 src/shell/cross-root-overlay.dom.test.tsx；OVERLAY_BASELINE=1的私有Vitest配置关闭候选替换，red-final.log：11项中9失败/2通过，原反例31<40和六种独立根入口31而非41均暴露。原始Shell作者red日志 /tmp/huhu-t04-implementation/cross-root-menu-red.log 也保留。
- 候选用Vite只读load替换上述7源文本，保留原始模块ID和真实依赖/组件，不写临时仓库测试。green-final.log：4文件48/48，退出0。包括原始真实Shell反例的菜单Esc仅关菜单/Sheet保留；六种独立Root入口41>Sheet40；普通无owner popup31低于不相关Sheet40；同根Sheet40/Popover41/Tooltip42；低层Sheet的popup41严格低于后来不相关Sheet50；隐藏/断开owner重新打开时不晋升；同源iframe自己的Sheet40/popup41与首文档不相关popup31互不混淆；owner React根卸载后浮层清理。已有modal-layer/modal-regressions两套36项也原样通过。
- check-private.mjs通过真实TypeScript compilerHost以原始模块路径读取私有候选，保留真实Obsidian声明和依赖：诊断0；ESLint lintText使用原始7生产路径配置：errors/warnings0，日志types.log/lint.log。候选按仓库Prettier配置格式化。apply-check.log/apply-reviewable-check.log对应两次git apply --check退出0，仅检查未应用。
- native.mjs在/tmp构建真实React/HUHU/Radix，通过既有摘要/anchor guard并按实际图统计adapterCounts，复制实际共享styles.css，无mock样式。最初/后续baseline与candidate都在点击独立源后无法保持Sheet并打开菜单，Timeout Menu（native-red.log/native-green.log与各自result.json/failure.png）。因此没有把其算作候选层级红绿，未宣称浏览器hit/Esc通过；原因未充分定位，可能是该简化夹具中同时强制打开的无关Popover与source交互/Sheet关闭流程，不能据此判定产品根因。真实guarded构建成功不等于native交互成功。

## 问题与下一步

1. Root集成前可复核原始SHA、reviewable.patch和48项DOM；建议独立high审阅新增物理归属/通知与FloatingContext分离。所有共享路径都需要Root单写，不在本任务擅自应用。
2. 必需剩余门：实际Shell NavSheet生产夹具的可信source打开→菜单item中心elementFromPoint/可信点击、menu41>Sheet40、首Esc只关菜单并精确恢复源、次Esc关Sheet；至少两个Document，并保留普通popup31和下层owner41低于无关上层50的控制。私有native失败不得跳过。Root已有真实Shell夹具比本简化探针更适合定位开/关流程。
3. 本候选不增加任意DOM变动观察器。层级在Root/锚点渲染及既有modal stack/content注册通知时重新推导；隐藏/断开控制有明确重新打开/渲染，独立React根销毁控制确实unmount。不声称能监测“根不渲染、stack不变化时任意第三方静默DOM搬移/隐藏”，也不新加平行关闭引擎；若真实Shell需要此额外生命周期，先由Root在实际调用边界定位最小补充。Root锚点随整个保留导航根搬入Sheet的真实反例已覆盖；仅单独Portal其Trigger而Root锚点留外的非标准结构不在已证范围。
4. 未修改T03冻结候选、modal共享源、日期字典、依赖或共享资产；未提交/推送/发布或改正式Ticket/Goal状态。
