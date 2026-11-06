# 132 T-14 实施前只读入口清单（dispatch0 / return0）

## 交接

本次仅为入口审计；未启动 T14 实施、未修改源码/候选/状态，未运行浏览器、构建或全仓。仅写本 REPORT 和 /tmp/huhu-integration-entry-audit/evidence-input-audit.json。T16、T13、T14 完成状态由原 owner 判定，本报告不认证其完成。

结论：先由 T13 完成124已划定的旧 seed/routes 清理；T16固定新引擎与长文件/Shadow目标证据；然后 T14 在最终构建上运行全门禁、现有真实生产fixtures的有界汇总，以及真正Obsidian的工作台/窗口/PTY/历史/主题恢复场景。不要新造一套模拟页面，也不要用旧passed字符串代替当前输入关系。

### 最小实现路线与确切写集

1. **Root拥有 scripts/ui-review/run.mjs、scripts/ui-review/run.test.mjs。** run.mjs:32把T14解析到不存在的 frontend-redesign/T-14/index，但本票只许 integration/**。修为T14专门解析 integration/index.mjs 汇总入口；普通票仍按旧单票入口运行。将现有单fixture执行体（run.mjs:44–139）提成同文件可调用函数，参数限定既有ticket/entry/output/cases，不新增通用任意路径CLI或第二个runner。函数保留独立build/adapterCounts、startup限时、Runtime errors、screenshots、cleanup及inputs哈希。T14按manifest顺序调用同一函数，各子fixture在新的页面/realm完成，不在一个globalThis里拼接。
2. **T14 worker仅写 scripts/ui-review/fixtures/frontend-redesign/integration/index.mjs（新建），可在同目录增加只读 evidence-validation.mjs / integration.test.mjs。** manifest列明12页→既有生产TSX与driver路径、coverage表面状态、原固定result locator、source变更归因、fresh/reused判定和所需代表组合。运行的每个子fixture仍由esbuild真实编译它的TSX生产import图，核对metafile含对应真实页面入口，执行原verify/exercise；不是只检查status、画汇总卡片或创建空TSX。
3. **Root在正式T14派单时同步本票命名与共享写集说明。** 当前T14正文IN称“T-14.mjs/T-14.tsx”，补充合同又称integration入口；推荐明确为integration manifest驱动实际既有TSX生产子图。不要创建一个未渲染页面的integration/index.tsx充数。若坚持单一T14.tsx实际页面组合，必须先把各票bootstrap改为可调用工厂并适配全局状态/adapter计数，会扩大到全部fixture源且重复各票服务装配；不推荐。本建议是当前命名冲突的精确修订方案，不是已经修改合同。
4. **Root串行拥有最终产物与宿主脚本接入**：main.js/styles.css（只重建）；scripts/obsidian-acceptance/workbench-probe.mjs、workbench-window-owner.mjs、terminal-merge.mjs、versioning-history.mjs、theme-matrix.mjs，以及navigator-restored-leaf.mjs、comments-edges.mjs的必要现语义驱动。先复用124对这些文件已经明确负责的seed/module/routes修改；T14只接手剩余页面就绪/新renderer/窗口/断言缺口，避免双写。fresh-vault.mjs仅当补“所安装产物三件套指纹”需要时由Root精确添加记录；它已有新root/私有HOME/profile/CDP生命周期，不复制另写launcher。
5. **真实clipboard缺少现成独立safe端到端脚本**。在integration/host-boundaries.mjs新增一个使用launchFreshVault的窄场景脚本（仍复用既有CDP/launcher，非新runner）较合适，或明确Root将此段归workbench-window-owner。必须使用单独Xvfb DISPLAY、假safe记录与本次nonce，只观察该隔离display的测试剪贴板；没有隔离display就保留待验收，不读取/保存/覆盖用户剪贴板，不访问账号或外部消息。

现T14可写路径未覆盖run.mjs/宿主脚本，实施前须由Lead在原票/Map加上述精确shared owner，不能由worker自行越界。src/**仍只读；产品失败回对应票。

## 产物与验证

### 当前调用边界（真实源码定位）

- run.mjs:27–32决定suite/ticket映射；:44 import driver；:56 compile TSX与适配器；:58–63建立实际输入SHA/inputDigest；:90–113逐case验证截图；:114后exercise和errors终判；:142–154为原66矩阵。
- 各票TSX都在模块求值时bootstrap并写 uiReview/uiReviewStartup：T05:414/452、T06:345/437、T07:331/390、T08:465/499、T09:92/98、T10:241/269、T11:448/460、T12:303/324、T16:605/663。直接把这些文件全import同realm会互相覆盖全局状态；manifest分次执行保留其真实行为，不假设能直接拼成一页。
- T04真实createWorkbenchSurface在T04/index.tsx:445，但其Page子类:300–321渲染的是PageContent测试内容，不是全部业务页。可证明shell/多root/焦点，不可作为12页实际工作台组合证明。
- T09/index.tsx:43–46使用受控sessions Map、真实WorkspaceService、shell/agent/resume不可调用端口；Electron stub系统调用抛错。因此该fixture不证明真实PTY或真实账号能力。
- fresh-vault.mjs:18–61提供全新vault/profile/私有HOME与安装三产物；:70起捕获真实console/unhandled错误，启动等待layoutReady+plugin.workbench；版本历史脚本:41–43已有同产物指纹范例。每个宿主场景必须绑定同一个最终artifact三件套SHA与native manifest。

### 生产页面覆盖与已有固定证据

| 表面 | 真实生产fixture子图 | 现固定运行证据 |
|---|---|---|
| home及小组件/装饰 | T08/index.tsx:21 DashboardPage，:26 BoardStore、领域服务、真实registry | /tmp/huhu-t08-lead-final/result.json 原66；/tmp/huhu-t08-type-final/result.json 最终标题12 |
| tasks列表/看板/日历/详情 | T05/index.tsx:6 TaskPage，真实Task服务/MonthGrid/WeekTimeGrid | /tmp/huhu-t05-lead-route-final/result.json |
| archives | T06/index.tsx:6 ArchivesContent、真实设置/独立侧栏根 | /tmp/huhu-t06-lead-focus-return-final/result.json |
| automations | T07/index.tsx:8 createAutomationsPage与真实view-store | /tmp/huhu-t07-lead-theme-final/result.json |
| agent | T09/index.tsx真实WorkspaceService/createWorkspaceView、受控sessions | /tmp/huhu-t09-lead-recovered-final/result.json |
| diary、notes及评论侧栏 | T10/index.tsx:13 DiaryWorkspace、:18 NavigatorRoot、:41 mountEditorPanelHost | /tmp/huhu-t10-lead-final/result.json |
| notifications、safe、health | T11/index.tsx:7 InboxPanel、:9 SafePage、:13 HealthPage及真实服务 | /tmp/huhu-t11-lead-recovered-final/result.json |
| settings/图标/内容 | T12/index.tsx:10 SettingsPage、真实store及MANIFESTS | /tmp/huhu-t12-lead-theme-final/result.json |
| versioning与历史A/B/冲突 | T16/index.tsx:11 DiffSurface/AsyncDiffSurface、:12 ConflictDiffView、:15 NoteHistoryPanel | 待原owner最终输入与F7/Shadow修复验收；不能复用in_progress草稿证据冒充通过 |

共享T01/T02/T03/T04仍用对应真实主题、组件、日期、shell fixture。原型UI002仅作设计比对，不执行为生产证据。DOM验证行为，Chrome验证实际布局/命中/Shadow，iframe只证明iframe；真正Obsidian及独立popout renderer另验。

本次逐个回读已有result与当前src输入SHA，结果存本地JSON；未运行测试。所有列出的T01–T12 result当前确为passed且errors=[]，T08最终为12，其余66。注意T09/T11的旧theme-final/result.json实际是failed/1case，必须使用上表recovered-final，不沿用相似目录名当成功。

| 票 | src图当前漂移项数 | styles.css同一字节 | 固定result |
|---|---:|---|---|
| T-01 | 13 | 否 | /tmp/huhu-t01-lead-final/result.json |
| T-02 | 25 | 否 | /tmp/huhu-t02-lead-final/result.json |
| T-03 | 9 | 否 | /tmp/huhu-t03-lead-final/result.json |
| T-04 | 18 | 否 | /tmp/huhu-t04-lead-focus-final/result.json |
| T-05 | 3 | 否 | /tmp/huhu-t05-lead-route-final/result.json |
| T-06 | 9 | 否 | /tmp/huhu-t06-lead-focus-return-final/result.json |
| T-07 | 0 | 否 | /tmp/huhu-t07-lead-theme-final/result.json |
| T-08 | 0 | 是 | /tmp/huhu-t08-type-final/result.json |
| T-09 | 1 | 否 | /tmp/huhu-t09-lead-recovered-final/result.json |
| T-10 | 0 | 否 | /tmp/huhu-t10-lead-final/result.json |
| T-11 | 0 | 否 | /tmp/huhu-t11-lead-recovered-final/result.json |
| T-12 | 5 | 否 | /tmp/huhu-t12-lead-theme-final/result.json |

这是读取时点的输入审计，不冻结其他writer，也不把src全匹配扩展成整个graph全部匹配。T07/T10/T11当前src输入零漂移，仍有全局styles变化；T08最终标题12图src与styles一致；T05的TaskEditor显式undefined已有110/111 JS等价证据，但DateField共享端口变化需按调用风险归因；T01–04/T06/T12共享/词典/日期等变化不能称原运行与最终当前hash相同。详细路径在本地JSON，原报告作为历史通过继续有效。

### 最小有界重验策略

- 所有12页全表面仍须有1440/390产物截图与原verify/exercise，不只渲染默认页。建议每子fixture fresh 1440/390 × 中英 × 纸墨8组合，重用原完整状态exercise；T11同时覆盖三页，T10覆盖两页。共享改动组合用T01–04代表8组合加coarse/200%/舒适15/unsafe host/reduced-motion，以实际受影响共享producer执行，不为每模块重跑所有强调色和7宽度。
- manifest逐条记录原66覆盖、最新生产源差异、已独立回归、当前fresh补证；不要把8组合包装成新66。styles变化不直接要求每票66，但最终fresh需实际核对布局、overlay、theme、hit；发现相关新失败/断言缺口才扩大对应票组合。
- T16以其最终高审与全状态driver为准，当前不能预先降低其未完成矩阵。T08最终标题12原证据保留，不因无关T16源码变动再重复标题12。原全部输入哈希相同且依赖未变的case可直接复用；有差异的case必须有归因，不单凭passed状态。
- T14结果区分fresh/reused/blocked，保留每child实际source图、host app.css、styles、driver/runner SHA及screenshots定位；任何必要子项失败让总结果失败。run.test.mjs需覆盖T14只解析integration、missing/failed child不绿、production entry缺失不绿、哈希漂移必须显式处置、preflight不能变passed、旧票suite隔离保持。

### 真实宿主必需组合与旧脚本适配

1. **workbench-probe**：在最终构建新vault依次打开真实12表面（diary/notes为navigator子路由，不是11rail等于12页），1440/390，纸墨至少各一轮；wait真正生产页marker和module active，不能仅aria-current+任意非空text。该脚本:49–53只等rail后500ms，实际startup诊断terminal仍显示Tasks正是反例。:57–60旧icons route、:65旧content route、:94旧settings类别、:105旧sync switch归124/T13先迁。保留重启路由、模块开关、panel折叠、各页无错误/溢出。禁用weather或只读本地fixture缓存，避免外部服务。
2. **workbench-window-owner**：现:18–31已有真正moveLeafToPopout、新CDP target、main ribbon、focus tab owner与不重复workbench断言。增最终主题/日期弹层/嵌套modal/feedback在两个renderer中正确owner、关闭popout后清理；两个target均捕获errors。复用T04的迁移风险，不再把iframe当popout。
3. **terminal-merge**：现:120–168实际建立两个本地shell session、读真实终端输出nonce、关闭/reopen、切task/home后输出保留，适合填T09系统边界；必须显式传/tmp/huhu-final-native-binaries/huhu-pty（HUHU_PTY_BINARY），本地控制shell只echo自建nonce，不启动登录账号/模型CLI。先核对现菜单role/label；脚本:142仍选择data-new-tab-menu role=option，:149–154中文旧label需按真实当前组件迁，不删session断言或改timeout。
4. **versioning-history**：已有新vault本地Git/无remote、预览不写原笔记/HEAD/index、恢复/undo、原生未保存draft、评论重定位、重启hold/receipt、独立popout owner。:62–64旧data-choice-index需迁新NoteHistoryPanel的A/B action（当前:382/393/435/444）；:70–78旧.cm-content/Unified必须迁真实diffs-container.shadowRoot的行/选择与side-by-side/stacked语义，当前review-page.tsx:12–13只承认这两布局。保原恢复/undo/Git零写入与5000行worker风险，复用T16 driver Shadow查询工具思路，不自造DOM diff。
5. **theme-matrix**：原脚本混合旧HUHU UI preset和仍保留的Markdown scheme。:187–225把旧forest token/body classes当整个UI输出预期，需区分当前HUHU source/paper/ink/accent/density/uiSize/motion与独立editor SuliWorld，不能一概删旧scheme断言。用真实themeSettings/applyInterfaceTheme/ThemeRuntime，代表纸墨/安全与不安全hostpalette/主窗与popout；保Markdown字体/颜色精度与关闭恢复不污染宿主。
6. **navigator-restored-leaf on/off + comments-edges**：原新vault恢复既有leaf、不重复root、module off移除、enable恢复一次；comments-edges已有真实编辑器/双叶与popout。补112/115后独立panel隐藏不查询、切note与旧save回执不清新草稿、反复显示保持root，不能只count节点。:38 onward旧gutter点击测试须按当前非交互role=img+精确命令/面板动作迁，保定位与高亮风险。若versioning-history已覆盖同一评论原生边界，按场景去重而不是再整套重跑评论性能套件。
7. **pointer/clipboard**：/tmp/huhu-real-pointer-fine/evidence/pointer-media.json实际fine=true/hover=true/coarse=false，证明Xvfb真实鼠标环境可用。headless runner:95仅toggle touch，:96只设置reduced-motion，默认case.pointer='fine'（:144）未验证matchMedia，实际none必须在结果记actualPointer/actualHover；不能冒称fine通过。最终Obsidian中在实际fine环境测32px、focus和hover，再单独CDP coarse条件测44px、触控+窄叶；不降低阈值。safe复制仅隔离Xvfb假记录nonce、读回本次nonce及clear/re-copy owner，主/第二Document各一，闭窗/锁定后定时清理不泄露；全程不碰用户剪贴板。

### 正式执行命令（尚未运行）

先T13/T16收口，Root执行T14表内唯一整体命令：pnpm run build；pnpm run lint；pnpm run lint:css；pnpm test；pnpm test:styles；pnpm test:architecture；pnpm run check:bundle；pnpm test:i18n；pnpm test:docs；pnpm run check:notices。全Vitest显式设置HUHU_TEST_PTY_BINARY=/tmp/huhu-final-native-binaries/huhu-pty与HUHU_TEST_CONTROL_BINARY=/tmp/huhu-final-native-binaries/huhu，保当前冻结native manifest核对。AC903保原预算，不提高阈值。

入口落地后：
`node --test scripts/ui-review/run.test.mjs scripts/ui-review/fixtures/frontend-redesign/integration/integration.test.mjs`
`node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-14 --matrix redesign --out /tmp/huhu-frontend-redesign/T-14-final`

Root把最终main.js/styles.css/manifest.json复制至独立/tmp构建目录并记SHA，然后每宿主脚本新root、同HUHU_PLUGIN_SOURCE：
`HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_PLUGIN_SOURCE=/tmp/huhu-t14-frozen-plugin HUHU_PTY_BINARY=/tmp/huhu-final-native-binaries/huhu-pty xvfb-run -a -s '-screen 0 1800x1300x24' node scripts/obsidian-acceptance/workbench-probe.mjs /tmp/huhu-t14-host-workbench-final`
其余同环境依次运行workbench-window-owner.mjs、terminal-merge.mjs、versioning-history.mjs、theme-matrix.mjs，各用不同全新root；navigator-restored-leaf.mjs需分别末参on/off。无需再次构建每个场景，输入未变时复用同构建；每个script实际安装产物SHA须等于冻结目录。未完成旧driver迁移前不要盲跑这些命令。

## 问题与下一步

先由Root分配T13旧seed/routes与T14语义驱动不重叠写集，修正T14 CLI/命名精确合同，再正式派实施。本次并未产生任何代码候选。原宿主startup-review仅有11rail/errors=[]且terminal采样是Tasks，必须保留为启动诊断，不能称终端或12页通过。T16最终图与必要真实宿主门未闭合前G-FINAL保持待验收。

return0，停止写入。本次无浏览器/构建/测试执行，所有验证结论均注明来源与边界。

### Lead 最新收敛（本报告落盘后收到，替代前述函数提取及8组合建议）

Root明确T13将迁移全局hit alias/路由并重建styles，最终输入已有实质变化；因此最终冻结同构建后重跑各票完整原66矩阵有充分新增依据，并非无理由重复。本报告前述有界8组合仅为早期候选权衡，正式方案以本段为准。原T08标题12等仍保留历史归因，但不冒充新全局样式输入的最终验收。

采用更小的独立Node child汇总，不提取run.mjs主体函数。没有实际依赖要求函数提取；原CLI可完整保留：

- Root仅改scripts/ui-review/run.mjs的T14专用分支与scripts/ui-review/run.test.mjs；T14 branch在普通fixture import/build前委托integration/index.mjs，普通票路径/适配器/矩阵/cleanup完全沿现入口。
- worker只写integration/index.mjs及必要integration.test.mjs，静态白名单T01–T12、T16（不递归T14、不填不存在T13fixture），spawn(process.execPath,[既有run.mjs,'--suite','frontend-redesign','--ticket',child,'--matrix','redesign','--out',父out下child子目录])；--check原样透传，父结果最多preflight，不能passed。无需空TSX，每子CLI自己真实编译已有TSX生产图并跑原verify/exercise。
- 独立Node进程各自修改HUHU_CDP_URL，不发生同一process.env竞争；每个现runner使用独立mkdtemp与Chrome port0，T09保原Electron精确stub。默认并发2，上限3由Root依据实际资源选择；Root Lead为唯一验收执行者，worker不私跑多个最终验收。
- 父汇总验证child实际exitCode=0、result存在且status=passed、errors=[]、预期完整case数、真实production entry在child inputs/metafile里；统一记录child artifact/driver/inputDigest与矩阵结果及失败项，不只看status。缺失/中断/child失败不绿；证据不完整保留本地路径，父退出非零。父inputs至少含当前runner、integration manifest/driver与全部child结果/输入摘要，明确Child index路径，不造生产截图。
- 最终全部child统一使用冻结的当前styles与host app.css输入；T13/16完成、同构建冻结之后由Root运行一次原CLI T14即可得到12页1440/390及完整redesign矩阵。仍由native workbench probe验证真实跨页面组合，不用T04 fake Page替代整机。

这些是只读实施建议；没有代码/状态写入，也没有启动child、浏览器或最终验收。Root新增共享写集仍仅上述runner两路径及必要宿主脚本，worker可写仍为integration/**。
