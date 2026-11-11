# 共享预算最小候选

Session: 20261105T094057Z
Task: 085-propose-shared-budgets
Status: completed

## 聚焦交接

已交回可应用的私有候选，仓库源码、冻结 T05/T16、Root shared/构建资产均未写入；本 REPORT 是唯一仓库写入。候选使用既有 fflate 标准 gzip，只压缩原来已动态导入的两个 Iconic JSON，另把确认为 UI 专用的 265 个双语键移到实际 UI 加载入口。未改预算、业务行为、源 JSON、许可或 pinned upstream oracle。候选实际 esbuild 元图与原 checker 均已执行，下面数值只属于私有快照实验，不宣告正式 Ticket/预算验收通过；Root 精确 replan、应用、独立 high 与宿主验收后负责正式结论。

## 产物与验证

### 产物与精确影响

全部过程材料在 /tmp/huhu-shared-budget-proposal。

- candidate.patch：26 文件、103391 bytes，可用 git apply；在当前共享仓库执行 git apply --check 退出 0，未应用。
- scope-files.txt：准确增改路径；patch-manifest.json：每个路径 baseline/candidate SHA-256，供 Root 确认并行变动后是否需要重做局部 hunk。
- base/、candidate/：私有完整 src/scripts/docs 输入快照；node_modules 只读复用仓库依赖。base/meta.json、candidate/meta.json 是真实生产 esbuild 输出元图；两目录 main.js 只是私有 build 产物。
- measure.mjs、graph.mjs、compare-dictionaries.mjs、verify-budget-shape.mjs、split-facts.json、dynamic-keys.txt：可复现脚本及逐键/动态调用来源；不入库。

需 Root 增 scope 的准确写集：

1. package.json（新增 test:iconic-resources runner），scripts/esbuild-options.mjs，新增 scripts/iconic-resources.mjs / iconic-resources.test.mjs，scripts/module-strings.ts / verify-i18n.mjs。
2. src/shared/i18n/huhu.ts；新增 src/shared/i18n/lazy/huhu-ui.ts；src/app/settings/react/CategoryContent.tsx。未改 GeneralSettings 或 BuiltInSettings 实现。
3. 新增 src/modules/icons/platform/utils/compressed-resource.ts。resource-utils.ts、两个 JSON、NOTICE、fixture/oracle 均未改。
4. agent/i18n.ts、新增 agent/ui/i18n.ts，agent/ui/settings-page.tsx / workbench-page.ts。
5. navigator/i18n.ts、新增 navigator/ui/i18n.ts，navigator/ui/settings-page.tsx。未碰 diary/page-flip.mjs 等冻结 T05 页面。
6. task/i18n.ts、新增 task/ui/i18n.ts，task/ui/workbench-page.tsx。
7. versioning/i18n.ts、新增 versioning/ui/i18n.ts，versioning/ui/settings-page.tsx / workbench-page.ts / history/history-panel-page.tsx / history/review-page.tsx。diff/、language-policy、Worker、既有 compressed-asset.ts 等 082/T16 源均未改；diffMessages/historyMessages 导出保留。

实际调用与依赖：Iconic resource-utils.ts 原 Promise.all 两动态 import 不变；esbuild onLoad 在原物理 JSON path 返回传输包装，默认 JSON.parse 对象只在该动态模块首次求值时创建。gzip 由 node:zlib 构建生成、fflate 解码，依赖沿原资源动态边界到达；metafile 仍含两个原物理 JSON。源 pin 使用既有 upstream-1.1.10.json 同值，按既有 oracle 的 CRLF→LF 规则校验；传输 JSON.stringify 保持 LF/CRLF 检出产物一致。未知名、变更源、坏 gzip 失败传播。参考沿 Map28 reuse-decision.md 与 fflate 0.8.3 官方源码：https://github.com/101arrowz/fflate/tree/v0.8.3；未自写 codec。

### 词典覆盖与真正 UI 边界

先检查实际 activation 闭包及所有模块非 UI 源（包括服务、命令、API、平台与错误 key 字段），从字面量、模板 prefix、nameKey/titleKey 和真实 activation UI 中排除必须保留的键，最后只选择下列小前缀。详细原始调用在 dynamic-keys.txt；split-facts.json 保存非 UI 文件、保留与候选键集合。

- agent：821 = 686 activation + 135 UI；只移动 agent.manage.*、agent.settings.*、agent.skills.* 中无非 UI 消费的键。agent.usage.status.*、historyUI.source.*、activity.*、historyResume.error.*、delivery.*、connection.*、workspace.cmd.*、workspace.moveReason.* 以及服务错误 messageKey/启动 SpaceForm 等所需字面量保留。settings-page 和 workbench-page 都在真实 UI 入口注册，后者覆盖 Sidebar/history 内少数 manage 键。
- navigator：408 = 401 + 7；只移动 navigator.setting.profile*。profileDefault、运行时命令与 periodOff/calendarUnified 动态错误键保留；仅 settings-page 注册。
- task：118 = 106 + 12；只移动 task.error.*，其调用在 UI 错误呈现链；服务仍返回领域错误 code，未改该语义。仅 workbench-page 注册，也覆盖该真实入口重新导出的 editTask/mountTasks。
- versioning：510 = 445 + 65；只移动 sync.settings.* 与 versioning.compare.*。sync.error.*、step/stepName/action/squash 动态键、versioning.restore.* 与服务/命令/启动冲突扩展所需键保留。settings、workbench、review、history-panel 各实际 UI 入口注册。
- huhu：66 = 20 + 46；about.* 与 modules.*Desc 在真实 CategoryContent 入口注册。intro、模块标题、启停/禁用通知保留启动。about.f.${key}/Desc 动态族全部搬运；GeneralSettings 按 manifest.descriptionKey 读取描述时，CategoryContent 已完成同步注册。设置搜索仍由原 buildSettingsIndex 实际渲染 CategoryContent/模块设置页，不另建索引。

运行时 registerMessages 仍只合并、不注销；语言、多个 owner、重复 UI import 和模块 entry 重载不删除已有词。没有把键搬到其他 activation 文件或在 activate 中 await import 假懒加载。scripts/module-strings.ts 为脱离入口的测试注册 UI 集合，verify-i18n.mjs 扫描新增 ui/i18n.ts；未改文案/namespace。

### 真实元图（bytes）

| 项 | base | candidate | 差值 | 原阈值 | 私有余量 |
|---|---:|---:|---:|---:|---:|
| main.js | 8389060 | 8184382 | -204678 | 8252416 | 68034 |
| eager | 140746 | 133427 | -7319 | 135168 | 1741 |
| agent activation | 1400175 | 1383010 | -17165 | 1385472 | 2462 |
| navigator activation | 204578 | 203537 | -1041 | 203776 | 239 |
| task activation | 169192 | 167468 | -1724 | 167936 | 468 |
| versioning activation | 204516 | 194483 | -10033 | 195584 | 1101 |

其余 activation 数值与 base 完全一致；icons 157454→157456（+2，是压缩传输引起 bundle 符号变化，fflate 未进入其 activation）。fflate 真实输出 4947 bytes，eager 及所有 module activation 闭包中均无 fflate。两个真实资源 output：lucide-keywords.json 162073→51713；emojis.json 150265→55465。没有改变 forbiddenEagerAreas 或 checker 规则。

### 已运行

- node measure.mjs base/candidate：退出 0，真实生产 pluginBuildOptions/esbuild，write:false+metafile，私有保存 output。原 node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json 私有报告：退出 0；check-bundle.log 与 check-bundle-report.json 保存原工具结果。第一次因私有快照未复制 styles.css 失败，补入只读复制的当前 styles.css 后退出 0，不改样式。
- node --test scripts/iconic-resources.test.mjs：退出 0，2/2。真实压缩插件打包并执行原 loadResourceData 动态导入，逐值比对两个源 JSON；并发/重复 import 默认数组 identity、嵌套可变性、Unicode、物理输入、坏 gzip、未知/变更源拒绝与 LF/CRLF 结果一致。
- 私有 vitest-boundary.config.mjs（无 module-strings 自动预载）：退出 0，5 文件/5 测试。实际 module.ts import 后 UI 键尚不可用，实际 UI entry import 后对应全部 en/zh 词条可用，切语言与重复入口 import 保留词条；另检查 huhu 启动/真实 CategoryContent 边界。最初标准 obsidian-stub 自动 import module-strings 导致时序测试污染，私有 obsidian-boundary-stub 只去除这一预载行后才取得有效 5/5；没有 mock 词典注册或加载函数。boundary-tests.log 与私有测试源码保留。
- 定向 DOM 第一组：4 文件/29 测试退出 0（BuiltInSettings、settings-search-index、task UI 等）；最终设置/入口回归第二组：7 文件/33 测试退出 0（versioning sync、agent settings、navigator settings、settings-search-index）；见 dom-tests.log、settings-tests.log。
- compare-dictionaries.mjs：退出 0；五组 base 完整 en/zh 集合与 candidate activation+UI 合并逐键、逐字节字符串严格相等且两部分无重叠；字符串相等包含所有占位符不变。dictionary-comparison.log 保存计数。
- node scripts/verify-i18n.mjs：退出 0，38 dictionaries / 5601 keys，双语/占位符/字面 key 完整。
- node scripts/verify-architecture.mjs：退出 0，1397 modules，无区间/宿主/桌面/barrel/cycle 违规。
- 对新增/拆分的 TS 词典与 Iconic helper 跑 ESLint --max-warnings 0：退出 0，lint.log 为空。
- verify-budget-shape.mjs：退出 0，断言 fflate 不在 eager 或任何 activation 闭包，未受影响模块尺寸精确相等。
- git apply --check candidate.patch：退出 0，未实际写源或 index。

## 问题与下一步

1. Root 先核对 083/084 冻结与 scope-files/patch-manifest，精确 replan 后统一应用；当前所有 patch hunk 在共享仓库可应用。navigator 仅余 239 bytes、task 468 bytes，不应把私有数值当作最终全集成结果；Root 应在实际最终源码重建元图。
2. 原 pnpm build 所需 tsc 当前不能通过：私有 base 与 candidate 各有 277 行 TypeScript diagnostics（旧 Button variant/size API、TaskEditor return 等）；去掉诊断行号后完全相同，唯一行号差是 navigator settings-page 新增 import。test tsc 也有既存旧接口及 test/sync/git-hunk-newlines.test.ts 的 diff-model 路径错误。因此未声称完整 pnpm build/全量 lint/test:all 通过；Root 在 083 共享修复集成后运行完整门禁。过程日志：base-typecheck.log、typecheck.log、test-typecheck.log。
3. 私有候选不含 UI 时序探针配置/修改过的 stub；这些只供复验，不能把自动预载词典的默认 DOM 环境作为懒加载时序证据。生产 patch 内带资源测试及 package runner。未执行真实 Obsidian、多 owner 实际模块 activate/dispose/重新启用或跨窗口像素验收；Root 的最终宿主回归继续覆盖它们。
4. 开发规则目前写模块全部词典在 module.ts 注册。建议 Root 同步在 .agents/skills/dev/SKILL.md 规则 7 及 references/settings-and-i18n.md 词典表中明确“非 UI 键在 module.ts，纯 UI 键在实际 UI entry，测试集中注册”，并更新 docs/development.md 构建资产压缩事实（若该处描述范围需要）。这 2–3 份规范/文档修改未夹入本候选；应在 Root 精确 scope 中决策。无需提高阈值、删除功能、迁移持久数据或重写恢复事务。
