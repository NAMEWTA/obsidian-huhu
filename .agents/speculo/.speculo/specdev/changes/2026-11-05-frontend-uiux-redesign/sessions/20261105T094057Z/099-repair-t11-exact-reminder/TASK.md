---
schema_version: 2
session: "20261105T094057Z"
task: "099-repair-t11-exact-reminder"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-11"
---
## Goal
medium窄修096实际跨票回归：通知列表的完全相同title/body重复渲染。不是重做通知或放松旧语言/精确去重断言。
## Inputs
AGENTS/dev/ui、SpecDev I、Map35/Spec/T11/已批准UI002。097独立关闭090四项并pass，原44候选已释放。096正在迁移原automation.test.ts的真实provider（Map33授权），当前唯一红为Exact reminder 2 != 1：实际InboxPanel.tsx约228/237直接title加notificationBody(record)。原行为应仅完全相同正文省略，尾空格不同仍保留；原旧测试语言zh/en/zh、structured reasons/原free text、Open/时间/投递均保留。过程/tmp/huhu-t07-navigation-repair/inbox-migration4.log，worker repair_t07可直接协调。
## Workspace and Scope
仅src/modules/notifications/ui/InboxPanel.tsx与必要相邻dom测试；过程/tmp/huhu-t11-exact-reminder。不要写正在由repair_t07独占的automation.test.ts。Root在T09/T11 fixture和quick-pick.test-support补测试IO，属于明确Root叠加，不变更生产services/data/crypto。全局词典/资产/state/Evidence/index只读，无delegation/commit/worktree。
## Acceptance
最小保留完全相同文本去重，不trim或普遍移除正文，区别Different与Different尾空格；实际notificationBody语言映射依然每次真实渲染。补一个最小真实DOM去重/不同文本控制，原跨票测试应转绿。通知受影响DOM/types/lint适量，未变安全域不重跑。生产修改足够即冻结；通知repair_t07组合重跑。Root仍负责native66，不更改其断言求绿。
## Return
不可覆盖REPORT三节聚焦交接/产物与验证/问题与下一步，实际baseline与最终sourcehash/mode、原红终绿、必要命令/局限。完整原44候选只增加必要新test且明确Root test IO补充。return验证后停止待high。
