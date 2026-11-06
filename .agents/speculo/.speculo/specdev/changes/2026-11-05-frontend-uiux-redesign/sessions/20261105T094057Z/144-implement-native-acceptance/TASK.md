---
schema_version: 2
session: "20261105T094057Z"
task: "144-implement-native-acceptance"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
sol medium适配当前UI的真实Obsidian最终宿主probe，复用fresh-vault/CDP，Root单写正式脚本并最终执行。
## Inputs
AGENTS/dev/ui/testing、Map53/Goal/Spec/T14/DESIGN3/UI002，132只读REPORT中真实宿主7项及最终收敛方案；T13 136/140旧seed/routes已实际应用，15票done。当前main旧Root即将build并给冻结插件目录；现有/opt/Obsidian/obsidian、xvfb-run、/tmp/huhu-final-native-binaries/huhu-pty和huhu可用，有SHA manifest；/tmp/huhu-redesign-host-start仅旧启动诊断，terminal当时仍Tasks，不算通过。当前只Linux必需，Windows/macOS扩展不在本次可用环境。
## Workspace and Scope
repo全只读，仅本REPORT与/tmp/huhu-native-final-proposal候选/诊断写。候选精确8既有shared：workbench-probe、workbench-window-owner、terminal-merge、versioning-history、theme-matrix、navigator-restored-leaf、comments-edges、fresh-vault（均scripts/obsidian-acceptance/*.mjs），及integration/host-boundaries.mjs（新，必要helper先列精确名字）。只按真实当前UI语义最小修复，不重写所有scripts/新runner/页面/引擎。143另medium只integration/index/test及中央run两源，不重叠。不得改产品/主题/领域/原型/状态/Evidence/index/旧报告，不build/正式858/委派。所有真实宿主只新root+私有HOME/profile+单独Xvfb，严禁用户库/账号/实际桌面剪贴板/外部消息或remoteGit。
## Acceptance
先列精准必要patch集合（没必要不碰8全套）。fresh-vault保原launcher/lifetime，可集中增加复制后三资产expected/installed SHA receipt，原流程不变。workbench-probe等真正生产surface就绪与route，不只railactive/任意text：12表面（diary/notes要真实对应navigator/nativeview非虚构feature）1440/390纸墨、无页面横溢、设置、panel开合、模块off/on、重启路由。真正popout不同CDP renderer中theme/root/Portal/date/modal/feedback/关闭清理与现有explicit-owner不重复。terminal只本地helper+私有HOME shell echo nonce，两会话/关闭重开/切页输出保留、真实主题颜色；菜单role/当前label按实际源码改，不删断言或扩timeout。versioning-history保原本地Git无remote、HEAD/index零写、预览、确认取消/恢复undo、原生draft/多叶/评论锚点、5000行worker、restart/hold/receipt与popout；旧cm/choice/Unified断言改为批准Pierre公开Shadow与现行两布局，说明旧第三布局由设计替换，不把删除合法风险称保留。comments非交互gutter需用原精确命令/面板，保定位/高亮/隐藏跨根不查询风险；navigator restored on/off原风险保持，有重叠原生边界可用既有history去重，别反复跑性能套件。theme-matrix只把旧UIpreset目标迁当前source/paper/ink/accent/density/uiSize/motion，保独立Markdown编辑器schemes/字体/源码/阅读/LP与卸载恢复，不能整删合法editor字段。
新增host-boundaries聚焦真实Safe生命周期/原生clipboard/多窗口：自造假密码记录与nonce，只单独Xvfb的clipboard读写，复制本次nonce、clear/recopy/lock/隐藏/迁移/关闭/restart恢复；不能接触用户clipboard，不能注入假clipboard实现或加速生产timeout来冒真实timer。其他系统文件原生picker可只在隔离fixture路径，若非必需可明确未覆盖。主窗实际fine/hover32、CDP coarse44与窄叶适用真实命中/可见焦点，headlessnone不能当fine。真实弹层/文字行等待有限动画，不用反复重试点击或扩大时限换绿。失败先区分driver/source证据，产品缺口精准交Root原票修，不能改产品或删风险。
Root正在跑全仓测试前禁止启动重型浏览器/native诊断；先读源码生成私有候选，Root完成后通知可以真实diagnostic，明确非最终正式门。最终冻结before/afterSHA/mode/ready.patch/manifest（不覆盖），每现有脚本nodecheck与实际已跑项清楚；新正式宿主由Root执行同冻结三产物，所有输入写receipt，不借旧诊断冒pass。
## Return
不可覆盖三节REPORT，准确调用/差异/真实命令退出/环境/未验边界/失败与修正；return0停止所有读写释放，不称T14整体通过。
