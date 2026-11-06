# 任务回报

Session: 20261105T094057Z
Task: 067-implement-t06-archives
Status: completed

## 聚焦交接

native:/root/implement_t01，既有 gpt-6.1-sol medium，未委派。此为完整 T-06 作者候选交接，不代表票已通过独立高审或最终浏览器验收。所有35个拥有的源码、测试及夹具已冻结；后续问题须经Lead协调释放。未改core/schema/codec/api、其他service、共享词典/组件/资产、正式状态或Git；没有运行浏览器、安装依赖或写用户vault。

冻结目录 /tmp/huhu-t06-implementation/frozen；清单 /tmp/huhu-t06-implementation/frozen-sha256.json，SHA256 0c34a0ac3e85c5536c71f7680a12d112aa81096a3f349526e4c5057bcb3acbf6。原始29文件基线 /tmp/huhu-t06-implementation/baseline.json 及 baseline/；当前24修改、6新增、5保持原样、0删除。保持原样的现有组件继续被新页面真实调用，不另藏旧renderer。

共享生产者均由Lead实施：PanelTree.data分页加载、SidePanel按叶/feature的有界展开与搜索恢复、MonthField精确月端口及en/zh词典。此候选直接消费已确认契约，无私有展开store或兼容分支。Lead可开始独立高审与390单样本；最终native/E2E仍待验收。

## 产物与验证

### 实际行为与DesignConformance

- 档案主界面保留真实类型/视图→记录导航、表格/卡片、搜索/筛选/排序、实际空态、读取失败/重试、单个FormSession编辑及底部dirty动作条。布局使用语义token和所属容器断点；Person导航、布局选择改为共享SegmentedControl，表单/错误/确认复用共享FormField、Notice、Checkbox、DateField、MonthField和原有Dialog生命周期。
- 服务树通过既有query分块（每次≤500）读取全域搜索结果后分页，返回真实loaded/total、稳定节点ID；无假“加载更多”节点。选择项在属于当前投影时保留，非命中项不伪装搜索结果；每次load取最新index，读取错误原样拒绝供SidePanel重试。没有singleton分页/展开状态。
- 全13种字段仍走原schema/FormSession/codec，包括递归table、decimalstring+currency、资源/关系、隐藏/只读字段及归物生成字段。table修改只替换目标sourceIndex，保留未知行属性、未知values及其他无效恢复行，不以渲染过滤重写数据；10000行上限仍在。
- 日期/月/混合精度直接消费共享族；切换月→日产生待补全原始值，不发明day1。raw草稿实时进入FormSession，非法日期会阻止旧合法值保存。offset datetime拆分日期/时间/offset编辑，未改部分保留原秒、分数及Z/±HH:mm拼写，无IANA/epoch或分钟截断。关系起止日期保留精度标签。
- 实体与关系草稿串行保存；保存期间防重复提交/离开，晚到回调不会关闭已失效编辑器。确认归属当前可见编辑实例，隐藏/卸载时取消，避免重复dirty确认。读取重建/失败时保留相同查询的最后成功类型、修订、记录与表格DOM；不同查询不借用旧计数，不把不完整读取显示成真实空态。
- DefinitionStudio保留各定义种类、预览/发布/升级及现有fingerprint/receipt守卫；资源列表保留导入、分页、部分失败、修订/回收操作；恢复面板、Person纪事、Belongings KPI/生命周期/年度报告、目录设置继续调用真实领域动作。新增年度报告导航复用现有懒加载报告。没有虚构sharingScope、实体导出服务、30天回收或领域迁移。
- UI002仅提供版式/状态约束；生产字段及动作是来源。原有领域数据、baseHash/schemaRevision、提交回执与三方合并保持原实现。5个无需改动的源文件是原有公用呈现/状态工具，本票没有为追求全部文件差异而无关重写。

### 冻结文件

新增：

- `scripts/ui-review/fixtures/frontend-redesign/T-06/index.mjs`
- `scripts/ui-review/fixtures/frontend-redesign/T-06/index.tsx`
- `src/modules/archives/services/generic/workbench.test.ts`
- `src/modules/archives/ui/generic/PrecisionDateControl.tsx`
- `src/modules/archives/ui/generic/RevisionPanel.tsx`
- `src/modules/archives/ui/generic/field-precision.dom.test.tsx`

修改：

- `src/modules/archives/services/generic/workbench.ts`
- `src/modules/archives/ui/belongings/BelongingsPage.dom.test.tsx`
- `src/modules/archives/ui/belongings/BelongingsPage.tsx`
- `src/modules/archives/ui/belongings/report/BelongingsReport.dom.test.tsx`
- `src/modules/archives/ui/belongings/report/BelongingsReport.tsx`
- `src/modules/archives/ui/belongings/report/report-i18n.ts`
- `src/modules/archives/ui/generic/ArchivePage.tsx`
- `src/modules/archives/ui/generic/DefinitionStudio.tsx`
- `src/modules/archives/ui/generic/FieldDesigner.tsx`
- `src/modules/archives/ui/generic/FieldRenderer.tsx`
- `src/modules/archives/ui/generic/QueryBuilder.tsx`
- `src/modules/archives/ui/generic/RecordEditor.tsx`
- `src/modules/archives/ui/generic/RecoveryPanel.tsx`
- `src/modules/archives/ui/generic/RelationPanel.tsx`
- `src/modules/archives/ui/generic/archives-generic.dom.test.tsx`
- `src/modules/archives/ui/generic/common.tsx`
- `src/modules/archives/ui/generic/feedback.dom.test.tsx`
- `src/modules/archives/ui/generic/workbench-page.tsx`
- `src/modules/archives/ui/person/PersonJournal.tsx`
- `src/modules/archives/ui/person/PersonOverview.tsx`
- `src/modules/archives/ui/person/PersonReadingPage.dom.test.tsx`
- `src/modules/archives/ui/person/PersonReadingPage.tsx`
- `src/modules/archives/ui/person/common.ts`
- `src/modules/archives/ui/settings-page.tsx`

保持原样：

- `src/modules/archives/ui/ArchiveCardGrid.tsx`
- `src/modules/archives/ui/generic/hooks.ts`
- `src/modules/archives/ui/generic/page-state.ts`
- `src/modules/archives/ui/labels.ts`
- `src/modules/archives/ui/settings-page.dom.test.tsx`

### 实际验证

过程文件均在 /tmp/huhu-t06-implementation；报告不把过程材料入库。

| 检查 | 结果 | 原始材料 |
| --- | --- | --- |
| pnpm exec vitest run --project dom src/modules/archives/ui | exit0，7文件40测试通过 | dom-final.log |
| pnpm exec vitest run src/modules/archives/services/generic/workbench.test.ts | exit0，3测试通过 | paging-final.log |
| pnpm exec eslint src/modules/archives/ui src/modules/archives/services/generic/workbench.ts | exit0，零警告 | lint-clean.log |
| pnpm run test:architecture | exit0，1384模块无边界/懒加载/宿主/desktop/barrel/cycle违规 | architecture-final.log |
| pnpm exec tsc -p /tmp/huhu-t06-implementation/tsconfig.json | exit126，383诊断/119文件，拥有范围0诊断 | types-final.log、types-final-summary.json |
| pnpm exec vitest run test/golden | exit126，23通过/1失败；Home appearance旧快照与当前theme默认值不一致 | golden-final.log |
| node --check T06/index.mjs、git diff --check拥有范围 | exit0 | syntax-final.log、diffcheck-frozen.log |
| 原runner精确单样本副本 --check | exit0，真实production graph/adapter守卫通过，计划1例，未运行浏览器 | preflight-frozen/result.json |

TypeScript配置包含所有拥有源码、测试、夹具和现有全局声明，沿用 --skipLibCheck；未屏蔽自身代码。诊断来自未完成迁移的agent/home/safe/task等传递依赖。黄金快照失败为test/golden/user-formats.test.ts的named appearances：预期eye-care，实际system/source/accent/density/uiSize/motion；未改快照或相关实现。上述两项不能声称全局绿色。初次ESLint包含仓库配置忽略的fixture目录而失败；改跑实际受管生产范围后零警告，fixture由syntax/tsc/真实构建守卫覆盖。最终两处lint清理仅去除多余类型断言/依赖，不改行为。

TDD/负控：paging-red→paging-green验证1201条分页、>500值搜索、选择保留及读取失败重试；precision-red→precision-green验证月份/混合精度与offset原文，后续真实RecordEditor非法日期阻止保存。table-preservation-red→green验证未知属性、无效恢复行及未编辑行身份保留。visibility-guard-negative暂移除可见性守卫会留下隐藏编辑器确认；read-retention-guard-negative暂移除缓存守卫会丢失自定义类型/原表格行，两者恢复后最终40DOM通过。早期read-retention-red/green含测试fixture缺labelKey的设置错误，保留日志但不作为产品红绿证据。

### Native协议与输入冻结

夹具使用真实ArchivesApplication、内存文件端口、编码记录与两个独立Document的真实HuhuProviders/ArchivesContent/SidePanel；初始化1201记录、13字段、Person/Belongings及资源。驱动保留表格/卡片/空态、树分页/全域搜索、真实编辑/非法草稿/保存失败重试、日期/月键盘、IME、关系/修订/资源/报告/设计器/恢复/设置及清理断言。移动样本隐藏导航侧栏以模拟内容区，并非声称完整Shell复测。部分复杂管理操作以已有DOM/domain验证为主；native中只访问的页面不冒称已端到端执行全部动作。

私有单例driver /tmp/huhu-t06-implementation/driver-390coarse.mjs，SHA256 5adb5408bcd359111c5873627bb7ca6cf113030614ec4bb932339850f3cd7f53；它只对原runner做绝对路径与原矩阵390/zh/paper/coarse/mobile/reduce精确过滤，未改共享runner或生产组件。调用须带 --suite frontend-redesign --ticket T-06 --matrix redesign --out <独立目录>。此前遗漏参数的Usage失败保留，不计验收。

最终 --check 2611输入，inputDigest 2e160d45e67ca0d6d8e4c1f43cdf53239b828ab0f663183c6d2d7cde2fdc3f51；所有当前输入（含ASAR app.css）重算drift[]，见 frozen-input-verification.json。当前共享styles.css SHA256 8abca67e08b4dcac858751ca5894bace9c31590bb94adf49b7e02f2db68af1eb。零执行matrix cases是--check的预期，plannedCases确为1，绝非浏览器成功证据。

## 问题与下一步

1. 等待Lead真实390样本、完整矩阵、输入一致性与高审；本作者未获运行浏览器权限，也未运行。发现实际失败后按新协调任务处理，不在冻结候选上静默修补。
2. 全局类型迁移债与Home黄金快照差异已列实证，需Lead按其拥有范围处理或正式记录；本票未越权改其他模块/共享快照。
3. 本报告后的源码、测试和夹具保持冻结；没有正式done、Evidence或绑定编辑，没有提交/推送/发布。独立审查及Lead验收前T-06仍待验收。
