---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-browser-shared-session-space
id: T-13
title: 三平台真实验收、预算与发布证据
status: draft
kind: refactor
planning_depth: deep
planning_depth_reason: 跨宿主安全、授权撤销或数据/发行边界；不能用 mock 当产品证据。
ready: false
risk: high
blocked_by:
- T-12
contract_ids:
- AC-001
- AC-002
- AC-003
- AC-004
- AC-005
- AC-006
- AC-007
- AC-008
- AC-009
- AC-010
- AC-011
- AC-012
- AC-013
- AC-014
- AC-015
- AC-016
- AC-017
- AC-018
- AC-019
- AC-020
- AC-021
- AC-022
- AC-023
- AC-024
- AC-025
- AC-026
- AC-027
- AC-028
- AC-029
- AC-030
- AC-031
- AC-032
- AC-033
- AC-034
- AC-035
- AC-036
- AC-037
- AC-038
- AC-039
- AC-040
owner: unassigned
expected_changes:
- <Path>scripts/obsidian-acceptance/browser/**</Path>
- <Path>docs/e2e/browser-host-capabilities.md</Path>
- <Path>docs/e2e/browser-acceptance.md</Path>
writable_paths:
- <Path>scripts/obsidian-acceptance/browser/**</Path>
- <Path>docs/e2e/browser-host-capabilities.md</Path>
- <Path>docs/e2e/browser-acceptance.md</Path>
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

# Ticket T-13：三平台真实验收、预算与发布证据

总体 Map：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/tickets-map.md</Path>；Spec：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>；完成证据目标：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/evidence/T-13.md</Path>（未来执行时创建）。

## 目标与来源

固定同一交付 commit，B01–B40、F01–F12 逐项实测；给出支持组合、未测边界、性能前后采样及 UI 原生表面证据，满足后才申请关闭 Epic。

来源为 source.md 的相应 F/B 行、ADR、现行 API/装配和 reuse-analysis。已有架构入口与读取范围见 baseline-and-impact；未读消费者不能当作已核验。

## 行为与范围

IN：上述纵向用户/调用方路径，包含失败与恢复。REUSE：现有模块装配/服务撤销/既有宿主桥/设计体系与真实测试接缝。OUT：无关 Shell、Bot 引擎或终端重构，旧运行时兼容，任何本轮产品代码变更。

frontmatter 路径是未来候选写集，不是现在授权。不存在的文件标为拟新增；删除路径仅在 T-01 清单确认后执行。凡公开 API、i18n、module/composition、build 需要同步，提交给集中 owner；不越过本票写集直接修改。测试 colocated 文件须在执行前登记为本票精确写集。

## 验收标准

- [ ] AC-001 / B01：浏览器可直接使用，不下载/启动独立 Chromium
- [ ] AC-002 / B02：相同 partition、相同 pageId 的 live webContentsId；无需保存/套用身份
- [ ] AC-003 / B03：页面不重建，表单/滚动/上下文保留；新凭据继续，旧凭据失败
- [ ] AC-004 / B04：Cookie/localStorage/IndexedDB 按真实浏览器规则共享；不把 tab-local 状态误判为必须共享
- [ ] AC-005 / B05：不串登录；复制同身份文件不意外接管原 partition
- [ ] AC-006 / B06：持久站点数据按合同保留；控制授权不恢复；过期网站会话不被伪报已登录
- [ ] AC-007 / B07：不重复导航、不新建 guest，不丢页面内存；资源数量有上限
- [ ] AC-008 / B08：公共服务及外部 transport 均拒绝，不泄漏标签/标题/内容
- [ ] AC-009 / B09：拒绝；模型伪造 taskId/spaceId 不获得能力
- [ ] AC-010 / B10：接管不排队；待派发动作取消，旧异步后续不继续输入
- [ ] AC-011 / B11：最终主进程 fence 拒绝旧代次，不仅前端 token 检查通过
- [ ] AC-012 / B12：准确 unknown，不自动再点击；可以重新观察/人工确认
- [ ] AC-013 / B13：合法重试不重复派发，不同参数冲突拒绝；缓存有界
- [ ] AC-014 / B14：旧 ref/document 失效，不点击错节点；明确覆盖范围
- [ ] AC-015 / B15：已支持范围正确，未支持显式说明；不降安全配置
- [ ] AC-016 / B16：普通人工体验成立；Agent 表单操作经过真实框架 fixture
- [ ] AC-017 / B17：不混入写入；接管入口始终可用，guest 内已有焦点也受处理
- [ ] AC-018 / B18：同 Session、所有权明确；不支持路径准确反馈，不静默改坏认证
- [ ] AC-019 / B19：无宿主权限泄漏，任意主进程脚本入口不存在
- [ ] AC-020 / B20：按策略拒绝/确认；证书错误不全局绕过
- [ ] AC-021 / B21：策略一致、origin 精确，未知权限默认拒绝，不污染其他 Session
- [ ] AC-022 / B22：已撤权，迟到图片/文本不再交付；交回后重新授权
- [ ] AC-023 / B23：数据不变成指令或 grant，最终服务拒绝
- [ ] AC-024 / B24：只操作授权文件；无穿越覆盖，部分文件有归属/清理
- [ ] AC-025 / B25：不串会话、不自动提交、不盲目重复附加；来源准确
- [ ] AC-026 / B26：唯一 guest，或明确聚焦 owner；新开页面明确是新 pageId
- [ ] AC-027 / B27：状态与实际资源一致，有恢复/确认，不误停无关任务
- [ ] AC-028 / B28：无重复事件/guest/broker，无旧 token 复活；失败不影响其他模块
- [ ] AC-029 / B29：先撤权并收敛再清理，无法完成保持 cleanup-pending；重新打开不恢复已清数据
- [ ] AC-030 / B30：有恢复标记与原文件保护，不显示假成功/空库
- [ ] AC-031 / B31：其他 Space、Vault、Obsidian、系统浏览器及导出文件不受影响
- [ ] AC-032 / B32：拒绝且有界，页面不能使用本地接口提升权限
- [ ] AC-033 / B33：旧凭据失效；应用离线不启动隐藏 runtime
- [ ] AC-034 / B34：明确 unsupported/unavailable；不加载 Node/Electron 到移动端路径
- [ ] AC-035 / B35：主操作/真实地址可达，弹层不被原生 surface 穿透或遮挡
- [ ] AC-036 / B36：无独立 browser executable、bundle、worker、sealed identity 及旧协议可达路径
- [ ] AC-037 / B37：仅恢复允许的元数据和网站数据，不自动恢复 Agent 控制或重放外部效果
- [ ] AC-038 / B38：无 token/Cookie/密码/认证回调和不必要页面正文泄漏；显式材料留存另有授权
- [ ] AC-039 / B39：单 Page 单 guest，无帧轮询/无界等待；停止后资源回落，预算有前后证据
- [ ] AC-040 / B40：未误删它们的 Native/Go/HAP、服务 lease、文件权限或效果保护



## 验证方法

按 acceptance-matrix 完整执行，含最小宿主与代表性当前安装器；清洁环境、完全重启、中文 IME、多窗、200%缩放、Portal遮挡、故障注入；同机同工作负载启动/CPU/内存/接管/guest/包体前后比较。

| 行为/风险 | 接缝 | 步骤与预期 | Evidence |
|---|---|---|---|
| 正常纵向路径 | 真实宿主 / 适用服务集成 | 按 acceptance-matrix 中本票 AC 对应步骤，保存实际身份、结果及固定输入 | evidence/T-13.md |
| 失败/撤权/数据边界 | 受控 fixture 与故障注入 | 检查 rejected/cancelled/unknown/cleanup-pending，不能全归 generic error | evidence/T-13.md |
| 回归与边界 | 当前项目定向检查 | 按 testing 参考与实际 package.json 选择；新增命令执行前登记 | evidence/T-13.md |

E2E disposition：required。原因：本票涉及宿主/跨模块/发行边界，单纯 DOM mock 不能判卷。执行环境复用 README 的唯一真实 change workspace；Lead 固定 commit/快照后验收，不临时建立另一候选 checkout 冒充同一输入。本轮这些检查均未运行。

## 执行约束与资源所有权

实施入口为 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md`；需额外获得明确实施授权。项目必需方法：`.agents/skills/dev/SKILL.md`，涉及 UI 同时 `.agents/skills/ui/SKILL.md`，按风险读取 testing/architecture/motion-a11y 参考。当前已读取入口，但没有真实 checkout 的原文件 SHA-256 绑定；**必需项不是可选**，skill_bindings 暂空是 draft 阻塞，不是豁免。进入 Ready 前按 skill-invocation 固定 id/path/真实 sha256/phase/operation/inputs/outputs/required/on_failure，并把实际执行记录写本票 Evidence。

语义资源：browser Session/Page registry、控制代次、公共 Browser API、HAP wire、生成物各有集中 owner，见 Goal/Map。resource_claims/shared_paths 也须在 T-01 明确精确路径和真实 schema 后填写；目前不允许按空数组推导可并行。对所有实施票先串行整合，只有路径和语义冲突证明排除后才由 Lead 并行。

## 未决事项与风险

不得因没有 Native 构建就标全部架构支持；Linux 容器 HTML 测试不能替代 macOS/Windows Obsidian。不得调宽预算掩盖超标。

### 未决问题与 DoR 解除条件

T-01 真实探针与完整调用图尚未执行；它是本票生产者。 前置 T-12 的固定 evidence 需逐项回读，不因上游状态 done 自动提升 Ready。

还需要：D-013 设计批准（UI 相关）；唯一生产 surface 的能力结果；本票候选写集收窄和资源 claims、必需 Skill SHA-256 绑定；Spec/Map/Ticket 官方检查通过；本票正常/失败/恢复 fixture 可运行；有明确实施授权。资料缺口只阻断依赖闭包；本轮完整 draft 可审，不以文档数量声称 ready。
