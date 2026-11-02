---
{
  "schema_version": 8,
  "artifact": "goal-plan",
  "change": "2026-10-26-unified-browser-versioning-archives",
  "status": "in_progress",
  "modes": [
    "migration",
    "high-assurance",
    "reference-conformance"
  ],
  "orchestration": "lead-directed",
  "lead": "native:root",
  "integration_attempt_limit": 3,
  "ticket_execution": "auto",
  "ready_for_execution": true
}
---

# Goal Plan：统一浏览器、版本管理与通用档案

- 总控入口：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/tickets-map.md</Path>（本次 source map revision 6）。
- 原规格与决定：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ADR.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/CONTEXT-MAP.md</Path>。
- 票据 / 证据：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/</Path>。
- 本次用户安排：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/sources/SRC-009.md</Path>；计划核验：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/goal-planning-review.md</Path>。

本次模式为 **plan**。本文件交付编排，未派遣实施者、未启动 run。当前 `draft / ready_for_execution=false` 保留真实执行前置；计划本身不改变任何 Ticket 的 Ready、owner 或完成事实。

## 本轮执行约定（SRC-010 优先于下方历史 plan 说明）

2026-10-26 用户已明确授权整个 change 的代码实施及独立代码审查，当前进入 run。历史 plan-only、未授权 run 文字保留为前轮记录，不作为本轮授权判断。

- 实现和审查均使用原生 gpt-6.1-sol / high，实际派遣已成功；Lead 为 native:root，工作区和基线不变。
- 32 票、36 组 AC 与所有源条款保持；既有实现先核对再复用。局部就绪的核心票继续，扩展 UI 由实现时继承既定设计形成可审查结果，不冒充原型已批准；视觉确认交用户最终验收。
- 用户接手真实验收。各票中的 required E2E、跨平台实机、真实宿主、性能/截图门在本轮改为 user-owned / not-run，不以自动测试或代码审查冒充通过，也不据此阻塞其他已授权代码实现。代码交付状态与人工验收状态分别记录在原 Evidence。
- 定向自动测试由相应实施者执行；全局类型、lint、构建和产物检查由 Lead 在稳定输入上串行执行。main.js/styles.css/browser 生成物在本轮由 Lead 持续维护，T-32 负责最终一致性；不要求每票重复构建。此安排处置原 G-00 的生成物所有权缺口。
- 原工具对 source Spec draft 的全局门与局部 Ready 的差异仍如实记录；不修改框架或伪造 DESIGN 批准。当前 source draft 的扩展 UI 缺口不否定用户已授权的核心实现。
- 正式状态和 Evidence 只由 Lead 回读实际代码、独立 reviewer 返回和适用自动检查后更新。没有代码证据不宣称完成。

## 1. Outcome and Authority

### Outcome

在同一 change、同一现有分支上闭合三个 Issue 的完整目标：受管浏览器的安全控制/身份/四平台，版本管理的历史与恢复，通用档案的类型、字段、独立关系、可恢复迁移、动态树与类型总览。继续复用已合入的 PR4/5。用户确认的类型→实例树、类型列表/卡片与默认创建/更新时间是实施合同。

### Success and False Completion

成功以36组 AC 的固定构建证据、适用源条款与全部必需 Gate 为准；32张票是计划单位，不是用户要求的产品数量。保留“可选/按需”的原条件，任何不适用结论逐条有来源与证据，不静默移出范围。

原型185断言只证明原型；PR 已合并、单域测试通过、票全 done、subagent 自报 completed 或 Linux 验证均不能代替联合实现/四平台/真实宿主。无代码改动需求的票按原合同记录事实并由 T/I 处置，不以 empty commit 或 evidence-only done 充数。

### Non-goals

不改 plugin id、不新增第四 View、不重构 Bot/终端、不自动迁移真实用户库。没有提交、推送、远端 PR 合并/关闭、发版、清理分支、永久知识提升或归档动作。本轮只写 Goal、Map 导航、README/LOG 和计划证据。

### Authoritative Inputs

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/sources/SRC-009.md</Path> 及已有用户决定 | 本次实施工具/模型，既有范围与批准 | 遵从明确用户要求；不重问已确认内容 |
| 2 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ADR.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/CONTEXT.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/CONTEXT-MAP.md</Path> | 六项架构决定与领域归属 | 改变产品/数据合同交 G/S，Goal 不篡改 |
| 3 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/DESIGN.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/prototypes/UI-001/approval-sealed.md</Path> | 36项行为、已批准五页及未展示边界 | 摘要失效回 P；外部行为变化回 S |
| 4 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/tickets-map.md</Path> 与原 Ticket | 依赖、写集、真实 Skill 与局部验证 | T 拥有拆分，Goal 仅排序与验收 |
| 5 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/source-gap-analysis.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/integration.md</Path> 和固定源码 | 已有交付与真实差距 | 不将来源作者报告冒充当前验收 |

源码基线为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，原来源基础 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，二者用途不同。当前 Spec/票据/设计与上一轮验证摘要一致。永久 ADR/context 目录未存在，本次不创建；永久设计仍按已批准 DESIGN-0001 引用，不重写。

编排依据来自三份冻结 Issue [#1](https://github.com/NAMEWTA/obsidian-huhu/issues/1)、[#2](https://github.com/NAMEWTA/obsidian-huhu/issues/2)、[#3](https://github.com/NAMEWTA/obsidian-huhu/issues/3) 及本 change 原快照。完整研究与比较留在 sources/原决定；本次没有新增依赖或外部方案选择。

## 2. Execution Graph

### DAG and Critical Path

DAG 唯一权威是每票 blocked_by，Map 为导航。下列为当前依赖的只读投影；改边先由 T 更新票与 map revision，再重算本 Goal。

```text
T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07 → T-08
T-08 → T-09 → T-10 → T-11 → T-12 → T-31
T-01 → T-13 → T-14 → T-15 → T-16
T-01 → T-17 → T-18 → T-19 → T-20 → T-21 → T-22 → T-23
T-23 + T-15 → T-24 → T-25 → T-26
T-26 + T-15 → T-27 → T-28 → T-29 → T-30
T-16 + T-27 + T-30 + T-31 → T-32
```

按依赖层数的最长链为 T-01 → T-17 → T-18 → T-19 → T-20 → T-21 → T-22 → T-23 → T-24 → T-25 → T-26 → T-27 → T-28 → T-29 → T-30 → T-32（16 个节点）；这不是工时估算。四平台实机环境和扩展设计可能成为实际等待最长的环节。

### Waves and Ownership

以下是拓扑候选层，不是全员屏障或预分配 Agent。auto 每次只选已就绪且无冲突的票，独立分支无需等同层全部结束。任一票进入 review 仍占票据槽，验证冻结相关 writer。

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | Gate/集成序号 |
|---|---|---|---|---|---|
| W-00 | T-01 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-01 | T-02, T-13, T-17 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-02 | T-03, T-14, T-18 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-03 | T-04, T-15, T-19 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-04 | T-05, T-16, T-20 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-05 | T-06, T-21 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-06 | T-07, T-22 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-07 | T-08, T-23 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-08 | T-09, T-24 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-09 | T-10, T-25 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-10 | T-11, T-26 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-11 | T-12, T-27 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-12 | T-28, T-31 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-13 | T-29 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-14 | T-30 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |
| W-15 | T-32 | 直接依赖 done、DoR/模型/Gate/资源重新核验 | 各票 writable_paths；域内移交，不在本表复制完整写集 | 按下述共享归属 | G-01 基础；按票命中 G-02–G-07；最终 G-08 |

共享归属：browser 公共协议/native 在 T-02–12/31 按 DAG 单一当期票移交；versioning 在 T-13–16 按 DAG；archives 在 T-17–30 按 DAG。T-24/27 同时占 archives/versioning/home 资源，不能与仍活跃的 T-16 并发。未来 T-16 提升 Ready 前须由 T 核对与 T-24/27 的真实写集，明确串行边或缩小写集；Goal 不伪造产品依赖来掩盖冲突。

main.js、styles.css、全局构建/许可/文档的唯一票级 owner 是 T-32。每票必要构建前，Lead 必须安排 owner 的明确维护写集和固定输入；不能让普通实施者越过 Packet 改共享产物。当前 T-32 等全部依赖的 DAG 不提供“提前实施 T-32”的权限：若当前合同无法表达每票构建维护，先由 T 调整共享所有权/前置集成票或拆分验证动作，再执行构建。此项属于 G-00 的可发现计划缺口，不交给实施者临场绕过。

### Ticket Quick Reference

本表只导航，不复制状态/Ready/实现 owner；派单前读取原票和直接依赖 Evidence。尚不存在的 Evidence 由未来 Lead 验收时生成。

| ID | Ticket | Evidence |
|---|---|---|
| T-01 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/01-joint-boundaries.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-01.md</Path> |
| T-02 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/02-browser-observation.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-02.md</Path> |
| T-03 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/03-browser-ledger.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-03.md</Path> |
| T-04 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/04-browser-events.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-04.md</Path> |
| T-05 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/05-browser-identity.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-05.md</Path> |
| T-06 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/06-browser-lifecycle.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-06.md</Path> |
| T-07 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/07-browser-files-input.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-07.md</Path> |
| T-08 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/08-browser-material-handoff.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-08.md</Path> |
| T-09 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/09-browser-windows.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-09.md</Path> |
| T-10 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/10-browser-macos-arm.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-10.md</Path> |
| T-11 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/11-browser-macos-x64.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-11.md</Path> |
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/12-browser-linux-stress.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-12.md</Path> |
| T-13 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/13-automatic-history.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-13.md</Path> |
| T-14 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/14-history-retention.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-14.md</Path> |
| T-15 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/15-history-core-regression.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-15.md</Path> |
| T-16 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/16-history-advanced.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-16.md</Path> |
| T-17 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/17-archives-v2-contract.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-17.md</Path> |
| T-18 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/18-archives-safe-writes.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-18.md</Path> |
| T-19 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/19-archives-forms.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-19.md</Path> |
| T-20 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/20-archives-relations.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-20.md</Path> |
| T-21 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/21-archives-migrate.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-21.md</Path> |
| T-22 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/22-archives-sync-forks.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-22.md</Path> |
| T-23 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/23-archives-tree-views.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-23.md</Path> |
| T-24 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/24-archives-home-refs.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-24.md</Path> |
| T-25 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/25-archives-portability.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-25.md</Path> |
| T-26 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/26-archives-scale.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-26.md</Path> |
| T-27 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/27-archive-restore-owner.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-27.md</Path> |
| T-28 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/28-archives-fork-editor.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-28.md</Path> |
| T-29 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/29-archives-import.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-29.md</Path> |
| T-30 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/30-archives-derived-graph.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-30.md</Path> |
| T-31 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/31-browser-storage-extension.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-31.md</Path> |
| T-32 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/32-joint-acceptance.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-32.md</Path> |

## 3. Gates and Completion Evidence

### Overall Definition of Done

36项 AC 和适用源条款全部闭合；所有未取消票有真实交付、固定输入、独立双轴审查与 verified 记录；共有路径/接口/格式/迁移/回退一致。原型之外 UI 获得实际页面批准。四个 browser 必需平台、最低宿主及档案桌面/移动端要求有对应证据；关键故障负例通过；生成物与源码一致。无活动 writer、未解决高影响偏差或不明副作用，Lead 最终核验后才更新 README Outcome。

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Lead/批准人 | 失败恢复 |
|---|---|---|---|---|---|
| G-00 执行前置 | 计划编写结束、准备 run | 核对本次 run 范围与授权、真实模型可用、Spec/工具门一致、共享构建 owner 可执行、每票 DoR/写集/直接依赖；更新计划验证 | 全局调度，或已定位的局部分支 | Lead；仅新增设计/产品取舍由用户 | 不改框架绕门；回 S/T/P 或 owning 工具处置具体缺口 |
| G-01 联合入口/隐私 | T-01 固定交付 | 三 View/懒加载/启停及运行秘密排除，可见档案仍可版本化；已有证据可验证复用 | 三条产品线入口 | Lead | 保留原合并快照，定向修复/复核 |
| G-02 浏览器公共协议与控制 | T-02–08 相关前置成立 | 观察/事件/低水位、Cookie 完整读回、revoke ACK、重开及文件/材料真实路径与故障矩阵 | 浏览器平台与扩展消费者 | Lead | 保留 operationId、profile 与清理事实；unknown 不重放 |
| G-03 四平台完整验收 | T-09–12 对应资产与实机可用 | 各组 G-01～G-06/T-01～T-22、资产摘要、sandbox/凭据/IME/PRIMARY 适用报告及 p95/CPU/RSS | 浏览器完整交付与 T-32，不停止独立档案/历史线 | Lead；实机采证执行者 | 缺环境保留待验收，不替换平台/降级为 mock |
| G-04 笔记历史核心 | T-13–15 输入冻结 | opt-in buffer采样、5分钟/30天/1GiB、保护引用与空间不足暂停；真实主窗/popout及恢复/撤销/hold负例 | 核心历史、T-24/27 | Lead | 不删检查点补配额，不覆盖新编辑；回读 receipt |
| G-05 通用档案迁移与导航 | T-17–23 展开/迁移/同步阶段依次可验 | 第三类型+两表单+关系+类型树列表卡片+字段投影；每步中断恢复、v1可读、parent graph、portable事实、buffer拒绝 | 档案后续消费者 | Lead | 保留 staged/committed/hash；不复活 tombstone，不丢草稿 |
| G-06 可携带/性能/跨域恢复 | T-24–27 汇合 | 干净vault重建、1000/5000及5000/25000规模测量、home单向归属、versioning→archives owner拒绝负例 | 档案扩展与联合收尾 | Lead | 先对账再重试，数据不可只还原单文件；仅受影响证据失效 |
| G-07 扩展设计与条件能力 | 各扩展所需真实前置存在 | T-16/28/29/30 实际新原型和用户确认、S/T重绑DoR；T-31按原条件验证支持/拒绝；正式实现与回归证据另行闭合 | 仅该票及依赖闭包；设计批准不等于功能通过 | P/S/T owner、用户确认具体新界面、Lead验收实现 | draft 不自动提升；保留旧批准范围，细化/拆分后递增 map |
| G-08 联合交付 | T-32 所需依赖事实齐全 | 所有36项覆盖、最终构建/许可/包体/文档/宿主、同快照独立整体双轴与跨域回归，数量及源条件核对 | 整体完成 | Lead | 冻结失败输入、重开相关闭包，不只重跑最后一票 |

### Contract and Reference Coverage

逐项 AC→票据的唯一覆盖表位于 Map 第4节；Goal 只增加 Gate 归属。

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|
| AC-001/002/031/032、三 View 与构建 | T-01/23/32 | V-01/02、宿主、架构/包体/许可 | 原票证据 + G-01/08 | planned |
| AC-003–012、Issue1 FR/G/T、ADR-004/006 | T-02–12/31 | B-01/02/03、四组实机 | 原票证据 + G-02/03/07 | planned |
| AC-013–017/034、Issue2 A–F、ADR-003 | T-13–16 | V-03/04、临时Git和真实笔记buffer | 原票证据 + G-04/07 | planned |
| AC-018–025/027–030/033/035/036、Issue3 P0–P5、ADR-001/005 | T-17–30 | A-01/02/03、golden、故障与规模 | 原票证据 + G-05/06/07 | planned |
| AC-026/028/033、ADR-002 | T-24/27 | X-01、真实恢复入口及不写入负例 | 原票证据 + G-06 | planned |

## 4. Execution and Integration Protocol

执行入口为 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>。Lead 和实施 subagent 按 Map → 命中 dev/ui Skill → 当前 Ticket → 直接依赖 Evidence 读取。I 负责实现、独立双轴审查和验证；P 不能用调度完成替代这些步骤。

### Lead Orchestration

**用户强制指定：所有实施任务使用原生 subagent，模型 `gpt-6.1-sol`，推理强度 `high`。** 用户的 `gpt-6.1-sol-high` 按宿主接口拆为模型与 effort 两个参数；不把它当作不存在的组合模型 ID，不用默认继承替代。该要求优先于技能的动态模型默认选择，不扩展为修改全局配置。

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | native:root | 原 change owner，唯一正式状态/Evidence/验收 owner |
| Ticket scheduling | auto | 继承原上下文，按 DAG/写集/语义资源计算 |
| Implementation agents | 原生 subagent；gpt-6.1-sol；high；fork_turns:none | 本次用户明确要求；宿主 spawn_agent 支持分别指定 |
| 并发限制 | 不新增 max_parallel_tickets 或 concurrent_implementation_limit | 用户未给固定人数/票数；无项目 config；每次核对实际宿主剩余槽 |
| Integration attempts | 3 | execution-policy 缺省；相同 blocker 无新证据提前停止，不必用满次数 |
| Read-only agents | 独立 reviewer 不参与对应范围实现 | I 双轴要求；不靠改名/清空会话伪装独立 |
| Dispatch | 执行期按合法 frontier 分配 | 不预造 agent ID；不复用此前仅做 source-gap-analysis 的 agent 充当新模型实施者 |

本会话工具能力为总计4个 agent 槽（含 Lead），这是当前宿主事实而非永久并发策略。实际派单前 list_agents 核对；为独立审查/验收协调留出可用能力，不为填满槽强行并行。当前 plan 不 spawn。

实现派遣的关键参数合同：

```json
{
  "task_name": "t_nn_implementation",
  "fork_turns": "none",
  "model": "gpt-6.1-sol",
  "reasoning_effort": "high",
  "message": "冻结的 TASK：具体票据、I/项目 Skill、完整输入定位、写集、验证与停止条件"
}
```

实际 task_name 和 message 必须替换为当票真实简报；不能将示例直接作为空任务派出。fork_turns:none 确保模型覆盖被接受，同时意味着必须提供独立上下文：真实项目根/change/Goal版本与 Map revision、Spec/ADR/DESIGN/票/依赖证据、快照、写集、共享 owner、禁止动作、验收与返回位置。模型不可用或参数被拒绝时保存原错误，停止该派遣；**不静默换模型、降低 effort、改由 Lead 实施或另开 CLI**。已有有效授权范围仍可继续只读分析和其他独立任务。

### Change Workspace and Verification

唯一工作区事实从 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/README.md</Path> 的 execution-context 回读：current / NAMEWTA/34。全部实施者和 reviewer 复用该目录；不创建多 worktree 或候选 checkout。既有用户方法/规则修改保持原样，不把它们收入实施快照的“本票改动”。

并行仅限无冲突写集；Git index、构建产物和全局检查由 owner 串行协调。独立 review 与 Lead E2E 前停止相关 writer，冻结 commit 或未提交工作副本摘要；记录实际代码/配置/资产/Skill/夹具/环境。用户未授权提交时快照足够，不强制每票 commit。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| 本次 Goal 规划/导航/只读验证 | allowed | 当前用户明确激活本 Skill 与指定 change |
| 实施方式和模型 | required | 当前用户强制原生 subagent gpt-6.1-sol/high |
| Change workspace implementation | 本次未启动 run | 本调用按默认 plan 处理；进入 run 时回读具体范围和既有授权，已成立授权不重问；模型选择不独立授予全范围实施 |
| Change workspace verification | allowed（本轮文档/计划） | 生产验证在对应实施输入固定后按 I/票合同执行 |
| Change worktree creation | not-requested | 复用 current，不因协作增建 |
| Implementation commit | not-requested | 没有新增提交授权 |
| Merge / parent update | 既有本地 PR4/5 合并已完成；无新增动作 | 不重复旧合并，不推导新分支集成权限 |
| Push / PR / remote merge | not-authorized | 不从实施/规划继承 |
| Branch/worktree cleanup | not-authorized | 保留所有现有用户改动与工作区 |
| Deploy / production migration / archive | not-authorized | 测试只用一次性资料；真实用户库迁移需具体目标与动作授权 |

### Evidence Return

实施者仅在指定路径实现，返回实际 agent身份/模型请求、变更路径、快照/dirty状态、命令及退出码、AC结果、未验证项和 blocker；不修改正式状态或自行关闭票。返回经 Lead 回读；独立 reviewer 对相同固定候选给标准轴与规范轴结果；Lead 执行适用 E2E、写原 Evidence/Workspace Execution Record 与状态。只读 reviewer 的模型不由“实施模型”要求自动限定，但必须未参与本范围实现。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

六条 ADR 不重开；archives 主资料与 home 执行通过引用；独立关系/可见迁移事实为真源；原生未保存叶拒绝覆盖；未知网页效果不重放；Cookie/Identity 不明文降级。只有批准 PAGE-001–005 可直接实现，新扩展返回 P/S/T。产品 en/zh 文案走 t()，维护文档中文。

### Verification Integrity

所有证据绑定输入而非票名。PR作者报告、原型模拟、旧 main.js、其他 OS/架构、宿主关闭 sandbox 不能替代当前相应证明。命令沿 dev 测试选择表：pnpm test 的针对夹具、build/lint、test:architecture/test:i18n/test:docs、check:bundle/check:notices、accept:browser-native、accept:contacts-scale 与真实 Obsidian 探针按风险运行。档案移动端和最低 Obsidian 1.13.0 另行取证，不用 browser 移动端排除覆盖它们。

### Migration or Release Sequence

Expand(T-17–20)：v2 envelope/codec/公开命令与独立关系，同时保留 v1 可读和基本字段旧路由。
Migrate(T-21)：冻结 hash/ID，写关系并读回，CAS owner，再可携带回执，每步可中断。
Observe(T-22/25/26)：双头/乱序/tombstone/缺件诊断、干净 vault 重建与规模测量。
Contract：只有对应源/消费者扫描与兼容夹具证明不再需要旧路径后，按原票移除负责范围；不能删除用户 v1 资料或拿删除测试充数。
Verify(T-27/32)：跨域 owner 恢复负例、联合真实宿主与产物一致性。没有发布阶段授权；release-coordination 模式不适用。

### Risks, Monitoring and Recovery

| 风险 | 观察与停止信号 | 恢复 |
|---|---|---|
| 子任务模型/上下文不符 | 工具拒绝指定模型、未携带真实合同、越界路径 | 停该派遣，核对能力与冻结 TASK，不静默回退 |
| v1/v2 半迁移/同步乱序 | hash漂移、缺关系、未闭合commit事实 | 先对账已完成步骤，复用ID，保留备份/草稿；禁止单文件强行回滚 |
| browser unknown/凭据/进程残留 | ACK未知、旧票、孤儿进程、清理失败 | 保留 operationId/profile，读回清理责任，不重放副作用 |
| 历史配额与恢复引用 | 保护对象不足、checkpoint写失败 | 暂停采集，拒绝覆盖，不删除恢复依据 |
| 平台/宿主证据缺失 | 实机不可用或构建/环境不匹配 | 相关Gate待验收，其他合法分支继续 |
| writer或输入漂移 | 已冻结路径/摘要发生改变 | 停冲突writer，只使影响闭包失效，重冻结并验证 |

同一 blocker 无新证据不重派；3次检查失败前已可停止。Lead 保存失败快照、共同模式与改变方法/输入/环境的具体决定后，才建立新冻结 TASK；换 Agent 不构成实质改变。原操作结果未知先查真实 agent状态与写入，不并行补做。恢复仍用同一工作区。

### Deviation Control

局部实现不改变目标时按原票自主处理；范围/AC/接口/数据/安全/迁移或设计漂移交 owning G/S/T/P，更新原权威与 Map revision 后重算闭包。不得改校验器、批准记录或旧 Evidence 来给实现补票。正式永久知识只经 A，Goal 不写。

## 6. Progress and Decisions

### Current Status

本轮已按 SRC-010 开始实施：T-01 代码交付已完成并获独立双轴 pass；T-02、T-13、T-17 已派指定模型实施，分别由 native:/root/audit_browser、native:/root/implement_t01、native:/root/audit_archives 独占本票写集。正式完成状态从 Ticket/Evidence 回读，尚未关闭任何产品完成 Gate。前轮 Goal 规划已形成。Ticket 状态从原票回读；当前没有由本计划派出的实施 subagent。G-00 保留未满足项；其他 Gate 均为定义而非通过记录。只读控制结果与冻结输入见 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/goal-planning-review.md</Path>。

### Pending Decisions and Blockers

1. 当前为 plan 调用；进入 run 时核对实施范围/授权及模型可用，不将写入本文件当成授权。
2. 当前 Spec仍draft；v8指南允许 future draft 只局部阻塞，但 ticket-control 仍全局检查 source Spec Ready，validator 也拒绝 Goal Ready + Spec draft。二者是已实测差异，不能冒充已解除。先由 S/T/P 完成真实合同收口，或由相应方法 owner 明确处置规则/工具差异；本次不修改框架，不把局部缺口自行扩大成产品要求。
3. T-16/28/29/30 缺扩展 UI：生产者为 P 补充原型，分别依托 T-15/27/28/29 的真实产物，需新页面与状态、用户确认、S/T AC/摘要绑定及 DoR 重审。未有产物不预造 UI-ID/版本或把上游 done 自动当 Ready。
4. G-00还需由 T 解决“每票需要构建，但生成物 owner T-32 只有末尾依赖”的执行合同缺口；T-16提升Ready时重新处置与T-24/27潜在写集重叠。当前规划已定位，不授权越界构建。
5. 四平台实机与档案移动端/最低宿主证据在对应 Gate 前核实；当前仅本机 Linux 已有历史证据，未确认其他环境可用，不为规划临时安装或模拟冒充。

### Resume Protocol

回读本 Goal、Map 当前 revision、README execution-context、原票/直接依赖 Evidence、Spec/ADR/DESIGN确认与Skill摘要；核对 Git HEAD/dirty用户改动、活跃writer、未闭合事务和原授权。运行 ticket-control 与 goal-plan stage，定位具体前置；只在已授权 run 且条件满足时派指定模型 subagent。每票返回按 I审查/验证并继续下一合法frontier，不逐票重问“继续”。frontier为空时保存精确原因，不声称后台运行。

## Assumptions

无新增产品假设。用户的模型写法按当前工具 model/effort 分离参数表达；实际可用性在派单时核验。本机4槽是当前能力而非永久限制。前轮 plan 的 ready_for_execution=false 已由 SRC-010 的明确 run 授权与本轮执行约定取代；当前 true 表示本轮核心实施已获授权，不表示所有未来 UI/验收门已通过。

## Execution Policy Source

- 用户来源：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/sources/SRC-009.md</Path>，明确实施使用 subagent gpt-6.1-sol-high；这是 required，而非可回退的 preferred。
- 调度：继承 current change 的 auto；完整计划拥有票据调度策略；README Execution Context 的 v1 schema 仍要求 ticket_execution，保留匹配的 auto 作为工作区记录，不另立调度权威。没有用户指定人数/票数，不填固定上限。
- 验证尝试：<Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 明确缺省3；当前不存在 specdev/config.json 或 coordination/project.json，不创建全局配置。后续出现更严格有效限制时先重检。
- 工作区/Lead：README已有 current/NAMEWTA/34/native:root；宿主原生工具支持 model=gpt-6.1-sol、reasoning_effort=high，fork_turns=none 才能覆盖模型。未派单，未宣称实测调用成功。
- 当前合同：Goal schema v8；goal-lifecycle 的旧 v7文字不覆盖 schema/模板/validator 的v8要求。本次从零按v8编写，不修改方法文件。


### 本轮代码审查接续点

T-01 已有代码范围双轴pass与Evidence；T-02/T-13/T-17 首版均经独立生产代码反例审查并 request-changes，分别交回原实施者repair-1；三份原始报告与首次快照保留。实际报告与固定输入均在原 evidence/T-*.md 导航，未来Ticket尚未实施。没有真实验收通过声明，没有提交、发布或归档。


### 执行进展：T-13/T-17 r2 闭合

T-13 与 T-17 原审查 findings 经 repair-1 后重新冻结，由原独立 reviewer 双轴复查通过；Lead 已回读报告并统一测试类型检查 exit 0。代码交付标 done，真实验收仍 user-owned/not-run。依 DAG 继续派遣 T-14 与 T-18；T-02 仍在 repair-1，尚未完成。详见原票 Evidence。


### 执行进展：T-02 r3 闭合

浏览器观察T-02经历两次真实审查修复，r3两轴pass，五项发现关闭；194项最终自动测试及类型通过。Lead回读报告/核对源码，代码交付done，真实验收仍用户负责。继续派遣T-03操作账本；T-14/T-18并行实施。


### 执行进展：T-18 r2 闭合

T-18独立r2两轴pass，三项问题关闭，162项相关自动测试通过；代码交付done，推进T19。真实验收仍用户负责；T03测试夹具架构失败由原browser owner修复，Map6补明确测试树写集，未宣称全仓检查通过。T14配额repair2已停写待r3复查，T03仍在初审。


### 执行进展：T-14 r3 闭合

T14经过两次实际配额反例修复，r3独立两轴pass，代码交付done，推进T15历史比较/恢复整合。T19在实施；T03初审3个P2交原作者repair1，架构fixture已获Map6最小写集。全局架构/产物及用户真实验收尚不声明通过。

### 执行进展：T-03 r2 闭合

T03三项问题经repair1独立双轴pass，14源码31来源核验一致，代码交付done；架构实际exit0，原全局失败关闭。继续T04；T15已停写准备独立审查，T19实施中。真实验收仍用户负责。

### 执行接续：T04候选收尾、T15r2、T19repair1

代码done且独立双轴闭合为T01/T02/T03/T13/T14/T17/T18（7票）。T15首审发现交换/滚动开关/比例三核心控件缺口，repair1已停写，12文件r2输入hash2120b9536e8ae0ab476d3539bab4816c3eae4f59ecbed2162d233aff0d677e72交review_code独立补审；188项作者回归和全test类型通过。T19首审24文件46来源hashd3736a5231a43ccd089e9726d32bf8905f2a44944d1831b972bd35df67f18076发现5项生产/DOM反例，原作者repair1，含发布staged安全、legacy创建CAS、条件闭集、设置草稿owner及重复ID精确浏览。T04作者240项初步回归与类型/lint/架构通过，仍补旧request epoch迟到隔离，尚未停写。原始失败报告/输入保留，各票具体证据见原T-*.md。

真实验收user-owned/not-run，当前不运行真实Chrome/Obsidian/四平台/视觉性能，未build最终联合产物、未提交推送归档。预先补查的原生平台复用线索仅在sources/native-platform-reuse.md，不表示T09–11开始或通过。

### 执行进展：T15 r2闭合、T16实施

T15三核心交互repair1后独立两轴pass，12源码36来源复核一致，代码done；目前8票done。继续T16按块恢复，按SRC010继承设计实施而不伪造扩展原型批准，ready=false/design_ref=null历史门如实保留；与未开始T24/T27串行。T04已冻结13文件35来源hashb235c51ea97acd94581b492f1035be339560d0633be420705e248efc09e688dc，独立review_browser审查中；T19五finding在repair1。真实验收/最终产物尚未完成。

### 执行进展：T04 r2闭合、T05实施

T04两项P2经repair1独立双轴pass，13源码36来源核验一致，代码done；目前9票done，推进T05 Cookie/Identity。T19r2原5finding已独立确认关闭，但出现workbench切root继承dirty/busy状态新P2，报告待返回，未标done；T16按块恢复实现中。真实验收/最终产物仍待用户与后续Lead集成。

### 执行进展：T19 r3闭合、T20实施

T19五项初审及root/context后续问题经两轮修复独立双轴pass，27源码52来源核验一致，代码done；目前10票done。推进T20独立关系。T16初审唯一CR/LF拼接损害未选空白行P2在repair1，F条件判定成立；T05身份导入实施中，其活动测试类型5诊断待收尾。最终产物和用户真实验收尚未完成。

### 执行进展：T16 r2闭合

T16原换行边界P2修复后独立双轴pass，17源码47来源核验一致，代码done；当前11票done。F按需条件未触发、未支持，扩展原型未批准事实不改写；真实验收用户负责。T05身份导入与T20关系实现继续。versioning当前无writer，T24/T27未来可在各自依赖闭合后使用该域；最终产物/全局检查仍未执行。


### 原生平台只读预查与 Map revision 7

原生 Agent 只读核验 Windows/macOS 入口、回收、凭据、资产、安装与CI接缝，详细事实及一手引用保存 sources/native-platform-reuse.md。release.yml 的实际 Linux 单资产归集缺口补入 T32 串行配置写集，未执行发布；DAG与活动票写集不变。Windows GNU 有本机编译工具，Apple 原生编译环境未发现，不据 unsupported 分支绿灯声称支持。T09–11 未开始，11票代码done；T05/T20继续。


### 执行进展：T05冻结初审

T05作者23文件停写，288项browser/源码CLI及类型、lint、架构、词典通过，最后UI12DOM通过；输入23源码47来源hash7e0209d2ad8f16e137cd66e42675d8298c12c35a5d2706287f00ed61e417624d交独立review_browser。T20仍收尾关系故障与DOM，不声明done。11票已完成代码独立审查，T06尚不开始；真实验收仍用户负责。


### 执行进展：T05 repair-1、T20完整定义入口

T05独立首审3个P2（人工提交回执被lease抹除、refresh覆盖已提交事实、人工保存缺取消）已交原作者repair1；原报告/输入保留，49项定向绿灯不抵消实际反例。T20收尾核对发现完整自定义关系约束仅API可配，正补原合同的用户定义入口，仍未冻结。11票done，T06/T21未开始，真实验收仍用户负责。


### 执行进展：T20冻结初审

T20完整关系/自定义定义UI候选24路径56来源，hash62ed8e4bf5c1517ecd33f26a0d09230562c5ea4e35eb7f60a7644435d9254eee交独立review_archives；作者最终定向负例及DOM28/限定类型lint通过。T05 repair1新增并发refresh barrier先red，作者修复中；两票均未done，仍11票代码闭合，真实验收用户负责。


### 执行进展：T05 r2复审

T05repair1完整25源码49来源hash87786933a01e0cb89329ac295e3bf25148ee963698b7ba2afbd88cc5aa98043e冻结交独立r2；308项browser/CLI与必要检查通过。T20初审扫描/generation提交竞态实际反例待完整报告，未提前修或标done。T06/T21均只读预查，11票代码闭合。


### 执行进展：T05 r2闭合、T06实施

T05原3P2经repair1独立双轴pass，Lead全文回读并复核25源码49来源一致，代码done；现12票完成。依DAG开始T06，按只读预查逐项证实生命周期缺口。T20初审已有扫描generation、迟到UI读取、未改字段误发补丁3项生产反例，待完整报告；T21仍不实施。最终联合产物/用户真实验收未执行。


### 执行进展：T20 repair-1

T20首审1P1+2P2（scan基准、旧读取覆盖、未改metadata补丁）已由Lead完整回读并交原作者repair1，原始输入/报告保留。T06实施中，T21只读预查完成但仍待依赖。12票代码done，真实验收/最终产物尚未执行。


### Map revision 8：T24实际消费者路径补核

只读预查确认home两个recent入口、公开资源分类、通用详情/提醒owner及项目唯一所有者接缝，存sources/archive-home-preflight.md。补T24必要调用方/测试路径并消除module可写只读冲突；T24未开始，DAG与活动T06/T20范围不变。12票done，T06实施、T20repair1继续。


### 执行进展：T06初审与T20 r2复审

T06候选17源码53来源hash738244fa4bcd20ef7a842e693a1e716358dd28404ad7a090c38b53fb8f053c92交review_browser；作者323项及必要类型/lint/架构/词典通过。T20repair1完整24路径57来源hash069badbe6898da7dc1b9492d24816071f92ce6a6b6379025132636c5f1aa11f8交原review_archives；210项回归通过，活动browser类型诊断已由最终全testtsc关闭。当前12票done，T07/T21尚不实施；真实验收与最终产物用户/后续T32负责。


### 执行进展：T20 r2闭合、T21实施

T20原1P1+2P2经repair1独立双轴pass，Lead全文回读并复核24路径57来源一致，代码done；当前13票完成。依DAG启动T21显式迁移/回退与旧inline写门，合成临时资料验证，真实用户资料不动。T06独立初审中，T07只读预查已返回，未实施；最终联合产物与真实验收尚未完成。


### 执行进展：T06 repair-1

T06初审唯一P2为旧stop最终catalogawait期间接受start、较晚stop被旧Promise吞掉；Lead完整回读并交原作者repair1，保留原始证据。T21分片实施中，13票代码done；T07不提前开始，最终产物和用户真实验收未执行。


### 执行进展：T06 r2复审

T06repair1仅四路径修改，完整17源码54来源hash13285d8c864d8d8e498184872a1801101b2137ed9d79a60a29b1b77bb2614aa9交独立r2；325项browser/CLI、全testtsc等检查通过。T21实施继续，13票done；Map8保持冻结，T07未实施，真实验收/最终产物待后续。


### 执行进展：T06 r2闭合、T07实施；Map revision 9

T06原P2经repair1独立双轴pass，Lead完整回读并复验17源码54来源一致，代码done；当前14票完成。启动T07文件/背压/原位输入，T21迁移实施继续。T08只读预查发现实际Agent材料消费者写集缺口，当前无冻结审查后补Map9，DAG/T07/T21范围不变。真实验收/最终产物尚未执行。


### 执行进展：T21冻结初审

T21原作者26路径停写，输入26路径61来源hashfd770723cd6f7b0efede82b02f0ba78f5edf727b6bc31e756467095f0460dbb8交review_archives；283项相关回归、最终导航/busy切片、全test类型/lint/架构词典通过。T07继续上传最终期限与IME/清理收尾，14票done；T22尚未实施，真实验收/最终产物仍后续。


### 执行进展：T21 repair-1

T21独立初审3P1+2P2（回退待完成权威、旧消费者绕过、busy草稿、阶段退回、合法分批），Lead全文回读交原作者repair1，原输入/报告保留。T07最终期限/IME收尾中，14票done，T08/T22尚不实施；真实验收/最终产物仍待后续。


### 执行进展：T07 冻结初审

T07 作者 28 路径停写，冻结输入 28 文件、58 来源，完整 SHA `8714d694f040912733252753c34a3d544ec0ead82bb3b61b0393b938dda7eef3`，Lead 实际复核 drift=[]，交 review_browser 双轴独立初审。上传最终截止、持久清理、原位 IME 与实际流链均纳入 AC009；345 项浏览器/CLI及末次局部、类型/lint/Rust纯逻辑检查记录在 T07 Evidence。T21 repair-1 继续，当前 14 票代码完成；T08/T22 未实施，真实验收与最终产物尚未完成。


### 执行进展：T07 repair-1

T07 独立初审 3P2（清理末边界替换、索引部分发布后副本误删、静止页输入恢复），Lead 全文回读及 28 文件58来源复验后交原作者 repair-1。T21 五项原始反例已转绿，剩余对照和最终检查继续；当前14票done，T08/T22不提前实施。原报告/历史失败保留，真实验收与最终产物未执行。


### 执行进展：T21 r2 冻结复审

T21 repair-1 作者停写，实际完整27路径63来源冻结，SHA `c827e36fe7b834e4d2a688004036c69a7b16975c3d2ba1dea03cdb54ce2cfd45`，交原独立 review_archives 复审。308项同组测试及类型/lint/架构词典通过；原ENOSPC/超时与tmpfs限制保留。T07 repair-1继续，14票done；T22/T08不提前实施，最终产物/真实验收未完成。


### 执行进展：T21 repair-2

T21 r2 仅余1个P2：回执rename移入时旧inline投影不刷新；其余原问题闭合，最终写门已成立。Lead全文回读/27路径63来源复验后交最小repair-2。T07 repair-1定向98项通过并收尾全browser/CLI，14票done，T08/T22尚不实施。


### 执行进展：T07 r2 冻结复审

T07 repair-1停写，完整28路径59来源冻结，SHA `c6219c36d95c78a25c89df8eae0e9ae5578e1ef5ba65db83721a321db53514b8`，交原review_browser独立r2。相对初审10路径变化，native未改；最终/tmp串行41文件362测试与必要检查通过，历史间歇失败保留未归因。T21最小rename repair-2继续，14票done；T08/T22未实施，真实验收与最终产物仍后续。


### 执行进展：T21 r3 冻结复审

T21 repair-2只改application与migration测试两路径，新增4项/相关8项及类型lint通过。完整27路径64来源冻结SHA `6ab4637ece0ded5dae818d48d63255a3d8d8261cab30649d2e917c29000e54e9`，交原review_archives复核残余rename并完成两轴。T07 r2独立复核中，14票done；下游与真实验收/最终产物未启动。


### 执行进展：T21 r3闭合、T22实施

T21原五项及rename残余经repair2独立双轴pass，Lead全文回读并复验27文件64来源一致，代码done；当前15票完成。按DAG启动T22，前序迁移权威/原生最终门和兼容保持，研究三族定义发布事实与parent graph、同步缺件/tombstone实际入口。T07 r2收尾中，T08未开始；最终产物/真实验收尚未执行。


### 执行进展：T07 r2闭合、T08实施

T07原3P2经repair1独立双轴pass，Lead全文回读及28路径59来源复验一致，代码done；当前16票完成。按DAG启动T08，沿实际元素材料→启用Agent指定会话未发送输入区补完整合同。T22同步/分叉实施中；Map9保持，最终产物/真实验收尚未执行。


### Map revision 10：T08未知交付反馈

补T08所属Agent词典路径以准确表达paste调用后unknown，保持结果事实与可能引用材料，不借取消文案伪报未发送。无活动冻结审查，DAG/T22范围不变，当前16票done，T08/T22实施中。
