# T07 自动化完整 UI 替换候选

Session: 20261105T094057Z
Task: 072-implement-t07-automations
Status: completed

## 聚焦交接

交付原 medium 实现角色的T07候选并冻结，等待high独立审查、新CSS及Root原生验收；不宣布T07或任何Gate完成。没有委派、浏览器、共享源码/词典/资产、依赖、Git/index、用户vault或正式状态写入。T05/066/071候选及其报告没有修改。

基线HEAD37fcede4210a19bcc2a74809e7fdd301e5717957；原50个自有文件原字节、模式和备份保存在 /tmp/huhu-t07-implementation/before.json 与 before/。最终59个自有源/测试/fixture、36项相对基线变化、0删除，完整SHA256与模式在 /tmp/huhu-t07-implementation/final-candidate.json。新增与修改仅限 automations/ui/**、core/schedule/zoned-occurrences.ts及邻接test、T07 fixture；原共享日期、host契约、字典及构建由Root拥有。

### 实际入口与能力

- workbench-page→AutomationPresentation→AutomationsPage。WorkbenchTarget是唯一业务选择；键盘focusedRow独立临时状态，不再将旧selected当业务选择持久化。筛选/搜索/排序/滚动列表保持同一节点，definition概览/运行记录、单run及缺失深链置于真正DetailPane；new/all-runs独立section，底层列表隐藏保留。leafWidth及日期boundary取实际useLeafMetrics。
- 现有定义编辑走canonical Dialog；RetainedEditorDialog在隐藏时仅将同一表单portal移入hidden/inert stash，释放Radix层，重显保持表单/草稿/输入选择。EditorView仍是工作台新建、编辑和公开composer的同一表单，没有保留旧列表替换详情renderer或另写键盘/模态引擎。
- 公共openComposer保持原返回saved/undefined、action/source/prefill/link/ownerWindow/AbortSignal契约。它用同一个RetainedEditorDialog与canonical Dialog，跟随实际owner Document、隐藏和移除；关闭/中止/卸载释放观察器、窗口事件和根。iframe不等于真实popout，实际物理adoption仍待Root原生控制。
- 用户离开只有既有DiscardDialog一次决策。Page guard合并并发请求，Keep editing保留同一真实草稿；same-feature navigate/restore及Root新增binding.canClose使用同一guard。单纯隐藏不确认；module/availability/native卸载只清理，不伪称可否决Obsidian SDK onClose。

完整保留七种action及registry切换共享text：agent（agent/稳定Space/cwd/prompt/session fresh-reuse-specific/账号与会话引用/extraArgs）、script（Space/cwd/script/shell）、notify、obsidian-command、open-file、open-url、create-task。保留模板、source-bound限制、widget固定计划、grace、precheck命令/shell、notifyOn、in-app/system channels、enabled/device/revision语义、source/link；URL normalization、Space beforeSave复核和失败保留原输入不删。

列表与详情的同id操作共用真实Promise锁、disabled/aria-busy及最新service snapshot；enabled-only只save enabled，未调用stop或捏造revision/CAS回执。失败在右Sheet内部也可读，取消新选择后的迟到结果不会导航。Editor每次相关await检查mounted/visible/signal/输入版本，保存后从真实service.definitions读取stored，再执行save-and-run；不存在时不以旧draft冒充存储成功。保留显式stop、retry、rerun、删除偏好/保留历史、状态筛选及50条继续加载。calendar retry沿原run/delivery身份，未改为新manual run。

## 产物与验证

### 日期与领域轴

resolveWallTime仅新增可选 `{disambiguation:'reject'}` 和 AutomationWallTimeError.reason 四稳定码；枚举候选算法复用原实现，默认fold earlier、scheduler的fold双偏移/gap跳过不变。AutomationTimeField是领域epoch与共享DateTimeField的薄适配：raw draft问题阻止不完整/无效输入下保存旧有效值；once显示zone临时保留、不新增持久zone；recurring.start/timezone保留原schema。create-task.date是DateField纯日，不做UTC/epoch往返；optional time、timezone和原有absolute reminderAt独立保留/可编辑，不从trigger推断deadline。

真实ScheduleSpec只有manual、once.at、recurring.expression/start/timezone。**无结束日期能力**：没有添加假end、UNTIL、COUNT或新格式；recurring显示实际不支持结束日期说明。此为批准范围的DesignConformance处置，不把未实现领域字段伪装成已有。

Root已提供实际Map23 canClose共享端口、DateTime同日raw reset修复及16对en/zh词典；本实现只消费，未越界写共享源。其独立审查/最终原生接受仍归Root。本地真实表单测试基于已交付生产者字节，而非mock日期validator。

### 红绿与实际检查

- time-red.log：原resolver不提供strict稳定reason、接受归一化无效日期；新增单元转绿，保留default earlier=05:30Z、scheduler fold下一偏移06:30Z、gap跳过等控制。
- list-red.log：旧detail替换列表节点且没有共用pending锁；新列表/右详情及同idPromise控制转绿。detail-error-red.log再锁定错误原先只在Sheet后面的page上；修复为实际详情内也显示失败。
- 6个redesign DOM控制通过：同一搜索/滚动列表、列表/详情pending+最新truth不stop、一次合并dirty决策、隐藏保留同一form/selection、迟到run不替换新选择、迟到save不关闭/覆盖下一editor草稿。
- 8个真实EditorView/SchedulePicker或task reminder→AutomationService→JsonStore/memoryVault联合控制通过：NY2026 gap/fold原始值保留、无任何保存写入；UTC/Shanghai保存精确epoch。once未持久zone，task纯日/时间/时区/reminder与manual trigger分别验证。time-form-first.log中4失败为全页重复错误文本selector；改为实际field内部断言后8全部通过，未改预期值/validator。
- `pnpm exec vitest run src/modules/automations`：退出0，22文件162测试通过，module-final.log。包含全部现有automations领域/服务/动作/表单测试；旧风险未删除。mock UI port的save改为发布实际snapshot，用于UI时序；域证明另用上述真实service/repository，二者不混称。
- `pnpm exec tsc -p /tmp/huhu-t07-implementation/tsconfig-fixture.json`：退出0，types-final.log。覆盖自有UI、严格resolver、测试及生产fixture导入图，不声称全仓类型通过。
- `pnpm exec eslint src/modules/automations/ui src/modules/automations/core/schedule/zoned-occurrences.ts --max-warnings 0`：退出0，lint-final.log。相关变更Prettier与scoped git diff --check退出0。
- 规范runner `--suite frontend-redesign --ticket T-07 --matrix redesign --check --out /tmp/huhu-t07-implementation/preflight-final`：退出0，preflight、2603 inputs、cases=0、errors=[]、digest48333db4990d0a0ea3be39856bd51e382b2eed941fe202547ec8f7fff368b750；真实guarded Radix/Sonner counts，不是原生矩阵通过。

既有日期旧DOM selector迁移保留风险：datetime-local整值改为实际date/time分控件并断言原epoch；纯日DateField显式blur提交；暂停后的filter断言按最新service真实enabled=false验证，未继续依赖旧mock不发布状态；changed composer取消现在必须有实际一次Discard决策。

### Source / DesignConformance及fixture

使用HU canonical Button/Switch/Badge/Select/Dialog/AlertDialog/DetailPane/Notice/Date族，迁移旧不支持variant/size与10/11px元数据，图标按钮放独立HU-hit cell；普通表单label14、metadata至少12。保留原许可/署名与模块归属。实际像素、44命中、focus2/+2及320/200%仍待新CSS实际运行，不将源码class当像素验收。

T07 fixture导入真实createAutomationsPage binding、AutomationService、JsonStore、memoryVault与ThemeRuntime，七action定义及真实notification run；没有视觉clone、UI假validator或写用户vault。协议覆盖两Document、真实IO gate/failure/重复阻止/右Sheet错误、列表身份、retained编辑/IME/Date popup内层Escape/单次dirty、320实际叶与原触控±21.5、1440/390 empty/refresh-loading/no-results/error/unavailable/failed/missing/unsupported状态及清理。loading是实际refresh Promise保留列表；初次module创建loading属于共享Shell availability，没有虚造T07 service.loading字段。unsupported明确模拟宿主Platform及运行能力port，不宣称真实Android或桌面进程。外部agent/command/source效果仅端口；实际领域保存/状态发布是真service。

这些原生协议尚未执行。未运行浏览器、完整66、CSS/插件build或真实Obsidian popout；未提交、不改依赖。全部原日志/输入/快照只在 /tmp/huhu-t07-implementation，未放Evidence。

## 问题与下一步

完整59源/fixture冻结并交回，等待high独立源码审查、Root新CSS/source receipt、实际bounded native及最终矩阵。共享Map23 producer的独立接受也尚未由本报告代替。任何实际反例保留并进入后续窄修，不把162 Node/DOM通过或--check当原生命中/焦点/像素通过。

本次没有已知失败的自有适用检查；原生与真实宿主验收明确待办。T05已知真实44命中问题仍归独立后续TASK，不在072偷改。Root可据此候选安排审查，并另派T05修复。
