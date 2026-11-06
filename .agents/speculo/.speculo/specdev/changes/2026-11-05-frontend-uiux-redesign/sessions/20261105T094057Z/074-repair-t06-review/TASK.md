---
schema_version: 2
session: "20261105T094057Z"
task: "074-repair-t06-review"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-06"
---
## Goal
修复069模块S02–S05及已跑native T06日期键盘验证失败；S01共享producer由Root修复。
## Inputs
AGENTS、dev/ui、新ui SHA12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4，SpecDev I/适用测试与审查合同；Map23/Goal/Spec/本票、DESIGN3/UI002原型。用户授权全部16票、gpt-6.1-sol medium实现/high独立审查；不改批准设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。HEAD37fcede4210a19bcc2a74809e7fdd301e5717957，保留既有dirty及staged内容。无worktree/commit/push/release/vault写入；不改node_modules；不委派。
完整069-review-t06-shared-seams/REPORT.md、067候选与/tmp/huhu-t06-high-review反例；/tmp/huhu-t06-lead-initial390/result.json失败为main date keyboard selection超时，实际截图/输入在同目录。不得先假定fixture错或削弱断言，定位真实值/焦点/事件。069已释放冻结。
## Workspace and Scope
仅T06 frontmatter writable_paths（archives/ui/**、services/generic/workbench.ts/test、T06 fixture/**），REPORT及/tmp/huhu-t06-repair。Root独占词典、MonthField/DateTime/SidePanel等shared，需新文案/端口先提案；不改codec/schema/其它服务。
## Acceptance
S02独立保留date/time/offset的无效与未完成raw，+不迁移到time，保留秒/小数/Z/外部reset；S03确认后等待discard期间的晚到完成校验owner/session，不关闭新编辑；S04自定义type真实reload期间保留确切schema/FormSession/input DOM/dirty/焦点，索引不可用禁止实际写入、失败重试不回退草稿，关联编辑相同链核对；S05使用真实offset/limit/total让第51及更后同名实体可达，保留selected pin/路径消歧，不提高硬限额、不提示更多却不能到达。加入各实际红绿回归，保留既有13字段/40DOM/3paging与原有功能。真实native失败按定位最小修复并说明；不要自行重跑完整66或资产构建。局部类型/lint/DOM/unit适用通过，旧全局迁移债诚实区分。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，具体改动、实际命令/退出码、逐项finding关闭证据及剩余限制；原始代码、日志、JSON、PNG、hash清单只留/tmp。冻结全部owned最终源码/模式/新增删除与真实起点清单，通知Root后停止写入等待独立审查。先validate-dispatch return。Root独占正式状态、Evidence、shared源码、资产及最终native全矩阵，不将局部测试称为完整宿主通过。
