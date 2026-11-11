---
schema_version: 3
artifact: triage
change: 2026-11-04-bz-reference-capabilities
mode: intake
disposition: ready-for-human
verification: passed
remote_actions: []
source: <Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/source.md</Path>
classification: mixed
risk: high
route: specdev/grill-with-docs
ready_for_implementation: false
updated_at: 2026-11-04T09:22:55Z
---

# Triage: 借鉴 bz 的公共能力、密码本、档案×脸谱、归物本、书页日记与数据体检（#17）

## 当前判定

- **影响：** 跨 safe、archives、navigator、notifications 四个现有模块及拟新增 health 模块的产品级 Epic；涉及加密数据（safe）、档案 Markdown 权威、周期笔记正文与新增第三方来源登记。无现行缺陷，属于 feature 为主、含少量 refactor（公共反馈/事件）的 mixed 请求。
- **紧急度：** normal（无事故；Issue 自述为研究设计总纲）。
- **当前证据（2026-11-04 在 dev `81e43c4` 只读核对）：**
  1. **研究基线已失效。** Issue 固定的虎虎基线 `2bbcb3cebe94d554211ba413aa079ed1cd361489` 在当前仓库不存在（`git cat-file -t` 失败；本仓库为不携带旧历史的新仓库）。bz `master` 已从研究基线 `fc057c9798a595198fe2a5cf23b7655862af8fd4` 前进 138 个提交到 `d76a0870329403247917a00c43019e203a2560a4`（`gh api repos/yeshimei/bz/compare/...`），新增 `docs/adr/adr-0230-diary-book-ui.md`（**更正 2026-11-04，LOG-022：** compare 列表中的 `prototypes/` 203 个文件状态均为 removed——上游 ADR-0276 提交 4f0d767 已删除评审壳，UI 唯一来源为 `src/*/ui.ts`），并改动 `src/belongings/*`、`src/checkup/*`。许可仍为 MIT。
  2. **huhubot 已删除。** #41 的 T-40/T-41/T-45（提交 `166d1a9`、`2fa97c6`、`ca97e46`）删除了 huhubot 插件侧代码、原生 Runner、HAP 合同与文档。Issue §1「AI」行、§7.2「Bot 调用/记录」行、§9.5 对 Runner SQLite/trace 的依赖、P8「脸谱分析」对 huhubot 能力的申请均已无对象。当前 `ModuleId` 为 home/task/agent/archives/automations/notifications/icons/comments/navigator/versioning/safe（`<Path>src/app/contracts/module.ts</Path>`）；仓库内无进程内模型/凭据服务，`agent` 模块只提供终端 CLI Agent 派遣（`<Path>src/shared/agent-dispatch.ts</Path>`）。
  3. **通知：** `NotificationRequest.target` 仍只有 `runId/automationId`，`presentation` 仅 `automation-run`（`<Path>src/modules/notifications/api.ts</Path>`），与 Issue §4.1 描述一致，尚未泛化。即时反馈使用 sonner（`<Path>src/ui/components/sonner.tsx</Path>`）。
  4. **事件/文件监听：** 无领域事件原语；`vault.on`/`metadataCache.on` 分散在 17 个非测试文件（navigator、archives、versioning、home、icons、comments、automations、host 内容文件等）。
  5. **密码本：** `safe` 无 `api.ts`；界面为列表/网格＋`EntryDialog` 弹窗编辑，已有 `AccountRelations`、`AutoTextarea`、标签、备份对话框；无快速取密、无收藏字段、无三段式工作区（`<Path>src/modules/safe/ui/</Path>`）。
  6. **档案：** 预设只有 `type-person`、`type-company` 与 employment 关系（`<Path>src/modules/archives/core/schema/presets.ts</Path>`）；字段类型含 `money`（十进制＋币种）、`date`（日/月精度）、`table`（带 rowId 的重复子表），可承载归物生命周期。默认根目录是 `huhu/archives`（`docs/contacts.md`），Issue 写的 `huhu/档案/` 已不准确。无物品预设、无人物阅读层。
  7. **日记：** `NAVIGATOR_PERIODIC` 提供 root/template/inspect/preview/prepare/open/ensure/subscribe（`<Path>src/modules/navigator/api.ts</Path>`），无批量只读列表、无书页页面。
  8. **体检：** 无 health 模块，`ModuleId` 未登记。
- **相关代码/工件：** 见上；永久 ADR 只读核对 `<Path>{roots.state}/specdev/adr/INDEX.md</Path>`：无同类决定；其中「Bot应用权威与恢复边界」已随 huhubot 删除失去适用对象，不作为本 change 依据。archive 中无 #17 同 locator 的 change（查重无匹配）。

## 未知项

- **可发现事实：** 已核对完毕（见上）。后续 S/P 阶段需按 bz `d76a087` 重新读取各参考文件（B1–B28 路径可能随上游重构变化）。
- **需要用户决定：** change 粒度；huhubot 删除后脸谱 AI/私密材料范围；公共能力 A/B 是先建设还是按需提炼；原型/复刻深度；体检首期范围；实施优先级。已转入 G 设计树。
- **低影响实现细节：** 组件命名、i18n key、测试文件位置，按现有惯例由实现者决定。

## 路由

- **下一 Work：** `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>`
- **理由：** 事实已核对，但多项高影响产品/架构取舍因基线漂移（huhubot 删除、bz 新原型）需要维护者重新确认；用户本次也明确要求进入 G。

## 实施简报

- **现状与目标：** 现状见上 8 点。目标为 Issue §0「本期范围」1–7，按最新代码重新裁剪：去掉一切依赖 huhubot 的内容，其余以 bz 最新实现为复刻参考。无“已实现”、无重复、无既往拒绝。
- **核验：** 只读命令：`gh issue view 17 --json ...`、`git cat-file -t 2bbcb3c...`（失败，exit 128）、`git log --oneline | grep huhubot`、`gh api repos/yeshimei/bz/compare/fc057c9...d76a087`（ahead_by=138）、源码 grep 与目录列举。未运行构建/测试（无代码改动）。
- **范围与实现方向：** Issue §3.2 的 owner 表除 AI 行外仍成立；§14 P0–P9 分阶段需按 G 结论重排。明确不含：huhubot/Bot 相关的任何能力、bz 整体移植、第二套通知中心/人物库/归物库/日记正文。
- **验收：** 以 Issue §16 清单为基础，删去 Bot/AI 相关项后由 S 固化。
- **风险：** safe 加密格式与自动锁语义回归；档案修订/未知字段保留；日记正文单一来源；第三方 MIT 署名与 StPageFlip 等 vendor 许可；包体与启动闭包预算（#16/#41 已有门禁）。

ready-for-agent 不适用：仍有维护者决定未定（disposition=ready-for-human）。

## 打标回执

未请求远程打标；无远程写入。
