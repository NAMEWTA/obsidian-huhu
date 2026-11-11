---
schema_version: 2
session: "20261105T094057Z"
task: "091-repair-t05-route"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## Goal
仅关闭088已验证唯一残余route替换P2，保留086其它已通过修复。最小两源，不规划返工、不扩边缘。
## Inputs
AGENTS/dev/ui/SpecDev I、Map30/Goal/T05/Spec/UI002，设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户medium实现/high审查授权持续。dev新0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744、ui12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4。
088不可变REPORT SHA cb8364f5273675ae8deb02327e3178a84f0fba47d80a6fff36bf11101341e032，完整反例/tmp/huhu-t05-final-high-review/page-lifetime.dom.test.tsx及route-counter.log。真实TaskPage+TaskService：A脏→外部route B显示确认→外部route回A（仍在A），旧nextSelection B未清，点旧Discard后title=Beta、route仍alpha并丢A草稿；普通脏A→B确认对照绿。088已释放53输入，原084三项症状已闭；Root正式66/tmp/huhu-t05-lead-review-final已经passed，不覆盖该route序列。
## Workspace and Scope
仅src/modules/task/ui/TaskPage.tsx与task-domain.dom.test.tsx（或一个必要相邻DOM），REPORT与/tmp/huhu-t05-route-repair；以086当前真实dirty bytes/mode为baseline。Root预算/i18n入口、其它UI/core/services、资产/脚本/状态/Evidence只读。无委派/提交/index/worktree/node_modules/真实vault。
## Acceptance
消费每个真实新route意图时使旧待切换确认失效；新目标等于当前selected A撤旧B确认并保留A草稿，新目标不同则按最新目标建立一次dirty确认；旧Discard/迟到确认不能导航到过期目标。不要取消全部dirty保护或删effect依赖。真实1red/1green转绿，保留原4与086 route晚到等28DOM控制；外部A→B→A以及A→B→C用最小有意义测试，足够后停止，不扩推测状态树。scoped types/lint/--check适用，原图外债诚实说明。worker不跑全66/改CSS，Root最后一次正式矩阵在high复验后执行。
## Return
不可覆盖REPORT三节（聚焦交接/产物与验证/问题与下一步），实际red/green/命令退出/限制、两源起点/最终hashmode。过程仅/tmp，return校验后冻结停止待high。
