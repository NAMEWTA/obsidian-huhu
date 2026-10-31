---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-browser-shared-session-space
id: T-10
title: 既有 CLI 与按需本地 Broker 切换
status: draft
kind: refactor
planning_depth: deep
planning_depth_reason: 跨宿主安全、授权撤销或数据/发行边界；不能用 mock 当产品证据。
ready: false
risk: high
blocked_by:
- T-05
- T-07
contract_ids:
- AC-008
- AC-009
- AC-012
- AC-013
- AC-032
- AC-033
- AC-038
owner: unassigned
expected_changes:
- <Path>src/modules/browser/platform/desktop/transport/**</Path>
- <Path>scripts/build-browser-client.mjs</Path>
- <Path>browser-client.cjs</Path>
writable_paths:
- <Path>src/modules/browser/platform/desktop/transport/**</Path>
- <Path>scripts/build-browser-client.mjs</Path>
- <Path>browser-client.cjs</Path>
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

# Ticket T-10：既有 CLI 与按需本地 Broker 切换

总体 Map：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/tickets-map.md</Path>；Spec：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>；完成证据目标：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/evidence/T-10.md</Path>（未来执行时创建）。

## 目标与来源

已有外部调用迁移到单一有限 Broker 与无状态薄客户端；同一授权入口、短期凭据、撤权立即失效，宿主不运行即不可用。

来源为 source.md 的相应 F/B 行、ADR、现行 API/装配和 reuse-analysis。T-05 借鉴 Surfing page.ts，T-10 借鉴 server.ts 的受限 HTTP 边界，准确来源及适配限制见 reuse-analysis R-002。

## 行为与范围

IN：上述纵向用户/调用方路径，包含失败与恢复。REUSE：现有模块装配/服务撤销/既有宿主桥/设计体系与真实测试接缝。OUT：无关 Shell、Bot 引擎或终端重构，旧运行时兼容，任何本轮产品代码变更。

frontmatter 路径是未来候选写集，不是现在授权。不存在的文件标为拟新增；删除路径仅在 T-01 清单确认后执行。凡公开 API、i18n、module/composition、build 需要同步，提交给集中 owner；不越过本票写集直接修改。测试 colocated 文件须在执行前登记为本票精确写集。

## 验收标准

- [ ] AC-008 / B08：公共服务及外部 transport 均拒绝，不泄漏标签/标题/内容
- [ ] AC-009 / B09：拒绝；模型伪造 taskId/spaceId 不获得能力
- [ ] AC-012 / B12：准确 unknown，不自动再点击；可以重新观察/人工确认
- [ ] AC-013 / B13：合法重试不重复派发，不同参数冲突拒绝；缓存有界
- [ ] AC-032 / B32：拒绝且有界，页面不能使用本地接口提升权限
- [ ] AC-033 / B33：旧凭据失效；应用离线不启动隐藏 runtime
- [ ] AC-038 / B38：无 token/Cookie/密码/认证回调和不必要页面正文泄漏；显式材料留存另有授权



## 验证方法

随机 loopback 端口；恶意 Host/Origin、缺凭据、跨 Space/任务、超大/深层 JSON、排队滥用、重复 ID；接管/过期/disable 后重连拒绝；关闭连接释放listener；无宿主时不 spawn 浏览器。

| 行为/风险 | 接缝 | 步骤与预期 | Evidence |
|---|---|---|---|
| 正常纵向路径 | 真实宿主 / 适用服务集成 | 按 acceptance-matrix 中本票 AC 对应步骤，保存实际身份、结果及固定输入 | evidence/T-10.md |
| 失败/撤权/数据边界 | 受控 fixture 与故障注入 | 检查 rejected/cancelled/unknown/cleanup-pending，不能全归 generic error | evidence/T-10.md |
| 回归与边界 | 当前项目定向检查 | 按 testing 参考与实际 package.json 选择；新增命令执行前登记 | evidence/T-10.md |

E2E disposition：required。原因：本票涉及宿主/跨模块/发行边界，单纯 DOM mock 不能判卷。执行环境复用 README 的唯一真实 change workspace；Lead 固定 commit/快照后验收，不临时建立另一候选 checkout 冒充同一输入。本轮这些检查均未运行。

## 执行约束与资源所有权

实施入口为 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`；需额外获得明确实施授权。项目必需方法：`.agents/skills/dev/SKILL.md`，涉及 UI 同时 `.agents/skills/ui/SKILL.md`，按风险读取 testing/architecture/motion-a11y 参考。当前已读取入口，但没有真实 checkout 的原文件 SHA-256 绑定；**必需项不是可选**，skill_bindings 暂空是 draft 阻塞，不是豁免。进入 Ready 前按 skill-invocation 固定 id/path/真实 sha256/phase/operation/inputs/outputs/required/on_failure，并把实际执行记录写本票 Evidence。

语义资源：browser Session/Page registry、控制代次、公共 Browser API、HAP wire、生成物各有集中 owner，见 Goal/Map。resource_claims/shared_paths 也须在 T-01 明确精确路径和真实 schema 后填写；目前不允许按空数组推导可并行。对所有实施票先串行整合，只有路径和语义冲突证明排除后才由 Lead 并行。

## 未决事项与风险

借鉴 Surfing Host/Origin/有界消息，不沿用全局 bearer 或访问所有 Web Viewer。凭据不入 URL、argv、模型、日志或同步 Vault；高级 MCP 后置不是保留旧 CLI。

### 未决问题与 DoR 解除条件

T-01 真实探针与完整调用图尚未执行；它是本票生产者。 前置 T-05, T-07 的固定 evidence 需逐项回读，不因上游状态 done 自动提升 Ready。

还需要：D-013 设计批准（UI 相关）；唯一生产 surface 的能力结果；本票候选写集收窄和资源 claims、必需 Skill SHA-256 绑定；Spec/Map/Ticket 官方检查通过；本票正常/失败/恢复 fixture 可运行；有明确实施授权。资料缺口只阻断依赖闭包；本轮完整 draft 可审，不以文档数量声称 ready。
