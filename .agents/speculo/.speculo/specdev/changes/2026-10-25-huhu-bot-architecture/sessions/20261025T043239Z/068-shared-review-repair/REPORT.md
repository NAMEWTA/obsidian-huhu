# 068 共享执行接缝修复候选

Session: 20261025T043239Z
Task: 068-shared-review-repair
Status: completed

## 聚焦交接

已针对059三项发现完成共享Broker、Claim/Finalize与纯Engine任务输入修复，069负责持久业务读口和主要公共消费者回归。旧生产输入的三个反例均保留，修后正常、权限拒绝、queued撤权进展、任务要求及合法CP续跑通过。双方共同冻结307文件，全部受影响普通/race/vet已实际结束且摘要无漂移。completed只代表候选交回，059的request-changes及attempts1不改写，代码门仍由Root独立复验和下一次双轴审查决定。

## 产物与验证

### 输入、身份与写集

作者 `native:/root/foundation_go`；沿原派遣gpt-6.1-sol/xhigh偏好，只是派遣记录，未取得实际底层model attestation。复用dev与SpecDev I，重新读取当前TASK、059完整双轴REPORT/三个原始探针及日志、Spec协作/工具/固定配置合同、ARCHITECTURE分层/事务/恢复与ADR-002/003/006/008，以及error-handling/agent-experience规则。没有新增产品决定或DAG，没有再委派。

HEAD/base仍 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。旧059 Input SHA `63e74529e1059fcd86c814621dce91c22c9ad9440c47ba8ecc0f779978b74a98`，REPORT SHA `78ed3de83b397366443b76e82fb166814516032f941d485e8cdfbb6c3ba6db17`。069先独占旧201文件红灯窗口，确认三个真实失败/正常对照与进程Wait后才释放生产writer；[00输入](logs/00-input.json) 保存本片三个原文件的完整字节副本和不可变合同摘要，未写原review探针/日志或052报告。

本片仅五路径，逐SHA见 [04 own manifest](logs/04-own-freeze-before-joint.json)，tree SHA `87df3311f53ad5df1dfe24e9254b8626c4234402c62dcfb385d314b88c7b9cb4`：

- `internal/application/api/conversation.go`：EngineInput新增纯Go Delegation指针。
- `internal/application/api/delegation_input.go`：任务要求DTO与兼容原边界的纯校验helper。
- `internal/application/tooling/broker/service.go`：绑定后的单一工具白名单网关。
- `internal/adapters/outbound/sqlite/execution/executor.go`：同Tx领取、已知拒绝终结/继续候选、共享原Finalize事务体、持久要求读口消费。
- `tests/contract/chat/claim_failure_test.go`：十一项错误隔离、真实SQL/终结写入/Commit故障回滚断言。

以上路径相对 `native/huhubot/`。精确完整差异见 [03 patch](logs/03-shared-production.diff)，含新文件。069的七路径由其独占；本片不冒领业务/测试作者。无bootstrap调整，无HAP/schema/TS、SQL、依赖、规则或后续票修改；未commit/push/release。

两份报告使用同一个 [联合manifest](../069-collaboration-review-repair/logs/09-joint-source-before-checks.json)：307文件，tree SHA `ce39be40d1ce45a17d0fcfdaa5cda50a65f496b24d06bf6be145cc5be67482f0`，manifest文件SHA `c5137b3d2bb94852bad16a11278fa77c8d4e2a61cd3e4029ce551533f1d82346`。其基底为059完整候选加未变支撑输入，已覆盖061在059中生效的测试摘要；本修复仅068五路径和069七路径变化。[05读回](logs/05-joint-readback.json) 与 [06最终读回](logs/06-final-readback.json) 均drift=[]。

### STD-01 / SPEC-01：固定工具能力实际执行

`bound.Invoke`在关闭状态检查后、任何note/collaboration分流前，唯一调用 `allowed(pinnedAgent, toolName)`。所有协作工具都用同一固定配置判定，而不是只隐藏schema或依赖目标白名单；未允许时在业务读写、receipt、费用或子模型之前返回typed `CAPABILITY_DENIED / TOOL_NOT_ALLOWED`。note.write保留既有结构化 `ToolResult{Status:denied,Reason:TOOL_NOT_ALLOWED},nil` 合同，采用同一个predicate，没有第二套能力白名单。

普通用户Facade仍由其对象/来源/目标/事务授权，不被模型工具AllowedTools错误限制。069真实绑定Tools覆盖全部八个协作名、existing/temporary的禁止和允许控制；禁止组没有持久子任务/消息/receipt/模型副作用，合法delegate/message继续执行。note.write审批/拒绝/恢复和真实TS Host链随联合approval/effect-reconcile normal/race验证。

### STD-02 / SPEC-02：已知拒绝不会永久重选accepted

Claim最多读取128个accepted候选并先关闭rows。每个可领取项进入私有 `claimInTx`；消息读取返回**已知当前业务拒绝**时，在当前领取事务内复用原 `finalizeInTx`，保存无正文failed、原Reason、原父子结果、事件并释放已结束资源，然后继续同一有界候选集。不会调用该任务Engine，也不通过删除消息或放宽授权继续执行。

有限分类仅限MessagesInTx阶段：CAPABILITY_DENIED中的GRANT_REVOKED、GRANT_EXPIRED、SOURCE_NOT_GRANTED、OPERATION_NOT_GRANTED、RECIPIENT_NOT_GRANTED、PARENT_SCOPE_EXCEEDED、PARENT_SCOPE_CHANGED、TEMPORARY_RECIPIENT_NOT_GRANTED；RESOURCE_LIMIT仅THREAD_MESSAGE_LIMIT/THREAD_CONTEXT_LIMIT。未知Reason、CONFLICT/NOT_FOUND、SQL/IO/扫描/context错误保持原错误和事务回滚，不吞错为失败或成功。Claim遇事务错误始终返回nil Work。

拒绝分支只省去“为记录无正文拒绝再次要求被拒权限”的重复校验；正常Finalize仍做原当前授权复核。所有control/Tree.Finalize、实际producer/unknown费用、pin、Session、事件和Bump都走原事务体，没有平行拒绝账本。任何终结statement或Commit失败会连领取、槽、结果/事件和释放一起回滚。终态claim token按原审计/attempt关联保留，不为新测试清空。

069重放真实四slot+queued question+公开Revoke+健康独立根：question持久failed/GRANT_REVOKED、无子Engine、pin/slot释放，健康根正常执行，无需用户Cancel或重启；父通过原Outcome得到CHILD_PARTIAL_FAILURE。原未撤权控制、父结果和故障注入断言保留。

### STD-03 / SPEC-03：持久任务要求到达Engine及Resume

唯一纯Go类型为 `EngineInput.Delegation *api.DelegationInput{DelegationID,Task,Constraints,ExpectedOutput}`。普通非委派聊天为nil；实际持久委派（包括终态Reply产生的私有新root）按真实关系提供字段，不以ParentRunID是否为空替代关系。

069的adapter-only `DelegationInputInTx(ctx,tx,runID)`读取该Run唯一持久Delegation与execution_runs.intent；后者已经包含明确选择的合法Context材料。Claim每次启动/正常续跑都读取它，不能从调用者临时对象、目标私聊或已丢失的工具请求重建。坏关系/坏JSON/超原字段上界返回CONFLICT，不自动当业务拒绝吞掉。

保留旧两段边界：raw task≤64KiB、constraints≤32×2KiB、expected≤8KiB且raw三者合计≤128KiB；Context材料化后Task独立≤128KiB。没有引入材料化后三者再合计128KiB的收紧，最大组合200KiB仍有界；合法Context使组合超过128KiB的真实受理、执行、完整CP及重开Resume控制通过。旧Go消费者nil constraints可能持久为JSON null，读口保持空要求语义并归一为空slice，不把旧合法记录永久CONFLICT。

给T08的消费者合同：Run读取 `EngineInput.Delegation`，Resume读取 `EngineResumeInput.Input.Delegation`；Task与Intent是同一份已材料化任务，按一份正文消费，Constraints/ExpectedOutput作为独立任务要求保留。它们不替代固定Persona/配置或Source/Grant准入，不能因目录摘要、CP存在或模型文字补造权限。当前只保证纯Engine消费者完整，不提前实现Provider adapter或新增wire方法。

### 实际命令与红绿链

全部cwd为 `native/huhubot`，GOTOOLCHAIN=go1.26.10；普通/编译CGO_ENABLED=0，race/vet=1。059 reviewer的go1.27.1环境保留原记录，不合并为同环境样本。

| 执行与输入 | 实际观察 | 回读证据 |
| --- | --- | --- |
| 069旧生产201文件逐SHA与三个主要公共反例 | 原工具禁止仍委派/notify、要求SQL有而Engine无、撤权queued阻塞健康根三个真实红；正常组绿，exit1/1.914s，全Wait后释放writer | [旧输入](../069-collaboration-review-repair/logs/01-old-production-manifest.json)、069 logs02/03原始记录 |
| 本片 `go test -mod=readonly -run '^$'` broker/execution/usage | exit0，仅编译，无测试选择 | [01](logs/01-compile.json)、[raw](logs/01-compile.log) |
| `go test -mod=readonly -timeout=2m -p=1 -count=1 -run '^TestClaimInboxRefusalFinalizationIsAtomicAndUnknownErrorsRollback$' -v ./tests/contract/chat` | exit0/1.398s；十一子case，实际statement触发器和deferred FK Commit失败均回滚，nilWork/accepted/pin/占用/事件不伪变 | [02](logs/02-claim-faults.json)、[raw](logs/02-claim-faults.log) |
| 069主要红例修后及相邻八工具/大Context/CP/父结果 | 06主要普通exit0/1.328s；07精确原Reason和父partial/commit断言exit0/0.896s | 069 logs06/07 |
| 联合八包 normal `go test -mod=readonly -timeout=6m -p=1 -count=1 -v` | effect-reconcile/delegation/collaboration-policy/approval/access/chat/events/foundation全exit0，37.332s；100source4.215248ms、source80018.922934ms、无来源8006.248804ms，原250ms门不变 | [统一命令/exit/Wait](../069-collaboration-review-repair/logs/14-joint-check-results.json)、[raw11](../069-collaboration-review-repair/logs/11-eight-normal.log) |
| 联合五包 race 同参数加 `-race -timeout=8m` | delegation/collaboration-policy/chat/approval/effect-reconcile全exit0，109.671s，无data race，涵盖新三反例/十一故障/实际TS Host | [raw12](../069-collaboration-review-repair/logs/12-five-race.log) |
| `go vet -mod=readonly ./...` | exit0/0.598s | [raw13](../069-collaboration-review-repair/logs/13-vet.log) |

本片故障测试只有inbox读口是受控错误seam，Profile/base/assistant/execution/usage policy、SQL/UoW与持久状态均生产组件；不冒充它已经走真实撤权或模型，真实公共路径由069主回归证明。基础设施错误边界是有意义的保留行为回归，不伪造为059原始反例。

069首轮04唯一未绿是测试额外假设终态claim_token应为空；原Finalize保留该token，053/052原迟到结算也依赖原身份。05仅去掉这个无合同前提断言，其他failed/originalReason/Engine0/bodyfree/parent/slot/pin/事务断言未删；不称其为新生产缺陷。初始材料化后总128KiB方案在Root指出兼容问题后撤回，没有作为最终限制保留。

按Root安排只由069运行联合重检查，本片没有重复整套。未变events/access额外race性能热路径、真实v5迁移、TS/build/lint及跨OS资产证据按摘要与影响复用；本轮未重新运行这些检查，不冒称旧字节通过就是新全仓验收。normal已实跑events/access，保持旧250ms和来源/撤权/投递断言。

## 问题与下一步

没有已知未闭合的本片修复问题。源/测试已停止写入，所有作者命令和受控测试子进程完成Wait，最终307摘要drift=[]；原052 REPORT SHA仍766ff1f9…024c，059 REPORT仍78ed3de8…db17，TS/wire/锁无漂移，见 [06](logs/06-final-readback.json)。后续出现新的当前拒绝理由须明确扩展有限分类并验证，不能改成吞全部Fault；持久坏数据/存储故障仍返回错误而不是伪造任务成功。

Root下一步重放059三原探针并执行公开协作/真实TS→HAP→Go→Host选择性E2E，然后冻结新候选独立补审。068/069候选绿测不覆盖或改写原059双轴request-changes，也不改正式状态。真实Provider/模型、Obsidian/用户Vault、系统keyring及目标OS实机验收均user-owned/not-run，未索取凭证；T08及后续功能未借本修复提前开工或宣称完成。return结构校验回执另存，之后实际MESSAGE/FINAL并继续停写。
