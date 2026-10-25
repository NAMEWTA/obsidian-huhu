# assistant 助手上下文

**Agent**：具有稳定身份的助手；显示名与人格改变不改变 agentId。
_Avoid_：一个模型连接、一次 Run、CLI 账号。

**PersonaRevision**：一次已确认的人格配置修订；在途 Run 固定引用具体修订。
_Avoid_：可被任意编辑覆盖的当前 prompt 文件。

**ModelBinding**：助手选定的模型服务、协议、endpoint、modelId、凭证引用和配置修订。
_Avoid_：仅凭模型显示名辨认服务。

**Provider**：实际接收模型请求的服务目的地；同名模型在不同目的地不自动共享授权。
_Avoid_：Skill 声明的模型名字。

**API 协议**：模型服务的请求和结果合同；Chat Completions、Responses、Anthropic Messages 是不同协议。
_Avoid_：以 OpenAI-compatible 一词推定全部协议等价。


**Bot**：面向用户的 Agent 身份称呼；持久 Bot 具有自己的描述、人格、模型绑定与私有记忆。首版支持多个。
_Avoid_：已有 CLI Agent 工作区中的终端会话。

**协调者 / Leader**：群聊中默认处理未指定消息、规划和汇总的 Bot；用户可更换，成员也可以调用协作工具。
_Avoid_：超级管理员、独立引擎类型或审批者。

**临时 Agent 配置**：一次子任务使用的人格/模型/工具约束快照；由 sub-agent 工具创建运行实例，不自动进入持久 Bot 目录。
_Avoid_：已获准永久创建一个新 Bot。

## 实施与参考

领域术语和不变量保持由本文与 Spec 负责；T-02/08/09/10/11/22 的调用方、写集与验证见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。相关参考 REF-01/02/03/09 的机制、许可、依赖和不采用边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>。这些资料不赋予模型权限，不替代持久回执或实际验收。
