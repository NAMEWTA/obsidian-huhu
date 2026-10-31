---
schema_version: 3
plan_contract_version: 1
resource_claims:
- huhubot:public-contract
- huhubot:state-schema
- huhubot:composition
artifact: ticket
ui_change: true
design_ref: null
change: 2026-10-31-huhubot-pi-refactor
id: T-12
title: Skills 与资源快照可见、可撤销地生效
status: draft
kind: refactor
planning_depth: deep
planning_depth_reason: 跨宿主/权限/持久化/设计或发行合同；需可观察负向与恢复证据，不以骨架代替交付。
ready: false
risk: high
blocked_by:
- T-11
contract_ids:
- AC-007
- AC-018
owner: unassigned
expected_changes:
- <Path>src/modules/huhubot/platform/desktop/runtime/pi-resource-loader.ts</Path>
- <Path>src/modules/huhubot/services/tool-registry.ts</Path>
- <Path>src/modules/huhubot/ui/settings/</Path>
writable_paths:
- <Path>src/modules/huhubot/platform/desktop/runtime/pi-resource-loader.ts</Path>
- <Path>src/modules/huhubot/services/tool-registry.ts</Path>
- <Path>src/modules/huhubot/ui/settings/</Path>
read_only_paths:
- <Path>AGENTS.md</Path>
- <Path>.agents/skills/dev/SKILL.md</Path>
- <Path>.agents/skills/ui/SKILL.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/spec.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/ADR.md</Path>
shared_paths:
- <Path>src/modules/huhubot/api.ts</Path>
- <Path>src/modules/huhubot/module.ts</Path>
- <Path>src/modules/huhubot/core/model.ts</Path>
- <Path>src/modules/huhubot/platform/desktop/storage/state-store.ts</Path>
shared_path_owners:
- <Path>src/modules/huhubot/api.ts</Path> => T-04（集中所有权；后续修改须重开该合同并串行集成）
- <Path>src/modules/huhubot/module.ts</Path> => T-04（集中所有权；后续修改须重开该合同并串行集成）
- <Path>src/modules/huhubot/core/model.ts</Path> => T-07（集中所有权；后续修改须重开该合同并串行集成）
- <Path>src/modules/huhubot/platform/desktop/storage/state-store.ts</Path> => T-07（集中所有权；后续修改须重开该合同并串行集成）
review_independence: required
review_risk: high
---

# T-12 · Skills 与资源快照可见、可撤销地生效

## 合同与执行入口

阶段目标 P3。规格 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/spec.md</Path>；编排 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/goal-plan.md</Path>；实际证据目标 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/evidence/T-12.md</Path>（尚未产生，不预填通过）。本轮只规划；获得独立实现授权后执行 <Path>.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md</Path>。

## 用户可观察目标

恶意SKILL不能安装/开权限；HOME其他工具目录不自动扫；更新前后snapshot可追溯；可执行第三方默认不可达。

## 范围、复用与非目标

IN：Skills 与资源快照可见、可撤销地生效这一纵切及其负向/恢复/观察路径。REUSE：Issue #39 §17 的既有路线、同模块 ports 与所属业务 public API。OUT：其他票的功能、第二 harness、旧协议兼容、自动迁旧数据、永久知识改写、远程发布/merge。本票写集是拟议边界，T-02发现真实路径后仅做必要精化，不创建所有空目录。

## 关键决定与施工路线

批准root/hash/顺序与来源；Pi ResourceLoader只获限定资源；Markdown与可执行extension信任分层；更新影响下一安全边界，live revoke仍立即有效。

先锁输入、owner、版本与失败后保证，再补最小纵向实现，最后运行对应正向/竞态/取消/恢复夹具。行为接口不得改写 Spec；涉及新取舍回 ADR，不用局部实现偷改范围。外部工具/生产I/O仅在已有授权与测试隔离内操作。

## 依赖、资源与写集

开始前置：T-11。写路径以 frontmatter 为准；跨共享 api/schema/composition 的改动由对应 shared owner 串行集成，即使分属不同目录也不并发改同一语义合同。T-23是最终构建闭包集中owner；P0隔离spike不改root依赖，生产引入新依赖时需先由Lead重新计划集中owner，不让未来T-23票变成隐含早执行授权。

本票有 UI；按本 change DESIGN revision 1 草案及 UI-001 导航，`design_ref: null` 表示尚未拿到本次用户批准与正式设计 digest。T-03 产出批准记录后填写 revision/digest/pages/acceptance，再重审 DoR；不能引用旧 change 的 approved digest 冒充本次批准。

## 验收

- [ ] AC-007 / A07：real SDK tool dispatch
- [ ] AC-018 / A18：resource loader / MCP catalog

## 验证与证据

| 验证 | 接缝与输入 | 观察 / 证据 |
|---|---|---|
| 正向纵切 | acceptance-plan 中本票 AC 夹具 | 原始数据/回执/界面实际状态，不只 assert catch |
| 拒绝与竞态 | 双命令、变版本、revoke、旧generation | 拒绝发生在效果前；已有副作用逐项如实呈现 |
| 恢复 | 中途取消/崩溃/未知结果 | 固定 effectId 对账，不换key制造“成功重试” |
| 工程 | 变更触及的 lint/unit/architecture/i18n/UI/styles/docs/license/build/bundle | 记录实际命令、退出码、固定输入/环境；未执行明确标注 |
| 独立审查 | 标准轴+规范轴，各自证据 | review 不由实施自评冒充；finding关闭前不Done |

E2E disposition：required（真实 SDK/Host/业务/发行接缝按本票范围）。测试文件是未来实现产物，不在此假装已有测试命令。可复用的现有命令见 acceptance-plan；新增测试须加入既有聚合入口。

## 必需方法与 DoR 缺口

执行入口 I；项目 dev skill 对生产修改 required，UI skill 对本票 UI required；内容/许可/宿主测试参考按真实改动选择。路径已列 read_only；本轮未形成可验证原始字节的 SHA-256 绑定与完整 reference closure，故不填伪造的 required binding。进入 Ready 前在完整checkout计算当前skill及命中reference hash，按 ticket schema 的 skill_bindings（phase/operation/inputs/outputs/on_failure=block-ticket）补齐，读入口不等于执行方法。

上游证据由 T-11 生产；收到证据不会自动把本票提升ready。还需：实现授权、完整checkout/基线漂移核查、正式schema/plan-quality-review、独立review安排、适用design批准、外部环境可用。

## 失败、回滚与升级

只对确认未产生效果/可幂等的操作做有界重试；相同输入方法失败且无新证据不重复。已确认部分效果或结果未知，停依赖工作并保留原ID核对。代码checkpoint可回退不意味着外部效果撤回；用户旧文件/日志与可信receipt保全。跨合同偏差由Lead返回真正owner，不能放宽测试或禁用安全检查。
