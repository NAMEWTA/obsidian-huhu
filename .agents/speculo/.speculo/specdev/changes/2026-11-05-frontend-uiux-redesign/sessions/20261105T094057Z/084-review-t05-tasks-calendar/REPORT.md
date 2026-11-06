# 任务回报

Session: 20261105T094057Z
Task: 084-review-t05-tasks-calendar
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，既有 gpt-6.1-sol high 独立角色；没有参与066/071/080或共享日期修复，没有实施或委派。**standards：request-changes；specification：request-changes。** 完整审查43项任务/日历候选与真实日期/服务组合，确认3项P2：S01持续深链selectedId重开已关闭详情，S02晚到完成回执把旧任务插入新查询，S03状态筛选在实际320px横溢。

**明确释放全部43项候选及本次必要共享上下文的review冻结，供Lead/原owner修复。** 首尾52项字节、模式和无symlink核对drift=[]；权威输入同样无漂移。仓库只写本不可变REPORT；原始代码、JSON、日志与快照仅在/tmp/huhu-t05-high-review。没有源码、fixture、配置、依赖、资产、Git/index、正式状态或Evidence写入。原066/071/080报告不变。

108项owned测试、46项task core/services测试、32项生产源lint及范围类型通过；这些未覆盖本轮两个真实行为反例，也不抵消Lead正式浏览器失败。最终66、实际宿主、多窗口和资产仍归Lead，本报告不宣称其通过。

## 产物与验证

### 固定输入、范围和来源

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。真实派遣是084 TASK与Lead工具消息；结构校验不替代实际身份或审查。没有使用HEAD或Git diff替代dirty候选。

- 作者最终43项清单：/tmp/huhu-t05-hit-repair/final-candidate.json，SHA256 **28341e8934942069a031b4e884b564907bc2dee248c2f0a892c19257651a1ba0**；candidate每项与当前源/模式匹配。080不可变REPORT SHA256 **4c9eab2d2b0ed287b39ef5943cae518577e08f6622f325dd109c9a401adf2311** 已回读，071与066原报告/风险记录也已回读。
- 完整起点是066实际before.json/before/，35项清单SHA256 **0148eae8100ed8bcb50809873acdf2825ae5f37884a1507465b0a39cb7f02fdd**，副本逐字匹配；不是仅比较080四项。最终相对066：修改23、增加9、未改11、删除1（TaskEditorForm.tsx，实际不存在）。全部32个新增/修改源及其测试/fixture差异在私有diffs/，changes.json SHA256 **54876cd7324568f2b396040c8fd652d1d76060a7a4d541fdfbbef4ad1ac79286**。
- 自有candidate/、manifest.json固定43 owned+9 context共52项，清单SHA256 **ed8bbfea1ba2ddaa28f4e72924dc11a83daa5f0f527acf94b6758a6f1eca5569**。9项是DateTimeField、DateField、date/Calendar、date-value、task core/calendar、services/calendar、task/home词典与lazy/calendar词典。前6项逐字等于078已审闭共享输入；仅复用这些相同端口的既有日期raw/controlled reset、IME及严格service结论，不把整个T06或全仓当作相同。
- 标准：AGENTS、dev/ui与testing、task-domain文档，公共code-review/source-discovery/risk/reuse/Fowler合同；规范：当前Map28、Goal、Spec、T05完整补充、批准DESIGN revision3/UI-002。DESIGN绑定摘要仍49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。authority.json SHA256 **753979492a79fd26b89832510c29768b91b339376f610ad27f48f83032ac97b6**。来源发现的commit/远程Issue分支不适用，本任务是显式本地快照；不缺规范。
- 公共review-scope工具成功固定全部52项；私有review-input.json绑定scope/sources/exclusions，Input-SHA256 **ea6ad9465d995f2b283aa3bb236d7ee6a27be08060960eff4a8cbf7ab2634769**。最终核对final-verification.json的source/authority drift均[]。T12/T16/T09/T07活跃写集、全局类型/selector债与Lead正式资产排除。

### standards 输出

Reviewer: native:/root/review_toolchain
Axis: standards
Result: request-changes
Input-SHA256: ea6ad9465d995f2b283aa3bb236d7ee6a27be08060960eff4a8cbf7ab2634769
Findings: S01/P2、S02/P2、S03/P2。

**S01/P2 — 深链selectedId被当作持续受控选择，详情无法正常关闭或留在本地新选择。**

位置：src/modules/task/ui/TaskPage.tsx:124–129；实际调用方workbench-page.tsx:38–40、49–56。TaskPresentation保留外部resourceId，只在navigate时改变；TaskPage effect却依赖内部selected和dirty，内部关闭设undefined后仍看见旧selectedId，于是立即再次setSelected。同样会把本地选择B拉回深链A；dirty变化也可重新触发原请求。

实际反例：生产TaskPage、真实createTaskRepository/createTaskService，传selectedId=task:alpha，详情出现后点真实Close；最终data-task-editor仍存在。没有深链、从本地Alpha行打开再关闭的同一对照通过。私有page-lifetime.dom.test.tsx、page-counters.log包含结果。066原代码用opened ref消费深链一次，当前回归由新的详情状态同步引入；没有以假views.edit实现替代被测详情。

满足条件：外部导航请求只在该请求实际更新时被消费，或明确区分请求与内部选择状态；允许关闭、切换行、脏确认取消/丢弃，保留后来新resourceId的导航能力。不要只隐藏Close或取消深链支持；补真实受控请求与本地交互回归。

**S02/P2 — 完成命令晚到时重新填充已清空的held，把不匹配任务带入新查询。**

位置：src/modules/task/ui/TaskPage.tsx:117–123、145、185–189。查询变化effect只清理当时已有held/timer；更早toggle的成功分支不检查原查询是否仍有效。用户在持久化pending时改搜索/筛选，旧回执随后setHeld，rows无条件追加该任务，污染新查询约1.4秒。不是领域写入错误，而是旧操作结果的展示归属错误。

真实反例：用实际服务创建Alpha/Beta，只在外部execute端口前加可控gate；点Complete: Alpha，gate未释放时把Search改Beta，再释放并等待真实execute完成。结果ids=[task:beta,task:alpha]且查询Beta。不切换查询的配对控制正确保留Alpha，证明没有削弱原1.4秒要求。两个反例/两个控制合计4测试，最终2red/2green。已有“改筛选清held”用例是在完成返回之后切换，未覆盖该实际竞态。

满足条件：按原查询身份/代际决定是否可追加held和安排其展示timer，领域已开始的完成命令仍诚实执行；旧结果不混入新搜索/筛选/日期/排序/页上下文。保留同一查询1.4秒、保存态、失败重试、revision条件undo，不能通过删除保留态或缩短有效断言修复。

**S03/P2 — 完成状态分段不换行，实际320px初始页面横向溢出并截去Overdue。**

位置：src/modules/task/ui/TaskPage.tsx:363–372；共享SettingsFormControls.tsx:176、200默认wrap=false，已有显式wrap能力。外层flex-wrap不能拆开分段组件内部四个不可缩按钮。

证据由Lead实际新共享CSS运行产生，本reviewer回读JSON并查看failure.png：/tmp/huhu-t05-lead-hit-final/result.json，status=failed，首case为320/en/paper/fine/compact14，documentElement.scrollWidth=365、clientWidth=320；失败在T05 fixture:384原始页宽断言，截图右侧Overdue被截。inputDigest=e27483fbf3bb37da43dc8cdcb989b6ac6e36bd31ddf58fd685d09eebbc1c84af，Chrome153.0.8010.47。该图中29项本review固定源可在实际bundle inputs找到且全部hash匹配，无in-scope mismatch；其余未在该bundle使用的本票路径不伪称已浏览器覆盖。没有重复运行66或把作者private命中通过冒充此布局门。

满足条件：T05调用使用共享可换行能力或等价真实可达布局，保证各状态及计数可完整读取/操作，320/200%无页面级横溢；保留键盘/焦点/44区隔。不要裁掉Overdue、减少选项或放宽页面宽度断言。完整修复后的实际矩阵仍由Lead验收。

### specification 输出

Reviewer: native:/root/review_toolchain
Axis: specification
Result: request-changes
Input-SHA256: ea6ad9465d995f2b283aa3bb236d7ee6a27be08060960eff4a8cbf7ab2634769
Findings: V01/P2（S01）、V02/P2（S02）、V03/P2（S03）。

- V01：DESIGN tasks §6右详情与T05稳定详情/异步换条目合同未满足；深链是实际TaskWorkbench公开调用，关闭后立即重开不是稳定选择。
- V02：AC-042的未完成筛选保留态与T05查询/排序/分页归属未完整实现；保留应属于发起操作的视图，不能覆盖当前查询条件。此项不要求新增域命令或取消已接受的领域写入。
- V03：Spec NFR-002、T05窄屏/200%无页面横溢与可达筛选要求未满足。原始有效页宽断言和当前真实输入必须保留。

其余已实际审查的有界结论：

- 完整list/board/calendar共享TaskContent；标题/说明完成态与日期/资源标签分离。实际TaskFields title/description/timezone/due(date/time)/planDate/reminderAt/relations全部映射，没有新增Task project/priority/tags/doing。Home VaultTask既有priority投影不是新Task域字段。cancelled为只读详情，complete/reopen/cancel与one/following、recurrence/end、历史、资源缺失/提供者不可用保留真实域端口；没有凭空要求新bulk命令或改includeCancelled默认合同。
- TaskEditor写入串行、captured version防晚到回执覆盖新草稿，payload复用commandId用于相同重试、revision用于CAS；冲突保留本地草稿而非盲目覆盖远端。selection更换/对话框close的AbortSignal、alive与重试结果检查保留；autosave等待450ms，following显式保存。现有真实测试覆盖失败、迟到标题、非法raw阻断、取消/abort、CAS和undo新revision保护。本次没有以mock成功替代这些核心函数。
- DateField due/plan/end及DateTime reminder报告raw；非法/未完成值不会带走旧有效值。due/reminder在真实wallTime reject端口校验gap/fold，Home显式有时间快捷创建经strictTime:true，纯date-only创建不补epoch。默认内部earlier不变，UTC/Shanghai及NY严格无写的真实表单/服务测试通过；已闭同日controlled reset源字节未变。时间转换不移进泛型UI。
- CalendarBackend是DayPicker薄适配，ProductCalendar只组合公开Day/DayButton/Week/WeekNumber及DateLib窗口方法；日期生成和roving focus仍归唯一引擎，无另写arrow算法。1–5周×weekStarts0/1/6的边界ArrowRight和PageDown/PageUp共30真实库DOM回归通过。CalendarModalPanel祖先arrow疑点已核对实际DayPicker实现：导航键preventDefault+stopPropagation，未作为缺陷。
- 080日期按钮clip/pointer分区与非指针focus wrapper保留公开事件/ARIA、任务兄弟内容的独立按钮；TaskRow两按钮各有HU-hit格，不删除remind/source/remove回调。DOM独立语义/回调回归通过；32fine/44coarse实际point、paint与主/iframe只引用080作者私有记录，未升级成Lead66通过。精确边界与严格内部点原assertions不应弱化。
- Home MonthGrid窄宽转count入口、CalendarTile有真实DateField/Month入口和Agenda，较宽有完整任务行；WeekTimeGrid自己的局部横滚保持内部，不用于豁免页面横溢。周期笔记/日周月/quarter/year菜单、选中与active note、source/hover preview仍保留实际ownerDocument窗口。preview请求有generation、detach、窗口事件清理，旧日期响应不替换新日期。CalendarDayPanel按iso key重建Agenda，旧add回调不会清新日输入。剩余真实宿主/像素门仍待Lead。
- 旧TaskEditorForm删除后由实际TaskEditor/TaskComposer及新raw/域事务测试承接；Navigator消费新CalendarMonth/TaskComposer的迁移由T10负责，原选择器/全图债需原owner继续记账，不把它误报本票source编译已全绿。没有改批准设计以消除问题。

### 实际检查与限制

所有本review过程输出仅在/tmp/huhu-t05-high-review：

| 命令/检查 | 实际结果 |
| --- | --- |
| pnpm exec vitest run src/modules/task/ui src/modules/task/core/time.test.ts src/ui/components/huhu/calendar src/modules/home/ui/calendar | 0；9文件108测试，owned-tests.log |
| pnpm exec vitest run --project unit src/modules/task/services/calendar.test.ts | 0；1文件5测试，strict-service.log |
| pnpm exec vitest run src/modules/task/core src/modules/task/services | 0；4文件46测试，domain-tests.log；包含上面的5 service与owned中的time测试，不把重叠数相加 |
| pnpm exec vitest run --config /tmp/huhu-t05-high-review/vitest.config.mts | 实际退出126；1文件4测试、2red/2green，page-counters.log；S01/S02两个反例失败，局部close/同查询retention两个控制通过 |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-t05-implementation/tsconfig-fixture.json | 0；types.log空，仅该实际fixture源图，不代表全仓 |
| pnpm exec eslint --max-warnings 0 <32个owned生产TS/TSX> | 0；零警告，lint-result.json列实际argv；未把被配置忽略的测试/脚本算lint通过 |
| node --check scripts/ui-review/fixtures/frontend-redesign/T-05/index.mjs | 0；语法检查，不是浏览器验收 |
| validate-specdev.mjs --review-scope --mode source-files，全部52项 | 0；review-scope.json/err；无Git历史伪装 |
| validate-dispatch.mjs --stage dispatch | 0；errors=[]、warnings=[]；dispatch.json |
| 原35baseline副本、最终52输入、权威原文hash/mode/无symlink | 通过；baseline-verification.json、final-verification.json，无漂移 |

未build、重建main/styles、更新资产或正式状态；全仓types/lint/build与T12/T16/T09/T07不在本次结论。Lead最新正式T05只跑到首case布局失败，未验收后续矩阵/interaction；080作者privatepassed也明确不含该初始fine320布局门。本review不以DOM、类型、语法或预检成功替代真实浏览器/Obsidian popout/完整全状态验收。

## 问题与下一步

三项P2交回Lead及原T05 owner，输入已释放，可做最小范围修复。保留原两个实际红灯及两个对照；S01明确外部导航请求生命周期，S02隔离晚到展示与新查询，S03在T05调用端接入共享换行并保留全部状态。修复后重新冻结，只定向复验变化和原反例；Lead再完成实际66/宿主与资产，不降低有效点、页宽、焦点或原业务断言。本报告不会因后续修复被覆盖。
