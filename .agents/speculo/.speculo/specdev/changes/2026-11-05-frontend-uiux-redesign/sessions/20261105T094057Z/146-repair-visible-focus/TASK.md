---
schema_version: 2
session: "20261105T094057Z"
task: "146-repair-visible-focus"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
sol medium确定性诊断/最小修T14真正宿主暴露共享可见焦点缺口，不改批准设计。
## Inputs
AGENTS/dev/ui/testing、Map54/Goal/Spec/T02与DESIGN3 focus: outline2px solid accent offset2，输入为accent border+3pxsoftglow。当前冻结styles e5bc1f3ab5c0e1fa8e0299b4378497617e0a3039a5d1083c09c6cebd42c470a8；/tmp/huhu-native-final-proposal/diag-workbench-04/evidence/partial.json：实际fine=true hover=true，可信ArrowDown后activeTasks rail Button matchesfocus-visible true、outline none/width2/shadow none。不是DOM宽度或driver缺focus，必须真实可见。Root已读Button outline-none+focus-visible:outline-2，base低特异性focus规则与neutralize更高ID；根因仍须实际层叠验证。原全仓630/4800、toolpreflight等是修前历史，正式T14尚未跑。
## Workspace and Scope
repo只读，仅本REPORT与/tmp/huhu-visible-focus-repair私有候选/浏览器过程。候选先报最小路径，限定T02组件/fixture及Lead共享base.css/neutralize.css/tailwind index必要者；不修改date/**、原批准设计/所有模块/状态/Evidence/index/其它派单。Root单写源码/styles/main，不能build正式产物。可私有候选CSS编译/真实Chrome+Obsidian app.css有界对照；native144正在独立诊断其它场景，不共profile/vault。不得用户库/账号/剪贴板/委派。
## Acceptance
旧源真实CSS+可信Tab/Arrow控制红，新源绿；定位实际赢的outline-style层叠（neutralize/outline-none/Tailwind outline-2变量），不要只假设Button或用重要性堆叠。最小充分共享修复，保Button/Switch/Checkbox/Tabs/Tree/scrollviewport/date/calendar等显式outline控件2px solid/offset2/正确color与输入/textarea/combobox原3pxglow，无额外outline污染，disabled/unfocused及huhu-native/Markdown/CM仍不影响。不要为统一制造第二样式引擎或遍改所有页面。现有T02 fixture应补真实outlineStyle/可见颜色/宽offset与输入glow验收，不能旧宽度冒通过；按实际控件/ownerDocument两Doc/纸墨/fine-coarse或等价受控媒体取配对，正常/输入/非HU负控。有限浏览器对照及必要现有DOM/CSS/类型检查，Root统一最终正式66/858/真正host与产物，不跑正式矩阵。before/afterSHA/mode/ready.patch/manifest冻结后不可覆盖，真实源不直接改。
## Return
不可覆盖三节REPORT，确定性红绿/根因/精确源与实际命令退出/未验边界；dispatch/return0明确停写释放。发现超scope再精准提Root，不能放宽阈值或隐藏真实失败。
