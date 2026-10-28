---
schema_version: 2
session: "20261025T043239Z"
task: "067-draft-link-maintenance"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# 原042报告草稿的四个相对链接维护

## Goal
原 /root/foundation_go 只修正自己042交接草稿的四个错误相对链接，为本Goal最终文档一致性收尾。只有Root实际followup_task启动，不再委派。不是T27整票验收或新生产窗口。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map16/Goal15、LOG051。按AGENTS发现及适用文档规则读取；纯会话草稿修正不要求插件build/test。

现059对257产品文件/65来源冻结审查，独占重测试窗口；所有产品源码、测试、schema、工程规则、产物和冻结来源保持不动。原058已记录test:docs十个发现，其中六个是原用户输入锚点，另外四个是本Goal引入的042草稿链接；不能把这四项声称为任务前已有。

## Workspace and Scope
唯一旧文件可写：sessions/20261025T043239Z/042-approval-implementation/logs/report-draft.md（相对本change），当前SHA256 29d2702ce0ec7074b7a29cd9f20b86c46ba1e87c4cdc75bbc2f9f3c68ed2fa60。四个目标 owned-source.json、changes-from-t03-r2.json、joint-source-final.json、protected-inputs.json 都已实际位于同一个logs目录；当前URL多写一层logs/。只改这四个链接目标，不更正文/占位符/事实或label，不把草稿改成最终报告。

先在067自有目录以 .txt 保存原始完整字节和SHA，再执行四个精准替换。042最终REPORT SHA a118582e2853583ee70ccc9bb1b15892a906f36d0ef014c1e23d8285b5a6649a 以及所有原始日志/快照/Evidence保持不变；历史输入按原摘要保留，067说明本次文档维护即可。可写067自有REPORT/原始byte副本/patch/校验manifest。其他文件一律只读，不commit/push/release。

## Acceptance
轻量验证四个URL从草稿所在目录实际解析到四个既存文件；精确替换可逐字节反推原SHA，最终REPORT和冻结产品/来源未变。不要运行全仓test:docs、build、测试或产品进程以免干扰059；Root在当前审查结束后的适用窗口统一验证文档发现集。原历史十项失败不抹除，本切片不宣称全仓文档已通过。

## Return
REPORT首h2前Session: 20261025T043239Z、Task: 067-draft-link-maintenance、Status准确。列实际改动、原/新SHA、保护摘要、精确patch和轻量校验命令exit；return结构校验0后MESSAGE与FINAL，停写。不能替Root接纳或宣称T27完成。
