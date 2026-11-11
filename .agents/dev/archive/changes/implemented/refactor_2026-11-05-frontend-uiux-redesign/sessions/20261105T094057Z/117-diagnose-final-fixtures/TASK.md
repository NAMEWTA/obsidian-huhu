---
schema_version: 2
session: "20261105T094057Z"
task: "117-diagnose-final-fixtures"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
medium只在/tmp诊断并提出剩余native fixture最小修正；Root独占repo源/最终浏览器。延续114不将夹具绿冒充产品或真实Obsidian。
## Inputs
AGENTS/dev/ui/测试参考、Map43/Goal/Spec/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。
114三补丁已Root合入（T07 modal清理、T10端口+稳定panel、新bounded-startup），node helper+run tests9/9，T07正式66已pass（/tmp/huhu-t07-lead-final）。T10尚无完整native。Root当前已重建CSS。
T08 private原1case失败/tmp/huhu-t08-first-native/result.json：main states已过anniversary-config，下一state mounted超时，需真实确定具体state/根因，保留原断言。T08已有实际ThemeRuntime附着（不是仅外层theme）。
Root人工查看T11旧66的safe-unlocked-main-320-zh.png：body墨但nested DesignScope纸/透明导致深色文字落黑底。T11 configure仅applyInterfaceTheme(host)，没有真实ThemeRuntime；新动态.huhu-ui/portal未获得属性。T09标ink截图仍纸，T07亦仅外层apply需检查；这些旧66不能宣称每层theme正确。先实测actual attributes/computed，若确是fixture缺ThemeRuntime和宿主content背景，提出复用现T08真实ThemeRuntime或通用薄shared安装器的最小候选，不改生产CSS/组件，也不重新造主题引擎。安全/不安全host source矩阵需在fixture注入真实样本值如shared/theme已有设计，不能假设body默认就是有效host配色。
## Workspace and Scope
仓库所有源码只读，仅本REPORT及/tmp/huhu-final-fixture-diagnosis。候选只限T08/T10 index.mjs|tsx与T07/T09/T11 index.tsx|mjs、必要shared薄fixture helper。保存真实before/hash/mode/patch；Root单写合入与状态。别修改111/115冻结的生产源，别委派/跑66/真vault/账号/clipboard。
## Acceptance
T08真实原完整exercise/1case恢复；T10 current原完整exercise/1case尽量走完，实际SDK缺口补内存端口，真实product失败应报出不可用mock绕过。theme先测证，动态root/portal实际preset/accent/source/density/fonts，主题应用与fixture宿主surface由真实生产ThemeRuntime和已存在tokens负责；静态fixture边界诚实。若发现共性，提出薄复用helper供Root串行合入，先1case/定向控制验证，不重复所有66。
## Return
三节聚焦交接/产物与验证/问题与下一步；实际症状、单变量证据/根因与未知、候选前后hashmode、命令退出、未执行项、输入是否被Root并行修改，return0停写。原114不可变；旧证据不覆盖。
