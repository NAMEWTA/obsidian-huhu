# UI 技能候选交付

Session: 20261105T094057Z
Task: 060-implement-t15-ui-skill
Status: completed

## 聚焦交接

五份现有 UI Skill 源已重写、核对并冻结；这是 worker 候选交付，**不是 T15 done、独立评审通过或 G-CONTRACT 关闭**。只写 .agents/skills/ui 的原五文件、本报告和 /tmp/huhu-t15-implementation；没有业务源码、docs、dev、依赖、资产、Git/index、正式状态/Evidence 或下游 binding 写入，没有委派。

输入为批准 DESIGN revision3/UI-002、Map17及后续Map18精度合同、T15、Spec、已接受 T01–04 生产者；继承 052/055/056/058 事实和 059 独立规划结论。核对 T04 最终78源清单 SHA491ccdd866730aca95b77af1ad0202782834020a4d80401cb7e038890b6799c4，采用 Root 已验收66与正式 DONE 的依赖收据，不将旧候选报告冒充最终通过。T15 指派预检 /tmp/huhu-t15-assigned-preflight.json 已由 Lead 确认明确 eligible T15。适用方法：dev/UI、宿主 skill-creator、SkillMaintenance、DocumentContract 和 SpecDev I documentation；普通任务授权不被维护规则额外扩展。

### 五文件职责与替换

| 文件 | 最终职责与主要变化 |
|---|---|
| SKILL.md | 保留精确触发/frontmatter；缩为设计/源码权威、按任务路由、实施边界、共享缺口回生产者。移除强制Orca/apex整页布局、旧宿主色/动效、笼统store与递归验收，不自动创建流程/审批 |
| design-system.md | HU语义令牌与实际variant/组件、表单/设置实例、日期值与真实领域端口、月/offset精度、CSS/库复用。明确有效shadcn别名与旧UI兼容不同，不能虚构未来Backend/MonthField/DiffView |
| shell.md | 实际叶/main阈值、DetailPane必需props与列表实例、PageCreate/生命周期/新状态封套、全部页面组合/字段/状态、原生状态栏。删除旧面板/header/持久键、旧自动化页内编辑器和首页无编辑模式主张 |
| theme.md | HU根paper/ink/system、六accent/source配对回退，与独立笔记编辑器结构/个人字体严格分开；保留阅读预览安全和逐Document清理。当前EXPORT_VERSION规范与现存v1未迁移消费者区分 |
| motion-a11y.md | HU动效/reduce、库键盘/IME、physical-owner嵌套栈、真实来源焦点、paint与32/44独立目标、角色ARIA/对比度/溢出。删除宿主动效和所有控件统一旧ring规则 |

上游原始署名/许可仍在原源文件；Skill 的 LicenseRef-HUHU-1.0、name/description/metadata 完整保留。引用 docs/references、dev licensing、SuliWorld/GitHub 原许可来源不丢。仍有效的 cn/className/data-slot、作用域与huhu-native排除、多窗口Portal引用计数、IME/ARIA、隐藏保留/卸载、真实busy/失败/重试/领域条件撤销、虚拟化与分页等已分别落在唯一负责参考，不以精简删除独有约束。

## 产物与验证

### 事实 → 设计 → 生产者 → 验证接缝

| 规则事实 | 批准依据 / 实际源 | 本次核对与后续消费接缝 |
|---|---|---|
| palette/source/字体/类型/间距/密度/icon | DESIGN§3；theme/settings/runtime、ui/styles/tokens、tailwind/index、Lucide及字体来源 | 读实际声明/属性，保留HU别名；theme参考不复活旧preset或body UI覆盖。源码颜色/层叠验证归现有theme/host测试 |
| Button/Badge/Notice/FormField/Settings | DESIGN§5；真实组件与SettingsFormControls | 逐项核对variant/size/required props、SettingsSwitchRow无参回调/busy、Notice真实状态。三个组合片段使用真实导入并定向tsc通过 |
| 日期/真实DST/精度 | DESIGN§5/7、Spec AC023/024；date/index/field-parts/DateTimeField/date-value；task/time；archives schema事实 | 完整Date/Range/DateTime值和必需validateValue/initialTimeZone、纯日无UTC、invalid draft挡旧值保存。月值不补日；offset/Z秒小数用真实codec保留，不猜IANA或分钟截断 |
| Calendar未来生产者 | Map17/059/056；现有date/Calendar与产品CalendarMonth/Home/Navigator调用 | 不提供不存在的Backend import；T05薄base+产品包装、T10真实消费，周条边界红例不宣称已解。280/312 picker不硬塞272侧栏 |
| Month未来生产者 | Map18/T06补充、058；现有DateField仅完整日 | 规则写“缺口回共享日期族”，不声称MonthField已导出；Lead拥有新MonthField/date-value/index/UI词典，day族合同不变 |
| shell/DetailPane/状态封套 | DESIGN§4；workbench-state/host、shell/layout、use-leaf-metrics、DetailPane | 叶600/960与main1000区分，52/272/360/440按角色；示例传leafWidth/dirty/onDiscard并保留同一editor；新封套不双写旧键，业务schema不变 |
| 页面组合/所有字段 | DESIGN§6、coverage；各模块现有schema/API/入口，055/058核实 | 首页五类模板+18/14目录来源；任务三状态/全部时间关系；档案13种/恢复；自动化、日记、agent、三收件箱、safe、版本/体检、设置全字段，不从demo删分支 |
| Portal/z/生命周期/scroll | DESIGN§7；portal/providers/surface/modal-layer、T04最终source receipt | 每Document与物理owner、独立React根、后模态/无关popup、Radix trap、来源恢复/迟到代次、adoption可见隐藏scroll；不复制焦点或滚动引擎 |
| motion/focus/IME/命中 | DESIGN§3/7；tokens/base、ime、共享原语/Tree/虚拟器 | 标准outline与输入glow分开；32/44两轴不重叠、邻焦点不改归属、paint不能只看rect；reduce含伪元素；DOM/Chrome/宿主证据边界明确 |
| 差异特殊表面 | DESIGN§3.7/5/6/7、T16；实际HU diff token | 只写DiffView/CompareEndpoints未来合同，shadow token/库parser-worker/局部键盘和领域写回；无虚构当前导出或已安装结论 |
| 外观导入 | T12明确删除v1范围；appearance.ts EXPORT_VERSION/parseExport | 只接受当前格式为规范；不谎称现存parser已拒绝v1，不把旧分支当合法兼容事实 |

Map18在候选冻结后发布的共享MonthField/SidePanel权限明细已回读；没有UI源码/API变化。冻结规则已表达同一保真政策，无需改字节；其“目标与实际导出”区分保持。没有将Map18新增文件权限当作本worker写入许可。

### 实际检查

| 检查 | 结果 |
|---|---|
| /usr/bin/python3 宿主skill-creator/scripts/quick_validate.py .agents/skills/ui | 退出0，Skill is valid；使用已有system Python/PyYAML，未安装包 |
| pnpm test:docs | 退出0；1762 Markdown、1603本地链接；外链1347未抓取，结构通过不等于全部语义/宿主验证 |
| pnpm exec tsc -p /tmp/huhu-t15-implementation/tsconfig-examples.json | 退出0；从原Markdown抽取3个tsx片段，仅把模块相对导入解析为实际绝对源，校验FormField/Settings/Notice与list+DetailPane/useLeafMetrics真实required props |
| git diff --check -- .agents/skills/ui | 退出0；差异路径恰为原五文件 |
| frontmatter/metadata/hash回读 | frontmatter逐字相同，五文件0664、普通非symlink保持；冻结副本与源drift[] |
| 恢复演练 | 只在/tmp/restore-drill恢复五个编辑前副本，全部原hash/mode一致；没有回滚实际候选或其它owner工作 |

日志：/tmp/huhu-t15-implementation 的 quick-validate-final.log、docs-final.log、examples-types-final.log、diff-check.log、restore-drill.json。没有产品构建、测试新增或资产重建；这是规则维护，适用检查为metadata/事实/链接/类型/场景，不伪造产品TDD红绿。

### 作者场景走查（非独立评审）

| 真实请求类别 | 沿新规则实际核对的路由与结论 |
|---|---|
| 任务详情/完成 | SKILL→shell/tasks+design-system日期/TaskContent；全字段/三状态/1.4秒/真实保存、DST交模块，未导出API不猜。与055/真实API一致 |
| 档案树+记录 | shell/archives→Tree/FormField/日期保真；列13字段、month不补日、offset秒不套分钟IANA、invalid draft挡旧值、>500分页/多叶受控展开回生产者，与058/Map18一致 |
| 自动化列表+检查器 | DESIGN组合为列表常驻+右详情/编辑Dialog，switch失败回滚/日志/深链缺失；不再被旧页内编辑器规则误导 |
| 设置表单/搜索 | 实际SettingsSection/SettingsSwitchRow/Notice示例编译；保留schema字段/搜索，异步busy由真实操作驱动，不臆造onChange参数 |
| Git A/B比较 | 找到目标合同/局部键盘/shadow桥接与领域操作；没有现成DiffView import时返回T16生产者，不伪造通过 |
| 邻近不触发 | 普通产品问答、仅讨论主题、纯服务持久化bug：描述的排除仍成立，不自动开启UI实现/SpecDev/全矩阵 |
| 失败路径 | 缺MonthField/Backend/领域校验、DESIGN与源码冲突、宿主不可用：明确owner/scope/未验收，不写()=>null或删字段消除错误 |
| 恢复路径 | 本票备份可恢复；规则同时保留业务dirty/失败重试和late receipt保护，不把文档备份当业务恢复证据 |

以上是作者依据原请求的路由/合同走查，不是已生成五个完整产品页面，也不是盲评。Lead后续独立前向评估仅应提供真实请求+新Skill+最低原始schema/源码，不提供本报告预期结论、缺陷提示或修复答案；独立high可读完整证据做两轴审查，两种职责不能混称。

### 冻结与完整体积

冻结：/tmp/huhu-t15-implementation/frozen/、frozen-manifest.json、freeze-receipt.json；原文/metadata：before/、before.json。五份完整源合计：**36,472 bytes / 20,641字符 → 36,356 bytes / 20,334字符**；入口单独：6,476 bytes / 3,410字符 → 4,167 bytes / 2,184字符。统计含全部references；入口减少，分支承接新增字段/实例内容，不推导Token/费用节省。

| 冻结文件 | bytes / 字符 | SHA256 |
|---|---|---|
| SKILL.md | 4167 / 2184 | 12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4 |
| references/design-system.md | 10514 / 6665 | 1c7ed53e651942b46a57440f4e8d14f24b323e0c57c216ceea79b1e5fa62c20c |
| references/shell.md | 10883 / 5940 | 83969ee1794f7d0f5350a6ca557e9e7b0875fa02cf8389c3598598962bcc4f5d |
| references/theme.md | 5007 / 2687 | c1de6aac62b8f40ad0d02602befddb32ec3bcda3508a179fdbea38b7a43e024d |
| references/motion-a11y.md | 5785 / 2858 | c5176fc786f8b2cc9033b5b60b5fc2e944ed6d34f5920108a295cfd3bf1d9c24 |

## 问题与下一步

- 五文件明确冻结，等独立high双轴评审与真实盲前向测试；未获释放不再写源。文档类型示例与作者走查不能替代独立测试或产品/宿主验收。
- 旧ui invocation绑定 SHA123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44 保留于T15本次调用及T01–04历史；新候选源SHA如上。Lead在接受后刷新11个未执行下游T05–14/T16的ui binding、维护本票新交付记录并跑正式票据/计划校验。源变化期12个预期binding drift不由worker改写消除；不是scope错误或下游已获准执行。
- 新共享Backend/MonthField/Diff包装交付后的规则漂移仍须owner协调更新与绑定，不把当前“目标合同”当既成事实；T13文档整合/T14最终漂移检查继续保持。没有更新永久ADR/context或在Skill写会话/临时路径。
- 当前没有发现需用户补充决定的范围问题；未请求提交/推送/发版，也不把这些动作当本次交付条件。正式T15/G-CONTRACT状态仅由Lead推进。return validate-dispatch 退出0，errors[]/warnings[]，日志 /tmp/huhu-t15-implementation/return-validator.log；最终五源drift[]。
