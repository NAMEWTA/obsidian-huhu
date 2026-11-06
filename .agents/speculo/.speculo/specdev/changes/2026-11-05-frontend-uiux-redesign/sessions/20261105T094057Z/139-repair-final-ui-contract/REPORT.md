# T15 最终 UI 合同窄修订候选

Session: 20261105T094057Z
Task: 139-repair-final-ui-contract
Status: completed

## 聚焦交接

实施者 native:/root/cleanup_final。仅修137的UI-FINAL-01/02两项P2技能事实漂移，未发现或修复新产品问题。沿当前AGENTS、dev/ui、skill-maintenance与139授权执行；无委派。正式仓库唯一写入本不可覆盖REPORT，未写T13的52路径、产品/样式、DESIGN/原型、状态/Evidence/index、永久知识或旧报告，未读原Claude transcript，未触碰真实vault/账号、未提交。Root是五技能的正式单写应用者。

精确候选五源：.agents/skills/ui/SKILL.md及references/design-system.md、shell.md、theme.md、motion-a11y.md。只改必要当前事实；保留原metadata、许可/来源、权限与设计/领域/测试边界。入口只导航到日期/日历/Pierre现行参考；详细值与草稿规则留在design-system，主题严格版本在theme，键盘/命中在motion-a11y，EditorPanel事实导航在shell。

## 产物与验证

真实before来自当前正式五源，入口SHA12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4与137一致；before/candidate全副本位于/tmp/huhu-final-ui-rules，各普通文件原mode0664。只读核对date/index、MonthField、DateField、DateTimeField、CalendarBackend/ProductCalendar/CalendarMonth、档案PrecisionDateControl、Navigator Calendar/DiaryReader/SearchWritePanel、appearance parser与测试、EditorPanel合同、DiffSurface/MultiDiffView/ConflictDiffView/CompareEndpoints/keyboard/theme、use-density。既有137完整发现与适用未变规则复用，不重做产品研究或浏览器验收。

修订内容：

- MonthField与CalendarMonth月份值类型、parseMonth/validateMonth已真实导出，档案直接消费；严格YYYY-MM不补日，区别calendar/CalendarMonth产品组件。列出CalendarBackend薄DayPicker基座、ProductCalendar与CalendarMonth产品包装及Navigator/DiaryReader调用，保留picker不等于完整月历、周条键盘与领域周号边界。
- Git按真实DiffSurface、ui/diff/MultiDiffView、ConflictDiffView、CompareEndpoints定位，不创造通用DiffView import；保留领域写入/端点/回执边界。明确区域F7/Shift+F7、MultiDiffView的IME/composedPath输入排除与stopPropagation、Shadow通过token/数据属性桥及compact32/comfortable36/coarse44实际行高和同步虚拟度量，静态22px不充作交互命中证明。
- appearance当前EXPORT_VERSION=2与kind/version严格比较、无效preset/editor拒绝，移除T12未来待办语气；指向现有v1拒绝、v2往返、未知版本/ID负控制，文档不冒作测试通过。
- DateField语义value/onChange与父raw draftValue/onDraftChange分开；父raw跨卸载保留，value/draftResetKey不覆盖受控raw，父自己reset；只有本地非受控文本按value/resetKey同步。DateTimeField通知原始date/time/timeZone，按完整value/initialTimeZone reset，内部resetKey处理同日期不同time/zone且保留节点焦点。父表单按raw/required/IME/clear阻止旧有效值随其它字段保存，合法clear不一概报错。不承诺每个有效pick的回调全序，也不新建草稿引擎。
- shell只补app/contracts/editor-context.ts的mount(container,documents,visible)返回EditorPanelHandle→setVisible/dispose及panel-host入口，未扩大生命周期要求。

日期回归只读断言：date-draft.dom.test.tsx的parent raw跨卸载/忽略semantic变化/IME/clear，DateTimeField.dom.test.tsx的raw通知、unrelated save、IME/clear与同日期time/zone reset。正常档案月份、Navigator月历与父raw写入已沿真实调用核对；近邻ISO offset/秒精度仍不推IANA或截秒；未导出的通用DiffView仍禁止猜测，未知格式、无效raw、错误Document和必需宿主失败边界未放松。普通问答/只讨论主题仍不触发实现流程，技能没有新增工作流或审批。

冻结产物独占创建且只读：

- /tmp/huhu-final-ui-rules/ready.patch：SHA256 de4efdba2f7568a262cc102b89eacb30d8d288ef6f31bb97408813f3fc3bd082。
- /tmp/huhu-final-ui-rules/ready-manifest.json：SHA256 e4f416f7bb007b17a292cd65c3069735997632550d43ae8894f2aa6a22d896db。5条精确路径，每源before/after SHA256、mode、metadata_preserved及入口frontmatter摘要。
- 冻结时五源正式before匹配，候选after核对一致；无覆盖既有冻结文件。过程self-review.diff只留/tmp。

实际验证：

| 命令/检查 | 实际结果 |
|---|---|
| GIT_DIR=/home/wta/projects/obsidian-huhu/.git GIT_WORK_TREE=/tmp/huhu-final-ui-rules/docs-tree node scripts/verify-docs.mjs | 退出0，docs.log；docs-tree为当前正式副本覆盖五候选，Git仅提供只读忽略规则，无依赖安装或工具改造 |
| git diff --no-index --check /tmp/huhu-final-ui-rules/before /tmp/huhu-final-ui-rules/candidate | 退出1、无输出（存在差异）；不把该退出冒称0 |
| git apply --check --whitespace=error /tmp/huhu-final-ui-rules/ready.patch | 退出0，正式源可应用且无新增空白错误；未应用 |
| before/after SHA、mode、frontmatter比对 | 五源匹配；入口metadata原文相同 |

一次exec调用曾因docs-tree尚未创建而在进程启动前失败，未执行命令或写入；从存在的正式根建立私有副本后验证正常。没有为此改环境工具、依赖或正式源码。

## 问题与下一步

候选交Root应用、刷新必要T15绑定并按137两finding独立窄复验。return0；本任务不是独立review，未运行测试/类型/lint/build、正式66、真实Obsidian/popout或其它产品/E2E矩阵，纯文档回执不宣称产品、T14或全仓通过。原060–065及137历史报告保留；不自行写正式Evidence或推进状态。

完成return校验后停止全部读写并释放。
