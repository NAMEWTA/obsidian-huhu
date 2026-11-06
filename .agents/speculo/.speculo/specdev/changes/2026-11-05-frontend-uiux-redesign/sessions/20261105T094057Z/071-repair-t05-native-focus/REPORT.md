# T05 原生焦点与宿主夹具修复候选

Session: 20261105T094057Z
Task: 071-repair-t05-native-focus
Status: completed

## 聚焦交接

按071执行，交付窄修复候选并冻结；未宣布T05、原生矩阵或独立审查通过。066 REPORT及原始失败材料保持不变。实现仍为gpt-6.1-sol / medium，无委派、浏览器、共享源码/资产/词典、安装、Git/index或正式状态写入。

基线为066最终43源及Root R3实际反例。仅3个文件变化：ProductCalendar.tsx、T05 fixture index.mjs/index.tsx。TaskRow.tsx保持原字节，因条件性触控问题尚无实际原生几何结论，未基于猜测重排动作。无新增文件或删除；完整43源SHA/模式与精确增量在 /tmp/huhu-t05-native-repair/final-candidate.json，071前原文件备份及4路径SHA在 /tmp/huhu-t05-native-repair/before/ 和 before.json。

最终SHA：

- src/ui/components/huhu/calendar/ProductCalendar.tsx：87e0e8900d75182aa6e55bb24d04c5e66736a540dc114743f1181b775036df7b
- scripts/ui-review/fixtures/frontend-redesign/T-05/index.mjs：25ba9a0782913a9aca2dbc659bc6ca83042380e08934fa1fb0f6e4577738b5da
- scripts/ui-review/fixtures/frontend-redesign/T-05/index.tsx：7317bbafa7e5e5cf0b39d6bbab7f72602d7ab474defc3e372785ce3acc9258b4

## 产物与验证

### 产品焦点轴

Root R3实际反例 /tmp/huhu-t05-lead-diagnostic390/result.json：真实日期2027-02-07按钮44×44、selected=true、背景色正确，但outline为3px，要求2px；offset已经2px。ProductCalendar原生DayButton和前后导航按钮现在显式使用与canonical Button相同的outline-none、focus-visible:outline-2、focus-visible:outline-offset-2、focus-visible:outline-[var(--hu-accent)]。只修日期本地皮肤，不改DayPicker refs/键盘/状态、HU全局CSS或另建焦点引擎；选择和today后代皮肤修复保留。

### 宿主几何轴

同一R3真实诊断innerWidth320/clientWidth305/bodywidth305；bodypadding4造成actual data-huhu-leaf x4/width297。该长specimen页面的外层15px滚动条与padding不能证明目标真实320宿主。fixture改bodypadding0，html scrollbar-width:none仅隐藏这个原生外栏；页面仍用浏览器原生scrollIntoView、wheel和键盘滚动，没有新增滚动引擎、overflow裁切、强制叶宽或扩大viewport。

原有312 popup、4px边界、七列44、精确色相等、2/+2、点位、原生日期导航断言全部保留；新增innerWidth=320、clientWidth=320、真实逻辑owner leaf rect.width=320的严格等式。临时期望色探针继续置于实际按钮父节点的HU作用域，不恢复body取色。新的geometry全量JSON用于失败定位，不把布局修正自身当产品通过。

### 两动作轴

真实CalendarAgenda现在同时传onRemind和onOpenSource；Reminder记录真实动作并调用现有editTask打开实际TaskEditor，source保留实际宿主端口记录。未隐藏按钮或假造UI。新增原生协议先读实际TaskRow两个按钮及其::before目标矩形：每个至少44×44、CSS重叠面积严格0。再通过真实Tab/ShiftTab安排self/neighbor焦点，在两个动作上分别执行鼠标/触控的中心及中心±21.5原始点，共40动作控制/Document；每次elementFromPoint必须还是原按钮，提醒必须打开真实owner Dialog且恰好一个remind回调，More必须只开一个menu并经真实Open source触发恰好一个source回调，关闭后严格等实际来源焦点归位。

这些控制尚未执行；若当前TaskRow size-8/gap0.5产生实际反例，必须修正真实32/44布局分区，不能放松零重叠或原点断言。日历1–5周×0/1/6周起始、双Document、颜色/焦点截图、日期原点、周期动作、日程与IME、1440/390状态控制均保留。

实际执行：

- pnpm exec vitest run src/ui/components/huhu/calendar/ProductCalendar.dom.test.tsx src/ui/components/huhu/calendar/calendar.dom.test.tsx：退出0，2文件44测试通过，/tmp/huhu-t05-native-repair/calendar-dom.log。
- pnpm exec tsc -p /tmp/huhu-t05-implementation/tsconfig-fixture.json：退出0，types.log；范围为现有T05/fixture导入图，不宣称全仓types。
- pnpm exec eslint src/ui/components/huhu/calendar/ProductCalendar.tsx --max-warnings 0：退出0，lint.log。
- Prettier仅本次3文件、node --check fixture及git diff --check本次范围：均退出0。
- node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-05 --matrix redesign --check --out /tmp/huhu-t05-native-repair/preflight：退出0，只preflight/0 matrix cases及真实guarded adapter检查，未启动浏览器。

既有107自有测试未因纯焦点class/夹具改动全量重跑；最近44覆盖公开周窗口/跨月键盘行为。未写无意义的class字符串镜像测试。所有新原生、计算样式及像素断言均明确待Root运行，不以DOM测试代替。

## 问题与下一步

Root须提供新CSS/输入边界并执行实际bounded native；实现者没有浏览器授权，不自行运行或宣称最终pass。重点依次为原生焦点2/+2和真实320叶/312弹层、可见边缘焦点像素、两动作实际目标；若后者证实重叠，071允许的TaskRow窄修复仍为后续必须工作，当前未伪称解决。之后high独立审查与Root全矩阵仍必需。

当前三个修改文件及完整43源冻结释放；066不可改。自有TaskPage、domain、CalendarBackend与其余T05源均未变化，现有响应计数→真实日程、资源标签/缺失状态、完成保留查询隔离等行为保持。此REPORT的completed仅表示实现候选交接，不是票据或Gate结论。
