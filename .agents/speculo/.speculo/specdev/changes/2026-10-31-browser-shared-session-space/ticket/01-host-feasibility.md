---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-browser-shared-session-space
id: T-01
title: 宿主可行性与唯一表面定案
status: draft
kind: investigation
planning_depth: deep
planning_depth_reason: 跨宿主安全、授权撤销或数据/发行边界；不能用 mock 当产品证据。
ready: false
risk: high
blocked_by: []
contract_ids:
- AC-001
- AC-005
- AC-006
- AC-016
- AC-018
- AC-019
- AC-026
- AC-034
owner: unassigned
expected_changes:
- <Path>scripts/obsidian-acceptance/browser/**</Path>
- <Path>docs/e2e/browser-host-capabilities.md</Path>
writable_paths:
- <Path>scripts/obsidian-acceptance/browser/**</Path>
- <Path>docs/e2e/browser-host-capabilities.md</Path>
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

# Ticket T-01：宿主可行性与唯一表面定案

总体 Map：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/tickets-map.md</Path>；Spec：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>；完成证据目标：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/evidence/T-01.md</Path>（未来执行时创建）。

## 目标与来源

在一次性测试 Vault 证明 F01–F12，登记实际宿主、平台、消费者与删除路径，选择唯一表面；不满足则输出阻断而非替代浏览器。

来源为 source.md 的相应 F/B 行、ADR、现行 API/装配和 reuse-analysis。已有架构入口与读取范围见 baseline-and-impact；未读消费者不能当作已核验。

## 行为与范围

IN：上述纵向用户/调用方路径，包含失败与恢复。REUSE：现有模块装配/服务撤销/既有宿主桥/设计体系与真实测试接缝。OUT：无关 Shell、Bot 引擎或终端重构，旧运行时兼容，任何本轮产品代码变更。

frontmatter 路径是未来候选写集，不是现在授权。不存在的文件标为拟新增；删除路径仅在 T-01 清单确认后执行。凡公开 API、i18n、module/composition、build 需要同步，提交给集中 owner；不越过本票写集直接修改。测试 colocated 文件须在执行前登记为本票精确写集。

## 验收标准

- [ ] AC-001 / B01：浏览器可直接使用，不下载/启动独立 Chromium
- [ ] AC-005 / B05：不串登录；复制同身份文件不意外接管原 partition
- [ ] AC-006 / B06：持久站点数据按合同保留；控制授权不恢复；过期网站会话不被伪报已登录
- [ ] AC-016 / B16：普通人工体验成立；Agent 表单操作经过真实框架 fixture
- [ ] AC-018 / B18：同 Session、所有权明确；不支持路径准确反馈，不静默改坏认证
- [ ] AC-019 / B19：无宿主权限泄漏，任意主进程脚本入口不存在
- [ ] AC-026 / B26：唯一 guest，或明确聚焦 owner；新开页面明确是新 pageId
- [ ] AC-034 / B34：明确 unsupported/unavailable；不加载 Node/Electron 到移动端路径

另须 F01–F12 每项有真实环境与结果、唯一表面定案或明确阻断；不能只通过 B 子集便关闭 P0。

## 验证方法

记录 Obsidian 应用与安装器版本、Electron/Chromium、OS/架构、缩放、窗口类型；用同源/跨源存储哨兵和 opener fixture 跑 F01–F12；完整退出全部宿主进程后重启；导出 guest 身份与清理结果。

| 行为/风险 | 接缝 | 步骤与预期 | Evidence |
|---|---|---|---|
| 正常纵向路径 | 真实宿主 / 适用服务集成 | 按 acceptance-matrix 中本票 AC 对应步骤，保存实际身份、结果及固定输入 | evidence/T-01.md |
| 失败/撤权/数据边界 | 受控 fixture 与故障注入 | 检查 rejected/cancelled/unknown/cleanup-pending，不能全归 generic error | evidence/T-01.md |
| 回归与边界 | 当前项目定向检查 | 按 testing 参考与实际 package.json 选择；新增命令执行前登记 | evidence/T-01.md |

E2E disposition：required。原因：本票涉及宿主/跨模块/发行边界，单纯 DOM mock 不能判卷。执行环境复用 README 的唯一真实 change workspace；Lead 固定 commit/快照后验收，不临时建立另一候选 checkout 冒充同一输入。本轮这些检查均未运行。

## 执行约束与资源所有权

实施入口为 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`；需额外获得明确实施授权。项目必需方法：`.agents/skills/dev/SKILL.md`，涉及 UI 同时 `.agents/skills/ui/SKILL.md`，按风险读取 testing/architecture/motion-a11y 参考。当前已读取入口，但没有真实 checkout 的原文件 SHA-256 绑定；**必需项不是可选**，skill_bindings 暂空是 draft 阻塞，不是豁免。进入 Ready 前按 skill-invocation 固定 id/path/真实 sha256/phase/operation/inputs/outputs/required/on_failure，并把实际执行记录写本票 Evidence。

语义资源：browser Session/Page registry、控制代次、公共 Browser API、HAP wire、生成物各有集中 owner，见 Goal/Map。resource_claims/shared_paths 也须在 T-01 明确精确路径和真实 schema 后填写；目前不允许按空数组推导可并行。对所有实施票先串行整合，只有路径和语义冲突证明排除后才由 Lead 并行。

## 未决事项与风险

探针不得在用户真实 Vault 执行；最新 Electron 文档不代表 Obsidian 实际版本。webview 与 WebContentsView 都失败时只阻断依赖闭包。

### 未决问题与 DoR 解除条件

用户尚未授权产品/宿主探针实施；仅可评审此计划。

还需要：D-013 设计批准（UI 相关）；唯一生产 surface 的能力结果；本票候选写集收窄和资源 claims、必需 Skill SHA-256 绑定；Spec/Map/Ticket 官方检查通过；本票正常/失败/恢复 fixture 可运行；有明确实施授权。资料缺口只阻断依赖闭包；本轮完整 draft 可审，不以文档数量声称 ready。
