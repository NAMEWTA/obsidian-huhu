---
schema_version: 3
plan_contract_version: 1
resource_claims: ["storage:vault-layout"]
artifact: ticket
ui_change: true
design_ref: {"revision":2,"digest":"566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b","pages":["UI-GALLERY"],"acceptance":["AC-351","AC-352"]}
change: 2026-10-31-dev-stabilization-overhaul
id: T-16
title: "默认路径改为固定英文名，内置名称本地化"
status: done
kind: refactor
planning_depth: deep
planning_depth_reason: "改变 huhu/ 下所有 HUHU 生成的默认路径与黄金样本，跨多个模块"
ready: true
risk: high
blocked_by: ["T-01"]
contract_ids: ["AC-191", "AC-192", "AC-902"]
owner: "host:codex/root"
expected_changes: ["<Path>src/shared/storage/vault-layout.ts</Path>", "<Path>src/modules/archives/core/resources.ts</Path>", "<Path>docs/data.md</Path>"]
writable_paths: ["<Path>src/shared/storage/vault-layout.ts</Path>","<Path>src/shared/periodic-paths.ts</Path>","<Path>src/shared/file-type-icons.ts</Path>","<Path>src/app/content/new-note.ts</Path>","<Path>src/modules/archives/core/**</Path>","<Path>src/modules/archives/platform/vault-files.ts</Path>","<Path>src/modules/archives/i18n.ts</Path>","<Path>src/modules/archives/archives.test.ts</Path>","<Path>src/modules/home/core/reading/documents.ts</Path>","<Path>src/modules/home/core/expense/documents.ts</Path>","<Path>src/modules/home/core/pomodoro/documents.ts</Path>","<Path>src/modules/home/core/habit/documents.ts</Path>","<Path>src/modules/home/platform/vault/**</Path>","<Path>src/modules/home/platform/calendar/**</Path>","<Path>src/modules/home/platform/board/widget-migration.ts</Path>","<Path>src/modules/home/platform/board/widget-migration.test.ts</Path>","<Path>src/modules/home/core/board/recent-doc-policy.test.ts</Path>","<Path>src/modules/home/ui/inbox/InboxSection.tsx</Path>","<Path>src/modules/comments/settings.ts</Path>","<Path>src/modules/agent/platform/history/service.ts</Path>","<Path>src/modules/agent/services/backup/**</Path>","<Path>src/modules/agent/core/backup/transforms.ts</Path>","<Path>src/modules/versioning/services/restore-service.ts</Path>","<Path>src/modules/versioning/core/local-history.test.ts</Path>","<Path>src/modules/navigator/core/periodic.test.ts</Path>","<Path>test/golden/**</Path>","<Path>docs/data.md</Path>","<Path>src/shared/storage/vault-layout.test.ts</Path>","<Path>src/shared/periodic-paths.test.ts</Path>","<Path>src/shared/file-type-icons.test.ts</Path>","<Path>src/app/content/new-note.test.ts</Path>","<Path>src/modules/home/core/board/recent-doc-policy.ts</Path>","<Path>src/modules/home/services/board-store.ts</Path>","<Path>src/modules/home/services/board-store.test.ts</Path>","<Path>src/modules/home/platform/rss/rss-note.ts</Path>","<Path>src/modules/home/platform/rss/rss-note.test.ts</Path>","<Path>src/modules/home/ui/expense/ledger-csv.ts</Path>","<Path>src/modules/home/ui/expense/ledger-csv.test.ts</Path>","<Path>src/modules/navigator/ui/runtime.ts</Path>","<Path>src/modules/navigator/ui/ops.ts</Path>","<Path>src/modules/navigator/ui/ops.test.ts</Path>","<Path>src/modules/navigator/core/new-note.test.ts</Path>","<Path>src/modules/automations/core/documents.ts</Path>","<Path>src/modules/automations/core/documents.test.ts</Path>","<Path>src/modules/archives/services/generic/workbench.ts</Path>","<Path>src/modules/archives/services/generic/entities.ts</Path>","<Path>src/modules/archives/services/generic/test-port.ts</Path>","<Path>src/modules/archives/services/generic/application.test.ts</Path>","<Path>src/modules/archives/ui/generic/ArchivePage.tsx</Path>","<Path>src/modules/archives/ui/generic/FieldRenderer.tsx</Path>","<Path>src/modules/archives/ui/generic/FieldDesigner.tsx</Path>","<Path>src/modules/archives/ui/generic/RecordEditor.tsx</Path>","<Path>src/modules/archives/ui/generic/RelationPanel.tsx</Path>","<Path>src/modules/archives/ui/generic/QueryBuilder.tsx</Path>","<Path>src/modules/archives/ui/generic/DefinitionStudio.tsx</Path>","<Path>src/modules/archives/ui/generic/common.tsx</Path>","<Path>src/modules/archives/ui/generic/archives-generic.dom.test.tsx</Path>","<Path>src/modules/home/core/expense/model.ts</Path>","<Path>src/modules/home/core/habit/model.ts</Path>","<Path>src/modules/home/platform/expense/expense-service.ts</Path>","<Path>src/modules/home/platform/habit/habit-service.ts</Path>","<Path>src/modules/home/platform/pomodoro/pomodoro-service.ts</Path>","<Path>src/modules/home/platform/reading/reading-service.ts</Path>","<Path>docs/dashboard.md</Path>","<Path>docs/contacts.md</Path>","<Path>docs/navigator.md</Path>","<Path>docs/architecture.md</Path>","<Path>docs/icons.md</Path>","<Path>docs/privacy.md</Path>","<Path>docs/tasks.md</Path>","<Path>docs/agent-workbench.md</Path>","<Path>docs/task-domain.md</Path>","<Path>docs/comments.md</Path>","<Path>docs/workbench.md</Path>","<Path>docs/automation.md</Path>","<Path>src/modules/navigator/ui/settings-productivity.tsx</Path>","<Path>src/host/obsidian/storage/document-collection.test.ts</Path>","<Path>src/modules/navigator/platform/platform.test.ts</Path>","<Path>src/modules/navigator/ui/settings-productivity.dom.test.tsx</Path>","<Path>src/modules/navigator/ui/productivity.dom.test.tsx</Path>","<Path>src/modules/home/platform/record-storage.dom.test.tsx</Path>","<Path>src/modules/home/platform/rss/rss.dom.test.tsx</Path>","<Path>src/modules/home/services/board-backups.test.ts</Path>","<Path>src/modules/home/services/board-repairs.dom.test.tsx</Path>","<Path>src/modules/home/services/board-conversion.dom.test.tsx</Path>","<Path>src/modules/home/ui/reading/reading-confirm.dom.test.tsx</Path>","<Path>src/modules/home/ui/reading/reading-body.dom.test.tsx</Path>","<Path>src/modules/home/ui/inbox/inbox.dom.test.tsx</Path>","<Path>src/modules/home/ui/expense/records.dom.test.tsx</Path>"]
read_only_paths: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7","phase":"implement","operation":"apply-plugin-engineering-rules","inputs":["当前 Ticket","tickets-map 总体实施背景"],"outputs":["本票 Evidence 的 Skill Execution Records"],"required":true,"on_failure":"block-ticket"},{"id":"ui","path":"<Path>.agents/skills/ui/SKILL.md</Path>","sha256":"ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff","phase":"implement","operation":"apply-workbench-ui-rules","inputs":["当前 Ticket","tickets-map 总体实施背景"],"outputs":["本票 Evidence 的 Skill Execution Records"],"required":true,"on_failure":"block-ticket"}]
---

# Ticket T-16: 默认路径改为固定英文名，内置名称本地化

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

新库中 HUHU 生成的默认目录与固定文件名统一为英文小写 kebab-case，集中在 `vault-layout.ts` 一张表；内置类型/字段显示名经 `t()`。来源：ADR-006、ADR-008；LOG-009、LOG-014；#37 W5.1；Spec AC-191、AC-192。

<a id="review-behavior"></a>
## 行为与范围

IN：先在本票 Evidence 列出完整名称表（旧 → 新）并写入 `docs/data.md`；所有路径字面量收拢到 `vault-layout.ts`；内置类型/字段改用稳定机器身份 + 翻译键；删除代码中的旧中文默认路径与 `vault-layout.ts` 中“有意为中文”的注释；更新黄金样本。`InboxSection.tsx` 只替换路径常量引用，不改渲染。REUSE：`huhuName` 规则（其中文 fallback `未命名` 属于生成文件名，一并纳入名称表）。OUT：`.huhu/` 下的隐藏文件名（如 `操作.md`，ADR-006 只覆盖 `huhu/`）；旧目录检测、迁移或移动命令（ADR-008）。

## 验收标准

- [x] `AC-191`：全新中/英文库、切换语言、重启、自定义名称、目录碰撞用例通过；代码无中文默认路径残留。
- [x] `AC-192`：旧中文目录夹具下旧文件字节不变，HUHU 只读写新路径，无检测/迁移逻辑。
- [x] `AC-902`：无覆盖或清空用户文件。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 路径与名称 | vitest + i18n | `pnpm test:unit && pnpm test:i18n` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |
| 残留扫描 | grep | 在 `src/` 中检索旧中文默认路径字面量 | 未冻结的 huhu/ 默认路径表中零命中；排除 i18n/用户样本、明确 OUT 的 .huhu/ 固定名及 Browser 冻结引用，并列明定位 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |
| 文档 | docs | `pnpm test:docs` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 冻结期适用全量检查（execution-boundaries） 中 archives、home、versioning、navigator 相关集合与 “冻结期构建序列（execution-boundaries）”。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

<a id="review-constraints"></a>
## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

语言切换只改显示，不触发目录重命名；用户输入的标题与显式路径不翻译。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

写集较宽；与之重叠的后续票已在 DAG 中排在本票之后。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

冻结期不得因基线失败、中文路径扫描、minify、包体或全量测试失败修改 Browser。验收只对当前未冻结范围下结论，既有 Browser 相关检查若排除则列明命令和原因。

<a id="review-consumers"></a>
## T16-D01 真实消费者补齐

名称/显示消费者及保护回归按 Evidence 预检表纳入；UI-GALLERY 仅绑定既有表单控件文本、可访问名称和编辑语义，不改变布局或视觉方向。隐藏自动化 codec 与 backup 调用显式保留原中文空名 fallback，操作.md 不变。CSV 导出必须无覆盖碰撞保护。新内置定义可使用稳定可选翻译元数据，持久 revision 与语言无关；已有用户 label 不反向识别或改写。
