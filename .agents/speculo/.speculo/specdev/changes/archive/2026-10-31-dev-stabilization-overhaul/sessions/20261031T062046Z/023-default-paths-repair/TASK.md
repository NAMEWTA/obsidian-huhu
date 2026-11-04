---
schema_version: 2
session: "20261031T062046Z"
task: "023-default-paths-repair"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-16
---

## Goal
由 native:/root/bundle（Astra low）按020独立审查修复T16 F1/F2，保留原作者103项其余实现。先核对入口/调用方/依赖，发简短影响计划再改源码。Lead验收，baseline仍为独立reviewer。

## Inputs
Map16、dev/ui、Ticket16完整风险/约束、Spec AC191/192/902、ADR006/008、execution-boundaries、014 REPORT及020 REPORT两轴finding。T16当前review-input为旧103项候选，只用于基线，不要更新它或伪称修后仍匹配。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。唯一可写：src/modules/archives/core/generic/paths.ts、src/modules/archives/services/generic/application.test.ts、test/golden/default-paths.test.ts、src/modules/archives/archives.test.ts、src/modules/archives/ui/generic/archives-generic.dom.test.tsx，以及本REPORT。无Git写入/递归代理/共享生成物/词典/其它票写入。可用/tmp临时日志并回报完整命令/退出。T06十项已独立审查冻结，严禁再动。新范围先交Lead审定。

## Acceptance
F1先用当前真实旧自定义根集合（包含迁移记录/op/原文/<id>.md原字节备份、实际正式实体/旧schema/current指针）补真实失败，最小修复恢复原文不参与权威发现。禁止检测/移动/迁移旧默认huhu/档案树或改写旧备份；允许保护显式选定root内部已知恢复原文。既保留新migrations排除，也不让普通名字相似的合法实体误被排除。必须断言旧备份不入index、正式ID唯一、所有旧字节/指针不变、重建/切语言不改变。F2改用definition(typeId)或真实revisionId schema，先断言非空，再比revision/contentHash及实际记录revision可解析；证明旧错误会绿而新断言真检查。
同时修正020列出的两处既有弱测试：快速表单消失断言用当前实际翻译而不是旧中文；显式用户输入样本恢复中文档案/个人档案，不把默认重命名施加于自定义输入。只做这两项窄断言校正。
运行受影响最小Go无关Vitest集合（上述4测试文件）、测试类型与生产paths定向lint；不要重复355例或启动全量Go。报告全部红/绿/编译失败与真实命令，不把fixture失败冒充行为red。产物由Lead生成。

## Return
按coordination/report-template写聚焦交接/产物与验证/问题与下一步，包含exact changed paths+SHA和全部实际检查。完成后停写，由baseline对更新104项左右候选复审。
