# T12 修复与共享预算独立审查

Session: 20261105T094057Z
Task: 089-review-t12-shared-budget
Status: completed

## 聚焦交接

Reviewer：native:/root/review_t12_budget；Strategy: independent；Risk: high；Independence: required；Mode: native。未参与076/083/085及Root集成实现，没有委派或修复。T12四项修复复验与共享预算首审分别得到 standards: pass、specification: pass，本范围没有新的实证 finding。此结论仅关闭本次限定审查，不宣告T12、T11、T16或全项目完成。

实际源输入已在结束时再次核对：Root34及原shared14字节/模式无漂移，083的61项只有TASK明确允许的CategoryContent由Root覆盖；该覆盖已纳入共享预算审查。报告返回校验通过后释放本次Root34与083源冻结，后续改动另按受影响范围重验。仓库唯一写入为本不可覆盖REPORT；过程材料仅留在 /tmp/huhu-t12-budget-high-review，没有修改源码、fixture、样式、构建产物、依赖、规则、Git/index、正式状态或Evidence。

## 产物与验证

### 输入、来源与边界

Review mode: source-files，不用HEAD或整个dirty diff冒充本次变更。083实际起点/候选来自 /tmp/huhu-t12-review-repair/{baseline,candidate}，精读其7改1新增差异；原61清单SHA256 d52c831f280b004baca9f10debf8aacb9dff644f39508df7efecaeb483c4db35。083 REPORT SHA256 5314a040956e0e95a3857553f51eeb5cc90c31a39064cd53cfbd62345e6e6c15。复用081对未变T12基线及Root14的审查来源与原始反例，不把其当成本次修复绿色结果。

Root34实际清单 /tmp/huhu-shared-budget-integration/manifest.json SHA256 55f1cede6ee897ca02cde54c171fb9c53d0ba3e723194c18003a4111f8cc2456，与真实源和frozen副本对应。旧shared14清单 /tmp/huhu-t12-shared-final/manifest.json SHA256 b9b99c61d09247380d120995a2876eee06a8b36cf814f07b85eb7d9cb4a329b0；14项仍相同。CategoryContent的当前SHA256 b71087bf753e2b7de132a4b8866e77912ae8b2a415ec8c6b76e0bbd283311fd5，属于明示覆盖而非未解释drift。

通过validate-specdev --review-scope --mode source-files --file逐项固定上述并集108个路径，退出0；scope.json SHA256 6cf52ee8d0bb22018360956dc92a68a4680d6e77712ea367f78e2c12b113669b。私有review-input.json由scope与来源清单形成，Input-SHA256（JSON.parse后紧凑JSON.stringify语义）5294692873de5421848baf271d7e88fbf5588d6f4c4e553a9e576ed868605948。字节摘要证明输入，不替代语义审查。

标准来源found：根AGENTS、dev/ui及settings-and-i18n、module-authoring、testing、build-and-release、theme参考，实际lint/type/test/build配置与公共review/risk合同。规范来源found：089 TASK、083/081/085 REPORT、Map30/Goal/Spec、T12及T16预算补充、DESIGN3/UI-002（批准摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）。显式source-files无commit来源发现记not-applicable；无需另寻远程Issue或重新选风格。dev绑定0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744、ui绑定12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4均匹配。sources.json记录15个关键原文摘要，SHA256 4392a9de9fd54e182927fed30737a6f94ae393064dd5754147c9ece1e1dde409。

影响分析：T12沿General→真实SettingsStore、CustomColors→themeSettings、RuleEditor→Iconic compareDatetimes、Appearance→CategoryContent/search cache/focus回读；预算沿module.ts→真实UI入口/词典与resource-utils→原JSON→生产esbuild onLoad→fflate回读。只检查这些接缝及必要消费者，未扩大为全dirty审查。T05/T11生产UI、T16/Pierre/082压缩源和许可bank/NOTICE不在冻结及本次实现审查内；T11三份UI词典、普通测试注册与safe hint只作上下文。

### T12 — standards 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []。Input-SHA256如上。

- S01原P1已消除：CustomColors.tsx:70–73顶层updater使用语句块，嵌套Object.assign返回值不再成为整theme替换；Store合法的namespace replacement协议仍保留。真实Store测试同时核对reset/copy后的完整内存及持久化值，保留preset、editor、source/accent、字体、字号/行高及另一明暗mode。实际copy控件仍读生产palette，081 alpha-copy未证实观察没有被升级为第五finding。
- S02原P2已消除：rule-editor.tsx:102–105允许原本有效的分钟、秒及1–3位毫秒本地datetime；保存名称或日期保持原精度，非法秒不允许保存。原compareDatetimes按分钟比较的语义未修改，没有epoch/IANA转换或有效值截断。另独立复跑081原分钟/秒两项反例，均通过。
- S03原P2已消除：AppearanceSettings三个条件分支与真实页面一致，索引不强行渲染隐藏字段。search signature仍含真实theme/app/语言，follow下不返回customBackground，custom下返回可滚动且实际高亮的focusId，切回follow及语言后cache准确；搜索没有修改persisted editor或额外写入。
- S04原P2已消除：GeneralSettings.tsx:41–67保留显式Retry并使用无修改update保存最新已发布内存；不重放toggle。操作序号隔离迟到错误，pending计数覆盖重叠操作，仍可交互的分段选择不再被静默丢弃；alive guard使关闭后不再调用迟到action或更新UI回执。真实IO barrier测试验证失败→重试、pending改值→重试及重试中关闭，磁盘保存最新组合值。

### T12 — specification 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []。Input-SHA256如上。

本轮四项符合T12补充合同、AC-111/114相关接缝与TASK要求：保留独立正文配色/合法领域值、搜索仅提供真实可达设置、失败具有幂等恢复路径。未增加设置事务、假字段、颜色引擎或设计模式；没有改DESIGN消除finding。此处Design Conformance只针对本轮行为修复；DOM与源码不能证明纸/墨像素、44命中、最终66浏览器组合或真实Obsidian主窗/popout。

### shared-budget — standards 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []。Input-SHA256如上。

词典实际原集合与当前activation+UI合并逐key/value严格相等、两部分无重叠：agent686+135、navigator401+7、task106+12、versioning445+65、huhu20+46；共265个移出键，en/zh均检查，字符串相等同时保留占位符。非UI字面量、动态prefix、错误messageKey/nameKey/titleKey及activation UI调用已交叉核对；例如agent的cliUnavailable/removeAccount/defaultAccount仍留module词典，navigator activation runtime/commands与versioning conflict/restore-review使用的键仍可达，task领域只返回code，错误文案沿workbench-page入口加载。General的manifest.descriptionKey与about动态族由真实CategoryContent同步注册。

真实元图中agent两个入口、navigator settings、task共享workbench入口及versioning四个入口均静态依赖各自UI词典；CategoryContent在渲染前注册huhu-ui。没有activate立即await导入纯UI词典的假懒加载。runtime.registerMessages只做合并、不注销，重复入口、语言切换及其他owner注册不删除既有词条，module重载再次合并activation词典也无清空路径。普通module-strings预载与真实入口探针严格分离；verify-i18n包含ui/i18n，dev/module-authoring/settings-and-i18n明确描述相同分工，未重写历史done绑定。

Iconic两个源JSON、NOTICE.txt、upstream pin相对原基线无改动；onLoad仍以原物理路径为输入，只生成gzip/base64传输。原loadResourceData动态边界不变，JSON.parse在该资源模块首次求值时产生同形状对象，重复/并发import保留默认数组identity和可变性，Unicode逐值一致。构建源按既有LF/CRLF规范化pin拒绝未知/改变源，坏gzip错误传播；没有自写codec、私有跨模块导入或修改node_modules。fflate0.8.3已精确锁定，helper保留版本/MIT上游引用 https://github.com/101arrowz/fflate/tree/v0.8.3；最终分发许可资产门仍归Root，不在本报告宣称通过。

### shared-budget — specification 输出

Reviewer: native:/root/review_t12_budget；Result: pass；Findings: []。Input-SHA256如上。

符合Map29的最小预算协议：原词义、领域/命令/activation键与资源语义保留，未调整预算或forbidden包集合。这里与085实际pre085 base/bundle-budget.json作语义比较完全相同，而不是拿更早Git HEAD的既有T16 forbidden增补误归本轮。真实main元图含fflate解包代码4946 bytes及两个JSON传输输出51713/55465 bytes，fflate不在eager或任何module activation闭包；没有用未压缩原图或缺decoder的私有样本代替真实main。

本次实际内存生产构建main为8191231 bytes、eager133416、agent1382956、navigator203542、task167468、versioning194484，既有六项预算均within。其数值属于当前真实工作区（包括并行票与Root许可banner上下文），与085私有8184382/133427等数值有差异，未冒称二者同一快照或完整产物验收。T11追加词典及其UI行为由090另审，本次不替代T11审查。

### 实际命令、结果与限制

所有新原始日志、代码与JSON仅在 /tmp/huhu-t12-budget-high-review。

1. pnpm exec vitest run --config /tmp/huhu-t12-budget-high-review/t12.config.mts：退出0，5文件42/42。覆盖真实General、Appearance、条件搜索、Iconic UI，以及081原rule-precision反例。首次配置引用另一/tmp目录的测试触发Vite路径解析失败，其余40条已绿；将同一原测试复制至本临时目录后最终42绿，未改生产源或放宽断言。
2. pnpm exec vitest run --config /tmp/huhu-t12-budget-high-review/boundary.config.mjs：退出0，5/5。复用085探针但全部import指向真实repo；obsidian stub仅去掉module-strings预载，setup也没有该预载。真实module import后UI键不可用，真实UI import后全量en/zh可用、重复入口和语言切换保留。
3. pnpm exec vitest run --config /tmp/huhu-t12-budget-high-review/entries.config.mjs：最终退出0，9/9，额外分别从fresh runtime验证全部9个直接UI入口。最初6绿/3因Vite缺Electron及生产virtual worker适配而失败；最终仅为这些未调用端口提供抛错harness（Worker payload为空且从不创建），没有mock词典、registerMessages或UI模块。此结果证明入口注册顺序，不冒充Electron/Worker实现验收。
4. node --test scripts/iconic-resources.test.mjs：退出0，2/2。真实构建插件、真实loadResourceData、源JSON逐值、默认identity/可变性/Unicode/物理输入、坏gzip及未知/改源拒绝均通过。
5. node /tmp/huhu-t12-budget-high-review/audit.mjs：退出0；生产pluginBuildOptions、write:false真实main/metafile，独立全闭包fflate检查及五组原/现词典strict union相等。主产物仅保留临时副本，未写仓库main.js。
6. node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-t12-budget-high-review/bundle.json：退出0，within limits。原预算checker未修改。
7. validate-specdev source-files冻结：退出0；开始/结束哈希及模式复核Root34 drift=[]、旧shared14 drift=[]，T12唯一CategoryContent明示覆盖。

083的131项/owned types lint及Root的1397 architecture、41词典5610和11脚本绿色日志已回读，可作为仍适用上下文，不伪称本worker重新执行。全局tsc/build/lint/test:all、main.js/styles.css正式重建一致性、NOTICE/license bank及真实Obsidian仍待Root；这些未运行项没有被标作not-applicable或通过。

## 问题与下一步

本次两部分四个轴均无待修复finding，083原四项实证缺陷已通过独立复验。Root回读本REPORT与真实派遣/返回身份并完成return核验后，可释放本范围进入后续集成；若源或规则改变，重验受影响结论。正式状态、Evidence、完整构建、许可资产、浏览器组合与宿主验收仍归Root，没有请求或执行提交、推送或发布。
