---
schema_version: 2
session: "20261105T094057Z"
task: "153-audit-unstyled-focus"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
sol medium只读精确验证一项NFR疑点：原生UI button不带outline-2时的通用focus fallback是否仍被neutralize覆盖；当前矩阵冻结，先不改任何正式源或生成修复候选。
## Inputs
AGENTS/dev/ui/testing、Map56/DESIGN3 focus2solid offset2/input3glow。146 utility已Root应用、149两轴pass，当前styles76910cca...完整摘要见artifact manifest；/tmp/huhu-t14-repaired-final-artifacts。具体生产目标src/modules/agent/ui/dashboard/AgentBoard.tsx:159真实button class=flex w-full flex-col gap-2 text-left，父article只有border/bg/p3，无focus-within；可能还有其它相同原生控件。base.css:76通用.huhu-ui :focus-visible仍低于neutralize的假ID规则，146只针对显式outline-2，需实际层叠红/正常对照确认，不凭猜测当新缺口。
## Workspace and Scope
repo完全只读，仅本REPORT+/tmp/huhu-unstyled-focus，不能写任何候选/源/fixture/styles/main/状态/Evidence/index/旧报告，不正式66/858/真正用户库/账号/clipboard/委派。当前Root完整matrix+native在跑不可扰输入；可单独临时Chrome/profile，复用现有fixture/当前CSS，用精确生产class及父结构的代表节点做CSS对照，明确这是选择器机制而非全Agent领域渲染；别复制产品引擎或重跑全部focus。
## Acceptance
可信键盘使代表原生button matchesfocus-visible true，取实际outlineStyle/width/offset/color/shadow，以及赢的中和声明/是否有其它视觉focus；跟显式Button及输入glow/非HU/native/Markdown/CM当前负控制配对。若有缺口，报告精确普通可Tab生产调用+CSS原因和最小producer写集，不立即改文件；不要误把disabled/非焦点目标当问题。记录实际pointer媒体（非coarse可none，不冒fine），所有Root数据/源始末SHA/mode不变。Root会等152整个12面视觉审完整清单后批量修，避免逐项扰最终输入。
## Return
三节不可覆盖REPORT，真实Source/命令退出/机制控制与有或无缺口；dispatch/return0停止读写释放，不将初步怀疑称产品已修或T14通过。
