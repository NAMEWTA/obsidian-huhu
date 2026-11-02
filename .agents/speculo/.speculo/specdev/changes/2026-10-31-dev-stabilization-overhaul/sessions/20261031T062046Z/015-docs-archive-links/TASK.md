---
schema_version: 2
session: "20261031T062046Z"
task: "015-docs-archive-links"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-03
---

## Goal
Astra low修复T03必需docs门的12处现有归档相对链接解析，保留历史不可变档案，不掩盖断链。

## Inputs
Map revision11、Ticket03、Evidence T03的T03-DOC-01批准、dev/testing与research/source合同；已有003来源REPORT与当前docs参考候选只读。Root已读A归档技能确认历史不可改，当前只修检查器不是A写历史。

## Workspace and Scope
唯一current dev /home/wta/projects/obsidian-huhu，base86c500556db1d64865c4cc7f1aff1dd83de071fa。仅scripts/documentation-policy.mjs、scripts/verify-docs.mjs、test/release/documentation-policy.test.ts、test/release/documentation-checker.test.ts及本REPORT；其余源码/参考文档/历史归档/receipt/永久Design只读。禁止Git、递归代理、Browser、生成物、Ticket/Evidence/ledger。

## Acceptance
先读检查器实际解析、跑pnpm test:docs保留当前12真红灯。已核实archives多一层，两个目录archive/2026-10-25-agent-workbench-refactor与archive/2026-10-25-huhu-bot-architecture的archive-receipt.md有Source changes/<id>、Target changes/archive/<id>、Result:moved。已有archive-reference-map.json存8项，其余4项带file:line。先按当前路径查；仅真实合法移动收据可证明的旧origin作为fallback，仍须repo内/目标真实存在/真实anchor有效/无symlink越界，不能猜origin。无收据/不合法收据/主动文档断链/真实缺失/坏anchor/越界仍失败。不要批量ignore归档或添加错误白名单。检查器不修改任何文档。现有日志文件策略不扩张。

范围最小，保留当前相对链接和file:line语义，测试应覆盖有效移动与上述负向行为。pnpm test:docs、test:license-texts、check:notices、相关测试、lint（新增工具位于现有scripts ESLint区域）实际运行；不需插件构建。

## Return
coordination/report-template.md，实际根因/修改范围/命令退出/红绿/残余、停写候选摘要。Lead双轴审查验收。旧失败与早期来源许可未核实边界不改写成成功。
