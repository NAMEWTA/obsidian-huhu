---
schema_version: 2
session: "20261105T094057Z"
task: "160-refine-task-hit-layout"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## Goal
sol medium对155圆形18px任务completion样本补最终真实命中保证，生成取代155的最终候选，保持旧报告/包不可变。
## Inputs
AGENTS/dev/ui/testing、Map57/DESIGN3 Checkbox18、task圆形、提交虚线、fine32/coarse44独立命中。155已在/tmp/huhu-task-check-shape形成三源包，未Root应用；最新提示PM dashboard通用button min32使visual18需局部min-h0/min-w0，但这样可能让pseudo44裁切/邻行重叠，必须实际测。Root认可必要同一行非交互布局分配，不能只做视觉尺寸。
## Workspace and Scope
repo只读，仅本REPORT+/tmp/huhu-task-check-shape/hit-final；候选仍仅TaskPage.tsx、calendar/TaskRow.tsx、HomePM ProjectBoard.tsx三授权路径。不能改dashboard.css/共享primitive/其他模块/正式源/产物/状态/Evidence/index/旧155REPORT或造REPORT-HIT；旧155ready保留，160新最终包独占冻结。Root最终应用160，不应用155。先完成156–158后可继续本task，不委派/真正用户库/外部服务/正式66/858。
## Acceptance
真实TaskPage/CalendarTaskRow/PM完成checkbox 18px圆形，与false/true/pending/disabled、回调/ARIA/TaskContent/领域格式原样。实测当前CSS及private候选fine/非coarse实际none/coarse两Doc或适用实际owner，Checkbox pseudo目标≥32/44、中心/内部edge命中、相邻标题/删除和邻行目标不重叠、不被父overflow裁切。必要给PM分配现有非交互居中32/44 wrapper/行min-h token空间，视觉18与hit/layout分离；TaskPage同一行如原粗指针相邻1px疑点，真实旧新几何配对后只做最小同一行间距/分配，不能泛改版式。非任务checkbox仍方，输入/native其它边界不污染。源码级class镜像不算几何证据，记录实际computed/media/point目标。beforeRoot source保持原beforeSHA，最终包包含155必要视觉变化+160最小命中修复，实际types/相关DOM/CSS/语法与有限真实Chrome配对，过程全/tmp，Root大矩阵后做。
## Return
新增不可覆盖三节160 REPORT/真实退出/输入与红绿或原无缺口结论，return0停写释放；明确取代155包，旧失败与旧报告不抹。
