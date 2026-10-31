---
schema_version: 3
artifact: triage
change: 2026-10-31-huhubot-pi-refactor
mode: intake
disposition: needs-triage
verification: pending
remote_actions: []
source: .agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/source.md
classification: mixed
risk: high
route: specdev/grill-with-docs
ready_for_implementation: false
updated_at: '2026-10-31'
---

# Triage：以 Pi 替换完整 Bot

## 当前判定

影响为全 Bot 运行/持久化/权限/UI/发行闭包；并非局部 SDK 替换。紧急度 normal，无正在处理的生产事故证据。实际读取 manifest、module、api、package、宿主桥与 UI-001：当前按页启动旧 Runner，拟改启动服务+懒 UI。旧 API 已有审批、来源和预算领域，重构不得误写成“原来完全没有这些功能”。

本轮被分类为 documentation + refactor planning + prototype。静态源码核对已完成必要入口；产品验证仍 pending。不得把 metadata 的 verification 改为 passed 来制造 ready-for-agent。

## 来源与重复检查

冻结完整 Issue、元数据及 0 条可见评论。活动目录读取时只看到 dev-stabilization-overhaul 与 archive；没有相同名称的新 change。完整 archive/permanent ADR 的全量重复搜索尚未完成，发布前必须完成精确 canonical_locator 检查；发现既有 #39 change 时恢复/合并，不新造第二状态 owner。相邻 #37 UI 是复用关系，不自动判定重复。

## 未知项

| 类型 | 内容 | 关闭责任 |
|---|---|---|
| 可发现事实 | 支持宿主矩阵、Node/ABI/utilityProcess、真实发行路径与 SDK assets | T-01 |
| 可发现事实 | 全部旧引用闭包、依赖许可、MCP 官方 SDK/协议互操作组合 | T-02 / T-20 |
| 用户决定 | 新原型是否准确表达用户期望；失败后的最低宿主版本取舍（仅在 P0 证明有冲突时询问） | T-03 / G |
| 候选参数 | children=2、depth=2、root attempts=16；本轮未提升为已批准性能承诺 | T-15 |
| 局部实现细节 | 文件拆分、非公共内部函数、局部缓存结构 | 后续 I 按合同决定 |

## 路由

Triage → Grill（复核 Issue 已决定事项）→ S（可评审 Spec）→ T-tickets（完整 draft DAG）→ P-goal-plan（plan-only）。原型作为 S/T 的设计证据；未明确确认的新 UI 不进入 Ready。相关 Work 的实际使用见 evidence/workflow-activation.md。

## 实施简报

唯一 Pi harness，保留独立 huhubot 模块；先证明 packaged host 能运行，再只读纵切、安全交付、个人能力、协作、跨模块/MCP、删除收口。完整行为交 spec.md，局部施工交 ticket/，全局 Gate 交 goal-plan.md。不在本轮执行这些未来步骤。

P0 尚无真实 Obsidian 测试；纯 HTML 原型测试只证明 mock 交互。用户旧磁盘状态保持不动；无旧 API/双引擎兼容承诺；涉及不可逆副作用必须审批绑定与 unknown_effect 对账。

## 打标回执

未请求 Issue 标签修改；未执行远程写入，也未关闭 #9/#36/#37/#38/#39。PR 发布未完成，不能把 PR 草稿文件当远程回执。
