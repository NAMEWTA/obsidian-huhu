---
schema_version: 2
session: "20261025T043239Z"
task: "047-model-protocol-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# 三协议与逐请求预算接缝只读预检

## Goal
为后续 T08/T09/T10 和即将开始的 T12 逐次模型请求预算提供真实 SDK / API 接缝建议。只读研究，不启动下游实现、不改当前冻结候选。原生 /root/foundation_research，沿既有模型偏好；仅 Root 实际 followup_task 启动。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map13/Goal12、LOG051。复用已读 AGENTS/运行指南/dev 相关架构、测试、许可。完整读 T08/T09/T10、T12，以及 Spec/ARCH/ADR 对应行为。先复用 002-foundation-research 的完整 REPORT 与 artifacts 的实际锁定 Eino/EinoExt/SDK 版本、许可和已有编译结论；041/045 研究不是已实现 T11/T12。当前 046 在独立审查事件/审批候选，产品冻结。

OpenAI API 文档应用 /home/wta/.codex/skills/.system/openai-docs/SKILL.md；Root 已告知用户采用 OpenAI Docs，并已搜索且打开 https://developers.openai.com/api/docs/guides/function-calling 与 https://developers.openai.com/api/docs/guides/streaming-responses 。你按需要实际读取官方相关段落，不把已打开导航或旧印象当证据。不要做模型选型/升级，不替换用户配置的 endpoint/model。优先现有固定源码与当前官方文档，禁止依据搜索摘要定结论。仅一次性资料缓存允许写，来源、时间、固定版本/commit、适用许可明确记录。

## Workspace and Scope
只写本 TASK REPORT、observations、资料摘录与日志。无生产、测试、锁、规范或正式 Evidence/Map 写权；不提交、推送、发布、再委派。先 rg --files 定位实际文件。只读缓存 SDK / 官方源码和文档，不运行产品进程、go build/test、模型或网络 Provider 请求，不访问用户凭证/真实 keyring/Obsidian；不执行下载的程序。不与 046 性能/pipe 检查争用重计算资源。

核对三个显式 protocol adapter 如何消费同一 Engine Run/Resume、Broker/CP，SDK 类型只在 outbound adapter：
- Chat Completions 的流式 tool delta 聚合、ID、finish/usage/error 和流未完成边界；Responses 的 typed events、call_id、reasoning/完整输出项、store=false 与独立本地 CP 恢复；Anthropic 的 content-block/tool-use/tool-result、拒绝/stop、thinking 签名与 usage。
- 逐 HTTP 尝试的预算/并发 reservation→真实 dispatch→known/estimate/unknown settlement。SDK 自动 retry 的实际实现/关闭位置、取消后的 in-flight 成本不盲退、429/5xx与流断线不能无预算重试。T12 Port 须覆盖同一次 Engine.Run 内多个模型回合、工具后恢复、摘要/记忆/子任务/问答；不能只按 Run 预留一次。
- outbounds 当前 source/grant/recipient/group membership 校验与 epoch/cancel fence 的调用位置建议；完整 CP 何时能无新效果地恢复，工具批次第一个待批后如何保存其余意图，不能绕开 Broker。
- 显式 endpoint/model/credential、不继承环境或云认证 fallback、无静默协议回退/远端 built-in tools；敏感内容不进日志。现有凭证 worker 和当前 SDK 构造是否需要新增窄 Port，由原 owner 维护。
- 文本及工具参数/返回/上下文的有界尺寸、严格 JSON schema、空结果/截断/错误、流 producer 的关闭和 Wait、未知 usage 的持久表达；不重新设计 UI 或扩首版范围。

## Acceptance
给出每协议实测代码位置和官方来源的映射、现有 Engine/Broker/CP/Assistant/Usage 需要的准确共享路径+原 owner、T12 必须先冻结的最小接口要求。T08–T10 未实施路径清楚标建议。附本地 HTTP/SSE 受控服务的可执行故障矩阵建议，能数真实请求/取消/重试/usage/工具审批与 Resume；本任务全部未运行，真实三协议 Provider 仍 user-owned/not-run。先检索既有 Spec 决定，不重问凭证或产品方向。发现将影响即将开始 T12 的接口缺口时先简讯 Root，不等最终报告。

## Return
REPORT 第一个 h2 前包含 Session: 20261025T043239Z、Task: 047-model-protocol-preflight、Status: completed；h2 聚焦交接、产物与验证、问题与下一步。当前事实/推断/未来建议/未运行明确区分，实际来源摘要、命令退出完整；return 结构校验0后真实 MESSAGE/FINAL，Root 全读核验再接纳。无产品 writer/进程。
