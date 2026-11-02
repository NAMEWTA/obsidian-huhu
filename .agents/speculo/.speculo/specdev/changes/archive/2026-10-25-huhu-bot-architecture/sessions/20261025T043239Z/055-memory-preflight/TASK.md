---
schema_version: 2
session: "20261025T043239Z"
task: "055-memory-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 私有与全局记忆的实施接缝预检

## Goal
为后续 T14/T15 提供可直接实施的来源、作业与清除代数边界，尽早发现即将开始 T11/T12 的最小共享合同需求。仅只读研究，不启动下游代码。原 /root/foundation_research；仅 Root 实际 followup_task 启动，沿原模型偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；当前 Map13/Goal12，LOG051/071。复用已读 AGENTS/运行指南/dev。完整读 T14/T15 和 Spec/ARCH/ADR 对应记忆、上下文隔离、来源及永久清除段落；T17 只读与记忆传播相交的合同。复用 IMPLEMENTATION-REFERENCES.md 中既有固定源码/许可/近两年活动证据、041/045/047 已接纳研究，勿把其建议当当前已装配代码。

当前048/049仅修复事件/审批三项问题；后续T07与T11/T12窗口尚未开启。现有生产路径先rg --files定位并记录读取时点/摘要，不能把尚未存在的memory/usage/group函数写成观察事实。

## Workspace and Scope
只写本TASK REPORT、观察清单/资料来源与原始日志，可使用一次性资料缓存。无生产/测试/锁/规范/正式Evidence/Map写权。不得运行构建、产品测试、模型、Provider、系统keyring、Obsidian或下载程序；不得提交/推送/发布。源码/当前官方文档只读；陌生点优先复用已有固定开源研究，缺失才补核近两年活动、许可证和具体机制。不与当前性能验证争重计算资源。

聚焦如下实现问题，避免重复整份Spec或扩大产品方向：

- private/session/workThread/global 四种上下文的真实合成顺序、所有权与禁止跨私聊读取，旧来源/Grant失效后摘要和记忆的再外发条件。
- 自动私有记忆维护的触发/幂等/固定配置/预算用途/作业身份；复用同一模型请求Port，等待/取消/未知用量与正文保留，不能另开无预算引擎。
- 全局记忆只能提案后用户确认；共享来源的披露、版本冲突和短事务生效，模型文本不能成为确认。
- forget、会话/Source清除与迟到作业之间的持久代数/墓碑/来源传播；区分已交付Vault文件、最小安全账本与应清除正文，保证后续T17能接入而不复活旧内容。
- 检索/摘要/工具schema与结果的有界数据、空结果/截断/错误/取消；沿已选参考设计，不自增embedding/vector依赖或额外模型默认值。

## Acceptance
简明给出已知现状与建议的最小API/表/作业合同、准确原owner路径，以及本地SQLite/受控模型回调的关键故障矩阵。特别指出T11/T12此时就需预留的身份/用途/来源接缝；如现有047预算Port已足够，明确无需额外扩展。未运行矩阵全部标明未运行，真实Provider/Obsidian/目标OS用户后验。没有新的用户产品决定则直接给既有合同内建议，不重问凭证。

REPORT以约5000中文字符为目标，详细来源/行段可放observations附件；结论要能复验，避免重复大量历史。重要共享合同缺口先消息Root；研究完成即停，不等待未来开工。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 055-memory-preflight、Status: completed；h2 聚焦交接、产物与验证、问题与下一步。记录实际来源/摘要/命令退出与未运行边界，所有命令Wait、无遗留进程；实际return结构校验0后MESSAGE和FINAL，Root完整回读核验后接纳。
