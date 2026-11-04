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

## 第二轮
- 删除退役集成 ticktick/weread：`DashboardSettings` 的 `ticktick*`/`wereadApiKey`/`wereadImportPath` 及 settings.ts 的归一化与设备凭据 pick 逻辑；`TickTickConfig`/`WereadConfig`/`WereadWidget` 类型、`parseTickTickConfig`/`parseWereadConfig`、parse.ts 序列化、syntax.ts 分区类型、generate-default-markdown.ts 字段、`SyncEngine.updateWereadConfig`、Section.tsx“集成已停用”占位、card-kind 的 `weread`；i18n 286 个键（`ticktick.*`、`weread.*`、`settings.ticktick*/weread*`、`home.integrationRetired*`、`home.dashboard.section.ticktick/weread`，en/zh 同删）。
- `WEREAD_HIGHLIGHTS_ROOT`、`VISIBLE_NAMES.weread`、`DEFAULT_HIGHLIGHT_IMPORT_PATH` 仅被已删的 `wereadImportPath` 使用（评论高亮导出用的是 `VISIBLE_NAMES.highlights`，保留），一并删除；`scripts/regressions/issue-content-targets.mjs` 同步。
- 行为：看板里的 `type: weread/ticktick` 分区及其配置文本不再解析，按未知配置走现有 preserve-document 路径——未编辑时字节不变，其他编辑后配置文本仍保留（已用临时用例验证，用例已删除）。
- 测试/黄金样本：改写 p2.test、user-formats.test 及 `board-p2.md` 快照（只留 RSS）、section-bodies、service-settings、widget-members、appearance-presets（用 `memoSavePath` 代替旧凭据字段做“不复制”断言）；删除退役分区用例。
- 脚本：`home-d2b-fixture.mjs` 删 Weread/TickTick 夹具；`home-grid.mjs` 默认成员改为 `calendar, clock, pomodoro, usage, quick-actions, tasks`，原 `widget:weather` 的拖拽目标/尺寸菜单改为 `widget:quickActions` / `widget:clock`（未在真实 Obsidian 运行）。
- NOTICE 删除 `board-codec.ts: coarse-height conversion` 行；apex-dashboard.md 删 weread/ticktick 映射行；dashboard.md 删“已停用的第三方集成”节与设置描述；sync.md、dev 技能 architecture.md 去掉微信读书/滴答旧凭据与路径描述。
- 验证：两个 tsc 0 错误；改动源文件 eslint 0 警告；vitest home+golden 468 通过，仅 `library.dom.test` 的性能超时用例失败（同前，与本改动无关）；`test:dashboard-isolation`、`test:weather-mapping`、`test:i18n`（5292 键）、`test:docs`、`check:notices` 均退出码 0。
- 注意：设备配置文件里可能残留旧凭据字段，已无代码读取；是否需要主动清理由 Lead 决定（不属于兼容逻辑，故未新写）。

## Lead 补充（第二轮后）

审查发现 `normalizeDashboardSettings` 以 `...raw` 保留全部未知字段，而 `domainSettings.pick` 保存整个值：旧设置文件中残留的 `ticktickCookie`/`wereadApiKey` 等凭据会被写回库内设置（随 Git 同步）。修复：只保留当前字段（defaults 键 + 无默认值的可选键）。新增 `core/board/settings.test.ts`（修复前红：仍含 ticktickCookie），home 97 文件 448 例通过。这是当前格式的字段收窄，不是兼容逻辑。

## 第三轮
- LibraryConfig 去掉 `templatePath` 单值镜像：只读写 `templatePaths`（types/model.ts、parse.ts 写入、extract-card-parts.ts 读取、SectionOptions/LibrarySection）；`templateChoices` 简化为仅去空去重（单参数）。快捷按钮 `templatePath`、`preset.templatePath`、library-new-note 未动。旧文件里的 `templatePath:` 键现按普通未知字段原样保留，不再被读成模板。
- pipeline/codec.ts：删除 `templatePath` 回退、`sortBy: 'ctime'` 映射、单数 `filter:{dim,value}` 旧形态，只认 `templatePaths`/当前 `sortBy`/`filters`。
- alltasks-scan.ts：“reminder-only task”是当前仍可创建的仅提醒任务，保留逻辑，注释去掉 legacy。
- 测试/样本：multi-note-templates、home-grid、library.dom、golden user-formats 及 `board-multi-templates.md` 快照、`scripts/verify-library-new-note.ts` 同步改为 `templatePaths`。文档中无 `templatePath` 单值描述，无需改。
- 验证：`tsc -p tsconfig.test.json` 0 错误；主 tsc 仅剩 agent 区他人在途错误（`agent/services/backup/records.ts`），home 无错误；vitest home+golden 101 文件/470 用例全过；eslint 改动文件 0 警告；`test:dashboard-isolation`、`test:i18n`、`test:docs` 退出码 0。
