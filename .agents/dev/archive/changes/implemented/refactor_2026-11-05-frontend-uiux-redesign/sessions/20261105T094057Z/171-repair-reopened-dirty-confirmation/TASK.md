---
schema_version: 2
session: "20261105T094057Z"
task: "171-repair-reopened-dirty-confirmation"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
sol medium 根据167新完整轨迹定位并最小修复真实Keepediting后确认框立即重开，当前新源输入首次有可辨因果，不能再推定未点击/flake或盲重跑。
## Inputs
当前Root第三原13*66正在/tmp/huhu-t14-root-final4-matrix；T04已failed32，960/zh/paper/indigo/huhu/comfortable15，main reduce。children目录自行发现T04/result.json末case actions：keep-editing-observation/main/reduce记录pointerdown/up/mouse/click全正确到同target id1；状态closed/id2卸载alerts[]，约9ms后新Alert id5出现open，focus新无review button id4。明确是关闭后重开；system邻对照正常focus draft。旧第二轮相似失败也review丢失，与本次新节点一致，但不倒推老未记录细节。165/167 REPORT、现有dev/ui/测试可靠性/SpecDev合同、Map59/Goal/DESIGN3/UI002。
## Workspace and Scope
repo只读，仅本REPORT及/tmp/huhu-dirty-confirmation-repair私有候选/必要单样本真实浏览器可写。Root全runtime固定等父matrix结束不能正式改；不build正式产物/正式66/858/native、不改状态/Evidence/index/旧报告、不委派。先沿useDirtyModal/Sheet/AlertDialog/Radix FocusScope/DismissableLayer真实handler定位重开调用栈和事件；候选初限src/ui/react/dirty-modal.tsx及其必要就近DOM回归，若需要sheet/alert-dialog/modal-layer/DetailPane精确路径先报Root依据，不同时重构所有原语。不得timer屏蔽/重试点击/扩大timeout/强制focus/弱化原断言。
## Acceptance
用新trace提出可验证根因：哪个实际requestOpen(false)/onOpenChange/外部焦点事件导致新confirm，真实事件路径与owner/原状态读值/FocusScope cleanup顺序。必要私有诊断在真实生产路径加debug调用栈/事件，不拿mock内部函数当浏览器复现；有界单失败输入或明确barrier，不整66碰碰运气。接受真实新对照（system正常/reduce重开）作为起点，不再只跑一遍绿就结束。
修复回共享真实producer，保脏稿原节点/selection/scroll、取消恢复精确field/触发元素、dirty discard/关闭、本Doc owner、Sheet真实焦点trap、单层/嵌套/reduced/system语义，不新增兼容分支或取消dirty保护。回归必须有有界旧red新green，证明重开调用/错误focus旧源走真实路径；现有DOM测试优先，浏览器原同verify受影响组必保原断言；若需要何种额外真实观测精准说明。固定beforeafterSHA/mode，独占ready.patch/manifest与真实命令结果。Root应用后新build/必要全工程与真正宿主/原T04全66及全GFINAL由新输入范围合理重规划，不重置旧三轮历史。
## Return
不可覆盖三节REPORT/根因/真实redgreen/改动/未验/实际输入/命令退出，dispatch/return0后停止读写释放。不要宣称未做的整体通过。

## Root 接受真实producer范围扩展

沿171 actual callstack若确认迟到deferPointerDownOutside重开，允许精确候选扩展到 src/ui/react/modal-layer.tsx、src/ui/components/sheet.tsx、dialog.tsx、alert-dialog.tsx及必要就近DOM回归；不机械全改，只给真实调用所需路径。该共享原语归T-02生产者，Root将结合确因/实际候选刷新Map与生产者绑定，T04只消费/验证。原生PointerEvent owner精确处理，不用时间窗、强制focus或忽略全部outside换绿。

共享原语修复正式归T-02；T04仅报告原失败和消费验证。
