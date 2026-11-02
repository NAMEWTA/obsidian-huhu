---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: true
design_ref: {"revision":3,"digest":"78dd227f70b86804078218988b35850af8f2078a02ea791486dfb5b6f65d689f","pages":["UI-HOME","UI-GALLERY"],"acceptance":["AC-351","AC-352"]}
change: 2026-10-31-dev-stabilization-overhaul
id: T-42
title: "删除 Browser 产品入口、外链改系统浏览器，并删除 Home 网页分区与网易云音乐"
status: draft
kind: refactor
planning_depth: standard
planning_depth_reason: "多个模块的入口与外链行为变化，涉及看板文件字段与设置"
ready: false
risk: medium
blocked_by: ["T-40", "T-41"]
contract_ids: ["AC-402", "AC-403"]
owner: unassigned
expected_changes: ["<Path>src/app/main.ts</Path>", "<Path>src/app/commands.ts</Path>", "<Path>src/app/ribbon.ts</Path>", "<Path>src/modules/home/services/home-host.ts</Path>", "<Path>src/modules/automations/services/action-host.ts</Path>"]
writable_paths: ["<Path>src/app/main.ts</Path>", "<Path>src/app/commands.ts</Path>", "<Path>src/app/ribbon.ts</Path>", "<Path>src/app/manifests.ts</Path>", "<Path>src/app/workbench/compose-workbench.ts</Path>", "<Path>src/app/workbench/browser-contribution.test.ts</Path>", "<Path>src/app/settings/runtime.ts</Path>", "<Path>src/app/settings/nav.ts</Path>", "<Path>src/app/settings/nav.test.ts</Path>", "<Path>src/app/contracts/module.ts</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/shell/navigation-state.ts</Path>", "<Path>src/shell/host/workbench-surface.tsx</Path>", "<Path>src/shared/i18n/browser.ts</Path>", "<Path>src/shared/i18n/lazy/browser.ts</Path>", "<Path>src/shared/i18n/runtime.ts</Path>", "<Path>src/shared/i18n/huhu.ts</Path>", "<Path>src/shared/i18n/workbench.ts</Path>", "<Path>src/modules/automations/services/action-host.ts</Path>", "<Path>src/modules/home/services/home-host.ts</Path>", "<Path>src/modules/home/services/board-store.ts</Path>", "<Path>src/modules/home/services/board-repairs.dom.test.tsx</Path>", "<Path>src/modules/home/ui/cards/Card.tsx</Path>", "<Path>src/modules/home/ui/sections/P1Section.tsx</Path>", "<Path>src/modules/home/ui/rss/RssSection.tsx</Path>", "<Path>src/modules/home/core/board/types/model.ts</Path>", "<Path>src/modules/home/platform/board/widget-migration.ts</Path>", "<Path>src/modules/home/core/board/**</Path>", "<Path>src/modules/home/ui/web/**</Path>", "<Path>src/modules/home/ui/music/**</Path>", "<Path>src/modules/home/platform/music/**</Path>", "<Path>src/modules/home/platform/desktop/netease-account.ts</Path>", "<Path>src/modules/home/platform/desktop/session.ts</Path>", "<Path>src/modules/home/platform/desktop/session-lifetime.test.ts</Path>", "<Path>src/modules/home/ui/widgets/**</Path>", "<Path>src/modules/home/ui/canvas/**</Path>", "<Path>src/modules/home/ui/sections/**</Path>", "<Path>src/modules/home/ui/settings/**</Path>", "<Path>src/modules/home/module.ts</Path>", "<Path>src/modules/home/module.test.ts</Path>", "<Path>src/modules/home/settings.ts</Path>", "<Path>src/modules/home/services/instances.ts</Path>", "<Path>src/modules/home/styles/**</Path>", "<Path>scripts/verify-music-account.ts</Path>", "<Path>scripts/verify-music-client.ts</Path>", "<Path>scripts/verify-web-section.ts</Path>", "<Path>scripts/music-network-stub.ts</Path>", "<Path>scripts/music-electron-stub.ts</Path>", "<Path>scripts/music-vault-fixture.ts</Path>", "<Path>scripts/obsidian-acceptance/home-d2b-fixture.mjs</Path>", "<Path>package.json</Path>", "<Path>docs/e2e/dev-overhaul/removal/T-42/**</Path>"]
read_only_paths: ["<Path>src/modules/browser/**</Path>", "<Path>src/host/desktop/browser-session.ts</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>build/**</Path>", "<Path>src/ui/styles/fonts.generated.css</Path>", "<Path>src/modules/home/i18n.ts</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>build/**</Path> => Lead", "<Path>src/ui/styles/fonts.generated.css</Path> => Lead", "<Path>src/modules/home/i18n.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-42: 移除 Browser 产品入口，外链统一改为系统浏览器

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-42.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

去掉 HUHU Browser 在插件中的全部产品入口：模块注册与工作台页面、命令 `open-browser`、ribbon 地球图标、设置命名空间 `browser` 与产品开关、导航段 `spaces/identities/files`、工作台浏览器标签投影；所有“在 HUHU 浏览器中打开”的链路（插件 `openBrowser`、Home 卡片/P1/RSS、自动化 `openUrl`）改为系统默认浏览器，删除 Home 卡片“打开方式：浏览器标签/系统浏览器”选项。来源：#41 R4；ADR-010；Spec AC-402、AC-403。

## 行为与范围

IN：
- `src/app/main.ts` 删除 `openBrowser`/`BROWSER_OPEN`；`commands.ts` 删除 `open-browser`；`ribbon.ts` 删除 `globe`；`manifests.ts` 删除 `browserManifest`；`compose-workbench.ts` 删除 Browser 页面、`BROWSER_WORKSPACE` 订阅与就绪判定（并删 `browser-contribution.test.ts`）；`settings/runtime.ts` 删除 `browser` 命名空间与 `touch`；`settings/nav.ts`、`contracts/module.ts`、`contracts/workbench.ts`、`shell/navigation-state.ts` 删除 `browser`；`shell/host/workbench-surface.tsx` 删除 `browserTabs()` 投影；删除 `src/shared/i18n/browser.ts`、`lazy/browser.ts` 及其在 `runtime.ts`/`huhu.ts`/`workbench.ts` 的装配与键。
- 外链：`automations/services/action-host.ts` 的 `openUrl` 直接用 `win.open(url, '_blank')`；Home `home-host.ts` 的 `openBrowser` 改名为 `openExternal` 并只走系统浏览器，同步 `board-store.ts`、`Card.tsx`、`P1Section.tsx`、`RssSection.tsx` 调用方与 `board-repairs.dom.test.tsx`。
- Home 卡片直接删除 `openIn` 模型字段、选项、`widget-migration.ts` 旧默认值与专属词典键；无须保留发布前看板 `openIn` 字段解析、旧值兜底或保存不变性（ADR-011）。

- Home 网页嵌入分区（D-018）：删除 `src/modules/home/ui/web/**`（`WebPanel`、`web-precheck` 及测试）、`P1Section.tsx` 中的 web 渲染与配置分支、`widget-table.ts` 的 `web` 分区目录项、`board/sync.ts` 的 `updateWebConfig`、`card-kind.ts`/`registry.ts`/`syntax.ts` 中的 `web` 分区类型及其解析/序列化、`scripts/verify-web-section.ts` 与 `test:web-section`、`home-d2b-fixture.mjs` 中的 Web 分区夹具、`web.*` 词典键。
- 网易云音乐（D-018）：删除 `platform/music/**`、`ui/music/**`、`ui/widgets/MusicWidget.tsx`、`platform/desktop/netease-account.ts`、`platform/desktop/session.ts` 与 `session-lifetime.test.ts`；`module.ts`/`services/instances.ts` 中的 `MusicService` 装配与 `restoreAccount`；`widget-table.ts`、`widget-members.ts`、`widget-components.ts`、`AddWidgetPanel.tsx`、`TileFrame.tsx`、`WidgetBackground.tsx` 中的 `music` 项；`ServiceSettings.tsx` 音乐账号与背景设置；模型中 `musicBackground/musicVolume/musicRepeatMode/musicPlaylist/musicCurrentIndex`、`MusicTrack`、`MusicRepeatMode`；`settings.ts` 的 `widgetMusicEnabled`；`scripts/verify-music-*.ts`、`music-*-stub.ts`、`music-vault-fixture.ts` 与 `test:music-account`、`test:music-client`；`media.dom.test.tsx`、`service-settings.dom.test.tsx`、`widget-background.dom.test.tsx`、`module.test.ts` 中只测音乐的用例；`music.*` 词典键与样式。
- “网页快捷卡”（卡片类型 `web`）保留，只删除 `openIn` 选项（D-021）。
- 旧 `web` 分区、`music` 小组件、`music*` 字段与会话/Cookie 数据不纳入当前受支持模型；直接移除旧解析、恢复与兼容逻辑，不执行旧看板加载或字节不变测试（ADR-011）。

OUT：Agent 工作区浏览器标签与资料移交（T-43）；Browser 模块目录与 runtime、`src/host/desktop/browser-session*.ts` 删除（T-44，本票删完其 Home 消费者后执行）。

## 验收标准

- [ ] `AC-402`：当前格式新库无 Browser 入口、设置或命令；不验证旧设置兼容。

- [ ] `AC-403`：当前格式 Home/P1/RSS 链接与自动化“打开网址”使用系统浏览器，无 `BROWSER_OPEN` 或 `openIn` 旧字段消费者。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 外链 | DOM/单元 | `pnpm exec vitest run src/modules/home src/modules/automations src/app` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-42.md</Path>` |
| 看板格式 | 单元 | `pnpm exec vitest run src/modules/home/core/board` + `pnpm test:dashboard-isolation` | 通过 | 同上 |
| 编译/词典 | 构建 | `tsc` 两步 + `pnpm test:i18n` | 通过 | 同上 |
| 当前看板/设置 | 单元 + 夹具 | 只验证当前格式看板与设置解析、保存及链接打开 | 行为正确，模型不含被删字段 | 同上 |
| 残留 | 检索 | T-39 脚本检索 `WebPanel|webview|netease|music|homeSession|browser-session`（Home 范围） | 仅剩允许清单 | 同上 |

- **E2E disposition：** required：T-46 真实 Obsidian 中点击 Home 链接与自动化动作，截图记录系统浏览器调用（或其调用桩日志）。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

`compose-workbench.ts`、`manifests.ts`、`nav.ts`、`contracts/*`、`navigation-state.ts` 与 T-40 相同文件，依赖 T-40 串行。Home 词典只由 Lead 写入。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 本项目未正式发布，不对旧数据、旧 Profile、旧配置、旧布局提供保留、迁移、回读、兼容或字节不变验收（ADR-011）；当前格式的数据写入、隐私与权限安全仍须保证。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

Browser 入口与外链依赖清零；Home 网页嵌入分区与网易云音乐删除完毕，库内会话再无 Home 消费者；测试与词典检查通过；Browser 模块仅剩 Agent 集成（T-43）和自身目录、宿主会话代码（T-44）。

## 未决事项与风险

`openIn` 不再是现行看板字段；T-39 确认旧代码消费者可删除即可，无旧文件回写兼容要求（ADR-011）。

### 未决问题

DoR 重审条件：T-39 回读后确认最终写集、`openIn` 与 `web` 分区/`music` 字段的解析与保存行为；满足后 Lead 改为 ready。D-018 已由用户决定为删除（LOG-022）。

## D-018 修订（2026-11-02，LOG-022）

用户决定 Home 网页嵌入分区与网易云音乐（含库内会话）全部删除，本票承担其 Home 侧删除；`src/host/desktop/browser-session*.ts` 由 T-44 删除。新增依赖 T-41，使 `package.json` 的写入与 T-41 串行。状态仍为 draft（待实施），未开始实施。
