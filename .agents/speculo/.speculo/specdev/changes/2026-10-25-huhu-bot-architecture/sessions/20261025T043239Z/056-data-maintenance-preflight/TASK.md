---
schema_version: 2
session: "20261025T043239Z"
task: "056-data-maintenance-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-19
---

# Portable与Profile备份恢复的只读实施预检

## Goal
为后续T18/T19明确现有SQLite驱动的实际备份/迁移接口、内容包与Profile运行身份的边界，以及T17清除如何阻止旧备份复活内容。只读研究，原/root/foundation_research；仅Root实际followup_task启动，沿原模型偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715；Map13/Goal12、LOG051/071。当前050正独立复审169文件候选2，Input SHA b7701a7987833a19f91387607feedb7eb5314864bdd0ac953ea61ceb02d1de33；所有生产冻结，T18/T19均未开工。复用已读AGENTS/runtime/dev与055报告及evidence/memory-preflight.md。完整读T18/T19，Spec/ARCH/ADR对应portable/备份/恢复/数据边界段；T17只读与清除传播相交部分。

先rg --files定位当前真实profile/sqlite/migrations/blob/bootstrap/api/portable预留方法，记录时点/摘要；不存在的实现明确待建。复用IMPLEMENTATION-REFERENCES固定mattn/ncruces及Hana/OpenBot许可/活动证据；核对当前实际选中驱动及精确版本的本地模块源码/官方文档，不凭其他驱动接口猜测。需要外部查证只用官方/上游源码，遵守当前工具规则，不新加依赖或执行上游程序。

## Workspace and Scope
只写本TASK REPORT、来源/观察/原始日志和一次性只读资料缓存。无生产、测试、锁、规范、正式状态写权；不运行构建、Go/Node产品测试、真实SQLite数据操作、模型、keyring/D-Bus或用户库。不要占用050的性能重窗口。不得提交、推送、发布、安装程序或再委派。

聚焦可直接实施的最小接缝：
1. 当前驱动在线备份API/connection生命周期/WAL/取消及磁盘失败边界；DB+不可变Blob在停止准入/在途/锁后的同一一致集与发布顺序。区分可复用实际API、建议和未验证行为。
2. 启动先判schema/binary/坏库，再备份→迁移→校验→启用；失败保留原库与可解释状态，不能把错误当新Profile创建空库。现有T01迁移/锁/Blob哪些helper需要原owner维护，哪些归T19，不复制第二套bootstrap。
3. 版本化portable包严格字段/大小/hash/路径/重复ID、冲突/映射预览与确认CAS、导入原子性/回执。包只含用户选定内容，新身份/禁自动模型，秘密/有效Grant/审批/CP/活动队列排除；外部来源不可召回直到重新授权。不要发明zip是既定要求，可按已有合同推荐最小格式。
4. T17托管备份清除、旧备份/旧command epoch/旧lease恢复隔离，与055忘却水位/来源墓碑衔接。明确用户显式导出和已交付Vault文件不自动删；恢复不能复活撤权正文或让旧命令重放。

## Acceptance
约4000中文字符以内REPORT，细节可附接口/owner表及准确引用。给出当前观察、可实施顺序、最小公共合同/owner请求和8–12项有价值故障矩阵；矩阵全部标未运行。只有当前T07/T11/T12必须现在预留的真实接缝才提前消息Root，其他留T17–19，避免过早扩共享API。现有公共合同足够时明确无需新增。

这不是T18/T19验收；真实Provider/Obsidian/目标OS用户后验，不提凭证问题。研究完成即停，不等待未来开工。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 056-data-maintenance-preflight、Status: completed；h2聚焦交接、产物与验证、问题与下一步。实际来源SHA/命令exit/局限，无遗留进程；return结构校验0后实际MESSAGE和FINAL，Root全读核验后接纳。
