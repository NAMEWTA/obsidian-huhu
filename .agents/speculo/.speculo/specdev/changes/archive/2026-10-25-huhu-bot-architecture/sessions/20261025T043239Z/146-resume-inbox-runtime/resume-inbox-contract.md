# 恢复补充消息内部合同（146/147）

## 持久位置与权威来源

采用已有 `execution_runs.execution_position_json` 的 `ExecutionPosition.Decision`，不新增投递表、迁移或恢复 writer。`ToolResult` 增加可选的内部 `ResumeInbox`，含 `Messages`（正文与身份）及 `AnswerReceipts`（只含身份）；空值完全省略。该字段不进入 HAP 或外部工具入参。首次续跑在 `SaveResume` 之前从当前 Run 的真实 `collaboration_messages` 装包，并与原工具决策一起原子持久。恢复时若已有 `RecoveryDecision`，只使用原持久包；不能扫描新 inbox 或重新执行 `Continue` 来改写决策。

消息 DTO 为 `{Message: AgentMessage, Ref: DerivedInput}`。`Ref` 沿用现有 `memory/sources.go` 对 `thread_message` 的**正文身份**：实际 `message_id`、恒定正文 revision `"1"`、`sha256(text)`、`work_thread_id`（同时作为 namespace 和 thread）。`collaboration_messages.revision` 是可因 status 更新的行元数据版本，不能代替正文 revision。`Message.ID/WorkThreadID/Text` 必须与 `Ref` 一致。身份键是消息 ID；同一 ID 的正文 revision、hash、thread 或正文冲突一律拒绝，正文相同而 ID 不同不得去重。所有文本必须是 UTF-8。`AnswerReceipt` 为 `{QuestionID, Ref}`；不带正文、来源或其他新权限，`QuestionID` 定位当前 pending 的 `WaitForIDs` 下标和对应 `Children`。

`usage.MessagesInTx` 的现有当前 recipient、Grant、Group、父 scope、source、`read/send`、PrivateMessage 与 ConsumePrivate 检查仍是进入候选的前提。Claim 仅保留当时已验的候选身份，不把 `Input.Messages` 当续跑模型输入；`PrepareAndMarkRunning` 仍清空该输入。首次 `SaveResume` 在同一事务针对这些候选 ID 再做当前资格和真实 body/ref 校验，只选 Claim 已见者，晚到消息留待下一次等待。撤权、身份冲突及资源超限拒绝，不将未授权正文交给 Engine 或事件。恢复已保存决策时只对包内身份做当前资格检查，不纳入新消息。

## 呈现与去重

初次封存的 `ShortTerm.Entries` 中 `Use=inbox` 的完整正文 `Ref` 是初始已呈现证明，短期上下文正文、顺序与 `BindingDigest` 不变。当前等待若为 question，按 `Continuation.WaitForIDs[j]` 使用与现有 finalize 相同的 SQL 条件和排序，查出真实 `kind=reply,status=answered` 的**答案自身**消息行；必须与当前合格候选、`Decision.Children[j].Text/RunID` 对应。SQL 行的元数据 revision 与 `Children[j].Derived` 中该答案的完整 Ref 核对；回执使用同一消息的正文 Ref（revision `"1"`），不把状态版本当正文版本。该答案从 `Messages` 省略，向 `AnswerReceipts` 写入 `QuestionID+Ref`。`Children.Derived` 中其他祖先 Ref 不代表已呈现，即使正文哈希相同也不能被排除。

147 的 common 消费原 CP，在当前 pending 工具结果的一个固定位置加入可选 `resumeInbox` 字段。approval 使用本来对应的工具结果；children/question 只使用一个固定 pending index，其余结果不复制。common 只把旧 CP 的显式 `resumeInbox.Messages[].Ref` 和 `resumeInbox.AnswerReceipts[].Ref` 视作已呈现；先核对同 ID 的完整身份，冲突拒绝，再从待呈现 `Messages` 中跳过完全相同身份。旧 CP 没有该 marker 时仍按原格式读取，不能从任意 `Children.Derived`、lineage、时间或同正文猜测已投递。写入一次后该 marker 留在 CP 的既有工具结果消息中，下一次等待可按真实身份去重。原初始消息前缀、工具调用 ID、CP 外层结构和非 Chat 协议状态不变。

## 界限与故障

原 Claim inbox 上界 100 条、总正文 256 KiB 仍有效。恢复包的 `Messages+AnswerReceipts` 合计至多 100 条，其中 `AnswerReceipts` 至多 32 条；消息正文合计至多 256 KiB。纯 API 校验实际 JSON 编码后的 `ResumeInbox` 不超过 2 MiB。这个前置界限容纳尚未由 common 从旧 CP 排除的已呈现消息，不增加模型可见预算。common 先按封存短期上下文和完整 CP 标记排重，再以最终完整工具结果的 256 KiB 和 CP 的 1 MiB 上界检查，不截断任何正文或身份；超限显式拒绝。纯校验不做 SQL 或授权，SQL 身份及当前资格只由原 Store 验证。

145 原两个 waiting 补充红项、连续两次挂起、question 答案排重、已存 Decision 后晚到消息及撤权/重启，是 146/147 共同的实测闭环。旧格式没有显式 receipt 时保持原兼容读取，不把非自身祖先误判为已呈现。
