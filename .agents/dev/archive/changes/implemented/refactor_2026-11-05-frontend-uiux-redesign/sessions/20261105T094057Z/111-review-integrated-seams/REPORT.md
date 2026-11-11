# 111 集成接缝独立窄复验

Session: 20261105T094057Z
Task: 111-review-integrated-seams
Status: completed

## 聚焦交接

Reviewer: native:/root/review_t12_budget；沿用既有sol high独立角色；Strategy independent；Risk high；Independence required；Mode native。未参与106/108/110或Root实际合入，103及089均为只读独立审查。本次没有委派、修复、66矩阵、用户vault/CLI/账号/clipboard或正式状态/资产/index操作；仓库唯一写入为本不可覆盖REPORT，过程仅在 /tmp/huhu-integrated-seams-high。

三个范围分别得到 standards: pass、specification: pass：106关闭103的T09两项P2；108实际六源生产者与110三源窄清理未发现新增实证finding。结论只限本次固定增量及其交接，不宣告T08/T10消费者、T09最终native或全项目完成。100项开始/结束字节和模式drift=[]；return校验通过后明确释放此100源review冻结。

Health理由已据真实源纠正：--nd-hit-size在共享base/scroll-area仍有消费者，本次只认证六处局部覆盖冗余与其余代码保持，不把它误称全局dead token，也不授权删除共享消费者。Root已接收此说明，原110 REPORT不覆盖。

## 产物与验证

### 固定输入、来源与有界复用

Review mode: source-files；不是HEAD diff。最新合并100项清单 /tmp/huhu-integrated-seams-final/manifest.json SHA256 cf2170d15b05306b9bba7af4aa9844708fd91a56f0a7268f10772dc906e201bd，实际源、模式与清单始末一致。validate-specdev --review-scope --mode source-files --file逐项100退出0；scope.json SHA256 33f452fc9f18be718655f415c162e401f8790bf4bc54e1b495db5c26e8c89359。私有review-input.json按scope/原文来源/实际reviewer/排除项冻结，Input-SHA256 b2bb98c4348849497bc924c6aad4bb48a4ebe468d3851091e17d5054f60d3454；sources.json SHA256 d768097bb15ebb8b8fbbb1d7bb8cac632f5624065b902d9207bbf78ca1a884bb。

- 106 REPORT SHA256 64991430c099245e59491180dfa159e22bd7daf10210ee31e3d3368d93ca2021；/tmp/huhu-t09-focused-pane-repair/candidate.json SHA256 fc9d522d13312f1f8edd651a2aa47b67afe66628de25ac4c1efbea5259b62856。真实baseline、repair.diff已回读，增量只有SessionInformation及相邻DOM两文件；完整91当前仍与106候选逐项一致。103未变完整来源/能力/字段/生命周期结论按原限制复用，两项finding由本次独立真实反例确认关闭。
- 108私有提案、base/candidate/manifest/proposal.patch已读。实际DateField、AutomationUiPort、module、core service四个生产源当前hash与私有after精确相等；两份新增测试当前属于Root格式化版本，实际编译出的JS与private候选逐字节相等。审的是Root真实源，不把私有36绿当作仓库验收。
- 110真实before目录、before/after.json、repair-only.patch与三源已回读；TaskEditor、vault-source、HealthPage真实before/after增量符合获批范围。只验证这三个窄改，不接管Task日历、TaskContent、T10新visibility或其它产品修改。

标准来源found：AGENTS、dev/ui及适用testing/settings-i18n/design-system/shell、实际tsconfig/lint/Vitest/共享组件、公共独立review/risk合同。规范来源found：111 TASK、106/108/110工件、Map40/Goal/Spec、T09及T08/T05/T11相关共享补充、DESIGN3/UI002批准摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。source-files无commit message/远程Issue发现记not-applicable；没有改设计来消除finding。105原T07/T16焦点审查未被本增量改写，保留原pass与native/iframe限制，不以它代替本次生产者审查。

影响分析沿三个真实链展开：waiting/provider→真实WorkspaceService/TerminalSession；父raw→DateField/DateInput/Calendar/validateDate及原DateTimeField；AutomationUiPort→module runtime.service→真实loaded/execution/recovery/definitions/schedule；Task autosave Effect、windowScheduler与Health共享Button/AlertDialog各自只核本窄改。T08消费者、Root其它fixture、T10修复及T07/T16产品代码为排除项。

### T09 — standards 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []；Input-SHA256如上。

103 S01关闭。SessionInformation.tsx:18–22从真实tab.sessionIds取得TerminalSession并用既有sessionState辨认waiting/permission，:33调用现有workspace.focusSession精确pane；不再用tab聚合state当作焦点身份。targetKey改用sessionId，同tab等待目标变化亦进入原pending/error隔离。背景attachManaged、expectedRuntimeId、alive/currentTarget和同步pending锁未变，无新launch、allow/deny或后台执行。

103 S02关闭。:60–68的provider与account/cwd/session字段都取当前focused pane metadata；shell使用已有agent.inbox.shell，而不是不存在的agent.shell。混合分屏同一Dialog内切回agent时，provider和sessionId同步变回Codex/原会话。详情仍用原DetailPane，不挂载TerminalView；终端实例/隐藏/owner源码未改。

独立原103 counter原样指向真实源复跑4/4，新增仓库相邻DOM5/5亦通过，含真实WorkspaceService.newAgent→splitPane与TerminalSession、单pane、shell/provider切回、waiting消失、底层focus目标及点击不新增launch。没有用fixture伪tab或mock focus调用取代原实证路径。

### T09 — specification 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []；Input-SHA256如上。

满足AC-081及T09/111的“对应终端”与真实当前会话字段要求，103两项最小解除条件达成。修复不改变UI002布局、主题、详情组合或域协议，没有恢复原型虚构model/tokens。原66通过发生于106之前，未被当作mixed pane已验收；本次只证明实际定位和信息身份，受影响native/最终同构建仍由Root安排。

### 共享生产者 — standards 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []；Input-SHA256如上。

DateField.tsx:13–17新增父拥有raw prop并明确配对onDraftChange。:39–59显示/校验/Enter/blur均读取draftValue，未提供prop时沿原localDraft/value/draftResetKey路径；父raw提供时semantic value变化不覆盖非法raw。新装载时raw与semantic不一致会进入touched验证；pick/clear经原回调更新raw和semantic，IME/disabled/readOnly、bounds、相同input DOM均保持。没有另造日期输入或codec，DateTimeField原未受控调用没有迁移义务。

新nextScheduled通过shared/automation/types.ts的可选公开AutomationUiPort，由automations/module.ts实际委托runtime?.service.nextScheduled()；不存在runtime返回undefined。service.ts:346–358真实检查loaded、definitionsReadable、loadError、executionEnabled、recoveryHold；只取既有definitions聚合/去重后本设备enabled定义，并复用nextOccurrence，取严格future最小值。null为已读且可执行但无future；undefined为门控/读取/计算不可用。不是UI自行猜scheduler或把空动作集当“无计划”。

refresh的:259–268成功/失败更新definitionsReadable并沿原subscribe emit，失败继续抛出，保留tick原失败语义；未修改tick/run/admission/cursors/schema。额外独立实际控制在load后固定Date.now=1000，真实method默认时钟返回earliest=2000、显式3000返回null；反复读取不改变state/cursors、storage.write次数或磁盘字节，也没有agent/notify admission副作用。真实UTC/NY fold、device、manual/once past-now-future、禁用/hold/shutdown/load及后续refresh失败/恢复均通过原新增及scheduler测试。

### 共享生产者 — specification 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []；Input-SHA256如上。

符合Map39/111授予的最小生产者协议：raw非法值跨重挂不丢，控件继续严格校验；只读排期区别none与unavailable，使用真实当前设备/调度时间，不推进cursor或写盘，不改实际执行/恢复事务。可选port表达host能力，不是旧版本兼容分支。T08消费者须在其范围正确配对draftValue/onDraftChange及区分null/undefined；本报告没有把该消费者宣告通过，也没有以private绿代Root实际合入。

### 110清理 — standards 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []；Input-SHA256如上。

TaskEditor.tsx:239仅为Effect无cleanup路径增加显式return undefined，deps、450ms、saveRef、cleanup皆不变。独立用真实before/after、tsx/es2021/minify/esm transform比较，JS逐字节相等；主配置noImplicitReturns检查实际通过，不修改测试或关闭规则。

vault-source.ts:45–49将原捕获idle.call(win,...)改为捕获requestIdleCallback?.bind(win)后调用，保持同一owner。独立VM实际before/after都验证idle receiver和timeout60、无idle fallback4ms、performance.now、later20及cancel同handle，均通过。没有改调度时限、queue或取消协议。

HealthPage仅移除六个局部[--nd-hit-size:44px]属性，独立逐字校验除此之外完全相同，实际min-h-11、h-auto、max-width/wrapping、控件/焦点/动作不变。纠正“无消费者”的全局假设：src/ui/styles/base.css:2/24–48和scroll-area.tsx仍读取该兼容变量；本六处是已有至少44高的文字Button/AlertDialog局部覆盖冗余，不是共享别名可删除的证据。34项Task/Health DOM通过；本次没有重新运行几何/命中矩阵，也不冒称共享token已全迁移。

### 110清理 — specification 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []；Input-SHA256如上。

符合Map40的三源无业务行为清理范围。Task日历/TaskContent未触及；Navigator只绑定原宿主方法；Health保留实际尺寸类与交互。编译/等价证据支持本窄范围通过，不扩大成对全共享legacy命名的删除授权。Root已确认后续T13按真实消费者成对迁移，原110报告历史不覆盖。

### 本次实际命令与结果

过程日志与临时配置均在 /tmp/huhu-integrated-seams-high。

1. pnpm exec vitest run --config /tmp/huhu-t09-high-review/counter.config.mts：退出0，原103反例4/4；t09-counters.log。使用原harness，不改原oracle。
2. pnpm exec vitest run --config /tmp/huhu-integrated-seams-high/tests.config.mts --project dom src/modules/agent/ui/workspace/SessionInformation.dom.test.tsx src/ui/components/huhu/date src/modules/task/ui/task-domain.dom.test.tsx src/modules/health/ui/HealthPage.real.dom.test.tsx：退出0，9文件73/73（T09 5、日期34、Task/Health34）；dom.log。临时配置沿原项目和setup，只把缓存放/tmp，真实源未overlay。
3. pnpm exec vitest run --config /tmp/huhu-integrated-seams-high/tests.config.mts --project unit src/modules/automations/core/next-scheduled.test.ts src/modules/automations/core/schedule/zoned-occurrences.test.ts：退出0，2文件7/7；schedule-unit.log。
4. pnpm exec vitest run --config /tmp/huhu-integrated-seams-high/port.config.mts：退出0，额外真实wallclock/IO/state/cursor只读控制1/1；port-controls.log。该私有控制直接new真实AutomationService，不mock nextScheduled/nextOccurrence。
5. pnpm exec tsc --noEmit --skipLibCheck：退出0，production-types.log。八个触及的生产TS/TSX文件ESLint --max-warnings 0：退出0、零警告，lint.log；未关闭规则或冒称test-types已全绿。
6. node /tmp/huhu-integrated-seams-high/check-equivalence.mjs：退出0，equivalence.log；独立重跑Task编译逐字、before/after scheduler receiver/60/4/now/later/cancel、Health仅六属性删除。输出只写本reviewer/tmp目录，未覆盖110原证据。
7. Root两份格式化新测试与private版本esbuild es2021/automatic JSX/minify编译输出均逐字相同，退出0，formatted-tests-equivalence.log。先尝试直接AST含parens/JSX文本形状相等会因格式化新增括号/换行而失败（126），该检查不具语义等价oracle意义；改用规范化编译输出证实，没有修改/放宽产品测试。
8. validate-specdev source-files固定100路径退出0；开始/结束原字节/模式drift=[]。106原91亦逐项一致，108四生产源与private after一致，两新测试如上仅格式化，110三源after一致。

Root真实automations完整170、architecture1403/i18n42词典5628与原105 native报告已回读作为仍适用上下文；没有伪称由本worker重新执行。没有重跑66、真实Obsidian/popout/PTY、全局build/main.js/styles.css/NOTICE、test-types全图或T08/T10消费者。已知test-types六条范围外诊断由Root/原owner处理，不在本次关闭或隐藏；生产tsc0不能替代该门。

## 问题与下一步

本次六个轴均pass、Findings=[]，103 S01/S02在固定106候选关闭。Root回读实际派遣/返回身份并return核验后可释放100源冻结，继续T08消费者/T10新接缝及受影响native/最终同构建；后续源码改变重新冻结并重验相关结论。正式Ticket/Goal/Evidence、产物与宿主验收仍归Root，未请求或执行提交、推送或发布。
