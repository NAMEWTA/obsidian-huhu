---
schema_version: 2
session: "20261105T094057Z"
task: "073-repair-t16-review"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
修复070已验证的7项T16问题；Root单独负责ST03 NOTICE。不要重新从规划或重写引擎开始。
## Inputs
AGENTS、dev/ui、新ui SHA12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4，SpecDev I/适用测试与审查合同；Map23/Goal/Spec/本票、DESIGN3/UI002原型。用户授权全部16票、gpt-6.1-sol medium实现/high独立审查；不改批准设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。HEAD37fcede4210a19bcc2a74809e7fdd301e5717957，保留既有dirty及staged内容。无worktree/commit/push/release/vault写入；不改node_modules；不委派。
完整读取070-review-t16-versioning/REPORT.md及068实际候选；/tmp/huhu-t16-high-review的6 DOM/1真实Git反例；/tmp/huhu-t16-implementation/candidate-manifest.json。070已明确释放review冻结。
## Workspace and Scope
仅T16 frontmatter writable_paths；REPORT及/tmp/huhu-t16-repair。Root中央脚本、词典、package/lock、资产、NOTICE均只读，所需en/zh先提案。保留只读core/hunk-restore.ts与api.ts；现有RestorePlan afterText/receipt null语义先查真实链。
## Acceptance
逐项关闭ST01当前viewer内导航焦点、ST02隐藏时abort读取/逐文件解析并恢复同一实例；SP01 missing↔text块恢复通过既有checkpoint/receipt/条件undo（区别empty），SP02 staged/unstaged rename含内容块按真实端点与状态重核、保持rename/其它hunk/mode/path/worktree，禁止隐藏按钮代替修复；SP03历史A/B保留来源提交图/行/焦点/筛选并aria-pressed；SP04端点A/B角色胶囊与真实文件/+−汇总（unknown/binary不伪造0，切换清旧数据）；SP05两个交换入口/反向偏好进入比较的端点、统计、文件方向与hunk写方向同一事实源。按真实反例TDD、最小既有API改动，若确需额外精确路径先交Root，禁止改持久格式/放松ordinary conflict gate/自写diff或冲突parser。适用单元/DOM/TEMP Git/types/lint通过，保留原风险回归。fixture同步真实页面但仅--check，Root最终native。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，具体改动、实际命令/退出码、逐项finding关闭证据及剩余限制；原始代码、日志、JSON、PNG、hash清单只留/tmp。冻结全部owned最终源码/模式/新增删除与真实起点清单，通知Root后停止写入等待独立审查。先validate-dispatch return。Root独占正式状态、Evidence、shared源码、资产及最终native全矩阵，不将局部测试称为完整宿主通过。
