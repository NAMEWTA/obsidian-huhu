# 任务回报

Session: 20261105T094057Z
Task: 018-preflight-t03
Status: completed

## 聚焦交接

只读预检完成；T-02 未关闭，因此没有实施 T-03、安装依赖或写源码。DayPicker10.0.2 的 scoped 包、locale、TZDate 与核心props已用官方registry发布包声明核实。推荐共享层只拥有结构化日历/墙上时间输入，领域转换留在消费者；现有领域对重复DST时间静默选择较早时刻，与DESIGN要求有实际差距，必须由原owner明确修复/验收归属。实现前还需补词典写集、触控日历窄宽处置和领域验收权限。

## 产物与验证

### 本地事实与范围

已读018 TASK、T-03、Spec AC021–023、DESIGN5/7、reuse-decision日期决定、map/goal-plan相关依赖，以及沿用已读AGENTS/workspace/catalog、dev/ui、测试/架构规则；另核对研究复用合同、许可与设置/i18n规则。src/ui/components/huhu/date/ 当前不存在。读取现有Popover、HuhuProviders/ContainerProviders/Portal生命周期、Input/Select相关接口，以及TaskEditor、SchedulePicker与日期/时区消费者；没有执行测试、build或生成器。

### 包与API核实（2026-11-05）

通过HTTPS读取 https://registry.npmjs.org/@daypicker%2freact/latest 与 https://registry.npmjs.org/react-day-picker/10.0.2 ，仅将JSON与官方tarball解包到 /tmp/huhu-t03-preflight；没有安装或修改node_modules。两包version10.0.2、MIT、Node>=18、React及@types/react peer>=16.8；scoped包依赖react-day-picker10.0.2，后者依赖date-fns^4.1.0、@date-fns/tz^1.4.1。两registry响应gitHead均为1bfd4f0776d66f2242b6b32a1f084ab94e2702da；本地原始JSON保留dist.integrity，未执行tarball源码。

可直接声明的导入（已核对发布d.ts及exports）：
- @daypicker/react：DayPicker、TZDate、DateRange（类型）、DayPickerProps（类型）、getDefaultClassNames；scoped index原文re-export react-day-picker，其implementation index显式export TZDate。
- @daypicker/react/locale/zh-CN 的 zhCN、/locale/en-US 的 enUS，或 /locale 中的具名导出。采用子路径便于限制locale闭包。无需直接导入未声明的date-fns或@date-fns/tz。
- 原生mode="single" / mode="range"，selected、onSelect；可选single回调为Date|undefined，range为DateRange|undefined，DateRange.from为Date|undefined、to为可选Date。共享边界统一映射undefined到null，不能将库类型直接暴露成持久合同。
- locale类型Partial<DayPickerLocale>；weekStartsOn为0|1|2|3|4|5|6|undefined。包装层同名可选prop，读取useLanguage选择enUS/zhCN；周起始由消费者将现有设置解析后传入，不让ui导入navigator。现有navigator.calendarWeekStart有auto/monday/sunday/saturday，不能只支持0/1。
- timeZone为string，TZDate可按指定zone显示，noonSafe为experimental；不要把TZDate当成reject/explicit DST消歧API。DayPicker还允许UTC offset，HUHU DateTime合同仍只接收经Intl验证的IANAZone（包含UTC），不扩大为任意offset字符串。
- classNames使用v10 root/months/month_caption/month_grid/day/day_button/button_previous/button_next等现行键；不存在的v8/9别名不复制。直接通过classNames与--hu tokens布局，避免全局导入未隔离的包CSS。若最终需要作者CSS，先补src/styles.json/source写集。

官方文档依据：preferred scoped包与旧键移除见 https://daypicker.dev/upgrading ；时间控件需组合现有输入且DST有跳过/重复风险见 https://daypicker.dev/guides/timepicker 。从实际文档导航找到 https://daypicker.dev/localization/setting-time-zone ，确认timeZone/TZDate，而不是沿用空的旧/docs/time-zone页；locale与weekStartsOn见 https://daypicker.dev/localization/changing-locale 。文档只支持组件/API选择，不证明本仓库已集成。

### 建议文件与公共合同（候选，待Lead派单）

在已允许date/**下新增 date-value.ts / date-value.test.ts、DateField.tsx / DateField.dom.test.tsx、DateRangeField.tsx / DateRangeField.dom.test.tsx、DateTimeField.tsx / DateTimeField.dom.test.tsx；可抽 Calendar.tsx 为该族唯一内部DayPicker适配，不新增全局日期引擎。fixture只写既定T-03目录。保持消费者T-05–T-12后续迁移，不在本票扫改21处原生日期输入。

建议共用props：id/name/accessible label、value/onChange、min/max CalendarDate、required/readOnly/disabled、外部error与aria-describedby、locale由useLanguage默认选择、weekStartsOn可覆盖。Date=`CalendarDate|null`，Range=`{from:CalendarDate|null,to:CalendarDate|null}`（clear为两端null，不是另增顶层null），DateTime=`{date:CalendarDate,time:HH:mm,timeZone:string}|null`。DateTime空值创建时需调用方提供明确初始IANA时区，不能猜浏览器区；已有值保留它的timeZone，改时区是墙上时间值变更，不在共享组件隐式改epoch。

- date-value纯函数严格检查四位年/月/日、闰年与月天数，HH:mm检查00–23/00–59；不要用new Date(raw)接受滚动日期，不做UTC字符串往返。日历适配用年/月/日分量的本地或TZDate noon与对应getFullYear/getMonth/getDate返回分量，避免toISOString跨日；避免new Date(year,..)对0–99年的特殊映射。min/max按已验证ISO串比较；输入非法保留原草稿、只报错不调用onChange，blur/Enter提交合法值，IME Enter不得提交。
- DateField单一文本输入+日历触发+独立clear，弹层Today/Clear；清空输出null；required空值报错；readOnly/disabled都不允许日历/clear绕过。不要用DayPicker required选择语义替代文本必填校验。
- Range打开时复制committed值到draft；日历、起止文本、Today/未来7天/本月/过去30天都仅改draft。Apply校验后一次onChange；Cancel/Esc/外点丢弃draft；不交换逆序手输。建议包含今天的未来7天=today..today+6、过去30天=today-29..today，作为实现前需记录的明确含端点语义。合同允许null端点，除required外不要自行禁止开区间。外部value在打开期间变化需同步/重置draft，不能Apply覆盖新committed值。
- 复用现有Popover/PopoverTrigger/PopoverContent、Input/Select/Button。Popover已消费PortalContainerContext、FloatingLayer与IME Escape隔离；组件必须在HuhuProviders/ContainerProviders下，不创建body portal。通过ref元素ownerDocument与provider一致性测试跨窗口；关闭日期popover后父Dialog仍开且焦点回触发，迁移/卸载释放Portal lease沿现有provider。

### DST领域边界与缺口

TaskEditor当前将reminder墙上字符串交../core/time.wallTime，automations相关代码有resolveWallTime。task/core/time.ts wallTime明确gap拒绝、fold取candidates[0]；task/services/service.test.ts现有回归锁定2026-03-08 02:30 America/New_York拒绝、2026-11-01 01:30→05:30Z。automations/core/schedule/zoned-occurrences.ts resolveWallTime同样取Math.min候选。DESIGN7要求不存在/重复时间“领域拒绝或显式消歧”，因此不能声称现有转换已符合新交互合同。

推荐保持结构化值，DateTime提供调用方的同步validateValue(value)回调，返回稳定错误code（invalid-zone/nonexistent-time/ambiguous-time）或null；共享组件只显示关联错误并阻止非法提交，onChange不输出epoch。模块适配层负责候选检查与实际epoch转换。明确比较：将TZDate组装结果直接getTime最省代码，但会静默纠正/消歧且越过领域归属，不采用；把task时区算法复制到ui或ui导入module也不采用。这里不是已发现一个可直接解决fold的库API，不能让validateValue mock“通过”充当真实领域证据。

当前T-03写集不含模块domain/UI adapter/tests，因此要么Lead补充精确的consumer-owned adapter及测试权限，要么把现有领域的候选/拒绝能力交T-05(task)/T-07(automations)实现，并在T-03 evidence明确拆开“组件参数化验收”与“领域DST集成待验收”。推荐默认拒绝ambiguous与nonexistent，保持已批准三字段值结构；显式earlier/later若要写入值，需先由原规格owner确认，不悄悄添加disambiguation字段或改持久schema。

### 缺少权限与验证门

- shared/i18n/lazy/ui.ts未列入T-03 shared_paths，而日期错误、今天/清除、预设/应用/取消、小时/分钟/时区等新文案必须en/zh。需Lead承担/补登记该唯一词典，不在date目录造另一个词典或硬编码。
- package.json/pnpm-lock.yaml/THIRD-PARTY-NOTICES.md/main.js/styles.css已属Lead；未来由Lead安装精确@daypicker/react10.0.2、重建notices/build/bundle，不能在worker安装。按真实依赖分发登记两层MIT及transitives；不复制recipe时无需虚构新的NOTICE改编条目。
- scripts/verify-architecture.mjs的uiPackages尚未含@daypicker/react；当前未知包默认放行，新增包宜由Lead评估补UI依赖守卫，防止误入core/services。启动闭包仍靠实际bundle/architecture验证，不因这张Set缺项宣称失败或通过。
- 触控日期格存在需明确的尺寸冲突：DESIGN日历280宽/日格34与通用coarse>=44无法在7列280宽同时成立；390视口可考虑touch日历至少308加内边距，320视口内净宽更小。需Lead/原设计owner确定窄触控布局，不能将34px格当44px命中区。该问题不授权本预检修改DESIGN。

建议验收：date-value表驱动非法日期/闰日/minmax/时间/null；真实DayPicker single/range keyboard、草稿Enter/blur/IME、required/readOnly/disabled/error-describedby、取消不提交、逆序不交换、preset边界、外部受控更新、zh/en及周起始0/1/6；Asia/Shanghai/UTC/America/New_York日历分量不跨日。DST domain适配按上文准确owner补NY gap/fold与Shanghai/UTC真实转换测试。双Document+Dialog内Popover/Escape/焦点回归、窗口迁移卸载；DOM不用mock日历/Popover。Lead统一fixture desktop/narrow/touch/200%/明暗+reduced motion及真实Obsidian弹窗验收。原命令定向unit/dom、test:i18n、test:architecture，Lead执行build/check:notices/check:bundle与runner实际支持的T-03矩阵；本预检未执行、未声称通过。

## 问题与下一步

T-02依赖关闭后才派T-03实现。Lead先确认词典写集、真实DST领域验收归属和触控日历窄宽方案；其余组件/API/值转换接口已能形成具体派单。所有研究文件只在/tmp/huhu-t03-preflight，本次唯一仓库写入为本不可变REPORT；没有源码、依赖、资产、Git、正式状态或测试产物写入。收到单独实现任务前停止。
