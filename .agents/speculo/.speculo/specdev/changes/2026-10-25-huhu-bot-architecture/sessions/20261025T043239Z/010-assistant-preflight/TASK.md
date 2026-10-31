---
schema_version: 2
session: "20261025T043239Z"
task: "010-assistant-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T-02 凭证与配置实施预检

## Goal
在T-01独立审查进行时，完成T-02只读实施预检，优先解决跨平台专用凭证管道与受保护提供方的具体可实现接缝。用户要求全面代码开发，真实模型/OS/Obsidian操作自行验收；不索取凭证、不访问真实系统秘密。不得写生产代码或改变T-01冻结输入，T-02代码派单待依赖完成。

## Inputs
Map7→当前dev/适用refs→ticket/02-bot-model-credentials.md，Spec/ARCH/ADR，已有 evidence/credential-interface-research.md、002研究与004底座报告、冻结api.ts/application/API/CLI与ProfileStore。复用已有研究，别从零重做全库探针。REF-09 macOS实际Set走security -i stdin，注意4096检查前启动子进程与超时问题。Node额外pipe可跨父子；Windows句柄不等于fd3，原始libuv引用尚需固定。

## Workspace and Scope
根 /home/wta/orca/workspaces/obsidian-huhu/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715。所有产品、schema、正式状态、Evidence和其他TASK只读；只写本目录REPORT/来源与外部临时探针。不能使用真实keyring、环境秘密、Vault或生产Profile。可用一次性哨兵/离线可控stub研究，网络仅查公开官方源码/文档与明确许可。

## Acceptance
报告可直接派代码的结论：1.固定额外匿名管道的TS/Go帧、注册/删除/查询模式、授权/边界/超时与清理；Windows libuv附加stdio ABI或已验证替代方案，引用固定来源，不把凭证放HAP/argv/env/文件。2.拟采用OS keyring依赖精确版本/许可/平台行为，以及明确session-memory退化，秘密不进入日志/错误。3.默认Bot稳定初始化、Persona/ModelBinding修订CAS/历史快照、disable/deletePreview与未来活动/成员/记忆Ports设计。4.逐项列出T-01共享owner精确改动请求（api/schema/Go module/migration/router/bootstrap）和T-02自有路径，以及可复跑主/故障测试。遇到公共DTO不能实现完整合同要明确指出，不擅改。不要扩大用户产品决定或将现场测试设为代码开工门。不得再派遣。

## Return
REPORT按coordination/report-template.md，Session/Task/Status、聚焦交接/产物与验证/问题与下一步。证据区分源码事实、推断和未运行OS；结构return检查通过后立即交回，后续由Lead给T-02正式实施任务。
