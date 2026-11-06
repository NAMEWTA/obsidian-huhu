# T12 四项复审修复回报

Session: 20261105T094057Z
Task: 083-repair-t12-review
Status: completed

## 聚焦交接

S01/P1、S02/P2、S03/P2、S04/P2 的四项已复现缺陷已修复并冻结，停止源代码与 fixture 写入，交回 Root 安排 high 独立双轴审查。completed 仅表示本次候选已交回，不表示 T12 done、最终66浏览器组合或真实宿主验收完成。没有委派、提交、暂存、改 index、创建 worktree、改正式状态/Evidence、改 shared/词典/theme/资产/构建输出或用户 vault。

实现者 native:/root/repair_t12，按既有 medium 实现授权执行。依据 083 TASK、081 不可变 REPORT、076 候选、当前 T12/Map28/Spec/Goal 与 DESIGN revision 3（digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）、UI-002、AGENTS/dev/ui/SpecDev I。未重启规划，未扩展第五项 finding。

## 产物与验证

### 固定源与实际起点

- 实际工作区 /home/wta/projects/obsidian-huhu，起点 HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957。
- 起点是实际 dirty 工作副本，非 Git HEAD：/tmp/huhu-t12-review-repair/baseline.json，保存 HEAD、全工作区 dirty/index 状态与原60 owned的模式/SHA/大小；baseline/ 保存原字节与模式。该60项逐项匹配076候选，无漂移。baseline.json SHA256 0170e7886f8e49551bfb4a3fb5dda4fb90a53fddc45ec07e40fbd746267bbd1b。
- 冻结完整候选：/tmp/huhu-t12-review-repair/candidate/；candidate-manifest.json 的61项覆盖原60项及必要新增测试。清单 SHA256 d52c831f280b004baca9f10debf8aacb9dff644f39508df7efecaeb483c4db35。
- 相对实际起点修改7项、新增1项、删除0项，模式无变更。changes.json 与 repair.patch 记录精确归属；原始代码/日志/JSON仅留在 /tmp/huhu-t12-review-repair。
- 本轮生产修改仅 GeneralSettings.tsx、appearance/AppearanceSettings.tsx、appearance/CustomColors.tsx、icons/ui/dialogs/rule-editor.tsx；相关3个既有DOM测试追加风险断言，新增 appearance-search.dom.test.tsx。其它原60文件保留在候选中，不把已有差异归入本次修复。
- Root14共享输入按 /tmp/huhu-t12-shared-final/manifest.json 逐项核对模式/字节，shared-verification.json：14项、drift=[]。本轮没有要求恢复 deriveCustomTokens。

### 四项真实反例与修复

S01/P1：CustomColors.write 的顶层 updater 改用语句块，丢弃嵌套 recipe 的返回值；SettingsStore 本身的合法 namespace replacement 协议不变。Reset、Copy-from 都只修改目标模式的颜色。

真实 AppearanceSettings + SettingsStore + themeSettings + 实际持久化 port 测试：初始化 ink/custom、source=obsidian、accent=plum、界面/正文/等宽字体、22字号、1.8行高、非默认 light/dark 全五色；两条动作均断言完整内存和持久化 ThemeSettings 仅目标light变化，另一dark及全部未改字段原值保留。Copy-from 加载生产 editor-schemes.css，使用真实 getComputedStyle 和 SuliWorld palette（含 rgba 的原读取行为），没有 mock update/normalize/computed color。颜色probe移除也有断言。未改颜色引擎或alpha协议，DOM控制不冒充真实浏览器色彩验收。

命令：pnpm exec vitest run --project dom src/app/settings/react/appearance/AppearanceSettings.dom.test.tsx -t 'custom (reset|copy)'。s01-red.log：2条完整namespace断言失败，退出126；最小修复后 s01-green.log：2/2，退出0。更早 URL fixture 初始化失败已修正，不计为目标红灯。

S02/P2：datetime 校验接受合法 HH:mm、HH:mm:ss、HH:mm:ss.S/SS/SSS 本地时间片段，维持严格日期及秒/范围校验；没有 IANA、epoch 转换或截断。日期组合原有时间片段的逻辑保持。

真实 compareDatetimes 与 RuleEditorContent 联合证明分钟、秒、毫秒三值均域有效；只改名称保存原值、改日期保存原时间精度、输入12:34:99仍禁用Save，并检查原规则隔离。原IME和非法日期测试保留。命令：pnpm exec vitest run --project dom src/modules/icons/ui/icons.dom.test.tsx -t 'existing local datetime'。s02-red.log：分钟正控制通过、秒/毫秒两项Save禁用断言失败，退出126；s02-green.log：3/3，退出0。

S03/P2：移除 AppearanceSettings 在 indexing 时强制展示三个条件分支的特殊条件。索引只返回当前真实可见的条件字段；实际editor/字体/语言值已经进入原cache signature，变化会重建。全部Tabs索引、模块能力过滤、跨plugin隔离与精确key规则不变；查询不修改持久化editor，也不添加假目标或空locator。

新增 appearance-search.dom.test.tsx 使用真实 SettingsStore、searchSettings、CategoryContent、SettingsPage、collectSettingRows 与 focus effect。follow下Background无结果且零写入；custom下在en/zh分别返回精确目标，真实页面实际row存在、scroll触发且ring-2高亮；回follow再次查询无悬空结果，查询无额外持久化。仅MarkdownRenderer宿主预览沿既有测试边界隔离，预览生命周期另有原测试覆盖。命令：pnpm exec vitest run --project dom src/app/settings/react/appearance-search.dom.test.tsx。s03-red.log：follow下错误返回Background，退出126；s03-green.log：1/1，退出0。

S04/P2：General增加持续失败说明中的显式Retry。普通app设置Retry执行无修改update，持久化最新已publish内存；不重放toggle recipe。module/language保留其显式目标动作。操作计数维护pending，序号防止旧失败覆盖更新操作；原先已可交互的分段选择在pending期间仍接受用户新值，取消原run的静默丢弃。unmount后不调用迟到action或更新UI回执。

真实SettingsStore/IO失败反例分三项：单toggle publish=false/disk旧值→失败→Retry后磁盘false；首写pending期间选择remaining，真实后续写也失败后Retry持久化false+remaining；Retry持久化pending期间关闭，完成后正确落盘、无额外保存/迟到alert。IO用明确barrier控制，不依赖随机等待或mock store。Store原有后续批次协议未改；初版测试把第二次待写当作retry的harness假设已纠正，不计为产品finding。

最终测试对076真实General源回放红灯：临时换回baseline原字节，s04-baseline-red.log三项失败（单toggle缺Retry、pending选择被丢弃）；退出126。finally恢复本候选并核对 SHA256 1b7e6974ec0ce7454c615b5674205f55c71561ae637d98d3c8ad9154d125c5cb。命令：pnpm exec vitest run --project dom src/app/settings/react/GeneralSettings.dom.test.tsx -t 'real General failure'。修复后完整同文件 s04-green.log：7/7，退出0，原模块开关双语/失败恢复等4项保留。

### 最终验证与边界

- pnpm exec vitest run src/app/settings src/modules/icons src/app/workbench/settings-page.dom.test.tsx src/theme：regression-final.log，27文件131/131通过，退出0。包含原81 settings/icons、原41 theme及新增9项，没有删减风险断言或放宽oracle。较早regression.log在IO fixture修正前有两项失败，已保留，不能覆盖作绿色证据。
- 40个实际由ESLint配置纳管的owned生产TS/TSX（精确列表lint-files.json）：pnpm exec eslint --max-warnings 0 <该列表>，lint-production.log，退出0、零警告。首次把配置默认忽略的测试/fixture显式传入产生19条ignored warning，退出126；已改为实际纳管范围，未关闭规则或伪称被忽略文件通过lint。测试由Vitest和test TypeScript覆盖。
- pnpm exec tsc --noEmit --pretty false --skipLibCheck -p tsconfig.test.json：types.log/types-result.json，全图退出126、267条外票诊断，本61 owned路径诊断0。全图依旧不通过，未吞错；构建/其它票类型债由Root集成处理。
- node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-12 --matrix redesign --out /tmp/huhu-t12-review-repair/ui-check --check：退出0，真实fixture preflight、0 matrix cases。fixture本轮字节未改，仍为实际生产组件。
- git diff --check：diff-check.log，退出0。
- 本次是交互/存储/输入验证修复，没有CSS、主题token、导入边界或产物改动；不重复已有效的架构/CSS/runner证据。完整build/lint、main.js/styles.css、最终66浏览器组合、真实Obsidian主窗/popout与正文实际渲染/像素/44命中验收仍归Root，未在worker执行。

### Design Conformance

继续绑定批准DESIGN3/UI-002的settings、UX-SET-1/2，保留原设置分组和条件控制。搜索诚实反映当前实际字段、保存失败有恢复路径、独立正文配色与合法领域精度不丢失；未新增设计模式、假设置、颜色引擎或存储事务。DOM与编译预检只证明上述接缝，不证明视觉和原生宿主验收。

## 问题与下一步

Root以此61 owned候选与原14 shared候选冻结 high 独立双轴复审，优先复核完整namespace保留、秒精度、真实精确目标与幂等Retry。后续改动用新派遣和新候选，不覆盖本REPORT或076/081报告。Root若需后续about共享预算接缝，应在本冻结之后独立精确replan并使相应旧证据失效；本轮没有纳入该未应用改动。

Root维护正式Evidence、状态、构建产物、浏览器66组合及真实宿主验收。当前没有其它待修复的本次已确认finding；不能据本回报宣称T12或G-MODULES完成。worker已停止源码与fixture写入，待独立审查。
