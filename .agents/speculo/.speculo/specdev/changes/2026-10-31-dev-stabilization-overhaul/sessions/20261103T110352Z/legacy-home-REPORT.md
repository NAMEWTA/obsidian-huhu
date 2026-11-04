# legacy-home 报告（home + comments + icons + navigator）

## 删除/改写
- 删除文件：`home/platform/board/widget-migration.ts`（+测试）、`home/core/board/clock-weather.ts`（+测试）、`home/services/board-conversion.dom.test.tsx`。
- home 看板：去掉旧看板转 grid（`convertToGrid`/`needsGridConversion`/`convertOldBoard`）、退役 widget 替换（`replaceRetiredWidgets`，quickCapture）、旧 widget 合并迁移（备忘/网页卡入收件箱、weather 并入 clock）、`retireLegacyKeys`、`readLegacyTiles`/`LegacyTile`/`convertLegacyItem`、`widgetMigration`/`legacyTiles`/`gridPacked`、`legacyWidgetMembers`/`readLegacyMembers`/`legacyFlagMembers`、`RETIRED_KEYS` 设置清理、`quickNotesEnabled`、`freezeLegacyWeatherLocations`、`weather` kind 兼容、`home.migration.*` 词典键、SyncEngine 构造参数 `widgetDefaults`。`legacyWeatherLocation` 改名 `defaultWeatherLocation`（设置里的默认城市，仍是现行功能）。
- comments：删除 v2->v3 迁移（`migrateV2`/`backupV2`/`comments-backups`）、v1 legacy 只读路径（`legacyData`/`legacyPaths`/面板提示/词典键 `editor.comments.legacy`）、`normalizeThread` 的 version 分支；仅接受 v3。
- 测试：删除/改写只验证旧数据的用例（canvas、board-codec、grid、widget-members、board-tiles、settings、comments、highlights、board-canvas-switch、time-widgets、weather-store、board-repairs 夹具）。
- 脚本：`verify-card-move.ts`、`home-grid.mjs`（删旧看板转换验收段）、`workspace-refinement.mjs`（去 `widgetMigration`）。
- 文档：docs/dashboard.md、data.md、comments.md、highlights-implementation.md、third-party/margin-comments.md、third-party/apex-dashboard.md、.agents/skills/dev/references/editor-comments.md。

## 行为变化
- 无 `grid:` 的看板：不转换、不写回，内存按默认尺寸排布，首次调整布局才写入；`immersive/banner/layout/canvas/widgetMigration` 等键当作普通未知字段原样保留。
- `weather` kind 成员不再识别；时钟缺 `weather` 字段显示“选择地区”，不再回退全局城市。
- 评论：非 v3 的 index/pending/sidecar 走现有损坏路径（移入 `set-aside/` 并报错，不覆盖、不迁移）。

## 保留（逐项判断）
- 评论 `legacy` 颜色 id（表示无颜色，仍可被读写）、`documentHash` 可选（缺失即保守脱离）。
- `templatePath` 单模板镜像（当前格式仍同时写 `templatePath`/`templatePaths`）；卡片 `gcol/grow`（当前写入）。
- navigator IndexedDB `CACHE_VERSION`（可丢弃缓存，版本不符即重建）；icons 中 Iconize/Ribbon Divider/Tag Wrangler 等是第三方插件互通，非旧数据。
- `alltasks-scan` 的“reminder-only”注释、`preserve-document` 缺 id 卡片处理（手写卡片仍有效）、`board-backups` 注释。

## 未处理（需 Lead 决定）
- 退役集成 ticktick/weread：设置字段、`ticktickConfig/wereadConfig` 解析序列化、Section 占位“集成已停用”，牵涉面大且影响看板往返，未动。
- `ARCHIVE_PATHS.migrations`（recent-doc-policy 引用，属 archives 区）；根 `NOTICE` 第 24 行仍列 `board-codec.ts` 粗高度换算（该代码已删，应删条目）。
- `home-grid.mjs` 中 `widget:weather` 引用为既有残留，未验证。

## 验证
- `tsc -noEmit -skipLibCheck`、`tsc -p tsconfig.test.json`：0 错误。
- eslint（改动的非测试源文件，测试文件被忽略）：0 警告。
- vitest comments+icons+navigator+golden：通过（2 个性能/时序用例在高负载下偶发失败，单独重跑通过）；home：449 通过，`library.dom.test` 的 “grouped library reveals fifty…” 25s 超时（性能用例，与本改动无关，改动前同样失败）。
- `test:dashboard-isolation`、`test:weather-mapping`、`test:i18n`、`test:docs`：退出码 0。
- 未运行 build、real-Obsidian 验收。
