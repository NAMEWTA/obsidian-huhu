---
schema_version: 2
session: "20261025T043239Z"
task: "022-translated-license-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# T-27 翻译来源许可修复与冻结构建

## Goal
修复015 STD-01/SPEC-01：实际链接wasm2go/libc-gen TLSF翻译代码的MIT原文遗漏，保持未知/缺失/篡改失败策略。T27仍长生命周期in_progress，不提前done。

## Inputs
Map8/Goal7，当前dev/licensing/build/testing规则复用；完整回读015 REPORT和upstream-notice-probe.log、原013报告。用户已授权代码开发/修复与Agent Team，真实目标平台/Provider/Obsidian操作由用户后验，不索取秘密。实际工作区/root权限沿既有。固定来源链go-sqlite3-wasm/v6 v6.3.35304 d923b955a175c983578bd2196ce9ac0511f6159d → wasm2go0.4.15 c0a4be49ed2521303a8b47a8ccbe974da0444762 libc-gen/c/libc.c和malloc_tlsf.c，核对实际译入代码与许可，不只信reviewer摘要。

## Workspace and Scope
唯一原T27 writer build_integration；允许scripts/huhu-bot-notices.mjs及对应test、docs/third-party/huhu-bot.md、docs/third-party/licenses/go/**、生成THIRD-PARTY-NOTICES.md；后续授权窗口ignored native/huhubot/dist/**五目标构建/严格校验。本修复不改Go/schema/TS/package/lock/工程Skill/CI或预算，不把构建工具本体都误列运行依赖。保存完整原许可固定commit/sha，精确版本附加许可来源；SQLite publicdomain、MIT0 glue和译入MIT的边界据实际材料描述。先用真实上游固定来源建立遗漏反例，再完善登记和生成器。

016 Go和017 TS正在做两个窄修复（unicode codepoint和finite lease），生产依赖/schema不变；现在可以修你自有脚本/许可文本并跑隔离定向tests。不要启动全局notices/五目标构建/资产smoke，等root收齐两者freeze后给一次窗口，一次性生成新源码对应产物。原r2 dist已历史，不能据其hash宣称新Go构建通过。

## Acceptance
具体已链接TLSF的MIT全文出现在生成通知；精确来源/hash可回读，缺失/篡改/错误版本/未知来源确实失败。保持现有jsonschema/CLDR及5目标runtime闭包准确，正文生成不误计未消费构建工具。定向许可与完整huhu-bot-tooling，root窗口后notices/check-notices、五目标同源构建、15文件严格字段/checksum/source校验、Linux stdio smoke；不再次修改原已通过的无关实现。接着交独立工程补审，不自审通过。

## Return
仅本TASK REPORT/原始日志/hash及上述写集。REPORT首个h2前Session: 20261025T043239Z、Task: 022-translated-license-repair、Status: completed；三标题聚焦交接、产物与验证、问题与下一步。报告真实红绿和实际来源/许可文本hash、构建输入/资产hash、未验证项，保留旧015失败。最终validate-dispatch return0，所有writer/子进程结束后冻结返回；不修改正式Ticket/Map/Evidence，不再派遣，不提交/推送/发布。
