---
schema_version: 2
session: "20261025T043239Z"
task: "162-global-memory-delivery"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-04
---

# 待确认提案的当前物理投递门

## Goal

原T04/T05 owner native:/root/credential_provider 接全局提案独立delivery subject与当前source/provider资格，保证排队的旧预览在撤权、决议或过期后不会物理发出。只改必要事件/权限边界，不接管015或HAP/Core。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map41/Goal40。完整28票55AC和Agent Team实现授权持续，真实Provider/Obsidian/目标OS用户后验，不索凭证、不提交推送发布归档。T14已在d52ab固定2141文件/59来源经159双轴pass及Root code-gate-memory-full-r3接纳；本票只为T15新范围重开原owner，不抹旧门或旧红。当前真实基线为T-15-logs/review-baseline-global-r1.json/.zip。

按workspace/catalog→Map→dev/testing/architecture→本票及T15→I所需codebase-design/TDD/agent-experience/并发门；复用已读未变规则。读158 global-memory-contract.md与158-lead-return.json、160实际contract checkpoint，当前Spec/ADR/ARCHITECTURE唯一权威。Root两项细化：unknown AllowedTools配置兼容不普遍收紧；owner确认不依赖ManagedOwner，普通/managed受信任本机stdio用明确owner能力，模型仅proposer。


## Workspace and Scope

可写native/huhubot/internal/adapters/outbound/sqlite/events/store.go及必要global_delivery.go/global_delivery_test.go，tests/contract/events/global_memory_test.go；grants/memory.go及同目录global_memory_test.go，tests/contract/access/global_memory_test.go。API/Memory/globalmemory/015/Core/HAP/stdio/Engine/锁/生成全部只读。可写162自身REPORT/logs/manifest/contract与/tmp。

当前source-only：160持api+stdlib纯组件窗口，161只写Memory闭包外源码；不运行Go/go list/DB/CLI/race。先与160/161协调确切只读proposal reader签名（adapter的现有Tx+identity+proposalID返回deadline/error），source-only可推进。新shared/API需求精确回Root和160，不自己新增另一份公共类型。原157工件停写不可重写。

## Acceptance

1. 新Kind memory_proposal不能伪装为memory_revision。events注入窄只读proposal reader，WithDelivery持当前Grant read fence、现有250ms门与同一Tx检查owner/pending/expiry/preview target/source现状；缺reader/unknown kind明确拒绝。不在Events内复制015/source资格SQL或开nestedTx。
2. mixed subject全部检查、最短deadline，SQL先结束而delivery gate仍覆盖实际write；revoke/reject/expiry与queued frame交错应保证零旧正文泄漏。无需假造memory revision ID；终态body-free stub无需敏感subject，但不能凭错误标志让带正文逃检查。HAP subject采集由T01后续实现，给其精确要求和真实测试接缝。
3. 审核grants当前global事实是否按接收Run read/send、scope和完整祖先检查。只在实际缺口时最小修复，不因global共有而自动授权所有Provider或继承别Bot private；creator来源的限制保留。无缺口则保留生产字节并给当前代码依据。
4. 有意义的当前门测试：pending真实reader正控、writer等待后revoke/reject/expiry负控、mixed batch、缺reader/unknown主体、Stop/cancel/deadline资源回收。测试阶段可注入受控reader固定门竞态，明确组件边界；015/Core/HAP真实组合由Root最终验收，不能凭fake签通过。
5. 不重跑旧157凭证诊断，原未就绪原因unconfirmed保持。实际Go窗口到达前不声称red/green；准备测试与源码后先给checkpoint/精确检查闭包需求，等待Root冻结统一运行。

## Return

首h2前Session:20261025T043239Z、Task为本任务ID、Status；实际源码/来源/工件hash与模式、接口checkpoint、完整原始检查exit/Wait及未验证项。亲自validate-dispatch return，所有进程Wait后归窗停写；Root负责共同消费者/物理E2E和独立最终双轴。不能以单组件签整个T15、G3或完整Goal。
