# UI 技能独立前向试用

Session: 20261105T094057Z
Task: 062-forward-test-ui-rules
Status: completed

## 聚焦交接

已仅依据当前 ui 技能初始五源快照和原始产品源码，交回任务详情、档案树/记录编辑、自动化列表/检查器、设置表单、Git历史A/B比较的可实施方案及最小组合。方案保留真实领域字段/动作、批准布局、状态/草稿/回执所有权，并将尚无生产导出的日期精度和Git包装明确交原生产者，没有写成可用import。真实生产imports的示例严格TypeScript检查通过；实际时间解析探针发现任务和自动化均拒绝gap但静默选择fold较早时刻，不能满足技能的“严格拒绝gap/fold”句子。纸面交付已完成，未实施业务功能或宣称产品/宿主验收通过；T-15正式完成由Lead判断。

## 产物与验证

- 实施方案：/tmp/huhu-ui-forward-test/implementation-plan.md（包含五类页面、真实类型/props、最小写集、字段/动作、失败恢复、共享缺口、验证范围与近邻路由）。
- 最小组合：/tmp/huhu-ui-forward-test/examples.tsx。实际导入TaskView、EntitySummary、AutomationDefinition、RevisionRef、VersioningQueries、SyncSettings、DetailPane、TaskContent、Tree、FormField、日期与设置控件；没有伪造MonthField/DiffView/CompareEndpoints导出。绝对路径仅便于临时类型检查，移回所属模块ui时按实际位置改相对导入；不是完整业务编辑器。
- 来源路由：/tmp/huhu-ui-forward-test/read-sources.md。技能首先导向DESIGN §3–7、UI-002相关组合与frontend-coverage，再导向task/archives/automations/settings/versioning的ui/API/schema、共享导出和dev测试参考；只读相关片段。没有读取先前session报告或其它reviewer结果，没有委派。
- `node node_modules/typescript/bin/tsc -p /tmp/huhu-ui-forward-test/tsconfig.json`：退出0；仅noEmit检查临时示例及真实依赖类型。结果日志/tmp/huhu-ui-forward-test/types.log为空，未生成仓库构建产物。
- `node /tmp/huhu-ui-forward-test/probe.cjs`：退出0，使用已安装esbuild把两个真实生产解析模块打到/tmp再执行8个输入；脚本与日志分别/tmp/huhu-ui-forward-test/probe.cjs、probe.log。NY 2026-03-08 02:30均报错；NY 2026-11-01 01:30均返回2026-11-01T05:30:00.000Z；UTC及Asia/Shanghai正常值分别得到12:30Z及04:30Z。这是时间函数观察，未经过组件表单、TaskService.execute或AutomationService，不作为联合验收。
- 五份初始输入精确字节快照：/tmp/huhu-ui-forward-test/skill-snapshot/（保留SKILL.md与references目录结构）；启动hash清单/tmp/huhu-ui-forward-test/skill-start.sha256。返回前`sha256sum -c`退出0，五源全部OK；实际输出/tmp/huhu-ui-forward-test/skill-return-check.log。本次评估没有技能漂移。

| 原始来源 | SHA-256 |
|---|---|
| .agents/skills/ui/SKILL.md | 12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4 |
| .agents/skills/ui/references/shell.md | 83969ee1794f7d0f5350a6ca557e9e7b0875fa02cf8389c3598598962bcc4f5d |
| .agents/skills/ui/references/design-system.md | 1c7ed53e651942b46a57440f4e8d14f24b323e0c57c216ceea79b1e5fa62c20c |
| .agents/skills/ui/references/theme.md | c1de6aac62b8f40ad0d02602befddb32ec3bcda3508a179fdbea38b7a43e024d |
| .agents/skills/ui/references/motion-a11y.md | c5176fc786f8b2cc9033b5b60b5fc2e944ed6d34f5920108a295cfd3bf1d9c24 |

近邻路由结果：普通产品使用问答不启用UI实施/验收；纯服务存储修复用dev/领域检查，只有实际UI改动才组合ui；只讨论主题不启用实现流程，真正修改/审查theme/CSS才启用。读取ui本身不创建Change或审批。各任务入口与引用均能定位，未遇到缺文件导致无法规划；没有把批准原型当现有生产API。

本次未运行build/lint/产品DOM/截图/真实Obsidian/popout/可信触摸/完整服务或Git流程。仓库业务只读，只有本不可覆盖REPORT写入；全部生成代码、bundle、原始日志、快照均留/tmp。产品实现与验收范围已列方案，候选交回不等于产品验收。

## 问题与下一步

1. **规则与真实时间域冲突（已实际复现）**：ui设计系统参考要求沿已有解析器严格拒绝gap/fold；task/core/time.ts.wallTime与automation/core/schedule/zoned-occurrences.ts.resolveWallTime都选择较早fold。交T-03及task/automation领域owner明确拒绝或显式消歧端口/合同；不能用现wallTime成功当严格拒绝证据，也不能由消费者复制时区引擎。DESIGN §7允许拒绝或显式消歧，技能这句比设计更窄。
2. **真实领域未映射决定**：批准自动化描述有“结束日期DateField”，实际ScheduleSpec没有end；现TaskRecurrence才有end。交T-07/设计owner澄清该表面，不能添加不持久的假控件或未经授权扩schema。
3. **共享生产者接缝**：月份/mixed精度及档案含秒/小数/offset时间无对应日期导出；DateTimeField无外层无效草稿通知（DateField已有onDraftChange，可直接复用）；DetailPane无headerActions/footer槽；Git DiffView/CompareEndpoints和任意端点多文件目录统计尚未交付。方案给出建议类型、消费者、owner及回归，但没有把建议接口作为真实import。Panel树分页优先用已有sections/PanelItem.select，不把无footer直接升级为阻塞。
4. **当前消费者迁移事实**：档案workbench仍用limit500并返回当前PanelTree没有的folderClick；自动化edit替换列表；Git仍用CodeMirror merge且CompareWorkspace仅commit端点；appearance.parseExport仍接受v1。技能能把这些目标与现状分开（尤其明确外观v1删除属T-12），本次未修实现/技能。

下一安全动作是Lead核对方案与本任务结果，对上述领域未决点交原owner，继续能独立实施的组件/布局/状态工作。普通任务无需由本试用另造Change/Ticket/审批；正式T-15完成与产品验收由原负责工件判断。

本REPORT一次写成，写后立即执行validate-dispatch.mjs的return阶段；真实退出码由本次工具回执/最终返回提供，不回改报告。该结构校验只证明派遣身份/文件结构，不认证产品或T-15完成。
