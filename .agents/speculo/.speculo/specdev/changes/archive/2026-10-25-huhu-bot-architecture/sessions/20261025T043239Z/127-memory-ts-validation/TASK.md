---
schema_version: 2
session: "20261025T043239Z"
task: "127-memory-ts-validation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# Memory 严格 TS 字节消费者

## Goal

原T01 TS owner native:/root/foundation_client 为125唯一schema实现Memory方法的必要UTF8字节/来源合计/页编码校验，真实客户端拒绝不合法输入/响应。不是UI开发；不激活T20–25。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map31/Goal30/LOG118，T01/T03/T14 active；115合同SHA406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4、123合同SHA68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b已Root接纳。你124已接纳，六页不在本任务范围。125原foundation_go维护Go DTO/helper/严格router/标准schema/fixtures/generator，已确认标准JSONschema maxLength按码点不能代替115/123 UTF8 bytes。

沿Map→dev→T01→Goal和I/TDD/边界规则；复用未变已读规则。当前125持唯一Go/产品检查窗口，你先只读合同/current MethodValidation及125逐步输出、仅自己目录可写。**须Root通知125稳定schema和你的产品写/Node验证窗口后才编辑产品/测试或运行检查**。实际派遣不授修改共享schema/生成输出，原作者自己负责。

## Workspace and Scope

只可写 src/modules/huhubot/core/protocol/method-validation.ts 和新增同目录 memory-validation.test.ts；及本目录REPORT/logs/manifest。现method-validation.test.ts/fixtures/schema/generator/api.ts由125唯一维护，其他TS/Go、UI/Core、main/styles、root配置/锁、旧报告、正式Evidence/Map/Goal/TASK均只读。

生产最小改动：Ajv原严格结构校验通过后，仅memory八方法的params/result调用私有纯byte/合计验证，保72方法/144上限和懒编译、不coerce/mutate。不要修改JSONschema标准语义或把runtime实现塞api.ts，不引Node/Buffer/Obsidian/SDK到core。若原库已有合适UTF8工具可按允许导入边界复用；陌生依赖不引入。

## Acceptance

1. 和125Go端一致：Text/query/cursor/ID与命令字段实际UTF8 bytes、单object/总page编码预算、来源与Scope合计/Derived/Grant/Group界限，以及context实际entry片段≤4096/合法偏移/不与Source原Hash混淆；标准schema负责严格分支/类型，额外validator只补确实未表达的byte/合计义务，不添加不在115/123的产品限制。始终有界，不深递归扫任意JSON，未知形状先由Ajv拒绝。
2. 合法中文/组合emoji在精确byte边界通过，超过一字节/码点差异拒绝；JSON转义后的page实际bytes与源Text bytes分别控制。字符串编码非法、null、非匹配Kind、redacted/forgotten无旧body等与Go/标准schema一致，发现差异给125精确fixture，不假称所有Unicode已支持。数据保持原字节/对象，不自动截断、归一化或丢来源。
3. 真实MethodValidation公共方法consumer红→绿，params和result、页/单项/刚好边界、非memory负控、lazy144cache不变。复用125共享样本的真实新版本；不把标准Ajv通过或生成类型编译等同语义校验。必要时用真实BotClient/codec受控通道证明失败响应被拒（不要改这些生产文件）。不用mock校验函数制造绿色。
4. Node/Vitest/定向TS检查由Root独占窗口通知后执行，固定输入/原日志/actual exit和Wait；禁止Go/check全仓/构建产物，最终lint/build由T27原owner窗口收口。不改既有测试/fixtures去迁就实现，所需样本让125写。

## Return

先ACK并确认只读等待125schema。持续给125/Root最小字段/边界问题，产品窗口得到后完成这两文件。REPORT首h2前Session/Task/Status与聚焦交接、产物与验证、问题与下一步；精确源SHA、实际红绿/固定输入/每命令exit+Wait/未验边界，manifest。亲自return校验0后原生MESSAGE+FINAL并停写。不提交推送发布归档、不再委派、不索真实凭证，现场用户后验。
