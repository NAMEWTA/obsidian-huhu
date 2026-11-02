---
schema_version: 2
session: "20261025T043239Z"
task: "062-native-fixture-lint"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# 原生集成夹具的 lint 范围接入

## Goal
原 /root/build_integration 在 T27 已授权 eslint.config.mts owner 内，修复当前全仓 lint 的两个真实配置错误；不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。AGENTS、dev对应测试/构建规则、Map16/Goal15、T27、I及当前LOG082。Root `evidence/T-07-logs/lead-lint-r2.log` 实际exit126/Wait，只有 native/huhubot/tests/contract/effect-reconcile/{host,obsidian}-fixture.mjs 两项 projectService 不在TS项目错误。相同输入151 TS全通过、build通过；不要重复已通过的Go/Host/TS/build。

## Workspace and Scope
唯一可写仓库文件 eslint.config.mts，及自己的TASK/REPORT/log。原两个MJS是Go测试运行的受控Node/Obsidian边界夹具，含测试时__REPO__替换，与已有scripts/**、test/**、*.test.ts同属非插件TS项目；生产HAP/Host代码仍在src。沿既有lint范围约定为这两个精确路径补带理由的范围声明，不扩大native/**或src忽略，不放宽生产规则，不移动文件或改tsconfig/API/锁。若实际需要其他路径先报告Root。其他作者报告/日志/正式状态/产物只读，不提交推送发布。

## Acceptance
完整读原失败、当前配置、两夹具的调用方式，保存旧配置SHA与精确diff。验证两夹具遵循既有测试工具范围，邻近生产connection.ts/obsidian-host.ts仍被检查且生产规则未变。作者只做配置与范围验证，Root完成唯一全仓lint重跑；不以被忽略文件lint退出0证明其行为，通过的真实Go→Node集成证据继续保留。自有进程结束Wait后返回。

## Return
REPORT首h2前Session/Task/Status准确，提供配置旧/新SHA、实际范围验证命令/输出/退出、原失败处置与未重跑检查。return0后真实MESSAGE+FINAL，停写。T27完整构建发行资产及真实操作仍未完成。
