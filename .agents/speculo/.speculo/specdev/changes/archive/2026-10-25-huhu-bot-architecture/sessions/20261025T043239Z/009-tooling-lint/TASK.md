---
schema_version: 2
session: "20261025T043239Z"
task: "009-tooling-lint"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# T-27 构建生成器 lint 接缝修正

## Goal
修复全仓 pnpm lint 当前唯一 projectService 错误：contracts/hap/v0.1/generate.mjs 为Node构建工具，不在TS插件project内。用户完整实施与同范围修复授权已持续有效，无提交发布。T-01审查中，其37文件和dev规则必须保持冻结。

## Inputs
Map revision7 → dev现行规则 → T-27；008独立review进行中。Lead全量build已0；evidence/T-01-logs/lint.log为原始失败。现有scripts/**工具全局忽略，而contracts新生成器被误应用Obsidian插件类型规则；回读eslint.config.mts做最小准确分类，优先沿现有工具边界，若局部例外务必注释理由，不能削弱src/插件规则。

## Workspace and Scope
同一 /home/wta/orca/workspaces/obsidian-huhu/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715。唯一允许生产写集 eslint.config.mts；其他生产/Go/TS/schema/规则/状态/Evidence只读。可写本TASK REPORT/日志，不改TASK。不要修改generate.mjs来绕过工程边界，更不改冻结来源。

## Acceptance
pnpm lint完整执行0、零警告。无需重跑未受影响build/Go。检查配置diff保证既有src规则保持原义，报告实际命令与结果，停止writer，不再派遣。

## Return
REPORT按coordination/report-template.md，ASCII Session/Task/Status及三个中文必需二级标题；validate-dispatch --stage return通过，Lead负责状态和Evidence。
