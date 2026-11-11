# SpecDev 资料迁移与分类记录

日期：2026-11-11。用户明确授权将 `temp/specdev/` 整理至 `.agents/dev/`，按当前 dev-workflow / dev-archive 规则持久化。本次不是产品实现、发布或重新验收；源码定位基于 HEAD `df1e642` 及当前工作区。原工作区已有 Speculo 删除、技能安装及根指令修改，未回退、提交或推送这些变更。

## 落点

- `adr/` → `notes/decisions/`；整份失效的 Bot 与首页 Cookie ADR → `archive/notes/adr/`。
- `context/` → `notes/context/`；Bot 旧术语 → `archive/notes/context/`。业务背景不放到用于宿主／角色配置的 `dev/context/`。
- `design/` → `archive/notes/design/`。旧 DESIGN-0001/0002 保留用于溯源，当前设计由前端重构 revision 3 承接，见[当前设计入口](../notes/context/frontend-design.md)。
- 长期知识入口为 [notes/index.md](../notes/index.md)，术语按主题维护，glossary 只提供映射。前端重构的稳定决定已提炼到 notes，而非只埋在历史任务里。

## Change 分类与路径映射

下列旧路径均相对于 `temp/specdev/`，新路径相对于 `.agents/dev/`。保留创建日期、原 ID、票号、内部结构和历史 Outcome；分类依据是完成／终止证据，不以原来处于 archive 就推定完成。

| 旧目录 | 新目录 | 依据与未交付边界 |
| --- | --- | --- |
| `changes/archive/2026-10-25-agent-workbench-refactor/` | [archive/changes/implemented/feature_2026-10-25-agent-workbench-refactor/](../archive/changes/implemented/feature_2026-10-25-agent-workbench-refactor/README.md) | 原 README completed 与归档回执；代码交付范围完成，Provider／真实宿主／五平台未据此通过 |
| `changes/archive/2026-10-25-huhu-bot-architecture/` | [archive/changes/rejected/feature_2026-10-25-huhu-bot-architecture/](../archive/changes/rejected/feature_2026-10-25-huhu-bot-architecture/README.md) | 原 active 仅曾按例外封存；后续产品线收缩 ADR-001 明确整体删除，不再实施，不伪造历史完成 |
| `changes/archive/2026-10-26-highlight-first/` | [changes/2026-10-26-highlight-first/](../changes/2026-11-11-workbench-integration/sources/2026-10-26-highlight-first/README.md) | 原 active、archive-ready 126；访谈与规格未闭合，无完成或取消依据，回到 changes 保留待决，不自动开工 |
| `changes/archive/2026-10-26-unified-browser-versioning-archives/` | [changes/2026-10-26-unified-browser-versioning-archives/](../changes/2026-11-11-workbench-integration/sources/2026-10-26-unified-browser-versioning-archives/README.md) | 原 active、archive-ready 126；浏览器部分已被删除决定终止，档案／历史部分不能因此整体算完成或拒绝，保留未闭合合同 |
| `changes/archive/2026-10-29-home-cookie-restore-deadline/` | [archive/changes/rejected/bug-fix_2026-10-29-home-cookie-restore-deadline/](../archive/changes/rejected/bug-fix_2026-10-29-home-cookie-restore-deadline/README.md) | 原 active；音乐与 Cookie 恢复对象已删除，5 秒等待方案由可选初始化离开关键路径原则替代，不伪造原修复验收 |
| `changes/archive/2026-10-31-dev-stabilization-overhaul/` | [archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/](../archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/README.md) | 原 completed 与 verified 归档回执；主目标为清理和收缩，包含修复与周边工作；真机项仍按原约定由用户验收 |
| `changes/archive/2026-11-04-bz-reference-capabilities/` | [archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/](../archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/README.md) | completed、20 票 done、最终审查 passed；原记录提交推送不等于已发版，宿主边界保留 |
| `changes/2026-11-05-frontend-uiux-redesign/` | [archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/](../archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/README.md) | completed、16 票与最终独立审查 passed；按用户本次整理授权归档，未重跑原验收，不宣称跨平台实机已通过 |

`rejected` 表示后续明确不再实施，不表示旧代码从未实现；原 README active／曾未授权归档等文字是当时快照，不是当前调度指令。若重新引入 Bot／浏览器／音乐，应另行设计，不恢复退役合同。两项 changes 仅是保留未闭合需求，不是本次已授权继续实施。

## 内容与证据保留

迁移共 2,275 个原文件，移动时逐文件确认字节一致、目标无覆盖；随后修复了 244 份 Markdown 的导航，另更新索引与入口。源目录已移空并删除，没有删除原任务证据、许可、原型或附件。

- 原 `source/`、`sources/`、`sessions/`、`evidence/`、设计 `revisions/` 以及非 Markdown 文件保持迁移前字节，历史摘要仍用于其原冻结对象。
- 索引和说明中的相对链接按新位置修复，旧 `{roots.state}/specdev/changes/{change}` 导航在可编辑任务说明中转换为真实仓库相对位置。原始报告里的路径、绝对本机位置、日志、旧 Skill 引用与执行模板不批量改写，不伪造新运行结果。
- 旧 archive-integrity、source hash、DESIGN 摘要记录的是当时快照，不是当前整理后目录的重新封印。导航修订与新分类以本记录为准，不更新历史校验回执来冒充重新验证。
- 已修复现役 `docs/architecture.md`、`docs/archives-implementation.md` 和根 AGENTS 的入口；旧 SpecDev A 网关约定已切换到当前 dev-archive 持久化规则。

## 验证与遗留

本次仅资料迁移，不构建插件、不执行 UI／产品行为验收。

- 文件迁移脚本完成目标冲突检查、2,275 份文件逐一移动后字节检查；原始证据与非 Markdown 不作内容转换。
- 执行 `pnpm test:docs`，最终退出 1：剩余 22 项（1 项历史日志目录缺失、10 项新技能自带锚点错误、11 项旧 dev/ui 技能入口缺失）。迁移新增的知识索引、路径映射与产品文档入口没有剩余报错；不在本次范围内修复技能安装问题。
- 复查全部 2,275 个映射目标均存在、`temp/specdev/` 已不存在；`git diff --check -- AGENTS.md docs/architecture.md docs/archives-implementation.md` 通过。
- 原 Bot 会话报告 `038-source-identity-repair/REPORT.md` 的 `logs/probes` 已缺失，属于原材料缺口；保留原报告，不创建空日志冒充证据。
- 原报告中已清理的 `docs/e2e/`、本机 `/tmp/`、旧机器目录与外部验收缺口仍不可恢复。本次不声明所有历史链接与历史证据可用。
