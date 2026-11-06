# T05 相邻焦点命中修复候选

Session: 20261105T094057Z
Task: 080-repair-t05-hit-targets
Status: completed

## 聚焦交接

按080交付最小修复候选并冻结，待独立high审查和Root正式66；不宣布T05完成。gpt-6.1-sol / medium，无委派。只改ProductCalendar、TaskRow、最近DOM测试、T05 fixture index.mjs四文件；无新增或删除。完整43源起点/最终SHA、模式、四项差异在 /tmp/huhu-t05-hit-repair/final-candidate.json；起点备份在 before/，清单 before.json。T07冻结59源复核drift=[]，未修改其源码。066/071报告保持不变；未写共享源码、资产、词典、状态、Git/index、依赖或vault。

最终SHA：

- ProductCalendar.tsx：28253c924f93828d059f72ed384adcfcab84d7831d005d931a0606554efc4570
- TaskRow.tsx：38b090496eb0eae46ac6705bb2181a8498c94f071c74f5e7e64dde377f5f3c29
- ProductCalendar.dom.test.tsx：29f3b1ca06668f493e1c73149ce74b5466a88d7f697e01a4203ba9f6be803116
- T-05/index.mjs：2ae4a7a073d6b27c0d1d8b462e09c29d807c7382878bd50a5c85acd5f74e8ef8

## 产物与验证

实际诊断重现Root反例：320真实viewport/client/leaf中日期本体44，表格308，弹层312；Feb1 x6..50、Feb2 x50..94，rect无重叠，但同一(49.5,688)在self焦点命中Feb1、next焦点命中Feb2。focused td上层未裁剪的按钮命中抢占邻点；clip-only私有实验变成无按钮，证明只裁按钮不够。保存 red/result.json、clip-causal、partition-causal 及原图片，没有把诊断status passed视为目标断言通过。

ProductCalendar最小分区：td pointer-events:none，日期按钮pointer-events:auto且clip-path:inset(0)，同尺寸pointer-none包装层绘制完整2px/+2px焦点，任务内容恢复pointer-events:auto。保留DayPicker原refs/键盘/日期状态，日期细32/粗44、七列、周号caption、312/4px碰撞边界；没有私有键盘或事件选择引擎。DOM新测试验证日期与任务为独立语义按钮且各自回调一次；旧30窗口断言保留，仅把新增包装后的直接子选择器改为真实data-date后代。

TaskRow真实counter：Reminder/More原32px按钮的44px pseudo相交10×44=440px²，More还越出320右边2px。两个动作分别置于 --hu-hit 正方形布局cell、居中原32px视觉按钮，保留原2px间距；细32/粗44有效命中不相交，无删动作或裁触控。private partition-counter先通过日期后在440重叠严格断言失败，修复后实际各自回调、菜单/提醒关闭及焦点恢复通过。

fixture原trusted ShiftTab误用CDP modifiers=1（Alt），真实反例是More仍焦点；改8（Shift），保留相邻焦点严格等式、所有原点位和callback断言。candidate-tab-diagnostic原失败保留，错误文本新增完整焦点诊断，不放宽测试。

验证：

- 私有Tailwind CLI→tmp raw→既有scopeTailwind/postcss→src/styles.json顺序拼接，退出0；未调用会写共享raw的build-tailwind。实际加载 /tmp/huhu-t05-hit-repair/styles.css，SHA256 6d6e48df0654b2144f9f51b66c7ab853cf63b2e8d4cd2d7a85b467648c04ba11。
- 原公共fixture exercise、真实源码和上述私有CSS，driver-final.mjs：退出0，final-private/result.json status=passed/errors=[]，**0 matrix cases**。两个Document共30个1–5周×三weekStart导航、40日期self/next焦点中心±21.5鼠标/触摸点、80双动作self/neighbor焦点可信点、真实动作计数/焦点、period action、IME、autosave及20状态截图均通过。结果privateStyles明确记录实际私有CSS；runner inputs中Root styles.css条目不是此轮加载样式证明。
- 独立最小rows-fine：两Document共40个±15.5鼠标点、32px pseudo及零重叠通过；rows-coarse另80点通过。原公共粗44断言未改。
- 实际查看final-private/t05-main-calendar-edge-320.png：外侧完整焦点可见、selected色/点及312弹层保留；second截图只有宿主裁切边线，不能作为第二Document完整视觉证明，第二Document本轮以真实DOM/事件/计算样式断言为据。
- pnpm exec vitest run ProductCalendar.dom.test.tsx calendar.dom.test.tsx：退出0，45/45。最初15旧直接子选择器失败保留在dom.log，修后dom-final.log通过。
- scoped tsc（既有 /tmp/huhu-t05-implementation/tsconfig-fixture.json）、两生产文件ESLint零警告、四文件Prettier、node --check、git diff --check：均退出0。首次lint含被忽略DOM文件导致warning已保留；最终lint只适用生产文件。
- sanctioned runner --check带完整--out：退出0、preflight；首次漏--out使用错误保留，不算通过。

全部原始诊断、私有代码、JSON、CSS、PNG及日志只在 /tmp/huhu-t05-hit-repair；独立原生采用隔离Chrome/同源iframe，无真实Obsidian或vault写入。

## 问题与下一步

源及fixture从此冻结，Root可重建共享CSS后独立审查并执行正式66。当前原生证明绑定私有CSS，不冒充共享资产验收或实际Obsidian popout。T06第66组月份picker超时由Root处理，T07保持冻结，均未纳入本修复。正式Evidence/状态/资产仍由Root负责。
