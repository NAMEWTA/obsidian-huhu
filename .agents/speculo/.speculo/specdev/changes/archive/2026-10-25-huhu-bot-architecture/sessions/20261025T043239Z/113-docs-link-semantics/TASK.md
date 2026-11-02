---
schema_version: 2
session: "20261025T043239Z"
task: "113-docs-link-semantics"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# 文档检查器的代码跨度与本机源码链接

## Goal

由原 T27/checker 作者 native:/root/build_integration 修复111真实docs失败中两项检查器语义问题：行内代码中的Go数组类型被当作引用链接，应用支持的本机源码路径行号被当作文件名。保留全部真实失效链接检查；不改冻结历史REPORT或技术合同。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map27/Goal26。用户已授权28票55AC代码开发、代码总验收和Agent Team；真实Provider/Obsidian/目标OS用户后验。无提交、推送、发布、归档。沿已接纳103 checker和111当前结果，实际原红为111/logs/11-docs.log（inner1/outer126/Wait）。

106/logs/interface-contract.md第91行的Go类型处于合法行内代码内；110 REPORT第11行的绝对本机源码链接使用应用支持的`:98`行号。两者是冻结交接材料，不回写消除失败。T06两个真正过期的锚点由Root维护，仍须被检查器识别为缺失直到实际修正。沿未变workspace/catalog、dev/testing、I/preflight/异步与证据规则，实际回读本次相关源码与原测试，不递归扩读。

## Workspace and Scope

仅写原T27已登记的scripts/documentation-policy.mjs、scripts/verify-docs.mjs、test/release/documentation-checker.test.ts、test/release/documentation-policy.test.ts及本113 REPORT/logs。四个业务文件先保准确before/摘要；其他源码、测试、锁、许可、main/styles、Skill和正式状态只读。106/110原报告、合同及原始失败不可改；不再委派。不使用Go、不生成通知、不构建插件。轻量Node/pnpm相关检查可自行运行并实际Wait。

## Acceptance

1. 先以真实checker入口及原测试设施复现两项失败，区分根目录4项原失败与各精确语义控制；语法/工具错误不算行为红灯。
2. Markdown代码跨度中的链接外观不视为链接。保留围栏、相邻真实链接、引用定义、未闭合/不同长度反引号及正常行内代码边界的正确行为；不按文件名/目录/特定文本跳过106，不删除真实链接验证。
3. 本机源码链接的行号语法只在明确合法的本地文件目标使用，仍验证真实底层文件存在且路径在仓库内；缺文件/逃出仓库/无效语法应失败。真实含冒号文件名不应被随意截断。不要降低普通Markdown锚点或外链处理的现有标准。
4. 运行有意义的正负控制及受影响原checker/policy测试，最后完整pnpm test:docs。先通知Root执行最终docs前置已就绪；Root维护T06后再记录最终结果。原111失败保持原样；真实链接如果仍失败报告具体项，不修改检查器掩盖。
5. 未改变产品或业务验收标准，不扩大分类豁免，不改包/锁或引入解析依赖。给出准确写集/差异、命令/实际Wait、输入摘要与未运行项。此维护不宣布T27或全Goal完成。

## Return

REPORT首h2前Session/Task/Status，包含聚焦交接、产物与验证、问题与下一步。亲自validate-dispatch return0，停写并原生MESSAGE+FINAL。Root实际核验后将四文件维护纳入112独立审查的最终固定输入；冻结前不得冒称审查通过。
