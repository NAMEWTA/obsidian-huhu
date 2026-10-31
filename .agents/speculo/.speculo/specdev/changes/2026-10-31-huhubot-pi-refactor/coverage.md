# Issue 逐节完整覆盖

本表是规划导航，不复制状态或标记实现完成。原文完整保留；本轮所有未来实现未执行。

| Issue节 | 要求 | 主要接收文档 | Ticket/Gate |
|---|---|---|---|
| §0 | 整体替换与本轮授权 | README.md / ADR.md / DECISIONS.md | T-01、T-23 |
| §1 | 真实dev/模块/API/agent保护 | architecture.md / deletion-map.md | T-02、T-04、T-23 |
| §2 | 六项修正 | CONTEXT.md / data-contracts.md / tool-security.md | T-05、T-07、T-15 |
| §3 | GitHub复用/许可 | reuse-map.md | T-02 |
| §4 | 双执行侧 | architecture.md / api-contracts.md | T-04、T-07 |
| §5 | 目录/依赖/组合根 | architecture.md | T-02、T-04 |
| §6 | Pi/Node/ESM/宿主硬门 | acceptance-plan.md / ADR.md | T-01、T-05 |
| §7 | 启动/关闭/lease/generation | architecture.md / api-contracts.md | T-04、T-06 |
| §8 | 四类数据/耐久/恢复/忘记 | data-contracts.md | T-06、T-13、T-14 |
| §9 | 领域/公共API/事件 | CONTEXT.md / api-contracts.md | T-04、T-05、T-06 |
| §10 | 工具/宿主API/安全 | tool-security.md / integrations.md | T-07–T-10 |
| §11 | 模型/Skill/记忆/预算 | tool-security.md / data-contracts.md | T-07、T-11–T-13 |
| §12 | Team/委派/Mailbox/画布 | collaboration.md | T-15–T-17 |
| §13 | 完整UI与样例A–D | DESIGN.md / prototypes/UI-001/design-system.md | T-03、T-09、T-17–T-19、T-22 |
| §14 | MCP/未来服务化 | integrations.md / reuse-map.md / ADR.md | T-20、T-21 |
| §15 | 删除清单与数据保全 | deletion-map.md | T-02、T-14、T-23 |
| §16 | 相邻Issue协调 | integrations.md | T-02、T-18 |
| §17 | P0–P6纵切 | tickets-map.md / goal-plan.md | T-01–T-24 |
| §18 | A01–A28及工程门禁 | spec.md / acceptance-plan.md | 所有对应票 + T-24 |
| §19 | 风险与条件 | ADR.md / goal-plan.md | G0–G7 |
| §20 | 完整原始定位 | sources/issue-39-body.md / reuse-map.md | T-02 |
| §21 | 最终DoD | goal-plan.md / acceptance-plan.md | T-24 |

A01–A28 → AC-001–AC-028 为一一映射，详见 spec.md 和 tickets-map.md；没有把 Browser、MCP、协作、数据恢复或完整 UI 延后成“非必需”。后续 HTTP/WS/Web/IM/vector 按原 Issue 留在本次关闭范围外。
