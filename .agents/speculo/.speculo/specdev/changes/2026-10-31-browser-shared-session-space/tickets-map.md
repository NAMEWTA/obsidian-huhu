---
schema_version: 3
plan_contract_version: 1
plan_revision: 1
requested_deliverables:
- name: 文档与原型 PR
  count: 1
deliverable_policy: 本轮用户明确一个完整 PR；不从 13 张 future draft 票推导 13 个 PR。
artifact: tickets-map
change: 2026-10-31-browser-shared-session-space
status: draft
---

# Tickets Map：浏览器共享工作区

Map：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/tickets-map.md</Path>；Spec：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/spec.md</Path>；Goal：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/goal-plan.md</Path>。本表只导航，不缓存 Ticket 的 Ready/owner/进度。执行前读取 I skill 与实际项目技能；计划不授权实施。

## 1. 拆分与总体背景

按可观察纵向能力拆分：先证明宿主，再让人真正浏览、共享同页、交接控制、Agent 动作、认证/文件/材料、真实消费者、删除及发行收口。没有按“写 model / 写 service / 写 UI”拆一堆无法独立验收的横向票。新安全默认策略必须在 T-02 首航之前成立，T-06 扩展审批/弹窗，不是晚补安全。

项目必需方法：dev；UI 相关同时 ui；本 change 工作流入口由本轮用户明确指定。所有 future drafts 在进入 Ready 前补真实 SHA-256 skill_bindings；未绑定是阻塞，不能降为 optional。不会把只读“看过”当完整执行证据。

## 2. 执行清单

| ID | Ticket 导航 | 开始条件 |
|---|---|---|
| T-01 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/01-host-feasibility.md</Path> — 宿主可行性与唯一表面定案 | 获得宿主探针实施授权；逐票 DoR |
| T-02 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/02-space-human-browser.md</Path> — Space 与真实人工浏览纵向闭环 | T-01；逐票 DoR |
| T-03 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/03-page-window-lifecycle.md</Path> — 页面唯一实例、多窗口与崩溃恢复 | T-02；逐票 DoR |
| T-04 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/04-control-handoff.md</Path> — 显式委托、人工接管与最终撤权屏障 | T-02, T-03；逐票 DoR |
| T-05 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/05-structured-driver.md</Path> — 结构化观察、动作、引用与未知效果 | T-04；逐票 DoR |
| T-06 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/06-permissions-auth-navigation.md</Path> — 权限、导航与认证弹窗闭环 | T-04, T-05；逐票 DoR |
| T-07 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/07-files.md</Path> — 下载、上传与受限文件授权 | T-05, T-06；逐票 DoR |
| T-08 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/08-materials.md</Path> — 材料捕获到指定输入框的安全交付 | T-05, T-07；逐票 DoR |
| T-09 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/09-consumers.md</Path> — 工作台、Agent、笔记与 Bot 的统一接入 | T-05, T-06, T-08；逐票 DoR |
| T-10 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/10-broker-cli.md</Path> — 既有 CLI 与按需本地 Broker 切换 | T-05, T-07；逐票 DoR |
| T-11 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/11-cleanup.md</Path> — Session 删除、停用与失败恢复 | T-03, T-04, T-07, T-10；逐票 DoR |
| T-12 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/12-cutover-deletion.md</Path> — 全链切换、旧实现物理删除与构建文档收口 | T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11；逐票 DoR |
| T-13 | <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ticket/13-release-evidence.md</Path> — 三平台真实验收、预算与发布证据 | T-12；逐票 DoR |

## 3. 依赖 DAG

```text
T-01 <- 授权/真实工作区
T-02 <- T-01
T-03 <- T-02
T-04 <- T-02, T-03
T-05 <- T-04
T-06 <- T-04, T-05
T-07 <- T-05, T-06
T-08 <- T-05, T-07
T-09 <- T-05, T-06, T-08
T-10 <- T-05, T-07
T-11 <- T-03, T-04, T-07, T-10
T-12 <- T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11
T-13 <- T-12
```

## 4. 合同覆盖矩阵

| 合同 | 首要票 | 集成收口 | 验证出处 |
|---|---|---|---|
| AC-001 / B01 | T-02 | T-13 | acceptance-matrix 对应行 |
| AC-002 / B02 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-003 / B03 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-004 / B04 | T-02 | T-13 | acceptance-matrix 对应行 |
| AC-005 / B05 | T-02 | T-13 | acceptance-matrix 对应行 |
| AC-006 / B06 | T-02 | T-13 | acceptance-matrix 对应行 |
| AC-007 / B07 | T-03 | T-13 | acceptance-matrix 对应行 |
| AC-008 / B08 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-009 / B09 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-010 / B10 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-011 / B11 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-012 / B12 | T-05 | T-13 | acceptance-matrix 对应行 |
| AC-013 / B13 | T-05 | T-13 | acceptance-matrix 对应行 |
| AC-014 / B14 | T-05 | T-13 | acceptance-matrix 对应行 |
| AC-015 / B15 | T-05 | T-13 | acceptance-matrix 对应行 |
| AC-016 / B16 | T-05 | T-13 | acceptance-matrix 对应行 |
| AC-017 / B17 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-018 / B18 | T-06 | T-13 | acceptance-matrix 对应行 |
| AC-019 / B19 | T-06 | T-13 | acceptance-matrix 对应行 |
| AC-020 / B20 | T-06 | T-13 | acceptance-matrix 对应行 |
| AC-021 / B21 | T-06 | T-13 | acceptance-matrix 对应行 |
| AC-022 / B22 | T-04 | T-13 | acceptance-matrix 对应行 |
| AC-023 / B23 | T-06 | T-13 | acceptance-matrix 对应行 |
| AC-024 / B24 | T-07 | T-13 | acceptance-matrix 对应行 |
| AC-025 / B25 | T-08 | T-13 | acceptance-matrix 对应行 |
| AC-026 / B26 | T-03 | T-13 | acceptance-matrix 对应行 |
| AC-027 / B27 | T-03 | T-13 | acceptance-matrix 对应行 |
| AC-028 / B28 | T-11 | T-13 | acceptance-matrix 对应行 |
| AC-029 / B29 | T-11 | T-13 | acceptance-matrix 对应行 |
| AC-030 / B30 | T-11 | T-13 | acceptance-matrix 对应行 |
| AC-031 / B31 | T-11 | T-13 | acceptance-matrix 对应行 |
| AC-032 / B32 | T-10 | T-13 | acceptance-matrix 对应行 |
| AC-033 / B33 | T-10 | T-13 | acceptance-matrix 对应行 |
| AC-034 / B34 | T-02 | T-13 | acceptance-matrix 对应行 |
| AC-035 / B35 | T-13 | T-13 | acceptance-matrix 对应行 |
| AC-036 / B36 | T-12 | T-13 | acceptance-matrix 对应行 |
| AC-037 / B37 | T-02 | T-13 | acceptance-matrix 对应行 |
| AC-038 / B38 | T-05 | T-13 | acceptance-matrix 对应行 |
| AC-039 / B39 | T-13 | T-13 | acceptance-matrix 对应行 |
| AC-040 / B40 | T-09 | T-13 | acceptance-matrix 对应行 |
| F01–F12 | T-01 | T-13 | 宿主能力 Gate |

## 5. 路径与语义资源所有权

公共 Browser API、model/ports、module/composition/settings/i18n 集成 owner 为 T-02；后续票通过明确接口变更请求回该 owner 串行落地。T-03 拥有 PageRegistry/surface；T-04 拥有控制代次/fence；T-05 拥有 driver/动作 schema；T-06 权限/导航；T-07 文件；T-08 材料；T-09 消费者但 HAP 需 #36 协调；T-10 Broker/CLI；T-11 清理；T-12 集中删除、依赖、构建、产物/文档；T-13 最终验收。

T-01 与 T-13 的探针/验收目录重叠，依赖相隔，不能并写。T-09 跨模块宽路径、T-12 删除路径与前面重写路径有语义交叠，必须先收窄；在 claims 未固定前不调度并行。T-07 与 T-10 即使文件不同仍共享文件授权/动作接口，不仅按 glob 判断无冲突。

## 6. Gate 与集成点

正式 Gate/Wave/Lead/授权/恢复统一由 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/goal-plan.md</Path> 拥有，本 Map 不复制执行进度。只有新纵向链完整并物理删除旧链才可合入 dev；文档 PR 不做切换。

## 7. 横切合同

源码无兼容；旧用户数据默认保留；不污染宿主默认 Session；个人 Space 硬拒绝；未知效果不自动重放；最终撤权屏障必须覆盖读结果；网页输入/返回不可信；原型证据不替代宿主；跨平台未测不宣称支持。

## 8. 维护与恢复

Ticket 状态只改原票及实际 Evidence；拓扑/路径/合同变化更新 Map 并递增 plan_revision，重审受影响依赖闭包。先回读 README、Goal、当前票和最后真实 Evidence，不按 done 文本复活过期授权/输入。官方 validate/ticket-control 在实际仓库可运行后执行，当前未通过，不能自动 run。
