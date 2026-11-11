# 任务回报

Session: 20261105T094057Z
Task: 059-review-plan17-calendar
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，既有 gpt-6.1-sol high；未参与 Root 的 Map17 文档修订，未委派。**standards：pass；specification：pass；新增 findings：0。** 结论限于固定六文档的规划与源码关系，不是 T-05 实现通过、T-15 交付、G-CONTRACT 关闭或 Goal 完成。

最小 B 方案已有明确生产者、真实消费顺序、Lead 精确共享路径和回归责任，足以作为后续有门控的 T-05 实施合同。完整月份组合可行性与 1–5 周条实现义务被正确分开；原跨边界红例、PageUpDown、领域周号、窄宽/200% 产品验证继续待做，不能拿私有 12 项正向小样替代。无需增加库、领域字段、票据或把 Navigator 源交给 T-05。

六文档及 26 项读取时源码/声明上下文首尾无漂移。**明确释放本次六份规划文件冻结。** 仓库唯一写入为本 REPORT；其余在 /tmp/huhu-review-plan17-calendar。没有源码、Skill、依赖、配置、资产、Git、正式状态或 Evidence 写入。

## 产物与验证

### 固定输入与来源

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；Mode: native。不是 Git diff 审查，不虚构历史固定点。冻结清单 /tmp/huhu-map17-review/manifest.json SHA256 **963a7f380c000f64970cee900c286a48ff0ff3af560bf919b48a684e8f941846**；逐项与当前字节及其 frozen/ 副本一致，结束再次校验：

| 文档（均在本 change 根下） | SHA256 |
| --- | --- |
| README.md | 601564f597523a73a9c307696e4bc3abcf784b5263060eb8a6306f6632592cc1 |
| goal-plan.md | a81ec321f773bbe80e628124a970432a30cae9b51175a667edb7b4885b1b4b70 |
| tickets-map.md | a6ee54a3af59720cc0cebc7286fb030e91e2a2fe7e5bf7a1270763002f4605fc |
| reuse-decision.md | 04157dd012c710c8f12659c8203de610e4d6a37a2271dede2e59cc4d4827d5ec |
| ticket/05-tasks-calendar.md | 06c0808f3fb3d9317aa12e2da05ab3795f64ff81ba4d9c6f9bb01f03f2f18b32 |
| ticket/10-diary-navigator-comments.md | 6a550aae9a63b84586f138ebc54a35a259a8361b3aeefc4e04a1ea64827faa64 |

已回读 055-preflight-t05-tasks、056-propose-calendar-content-adapter 的不可变 REPORT，当前 T-05/T-10/T-08/T-15、Map17/Goal Plan/README/reuse-decision，沿用 AGENTS、dev/ui、SpecDev 双轴合同，并读取 ChangeScope、ResearchAndReuse、DocumentContract。规范依据是批准 DESIGN revision3/UI-002、Spec、当前票据与 Map，不以 039 历史规划通过代替本次判断。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: pass
Findings: []

**真实范围与调用方正确。** 源码锚点如下，相关哈希保存在 source-facts.json：

- src/ui/components/huhu/date/Calendar.tsx:1–60：当前公开 props 仅 single/range、值/回调、bounds/weekStartsOn/today/inactive；内部已有 controlled month，UTC 日历组件转换、locale/lang 和 picker skin。尚无对外受控月或任务内容 API；规划没有将该选择器误称完整产品 CalendarMonth。
- src/ui/components/huhu/calendar/CalendarMonth.tsx:26–44、64–84、243–265、406：现有产品层 calendarRows、anchor、1–5 周窗口、PageUpDown 按 weeks×7、跨边界 onAnchor、period/day/hover/菜单、领域 weekOfYear。其当前自写日期/焦点部分正是需要迁移的实现，不是新增第二套算法的依据。
- src/modules/home/ui/calendar/HomeCalendarMonth.tsx:5–40：直接消费 CalendarMonth 与 calendarRows；用 periodic、images、byDay 组合状态。该文件和 CalendarPanel/Grids/Modal/DayPanel 均在 T-05 的 home/ui/calendar/** 中。外部 widgets/CalendarWidget.tsx:7–8 通过 CalendarPanel/modal 消费，props 保持义务明确，外部 Widget 归 T-08，不需要顺手扩 T-05 写集。
- src/modules/navigator/ui/Calendar.tsx:4–9、153–174、260：直接消费 CalendarMonth/TaskComposer，实际传入 weeks/weekNumbers、onAnchor/onSelect、note、hover、定位及任务创建动作。T-10 等待 T-05 冻结实际公共合同是源码依赖，不是假定写集交集；T-05 不新增 navigator/** 权限。
- src/shared/periodic-paths.ts:19、62–74 及 navigator/settings.ts:119–122：WeekStart 支持 0..6，calendarWeeks 为 1..6；Monday 的领域周号/周历年规则有既有定义，不能改用简单 locale 或 ISO 开关替换持久周期笔记路径。

**共享接缝最小且 owner 明确。** T-05 既有 calendar/** 足够容纳新增无业务薄基座和产品包装。date/Calendar.tsx 以内部 import 消费该基座无需扩大日期公开 index/props；该源和 Calendar.dom.test.tsx、T-03 fixture/** 明确由 Lead 串行承担。task/i18n.ts 原属 Lead；新增 shared/i18n/lazy/calendar.ts 和 home/i18n.ts 对应真实现有词典。main.js/styles.css 保持 Lead 统一生成。只读 api.ts/services、泛型 ui 不反向导入模块业务的边界不变；没有必要把生产者范围扩到 Navigator、Home renderer/services 或调度模型。

**依赖、所有权与门一致。** 独立解析 16 张票 frontmatter 并检查环：无环。T-10 的 blocked_by 新含 T-05，与 Map 执行表/DAG/真实冲突表、Goal Wave 与交接补充一致；Wave 是候选分组，不绕过同 Wave 内依赖。T-08 已直接依赖 T-05，仍排除 Home calendar 的实施责任；T-05→T-08 的写集交集串行，T-05→T-10 是 API 消费依赖。T-15 仍在 T-01–04 后、T-05 前，没有被新增反向边构成循环。

**现有事实与计划能力分开。** T-15 当前未实现，ticket/15-ui-skill-contract.md:47、57、112 已要求仅记真实导出，并将 DiffView 标为 T-16 的合同。Goal17 补充再次禁止虚构待交付导出；当前源码没有 CalendarBackend/DiffView 新导出，Map17 也未称已存在。技能可以要求先找真实可复用入口、缺口交回已指定生产者；不能提供指向未来文件的现成 import 示例。T-05/T-16 完成后若共享事实改变，仍走 T-15 漂移/绑定刷新机制。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: pass
Findings: []

**B 的职责拆分符合既定复用和设计。** 当前安装 @daypicker/react 10.0.2/MIT，scoped 入口公开重导出 react-day-picker；本次只读检查实际 DayPickerProps、Day/DayButton、Week、useDayPicker 声明与内部调用关系。薄基座可转发公开 vendor 组合能力，产品层拥有 anchor、period/task/preview 投影，picker 保持已验收值/props 与 skin；不会因复用要求把任务业务联合塞进 DateField。官方也要求 custom components 继续传递 ref、ARIA、tabIndex 和既有 handler，并优先组合默认 DayButton，支持本方案边界，而非另造焦点引擎。[公开组件组合](https://daypicker.dev/guides/custom-components)

month/onMonthChange 是真实公共端口；Week/Weeks 是真实公开组件槽，足以支撑后续产品窗口方案探索，但不是任意周条已经完成的证明。[受控月份](https://daypicker.dev/docs/navigation) 的单位仍是月；fixedWeeks 仅固定六周，numberOfMonths 是整月数量，不提供任意 1–5 周窗口。[月份与网格](https://daypicker.dev/docs/grid-and-months) 三项原始引用已保留在 reuse-decision 的采用段，本次也实际回读，版本约束以安装声明为准。

**规划就绪判断有明确边界。** 当前公开 slots、受控月份和产品包装范围提供了可执行的生产者接缝；无需在规划阶段预先实现完整 UI，亦无需重新问用户已批准的功能取舍。T-05:99 明确实现前固化 locale/lang/timeZone/defaults 的归属，:101 明确 Lead 提取后的原 T-03 回归，:103–105 明确未解周条和后票交接。可以作为后续实施合同，不等于当前允许跳过 T-04/T-15/G-CONTRACT 直接实施或完成 T-05。

特别核对而未消除的实施义务：056 私有 result.json 的 main/second 都记录 Jan31 ArrowRight 仍停在 **2027-01-31**，期望 **2027-02-01**；原源码和 calendar.dom.test 的 PageUpDown 周数步长有可回读控制。实际 vendor DayPicker.js 先调用内建 moveFocus，再调用 onDayKeyDown，默认 PageUp/Down 按月；不能写一个事后 preventDefault 就声称恢复周条语义。T-05 必须在公开组合端口内证明窗口推进与保留行为，不能忽略按键、复活旧 renderer 或复制完整 roving 引擎。Map17 正确把它记作该票待实现/待验收事项，未将其从合同删除。

窄卡/272 panel、320/200%、44 独立目标、领域周号/周期笔记、定位、hover/menu 可达性也仍明确属于 T-05；私有横滚 skin 不是新批准呈现。picker 的 280/312/44 与完整月/周产品布局分别验收。T-10 后续依冻结新 API 迁移，允许保留有效 functional props；没有要求永久保留旧 UI 兼容层。

**批准范围不漂移。** 16 张票、用户追加一张 UI Skill 票、独立 T-16/diffs.com 技术栈、DESIGN revision3/designDigest 与各 UI 票绑定保持一致。无新 scheduler/schema/Task 项目、priority、tags 或私有任务库；核心 time.ts 的 opt-in 严格 DST 仍保持原最小范围。README Outcome 仍 active，规划 Ready 与实施状态、正式验收分开，没有声称这些待实现产品能力通过。

### 实际验证

全部过程输出在 /tmp/huhu-review-plan17-calendar：

| 检查 | 结果 |
| --- | --- |
| 六文档 current/frozen 原字节 + 结束重验 | 通过；manifest 963a…1846；drift []；initial-/final-verification.json |
| python /tmp/huhu-review-plan17-calendar/check-plan.py | 退出 0；16 票、DAG 无环、T-05/T-10/T-08/T-15 精确边、Lead 接缝/无越权、批准绑定与数量控制通过；semantic-check.json |
| 26 个源码/声明上下文结束哈希 | 漂移 []；source-facts.json/final-verification.json |
| node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage tickets --repo /home/wta/projects/obsidian-huhu .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign | 退出 0；0 errors，1 条既定 conclusion-report 模式提示；tickets-validator.json |
| node .agents/speculo/workflows/specdev/common/tools/ticket-control.mjs --map .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/tickets-map.md --repo /home/wta/projects/obsidian-huhu | 退出 0；errors/validation_errors/diagnostics/invalidated 均 []；正常返回前置未满足与未分配 owner，不表示已授权执行；ticket-control.json |
| 059 dispatch 结构验证 | 退出 0；errors=[]/warnings=[]；不替代独立身份/语义判断 |
| 056 私有证明回读 | result SHA c132ef1facbe06999a92cbf1d9a084655ab5b2d421cdd5e848aced6624b21ad2，spike SHA e6b115add616b6cfc46b9b701abfafa3f3e1fa2250c957c792b1f15722b6f7fa，与不可变报告一致；12 正向记录、两 Document stripBoundary 红例均保留 |

本次未重新运行 056 小样，也没有运行旧 Calendar UI 测试/生产构建/全局 lint/native 矩阵。规划审查以实际源码、类型/调用、已有私有证明与只读计划校验作判断；解析器退出 0 不证明新产品交互已经实现。Root T-04 完整 66 是独立运行与验收责任，本报告不裁决其门禁，也不借其稳定性冒充 T-05 浏览器验收。

## 问题与下一步

本次六文档规划无待修 finding，已明确释放冻结。Lead 可继续原 DAG 与 G-CONTRACT，不由本报告启动实施。

后续实施必须保留上述红例、原 picker 回归、产品完整月份/周条/窄宽真实输入与像素验收、最终 API 与 T-10/T-08 交接。若公开端口实际无法满足已批准功能，应在 T-05 原入口报告具体失败并回到真实 owner 处理；不得以规划 pass、056 私有 exit0 或本文 DoR 判断冒充完成。
