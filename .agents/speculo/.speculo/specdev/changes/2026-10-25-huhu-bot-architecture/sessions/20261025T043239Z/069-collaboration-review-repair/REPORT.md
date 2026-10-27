# 069 协作审查反例修复

Session: 20261025T043239Z
Task: 069-collaboration-review-repair
Status: completed

## 聚焦交接

本票修复 059 的 STD/SPEC-01、02、03，与 068 原共享 owner 形成同一候选。已完整读取本 TASK、059 两轴报告及三个探针/原始反例，复用 AGENTS → 当前 Map16/Goal15、dev / SpecDev I、错误恢复与 agent-experience 规则、当前 T11/T12/T05 / Spec / ARCH / ADR。没有修改原 053 / 059 报告、正式状态或失败 attempts，也未委派、提交、推送、发布。

059 原报告 SHA `78ed3de83b397366443b76e82fb166814516032f941d485e8cdfbb6c3ba6db17`。本作者在任何生产修改前，以 [01-old-production-manifest.json](logs/01-old-production-manifest.json) 固定旧 201 个 Go/合同文件，逐项与 059 外部冻结副本一致，树 SHA `c59606fe9c1cd5f7eaac4354b4eae186bd391d01a89e327e71df80b41ddbceba`；[03](logs/03-old-red-completion.json) 再回读无漂移并记录实际 exit1 / Wait。永久回归最初从 059 的 reviewer_tools / reviewer_queue / reviewer_envelope 探针整理成项目测试，原探针只读，不冒称由本作者首先发现。

本作者仅两个生产路径：sqlite/collaboration/store.go 保持原两阶段输入边界并验证实际材料化输入；sqlite/usage/delegation.go 按真实持久 Run/Delegation 加载要求。另有五个自有 delegation 永久测试。最终七文件逐 SHA 见 [08-own-freeze-before-joint.json](logs/08-own-freeze-before-joint.json)，树 SHA `67e93587aaa6becad9f72c4c01d44450e20c2bc222226a891d58b3c8907e1423`。

068 唯一修改共同 API / EngineInput / 纯验证 helper、Broker、Claim / Finalize 及其 chat 故障测试，五路径摘要见其 [04](../068-shared-review-repair/logs/04-own-freeze-before-joint.json)；本作者不把这些文件算作自有作者。没有修改 wire/schema/TS/生成物、SQL迁移、锁、T05、凭证或 Provider。

## 产物与验证

### 三项风险闭合

| 059 finding | 当前真实合同与永久消费者 |
|---|---|
| P1：固定 AllowedTools 被协作提前路由绕过 | 068 在同一 bound Broker 用实际固定 Agent 的同一 predicate 检查工具名。八个协作工具缺能力返回 `CAPABILITY_DENIED / TOOL_NOT_ALLOWED`；note.write 保留原 denied-result 合同；用户 Facade 不冒充模型工具。`TestPinnedToolAllowlistGuardsActualCollaborationEffects` 保留公开启动 → 实际 Engine 绑定 Tools → delegate / notify 的原允许/禁止对照，禁止组零 child、message、子 Engine。`TestEveryCollaborationToolUsesActualPinnedCapabilitiesForExistingAndTemporary` 覆盖八工具、existing/temporary 及运行中公开编辑 head，原 pin 不扩权；拒绝组无 receipt/proposal/新 Run 副作用。 |
| P2：撤权 queued question 反复回滚，饿死无关 root | MessagesInTx 的当前 read/send 校验没有移除。068 只在该阶段对固定有限权限 reason 与 THREAD 限额作持久 failed 处置，保留原 reason、无正文 outcome、实际 slot/pin 生命周期并继续有界候选；未知 Fault、坏数据、SQL/IO/context 错误原样回滚。`TestQueuedQuestionRevocationDoesNotStarveIndependentRoot` 原四 held producer + 第五 queued question + 公开 Revoke + source-free 独立根仍使用相同入口；拒绝 question Engine0、failed/GRANT_REVOKED、slot0、pin0、一条 body-free 结果、父真实 CHILD_PARTIAL_FAILURE，无关根继续。SQL 失败提交 trigger 保 accepted/空原 claim/slot0/原 pin/无 outcome，移除故障后才正常处置。 |
| P2：constraints / expectedOutput 已存却未给 Engine | 唯一 pure-Go `EngineInput.Delegation *api.DelegationInput{DelegationID,Task,Constraints,ExpectedOutput}`，普通根 nil。usage loader 从同一 Run 的持久唯一 Delegation 与 execution_runs.intent 读取，不从瞬时命令、目标私聊或别线程补齐；Claim 初次和续跑均消费。`TestAcceptedDelegationRequirementsReachActualChildEngine` 对 existing/temp 精确比较 typed 字段及实际任务身份，不靠字符串搜索假字段。`TestMaterializedDelegationKeepsOriginalRequirementsBoundsAcrossCheckpointReopen` 经公开选入真实父消息，要求完整进入初次 child 与两次关闭/重开后的实际 CP Resume，普通父仍 nil、仅三个原 Run、child Run/Resume 各一次。 |

本轮不收紧既有边界：raw task≤64KiB、constraint≤32×2KiB、expected≤8KiB 且原 raw 三项总≤128KiB；材料化 Context 后 task 独立≤128KiB，要求各自仍原上限，整体自然≤200KiB。最初拟统一材料化后总≤128KiB，经 Root / 068 在验证前指出会拒绝旧合法输入，已撤回；没有把该提案作为最终产品。永久控制使用40,000-byte raw task、60,000-byte真实选入父消息、16×2048 constraints、8192 expected，材料化100,002 bytes、三项共140,962 bytes>128KiB，启动和实际重开 Resume 均完整保留。原 Context / lineage / thread 边界未扩大。

loader 对无 Delegation 的普通根返回 nil；对有 task 配置/parent 却缺实际关系、坏 JSON / 非数组、超既有各字段边界返回 CONFLICT / DELEGATION_INPUT_INVALID，不能落入 Claim 权限拒绝分类。nil / JSON null 的无项约束规范化空列表，不将旧合法无约束值变成永久错误。

### 本作者真实红绿与故障

- [02-three-old-input-red.log](logs/02-three-old-input-red.log)：`GOTOOLCHAIN=go1.26.10 go -C native/huhubot test -mod=readonly -timeout=45s ./tests/contract/delegation -run '^(TestPinnedToolAllowlistGuardsActualCollaborationEffects|TestAcceptedDelegationRequirementsReachActualChildEngine|TestQueuedQuestionRevocationDoesNotStarveIndependentRoot)$' -count=1 -v`，实际 exit1 / Wait、1.914s。禁止工具仍 child=1 / notify=1 / childEngine=1；existing/temp 要求持久有而完整 Engine 输入缺失；撤权 question 与无关根1200ms均 accepted / slot0，公开 CancelTask 后立即恢复。三个正常控制通过，旧失败原样保留。
- [04](logs/04-three-findings-and-adjacent-green.log)：修复后首轮 exit1 / Wait、1.358s，唯一失败是本作者新增的“终态 claim_token 必须空”夹具假设。原 Finalize 本就保留历史 token；Root 与 068 核对后没有为测试清 token。精确修正前内容与 diff 见 [05-before](logs/05-claim-token-fixture-before.go.txt) / [05-diff](logs/05-claim-token-fixture-correction.diff)；slot/pin、Engine0、持久原因/结果、SQL失败全回滚断言保持。该 exit1 明确不是新产品缺陷。
- [06](logs/06-three-findings-and-adjacent-green.log)：同五顶层/11子场景，`-mod=readonly -timeout=90s ... -count=1 -v`，实际 exit0 / Wait、1.328s，包含全八工具与合法大 Context / 重开 CP 控制。
- [07](logs/07-queue-parent-outcome-green.log)：queue 三场景 allowed / revoked / failed-commit，`-mod=readonly -timeout=45s ... -run '^TestQueuedQuestionRevocationDoesNotStarveIndependentRoot$' -count=1 -v`，实际 exit0 / Wait、0.896s；补 exact GRANT_REVOKED 和父已可见成功时的真实 partial 原因。

068 的独立阶段测试使用真实 Profile / 原 base/assistant/execution/usage，只有消息 reader 的故障 seam 受控；11项覆盖已知 Grant/parent/THREAD 拒绝、未知 Denied/JSON/NOT_FOUND/IO/实际SQL/context、终结 statement trigger 和 deferred-FK commit 故障，全部保持原事务与 nilWork 保证，实际 exit0 / Wait，证据由其 [02](../068-shared-review-repair/logs/02-claim-faults.log) 及最终报告拥有；本作者不冒称自己运行该定向命令，最终联合 chat 普通 / race 已实际再次消费这些例。

### 同一输入联合检查

307 文件固定于 [09-joint-source-before-checks.json](logs/09-joint-source-before-checks.json)，树 SHA `ce39be40d1ce45a17d0fcfdaa5cda50a65f496b24d06bf6be145cc5be67482f0`。依据是 059 当前完整257候选，以及原 052 未变支持夹具；旧052相比059已存在的061 connection.test.ts修正用059摘要覆盖，不误报成本轮修改。第一次仅以旧052为基底的清单准备断言正确发现这项预先差异，未启动测试或修改源码；当前与059/支持集相比仅本轮12路径变化/新增（068五个、069七个），不宣称旧052到现在所有字节未变。09分别标明059 code-scope摘要与完整复合Input摘要，不混同两种哈希。

唯一执行器 [10-run-joint-checks.py](logs/10-run-joint-checks.py) 每条命令前后回读同一307文件；所有命令串行，非零就停止后续，068与Root不并行重测。最终结果见 [14-joint-check-results.json](logs/14-joint-check-results.json)，三命令实际均 exit0 / Wait，环境固定 `GOTOOLCHAIN=go1.26.10`、Linux，普通 CGO0 / race和vet CGO1：

| 真实命令与日志 | 实际结果 |
|---|---|
| `go test -mod=readonly -timeout=6m -p=1 -count=1 -v ./tests/contract/effect-reconcile ./tests/contract/delegation ./tests/contract/collaboration-policy ./tests/contract/approval ./tests/contract/access ./tests/contract/chat ./tests/contract/events ./tests/contract/foundation` | [11八包普通](logs/11-eight-normal.log)，exit0，wall37.332s |
| `go test -mod=readonly -race -timeout=8m -p=1 -count=1 -v ./tests/contract/delegation ./tests/contract/collaboration-policy ./tests/contract/chat ./tests/contract/approval ./tests/contract/effect-reconcile` | [12五包race](logs/12-five-race.log)，exit0，wall109.671s，无data-race报告 |
| `go vet -mod=readonly ./...` | [13](logs/13-vet.log)，exit0，wall0.598s |

原实际来源100单Session History门为4.215248ms，source800 direct gate18.922934ms，无来源800为6.248804ms，原250ms及拒绝writer断言保持。800为400个实际Run的gate上界，不冒称一条跨Session History RPC。原正常/取消/held HTTP、slots/pins、CP与late effects也进入普通/相关race；新四slot后撤权/SQL回滚、全八工具/固定pin、大Context/重开Resume与068全部故障case均通过。原events/access额外race不重复：其T04/T05热路径字节未改，068更改Claim/Finalize而非投递查询，依据059固定输入的实际race及本次普通闭包按影响复用；未将059 go1.27.1计时与本作者go1.26.10当作同环境样本。TS/Host/wire/锁未改，未新增TS、平台构建或真实现场验收宣称。

末次 [15-final-source-readback.json](logs/15-final-source-readback.json) 回读自有七文件、联合307文件均 drift=[]，gofmt / 精确 diff-check 均 exit0，所有进程均已 Wait。return结构校验见 [16-return-validation.json](logs/16-return-validation.json)。

## 问题与下一步

本票授权修复、永久三反例红绿和适用联合检查已完成，自有/共同生产与测试已停写，所有命令与子进程实际 Wait，无自有活动probe。completed表示本任务代码交回；本报告不代替Root新候选固定、独立E2E或双轴复审，不修改原059失败verdict，也不宣称全change完成。

没有运行真实模型/Provider、OS keyring、旧默认D-Bus探针、用户Vault/Obsidian或目标Windows/macOS现场。受控 Engine、实际 SQLite、完整 CP 和同 Executor 证明当前代码消费者，不冒称真实模型会遵从文本要求或全28票已完成。原凭证与SQL迁移均未触碰，没有新增外部依赖或复制外部项目代码；本项目059原探针的整理来源及旧失败均可回读。
