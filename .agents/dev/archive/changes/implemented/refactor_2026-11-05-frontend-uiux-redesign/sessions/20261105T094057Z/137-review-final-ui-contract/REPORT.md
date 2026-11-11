# 最终 UI 技能合同独立窄审

Session: 20261105T094057Z
Task: 137-review-final-ui-contract
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。本人未参与五份 UI 技能源、产品实现或修复，没有委派。Root 的真实派遣与本任务返回是独立性凭据；报告自称独立不替代 Root 核验。

**standards: request-changes；specification: request-changes。** 发现两项有界 T15 技能漂移，均为 P2：生产者交付后仍保留“尚不可用”的事实描述；日期新增 raw draft/reset 接口未被操作规则准确承接。没有确认新的产品缺陷。T15 历史 done 与原证据保留，当前技能漂移须由 Root 依原 T15 owner 修订；本任务不重开其他票，不裁决 G-FINAL/T14。

仅新增本不可覆盖 REPORT；过程在 /tmp/huhu-final-ui-contract。未修改技能、产品、状态、Evidence、index、依赖或产物，未读原 Claude transcript，未构建、启动浏览器、访问用户库或执行模块矩阵。原始 88 项有界候选冻结始末 hash/mode drift=[]；额外 11 项直接调用上下文另列。完成报告与 return 校验后停止读写，释放全部审查冻结。

## 产物与验证

### 范围、权威与证据

Review-mode: source-files，审查当前五份 UI 技能源相对于最终生产合同的漂移，不是历史 Git diff，也不是所有模块实施结果重审。冻结范围是五源、直接日期/详情/Portal/编辑器侧栏/差异端口及必要设计和已有报告的有界集合；候选清单包含部分仅定位或预留而未逐行阅读的相邻测试，不据此宣称覆盖这些测试全部行为。

来源发现：无 PR/commit 比较，commit-message/source.md 步骤 not-applicable；显式来源为 TASK、Map revision 52、Goal、T15/AC-124、T15 Evidence、DESIGN revision 3（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）与 UI-002。标准为根 AGENTS、dev/ui、dev/testing、变更范围合同及共享双轴审查的 reviewer/source/reuse/risk/evidence/Fowler 规则。源码事实优先；没有靠关键词不存在或文档检查退出零判定语义通过。

初始清单 /tmp/huhu-final-ui-contract/snapshot.json，SHA256 a3c70f489ec0b20c2959aff1571dbb2a7ca4462d0f130f429836949669540118；最终清单 /tmp/huhu-final-ui-contract/final-snapshot.json，SHA256 bee01f6a01c39a94707b1e3e7eb39f6c65cc0d924e57393d8a61ea1bb79a0235；终审 /tmp/huhu-final-ui-contract/end-audit.json。均为本地过程路径，不入正式证据目录。11 个补充上下文在读取后冻结，不能声称已具备其读取前快照。

五源原始字节 SHA256（均普通文件 mode 0664）：

| 文件 | SHA256 |
| --- | --- |
| .agents/skills/ui/SKILL.md | 12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4 |
| references/design-system.md | 1c7ed53e651942b46a57440f4e8d14f24b323e0c57c216ceea79b1e5fa62c20c |
| references/shell.md | 1d816a031d8e2af6435666330e7d1795558a07fc4f142fa2aba13ae26bfa1247 |
| references/theme.md | c1de6aac62b8f40ad0d02602befddb32ec3bcda3508a179fdbea38b7a43e024d |
| references/motion-a11y.md | c5176fc786f8b2cc9033b5b60b5fc2e944ed6d34f5920108a295cfd3bf1d9c24 |

关键 API 当前 SHA256：DateField.tsx 6ec308ff795e1724baf22a27e016ab98b9db5956d89e1608bc975abddbc68fd2；DetailPane.tsx 830288ba2de1a98a3b62c966d872a78159be20eb1f5df9034bf89d7b935c0075；app/contracts/editor-context.ts c5a2de3f282d8351dd4f61e7c99275ff384fb6eedac8ae7727cc43262b900096；versioning/ui/diff/keyboard.ts 8dc703e02946e352c879f065bdad801ce83aff0938f6aaa08ee09bc7a5a12efc，均 0664。

### standards 输出

Reviewer: native:/root/final_ui_contract；Result: request-changes。

**UI-FINAL-01 / P2 / owner T15：把已交付生产端口继续描述为待实现缺口。**

- .agents/skills/ui/references/design-system.md:21,39,43,95 的日期表和后续说明没有列 MonthField，仍将月份控件交生产者扩展、提醒“不虚构 MonthField”“不预设 CalendarBackend 已存在”，末段还说 T16 的 DiffView/CompareEndpoints“不是当前可用组件 import”；SKILL.md:34 的共享缺口段及 shell.md:63 的版本行沿用交付前语气。其风险是后来维护者按技能再次提生产者缺口、绕过已实现组合，或用设计目标名字寻找不存在的公共文件。
- 当前 src/ui/components/huhu/date/index.ts:3 明确导出 MonthField/MonthFieldProps，date-value 导出 CalendarMonth/parseMonth/validateMonth；archives/ui/generic/PrecisionDateControl.tsx:67 已真实消费。共享 calendar/CalendarBackend.tsx、CalendarMonth.tsx 真实导出，navigator/ui/Calendar.tsx:153 与 diary/DiaryReader.tsx:164 已消费。完整产品月历仍不同于 picker，不能把这条有效边界一起删除。
- 差异真正端口是 src/modules/versioning/ui/DiffSurface.tsx、ui/diff/MultiDiffView.tsx、ConflictDiffView.tsx、CompareEndpoints.tsx；不能改成“已有通用 DiffView import”。前两者实际使用 FileDiff/CodeView、owner pool、当前主题与键盘包装。
- theme.md:29 还把 v1 删除写为 T12 待负责；当前 src/app/settings/appearance.ts:5,13 已是 EXPORT_VERSION=2 严格相等守卫。保留“先核对源码/测试再声称通过”的证据边界，去掉已失效的迁移待办事实即可。
- 最小满足条件：仅 T15 五源内更新上述当前导出、真实路径与已交付/仍有边界的区别，保留月份不补日、offset 不推 IANA、领域 owner、未知导出先查证等约束；不修改生产源或旧报告。修后核对正常调用与缺失端口反例，必要 docs 检查由新修订任务执行。

其余有界事实核对：tokens.css 的 paper/ink、Geist/Geist Mono/CJK 回退、12px metadata 下限、32/36 控件、44/52 列表、52/272/360 布局、120/180ms、2+2 focus 与四 reference 一致；Table 表头36/正文44或52、Button 五 variants 与六 sizes 相符。theme/settings 与 runtime 采用所属 Document 的 system→paper/ink、配对对比度整组回退，未发现技能要求回旧色板、全局宿主字体或旧 UI 预设。

### specification 输出

Reviewer: native:/root/final_ui_contract；Result: request-changes。

**UI-FINAL-02 / P2 / owner T15：新增日期 raw draft 的所有权和 reset 语义未写明。**

- design-system.md:36–41 要求无效输入阻止保存及外部 reset，却没有指出实际可用的 DateField draftValue/onDraftChange/draftResetKey 与 DateTimeField.onDraftChange。与最终 API 相比，这不再是只需生产者补接口的阶段。
- src/ui/components/huhu/date/DateField.tsx:14–17,42–53 的关键区别是：未传 draftValue 才用 localDraft；传了 parent raw 后，value 或 draftResetKey 变化都不会覆盖 parent raw。date-draft.dom.test.tsx:9 明确约束“parent raw survives unmount, ignores semantic changes”；navigator/ui/diary/SearchWritePanel.tsx:93 已将 writeRaw 与 writeDate 分开。只更新 semantic value 不能清除受控无效文本，也不能用重挂来模拟 reset。
- DateTimeField.tsx:17,30–53 会通知 raw date/time/timeZone，并按完整受控 value/initialTimeZone reset；其内部 DateField 的 draftResetKey 用于同日期、不同时间/zone 的 reset，不表示覆盖外部 draftValue。父表单需用 raw 通知暂停其他字段保存，不能等 onChange 才标无效。已有 DateTimeField.dom.test.tsx 包含 unrelated save、IME/clear 与同日期 reset 的语义测试；本次只读测试断言，没有运行它们。
- 最小满足条件：在日期参考中以当前真实 props 说明 parent raw 保留、提交值区别、两种 reset 所有权、clear/IME/无效 raw 的保存 guard；指向现有回归测试。无需新增控件、通用草稿框架或改领域 codec。该项依据 AC-124 的“最终代码无漂移/日期值可执行组合”，不是要求复制全部 props 文档。

UI-FINAL-01 同时影响 AC-124 的生产入口准确性，规范轴沿用其具体证据，不另造重复 finding。

以下重点没有发现需要改产品或重做模块的冲突：

- DetailPane 实际 leaf≥960 且 parent main≥1000 才 aside，其他为 Sheet、leaf<600 全叶宽；单一 portal child 在断点切换中保留，真实 close 才卸载。Sheet/dirty-modal 只有一个 requestOpen 确认链，取消继续保留表单；技能示例 props 与生产一致，不要求凭建议新增动作槽。
- EditorPanelHandle 的真实合同在 app/contracts/editor-context.ts:33，是 mount(container,documents,visible) 返回 setVisible/dispose。panel-host 的 visited forceMount+hidden/inert 保留实例，并显式跨 React 根传 visibility；history-panel-page 给 ContainerProviders 传 visible；versioning/module.ts 动态 import 保留最新 visible、closed/disposed guard 与重复 dispose 防护。shell 的隐藏与关闭、独立根无共享 context 规则方向准确。建议新 T15 修订顺手给这一已存在合同加精确入口，作为事实导航，不扩大生命周期重构。
- Portal 的 WeakMap<Document,refs> 与 providers 的 adoption 重订阅保持逐 Document 所有权；useLeafMetrics 的 owner 元素、可见性和实际叶宽符合技能；display:contents PortalRoot 不作几何边界。dirtyclose、IME、焦点返回不能因补 API 导航而放松。
- Pierre 最新 DiffSurface/MultiDiff 使用 useDensityRowHeight 与 inline --diffs-line-height，Shadow 可交互行实际由 compact32/comfortable36/coarse44 驱动；Multi itemMetrics 的 line/header/hunkSeparator 同步。静态 diff.css 的22px是基值，不能用它覆盖交互行后宣称命中通过。motion-a11y 通用32/44目标仍适用；新修订应点明该真实包装及数据槽/token桥，不泛称外层 CSS 能穿透 Shadow。
- MultiDiffView 的 F7/Shift+F7 只在本区域消费，shared IME guard 与 input/textarea/select/contenteditable composedPath 分支不拦；处理后 stopPropagation 避免 Pierre root 清 scroll target。keyboard.ts 在首次 gutter focus 建 owner，postRender 保持同 metadata/line/side，外焦/hidden/owner变化/卸载取消。技能“非全局键位”方向没有冲突；将“生产者目标”更新为现行 F7 与真实路径即可。

### 正常、近邻与失败走查及实际命令

正常任务详情可按 shell 示例定位 DetailPane 与 DateTime validator；档案月份走查暴露 UI-FINAL-01；自动化列表/详情沿既有领域 owner，raw 无效状态走查暴露 UI-FINAL-02；设置查真实 Button/Settings 与 strict v2；Git 需从目标名转为上述生产路径。普通产品问答、只讨论主题不触发 ui；纯服务修复遵 dev，不自动创建 workflow/Change/审批。不存在的组件先查导出再返生产者；错误 Document 的 Portal、中文溢出、IME 误提交及宿主必需项失败仍应由对应 owner 修复或保持待验收，不因规则通过消失。

实际命令为有限 cat/sed/nl/rg、Python hashlib/stat 冻结/重验；首次定位含几处不存在的猜测路径，rg 退出2后改用实际文件路径读取，未将其当成功。dispatch 校验命令：node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/projects/obsidian-huhu --scope-root .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign --session 20261105T094057Z --task 137-review-final-ui-contract --stage dispatch，实际退出0、errors=[]、warnings=[]。return 使用同参数 --stage return，完成写入后执行并由 Root 核验实际回执。

回读 T15 Evidence/065 是历史规则验收背景，未将交付前日期/Month/Diff事实复用为当前证明。回读 133/135 的原始独立报告，133 的 Shadow32/36/44、局部 F7 与 135 首次焦点闭环仅作为未变关键源码上的有界先前证据：当前 Multi/theme/keyboard 对应其精确 SHA；本次不冒称重新执行这些 Chrome 控制，不沿用其全部测试/环境为新的完整证书。没有重跑 docs：本次只读没有改技能/文档事实，当前语义漂移不能靠既有零退出消除。

## 问题与下一步

Root 可派新的 T15 窄修订任务处理 UI-FINAL-01/02，最小写集是原五技能文件中的必要章节；新增报告不覆盖本报告与旧 T15 Evidence。需保留原已成立的颜色、布局、命中、权限、领域与宿主边界，并按新实际差异定向复核，不重开已 done 模块票。技能源变化后由 Root 处理必要绑定/状态与 G-FINAL 的责任记录，本 reviewer 不写正式工件。

真实 Obsidian popout、实际 fine 硬件、系统剪贴板、全部页面领域行为、正式66矩阵与 T14 集成均未在本任务验证；此处没有全项目通过结论。

写报告后、释放前 Root 通知已应用136的52路径 T13 候选。独立 release-audit.json 重验本任务99项输入，仅 src/ui/styles/base.css 漂移：SHA256 d1587fda54a316bd78c16dab54f2f5aa5eb649d105a2be48029b61d5d21675ec → 485591d5cbd015aa31e761eb6b861209a08418a2b85f8abeffc5484c6ba7d5b2，mode仍0664。有限重读确认移除 nd-hit-size 适配后直接消费 hu-hit，命中规则方向不变；五技能及日期/详情/EditorPanel/Pierre核心均无漂移，两 finding 和既定语义核对不失效。Root 所述其余清理路径和即将重建的 styles.css 不在本次核心结论内，本任务不验证该52路径集成，也不冻结生成产物。原始 end-audit 的 drift=[] 只描述其记录时刻，不能用来否认这次已知改变。return 实际退出0、errors=[]、warnings=[]；完成回读后明确停止读写并释放冻结。
