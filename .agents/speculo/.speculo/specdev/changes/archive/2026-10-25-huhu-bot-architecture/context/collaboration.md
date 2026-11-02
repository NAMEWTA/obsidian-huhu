# collaboration 协作上下文

**Delegation**：有稳定 ID 的任务委派；绑定 rootRunId、parentRunId、请求者、执行者/临时配置、ContextEnvelope、预算、状态与结果投递目标。
_Avoid_：一条没有完成责任的聊天消息。

**sub-agent**：执行者在父任务中的从属角色。可以调用已有 Bot，也可以用临时配置创建独立子执行；其运行仍遵守同一 Engine/Broker 合同。
_Avoid_：每次派遣都在 Agent List 创建永久 Bot。

**AgentMessage**：Bot 间有身份、范围、投递回执和关联任务的有界消息；delivered 只证明送达，只有 Delegation 的结果才能证明委派完成。
_Avoid_：消息一到就无限自动来回唤醒。

**ContextEnvelope**：协作中允许传递的任务、约束、选择的消息/来源、接收方及内容修订；不携带任意私有记忆/全会话或伪造的授权。
_Avoid_：把整个父 checkpoint 交给子 Agent。

**调用树**：根 Run 及它接纳的全部后代执行关系；控制共同预算、深度/数量、取消与恢复。消息图可有多边，执行等待图禁止环。
_Avoid_：按 agentId 取消所有无关会话。

**任务结果**：completed/failed/canceled 等终结信息与可见结果引用；同时保留是否部分完成和 effectsUnresolved。
_Avoid_：受理回执、模型声称完成或一个子任务结束即代表根任务完成。

## 实施与参考

领域术语和不变量保持由本文与 Spec 负责；T-11/12/13/16/23 的调用方、写集与验证见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。相关参考 REF-03/04/05/06 的机制、许可、依赖和不采用边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>。这些资料不赋予模型权限，不替代持久回执或实际验收。
