---
schema_version: 2
session: "20261105T094057Z"
task: "119-repair-whole-checks"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
medium诊断全仓实际失败并在/tmp提出最小可审修复，Root源码单写。优先反馈真实ownerDoc接缝，不将既有失败自动归咎本轮或乱改领域。
## Inputs
AGENTS/dev/ui/testing、Map44/Goal/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。
Root全pnpmtest仍跑，日志/tmp/huhu-whole-current-vitest.log：feedback.dom两失败 HUHU components require HuhuProviders，真实mountFeedbackRenderer在app/main.ts只给PortalContainerContext，新Toaster→useToastLayer→useOwnerDocument严格要求ownercontext。旧生产入口真实可达，需最小真实owner Doc上下文原子补齐，不改共享hook的严格要求/加global document fallback、不安装重复Toaster引起recursion。
同日志agent-backup/failure.test skipped-settings一个失败、host-editor.integration.test五失败需从实际完整堆栈读，不猜。可能host binary环境缺口；先确认已有构建/native fixture工具/真实输出。与UI无关的原有问题只报告证据和恢复办法，不扩大生产范围。116六测试Root已合入（私有→实际workspace），118high复验中，不碰它们。
## Workspace and Scope
repo源码全部只读，仅本REPORT及/tmp/huhu-whole-checks-repair，before/hashmode/proposed/patch。反馈提案精确src/app/main.ts和必要src/host/obsidian/feedback.dom.test.tsx；backup提案限test/agent-backup/failure.test.ts；native fixture若只有环境则报告真实命令/需要变量，未经Root明确写集不改Rust/生命周期或调大timeout。读取全log末次结果，发现其他实际失败先发精确清单供Root分配。
可用116同种Vite私有候选替换验证，明确不是workspace已合入。不写source/assets/state/Evidence/index，不委派/启动用户库/账号/联网helper下载。
## Acceptance
反馈真实main/second Doc100更新、关闭与Notice fallback不回归；先原反例红再单变量候选绿，独立Owner/Portal上下文正确、保惰性imports不加eagerUI依赖。backup只修stale fixture预期若实际证据支持，真实skip-settings不得改变device；native问题区分构建环境与产品fail。保所有风险断言，不skip/延timeout/吞console errors。
## Return
不可覆盖REPORT三节聚焦交接/产物与验证/问题与下一步，真实症状/归因或未知/每项红绿命令退出、before/afterhashmode、private vs workspace边界、未解决项，return0停写。
