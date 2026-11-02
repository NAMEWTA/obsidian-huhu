---
schema_version: 2
session: "20261026T045732Z"
task: "005-t08-profile-test-cleanup"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；沿原003实施身份与用户指定gpt-6.1-sol/xhigh，完成Root发现的测试资源收束。用户已授权本change完整18票实施与Agent Team；同一T08局部修正，不代表整票完成。不派子Agent。

## Inputs

复用本session 003的真实Work/Skill与已读未变规则：SpecDev I、dev/testing；先核workspace/catalog及必要变化。当前GP026/Map27、HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal，唯一工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`。原003 REPORT已完成且SOURCE STOPPED；Root已回读接受三路径候选，evidence/T-08-profile-root-audit.json SHA54f2fdc5cac612b07604175b1cd98b5a9b9cc0f604a27b96e4f98bbb525c3ea7。当前测试源SHA167c801977c3e577c769658152ab2d214de426ea6035dc0d9c84c669a63cae5c；生产TS与profile不得修改。C的完整shared文件仍在收尾并可能加法变化，仅Recipe子接口保持原758cdb...冻结事实。

## Workspace and Scope

仅产品写路径 `src/modules/agent/platform/desktop/agents/program-identity.test.ts`，仅改每用例installation()新建的独立tmp目录收束；测试成功/断言失败/复制失败都要清理本用例刚创建的目录，不在进程退出后留下每份约25MB安装副本。使用真实Vitest生命周期，保留完整官方正反例与33项原断言，不新增与实现镜像的测试，不为这项测试卫生修改制造形式red。绝不扫描删除以前huhu-t08-profile-case目录、任何证据/官方原件/其他人的tmp。已保存历史日志/失败/快照均保留。

另可写自己的新 `/tmp/huhu-t08-profile-cleanup-*` 与本TASK指定REPORT；全部其他产品源、shared/generated、Root正式状态/Evidence、Git index、main/styles/budget/notices、package/lock/node_modules只读。不得根构建、全仓检查、提交/推送/发布/归档、操作真实库/HOME/账号。需要扩大范围先通知Root。

## Acceptance

实际运行完整33项官方artifact定向Vitest，提供新建fixture目录清理观察与源前后SHA、argv/cwd/UTC/exit/raw log。使用003相同Node/pnpm与只读官方根 `/tmp/huhu-t08-b-producer-proof`，不得skip正例。按测试类型变化运行必要隔离types；生产未改，不重跑无关生产lint或官方原件producer实验。Root保有整票整合/build/独立审查，真实Obsidian/Provider/五平台由用户验收。

## Return

通过collaboration发给/root，最终独占一次性写 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/005-t08-profile-test-cleanup/REPORT.md`；沿report-template，声明SOURCE STOPPED、单路径最终SHA、真实检查/清理结果与未验边界。TASK冻结，不改003报告或正式Evidence；不猜session-locator。
