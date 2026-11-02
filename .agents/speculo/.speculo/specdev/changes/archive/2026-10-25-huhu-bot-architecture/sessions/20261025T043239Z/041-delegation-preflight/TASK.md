---
schema_version: 2
session: "20261025T043239Z"
task: "041-delegation-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-11
---

# T11/T12 委派与调用树接缝只读预检

## Goal
只读核对即将到来的 Bot 发现、已有/临时执行、通信/再委派、调用树预算接缝，给 Root 精确原 owner 请求与最小真实故障矩阵；本任务不写产品、不激活 T11/T12 实施。

## Inputs
沿已读 AGENTS/workspace/catalog/runtime、Map10/Goal9、dev 与相关架构/测试/许可，完整读 ticket/11-delegation-directory.md、12-messages-limits-budget.md、Spec/ARCHITECTURE/ADR 对应章节、已固定参考 REF01/03/04 和034/036报告。当前 r2 131文件/36来源 SHA78581af912849fe0591b3bb697859a903e167b2642a099d4185d95c7e2d81588 正在040独立复审，禁止产品写入。原生执行者 /root/foundation_research，复用已有模型偏好，不伪造 runtime attestation。

## Workspace and Scope
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot、branch NAMEWTA/bot、base33c21e098ef3188cbab5a09f3e0a01fadb787715。只写自有 REPORT/observations/日志。依据真实当前 API、Run/Session/Config pin、Grant 来源及有效派生历史、命令幂等/预算、执行器 accepted/continuation 接缝，核对父子树授权、临时身份与持久 Bot 区别、已有 Bot 状态、自动消息可见性、反环路和共享硬上限。T06后续会完成审批CP/continuation，研究不能假装已存在；明确候选端口和消费者，不写平行公共 API。陌生机制先核验已固定近两年活跃许可明确源码，必要只查官方来源，记录固定 SHA/依赖/风险，不复制代码。不要重跑旧 D-Bus，访问真实模型/Vault/keyring，运行产品进程或委派。需新共享文件时列原owner+准确路径+目的，不能以研究授权写入。没有引用的事实标建议。

## Acceptance
交付当前真实调用链、可复用机制、需要T01/T02/T03/T05/T06原owner维护的最小精确路径，T11/T12各自独立写集/资源与先后顺序，以及预算/并发/取消/重启/父子来源/幂等的真实公共消费者验证矩阵。明确当前事实、未实现建议和后续用户现场边界；不增加范围或用户审批。

## Return
REPORT首个h2前含 Session: 20261025T043239Z、Task: 041-delegation-preflight、Status: completed；h2聚焦交接、产物与验证、问题与下一步。完整来源摘要，所有命令退出、无writer；return结构校验0后真实MESSAGE/FINAL交回Root。Root全读前不冒充接纳。
