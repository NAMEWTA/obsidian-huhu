---
schema_version: 2
session: "20261105T094057Z"
task: "132-audit-integration-entry"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
medium只读实施前影响清单，非最终独立审查、非启动仍受T13依赖的实施。确定T14集成入口与真实宿主验收的最小充分方案，不写候选代码。
## Inputs
AGENTS/dev/ui/testing、Map49/Goal/Spec/T14。当前13票done，仅T16长文件F7/Shadow目标修复进行、T13/T14 ready等依赖。所有模块已有真实Source reviews/原66，T08唯一字体增量另12代表组合通过；过程/evidence在change与/tmp。Goal要求全部16完成、无旧兼容、成熟复用，不提交/推送/归档。
AC902要求node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-14 --matrix redesign；当前runner会找T-14/index而ticket writable只integration/**，两处尚未创建。T14需汇总真实各票fixture与最终同构建，不能用只读状态假绿或prototype画面代生产。
真实Linux Obsidian/Xvfb已能启动当前构建，/tmp/huhu-redesign-host-start/evidence/startup-review.json有11rail巡检/errors=[]但terminal未等待真正激活、只是诊断。/tmp/huhu-real-pointer-fine/evidence/pointer-media.json真实fine=true/hover=true/coarse=false，headless矩阵的fine标签实为non-coarse(pointer:none)不能冒称fine。真实popout/terminal/retained sidebar/主题/clipboard可用一次性新vault+Xvfb隔离，禁止用户vault/账号/剪贴板/外部消息；控制shell仅本地自建测试进程，native二进制/tmp/huhu-final-native-binaries已当前源码build/freeze。
124只读已列35旧modules.sync种子/7旧feature/2旧settings类别，正式T13修其源。新T14如需host脚本修改精确范围即可，优先已有workbench-probe/versioning-history/terminal-merge等purpose-built helper，不发明另一runner或域模拟器。
## Workspace and Scope
repo全部只读，仅本REPORT+/tmp/huhu-integration-entry-audit。阅读T14、runner、T04实际fixture/现module fixtures暴露边界、现host scripts；不改源/文档/产物/状态/模板/测试，不委派/运行浏览器/构建/全仓。
## Acceptance
给最小精确写集与当前调用关系：如何使T14 CLI实际验证生产组合与汇总全表面，无假页面/空fixture/只数status。可有界复用已通过证据：按own source与共享变更归因核对，样式/Root API在T13变化需最终同构建真实验证；避免无关所有矩阵再重复，也不能把旧input当新hash完全同一。明确原型、DOM、Chrome、true Obsidian/popout边界。
提可落地的简洁方案及权衡，不能笼统留TODO；T14 artifact命名路径与现runner如何接、必要shared owner精确路径、验收组合与预计要跑的实际命令、哪些旧脚本应迁当前选择器/API。只读规划不认证T14/13/16完成。
## Return
不可覆盖三节聚焦交接/产物与验证/问题与下一步REPORT，路径行/最小写集/现证据可复用边界/必需验收清单；return0停写。
