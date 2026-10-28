# Chat 工具名适配核对

2026-10-26 Root 使用 OpenAI Docs 能力，先检索官方域，再实际打开 [Create Chat Completion](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)，核对 `tools.function.name`：允许字母、数字、下划线和横线，长度最多 64。当前 HUHU Broker 的 `note.write` 等规范名含点，因此不能直接当作 Chat function name；此为协议格式推论，不是模型现场调用结果。

092 原生确认将在 adapter 内使用固定双向表：`note_write` 对应 `note.write`，`agents_discover`、`agents_delegate`、`agents_message`、`agents_proposeCreate` 与 `tasks_get`、`tasks_list`、`tasks_reply`、`tasks_cancel` 分别对应原 Broker 规范名。最终实现须以真实 registry 为准，只暴露已实现且 pinned AllowedTools 允许的交集。未知 wire 名、碰撞或未声明规范名不得进入 Broker。

Checkpoint 与 schema digest 必须包含准确 wire/canonical 映射；Resume 和 Inspector 校验同一映射，不改领域工具 ID、授权或 HAP 公共合同。实际 loopback 请求需断言函数名满足 `[A-Za-z0-9_-]{1,64}`，并检查返回的原 call ID 和下一轮 tool 结果。本文补充已冻结 Map22 私有合同，不改变原 TASK、写集或状态；运行验证仍待092交回。
