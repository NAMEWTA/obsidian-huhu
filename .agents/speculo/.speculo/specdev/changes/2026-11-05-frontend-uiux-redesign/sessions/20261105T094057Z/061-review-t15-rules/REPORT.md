# 任务回报

Session: 20261105T094057Z
Task: 061-review-t15-rules
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，既有 gpt-6.1-sol high；非 060 作者，未委派。**standards：pass；specification：request-changes。** 一项 P2：T-15 明确要求的现有可执行 UI runner 示例缺失。五源的现有 API、三段实际示例、元数据、普通任务路由及 Map18 的精度/分页共享范围未发现其他具体缺陷。

**明确释放五份 UI Skill 源及本次 Map18/Spec/T06 只读上下文的审查冻结，供原 owner 修复。** 062 盲前向评估若仍使用原快照，须保留其原输入边界，本报告不替代它。仓库唯一写入是本 REPORT，其余只在 /tmp/huhu-t15-review；无源码、Skill 修复、规划/正式状态、绑定、资产、依赖、Git 或 Evidence 写入。不宣称 T-15 done 或 G-CONTRACT 关闭。

## 产物与验证

### 固定输入、基线和适用合同

Review mode: source-files + verified HEAD-to-candidate five-source diff；Risk: high；Independence: required；Strategy: independent；Mode: native。五源冻结清单 /tmp/huhu-t15-implementation/frozen-manifest.json SHA256 **4f4a7d09bbcd10c1e061c2425550658f414489bbbba4fbc9527c1b855cd211ee**；私有复份 source-manifest.json。所有 frozen/ 字节与当前源一致。

| 源 | 最终 SHA256 |
| --- | --- |
| .agents/skills/ui/SKILL.md | 12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4 |
| references/design-system.md | 1c7ed53e651942b46a57440f4e8d14f24b323e0c57c216ceea79b1e5fa62c20c |
| references/shell.md | 83969ee1794f7d0f5350a6ca557e9e7b0875fa02cf8389c3598598962bcc4f5d |
| references/theme.md | c1de6aac62b8f40ad0d02602befddb32ec3bcda3508a179fdbea38b7a43e024d |
| references/motion-a11y.md | c5176fc786f8b2cc9033b5b60b5fc2e944ed6d34f5920108a295cfd3bf1d9c24 |

逐源验证作者 before/ 与 before.json，且各 before 原字节恰等于 `git show HEAD:<path>`；保存实际 `git diff --no-ext-diff -- .agents/skills/ui` 到 source.diff。before 清单 SHA **343ae7b09aad024fbe8998efcc096225966b18e6dc909c322f11d7b915dfe018**。完整五源 36,472→36,356 bytes；不是只统计入口，也不推导 Token/费用变化。SKILL frontmatter 逐字相同，name/description/license/metadata 保留；五文件均普通文件、0664 权限，与编辑前一致。未创建第二参考/README/变更记录。

已读 T-15 全部职责/验收、060/058 REPORT、当前五源及旧五源差异，复用并回读 AGENTS、dev、文档/SkillMaintenance 与双轴审查合同。规范依据是批准 DESIGN revision3/UI-002、Spec 与当前 Ticket；T01–04 Evidence 均为 passed，仍区分切片验收、后续消费者及真实宿主门。Map17 已由 059 审过，本次对 Map18 与旧17冻结 Map 的实际 diff 只出现 revision 和新增精度/分页修订记录；DAG 未变。

审查开始私有保存 Map18、Spec、T06、T15、DESIGN、批准记录、T01–04 Evidence 共10份上下文；结束10份与五源漂移均 []。源码/类型事实清单 source-facts.json 共27项；没有因无关后续工作要求全仓冻结。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: pass
Findings: []

**维护结构与普通任务边界。** 入口仍精确触发 UI 实现/审查，排除产品问答、只讨论主题与纯服务任务；不自动创建 SpecDev/审批/Git 动作。dev 保持模块、持久化、i18n、依赖和唯一测试选择表 owner；五参考按任务读取，没有无条件递归展开。旧 Orca/apex 整页权威、宿主 UI 色板/动效、旧 header/panel/state 封套及旧自动化页内编辑规则被替换；原 React、窗口、生命周期、语义、范围、改编署名/许可和正文编辑器边界仍有负责位置。

**真实组件与示例。** 从当前 Markdown 独立提取全部3段 TSX，以模块 ui/ 为相对路径基准，只解析 import 到实际源码，不修 props/删代码/加成功桩。定向 tsc 退出0。FormField 单个可关联 child 的 ID/error 合并、SettingsSwitchRow 无参 onChange/busy、Notice 的 tone/title/action、Button variant、DetailPane 的 leafWidth/dirty/onDiscard、useLeafMetrics 的 element/width/ref 均与实际源符合。Badge 与 Button 的枚举、Table/Tree 密度及视觉/命中分离、panels v4 数字px/百分数字符串也符合当前合同。

**所有权与状态。** 叶600/960与可用main1000、PortalRoot无几何框、独立React导航根、DetailPane保持同一child、隐藏保留/关闭卸载、物理owner层级、迟到回焦/adoption滚动、页面状态schema和原生状态栏，均与已验收T04/T02端口一致。normal/empty/no-results/首次loading/刷新/error/unavailable/busy、真实Promise阶段、领域逆操作、草稿代次/晚回执等约束保留。框架不推断业务字段或建立另一业务仓库。

**日期/主题的事实与目标分开。** Date/Range/DateTime公开形状、initialTimeZone/validateValue必需、invalid draft阻止旧值保存、日历纯分量和真实DST责任正确；Backend、MonthField、DiffView/CompareEndpoints均标为生产者目标，不提供不存在的现成import。主题以HU根/Portal和配对回退为UI机制，笔记编辑器合法scheme/个人字体仍独立；外观v1现存parser与T12删除目标明确区分，没有把规则目标冒称现存行为。字体/牌色完整值回实际源，焦点2+2与输入glow、reduce伪元素、32/44独立命中和computed≠paint的证据边界清楚。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**V-01 · P2 · 缺少 T-15 明确要求的现有可执行 UI runner 示例。**

定位：.agents/skills/ui/SKILL.md:28、36 的验证路由，以及 references/motion-a11y.md:3、theme.md 最后验证段。现有五源只把验证交给 dev/testing 或泛称 Chrome/宿主，没有一条 `scripts/ui-review/run.mjs` 调用、`--suite frontend-redesign` 或 `--matrix redesign`。链接到的 .agents/skills/dev/references/testing.md 同样没有该 runner；其真实宿主探针不是本次生产组件 redesign runner。

依据：ticket/15-ui-skill-contract.md:77 明确要求“给出现有可执行的 UI runner 示例与宿主边界”，同时要求 dev 仍是唯一选择表。当前作者的docs/类型/格式通过不能证明这个未交付的使用路径存在。只沿新Skill正常路由的实施者无法取得已接受runner的正确suite/matrix参数，容易停在DOM或误拿宿主探针替代本票矩阵；这是明确交付缺口，不是要求每次全跑。

满足条件：在适当参考中给出一条当前真实fixture可执行的准确CLI示例，并说明按当前票/风险选择及iframe≠Obsidian的边界；例如既有T-03控制的 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-03 --matrix redesign --out /tmp/huhu-ui-review/T-03`，可另说明只做guarded预检时加 `--check`。指向dev选择表，不复制第二份全量必跑清单；新票fixture尚未交付时不能虚构可执行通过。无需修改dev、产品或runner源码。

**Map18 精度与范围：通过。** src/modules/archives/core/schema/fields.ts:23–47/FieldCodecRegistry、model.ts 的13 kinds与precision，以及当前DateTimeField的分钟/IANA端口，支持所写的表示区分。纯月不补日；固定offset/Z字符串保留秒/小数/原拼写，不通过epoch或假IANA重写；显式部分编辑仅改变对应原片段，invalid草稿进入现有dirty/error/recovery链。当前无MonthField导出已直说，Lead拥有新源/相邻测试/date-value/index/UI词典，不扩大模块core/entity/codec写集。私有实际codec探针11项通过（月份/mixed/day差别、offset秒小数、Z及非法值）；它只证明原codec接受边界，不证明尚未实现的档案新控件。

src/app/contracts/workbench.ts:111–123 当前PanelTree仅defaultExpandedIds，SidePanel:314附近尚未接入受控expanded；Tree本身已有expandedIds/onExpandedChange和搜索恢复端口。Map18将模型/SidePanel/DOM测试精确列为Lead共享，按叶/模型隔离、有界/prune；模块沿现有offset/limit/total查询分页（core上限500，index:374–409已有slice/total），不把继续加载冒充record选择，也不让>500记录消失。这是明确生产者待交付合同，没有声称新API已经存在；T06 UI/workbench服务与测试原写集足够，不需新域字段或库。

**其他 T-15 规范：本次未发现具体冲突。** 页面覆盖保留首页5模板/18+14目录来源、任务全字段/3状态、档案13字段/恢复/分页、自动化/三收件箱/保险箱/版本/体检等实际能力；原型未画不构成删字段授权。触发、失败、缺组件和共享producer漂移都能路由回真正owner。新Skill绑定需接受后Lead刷新；当前故意保留旧绑定不是代码事实错误，但正式完成门尚未通过。

### Lead 追加的 T07 能力映射核对

此项为本轮收到的有界只读追查，不扩大本次Skill修复：DESIGN §6有“结束日期用DateField”，但 src/shared/automation/types.ts:10–13 的ScheduleSpec仅manual、once.at、recurring{expression,start,timezone}；automation-schedule-parsing.ts:47只允许FREQ/BYDAY/BYHOUR/BYMINUTE，拒绝UNTIL/COUNT。T07未获新增schedule字段/模型权限，DESIGN §7也明确不改领域schema。

因此可由Root另写精确Spec/T07澄清：该控件映射仅适用于真实存在的能力；当前无可编辑结束日期，必须记录unavailable/DesignConformance差异，不能显示假可保存字段，也不能声称已实现原型的结束语义。依据既有无schema变更与能力合同，毋需为这一事实解释修改批准视觉DESIGN digest；若今后要求实际可编辑结束语义，则是另一个领域授权/设计决定。本次新Skill自身要求保留实际triggers/actions/schema且未虚构end API，不把源中不存在该能力计作新的产品缺陷。本文不代替Root后续澄清或对其新字节的审查。

### 实际检查与边界

所有过程材料在 /tmp/huhu-t15-review：

| 命令/检查 | 实际结果 |
| --- | --- |
| 原HEAD/before/frozen/current字节、frontmatter、mode/symlink | 通过；五源匹配，元数据保留；initial-verification.json/source.diff |
| /usr/bin/python3 /home/wta/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/ui | 退出0；Skill is valid；quick-validate.log |
| pnpm test:docs | 退出0；1766 Markdown、1603本地链接；外链1347未抓取；docs.log |
| 独立提取3段当前Markdown TSX；pnpm exec tsc -p /tmp/huhu-t15-review/tsconfig-examples.json | 退出0；examples.json/examples-types.log；真实import/required props，未加业务成功桩 |
| git diff --check -- .agents/skills/ui | 退出0 |
| node /tmp/huhu-t15-review/codec-probe.mjs | 退出0；原真实codec11个控制；codec-result.json；无MonthField/新UI通过声明 |
| validate-specdev.mjs --stage tickets --repo /home/wta/projects/obsidian-huhu <当前change> | **退出126；12个UI旧binding摘要漂移+既定conclusion-report提示**；tickets-validator.log。T05–14、T15本次旧调用及T16尚未由Lead刷新，不冒称正式票据门绿 |
| 首尾5源+10上下文 | 漂移[]；source-manifest/context-manifest/final-verification.json |
| dispatch结构验证 | 退出0；errors=[]/warnings=[]；不代替独立身份、授权或语义检查 |

未运行产品build、资产重建、依赖安装、已接受UI矩阵或真实Obsidian；纯文档变更不重复这些门。Skill结构、文档链接、示例类型和作者场景走查不等于盲前向评估或产品验收。T01–04已有证据仅在其未变边界内复用。

## 问题与下一步

原owner最小补齐V-01，冻结新字节后独立复核该修复；无须扩大到产品/runner/dev改动。062原快照评估保留独立结果。

Lead在最终接受后处理11张未执行下游票绑定刷新、T15本次调用与新交付记录，运行正式票据/计划校验，再裁决T15/G-CONTRACT。Map18生产者、T07能力澄清和未来Backend/MonthField/Diff包装的真实交付/漂移仍归对应owner；本报告不写状态或替未来API验收。
