---
schema_version: 3
artifact: triage
change: 2026-10-26-unified-browser-versioning-archives
mode: intake
disposition: ready-for-human
verification: passed
remote_actions: []
source: <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/source.md</Path>
classification: mixed
risk: high
route: specdev/prototype
ready_for_implementation: false
updated_at: 2026-10-26T08:55:05.966101+00:00
---

# Triage：三个 Issue 与两个 PR 的统一摄入

## 当前判定

三个明确 URL 决定实际数量为 3 个 Issue。用户明确要求同一新 change，故各来源独立冻结、统一管理；没有把不同领域当作重复请求。来源正文、评论、PR reviews/review threads、完整文件清单及 binary diff 已捕获，摘要见 [来源清单](evidence/source-manifest.json)。原始用户消息见 [SRC-006](sources/SRC-006.md)，source.md 是初次范围摘要。

| 来源 | 有效快照 | 核验结论 | 剩余工作 |
|---|---|---|---|
| [Issue #1](https://github.com/NAMEWTA/obsidian-huhu/issues/1) | [SRC-001](sources/SRC-001.md) / [可读全文](sources/issue-1-body.md) | PR #5 有独立 browser 实现；只支持 Linux x64 | 完整感知、事件、账本回收、元素材料、平台及压力/故障矩阵 |
| [Issue #2](https://github.com/NAMEWTA/obsidian-huhu/issues/2) | [SRC-002](sources/SRC-002.md) / [可读全文](sources/issue-2-body.md) | PR #4 有 A–D 闭环；本轮联合构建 25 项真实宿主通过 | E/F 未交付项、其他平台/最低宿主验收、受管业务恢复边界 |
| [Issue #3](https://github.com/NAMEWTA/obsidian-huhu/issues/3) | [SRC-003](sources/SRC-003.md) / [可读全文](sources/issue-3-body.md) | archives 仍为 person/company；两个 PR 均未实现本项 | P0–P4 全部通用化与迁移；P5 扩展保留 |
| [PR #4](https://github.com/NAMEWTA/obsidian-huhu/pull/4) | [SRC-004](sources/SRC-004.md) | head b9f389101a178eaba99566ec805a2b44d5e2e01e；本地已合入 | 不把原 PR 声明等同新集成产物验收 |
| [PR #5](https://github.com/NAMEWTA/obsidian-huhu/pull/5) | [SRC-005](sources/SRC-005.md) | head 206abb5182e55bdce820895c2e71eaafdc97b4e0；Draft；本地已合入 | 原文已列缺口，不因合入变为完整完成 |

共同 base 为 33c21e098ef3188cbab5a09f3e0a01fadb787715。紧急度 normal；风险涉及浏览器秘密与原生进程、恢复数据、档案多文件迁移。`verification: passed` 仅指来源与当前差距核验以及本轮整合检查，绝不表示三个 Issue 的目标全部通过。

## 未知项

- 可发现事实：完整平台/原生故障矩阵、未来档案性能与迁移夹具仍需实际验证；原 PR 证据保留为固定构建的历史证据。
- 用户已决定：三个 Issue 全目标保留；采纳 #3 四项基础设计；档案预检失败或未支持时拒绝历史覆盖。另已确认自动历史默认政策、browser 四组平台、原生草稿拒绝写入及 origin storage 扩展边界，见 [LOG](LOG.md) 的 LOG-006–LOG-010。
- 当前 Ready 缺口：非 UI 与 UI-001 修订2五个主页面已确认；精确按块/F、复杂分叉解决、CSV 与派生/图谱等扩展 UI 尚待补设计，对应 T-16/T-28/T-29/T-30。已完成原型封板与32张 Tickets，整体 Spec 仍因这些前置保持 draft。
- 低影响实现细节：内部类/文件细拆、ID 算法选型与控件微布局交实现者，不能改稳定 ID、恢复与源合同。

## 路由

本轮 G 非 UI 共识及 S 对应合同更新已完成。下一 Work 为 `.agents/speculo/workflows/specdev/specdev-p-prototype/SKILL.md`，由用户后续处理 UI；之后 S 核对 UI 映射和整体 Ready。当前 [统一 Spec](spec.md) 的非 UI 合同已确认，含 UI 的整体仍为 draft；本轮不自动启动 P 或实施。

## 实施简报

- 现状与目标：保留已合入的独立 browser、versioning 与现有档案基础；后续补齐三份来源全部目标，源文的可选/后续扩展仍保持原有条件，不隐式取消。
- 核验：完整来源与固定代码事实见 [探索报告](evidence/source-gap-analysis.md)。合并提交、命令与真实结果见 [整合记录](evidence/integration.md)。已运行 67 文件/472 测试、25 项真实 Obsidian 以及构建/lint/架构/i18n/CSS/文档/许可/包体。
- 范围与实现方向：先确保联合基线，再按 spec 的领域 AC 闭合；browser 保持单 runtime/writer，versioning 保持检查点与同步 hold，archives 建稳定类型/关系/定义版本和可恢复迁移。不同领域共享宿主、存储排除和受管恢复边界。
- 验收：见 spec AC-001 至 AC-034；实现与实机/平台证据分层。本轮不开始 Issue 剩余功能实现。
- 风险：12 个冲突文件已解决；browser-materials 排除迁到 versioning 后保留。未来 v2 档案 owner/关系恢复存在单文件覆盖绕过风险，已获用户决定但尚未实现。
- 查重：原有活动/归档来源未发现相同五个 canonical locator；已有 Bot/终端 change 是相邻范围，不纳入或修改。永久 ADR/context 无命中需改写，本轮不写永久知识。

## 打标回执

未请求远程打标、评论、关闭、push 或合并 main，remote_actions 为空。GitHub 共享 CLI 只读 transport 因执行环境失败退出 126，改用连接器完整读取与固定 Git diff；未执行任何远程写操作。本地 Git 合并回执由 integration.md 保存，不混入远程标签账本。
