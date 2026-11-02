# 原始输入：历史快照

<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/inputs/HUHU-智能体终端-完整架构与重构方案.md</Path> 是用户要求完整复制的原始方案，保持 1,278 行、101,143 字节，SHA-256 `c71b8637aef44c57f78cd5fd51da08e74ab37b004056c4012d7e6ad03bbb7aee`。原文件的标题、“明确决策”、类型、错误码、性能建议和阶段安排属于当时方案，不是当前执行指令。

当前行为唯一见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>，§10 逐项映射 U1–U7、A01–A13、T01–T32。局部 ADR 与 DESIGN 分别负责架构与视觉交互；LOG 保留真实答复。

主要替代关系：采用 Herdr 式终端协作；完整 Run/Outbox、结构化 Provider 平台和业务 DB/账号搬迁不作为前置；允许同 Vault 跨 Space 明确寻址；保留轻量邮箱、历史、审批、浏览器与数据恢复要求。旧全文作为证据保留，不能把它的旧限制与最新 Spec 并列为两套合同。

T 的最新实施顺序与逐票验收由 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path> 拥有；CLI 工程约定由 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 派生，新增研究与可定位源码见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>。原输入仅作原貌保存，不把其中旧实施阶段与当前 Tickets 并列执行。
