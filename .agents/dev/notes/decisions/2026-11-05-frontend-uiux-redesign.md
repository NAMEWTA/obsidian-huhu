# 前端替换、主题与差异阅读

状态：Accepted；承接日期：2026-11-11。来源日期与 ADR 编号保留为 2026-11-05。

来源：[原 ADR 与完整取舍](../../archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/ADR.md)、[最终独立审查](../../archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/final-review.md)。本次仅迁移与提炼，未重跑历史产品验收；源码定位检查基于工作区 HEAD `df1e642`。源码不证明历史动机，后者以原 LOG 为准。

## ADR-001：一次替换前端，不建双轨兼容

组件、CSS、布局与 UI 状态合同一次替换，不留旧 UI 开关、样式回退或旧 UI 状态读取分支。领域服务、文件事务、数据根与密文仓库仍由原 owner 拥有。双轨会使旧选择器与测试混用，代价是需要原子集成和一次性测试库；不因此获得清空用户真实库的授权。主题导入遇旧格式明确拒绝。

## ADR-002：统一日期组件族

DateField / DateRangeField / DateTimeField 使用 DayPicker v10 与 Radix Popover，原型 Air Datepicker 只承载视觉规格。相较 React Aria 或直接迁入 Air Datepicker，选择与现有 React、Portal、测试同栈的组合；代价是需核对 v10 API、locale、所属 Document、本地日和时区。原比较与版本证据见来源 ADR-002 及 reuse-decision.md。

## ADR-003：自动化列表与详情并列

列表常驻，详情宽 360px，窄容器用覆盖 Sheet；启停只用共享 Switch。完整运行历史与新建仍为独立页面。详情切换不可卸载列表或丢筛选与滚动；失败恢复真实启停状态，不以乐观显示冒充成功。

## ADR-004：HUHU 主题优先，跟随宿主可选

纸／墨两套 HUHU 主题默认生效，强调色默认墨青；可选跟随 Obsidian，组件始终只消费语义 token。完全跟随宿主无法保证对比度，完全独占又割裂宿主体验，因此承担两种模式的验证成本与安全回退。正文对比度 ≥7:1、次级文字 ≥4.5:1、控件边界 ≥3:1。

本条取代旧 DESIGN-0002 DS-002 的主题优先级，不删除旧规则仍有价值的语义 token、作用域与可访问性原则。旧快照见[历史设计](../../archive/notes/design/INDEX.md)；当前完整规格见[设计背景](../context/frontend-design.md)。

## ADR-005：页面服从真实领域与支持的依赖组合

任务字段、通知／投递／收件箱、档案与体检修复权限均服从现有领域 owner，不因复刻原型扩大业务合同。来源清单与覆盖表是查漏依据；采用工具链支持的依赖组合而非强装越界版本。此条的差异阅读选型部分由 ADR-006 取代；原“尚未开始实施”只是当时阶段描述，非当前状态。

## ADR-006：统一采用 Pierre 差异阅读

versioning 差异、历史比较、冲突展示与 hunk 操作采用 `@pierre/diffs`，替代 `@codemirror/merge`、自写折叠 widget 和旧 diff-model；宿主编辑器的 CodeMirror 扩展不受影响。选择依据是现成多文件虚拟化、选行、hunk 操作与冲突能力，其他候选比较保留在来源 ADR-006。

代价与负向保证：Shiki 限定语言白名单并用 JS 后端，其他语言纯文本回退；复用 blob Worker 构建；差异按需加载且不得进入启动闭包；预算调整需实测与理由；保留 Apache-2.0 NOTICE。所属窗口、Worker 释放、主题矩阵和全部写回路径均需验证。用户数据、Git 语义与恢复回执格式不变。

已定位实现：[DiffSurface](../../../../src/modules/versioning/ui/DiffSurface.tsx)、[Worker 所有权](../../../../src/modules/versioning/ui/diff/owner-pool.tsx)、[主题映射](../../../../src/modules/versioning/ui/diff/theme.ts)。
