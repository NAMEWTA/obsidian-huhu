Session: 20261025T043239Z
Task: 142-global-memory-preflight
Status: completed

## 聚焦交接

本次仅完成 T-15 的只读接缝准备。T-15 的票据仍为 `blocked_by: [T-14]`、`owner: unassigned`（`ticket/15-global-memory.md:11-26`）；未修改产品、票据或状态，未运行产品检查。产品决定已经由 `spec.md:103-122,240-242`、ADR-024（`ADR.md:429-447`）及该票固定：Bot 可提议 Profile 全局记忆，只有可信用户确认才生效，召回仍受来源及接收方授权限制。这里没有需要再问用户的产品决定。

## 现状与最小入口

- HAP 合同、Go DTO、TS 方法映射已有两个方法：`api/memory.go:79-89,150-179`、`contracts/hap/v0.1/methods.json:551-568`、`src/modules/huhubot/api.ts:860-861`。BotClient 的 `connection.ts:217-218` 暴露方法；HAP `memory.go:53-55` 当前明确拒绝两方法，`memory.go:35-40` 也拒绝 global/proposal 查询；`api/memory.go:417-418,423-451` 尚拒绝 proposal 响应。Core `bootstrap/core.go:271-276,319` 仅装配私有 Memory，未装配 `Facade.GlobalMemory`。因此 wire 存在不等于功能已可用。
- 可信执行者路径需单列：模型工具经 `ToolExecution`（`api/tooling.go:54-62`）与 Broker 的 pinned `AllowedTools` 门（`tooling/broker/service.go:194-217`），现有工具表 `eino/common/tools.go:69-79` 尚无全局记忆提议。T-15 若要兑现 Agent 主动提议，须给该工具新增严格参数解码、当前 Run/claim/已消费闭包核验，并只调用 Propose；绝不让模型调用 Resolve。UI/BotClient 对 proposal 的显式用户动作直接走 HAP。`RequestIdentity` 是 transport 建立的 connection/principal（`api/types.go:28-43`；stdio `cmd/huhubot/main.go:84` 为 `local-owner`），其 `Valid()` 或 `ManagedOwner()` **不证明动作来自可信用户**；同 principal 的 ToolExecution 也不能因自报字段获得用户身份。Resolve 应只开放给经真实 owner UI 命令路径认证的 transport 调用，服务层拒绝模型/Leader/工具转发，不能信任 request body 中的 user/agent 字段。现有 `MemoryResolve` 没有此类可伪造字段，无需增加 wire 身份字段。
- 建议 `application/memory/global` 服务持有最小 Repository 端口：`Propose(ctx, identity, command, fixed-source/actor-context)`、`Resolve(ctx, trusted-owner-authority, command)`；可信 owner authority 应由 HAP/宿主入口赋予且不从 JSON 解码，ToolExecution 仅可传经过执行门核验的 actor context。具体 Go 类型由共同 API owner 协调。Repository 复用同一 SQLite base Tx、Memory 事实/来源/修订端口、Grant 的 `ReadFactsInTx`/`CheckMemoryInTx` 与 `WithReadFence`，不新造第二套 Grant 或来源真相。Memory `store.go:131-149` 的 mutate 事务已包含 250ms 物理读门；`conversation/store.go:20-66` 已有 Epoch、Receipt、SaveReceipt、Bump。Propose 固定预览；Resolve 在同一事务重读 proposal/hash/CAS、目标 head、当前来源，写 item/revision、proposal terminal state、catalog/profile revision 和 receipt，随后提交。禁止在事务间写出“成功”回执。

## 提案、竞争与召回边界

| 情况 | 建议的原子结果 |
| --- | --- |
| create | 以全局 catalog `ExpectedRevision` CAS 固定 scope、正文、真实来源闭包、preview hash 和期限；未确认 proposal 不进入 `memory_items`，不进 recall。 |
| update/delete | Propose 重读全局 target 当前 head，固定 `TargetItemID/TargetRevision` 与原文、scope、来源；Resolve 再核 target head 和来源。update 写新 revision；delete 使当前 head 立即不活跃，不再召回旧正文。 |
| approve 重放 | 相同 `(profile,principal,method,idempotencyKey,inputHash)` 返回原 `Receipt`，不产生第二 revision；不同 payload/key 或并发决议不能重复生效。`conversation/store.go:35-55` 提供现成回执键。 |
| reject、expiry、hash/source/target 变化 | reject 只将 proposal 置终态；过期、previewHash 不符、目标 head 或原文/来源当前资格变化均无 item 写入。源变化后必须重新预览。两个用户竞争同 proposal 只能一个状态 CAS 获胜，接受与拒绝不能都成功。 |

来源选择是 ID/revision 请求而非证明：`MemoryGlobalProposal.Sources` 仅列 `message/task_result/memory_revision`（`api/memory.go:150-162,318-344`）。Propose/Resolve 均从实际库重读 owner、正文 hash、当前 head、完整来源闭包和授权；模型提议的 sources 至少覆盖该 ToolExecution 的真实已消费闭包，不能用空数组洗白来源。用户主动独立内容可有空 sources，仍需真实用户确认。当前 `memory/sources.go:35-43,45-122` 仅读 message/task_result，memory_revision 应走 `ReadFactsInTx`、当前 head/正文和依赖图，不把请求提供的 hash 当真。全局确认只改变 item 可见性，不改 SourceScopes/Grant、Provider 接收权或私有库权限；`grants/memory.go:68-107` 已对每个事实重读并核当前目标。`memory/completion.go:14,80+` 与 `memory/maintenance.go:39-43` 的自动维护限定 agent，`api/memory.go:473-475` 也禁止 global maintenance；保留此硬门，私有结果只能提议而不能自动晋升。

推荐复用 `014-memory.sql:5-49` 已有 `global` namespace、item、revision、body、index、依赖图，加 `015-global-memory.sql` 仅存 proposal 固定快照、状态/expiry/CAS/决议关联及必要唯一键；014 旧迁移不变。单独建立一套 global item/revision/bodies 会使 `ReadFactsInTx`、撤销传播、suppression 与物理投递另有真相，增加双写和遗漏风险。现有 `memory/namespace.go:32-53,117-151` 还拒 global，scope 校验假定 agent membership；需按 profile/当前 session/thread 所有权扩展。`memory/context_plan.go:398-487` 当前只召回私有 namespace，改为按稳定排序和总 20 条/131072 字节预算合并私有与全局候选，每条都走 `ReadFactsInTx`、实际目标 `read+send`、来源 Grant/Host 资格，不能直接跨 Bot 读私有项。`ExecutionMemoryInput` 可保持一个目标 Run 的私有 namespace，条目 `DerivedInput.Namespace` 已记录每条真实来源（`api/memory.go:182-199,469-520`）；`context_read.go:46-55,101-126` 恢复时按每条 revision 重新 qualify 并 hydrate，因此联合列表不需要新 wire。T-15 必须用交错/恢复测试证明这一选择；不得将 global 设为整个 input namespace 来绕过当前 Run 绑定。

## 写集协调

- T-15 业务 owner：票据原写集 `domain/memory/global/**`、`application/memory/global/**`、`adapters/outbound/sqlite/globalmemory/**`、`migrations/015-global-memory.sql`、`tests/contract/global-memory/**`。其中新 globalmemory adapter 应调用 T-14 Memory Store 的包内端口或由其暴露窄 Tx 端口，不平行写事实表；具体真实文件若超出票据前先由 Root 协调所有权。
- T-14 共同 Memory owner：`sqlite/memory/namespace.go` 的 global/scope；`context_plan.go` 联合召回；`context_read.go` 当前 Run 输入恢复；`facts.go`/`sources.go`/`revisions.go` 中必要的来源、head 与资格窄端口；`private.go` 对 global/proposal 只读查询接缝。维持 private 六方法拒绝 global 写。Grant 资格变化由 T-05/原 access owner 核审 `sqlite/grants/memory.go`，不扩大 ops 或默认授权。
- T-01/API/装配 owner：`application/api/memory.go` 的 proposal 结果验证和必要内部可信入口，`adapters/inbound/hap/memory.go` 的两个 dispatch、global/proposal read 和 delivery subjects，`bootstrap/core.go` 装配，`migrations/embed.go:30-49` 连续实际版本注册 015（当前 `CurrentVersion=10`，下一版为 11，文件名不等于数据库版本）；保持合同和 Go/TS 生成物一致。含正文的 proposal 预览不是现有 `memory_revision`，其 queued stdio 页须请 T-04 delivery owner 增加 proposal subject 的当前 owner/状态/来源资格读门，或暂不返回该正文；不能只加 HAP 标签而让物理门没有 reader。TS 业务消费者需从实际用户确认动作调用 `BotClient.memory.resolveGlobal`，展示固定预览、状态、来源和作用域；现有 `api.ts`/`connection.ts` 只有协议方法，尚无该用户流程。Bot 主动提议还需 T-01/工具 owner 协调 `eino/common/tools.go` 与 Broker 路由的额外写权。没有需求支持改 wire schema；如实现发现无法传可信 owner authority，应先在内部 transport/context 解决，不能添加客户端自报身份字段。

## 产物与验证

T-15 实施后最小真实矩阵：公共 API + SQLite 验证 create/update/delete 未确认不可召回、确认后另一获准 Bot 可见、无授权 Bot/Provider 不可见；reject/expiry/旧 preview hash/源撤销/原文变化/目标 head 变化无写；同键重复接受返回同 receipt、异键并发接受或接受与拒绝仅一个胜出；每个 SQL statement/commit 故障回读 proposal、item、revision、receipt 无半状态。Run 提议须试 ToolExecution 当前 claim、实际已消费闭包、假 user/leader 参数、空 sources；private 自动维护无 global 提升。联合召回、恢复/重启、旧 revision 失效及 Grant 撤销需交错测试；stdio queued 的 global item/proposal 敏感页在 forget/撤销后物理写前复核，mixed batch 不漏 proof，按 `hap/memory.go:77-107` 与 `stdio/server.go:203-236` 补 delivery subject。复用 T-14/T-05 已有效的事实图、250ms fence、800 条有界路径与既有 138 实际验证，差异点才增测。之后由 Root 在 T-14 共同门签署、指派 T-15 owner 和唯一 Go 窗；本研究没有运行产品 Go/Node/Vitest/DB/build/generation，也不代表 T-15 或整体 Goal 验收通过。本任务唯一执行脚本是交接结构验证 `validate-dispatch --stage return`，实际 exit 0、errors/warnings 均为空。

## 问题与下一步

当前无待用户回答的产品问题。实施者先等 T-14 共同门，再由 Root 协调上述共同写集、可信用户入口与模型提议工具的 owner；以本报告矩阵做 T-15 实际验收。
