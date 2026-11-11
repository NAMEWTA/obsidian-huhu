# 任务回报

Session: 20261105T094057Z
Task: 081-review-t12-settings
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high独立角色；非076或Root14作者，没有实施或委派。**standards：request-changes；specification：request-changes。** 确认4项：S01/P1自定义色局部重置实际覆盖并持久化整个外观命名空间；S02/P2既有合法含秒本地datetime被新校验阻止保存；S03/P2条件外观字段搜索产生无法定位的目标；S04/P2General真实保存失败缺少显式Retry。

**明确释放076的60项及Root的14项review输入冻结，供各owner修复。** 开始、结束及报告回读时74项原字节/模式一致，drift=[]。仓库只写本不可变REPORT；代码、日志、清单和快照仅在/tmp/huhu-t12-high-review。未改源码、配置、资产、依赖、Git/index、正式状态或Evidence。原076报告不变；T09/T05等活跃写集和全局预算调整不在审查候选。

81项既有设置/图标测试、41项theme测试、6项runner测试均独立通过，Root两行Iconic oracle修正已实际包含并通过；它们没有覆盖本次4个实际反例。没有据DOM或编译预检宣称最终66、像素/命中、正文实际渲染、Obsidian popout或资产验收通过。

## 产物与验证

### 固定输入、实际基线与来源

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。真实派遣为081 TASK及Lead消息；dispatch校验只证明结构，不代替身份、授权或实际完成。

076最终REPORT SHA256 c41f42ebd1e9ac5a0ee3cdbbfdc2c62381fcde6bd288c7513e269bb9e24a5e6f已回读。其/tmp/huhu-t12-implementation/candidate-manifest.json SHA256 **ec83c9921b66eee40a538cfb2bedf5b3f5a82c225a099cdc71e91f70f44f21bd**，60 owned逐字/模式匹配candidate副本与当前源。真实baseline为baseline.json及baseline/的57项，清单SHA256 **b159bae828b62d4f5afa1fc047848acfbed27cac13ca2b8b3994f546bcc1f307**，其副本逐项hash无漂移。准确增删是修改27、新增3、未变30、删除0；“30改动”包含3新增，不是30个既有文件修改。新增为两个T12 fixture和InterfacePreview；没有拿HEAD或整个dirty/index状态推断本次贡献。

完整owned范围是app/settings全目录、app/workbench/settings-categories及既有settings-page/测试、icons/ui全目录及host-icons.css、T12两fixture。检查实际入口、字段/动作、服务边界和全部生产差异；未改的settings schema/runtime/language/module-switch、行提取/精确跳转、Iconic manager与资源/规则接口作为调用上下文复核，没有另造一套模块设置或数据仓库。

Root14清单/tmp/huhu-t12-shared-final/manifest.json SHA256 **b9b99c61d09247380d120995a2876eee06a8b36cf814f07b85eb7d9cb4a329b0**，逐项匹配frozen/和当前字节/模式：theme/custom与测试、settings与测试、runtime.dom测试、editor-schemes.css、editor-presets测试；appearance/icons词典、iconic-port测试；SettingsFormControls；runner/run.test；obsidian-stub。

共享比较优先使用/tmp/huhu-t12-custom-editor-seam/before及runner-before.mjs实际字节。editor-presets.test没有该before副本，另定位真正T01保存文件/tmp/huhu-t01-frozen-snapshot/src/theme/editor-presets.test.ts，SHA256 **94d2d2ecdbe67648c59b3e9646bb61e74bfaa83c300daf8cd63a4c7d0e399353**，与005当时review清单一致；实际仅增加动态token全集验证并将custom排除出静态palette集合，原静态/对比度断言保留，不能因HEAD没有此文件就称本轮新增。run.test的T01历史字节仅作更早上下文（非本轮完整起点）；icons/i18n缺完整before副本时审完整候选及pinned oracle，不伪称新增692行。上述baseline限制不妨碍对固定源和具体行为审查，但不夸称全部14项的历史变更归属已完整重建。

自有74项快照candidate/及manifest.json SHA256 **73c376e23030f5374d2762a05f2ced4acc231e84c6b0c61997e699b2fec42bab**；实际差异/前后hash在diffs/、changes.json，后者SHA256 **3c35c44c109217d75b80cb115803ac1808248ea3c1b7aaf294a2510cf2f08f74**。final-verification.json核对74项及模式无漂移；这不是全工作区clean或浏览器全依赖图固定证明。

标准来源：AGENTS、dev及settings/i18n、ui及theme/design-system/motion-a11y、公共独立review/risk合同。规范来源：当前Map27/Goal/Spec/T12及批准DESIGN3/UI-002，七份文档私有保存authority/，清单SHA256 **6cd0096852ae907d93203c98838bce1344f9b8c550dde57b6feb6f4080f800f3**。批准摘要仍为49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。Map24–27的精确共享接缝没有改变DAG、预算、领域格式或批准设计；Map27的T09终端默认不在本报告写集或结论内。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes
Findings: S01/P1, S02/P2, S03/P2, S04/P2

**S01/P1 — “重置自定义色”把嵌套颜色对象当成整个ThemeSettings替换并持久化。**

位置：src/app/settings/react/appearance/CustomColors.tsx:69–70、86、138；真实消费者语义在src/shared/settings/store.ts:140–147。write把recipe(draft.custom[mode])的运行时返回值直接作为顶层update返回。Reset和Copy-from的recipe均返回Object.assign生成的嵌套CustomColors对象；SettingsStore把非undefined返回当成完整namespace替换。themeSettings.normalize收到仅5颜色键，因而把所有其它字段及两个custom模式恢复默认。

实际生产UI/SettingsStore反例：初值preset=ink、editor=custom、fontSize22、light.background=#123456、dark.primary=#ff0000；只点击“Reset custom colors”行的Use default，结果preset=system、editor=follow、fontSize0、dark.primary=#d0d0d6，且实际持久化port里的diskPreset也变system。用户明确只重置当前颜色，却丢失并保存了无关外观/字体和另一模式设置，故为P1。Copy-from也调用同一返回Object.assign的write路径，源级同因；本实际完整持久化反例针对Reset，不冒称真实浏览器复制色已验收。

证据：settings-boundaries.dom.test.tsx及counters-settled.log的CUSTOM_RESET；真实SettingsStore、themeSettings、SettingsPage、Appearance/CustomColors。只mock无关Reading preview（与作者对应测试一致），没有mock存储recipe/规范化/颜色编辑。helper代码在076实际baseline已存在，但本次重新提供可达的editor=custom能力后必须满足保留其它用户设置；不是T09或全局类型债。

满足条件：顶层updater必须明确保留完整ThemeSettings且丢弃嵌套recipe的返回值；仅修改指定mode的指定颜色。覆盖真实Store的Reset及Copy-from，验证preset/editor/source/accent/字体字号和另一模式颜色不变、正确持久化；不修改SettingsStore的合法返回替换语义或新增事务。复制真实计算色还须在浏览器对照原palette；本轮CSS复制调试因上述整体reset先发生，未作为额外已验证finding。

**S02/P2 — 新HH:mm-only校验禁止保存已有合法的含秒local datetime。**

位置：src/modules/icons/ui/dialogs/rule-editor.tsx:96–105、263、393–400。新validConditionValue对datetime的time片段只接受HH:mm。现有域compareDatetimes实际接受2026-11-06T12:34:56，并按原Iconic语义比较到分钟；原UI的datetime-local可保留此本地值且保存没有新拒绝。现在打开这样的已有规则，Save直接disabled，用户连只改规则名称也无法保存，必须手动删原值的秒。

证据：rule-precision.dom.test.tsx，直接调用生产compareDatetimes证明分钟/含秒两值均域有效；生产RuleEditorContent对分钟正控制通过，对含秒失败。使用实际076 baseline/rule-editor.tsx通过私有Vite load返回，同一两测试均通过（rule-before.log），确认新校验回归，非伪造新领域格式。外部controller查询/保存端口只提供界面数据，不替换被测校验或域函数。

满足条件：保留当前领域/既有local datetime可表达的合法精度和未编辑原值，包括秒；非法raw仍阻止保存，分钟/空值原合同、IME和DateField组合继续保留。不截断或归一化用户的既有条件，不发明IANA/epoch，不改变域比较器。

**S03/P2 — 条件字段被强行索引，返回的focusId在目标页面不存在。**

位置：src/app/settings/react/appearance/AppearanceSettings.tsx:282–293（及同类indexing条件）、settings-search-index.tsx:128–153；use-setting-focus.ts:21–40只寻找实际row。索引context使CustomColors在editor=follow时也渲染，但跳转的正常页面仍按实际editor隐藏；目标只带category/tab/focusId，没有揭示条件字段的UI状态。MutationObserver最终超时，没有目标可高亮。

真实反例：默认editor=follow，用生产searchSettings搜索自定义Background，得到focusId“|Background|0”；按该target渲染实际SettingsPage，collectSettingRows没有该key。显式选custom后同一key立即存在，配对控制证明字段本身和key匹配有效，不是缺词典或测试selector。证据settings-boundaries.dom.test.tsx及SEARCH_CONDITION：presentBefore=false、presentAfter=true。此路径没有mock索引、CategoryContent、SettingsPage或row/focus算法；仅隔离Reading preview宿主renderer，因为通用DOM stub的Component无load，不能把那项harness失败当产品缺陷。

满足条件：每个实际返回的搜索目标都有可达且明确的显示/定位路径；可携带仅UI展示状态或诚实处理当前不可用字段，不能暗中改变用户保存的editor来使跳转成功。条件/字体模式变化应使索引和目标一致，保留跨plugin隔离、tab跳转和精确高亮。不要仅延长8秒timeout或删目标断言换绿。

**S04/P2 — General的真实publish-before-persist失败没有显式重试路径。**

位置：src/app/settings/react/GeneralSettings.tsx:39–57、69–75。run只保留错误字符串，不保留可重试的目标/操作。真实appSettings.update会先publish，再持久化；状态栏开关失败后界面已显示新状态，错误文字存在，但没有Retry，不能重新提交同一目标而不先反向切换一次。

证据：真实SettingsStore/appSchema/GeneralSettings，切Show Usage后注入外部save失败；GENERAL_FAILURE为memory=false、disk={}（仍默认显示）、retry=false。无失败的配对控制确认同一UI正常写入false且无错误。原模块开关fake测试模拟先拒绝再publish，不能代表这个真实port路径。该缺口在076 baseline已有；此完整T12合同明确要求失败草稿与显式Retry，所以作为保留能力缺口报告，不归因为本次新引入。

满足条件：显示诚实错误并允许把保留的当前目标再次持久化，成功后清错误。**不能盲目重放toggle recipe**：它在已publish的memory上再次取反会恢复错误方向；应重试幂等目标/当前保留值。语言、模块apply和appSettings各用其真实端口语义，不能伪造Store磁盘回滚或扩展事务。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes
Findings: V01/P1（S01）, V02/P2（S02）, V03/P2（S03）, V04/P2（S04）

- V01：T12与DESIGN §7的独立正文custom/字体保留和局部操作范围不满足；S01把当前模式颜色重置扩大成整个外观数据覆盖。Root新增custom公开端口本身没有授权这种副作用。
- V02：T12“图标领域逻辑/格式/upstream保真、保留原有功能”不满足；S02用UI新校验缩小既有域可接受local datetime精度。修复只需保留真实值合同，不扩大业务格式。
- V03：Spec AC-112/114及T12“实际模块字段搜索索引与精确定位”不满足；S03返回当前页面没有的row，正向搜索数目增加不等于可达跳转。
- V04：T12 Map24真实失败/保留草稿/显式Retry条款不完整；Appearance和Iconic已有Retry不证明General原始appSettings更新也覆盖。S04不要求回滚已publish内存或重写Store。

其余有界审查结论：

- 分类使用真实moduleEnabled与manifest.platforms.mobile，禁用/桌面专用模块过滤；General保留真实语言/模块/内容入口/八状态栏项及usage偏好。SettingsSurface对已禁用分类退回general，module loader旧结果由effect owner和loader身份隔离。WeakMap修复跨plugin缓存，app/theme值、语言和模块状态参与失效；真实tab行提取/跳转测试通过。上述不取消S03。
- 外观完整保留system/paper/ink、source、6 accent、uiSize/density/motion、独立界面/正文/mono字体、字号行高及全部实际editor schemes/SuliWorld设置。parseExport只接受当前kind/version2和合法preset/editor，明确删除v1，不恢复旧UI palette/deriveCustomTokens或新增兼容别名；独立导入/往返测试通过。S01/S02不是靠改schema解决。
- 局部InterfacePreview没有settings handle，日期/Popover局部state且Portal位于预览根；Reading预览保持禁脚本、CSP/固定内容、所属Document样式和显式字体复制，清理renderer/监听器，不写宿主body palette。当前真实MarkdownRenderer/CodeMirror/浏览器计算色仍属宿主/视觉门，stub文本或DOM不证明它们。
- Appearance使用真实publish-before-persist语义，操作序号保护晚到错误，unmount防止迟到clipboard导入；真实失败/Retry、连续slider、字体半草稿与IME测试通过。没有用失败后恢复旧内存的fake模型宣称Store回滚；General单独例外见S04。
- Root custom输出仅--ne-*，静态palette仍全量检查，dynamic custom与静态GitHub有相同完整token集合；THEME_VARS覆盖清理，按各Document mode选择，切换follow/detach清理，HUHU --hu-*和宿主chrome不被接管。41 theme测试通过。正文局部CSS的真实层叠、用户自定义色/复制结果仍需实际渲染，不能仅按token声明验收。
- 图标保留26偏好/6分组、规则CRUD/复制/排序/启用、批量/单选、usage/path/rule checker和原域API。UI改动的color/Emoji/选择状态与Host CSS许可/宿主装饰保留，host-icons只移除越过共享行的旧私有布局。共享ColorField采用hu-hit；Iconic自己的颜色模式/右键业务组合仍保留，未把它当另一套域颜色引擎。44几何/命中由Root真实native裁决。
- 生产Input的中央IME hook已防composition/keyCode229穿透。专门正反控制验证RulePicker rename在composition时不保存，composition结束普通Enter保存；没有把缺局部if误报成IME漏洞。usage检查关闭后有alive/isActive，实际owner/clipboard回归通过；本次未发现另一个已验证的生命周期缺陷。
- Root oracle只在HUHU en/zh增补区各增加invalidDateTime一行，upstream资源hash与原行为断言保留，当前真实settings-iconic项目通过。runner增加.md:text/electron external与生产options一致，strict adapter数量校验仍存在；新增SDK class仅链接标记，getFrontMatterInfo/parseYaml被调用会明确throw。未把stub当宿主实现，也没有把预检当原生验收。

### 实际检查与限制

全部本reviewer过程输出在/tmp/huhu-t12-high-review：

| 命令/检查 | 实际退出与结果 |
| --- | --- |
| pnpm exec vitest run src/app/settings src/modules/icons src/app/workbench/settings-page.dom.test.tsx | 0；18文件81测试；owned-tests.log，含实际settings-iconic oracle；不沿用作者80/1旧失败 |
| pnpm exec vitest run src/theme | 0；8文件41测试；theme-tests.log |
| node --test scripts/ui-review/run.test.mjs | 0；6测试；runner-tests.log；包含其实际预检范围，不是T12全矩阵 |
| pnpm exec vitest run --config /tmp/huhu-t12-high-review/vitest.config.mts | **126**；最终4失败/4通过，共8测试；counters-settled.log。4red对应S01–S04；4green为合法分钟、General成功持久化、IME中/结束后的两个控制；搜索显式切custom的正控制在其反例内通过 |
| --config 私有before-rule.config.mts，仅rule-precision.dom.test.tsx | 0；同两测试通过；rule-before.log，只加载真实076 baseline RuleEditor源，无共享写入/无替代被测函数 |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-t12-high-review/tsconfig-shared.json | 0；shared-types.log空；指定Root共享theme/controls/i18n及测试图，不是全部UI或全仓类型通过 |
| pnpm exec eslint --max-warnings 0 <45个owned/shared生产TS/TSX源> | 0、零警告；lint.log。不把被配置忽略的测试/脚本算lint通过 |
| 原baseline57项及最终74项字节/模式、freeze副本 | 全部匹配；baseline-/final-verification.json、candidate/、manifest.json |
| validate-dispatch.mjs --stage dispatch | 0；errors=[]/warnings=[]；dispatch.json |

私有反例早期在Reading preview遇到通用DOM Component无load，以及CSS probe读取不完整；这些是harness/被S01阻断的观察，日志保留，未算产品finding。最终settings反例只mock独立Reading preview，其余实际组件/Store/索引/normalizer保持生产实现；没有通过mock核心路径制造产品通过。

已读076的原baseline/patch、47DOM、80/1失败、architecture/CSS报告、Root14红绿/i18n与最终Iconic11-test日志；未独立重跑的架构/全CSS/全图类型等不冒称本reviewer通过。作者全test图368项旧API诊断及Root记录6项预算over仍未变为整体通过；本次没有build、更新main/styles/NOTICE或提高阈值。最新T12 --check是preflight/0浏览器case，不足以验证CSS绘制、320/390/200%几何、真实颜色picker或popout。T06的secondMonth/矩阵与T09/T05活跃迁移不归因本票，均由各owner继续。

## 问题与下一步

四个具体问题交回Lead/076 owner，输入现在已明确释放，可进行最小修复；原报告/红测试保留，修复后独立冻结定向复审。优先保护S01的完整namespace和跨mode用户值；S02恢复既有合法精度，S03保证真实可达搜索目标，S04按真实Store语义提供幂等Retry。

复制颜色的真实半透明palette/浏览器计算色是修复后应保留的控制，目前不作为第五个已验证运行finding；最终native/Markdown/CodeMirror/实际宿主与资产/预算仍由Root持有。不能用81/41/6绿测试、字典oracle或编译预检宣布T12/G-MODULES完成，也不通过修改批准DESIGN或减少既有断言消除本报告问题。
