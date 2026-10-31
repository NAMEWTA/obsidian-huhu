---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: true
design_ref: <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/DESIGN.md</Path>
change: 2026-10-31-browser-shared-session-space
id: T-02
title: Space 与真实人工浏览纵向闭环
status: draft
kind: refactor
planning_depth: deep
planning_depth_reason: 跨宿主安全、授权撤销或数据/发行边界；不能用 mock 当产品证据。
ready: false
risk: high
blocked_by:
- T-01
contract_ids:
- AC-001
- AC-004
- AC-005
- AC-006
- AC-007
- AC-034
- AC-037
owner: unassigned
expected_changes:
- <Path>src/modules/browser/core/model.ts</Path>
- <Path>src/modules/browser/core/ports.ts</Path>
- <Path>src/modules/browser/api.ts</Path>
- <Path>src/modules/browser/services/workspace-service.ts</Path>
- <Path>src/modules/browser/platform/desktop/metadata-repository.ts</Path>
- <Path>src/modules/browser/platform/desktop/electron/session-manager.ts</Path>
- <Path>src/modules/browser/platform/desktop/electron/host-policy.ts</Path>
- <Path>src/modules/browser/platform/desktop/capabilities.ts</Path>
- <Path>src/modules/browser/platform/desktop/composition.ts</Path>
- <Path>src/modules/browser/module.ts</Path>
- <Path>src/modules/browser/ui/BrowserWorkspacePage.tsx</Path>
- <Path>src/modules/browser/ui/SpaceNavigation.tsx</Path>
- <Path>src/modules/browser/ui/BrowserToolbar.tsx</Path>
- <Path>src/modules/browser/settings.ts</Path>
- <Path>src/modules/browser/i18n.ts</Path>
writable_paths:
- <Path>src/modules/browser/core/model.ts</Path>
- <Path>src/modules/browser/core/ports.ts</Path>
- <Path>src/modules/browser/api.ts</Path>
- <Path>src/modules/browser/services/workspace-service.ts</Path>
- <Path>src/modules/browser/platform/desktop/metadata-repository.ts</Path>
- <Path>src/modules/browser/platform/desktop/electron/session-manager.ts</Path>
- <Path>src/modules/browser/platform/desktop/electron/host-policy.ts</Path>
- <Path>src/modules/browser/platform/desktop/capabilities.ts</Path>
- <Path>src/modules/browser/platform/desktop/composition.ts</Path>
- <Path>src/modules/browser/module.ts</Path>
- <Path>src/modules/browser/ui/BrowserWorkspacePage.tsx</Path>
- <Path>src/modules/browser/ui/SpaceNavigation.tsx</Path>
- <Path>src/modules/browser/ui/BrowserToolbar.tsx</Path>
- <Path>src/modules/browser/settings.ts</Path>
- <Path>src/modules/browser/i18n.ts</Path>
read_only_paths:
- <Path>AGENTS.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ADR.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/DESIGN.md</Path>
shared_paths: []
shared_path_owners: []
skill_bindings: []
---

# Ticket T-02：Space 与真实人工浏览纵向闭环

总体 Map：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/tickets-map.md</Path>；Spec：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>；完成证据目标：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/evidence/T-02.md</Path>（未来执行时创建）。

## 目标与来源

用户创建 Space、打开真实网页、同源多页共享站点状态；不同 Space/Vault 隔离；重启保留站点数据但不恢复 Agent 控制。

来源为 source.md 的相应 F/B 行、ADR、现行 API/装配和 reuse-analysis。已有架构入口与读取范围见 baseline-and-impact；未读消费者不能当作已核验。

## 行为与范围

IN：上述纵向用户/调用方路径，包含失败与恢复。REUSE：现有模块装配/服务撤销/既有宿主桥/设计体系与真实测试接缝。OUT：无关 Shell、Bot 引擎或终端重构，旧运行时兼容，任何本轮产品代码变更。

frontmatter 路径是未来候选写集，不是现在授权。不存在的文件标为拟新增；删除路径仅在 T-01 清单确认后执行。凡公开 API、i18n、module/composition、build 需要同步，提交给集中 owner；不越过本票写集直接修改。测试 colocated 文件须在执行前登记为本票精确写集。

## 验收标准

- [ ] AC-001 / B01：浏览器可直接使用，不下载/启动独立 Chromium
- [ ] AC-004 / B04：Cookie/localStorage/IndexedDB 按真实浏览器规则共享；不把 tab-local 状态误判为必须共享
- [ ] AC-005 / B05：不串登录；复制同身份文件不意外接管原 partition
- [ ] AC-006 / B06：持久站点数据按合同保留；控制授权不恢复；过期网站会话不被伪报已登录
- [ ] AC-007 / B07：不重复导航、不新建 guest，不丢页面内存；资源数量有上限
- [ ] AC-034 / B34：明确 unsupported/unavailable；不加载 Node/Electron 到移动端路径
- [ ] AC-037 / B37：仅恢复允许的元数据和网站数据，不自动恢复 Agent 控制或重放外部效果



## 验证方法

逻辑测试 canonical-root/partition、元数据原子写和损坏文件；真实宿主测两 Space 两 Vault 加复制 Vault、完整重启、移动端懒加载、React 更新时 guest 身份稳定。

| 行为/风险 | 接缝 | 步骤与预期 | Evidence |
|---|---|---|---|
| 正常纵向路径 | 真实宿主 / 适用服务集成 | 按 acceptance-matrix 中本票 AC 对应步骤，保存实际身份、结果及固定输入 | evidence/T-02.md |
| 失败/撤权/数据边界 | 受控 fixture 与故障注入 | 检查 rejected/cancelled/unknown/cleanup-pending，不能全归 generic error | evidence/T-02.md |
| 回归与边界 | 当前项目定向检查 | 按 testing 参考与实际 package.json 选择；新增命令执行前登记 | evidence/T-02.md |

E2E disposition：required。原因：本票涉及宿主/跨模块/发行边界，单纯 DOM mock 不能判卷。执行环境复用 README 的唯一真实 change workspace；Lead 固定 commit/快照后验收，不临时建立另一候选 checkout 冒充同一输入。本轮这些检查均未运行。

## 执行约束与资源所有权

实施入口为 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`；需额外获得明确实施授权。项目必需方法：`.agents/skills/dev/SKILL.md`，涉及 UI 同时 `.agents/skills/ui/SKILL.md`，按风险读取 testing/architecture/motion-a11y 参考。当前已读取入口，但没有真实 checkout 的原文件 SHA-256 绑定；**必需项不是可选**，skill_bindings 暂空是 draft 阻塞，不是豁免。进入 Ready 前按 skill-invocation 固定 id/path/真实 sha256/phase/operation/inputs/outputs/required/on_failure，并把实际执行记录写本票 Evidence。

语义资源：browser Session/Page registry、控制代次、公共 Browser API、HAP wire、生成物各有集中 owner，见 Goal/Map。resource_claims/shared_paths 也须在 T-01 明确精确路径和真实 schema 后填写；目前不允许按空数组推导可并行。对所有实施票先串行整合，只有路径和语义冲突证明排除后才由 Lead 并行。

## 未决事项与风险

在首次导航前装上默认拒绝安全策略；不等待 T-06 才启用隔离。元数据损坏保全，不把复制 Vault 的同 ID 当成同一分区。

### 未决问题与 DoR 解除条件

T-01 真实探针与完整调用图尚未执行；它是本票生产者。 前置 T-01 的固定 evidence 需逐项回读，不因上游状态 done 自动提升 Ready。

还需要：D-013 设计批准（UI 相关）；唯一生产 surface 的能力结果；本票候选写集收窄和资源 claims、必需 Skill SHA-256 绑定；Spec/Map/Ticket 官方检查通过；本票正常/失败/恢复 fixture 可运行；有明确实施授权。资料缺口只阻断依赖闭包；本轮完整 draft 可审，不以文档数量声称 ready。
