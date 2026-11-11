---
schema_version: 2
session: "20261025T043239Z"
task: "112-responses-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-09
---

# Responses 与共享维护最终候选独立审查

## Goal

由未参与产品实现的原 reviewer native:/root/recovery_review 对本轮最终 Responses 候选和必要共享维护给出独立标准轴、规范轴结论。沿原102已通过Chat基线审查真实新差异及可达影响闭包；不只看新增测试，不实施修复，不再委派。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map28/Goal27。用户LOG051及反复确认：全面28票55AC代码交付，真实模型/Obsidian/目标OS用户后验；不索凭证、不冒称现场通过、不以未运行现场验收阻塞代码门。按workspace/catalog、dev/testing/licensing和I双轴审查/风险/错误/异步规则实际执行，未变规则复用。

正式冻结输入由Root实际派发前写入evidence/T-09.md#review-input-responses-r1；只有一个scope/sources/exclusions JSON，其摘要由reviewInputDigest计算。副本与真实文件字节/模式清单为evidence/T-09-logs/review-input-responses-r1.json、review-freeze-responses-r1.json。两个轴使用同一正式Input-SHA256，不自行另造摘要。此TASK本身为冻结instructions，派发后不回填变化。

前序102 Chat报告与Root code-gate-chat-r2.json、097固定SDK研究矩阵、106已采用私有合同及107/108/109/110/111/113/114正式REPORT与各Root lead-return按实际影响回读；105未来Anthropic只作排除边界，不计实现。未改标准/底座/许可证按固定SHA和可达影响复用。Root最终Responses CLI/HAP/Host代码E2E及作者真实命令在冻结记录中导航；必须核实际输入及边界，不能把本地HTTP写成真实Provider。

## Workspace and Scope

业务源码、测试、Skill、正式Evidence/Map/Goal和他人报告全部只读，仅写本112 REPORT/logs及临时外部探针。审查最终工作副本及原基线，突出本轮相对已通过Chat的变化：common不可变Registry/协议State/兼容CP、共享HTTP准入与producer/结算生命周期、官方Responses原始有序items映射、默认Core装配与Broker pinned identity、单断言迁移、新SDK真实五平台许可闭包。Chat原wire及旧CP黄金样本应保持；全局API/SQL/HAP/TS未扩展协议细节。

Root授予唯一Go验证窗，固定Go1.26.10/GOWORKoff/readonly/GOEXPERIMENT空，normal CGO0、race CGO1；相关作者全部停写。自行选择有价值的真实反例与正常对照，记录命令/exit/actual Wait和源码/锁/模式漂移。沿生产入口检查，不机械重跑全部旧Go/race或不相关插件构建。发现新问题给Root/原owner，reviewer不越权改生产。无真实Provider/Vault/keyring、远程操作或发布。

## Acceptance

1. 分别独立pass/request-changes，不限制finding数量；每项给可证伪假设、真实入口及影响、文件行号、严重性、修复/验证建议，区分实测与静态判断。重点检查外部可见行为、完整工具批执行前校验、权限与并发/释放风险。
2. 旧Chat确由旧生产者捕获的2768字节CP、digest与前后请求保持，新Registry可Inspect/Resume；registry不接受无效/重复identity，构造失败调用方真实Stop→Done→Close，选择/Engine/Probe/Inspector/Broker metadata使用同一pinned协议。Fake注入兼容；缺凭证与未装配不混淆。110/114仅迁移两个默认装配过期测试，凭证失密/不可复用、单metadata GET/安全错误与显式selector负控不削弱。
3. Responses直接消费固定官方openai-go/v3 v3.44.0，显式base/key/client/retry0，无环境/云/redirect/fallback/远端历史权威。最终序列化body进入原Attempts；store/background关闭、include opaque reasoning、自动截断关闭、无内建/hosted执行。Probe只做受限metadata GET、严格model路径与空未知能力。
4. 完整有序items保留raw reasoning/content/encrypted/phase/caller字段和原ID/presence；item id与call_id区分，增量/完成顺序正确，重复文本不误去重。未知执行语义、畸形JSON/UTF8、错序/重复ID和无效第二工具在首Invoke之前拒绝。纯状态验证在Generate candidate、Inspector、Resume相同执行；CP原Intent与消息/轮数/投影/工具结果一致，外壳重算hash不能洗白。完整编码后1MiB限制和旧Chat字节兼容成立。
5. 跨审批/拒绝/重启恢复沿原effect/CP/decision，回放净化结果和原call_id，内部审批/授权或opaque内容不泄入公开History/错误。当前资格、撤权和预算每次重新检查，不能靠旧CP复活权限或重复物理写入。
6. terminal完整性与费用知识分开，usage缺失/null/部分/合法0/溢出正确处理；完整失败usage不退款，未知按原保守值。取消、超时、隐藏>=400 body、Do返回ctx取消、原始Body.Close、SDK Next、callback/timer、最后finished ACK和失败Settle重试全部真实join，Done不得提前。只复用107确实共享的helper覆盖，不用它冒称Responses特有producer路径已验。
7. 111实际五目标cmd编译闭包/完整新许可证/根生成通知相符；只把实际进入产物的包归入运行依赖，现行中文说明准确。未改NOTICE不机械要求JS重建；若变更则必须真实更新横幅产物。113仅修正行内代码与本机源码行号链接的检查语义，真正缺文件/越界路径/失效锚点仍须失败，冻结历史报告保持。最终全部产品平台资产仍归T27后续，当前只审本切片。
8. Root独立新构建CLI+私有凭证管道+生产TS/HAP/Host+真实SDK loopback覆盖文本、缺terminal、429、取消及后继Run、双工具批准/拒绝、历史重开；核物理HTTP/写次数、SQLite用量/effect/producer/pin/slot、自然进程退出与无输入漂移。受控Vault不是现场Obsidian；全部未运行项保持明确。

## Return

REPORT首h2前Session/Task/Status；standards-output、specification-output各有Reviewer: native:/root/recovery_review、Axis、Result、相同正式Input-SHA256、Observed。列发现及处置、原始探针/对照、实际字节/模式核验、来源与未验边界。所有启动的进程/SDK/body真实Wait后亲自return0、全部停写、MESSAGE+FINAL交回。Root全文核验并更新正式状态，不自行完成T09/T27或Goal。
