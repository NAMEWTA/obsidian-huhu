# memory 记忆上下文

**短期上下文**：某个 Agent 在指定 Session/工作线程中的消息选择、工作摘要与临时状态；每次模型调用按授权和预算重新组装。
_Avoid_：跨 Agent 自动共享的会话堆、独立长期事实。

**MemoryItem**：有 owner、scope、来源、状态和不可变修订的长期条目。owner 为持久 agentId、Profile 全局域或临时任务记忆域。
_Avoid_：原始历史或 SDK checkpoint。

**私有长期记忆**：Bot 可以自动维护、只供该 Bot 在来源允许的上下文内召回的条目；用户可以管理和暂停维护。
_Avoid_：其他 Bot 可直接浏览的共享表；从群聊取得的资料在任何地方都可泄露。

**全局长期记忆**：当前 Profile 内经用户确认可共享的条目；仍受来源/接收方约束，不是跨设备或跨 Vault 的公共记忆。
_Avoid_：Leader 可以不经确认写入的记忆。

**GlobalProposal**：Agent 提议的全局新增、修改或删除，绑定内容、范围和目标修订；确认前没有召回资格。
_Avoid_：模型自称“用户同意”的普通消息。

**Pinned Memory**：用户主动固定的独立条目，自动维护不能静默覆盖；可修正/遗忘。
_Avoid_：自动提炼即等于人工确认。

**临时任务记忆**：临时 sub-agent 独立使用的任务级命名空间，可落盘支持恢复；不会自动提升为持久 Bot 或全局条目。
_Avoid_：新建了 Agent List 中的 Bot。

**forget**：撤出召回、失效派生索引与旧提炼作业，记录防复活代数；不撤回已外发的数据。删除预检解释关联正文和独立条目的处理。
_Avoid_：从历史中抹去所有已发生的外部效果。

## 实施与参考

领域术语和不变量保持由本文与 Spec 负责；T-14/15/17/24 的调用方、写集与验证见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。相关参考 REF-03/04/05 的机制、许可、依赖和不采用边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>。这些资料不赋予模型权限，不替代持久回执或实际验收。
