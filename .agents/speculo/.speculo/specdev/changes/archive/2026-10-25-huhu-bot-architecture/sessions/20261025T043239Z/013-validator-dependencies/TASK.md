---
schema_version: 2
session: "20261025T043239Z"
task: "013-validator-dependencies"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# 运行时 validator 依赖与许可接纳

## Goal
为T-01独立审查缺陷修复接纳真实运行时validator依赖。TS owner已核官方维护活动/固定MIT文本，Lead选择runtime Ajv2020直接消费唯一schema（不生成TS/JS副本）。Go owner采用jsonschema/v6。同范围实现授权持续，无提交发布。

## Inputs
Map7→现行dev/license/build/testing→T-27；008 review、011 Go与012 TS修复TASK；向owner索取实际固定来源/版本/闭包，不从根许可推导全部文件许可。当前TS API模块尚未进入main bundle，许可必须按真实分发闭包，不假列未打包npm。

## Workspace and Scope
同根 /home/wta/orca/workspaces/obsidian-huhu/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715。本任务可写package.json、pnpm-lock.yaml、scripts/huhu-bot-notices.mjs及既有许可测试、docs/third-party/huhu-bot.md/必要固定许可文本和THIRD-PARTY-NOTICES.md（后者仅Lead给冻结窗口时）。Go go.mod/go.sum由foundation_go唯一写；TS/core/schema/规则/正式状态Evidence只读。不要新增TS生成器、不要改dev/UI规则或eslint；如真实必要先消息Lead。报告/日志仅本TASK。

## Acceptance
先安装runtime精确依赖 ajv=8.20.0、ajv-formats=3.0.1（save-exact），检查lock只产生必要变化，立即通知TS owner与Lead可以运行依赖测试。TS owner已暂停依赖测试，源码可继续写；npm安装不需要等Go修复。Go owner新增github.com/santhosh-tekuri/jsonschema/v6 v6.0.3（Apache-2.0，2026-06-28），传递x/text具体版本以实际go.mod为准；扩展严格runtime许可登记与完整LICENSE/NOTICE并跑正反例。保持未知/限制性/不完整许可失败，不能降低门禁。

root依赖与脚本可先完成，go图实际稳定后扫描；生成notices和最终全target构建待Lead给TS/Go冻结窗口。本次不要擅自全局build或用半成品源码生成最终资产。后续可能保持本TASK活动等窗口，若超过必要等待先报告阶段交回释放writer。

## Return
REPORT按coordination模板ASCII Session/Task/Status与聚焦交接/产物与验证/问题与下一步，记录版本/真实来源/锁摘要/实际命令与未跑项。return检查通过，停止writer；T-27仍未done，不再派遣。
