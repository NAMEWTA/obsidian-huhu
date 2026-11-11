# 任务回报

Session: 20261105T094057Z
Task: 063-preflight-t07-automations
Status: completed

## 聚焦交接

既有 medium native:/root/implement_t01，只读规划、未委派。T07未启动；T15候选Skill已读取，但独立审查/G-CONTRACT是否通过仍归Lead。本次仅写本REPORT与 /tmp/huhu-t07-preflight；未改模块、共享字典、资产、依赖、正式状态或Git，未运行模块测试/构建/浏览器，不能当实现验收。

T07当前UI/**及zoned-occurrences最小strict接缝写集足以完成列表/右详情/弹窗与DST迁移；**批准文字中的“结束日期”没有现有领域字段或解析支持**，须Lead在实施前明确处理，不能在只获UI与strict-DST权限下添加虚假控件或调度schema。其余完整功能可按下述范围迁移，无依据申请整个services写权限。

## 产物与验证

### 入口、页面及单一状态

`module.ts`提供AUTOMATIONS/COMPOSER/SCHEDULE；`ui/workbench-page.ts`创建AutomationPresentation（ReactSurface），`automation-presentation.tsx`保存target及有界pageState、接收deep link focusId=edit。当前navigate仅规范tasks/runs，外部navigate/restore可重置编辑；实施需明确dirty关闭/导航处理，不能只防弹窗右上角关闭。

`AutomationsPage.tsx:36–52`保存search/filter/status/result/kinds/agents、sort与selected（现用于键盘行）；真正详情由WorkbenchTarget.resourceId选中。推荐target作为唯一业务选择，键盘focused row另命名为临时焦点，不继续双份selected来源。当前:257以后edit/selectedRun/runs/selectedDefinition/list互斥，选中即卸载列表，missing target又退回普通列表；需删除这些旧替换分支，tasks列表持久挂载，右侧DetailPane展示definition或单次run及缺失态。全部运行与新建是独立页面；编辑现有定义走Dialog，source-owned composer继续唯一公开创建端口。

DetailPane必需leafWidth，用useLeafMetrics取真实叶element/width；inline须leaf≥960且main≥1000，leaf<600全叶宽，其余overlay。保留list节点、真实scroll/filter、来源行ref、切详情/关闭/真实FocusScope退场后的精确来源；不能仅恢复路由却丢输入、scroll。Dialog内日期显式collisionBoundary=logical leaf element，第二Document不能误用主窗viewport。

### 字段和动作的完整迁移地图

| 当前UI路径 | 不可遗漏的真实内容/行为 |
|---|---|
| list/*、TopBar、detail/AutomationDetail | search、enabled/disabled/result/kinds/agents filters与pills、name/lastRun排序、类型图块、名称展开、schedule/next/lastRun/Space及来源提示；概览/运行记录tabs、source/link、run/edit/delete、enabled Switch。记录默认50并可继续，不能仅原型几条。 |
| runs/RunsPage、RunDetail、detail/RunHistory | 所有运行status（pending/running/unknown/succeeded/failed/cancelled/interrupted/skipped/delivered），自动化/时间范围筛选、继续加载、timing/duration/usage/cost未知/partial、message/output/日志、timeline/precheck、copy/terminal/stop、source与原calendar receipt、重试/重跑。calendar retry保留原delivery身份/日期/目的地，不能改成新manual run。 |
| editor/EditorView、ContentPane、SettingsSidebar | name、模板选择和prefill、action切换时由registry迁移共享text、enabled/device/revision、schedule、grace、precheck command/shell、notifyOn always/failure/never、channels in-app/system；save/save-and-run/cancel及Ctrl/Cmd+Enter/IME、touched错误/聚焦、锁与dirty、失败保留。保存后run用服务实际stored版本，不用旧draft。 |
| actions/agent、script、SessionField | agentId、Space稳定id/cwd、prompt或script、shell bash/powershell、fresh/reuse/specific、session/account/transcript/terminal引用、extraArgs、会话加载/空/失败重试；存量无Space可读但禁止执行/保存，选择失效不能自动换Space或cwd。beforeSave必须重新检查Space。 |
| actions/notify、obsidian-command、open-file、open-url | notify body（source-bound只允许提醒）、宿主命令选择、文件路径、http/https URL原有normalize和validation。不得为视觉改版删除七种action之一。 |
| actions/create-task | text、纯日date可缺省（运行本地日期）、time可缺省、timezone、已有绝对reminderAt字段必须保留；自动化trigger的时间与task deadline/reminder互不推导。当前UI未提供reminderAt编辑，不能把定义内已有值丢掉。 |
| composer/composer-page.tsx | 外部ownerWindow与当前物理owner，返回saved或undefined，source/action/prefill/link；AbortSignal关窗与module关闭；当前未传dirty canClose，需与新编辑Dialog共用真正dirty决策，隐藏时释层而保留草稿。 |
| settings-page、dialogs/* | 本机说明、打开tasks/inbox及help/channel/session/hook；删除偏好skip确认持久由host提供，active run禁止删除，删除保留历史；错误/重试与取消。 |

公开调用方：app/commands new-automation；home、archives、navigator通过AUTOMATION_COMPOSER；task通过AUTOMATION_SCHEDULE及source contribution。API只读，保留SourceRef dashboard/contacts/widget/task与ownerWindow，不在下游复制composer/调度。`services/view-store.ts`对service definitions/runs做独立immutable快照，domain service才拥有持久状态。

### 保存、Switch与晚到结果

`core/api.ts`实际save/remove/stop/clearHistory返回Promise<void>，不是带revision的receipt；service.ts:268–309在保存/刷新后发布真实definitions，schedule/action/precheck改变才递增revision，单纯enabled不递增。UI应每id共用pending锁（列表+详情）、aria-busy/disabled、阻止行导航和重复操作；成功/失败都以最新service/store快照呈现，不把旧Promise返回当新状态，不凭假receipt版本号更新。关闭/隐藏/换owner后迟到完成不重开详情、不覆盖新选中/新draft；活动错误用Notice并保留重试。服务没有UI可用的CAS新接口，不应谎称通过revision比较获得跨并发编辑事务。

启停仅save enabled，绝不调用stop；module execution gate关闭会停止owned runs，是另一条service语义，不能混为单定义暂停。remove明确拒绝active run；运行/stop/retry/clearHistory依现有owner方法，不改admission/precheck/delivery/cursor/通知语义。UI选择模块已停/other device/loadError应只读并解释，保留可读历史。

### 日期与严格DST的最小适配

真实ScheduleSpec（shared/automation/types.ts:10）：manual；once `{at:number}`；recurring `{expression:string,start:number,timezone?:string}`。SchedulePicker展示manual/once/hourly/daily/weekdays/weekly/custom；custom由现有CronField提供未来3次preview，底层接受cron与受限RRULE，不能重造parser。widget拥有固定schedule，source-bound不能切非notify；手动专用action切换后仍manual。

DateTimeField需value `{date,time,timeZone}`或null、initialTimeZone、真正caller-owned validateValue。once.at及recurring.start仍epoch；显示由Intl在明确zone格式化，提交由现有resolveWallTime转换；once没有存储zone，不擅改schema。recurring timezone与start保留，纯create-task.date用DateField，无UTC纯日往返；time用唯一共享基础输入组合，不能将trigger时刻塞进task date/time/reminderAt。

`core/schedule/zoned-occurrences.ts:84`已有resolveWallTime：从相邻日偏移枚举候选、过滤回墙上时间；gap抛错，fold取Math.min。授权最小扩展为可选strict/reject策略（或相同候选的独立严格导出），默认earlier保持原样；strict候选0/大于1分别拒绝gap/fold，UI翻译code并保留草稿、禁止service.save。无需第二timezone库/算法，也不改zonedOccurrence内部gap skip/fold计划行为。nearest test `zoned-occurrences.test.ts`当前尚无文件，可按已授权新增；真实生产SchedulePicker→EditorView→service验证NY 2026-03-08 02:30与2026-11-01 01:30均不写、UTC/Shanghai正常写入准确epoch，并保留默认fold earlier控制。共享日期mock callback不是AC023证据。

**结束日期缺口：** DESIGN automations文字提到结束DateField，但上述schema没有end/until；`automation-schedule-parsing.ts:40–75`RRULE只许FREQ/BYDAY/BYHOUR/BYMINUTE，UNTIL/COUNT明确拒绝。该票core权限仅strict DST，不授权新增结束规则。需要Lead确认这不是对已有字段迁移的要求，或明确另行补领域producer/范围与测试后实现；不能把end UI藏成未保存值，也不能私加UNTIL改变既有调度。当前没有其他必须扩大的服务权限证据。

### 实施写集、验证与边界

已核实Ticket frontmatter：UI/**、T07 fixture/**、zoned-occurrences.ts及相邻test；共享i18n.ts/main.js/styles.css由Lead。建议实际UI改动集中AutomationsPage/Presentation、list/row、detail/runs、EditorView/SchedulePicker/composer/actions/create-task/parts/settings，按同票全替换旧variants/布局。共享Dialog/DetailPane/Date/FormField/Notice/Switch足够，无需额外全局focus/position或业务store。

Lead词典请求应先列精确en/zh键：saving/enableFailed/disableFailed、definitionMissing/runMissing、DST gap/fold（含zone/墙上时间）、editor dirty/keepEditing/discard。尽量复用已有automation.*及ui.*，不擅改main词典/共享API。

实施TDD顺序：
1. DOM红灯锁定list节点身份/真实scroll/filter，target切换/关闭/缺失仍保留list；来源focus、run详情嵌入、独立runs/new页面与dirty外部navigate。
2. 延迟save成功/拒绝/换选择/隐藏/卸载、列表与详情同id双Switch锁、空格无行导航、重复点击只写一次、真实store回读和active run未stop；先保存后run采用真实revision。
3. DST strict单元红绿及真实表单/实际service联合测试；保留automation.test.ts的manual/once/cron/RRULE、due-once/cursors/restart、失败commit不可见、calendar retry/Space/admission/latehandle等安全回归。
4. 保留迁移AutomationsPage.dom.test.tsx、composer/composer-page.dom.test.tsx、editor/automation-target.dom.test.tsx及draft.test.ts全部现有风险：七action registry一致、来源身份、过期Space/forbidden args、disabled只读、隐藏释放picker、取消无保存/module关闭。
5. 计划命令：模块DOM、相邻单元+真实automation.test.ts、test:safety-regressions，scoped types/lint/architecture/i18n；全局旧consumer编译债据实记账。新T07 fixture必须actual production imports+domain port，1440/390与320/zoom2、实际leaf620/main568/580、双Doc、normal/reduce、en/zh/fine/coarse；真实鼠标/触摸/键盘、IME、Date popup/两层Escape/精确来源、trusted wheel后adoption及hidden/close清理。Lead统一CSS/build/冻结完整E2E，iframe不等于真实Obsidian popout。

## 问题与下一步

读取当前candidate ui Skill与相关生产源，保存59项实际source SHA快照于 /tmp/huhu-t07-preflight/sources.json（实际条目数以文件为准）；作者报告不替代源码事实。本次未运行模块门禁、不宣称通过，也没有外部依赖选型或安装。

先等T15独立门与绑定刷新；实施TASK应明确结束日期的无producer处置，再按原完整UI范围授权。其余shared字典由Lead串行，strict DST已有精确权限；不需要为只读预检启动模块票或改正式计划。旧产品/代码与既有冻结输入保持不动。
