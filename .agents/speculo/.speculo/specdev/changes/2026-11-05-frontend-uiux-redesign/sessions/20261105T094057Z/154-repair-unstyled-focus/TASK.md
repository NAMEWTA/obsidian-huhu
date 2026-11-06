---
schema_version: 2
session: "20261105T094057Z"
task: "154-repair-unstyled-focus"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
sol medium修153已确定的原生UI按钮通用focus fallback缺口；只私有候选，Root等当前最终矩阵/152图审全部结束后批量应用，不扰冻结输入。
## Inputs
AGENTS/dev/ui/testing、Map56/Spec/T02/DESIGN3，153 REPORT实际两Doc可信Tab到AgentBoard同class的裸button无outline/shadow，base0,2,0被neutralize1,0,1压过，146显式outline2 utility正常但不覆盖裸button。当前baseSHA485591d5cbd015aa31e761eb6b861209a08418a2b85f8abeffc5484c6ba7d5b2/styles76910cca；146/147均已Root应用，T02fixture最新版已含完整focusProof/Calendar样本。原生AgentBoard.tsx:159真实来源，其他类似原生buttons复用通用fallback，不遍改模块。
## Workspace and Scope
repo只读，仅本REPORT与/tmp/huhu-unstyled-focus-repair候选/过程。候选仅Root共享src/ui/styles/base.css、T02/index.tsx、T02/index.mjs；neutralize和tailwind(index已146修)只读。不实际改源/资产/状态/Evidence/index/旧报告/其他模块，不正式66/858/真正用户库/账号/clipboard/委派。当前Root矩阵与152只读视觉审不可受输入变化，全部冻结patch由Root未来应用。
## Acceptance
最小正确层叠：让通用裸button/需要默认focus的HU控件focus-visible能胜neutralize，但作者outline-none及显式自定义focus/ring仍可表达；不把input/textarea/combobox原3pxglow改成双outline，不污染huhu-native/Markdown/CM/外部，也不强迫Dialog/Sheet容器出现新outline。优先精确特异性与必要排除，不!important/不堆多ID/不拆另一套CSS引擎，不改批准2solid+2offset/accent。新fixture在真实共享根里加入代表AgentBoard的可Tab原生button/父article和普通原生HU button，不仅CSS字符串；可信Tab旧红/新绿完整style/width/offset/color且样式边界配对。现有146focus与输入/native/disabled/unfocused负控保留，适当两Doc/纸墨/非coarse实际none/coarse记录，真实fine仍Root后续宿主补。低影响CSS只私有编译有界验证和lintcss/语法/现有类型，正式全矩阵Root统一，不改断言阈值或假称旧同style结果当前。最终before/afterSHA/mode、ready.patch/manifest独占冻结；报告最小实际范围。
## Return
三节不可覆盖REPORT、真实红绿/层叠/输入/命令退出与未验；return0停写释放。没有新的用户批准环节；仍不得修改当前最终矩阵输入。
