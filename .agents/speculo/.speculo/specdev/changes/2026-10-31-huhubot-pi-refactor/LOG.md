# 设计讨论与研究日志

没有虚构用户访谈轮次。以下是对已给需求的逐项核对；新 HTML 未经用户批准。

## LOG-001

2026-10-31：唯一 Pi harness；不保留旧 Bot 兼容路径。状态 accepted-from-source。输入 Issue §0/§6/§15，结论落于 ADR-001；避免双重调度/上下文/重试真相；代价是断代与全部消费者原子切换。 T-01 SDK 接缝、T-23 删除闭包、A03/A07/A28。

## LOG-002

2026-10-31：独立模块与宿主/运行侧分离。状态 accepted-from-source。输入 Issue §1/§4/§5，结论落于 ADR-002；沿用模块边界且支持未来 transport；代价是 DTO、校验和取消传播。 T-02 依赖检查、T-04 lifecycle、api-contracts.md。

## LOG-003

2026-10-31：utilityProcess 为带硬门禁的首选。状态 conditional-from-source。输入 Issue §6/§7，结论落于 ADR-003；故障隔离但不是代码沙箱。失败须先形成单一路径 ADR 和最低宿主要求。 T-01 四平台矩阵；未测不可标 Ready，见 acceptance-plan.md。

## LOG-004

2026-10-31：四类存储权威与效果对账。状态 accepted-from-source。输入 Issue §2/§8，结论落于 ADR-004；可解释恢复，保护审批/预算；代价是检查点与 reconciliation。 T-06/T-07/T-14 故障注入和 data-contracts.md。

## LOG-005

2026-10-31：第一条写工具前完整安全链。状态 accepted-from-source。输入 Issue §10/§11，结论落于 ADR-005；阻断旁路和 TOCTOU，增加工具集成成本；不承诺无沙箱任意代码隔离。 T-07 敌对矩阵，T-08/T-09 真写回执。

## LOG-006

2026-10-31：树、运行与通信分离。状态 accepted-from-source。输入 Issue §2/§12，结论落于 ADR-006；数据语义稳定；代价是三种投影和显式映射。 T-15/T-16/T-17；collaboration.md。

## LOG-007

2026-10-31：事实记忆优先，向量不做真相。状态 accepted-from-source。输入 Issue §11.3，结论落于 ADR-007；本地可解释、避免额外远程数据流；代价是检索质量需 CJK/英文夹具。 T-13；Hana FactStore 的 CJK 机制可适配，耐久参数不照抄。

## LOG-008

2026-10-31：复用 DESIGN-0002，不产生新品牌体系。状态 accepted-from-user。输入 本轮用户 + 现有 UI-001 / DESIGN-0002，结论落于 ADR-008；与全插件保持一致；实际新原型仍需单独确认。 T-03 人工确认 + T-22 宿主可访问性；DESIGN.md。

## LOG-009

2026-10-31：MCP 只有一套 client owner；版本先核实。状态 conditional-from-source。输入 Issue §14 + R-008，结论落于 ADR-009；减小重复基础设施；代价是需互操作测试和外部身份/授权设计。 T-20/T-21；2025-11-25 保留为 Issue 参考，不叫最新。

## LOG-010

2026-10-31：无自动旧数据迁移与删除。状态 accepted-from-source。输入 Issue §0/§15，结论落于 ADR-010；遵守无兼容与用户数据保全；代价是用户可见旧数据说明。 T-14/T-23/T-24；禁止误删 agent/PTY/Browser/通用安全服务。

## LOG-011

2026-10-31：本轮只规划与原型，不隐含实施。状态 accepted-from-user。输入 sources/user-request.md，结论落于 ADR-011；可提前评审重大取舍；代价是 P0 与 UI 意图批准需后续证据。 全文件路径白名单；PR-DRAFT.md 无 Closes，ready_for_execution=false。

## LOG-012

2026-10-31：读取 Pi 1.4.0 package/sdk/runtime、Hana Engine/FactStore/LICENSE、OpenClaw agent-loop、OpenBoard BoardView，以及 UI-001 与 DESIGN-0002。研究产物唯一由 reuse-map.md 接收；没有下载/复制外部产品执行代码。

## LOG-013

2026-10-31：官方 MCP v2 文档出现 2026-07-28 协议，和 Issue 的固定 2025-11-25 参考形成时效差异。只记录可发现事实，不替用户静默升级。验证 SDK+transport+客户端组合后回到 ADR-009 关闭条件。

## LOG-014

2026-10-31：GitHub connector 只有 GET/读取动作；Plugin Management 搜索未取得可用写入动作；当前 Browser 是 Chat 只读；容器 clone 失败于 DNS。未创建 PR。继续本地可交付文档和原型，不把权限缺口转成成功回执。

## LOG-015

设计树 round=1 表示首次来源决策核对，answered 的回答来自用户原 Issue 或本轮请求，不虚构新访谈。未取得本轮 HTML 确认，整体不标 consensus。
