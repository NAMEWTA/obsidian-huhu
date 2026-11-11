---
schema_version: 2
session: "20261105T094057Z"
task: "084-review-t05-tasks-calendar"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## Goal
独立high审查完整066/071/080任务/日历候选及与已通过共享日期/strict service的实际组合，双轴，不限于刚修的触控CSS，不实施/委派。
## Inputs
AGENTS/dev/ui与适用独立审查/测试合同，Map28/Goal/Spec/T05完整补充、DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。原066REPORT/真实基线及071、080最终不可变REPORT；最终43项/tmp/huhu-t05-hit-repair/final-candidate.json，080只4路径变化无增删，T07另59已独立冻结不在本review。Root日期DateTime/strictTaskCalendar/共享Month/SidePanel在069/075/078已审闭，可复用未变证据而非重跑全审。TaskCalendar真实strictopt-in gap/fold零写/defaultEarlier/UTC/Shanghai已有真实service测试；产品所有任务字段仍需实际核对。
080报告SHA4c9eab2d2b0ed287b39ef5943cae518577e08f6622f325dd109c9a401adf2311，私有真实CSS main/iframe trusted日期40点/TaskRow80点/30窗口键盘及fine32 40点通过，DOM45/types/lint/preflight0；只是作者证据不是Root66。原Root /tmp/huhu-t05-lead-focus390 证明邻focused day抢点、TaskRow实测10x44重叠。修复ProductCalendar td pointer-none/datebutton pointerauto+clip与不接收指针的focus wrapper、内容区pointerauto；TaskRow两个32视觉button各HU-hit格；fixture ShiftTab CDP1(Alt)修8(Shift)原焦点断言保留。Root将重建实际CSS/全66，review不重复native。
## Workspace and Scope
只读仓库，唯一此不可覆盖REPORT；过程/tmp/huhu-t05-high-review。冻结43候选及必要共享类型/词典上下文，不能冻结整个dirty树/并行T12修复或T16压缩脚本。Root独占source共享/正式状态/Evidence/资产/最终E2E；无Git/index/build/CSS写入。
## Acceptance
完整任务list/board/calendar、稳定DetailPane与TaskEditor、筛选/分组/批量/排序/状态/undo/提示、全部实际Task域字段/3状态/资源标签/源路径/时间与重复；所有原域命令/失败/CAS/去重/异步换条目/卸载/保存竞态保留，不虚构UI成功。TaskDomain与Home日历快捷创建/提醒归属明确，date-only不补epoch，DateTime真实raw无效不带走旧有效值、gap/fold strict保留默认internal earlier、真实服务UTC/Shanghai正常。
共享CalendarBackend仅薄DayPicker唯一引擎，productMonth与任意1–5周三weekStarts的日期/键盘完整且无裁切可聚焦项/自制arrow；weeknumber窄用caption，320popup312与HU-hit44、32fine/2outline+2offset、邻focused/pseudo命中修复不丢任务内容动作/DayPicker事件/ARIA。Home真实内容窄屏以可达日期入口与实际Agenda，不逐字竖排；TaskRow动作各自44且不相交、真实回调/原焦点、popover owner/main iframe。检查实际所有源diff/调用/原风险测试承接；对具体问题给路径/行/影响/满足条件，区分其它票旧类型/selector债。标准/规格分轴，未测像素/全宿主诚实保留，不把作者private或--check当Root矩阵。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、source identity/实际范围、双轴、实际命令退出/局限与无漂移核对；原始代码日志JSONPNG只/tmp。return校验后明确释放输入，不改正式状态。
