---
schema_version: 2
session: "20261105T094057Z"
task: "140-repair-cleanup-findings"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-13"
---
## Goal
sol medium修138独立T13两项P2，Root单写应用，最小三路径候选。
## Inputs
AGENTS/dev/ui/testing、Map52/Goal/Spec/T13，136冻结52候选已Root应用、138 REPORT即将返回（已确认两finding、需等其return释放再最终冻结候选）。/tmp/huhu-root-frozen-cleanup manifest为本轮before actual。原staged88raw4258d835a7e5cf5c845a981d441a37baa14fb4c834097f83aedeb34e0fb653ec不动。139另medium仅改UI五技能，跟此三路径无重叠。
## Workspace and Scope
repo只读，仅本REPORT+/tmp/huhu-cleanup-findings候选与过程写；候选限test/guards/frontend-cleanup.test.ts、正式frontend-inventory.json与frontend-coverage.md；Root应用。不得改生产/样式/设计/原型/其他正式状态/Evidence/index，不委派/构建/浏览器/用户库。
## Acceptance
一：守卫按filename+相对import实际解析目标为src/ui/components/input.tsx，识别named Input别名，覆盖当前InlineRename '../input'和date/field-parts '../../input'，原完整components/input写法/原生input控制保留；同名其它input模块与TextField/DateField/time/领域对象负控，未知dynamic/spread仍failclosed。不能只扩正则列字符串；不造全程序分析器，四适配例外及理由不放宽。
二：inventory当前Analytics.tsx相对37fcede实际已改（123最后日期修复），由unchanged-bytes改modified。全678原/新/删除逐项重新核对分类和对应基线/当前SHA，当前应347modified/264unchanged/60new/7deleted（671当前），52 source after/mode不变；更新所有受影响计数/文本，不把相同字节当逐行review。保留原报告/证据、实际边界与T14pending，不误称全项目通过。执行有意义guard/路径正负及投影数据自洽检查，docs必要真实可执行；Root统一实际检查与high增量。before/afterSHA/mode、ready.patch/manifest独占冻结不可覆盖。
## Return
新增不可覆盖三节REPORT，真实差异/命令退出/coverage核对与未验边界；return0停止读写释放，不推进正式状态。
