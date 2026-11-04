---
schema_version: 2
session: "20261031T062046Z"
task: "020-default-paths-review"
kind: review
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-16
---

## Goal
T18完成停写后，native:/root/baseline作为未参与T16实现的独立Astra low reviewer，对固定103项双轴审查。Lead验收。无需提前中断未完成019测试；019报告交回后直接执行本任务。

## Inputs
Map16、dev/ui Skill、完整Ticket16风险/路径、Spec AC191/192/902、ADR006/008、DESIGN UI-GALLERY与execution-boundaries。014 REPORT、T16 Evidence全部偏差/名称表和review-input。Input-SHA256 8e239f7f124f5685fd6e48179db31ca420680ebd5bee993e441dd6f84b86967f。规范source以显式Ticket section冻结，status/checkbox变化不改内容；读取所有真实文件hash并核对，不只看REPORT。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa，仅写本REPORT，其余全只读。103项已停写，T06/T18其他写集互不交。你只实施T23/T18，未实现T16；如发现独立性或hash失效立即报告。无Git、递归代理、真实Obsidian或修复。

## Acceptance
审实际diff/入口/调用方/依赖：可见固定路径单表英小写、用户中文/空格/自定义根安全语义不变；旧中文树无自动探测/迁移/读写；隐藏automations fallback与Browser常量/消费者保持。新的labelKey/forward/inverse等严格合法范围、稳定机器ID/路径/revision不随语言变，用户编辑label清元数据，原v1完整集合/自定义label/当前指针字节不写；新v2和legacy虚拟投影不形成duplicate-id/覆盖authority。文件/目录/并发create碰撞不覆盖、CSV创建真正无覆盖；真实临时目录fixture有非空记录和重建，不仅空Map。Inbox真实空标题入口不先翻译；period设置预览及12现役docs与生成路径一致。测试更新只对实际默认路径，不洗掉自定义/旧数据保护，排除表诚实。

两轴原始输出需显式anchor original-standards-output / original-specification-output，Reviewer native:/root/baseline、Axis、Result pass或request-changes、Input-SHA256、Observed，finding具体行号/触发/影响/严重度。可跑必要轻量窄测试，不能把已执行355例都复制成自己运行；不为T37预算尚未关闭假报最终全局通过。

## Return
coordination/report-template含聚焦交接/产物与验证/问题与下一步和两轴，完成停写；不直接改production，finding交Lead窄修复。
