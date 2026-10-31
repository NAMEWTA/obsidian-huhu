---
{
  "schema_version": 3,
  "plan_contract_version": 1,
  "plan_revision": 10,
  "requested_deliverables": [],
  "deliverable_policy": "用户要求一个统一 change 的完整 Tickets，未指定票数；按36项AC、三来源全部目标和真实依赖拆为32票，不把票数当产品数量。",
  "artifact": "tickets-map",
  "change": "2026-10-26-unified-browser-versioning-archives",
  "status": "ready"
}
---

# Tickets Map：浏览器、版本管理与通用档案

- Goal：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/goal-plan.md</Path>（实施必须使用 subagent gpt-6.1-sol / high；Gate、Wave、调度与恢复权威）。
- Spec：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>
- 票据目录：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/</Path>
- 证据目录：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/</Path>
- 计划质量审查：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/ticket-planning-review.md</Path>

## 本轮路径与验收职责更新（revision 10）

[SRC-010](sources/SRC-010.md) 已授权全部代码实施与独立审查；真实验收由用户负责。原 plan-only 叙述为历史记录。只读代码调查确认并补充原票写集：T-17 的 module/i18n 装配、T-23 动态布局设置与 shell 导航消费者、T-24 home 生产项目入口、T-27 RestoreService 实际装配与类型/测试、T-09–11 跨平台安装/组装脚本。browser-worker.cjs、其摘要与 browser-cli.cjs 和 main/styles 一并归 T-32 Lead 串行生成；各票不并行构建。源条款与 DAG 不变。

## 1. 目标与拆分策略

用户已确认 UI-001 修订2并要求继续 Tickets。保留 Issue #1/#2/#3 全目标；32票覆盖36组AC。PR4/5 已在当前分支合并，只复用既有交付并验证剩余缺口，不再次合并、不预标票据完成。

执行入口为 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，负责真实实现、独立双轴审查、检查与 Evidence。T 已交付票据计划，本次 P 补齐 Goal 编排。用户的原型确认已记录在 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/prototypes/UI-001/approval-sealed.md</Path>。

### 总体实施背景

三条产品线共享一个插件、三种 View、模块懒加载和同一工作区。档案先 Expand v2/定义/codec，随后安全写、表单/关系、显式迁移、同步事实，再接入动态类型树和字段投影；home 只保存执行信息。versioning 恢复必须在 apply 前让档案 owner 重校验。浏览器所有动作走同一 native gate，不自动重放 unknown。六项 ADR 和 D-001–008 不重新访谈。

已批准设计：revision 2，designDigest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c`；baseline DESIGN-0001 designDigest `ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331`；原型 UI-001 digest `5f49a4740daf0550130bc325526fe2f93809db9e48829ae532dc2e4f9548f437`。来源为 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/DESIGN.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/prototypes/UI-001/design-system.md</Path>。只批准 PAGE-001–005；未展示扩展仍按对应票解除设计前置。

**合同就绪和调度分开：** 单票 ready 表示其局部合同完整；完整 Spec 因扩展 UI 保持 draft，现有 ticket-control 会给全部票报告 source Spec is not Ready。因此本 Map ready 仅表示结构/导航合同完整，不宣称已可自动派发全计划。已批准核心 UI 和独立非 UI 的决定不失效；不为绕过全局工具门改框架或删减来源范围。补齐扩展设计后由 S/T 刷新 Spec、相关绑定和审查，再进入执行。

### 项目 Skill 读取矩阵

先完整读 Map，再按元数据/路径触发读实际 Skill，最后读 Ticket；以下是最低集合，不是 allowlist。

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
|---|---|---|---|---|
| ALL | <Path>.agents/skills/dev/SKILL.md</Path> | 插件模块、持久化、测试、native、构建 | Map 后、Ticket 前 | 模块边界/数据归属/质量检查 |
| T-05, T-06, T-07, T-08, T-13, T-14, T-15, T-16, T-19, T-20, T-21, T-22, T-23, T-24, T-27, T-28, T-29, T-30, T-32 | <Path>.agents/skills/ui/SKILL.md</Path> | 页面、面板、对话框及样式 | Map 后、Ticket 前 | 已批准设计、组件、响应式及无障碍 |

## 2. 执行清单

| ID | Ticket | 跨票 Gate/依赖导航 |
|---|---|---|
| T-01 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/01-joint-boundaries.md</Path> | 起点 |
| T-02 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/02-browser-observation.md</Path> | T-01 |
| T-03 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/03-browser-ledger.md</Path> | T-02 |
| T-04 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/04-browser-events.md</Path> | T-03 |
| T-05 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/05-browser-identity.md</Path> | T-04 |
| T-06 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/06-browser-lifecycle.md</Path> | T-05 |
| T-07 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/07-browser-files-input.md</Path> | T-06 |
| T-08 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/08-browser-material-handoff.md</Path> | T-07 |
| T-09 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/09-browser-windows.md</Path> | T-08 |
| T-10 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/10-browser-macos-arm.md</Path> | T-09 |
| T-11 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/11-browser-macos-x64.md</Path> | T-10 |
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/12-browser-linux-stress.md</Path> | T-11 |
| T-13 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/13-automatic-history.md</Path> | T-01 |
| T-14 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/14-history-retention.md</Path> | T-13 |
| T-15 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/15-history-core-regression.md</Path> | T-14 |
| T-16 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/16-history-advanced.md</Path> | T-15 |
| T-17 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/17-archives-v2-contract.md</Path> | T-01 |
| T-18 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/18-archives-safe-writes.md</Path> | T-17 |
| T-19 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/19-archives-forms.md</Path> | T-18 |
| T-20 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/20-archives-relations.md</Path> | T-19 |
| T-21 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/21-archives-migrate.md</Path> | T-20 |
| T-22 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/22-archives-sync-forks.md</Path> | T-21 |
| T-23 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/23-archives-tree-views.md</Path> | T-22 |
| T-24 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/24-archives-home-refs.md</Path> | T-23, T-15 |
| T-25 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/25-archives-portability.md</Path> | T-24 |
| T-26 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/26-archives-scale.md</Path> | T-25 |
| T-27 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/27-archive-restore-owner.md</Path> | T-15, T-26 |
| T-28 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/28-archives-fork-editor.md</Path> | T-27 |
| T-29 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/29-archives-import.md</Path> | T-28 |
| T-30 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/30-archives-derived-graph.md</Path> | T-29 |
| T-31 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/31-browser-storage-extension.md</Path> | T-12 |
| T-32 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/32-joint-acceptance.md</Path> | T-16, T-27, T-30, T-31 |

本表不缓存状态、owner、风险或深度；从原 Ticket frontmatter 回读。未来 Evidence 文件在实施时生成，不预造执行结果。

## 3. 依赖 DAG

```text
T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07 → T-08
T-08 → T-09 → T-10 → T-11 → T-12 → T-31
T-01 → T-13 → T-14 → T-15 → T-16
T-01 → T-17 → T-18 → T-19 → T-20 → T-21 → T-22 → T-23
T-23 + T-15 → T-24 → T-25 → T-26
T-26 + T-15 → T-27 → T-28 → T-29 → T-30
T-16 + T-27 + T-30 + T-31 → T-32
```

每条同域边既表示前一票公开协议/迁移阶段完成，也串行移交同模块写集，避免共享 api/model/native 和事件语义竞争。跨域 T-24/T-27 在两端完成后修改边界。实际边以各票 blocked_by 为准。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01, T-32 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-002 | T-01, T-32 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-003 | T-06 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-004 | T-06 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-005 | T-02 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-006 | T-03 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-007 | T-05, T-31 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-008 | T-06 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-009 | T-07 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-010 | T-04 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-011 | T-08 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-012 | T-09, T-10, T-11, T-12, T-32 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-013 | T-15 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-014 | T-15 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-015 | T-15 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-016 | T-15 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-017 | T-13, T-16 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-018 | T-17, T-19, T-28 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-019 | T-17, T-19 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-020 | T-18, T-19 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-021 | T-20 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-022 | T-22, T-28 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-023 | T-17, T-21 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-024 | T-21 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-025 | T-22 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-026 | T-27 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-027 | T-25 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-028 | T-24 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-029 | T-26 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-030 | T-29, T-30 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-031 | T-23, T-32 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-032 | T-32 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-033 | T-18, T-21, T-27 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-034 | T-14 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-035 | T-23 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |
| AC-036 | T-23 | Spec 验证接缝 + 各票验证矩阵 | covered | 全部来源保留；跨票分项共同闭合，不以 planned 当 passed |

AC-017：T-13 自动采样、T-16 按块/F，AC-034 由 T-14 保护配额；AC-022：T-22 发现/阻止与 T-28 显式解决；AC-030：T-29 导入与 T-30 派生/图谱；AC-007：T-05 必需 Cookie/Identity 与 T-31 条件 origin storage。源文中的可选/按需条件不改成必需；任何不适用结论必须以源条件和能力证据说明，不能自行删目标。完整材料检查器的未展示界面不在 T-08 的已批准交付入口内；若实现需要该新增页面，先回 P 扩展 T-08 绑定。

## 5. 并行与路径所有权

所有票复用 README 的 current/NAMEWTA/34 工作区；不因并发创建新 worktree，也不自动派 subagent。当前规划无执行 owner 指派。三域在 T-01 后写集分离时可并行；同域按 DAG 串行。

| 范围 | Writable 交集/语义资源 | 处理 |
|---|---|---|
| browser T-02–12/31 | browser 模块、native、运行时资产与 public contracts | 按 DAG 逐票移交；四平台顺序共享同一 runtime，不并发改 native |
| versioning T-13–16 | versioning、sync 夹具、宿主探针 | 按 DAG 串行；T-01 后才修改排除边界 |
| archives T-17–30 | archives、golden、索引与定义/迁移事实 | 按 DAG 串行；T-24/27 等跨域双方完成 |
| 全局产物 | main.js、styles.css、构建/许可配置、全局文档 | 唯一 owner T-32 Lead；每次必要构建串行处理并记录对应输入，最终票再统一核验 |

各票 expected_changes 仅定位真实接缝，writable_paths 才是写入边界。宽目录写集仍限定本票行为；新增消费者或路径先修票与 Map 后继续。非 UI 票写集限制 core/services/platform，不借此改界面。

## 6. Gate、Wave 与集成点

正式 Gate/Wave 以 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/goal-plan.md</Path> 第2–4节为权威；以下只保留里程碑导航，不复制完成状态。

候选里程碑：T-01 联合边界；T-12 四平台必需运行时；T-15 核心历史；T-23 通用档案与确认导航；T-27 跨域恢复；T-32 整体验收。以上是计划检查点，不是已执行 Gate。

涉及迁移和跨票执行时，由 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path> 建立正式编排；已创建 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/goal-plan.md</Path>，Gate/Wave 和执行模型以该文件为权威；本次 plan 不启动后台持续执行。必需宿主/平台证据缺失保持待验收，不能用 Linux 或原型代替。

## 7. 横切契约与风险

- v1/v2 明确分流，关系与定义/迁移事实可携带；缓存不是真源。事务按 operationId/hash 对账，不重复副作用。
- 原生未保存叶拒绝档案结构写；恢复 owner 预检在 prepare 和提交前都生效。
- 自动历史 opt-in、5分钟/30天/1GiB 默认值；保护对象优先于配额。
- Cookie/Identity 必需，origin storage 条件扩展；人工接管 ACK 后旧 Agent 权限失效。
- 测试、平台、配置、Skill、DESIGN 或代码摘要变化只失效相关闭包，不能借旧产物报告通过。
- 本轮仅规划和确认落盘；不修改生产实现、不真实迁移用户资料、不提交/推送/发布，不直写永久 ADR/context。

## 8. 维护规则

进度仅更新 Ticket/Evidence；数量、依赖、路径或合同变化递增 plan_revision 并更新覆盖。不得从 Map 旧说明恢复 owner/status。Skill 变更重读入口、更新摘要并重验；设计变更回 P，不让执行者自行选样式。原始 sources 保留，结果追加 LOG。

## 9. 总控与恢复

先回读 README、Spec、DESIGN/approval、当前票和依赖 Evidence；再执行只读 <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map 本 Map --repo .。结构正确不等于 source Spec Ready，也不等于已授权自动执行。

后续按 Goal G-00 解除相关前置并核对 run 范围后，从 I 开始；未闭合事务先查原网关，保留草稿和部分成功，不用清缓存掩盖真源损坏。所有票闭合后仍需 T-32 的固定输入联合验证。

Revision 4 仅补全 T-32 生成链的 CLI 摘要及 runtime 两个 generated JSON 所有权；T-02/T-13/T-17 活动源码合同与各自写集未变，不使其实现失效。


### Revision 5：T-18 共享原生只读检查

实际生产调用闭包确认，T-18 复用 host/obsidian/document-mutation.ts 的所有 Markdown 叶与 generation/identity 扫描；允许新增同步只读 assertClean 接口及其就近测试，不更改恢复 apply/save 语义。增加 archives/i18n.ts 为新增稳定失败错误的 en/zh。此三文件归 T-18 单 writer；其他活动 T-14/T-02 不写该host接缝。需回归原 document mutation/版本恢复用例；DAG与产品合同不变。


### Revision 6：T-03 进程夹具归属

实际architecture检查确认browser platform下的operation-ledger-process.fixture.ts反向导入services违规。T-03增加test/release/browser-operation-ledger-process.fixture.ts写集，将纯测试进程夹具归测试树并同步引用；不修改架构规则，不改变产品协议或其他票范围。修复在原owner收齐本轮审查后实施，新输入绑定revision6。


Revision 7：只读核验发现 `.github/workflows/release.yml` 仍只下载、证明并归集 Linux browser artifact。补入 T-32 写集，由 Lead 串行完成四平台资产交付闭包；只修改配置，不运行发布。T09–11 继续负责各平台构建/安装，DAG、产品合同、活动 T05/T20 写集不变。依据见 sources/native-platform-reuse.md。

Revision 8：T24只读预查补齐home-host/board-store/recent-doc-policy/RecentWidget实际消费、archives通用详情与资源分类/提醒owner及定向测试写集，消除archives/module.ts可写/只读冲突。依据sources/archive-home-preflight.md；DAG/合同及当前T06/T20范围不变。

Revision 9：T08补实际Agent browser-material consumer/files、ContextMaterial类型/格式化、session-material及定向测试，新增agent:browser-material资源声明。只闭合既有待发送输入链，不自动发送/不新增聊天系统。当前无冻结审查，T06已闭合；DAG与T07/T21范围不变。


Revision 10：T08补`src/modules/agent/i18n.ts`，仅paste调用后结果未知的真实delivery反馈en/zh。现有failed/cancelled不能表达已调用未知，不允许错误声称未粘贴；相关已复制材料保留可能引用事实。当前无冻结审查，T07/T21已闭合；DAG与T22范围不变。
