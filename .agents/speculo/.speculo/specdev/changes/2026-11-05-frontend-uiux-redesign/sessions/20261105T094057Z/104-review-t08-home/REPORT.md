# 任务回报

Session: 20261105T094057Z
Task: 104-review-t08-home
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_t07（本轮 104，sol high 审查角色）；未参与 native:/root/implement_t08 的 098 实现或任何修复，未委派。**standards：request-changes；specification：request-changes。** 标准轴确认两类 P2：失败布局保存之后的 Cancel 未取消真实待写 geometry；日期迁移的 raw 草稿在提交/切历/隐藏边界失守。规范轴另有问候摘要缺失。下面按两轴原样报告，不合并排名。

**明确释放 098 全部 249 候选源/测试/fixture 与本次 16 项只读上下文冻结。** 末次字节/模式与路径集合审计 drift=[]、未列入的自有新文件=[]、缺失自有文件=[]，两项声明删除仍不存在。仓库仅新写本不可覆盖 REPORT；没有 source、config、CSS、assets、state、Evidence、Git/index 或用户数据写入。过程仅在 /tmp/huhu-t08-high-review；本报告不是 T08/Ticket/Gate 或视觉/真实宿主通过证书。

## 产物与验证

### 固定输入、实际范围与来源

Review mode: working-tree；Strategy: independent；Risk: high；Independence: required；Mode: native。真实派遣为 104 TASK 与 Lead 消息；Lead 应回读工具事实核对身份/返回，dispatch 结构校验本身不认证独立性。作者 098 REPORT SHA256=1ec6fa84dd61639f88060da1df056d8300eeb4c9c63d518e1d822f25c51005dd、候选 manifest 原文 SHA256=0134504ea061075a9b15da8dc010b2c23cd4875e959c85754a8a05f52d7d30ef，与 TASK 一致。

逐字核验 /tmp/huhu-t08-implementation/baseline.json 的 246 项真实 dirty baseline 副本及其模式；逐字核验 manifest.json 的 249 项 candidate 副本、当前源码及模式。重建完整原始 baseline→candidate 差异，**115 项=108 修改+5 新增+2 删除**；没有只审最后修改、用 HEAD 冒充 dirty 起点或遗漏未跟踪新源。日历生产者/analytics 未变项也在输入核对，calendar 写集 drift=[]。完整原始差异 /tmp/huhu-t08-high-review/complete.diff SHA256=246e0d440d38d22b26e1127d97e12c76f63f79b581d121a8d9703560fdca1e99；源清单 canonical 输入摘要=598fa817497455f5fb663433d7ad558f2cb9a1c8cb031e7a832bbec1624b370e。

16 项只读上下文（context-manifest.json/context 副本）包括 Home API/BoardStore/SyncEngine、host/services、widget-table/schema/grid、Root home/ui/i18n、共享日期/日历/TaskContent/Task API/Dialog/providers，摘要=80f3236921c119a480c159e7879bc145bcc547d5ef1b14b4125a356edca2a284。Root 的 8 对纯 UI 词条及注册是明示共享输入，不伪记为 098 作者新字典。未冻结并行 T07/T09/T10/T16 或 Root 最终 CSS/main.js/styles.css。

标准发现：AGENTS、dev/ui 与适用的测试、设置/i18n、宿主 API、共享 review/risk/error/test-reliability 合同；本上下文已读且未变的规则复用，dev/ui 哈希仍为 0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744 / 12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4。现有 CLAUDE 仅转引 AGENTS；没有独立 CONTRIBUTING/CODING_STANDARDS。实际工具标准沿 vitest.config.ts、eslint.config.mts、生产 tsconfig 与脚本入口。

规范发现：本地明确 working-tree 派遣，无 PR/commit-message 引用分支；读取 Map38/Goal/Spec/T08、DESIGN3/UI-002/批准快照、frontend-coverage 和真实 registry/schema，主要原文哈希留 authority-manifest.json。批准 designDigest=49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，未修改或换基线。既有 T05 Calendar/TaskContent 原语证据只在 API/字节未变范围复用，真实 Home 消费另查，不把共享票通过自动套成 Home 通过。

审查从实际 DashboardPage→ThemeBridge→BoardCanvas→TileFrame/Section 出发，检查原/新完整 diff、两个删除源原行为、registry 与配置调用方、真实 Store/SyncEngine 及失败恢复。临时 semantic.diff 只是辅助过滤大量格式/className 差异，未替代完整原始差异、运行反例或设计检查。

### standards 输出

Reviewer: native:/root/review_t07
Result: request-changes

**S01 · P2：Done 写入失败后，Cancel changes 仍会把取消的布局写到磁盘。**

位置：src/modules/home/ui/canvas/BoardCanvas.tsx:118–131、400–404；只读根因接缝 src/modules/home/platform/board/sync.ts:1192–1205。

finishEditing 调用真实 setBoardGrid 时，SyncEngine 会先把 geometry 放入内存，再 await writeToDisk。失败后 draftGrid 被保留且错误可见，但 Cancel 只清本地 draftGrid/编辑标记和 stackOrder；没有恢复 engine 中已接收、仍待落盘的 geometry。后续 flush/切板/关闭/其他写入可以把用户已经取消的布局持久化。

实际反例 /tmp/huhu-t08-high-review/layout-counter.dom.test.tsx：真实 DashboardPage+BoardStore+SyncEngine+memoryVault，原 widget h=6；编辑为 h=7，拒绝 adapter.write；确认错误可见且磁盘仍 h=6；恢复 I/O，点击实际 Cancel changes，再调用真实 flush。**内存和磁盘都变成 h=7，两个 h=6 期望均失败。** 不是 mock Promise 或只观察按钮关闭。原完整 DOM 套件中的无失败 Cancel、成功 Done、失败后 Done 再试控制均通过，缺口精确在失败后的 Cancel。

依据：取消必须有真实语义，不能因异常已经被捕获而假定内存回滚；DESIGN §7 保存/失败恢复、T08 编辑完成/取消合同。最低满足条件：失败后的 Cancel 应恢复真正的本次编辑基线并处理 engine 待写状态，或在无法安全取消时保留明确待恢复状态；不能仅清 React draft 或把 Cancel 当成功。验证本反例与原 Done/Cancel/失败重试控制，避免覆盖编辑期间独立内容改动或改变领域格式。此审查未修源码。

**S02 · P2：新 DateField 的未提交 raw 草稿没有贯穿调用方提交与生命周期。**

这是同一类 caller-owned raw 门控缺口的三个已证实入口，不把正常日期 codec 或成熟日期库归罪为缺陷：

1. **纪念日切历复活旧日期**：src/modules/home/ui/widgets/AnniversaryEditor.tsx:114–116、133–143。太阳历 raw 只改 valid，合法 draft.startDate 保留；切换 calendar 却重新从该旧 startDate 计算 valid 并卸载 DateField。真实 Select+生产 lunar lookup：原 2020-01-01T12:34:56.120+08:00，手输 2020-02-30 后 Save 禁用；切农历再 Save，实际 onSave 收到原时间串且 calendar=lunar，非法草稿被静默丢弃。原被删除的 AnniversaryDateEditor 曾明确拒绝从非法日期切历，这个恢复保证没有被等价承接。有效日期切历配对控制通过。
2. **流程卡直接保存绕过日期错误**：src/modules/home/ui/sections/P1Controls.tsx:80–94 只传 DateField.onChange；src/modules/home/ui/pipeline/PipelineCard.tsx:241–246 的自有 Save 不走 DashboardDialog.save。原 due=2030-01-01，手输并 blur 2030-02-30 后点击实际 Save，仍调用 port.setDue(...,'2030-01-01',...)；可见错误不能阻止旧日期提交。生产 PipelineCard/真实共享字段与按钮的私有 counter 验证调用边界；这里 port 是观察 UI 的 stub，未谎称真实 vault 已写。有效 due 配对控制通过。DashboardDialog 中新增的 aria-invalid 查询不能保护这个实际旁路。
3. **倒计时隐藏丢 raw**：src/modules/home/ui/dialogs/DashboardDialog.tsx:93–121 的 visible 关闭会卸载字段；LocalDateTimeField/CountdownEditor 没有在其上层保留原始日期文本。原目标2030-01-01T09:30，手输2030-02-30→hide/show 后显示恢复为2030-01-01；原无效 raw 丢失，Save 仍禁用（不能将这个控制夸称为直接旧值保存）。用户看到合法旧值却不能保存，必须再次编辑才能恢复。

原始有效红灯及控制分别在 counters.log、date-controls.log；私有测试是生产输入/branch/VisibilityContext，不复制 parser。上述 raw 失败来自新增日期迁移/被删除旧防护，与合法日期、纯 civil 值、秒/offset 保留和农历库转换本身不同。

最低满足条件：每个实际保存入口都知道 raw 未完成/无效状态；切换表示、隐藏或重显不能清掉这份草稿或以旧合法值重新放行。复用现有 DateField/日期值校验和原农历转换，不造第二日期引擎；为 Anniversary、Pipeline 及隐藏 Countdown 保留实际反例，核对其他同 wrapper 的提交旁路。保留正常切历、纯日、原时间精度/offset 和取消行为。

其余标准观察：布局继续用 react-grid-layout/resizable 与原 dnd-kit，不增加私有 grid/focus 引擎；BoardStore.view(generation) 与既有开关板/删除/迟到 create 的隔离继续成立。setBoardGrid 后显式 flush 修复了已知同 patch 早返回时 Done 的伪成功，但不足以关闭 S01。配置原生 Modal 的三个新 React 表单现能 await 保存失败并保留输入，editInstance 失败后重试释放 pending，未改 schema/API/尺寸。

Dataview 隐藏时停止 load 并失效 epoch；相册轮播受 visible 管理；media 隐藏解绑内容订阅；原 weather/clock owner/暂停机制沿用。动态用户背景值、custom foreground、Album ratio/focal 与所有原记录服务/持久格式未发现本轮另一个有实证的删除/改写。Fowler 启发式未产生额外有实际风险的风格 finding。

### specification 输出

Reviewer: native:/root/review_t07
Result: request-changes

**V01 · P2：编辑取消/失败恢复保证未满足。** S01 的真实 Store/IO 反例证明 Cancel changes 仍落盘取消值，违反 T08 编辑 Done/Cancel 及 DESIGN §7 保存/失败恢复。原 59 个最终控制仅覆盖“无失败取消”和“失败后完成重试”，不能认证“失败后取消”。满足条件同 S01。

**V02 · P2：日期 raw 草稿与原字段恢复保证未满足。** S02 的两个旧合法值提交反例及隐藏丢 raw 反例，分别违反 Spec 日期族非法值保留/不提交旧有效值、T08 全字段/取消与草稿保护、UI 的隐藏保留要求。实际 Home 消费必须承担这些组合边界，不能用共享日期原语通过或无效时间校验函数测试替代。满足条件同 S02；不得通过删除反例、只检查显示错误或修改设计绕过。

**V03 · P2：批准的首页问候区缺少上下文摘要。**

位置：src/modules/home/ui/canvas/BoardCanvas.tsx:440–455。DESIGN §6 home 明确要求问候标题下方显示“逾期、会话、下一个自动化”一行，UI-002 为同一批准组合。候选只渲染当前日期与 morning/afternoon/evening 文本，随后直接结束 greeting section；无任何任务/会话/自动化摘要消费、缺失依赖状态或动作。该遗漏不依赖像素采样即可确认，不能因 data-home-greeting 存在就判问候区完整。

最低满足条件：按现有真实公共服务/端口提供这行摘要及相应缺失/空状态，并保持 Home 数据归属；若真实生产者缺能力，向原 owner 明确缺口及最小端口，不虚构统计/未来自动化、不默默删掉设计要求。这里只报告确定的内容遗漏；衬线28px、实际字号/密度与像素效果仍交 Root 真实视觉验收，不拿 className 推导实测通过。

完整 registry/能力审计（不以 coverage 数量替代字段追踪）：

- 实际 widget-table.ts 为18 widgets+14 sections。coverage 使用 sectionType（memo/...），真实表的 key 为 section-memo/...；按实际 spec.section 正确映射后 missing=[]/extra=[]，registry.log。TileFrame/WIDGET_COMPONENTS/Section 的实际分派均存在；尺寸/默认档位/多实例仍由只读 registry/schema 决定。
- 时间/外观：clock 时区/格式/天气；lunar/年进度；Countdown label/target/display/reminder/background；Anniversary 公历/农历/闰月/年份/precision/annualReminder/原秒小数offset；Album folder/recursive/interval/transition/heightRatio 与原 ratio/focal。删除的两项旧编辑源有真实替代，原日期切历防护的缺失按 S02 保留，不把删除本身当通过。
- 记录/输入：收件箱 InboxSection 仍从真实 huhu/inbox 内容读写并有 CaptureComposer/今日记录、创建/打开/删除确认/失败重试；没有跳转系统通知冒充内容处理。便笺/卡片/项目目录与文档、习惯/补录/热力、记账/类别/备注/补录/统计CSV、阅读搜索/书目/计时/进度/完成、番茄状态/活动/标签/统计、快捷动作与技能选择/提示词/运行仍沿原入口。
- 资料/查询/流程/媒体：library/folder 的来源/包含排除/属性/多视图/排序/日期范围/分页/新建；Dataview 查询/刷新/分页/月历/热力/错误；PM 字段/根目录/阶段/任务里程碑/关联/归档；pipeline 阶段/技能scope/移动/截止日期（其非法 raw 提交见 S02）；RSS feed/OPML/读/藏/保存/错误；images/videos 目录/标签/分组/排序/分页/预览/失败/删除确认；全设置与 AppearanceStudio/背景配置保留。没有借用相同虚构字段替换这些表面。
- AC-071 的成熟网格/编辑手柄/统一标题菜单/空板添加及默认布局均有实际入口；TaskList 真实消费共享 TaskContent，metadata 保持独立，TasksWidget 仍挂载真实 TaskViews；CalendarWidget/section-calendar 真实消费未改 T05 日历。DateRangeCalendar 删除私有42格，转共享 DateRangeField；查询月历转 ProductCalendar，没有复制成熟库。
- 主题 --board-* 改为 HU 派生、旧 immersive 控件覆盖删除、源许可/署名保留；新增词条 en/zh 随真实入口注册。DOM/静态 source 不能证明32表面全部像素、字体、44命中/焦点/长文案/缩放/native 已通过；这些仍待 Root。

### 实际命令、反例与限制

| 检查 | 实际结果/原始材料 |
| --- | --- |
| baseline246/candidate249/115完整差异及模式核验 | 退出0；start-audit.json、diff-summary.json、final-audit.json；drift=[]，未据此声称整个工作区 clean |
| pnpm exec vitest run --project dom src/modules/home --maxWorkers 2 | 退出0；38文件257测试；dom.log；包含作者最终真实失败重试/取消控制 |
| pnpm exec vitest run --project unit src/modules/home --maxWorkers 2 | 退出0；61文件196测试；unit.log |
| 私有 vitest config：layout-counter.dom.test.tsx + date-counter.dom.test.tsx | 实际退出126；2测试/2目标失败，counters.log；真实布局失败后取消与 Countdown 隐藏raw，非 setup/timeout 失败 |
| 同 config：anniversary-counter.dom.test.tsx + pipeline-counter.dom.test.tsx | 实际退出126；4测试，正常控制2通过/非法raw2目标失败；date-controls.log。初始单反例日志也保留，不算额外生产测试 |
| pnpm exec eslint src/modules/home/ui --max-warnings 0 | 退出0，零警告；lint.log |
| pnpm exec tsc --noEmit --skipLibCheck --pretty false | 实际退出126；唯一 src/modules/task/ui/TaskEditor.tsx:232 TS7030；types.log。Home 无诊断，不宣称全仓类型通过 |
| 实际 registry→coverage 归一映射 | 退出0，18/14、missing=[]/extra=[]；registry.log，首次直接拿 section key 对 sectionType 的比较曾不匹配，已按真实结构纠正，不当产品缺失 |
| node --check scripts/ui-review/fixtures/frontend-redesign/T-08/index.mjs | 退出0；仅语法，不是浏览器case |
| validate-dispatch.mjs --stage dispatch（当前104） | 退出0，errors=[]/warnings=[]；结构校验不替代实际审查/独立性 |

图外债单独保留：TaskEditor232 TS7030 与当前 Home 源无归因，不改冻结 T05 生产者来换绿。098 作者历史 golden 日志的准确失败入口是 test/golden/user-formats.test.ts:41，测试名“named appearances persist only global theme and Home decoration”，比较 appearance-settings 样本；并非单独 appearance-settings.test.ts。该样本/对应 core 不在本轮写集，本 reviewer 未重跑或更新黄金样本，作者既有失败事实不改成通过。

未 build main.js/styles.css、未运行 runner --check 或完整矩阵/66（作者真实 --check0仅作为已读预检），未操作浏览器/真实 Obsidian、用户 vault、账号/网络/CLI/音频/剪贴板。fixture 已阅读：32表面真实生产 DashboardPage/BoardStore/SyncEngine、record service 与 TaskService/Calendar 组合；配置 Save 的模拟回调只证明呈现/注入失败，不能冒充真实配置持久化。主/第二Document 是 iframe 协议，不等于 Obsidian popout。Root 继续持有全部资产、视觉和真实宿主门。

## 问题与下一步

Lead 可对 S01/V01、S02/V02 和 V03 分别窄修真实取消、日期raw生命周期/提交边界及缺失摘要，再冻结受影响输入独立复审。不要扩大为 BoardStore/schema/调度重构，也不需要重复审未变 T05 原语；保留本次私有有效反例与已有正常控制。

所有249+16项审查输入现已明确释放，098及本REPORT保持不可覆盖；Root可继续独立CSS/矩阵/宿主和图外债收口。两轴当前均 request-changes；未推进正式状态、Evidence或任何Gate。
