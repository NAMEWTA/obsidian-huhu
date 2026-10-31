---
schema_version: 2
session: "20261025T043239Z"
task: "102-chat-repair-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# Chat 修复后完整候选独立复审

## Goal

由未参与本次实现的原098 reviewer native:/root/recovery_review 对最终Chat候选独立给出标准、规范两轴结论，检查F-098-01/02修复及完整可达链。原098真实失败与证据保留；不是只审核作者新增测试。不修改产品，不再委派。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map25/Goal24。用户已明确全28票55AC代码开发与Agent Team；再次确认真实模型、Obsidian、目标OS由用户后验，不索凭证，不以现场未运行阻塞代码门，不声称现场通过。AGENTS workspace/catalog、实际dev/testing/licensing及I审查/错误/可靠性规则仍适用。

正式冻结输入为 evidence/T-08.md#review-input-chat-r2，恰好一个含scope/sources/exclusions的JSON，以reviewInputDigest计算；副本及实际文件字节清单在 evidence/T-08-logs/review-freeze-chat-r2.json、review-input-chat-r2.json。从冻结记录读取Input-SHA256并在两个轴原文使用同一值，不沿用098自定义SHA。此TASK自身属于冻结instructions，不回填摘要形成循环。

完整原098 TASK/REPORT和原反例01/02复用；未改变的标准、许可证及底座证据可逐SHA/影响闭包复用，不能把原vet/架构绿当两缺陷已修。原作者092/093/094/095/096及100/101/103 REPORT、各Root lead-return必须按本次变动回读。Root已亲自接纳100、101、103最终原生交回/return0并核自有字节无漂移。

## Workspace and Scope

冻结实际工作副本、原基线至完整当前交付；审查整个可达调用闭包，旧098不受影响结果可复用，新输入必须审核。关键改动是100的common checkpoint/engine及Chat原始UTF8观察器和测试；101的两内部Intent字段、同Tx读取execution_runs.intent、Broker透传与真实恢复测试；103的精确顿号slug及native testdata文档分类/正负控。095依赖闭包保持固定版本，103只替换原七docs误报；104独立仅对097报告展示维护，不改本次产品输入。

业务源码/测试、Skill、正式Evidence/Map/Goal和他人报告只读，只写本102 REPORT/log、外部固定副本定向探针。Root授予唯一Go检查窗口；固定Go1.26.10/GOWORKoff/GOFLAGS=-mod=readonly/GOEXPERIMENT空，常规CGO0、race实际CGO1。自行选择有价值的反例或正常对照，保留真实命令/退出/Wait；不要机械重跑未失效全模块/旧大队列。源/锁/模式/HEAD变化及时通知Root。无真实Provider/Vault/keyring、提交推送发布归档。

## Acceptance

1. 原098完整审查合同继续适用，两轴独立pass或request-changes，不限制finding数量。每项给可证伪假设、真实可达入口与影响、路径行号、严重性、最小修复/验证；实测与源码判断分开。无需重复研究固定SDK。
2. F-098-01：纯Inspector和实际Resume都使用独立原受理Intent；同Tx来源不从CP推导，不新增正文事实源；替换有效新CP中的最后初始user内容必须在再次Resolve/HTTP/工具前拒绝。正常批准、拒绝及合法历史刷新继续工作，原Run/config/decision/callID不变，不谎称已鉴定没有独立基线的完整历史。
3. F-098-02：解压后原始wire先于SDK JSON替换校验UTF8，跨Read合法多字节/合法U+FFFD正常，非法字节和EOF不完整后缀拒绝；整批第二项坏字节时首Invoke前失败，SQL effect/approval为0。确认错误未知usage保守结算、真正producer Close ACK及Core Done无回退，大小/idle/取消边界保留。
4. 作者实际100 normal8顶层、race3顶层，101精确恢复透传normal均0/Wait、输入无漂移。default_*日志invocations=0仅未安装计数器的默认值，不作Invoke0证据；精确计数来自byte_*真实Broker包装，default真实SQL零事实独立可用。保留098的原红，不制造假新红。
5. Root r4重新构建默认CLI与TS/HAP/SDK/生产Host的本地E2E：evidence/T-08-logs/lead-chat-e2e-r4.json，1988输入35d4e3d2ddcad4969d7b8d121d4663f25e3e7bd2024d53390f8ea1f60e148836，Go build0/4.280s、TS0/.794s、实际CLIprobe0/2.064s均Wait，7POST/1metadata、两自然exit0、仅一次批准物理Vault写、7settled producer1、known4总58/unknown3总13102、pins/slots/reserved0、integrityok/FK[]。受控Vault不是Obsidian现场；原r1/r2探针错误/r3历史正常保留。
6. 103仅四文件，不扩大忽略范围或改原输入；真实checker正负控5/5。原095七红已消失，103实际docs余097两展示错误inner1/outer126，104修正原件前后字节保留，Root最终docs另提供实际回执。此slice可判断，但T27尚待全部最终依赖/发行输入，不宣布全T27通过。

## Return

REPORT首h2前Session/Task/Status；standards-output、specification-output独立锚点各含Reviewer: native:/root/recovery_review、Axis、Result、Input-SHA256（本次正式冻结值）、Observed。列finding处置及事实/限制、原始探针与对照、字节/模式复核。所有实际子进程、SDK/body/worker真实Wait/结束后，亲自return0、全部停写、native MESSAGE+FINAL。Root全文回读后决定正式票据/代码门，不自行宣布后续票或Goal完成。
