---
schema_version: 2
session: "20261105T094057Z"
task: "123-repair-analytics-dates"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-08"
---
## Goal
medium补齐最后真实原生日期消费，repo只读/tmp候选，Root共享源码单写。仅共享AnalyticsRangeControl自定义范围仍有两个原生Input type=date，违反AC024；不动领域/日期引擎。
## Inputs
AGENTS/dev/ui/testing、Map47/Goal/Spec/T08/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。
Root源码检索确认src/ui/components/huhu/analytics/Analytics.tsx两个Input type=date真实DOM；Home Expense/Habit/Pomodoro/Reading等统计消费同一控件。PipelineCard虽有TextField type=date，但它是已有DateField适配并带受控raw，非原生输入，不要误改或让简单grep误报。
T03已公开DateRangeField{value:{from,to},onChange,required,...}，优先成熟唯一范围控件而非自建两日期验证；原period/anchor/previous/next/custom state与analyticsRange算法保持，合法完整范围回写state.custom{start,end}，非法/空/倒序不提交旧合法值或清成无界过滤。用户无旧UI兼容要求。
## Workspace and Scope
repo全只读，仅本REPORT+/tmp/huhu-analytics-date-repair；候选限src/ui/components/huhu/analytics/Analytics.tsx、就近Analytics.dom.test.tsx、必要T08 index.tsx/index.mjs新增实际共享AnalyticsRangeControl custom展示状态。Root已有T09/T11/T07/T10正式66并行，绝不改styles/assets或这些fixture/源；不要跑额外Chrome/全仓，私有Vite overlay可验证本候选，不能把私有通过叫workspace已合入。
新fixture状态只渲染真实控件+现有useAnalyticsRange组合，不造另一个范围算法/fixture假页面；现43状态/32registry不删。不需要修改日期公共API或任何词典（优先已有analytics.range/start/end键）。保存真实before/hashmode/proposed/完整patch，交付ready文件不再覆盖。
## Acceptance
自定义范围无原生日期，真实DateRangeField非法/倒序/required空/取消不提交，合法完整范围提交后保持统计筛选/previous计算语义；月/周/全部及方向动作不回归。DOM不冒充32/44像素，Root后续新增状态纳入T08实际native矩阵。最小充分，不扫无关重构；原Analytics其它export不动。
## Return
不可覆盖REPORT三节聚焦交接/产物与验证/问题与下一步，红绿实际命令与退出、旧风险映射、before/afterSHA/mode/私有边界/未验证项，return0释放。无state/Evidence/assets/index/源码写入、不委派。
