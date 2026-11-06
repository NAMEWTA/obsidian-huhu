# T-13 最终清理独立审查

Session: 20261105T094057Z
Task: 138-review-cleanup-final
Status: completed

## 聚焦交接

Reviewer: native:/root/cleanup_high；sol high 独立角色，未参与136候选、Root应用或修复，未委派。Strategy: independent；Risk: high（共享令牌、路由删除、最终覆盖证据）；Independence: required；Mode: native。Implementers: native:/root/cleanup_final、native:/root。**standards: request-changes；specification: request-changes。** 两项P2分别是守卫遗漏真实相对Input导入、Analytics最终分类及统计过时；没有发现本次路由或hit迁移的新产品故障。

审查已完成；本REPORT写入及return校验后，**停止全部读写并释放52责任源冻结**。原136报告不覆盖；Root可交原owner做最小修复并只复验受影响输入。T-14完整集成、66矩阵与真正宿主验收仍待Root，不由本报告宣布通过。137两项UI技能知识漂移由T-15独立持有，未混成本T13产品发现。

## 产物与验证

### 固定输入、来源和范围

Review mode: working-tree；实际差异为136冻结的dirty-before→候选after，未用HEAD替代最初脏文件。/tmp/huhu-root-frozen-cleanup/ready.patch SHA256 6567e7d90f5b669db45f556513a33971d03afa6d66498edbf986d354caeb0841；ready-manifest.json逐项绑定52路径before/after SHA与mode。本人核对全部52当前after和保留于/tmp/huhu-cleanup-final/before的before字节，均匹配；mode均匹配。Root生成后冻结styles.css SHA256 e5bc1f3ab5c0e1fa8e0299b4378497617e0a3039a5d1083c09c6cebd42c470a8，与本人Chrome实际加载文件一致。`git diff --cached --raw` SHA256仍4258d835a7e5cf5c845a981d441a37baa14fb4c834097f83aedeb34e0fb653ec。本执行者未写index。

标准来源：根AGENTS、dev/ui、testing、code-review及reviewer/source-discovery/Fowler/risk/evidence合同。规范来源：显式T13、Map/Goal/spec（AC024/121/122/125）、批准DESIGN revision3与UI-002。source-files/working-tree任务无新commit或远程Issue来源，不制造Git比较端点。另读124准确影响清单、136真实REPORT和本次实际调用方。实际来源摘要保存在/tmp/huhu-cleanup-high/sources.json；没有浏览外部网页或采用新外部设计。现有ScrollArea来源注释、七文档原始许可和来源URL未因本差异丢失。

本轮只读52责任源、直接消费者和已有报告的明确边界：旧icons feature从WORKBENCH_FEATURES/FEATURE_MODULES/compose贡献中移除，iconSettingsTarget和无消费者NavigationItem.aliases删除；真实icons模块、ICONS_SERVICE、settings/iconic以及resourceId/focusId保留。当前workbench-ui/1解码拒绝旧封套，当前合法target/状态segment sync名称未粗删。35probe的diff仅迁模块种子、真正versioning namespace、旧feature/category/rail selector；内部huhu-sync-page、暂停命令与sync状态目录保持。两legacy fixture真实传入visible并保存/释放EditorPanelHandle；T34内存EditorContextAccess按所属Window返回来源，未把preflight当浏览器生命周期通过。

### standards 输出

Reviewer: native:/root/cleanup_high
Result: request-changes

**ST-01 / P2 — 源码守卫漏掉真实共享Input的相对导入。** 位置：test/guards/frontend-cleanup.test.ts:11。`/(?:^|\/)components\/input$/`只认moduleSpecifier文字含components/input，未用传入filename解析目标。生产中InlineRename.tsx、PathPicker.tsx、SettingsFormControls.tsx实际使用`../input`，date/field-parts.tsx、MonthField.tsx、calendar组件实际使用`../../input`。在这些真实位置回归`<Input type="date"/>`或命名别名datetime-local，新增守卫仍返回空，违背AC024要求的真实Input/别名覆盖。本人私有AST控制直接执行本次守卫函数：InlineRename的`../input`原名、field-parts的`../../input`别名均hits=[]；完整components/input导入与原生input配对各hits=1。并非推测当前产品已有原生日历缺陷。

满足条件：根据filename解析相对specifier到唯一生产src/ui/components/input.tsx（支持当前实际相对写法及需要的显式扩展名），再识别ImportSpecifier原名/别名；加入上述两种真实相对路径日期红灯与time/TextField/domain对象绿灯，保持动态type/spread及现有四适配边界。无需扩展到所有用户定义组件或引入新日期引擎。

既有四动态适配的当前真实调用可解释：P1Controls/PromptField的date已走DateField，现有time合法；SuggestInput当前调用是文本建议；SecretInput当前调用是password/text。未把这些动态类型声明本身粗当原生日历控件。字符串形状例外不是任意未来运行时属性数据流证明；本次明确发现是导入解析漏检。

### specification 输出

Reviewer: native:/root/cleanup_high
Result: request-changes

**SP-01 / P2 — 最终inventory的Analytics分类和派生计数不符实际字节。** 位置：frontend-inventory.json:13998–14011及15485，frontend-coverage.md:5、最终逐路径投影段。Analytics.tsx当前SHA31c2a39e7223331b2c2fa0936548be68fd729b06ac0625411afee138b385e5f3已纳入123日期迁移，却仍classification=unchanged-bytes、disposition声称未因改版产生字节差异。本人用同规则重建37fcede基线618条与当前671条，全部678项逐条对照原字节/存在性/分类/当前SHA/mode，唯一分类差异即此处；真实应347 modified、264 unchanged-bytes、60 added、7 deleted。JSON和coverage仍写346/265，影响AC125逐路径回执准确性。

满足条件：Analytics改为modified并更正disposition；更新JSON classification_counts及coverage相关数量/描述；保留准确的当前SHA、owner T08、126审查/正式Evidence/fixture绑定，不能覆盖136历史报告。以完整678路径重算和定向docs验证闭合即可；无需重跑未变模块和产品矩阵。ST-01同时影响AC024守卫可信度，规范轴不重复计一条finding。

除上述差异外，全部678路径集合与baseline∪current一致，618原路径没有丢项，60新增已归属，7删除的后继都存在；22独立CSS均在规则清单内，全部当前SHA/mode匹配，25真实报告、13正式Evidence、13fixture入口均存在。265原声称相同字节未被当成逐行验收；纠正后264仍仅为差异分类。历史request-changes原文与窄修复边界保持，可沿正式Evidence回读原完整审查和后续处置，不将本轮路径核验冒作678源重新逐行审查。

覆盖索引已连32registry（18widget/14section）→真实生产分派→T08的12公共/配置+32registry共44状态；设置连General/Appearance/About/可选gallery与9个PRODUCT_MODULES/settingsPage及搜索字段；task/health/notifications没有独立settingsPage并未伪作遗漏。13工作台贡献、3宿主view和三个独立panel的owner/evidence/fixture链与当前装配相符。T04等窄最终REPORT通过对应Evidence继续指向原完整审查，未将它们当新的全范围证书。未重复模块领域全审。

### 实际命令与局部浏览器证据

所有新增过程只在/tmp/huhu-cleanup-high；仓库唯一写入是本不可覆盖REPORT。

| 实际检查 | 结果 |
|---|---|
| 52快照before/after/mode、同规则全部678项baseline/current/receipt逐条核验（audit.py） | 退出1，准确暴露SP-01；除该classification外errors为空；audit.json |
| `node node_modules/vitest/vitest.mjs run test/guards/frontend-cleanup.test.ts src/shell/navigation-state.test.ts src/app/contracts/workbench-state.test.ts src/app/workbench/compose-workbench.test.ts src/app/settings/nav.test.ts src/app/settings/react/icons-settings.dom.test.tsx` | 退出0，6文件35项；directed.log |
| `node /tmp/huhu-cleanup-high/guard-controls.cjs` | 退出0，输出两个漏检反例及两个命中正控制；guard-controls.json，不称守卫通过 |
| `node node_modules/typescript/bin/tsc -skipLibCheck -p tsconfig.test.json` | 退出0，无诊断；test-types.log |
| `node scripts/verify-docs.mjs` | 退出0；1928 Markdown、1604本地链接；docs.log；不证明所有语义 |
| `node scripts/verify-architecture.mjs` | 退出0，1403模块无边界/循环违规；architecture.log |
| 私有hit.tsx/hit.mjs，真实React/Radix生产ScrollArea+当前styles.css+Obsidian ASAR app.css | 退出0，4组main/iframe × fine/coarse；hit-result.json |
| 138 dispatch/return结构校验 | 退出0；dispatch.json、return.json |

本人Chrome局部测试对main/iframe分别切fine/coarse，实际matchMedia与hu-hit=32/44一致；data-hit-control伪元素尺寸、原生最小高度、ScrollArea viewport padding/纵条宽/横条高分别32/44；局部--hu-hit:56px的后代伪元素、viewport和两条滚动条即时保持56，确认不是根上重复coarse硬编码或self-reference。ScrollArea使用真实Radix元素/布局，非静态字符串或自造滚动引擎。未采集完整视觉像素与可信滚动/点击流，不将此局部几何检查当正式66/Obsidian popout。

## 问题与下一步

Root将ST-01/SP-01交原medium owner做上述最小修正，并按增量复验；本reviewer没有实施修复。当前守卫绿色35项不能抵消已实证漏检，docs绿色不能抵消最终分类错误。两项修复完成前本T13审查保持request-changes；T14整体门继续pending。

未跑全仓build/lint/test、统一CSS生成、正式66、35probe真实Obsidian执行或T34/T35完整legacy浏览器矩阵；既有136 preflight与语法回执只按其真实含义使用。没有用户vault、账号、clipboard、系统数据或远程动作，未提交/推送。**return0后停止所有读写并释放全部52责任源，后续修复不由此只读reviewer写入。**
