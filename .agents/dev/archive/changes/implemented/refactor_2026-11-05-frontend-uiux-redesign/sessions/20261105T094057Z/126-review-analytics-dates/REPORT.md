# 126 Analytics日期迁移独立窄复验

Session: 20261105T094057Z
Task: 126-review-analytics-dates
Status: completed

## 聚焦交接

Reviewer: native:/root/review_t07；sol high；Strategy independent；Risk high；Independence required；Mode native。未参与123私有候选或Root实际合入，无委派。仓库仅新建本不可覆盖REPORT，过程材料仅在 /tmp/126-review-analytics-dates；未改source、assets、state、Evidence、Git/index或真实数据。

**standards: pass；specification: pass；Findings: []。** 四源实际合入与123候选逐字节/模式相同，始末drift=[]；7只读生产者/算法/词典/registry上下文也保持。真实workspace 9/9 DOM、定向types和生产源lint通过。return校验后明确释放四源冻结；113其余Home结论及真实宿主/视觉限制仍适用，不宣告44状态已native通过。

## 产物与验证

### 输入与完整实际差异

按已解析workspace/catalog，复用本会话已读未变AGENTS、dev/ui、testing、独立review/risk合同；回读126 TASK、123 REPORT/ready/changes/完整patch、当前Map48、Goal/Spec/T08及DESIGN3/UI002批准设计（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）。标准来源为真实公共DateRangeField/date-value、原analytics.range与实际工具配置，规范来源为共享日期迁移/原行为保留/32表面合同；无PR/commit-message引用，source-files不以HEAD代替真实dirty before。

123 REPORT SHA256 62b6a4ea73ff702b397d737518691511451fefcbd94cc9609aadc6e64babe534；changes.json SHA256 1eec1e27e2dc6b67b247b4fb59efef33d2dba843c1edc39beea8d451d3a968e5；analytics-dates.patch SHA256 c06a3937a6580dc1815e009c7835629c9705ad2da70a6384ad429a77ca4c4179；context-manifest.json SHA256 325eae662d92e8077e5ef589c27e2d6b977bf182aa033b9a990a365e79fcf826。四项当前源、before/proposed副本、非symlink与mode逐项核验，3修改+1新增，均0664；未把作者私有镜像9绿记成本人运行。

四个冻结候选SHA256：

- src/ui/components/huhu/analytics/Analytics.tsx：31c2a39e7223331b2c2fa0936548be68fd729b06ac0625411afee138b385e5f3。
- src/ui/components/huhu/analytics/Analytics.dom.test.tsx：dd029a79a9638ce2f593f95bc2ddbf8bc233f73d799bf164fbe21a574c890022。
- scripts/ui-review/fixtures/frontend-redesign/T-08/index.tsx：824abd741b66ebff8109b8b45c0219fbea1eb3a1a7127aeca137da51cb32eb75。
- scripts/ui-review/fixtures/frontend-redesign/T-08/index.mjs：aa4bdfac1a280569db25232ff35372e18849da42798aaeab7f7e32700bdd6078。

完整真实before→after diff仅把两native date Input替换为公开DateRangeField、增加相邻9DOM与一个fixture状态/实际打开动作；useAnalyticsRange、analyticsRange/shiftAnalytics/inAnalyticsRange、其它Analytics exports均未改。七上下文也逐字节/模式核验；没有新算法、日期API或词典。113/104原Home字段能力/生命周期结论仅在未变范围复用，本次专查共享Analytics接入及fixture，不重审238未变源或代跑矩阵。

### standards 输出

Reviewer: native:/root/review_t07；Result: pass；Findings: []。

AnalyticsRangeControl真实调用公开DateRangeField，value映射state.custom.start/end→from/to，required交给原生产组件；只有两端完整非空的onChange才原子setCustom，clear的null/null不会把实际筛选改为无界。共享字段真实validateDate与rangeError阻止非法、倒序、缺任一端/两端皆空，Apply与Enter均门控；Cancel走共享reset(value)，不以旧合法值偷偷提交。原算法仍承担日期包含端点、previous跨度与month/week/all等period行为，无额外领域仓库或私有日期引擎。

实际workspace相邻9DOM不替换生产者：合法完整区间Apply前state不变、Apply后两端一起更新；包含端点筛选及前一等长区间正确。五组非法/倒序/required空值按Enter不提交，Cancel后重新打开恢复旧完整区间；clear不放开筛选。month previous/next、week/all选择沿原anchor计算，方向按钮在all/custom保持原控制。时钟固定只为确定断言，不mock范围算法。实际ExpenseStatsPanel/PomodoroStatsPanel仍消费同一hook/range作selected/previous过滤，未改真实记录、CSV或其它统计能力。

新增field aria-label复用analytics.custom，原analytics词典注册仍由真实Analytics入口执行；内部start/end/apply/cancel由共享日期组件既有词典承担。没有硬编码产品文案、新颜色或改变数据格式。

fixture增加的CustomAnalyticsRange实际挂生产useAnalyticsRange('custom','2020-01-01')与AnalyticsRangeControl，没有复制算法。新状态在原HuhuProviders/DesignScope与对应owner Document里渲染；driver对main/second按既有trusted CDP点击打开公开弹层，等待date-scroll-viewport后capture，并继续原nativeDates=0、nested=0、overflow=false断言。随后show下一状态会走原根重渲染卸载；未改其余driver语义。这里只审实际路径，没有声称新状态已在Chrome执行。

### specification 输出

Reviewer: native:/root/review_t07；Result: pass；Findings: []。

123剩余原生日期缺口由共享DateRangeField真实承接，符合Spec/T08的共享日期/成熟库复用要求；required空、倒序、非法、取消和clear不扩大过滤均有真实DOM控制。允许用户先编辑完整草稿再Apply，实际领域state仍只接收完整合法范围；原custom与previous/month/week/all方向语义保留，未改DESIGN或schema来绕过缺口。

实际比较旧/新states声明：去掉唯一新增analytics-custom后逐字节等于原声明，原11显式状态+32 registry=43全部保留，新12+32=44；widget-table摘要未变，32 registry真实分派原代码保留。新增44th为真实custom控制的补充，不替代18 widgets+14 sections。Root仍需执行新状态main/second及视口的实际视觉/native门；source/DOM与声明数量不证明像素、44px或真实Obsidian popout。

### 本人实际命令与限制

| 检查 | 实际结果 |
| --- | --- |
| validate-dispatch.mjs --task 126-review-analytics-dates --stage dispatch | 0，errors=[]/warnings=[] |
| 四源当前/before/proposed hash/mode与7只读上下文起止核验 | 0，start-audit.json/final-audit.json，drift=[] |
| pnpm exec vitest run --project dom src/ui/components/huhu/analytics/Analytics.dom.test.tsx --maxWorkers 2 | 0，真实workspace 1文件9/9，dom.log |
| pnpm exec tsc --noEmit --pretty false -p /tmp/126-review-analytics-dates/tsconfig-owned.json | 0，types.log；含当前Analytics、相邻DOM、T08 TSX fixture及其实际依赖/仓库声明，非全仓types |
| pnpm exec eslint src/ui/components/huhu/analytics/Analytics.tsx --max-warnings 0 | 0，lint-production.log，生产源零警告 |
| 原43声明逐字节保留/新增44/registry32核验 | 0，states.json |
| node --check scripts/ui-review/fixtures/frontend-redesign/T-08/index.mjs | 0，仅语法 |

第一次eslint同时传入新DOM测试时，测试被仓库既有ignore规则忽略产生1 warning，实际退出126；非产品诊断，未改规则。随后按生产源范围检查退出0，测试由DOM/types验证。123私有旧源nativeDates=2红灯与私有--check0只作已读作者材料，没有冒充本人运行。

未跑66/完整矩阵、浏览器、全仓测试/类型、插件构建、样式生成、真实Obsidian/native/用户vault；未写正式票据状态或Evidence。Root其它源码/产物不在本轮冻结。shared DateRangeField原语未变，不重复它的全部生产者/宿主套件。

## 问题与下一步

本窄复验无待修finding。Root可继续新增analytics-custom的最终实际浏览器/宿主验收及全仓收口，保持本次source/DOM与native证据边界。本REPORT不可覆盖；return通过后四项源码冻结明确释放，停止本审查写入，不推进Gate。
