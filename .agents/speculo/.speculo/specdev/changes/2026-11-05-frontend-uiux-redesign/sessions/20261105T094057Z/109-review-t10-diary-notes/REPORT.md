# T-10 日记、导航器与批注完整独立双轴审查

Session: 20261105T094057Z
Task: 109-review-t10-diary-notes
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，既有 gpt-6.1-sol high 独立角色；未参与100实现或Root fixture修复，没有实施或委派。**standards：request-changes；specification：request-changes。** 确认五项实际行为问题（ST-01 P1，其余P2）及一项严格命中合同缺口（SP-01 P2）。不是将作者绿色测试或 --check 当成真实宿主/设计验收。

**完整审查完成，明确释放100的86路径及必要只读上下文review冻结，供原owner修复。** 本次只写本不可变REPORT及 /tmp/huhu-t10-high-review；未改生产源、fixture、配置、依赖、资产、正式状态、Evidence或Git/index，未操作用户vault/系统clipboard。原100报告保持不可变。

实际重跑143 DOM、107单元、62生产源lint、fixture类型、comments CSS、真实comment-storage/handoff均退出0。另以真实生产模块/服务/存储/独立根做五组配对counter，最终10项为5个预期红反例、5个绿控制；这些失败是下述finding证据，不能作为候选通过。没有重跑66或实际Obsidian/popout/可信指针矩阵，Root继续拥有最终native及资产门。

## 产物与验证

### 固定输入、独立性与范围

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。真实派遣为109 TASK及Lead工具消息。标准来源依次为AGENTS、workspace/catalog、dev/ui、editor-comments、testing及SpecDev C/公共code-review/source-files/risk合同；规范来源为Map38/Goal/Spec/T10及批准DESIGN revision3/UI-002，designDigest **49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66**。显式本地源审，无PR/commit来源发现需求，无缺规范或跳轴。

- 作者 candidate-manifest.json SHA256 **867b48097904a29af40e46b4eb0bcfcbb8f05a6758e7b47e6779be0f9ae04a4b**：86项（含两个fixture入口），实际dirty baseline85清单SHA256 **7c78e2045fd7541dc2fff86bc1e1b66075e92367ba96907d9e61fbf865cc013e**。已逐项验证85份baseline原字节、86份candidate字节/模式，保存自有candidate与完整35路径差异；没有拿HEAD替代dirty基线。初始candidateDrift=[]、baselineDrift=[]，最终生产84项及原index.mjs未漂移；index.tsx只有下述已授权Root fixture叠加，按显式新清单核验而非静默忽略。
- 沿真实调用扩展20个上下文：navigator模块/API、diary-writing/search、vault-source，comments API/真实service/store/overlay/anchor，EditorContext合同、providers/visibility、真实DateField/CalendarMonth/Agenda/TaskComposer、periodic-paths及T16实际history-panel-page/NoteHistoryPanel。扩展原因是验证真实存储、周期身份、Calendar公开API及跨独立根可见性，不代审或修改T16功能。其固定字节/模式见context.json，SHA256 **d4f78ab142eb70c022c1450b62479f72c89a671fcd8a7941b31d32df4af6e96c**。
- 公共review-scope只读工具退出0，106个存在路径；review-scope-final.json SHA256 **52c33f45ec094ccdbca486b418a779aa17f90f037e92065d07f49cf82018adfb**。authority.json SHA256 **54745d1822f8cb8f64efdeb615efe0990ff979bf2295cc2e5f968bc0b4e06ea7**，保存实际标准/规范字节。review-input-final.json Input-SHA256 **1fc85787e79ace452457147cfc72216332982868160439c0ff6348ac715b9a57**，绑定以上输入及初末检查，不伪造Git fixed point。
- Root告知首次native390在 /tmp/huhu-t10-first-native/result.json 因fixture memoryVault.workspace.on缺失而startup失败；报告写入前捕获Root既定授权fixture-only叠加：index.tsx原09f07df1ddaa3260688ee9e593ce4052f2dbfd5ce61812a2257393a9574cbbde → 3952760e36fd70e8470ee8b4ee64f06d7a5b527872aaaf49576bb57b31b67db1。已逐行检查，仅为memoryVault.workspace补on/offref/getLeavesOfType端口及dispose后listener泄漏断言，无生产或设计/几何断言变更；root-fixture-context.diff/tsx保留原始材料。更新final-manifest.json SHA256 2bdee198fe8f0e98dea04f980727033ab6829153580ef2144d5a39b74cdf9f93、公共scope及最终Input-SHA，20个source context未变。此叠加未重跑本报告原fixture类型命令，原types0仅针对原快照，最终native/fixture types由Root验；不冻结其driver，也不把该启动失败归因生产源或将 --check 当native通过。T08可选DateField新能力不是T10现有消费者修复的替代品；本报告所用DateField字节已单独固定。并行T08/T09等源不纳入本范围结论。

### standards 输出

Reviewer: native:/root/review_toolchain
Axis: standards
Result: request-changes
Input-SHA256: 1fc85787e79ace452457147cfc72216332982868160439c0ff6348ac715b9a57

**ST-01 / P1：写作日期显示非法raw时，Save仍把文字写入旧有效日期。** 路径 src/modules/navigator/ui/diary/SearchWritePanel.tsx:87（DateField仅onChange）、:55–62（save使用旧draft）。真实Navigator模块→composeWorkbench diary→Tools→Write：已有2026-11-04草稿，日期输入2026-02-31并blur，输入正文并Save，实际2026-11-04文件被追加，且发布success/committed:true；界面仍显示非法日期。共享DateField正确标为invalid，但上层没有接raw通知或阻断提交。合法日期控制正确追加。实际数据被写到用户没有选择的文件，故P1。解除：使raw日期状态进入上层有效性/草稿身份门，非法/未完成raw时不调用save或open旧draft，修正为合法日期后保留正文并按实际新日期重建/校验草稿；按钮和Mod+Enter走同一门，不能只藏错误状态。证据：date-counters.dom.test.tsx、counters-final-proof.log 的 WRITE_RAW。

**ST-02 / P2：非日周期选中周期中间日期后，真实已有周期笔记被显示为空。** 路径 src/modules/navigator/ui/diary/DiaryReader.tsx:50、:105–111；selectDate只保留原日字符串，而list返回周期首日身份并按完全相等找页。真实MemoryVault预置2026-11月记，经真实模块切Monthly，11-01能读到正文；Jump/Go选择11-17后正文消失，periodic.inspect('month',11-17)仍明确existing且路径同一2026-11.md。不是模拟周期服务的约定差异。首日控制通过；实际反例只测月，其他非日周期共享相同未归一化入口，不能声称逐个实际复现。解除：沿已有startOfPeriod与实际weekStart把该周期选择归一化，保持jump、selected/year/calendar及periodic.inspect/open的身份一致，覆盖真实周/月/季/年消费者而不自造日期引擎。证据：date-counters.dom.test.tsx、PERIOD_SELECTION记录。

**ST-03 / P2：隐藏保留的侧栏贡献跨独立React根丢失可见性，仍随换文档读取。** 路径 src/app/editor-panel/panel-host.tsx:62–65、:101–105；上下文 src/modules/versioning/ui/history/history-panel-page.tsx:6–14、src/ui/react/providers.tsx:25–53。host新forceMount保留两个visited标签，并把VisibilityContext=false包在MountedPanel外；但panel.mount建立另一个React根，ContainerProviders默认visible=true，父context不穿过该根，公共mount返回值也没有可见性通知。实际mountEditorPanelHost→实际mountNoteHistoryPanel，先History再切Comments，History ancestor确实hidden/inert；换到other.md仍调用真实History组件的fileHistory('other.md')。不隐藏的配对控制恰好调用一次。不是对T16未改源臆测：本票从卸载改为保留却没有传生命周期，造成新组合回归。解除：经真实贡献边界提供最小可见性生命周期并让实际独立根/读取使用它，隐藏停止新读取/迟到续读，恢复保实例和状态、卸载照常清理；不以父context或重新卸载冒充满足隐藏保留。实际已验证History，Comments也应按同一真实边界核对，不声称本反例测过所有贡献。证据：host-counters.dom.test.tsx、HIDDEN_CONTRIBUTION记录。

**ST-04 / P2：批注note旧保存回执关闭编辑器，丢掉等待期间的新草稿。** 路径 src/modules/comments/ui/thread/ThreadCard.tsx:80–84。Textarea和Save在真实service.note等待durable flush时仍可编辑；await返回后无草稿版本判断直接setNoteEditing(false)。真实CommentStore/CommentsService/CommentsPanel，保存First note时只暂停外部CommentFs.write，继续输入Latest note draft，再完成真实flush：编辑器消失、只持久化First note。等待期间不改内容的控制正常保存/关闭。此旧行为在dirty baseline中已存在，本轮主要迁样式，**不冒称100新引入**；完整T10迟到回执/草稿合同仍未满足。解除：旧回执只确认对应快照，不能关闭/清除新版本草稿，或使用明确且实际阻止编辑的busy协议；失败与重试保留草稿。证据：note-counters.dom.test.tsx、NOTE_ACK记录。

**ST-05 / P2：不同selection共享highlight幂等key，重叠持久化时吞掉第二个批注。** 路径 src/modules/comments/ui/popover/CommentPopover.tsx:22、:26–28、:43–53；真实服务 src/modules/comments/services/comments.ts:40–44。100新增request变化时重置saving，使新B可操作，但paletteKey一直是组件级同一对象。A高亮已被store接受而flush暂缓时，换到B并点Yellow，service命中A的acceptedHighlights，跳过B创建；flush结束后B弹层关闭如成功，a.md有1条、b.md实际0条。A完成后再做B的串行控制产生B高亮。外部端口仅暂停CommentFs.write，没有mock核心幂等服务。此新request-reset组合是100实际变化。解除：每个不同选择请求拥有独立事务key，同一请求失败重试保持其key，并保留迟到请求回执隔离；不能删除幂等机制或把B成功关闭当写入成功。证据：note-counters.dom.test.tsx、HIGHLIGHT_REQUEST记录。

其余范围已审：diary全部period入口、bounded book/cache/分页与fallback、订阅generation/隐藏取消、实际周期list/inspect/open及空日写作；SearchWritePanel已加载搜索/范围扫描、取消/失败/冲突/重查与退出guard；Navigator树/列表虚拟器实际行高/重测、展开与选中分离、查询/IME/键盘、undo/菜单/对话框、设置字段/模板/命令/缓存/布局持久化。没有造树、日期、翻页或存储引擎。

共享Calendar实际消费保留weekStart/周号/周数、active note定位、modifier/new-tab/split显式open/create、hover预览、TaskComposer与Agenda真实TaskCalendar API、source ownerWindow及错误消息；不是只验证import名字存在。comments锚点/core未重写，旁路文件仍由实际store拥有；range/line、reading marker、多thread IDs、重锚/孤立、回复/编辑/解决/删除确认与部分失败保留、ownerDocument channel与lazy overlay清理均检查并在现有回归中覆盖。宿主叶子generation防迟到lazy挂载、dispose与服务watch清理保留。以上没有其他已确认新增问题，不代表像素或真实Obsidian已通过。

### specification 输出

Reviewer: native:/root/review_toolchain
Axis: specification
Result: request-changes
Input-SHA256: 1fc85787e79ace452457147cfc72216332982868160439c0ff6348ac715b9a57

**SP-01 / P2：18×18可点击gutter marker与批准的严格命中合同冲突。** 路径 src/modules/comments/styles/comments.css:9–19、src/modules/comments/ui/editor/gutter.ts:15–24。实际作者CSS固定gutter宽18、marker宽高18、padding0/min-height0，没有扩大目标；粗指针也只放大reading marker，gutter仍18。新增语义button、可访问名、Enter/Space及2px焦点是有效改进，但不等于32/44命中。Spec NFR-002（spec.md:165）、DESIGN §3（DESIGN.md:453）及ui motion-a11y:39要求fine至少32×32、coarse至少44×44真实独立目标，没有等价panel入口豁免。OOS-002（spec.md:140）排除CodeMirror渲染内核重写，并不自动批准可点击marker例外；panel/浮层的32/44等价主要动作不能静默放宽该条。

解除：保留正文行高/编辑器内核边界，交付可行的真实独立目标并通过相邻行/焦点/粗细指针验收，或由规范owner形成明确获批准的适用边界并如实记录gutter未达尺寸；不能恢复跨行重叠伪元素、把18报告成44、或靠本review擅改批准DESIGN消除finding。此项是源码确定的尺寸/合同缺口，**本review没有运行真实浏览器gutter hit探针**；作者/Root18px观察保持其原证据归属。

ST-01/02分别同时违反非法raw不得提交旧值、全部周期实际消费合同；ST-03违反隐藏保实例须跨独立根传递可见性/暂停读取；ST-04/05违反草稿/迟到回执与批注操作真实持久化合同。规范轴引用上述实际反例，不另编未测视觉finding。HU token、共享组件迁移、局部旧CSS替换和DesignScope等源码方向与DESIGN3一致；UI-002书页绘制、长中文、320/200%、纸/墨、motion、原生多叶/popout/指针/Portal/2px像素仍待Root最终native，不能给Design Conformance整体pass。

### 实际命令、结果与限制

所有原始材料仅 /tmp/huhu-t10-high-review，以下为本reviewer亲自执行：

| 检查 | 实际结果 |
| --- | --- |
| pnpm exec vitest run --config /tmp/huhu-t10-high-review/vitest.config.mts --project dom src/modules/navigator src/modules/comments src/app/editor-panel src/app/workbench/comments-leaf.dom.test.tsx | 0；12文件143/143；dom.log |
| 同config --project unit src/modules/comments src/modules/navigator/ui src/app/editor-panel | 0；17文件107/107；unit.log |
| pnpm exec tsc -p /tmp/huhu-t10-implementation/tsconfig.fixture.json --pretty false | 0；fixture-types.log空；局部fixture图，不是全仓类型 |
| pnpm exec eslint --max-warnings 0 <62个owned生产TS/TSX> | 0、零警告；lint-result.json实际完整argv文件集合；未将测试/mjs误计 |
| pnpm exec stylelint --max-warnings 0 src/modules/comments/styles/comments.css | 0；css.log空 |
| pnpm exec esbuild scripts/verify-comment-storage.ts --bundle --platform=node --format=cjs --outfile=/tmp/huhu-t10-high-review/comment-storage.cjs --alias:obsidian=./scripts/obsidian-stub.ts --log-level=warning；node该临时产物 | compile0/run0；真实storage脚本，未改用户文件 |
| 同方式verify-comment-handoff.ts并node临时产物 | compile0/run0；真实handoff脚本 |
| pnpm exec vitest run --config /tmp/huhu-t10-high-review/counter.config.mts | 最终进程126；实际10测试5红/5绿，五个红为上述生产反例；counters-final-proof.log。不能称通过，也不把shell状态改写成1 |
| validate-specdev --review-scope --mode source-files | 0；106项；review-scope-final.json/err |
| validate-dispatch --stage dispatch | 0；errors=[]/warnings=[]；dispatch.json |
| baseline85/candidate86初末字节与模式核对 | 通过；initial-verification.json/final-verification.json证明原快照；最终生产/context无漂移，Root fixture替换如上明示 |

私有counter只复用真实现有fixture的外部Obsidian/FS/queries边界，核心模块/写作/CommentsService/CommentStore/贡献mount均真实；构造后最初的accessible-label、HTMLElement宿主helper、复制fixture遗留测试/导入问题已修正并留日志，不算产品finding。最终仅10个相关配对测试，没有把那些harness失败算新缺陷。navigator测试在无IndexedDB环境按真实代码降级内存缓存并告警，不影响本次写入/周期断言；跨root卸载有React同步unmount告警，本报告不将其另列未隔离问题。

复用069/075/078及既有T05/T16未变公共能力结论，只对当前真实消费者、变化及风险重新审，不重开共享日期/版本引擎审计。作者architecture与 --check记录已读但本review未重跑，也不冒认其命令；旧appearance黄金样本差异、TaskEditor232 TS7030在范围外，不用于豁免T10自身问题。未做全仓build/full types/lint、生成资产、重跑66、实际Obsidian/popout/OS/系统clipboard，未测试无限推测边界。没有初始live index字节指纹，故“未写Git/index”是实际操作事实，不冒充独立前后index hash证明。

## 问题与下一步

源审已完成、冻结已释放。原owner修ST-01至05；ST-03若需要贡献API/实际独立根可见性端口，应由Lead原子协调真实owner，不能在host里复制T16实现。ST-04是保留路径的真实未闭问题，修复时保留持久化/失败重试；ST-05每请求幂等key与迟到回执隔离应一起保留。SP-01由规范/实现owner解决严格合同与现有gutter目标的实际冲突，不静默放宽。

修复后复用本次未变证据，重跑上述实际counter及受影响控制、必要types/lint，并在新immutable任务中独立复审；Root随后基于最终输入完成T10正式native/资产/Design Conformance。原100与本109报告都保留原始判定，不覆盖、不提交、不改票据状态。
