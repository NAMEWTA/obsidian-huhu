---
schema_version: 2
session: "20261105T094057Z"
task: "162-correct-versioning-primary-target"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
sol medium纠正157误改分支，关闭161确认仍未闭VIS03(a)，仅同一源两个最小hunk。
## Inputs
AGENTS/dev/ui/testing、Map59/DESIGN3“同区最多一个主按钮”，152/157/161实际事实。157 frozen patch只改SyncPage snapshot.phase==='no-git'的EmptyState单一Open settings（line142）为secondary；真正NoRepository actions（line220–225）Create explicitprimary/Open settings仍defaultprimary。157 REPORT声称改noRepo与真实patch不符，旧包/REPORT必须保留，不改写。Root当前已应用157，当前sync-presentation SHA2f0d2cc24426a36c674da68ca15dc802eef91ca88781af40aacc61c92657ec36；161仍冻结，请只私有candidate。
## Workspace and Scope
repo只读，仅本REPORT与/tmp/huhu-versioning-primary-corrected；唯一候选src/modules/versioning/ui/sync-presentation.tsx，其他源/状态/Evidence/index/旧157报告/包/产物不动。不新组件/API/领域/Git流程/文案/确认/权限，不build正式资产/正式66/858/native/用户库/账号/委派。Root等161回执释放后应用。
## Acceptance
恢复误改的no-git EmptyState原default primary（它只有一个操作，无理由改次）；仅NoRepository创建仓库旁Open settings改明确secondary，Create primary/handlers/busy/disabled/place/error/Clone区全部不变。用真实SyncPage分别no-git和no-repo状态渲染/当前styles有限验证：前者仍1主按钮，后者同actions row恰1主1次、settings callback可达；不要再用全文件首字符串替换或只grepClass当完成，也不写实现镜像测试。必要现有8DOM/语法/类型/lint，用实际输入/退出，真实Git和大矩阵Root统一。before/afterSHA/mode、ready.patch/manifest独占冻结；新报告明确157错误和162纠正，不把旧错误改称正确。 
## Return
新增三节不可覆盖162 REPORT，真实分支/对照/退出/未验；return0停写释放，不裁定T16/T14通过。
