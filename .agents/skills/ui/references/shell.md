# 工作台与页面组合

设计权威见 [ui 入口](../SKILL.md)，模块/数据归属见 [dev 架构](../../dev/references/architecture.md)。实际装配：`src/app/workbench/compose-workbench.ts`；契约：`app/contracts/workbench.ts`、`workbench-host.ts`、`workbench-state.ts`；运行：`shell/host/workbench-surface.tsx`、`workbench-pages.ts` 与 `ShellRoot`。用这些生产端口，不另造路由或叶子类型。

## 叶子、面板与详情

标准布局为 Rail52、Header52、Panel默认272（220–480）、Detail默认360（最大440）；具体令牌取值由 tokens.css 维护。`shell/layout.ts` 按实际叶宽分 wide≥960、medium600–959、narrow<600，不按整个 viewport 或“手机”推算可用宽。wide 可内联导航，medium 导航为覆盖层，narrow 从页面菜单打开 Rail/导航 Sheet；无 Panel 的功能不留空第二栏，但窄宽仍有导航入口。能力是否支持另查 manifest/runtime，不能因为宽度小就关闭功能。

- useLeafMetrics 的实际导出在 `src/ui/react/use-leaf-metrics.ts`，返回 element/width/ref；可传明确逻辑叶元素，或将 ref 放叶内页面根。Portal 失去 DOM 祖先时显式传 owner，不能把窗口宽或 PortalRoot 当叶宽。
- DetailPane 在 `huhu/DetailPane.tsx`，必需 leafWidth；还测量父 main 的实际可用宽。leaf≥960 且 main≥1000 才内联，否则 Sheet；leaf<600 使用整叶宽。不要只看 leaf≥960 就硬挤内联详情。
- 切 aside/Sheet 保持同一编辑 child，不按断点重新 key 或重挂表单；选择、草稿、焦点、滚动保留。列表刷新/开详情不卸载列表，关闭才释放该详情。dirty/onDiscard 与领域已有离开 guard 只有一个决策链，不双重确认或忽略失败。
- PanelModel 的主操作、分区/树、过滤/search.query、行 target/select/menu/active 直接复用；PanelContext 必需 ownerWindow。对象选择与树展开分离，行“⋯”和右键动作一致；不恢复 folderClick 私有协议。默认展开集合不等于允许无界或跨叶共享手动展开。
- 拖宽预览不保存，释放才提交；取消恢复、第二指针不抢捕获；双击复位默认、键盘8px、Home/End到边界。分隔目标不能覆盖相邻行操作或页面。

模块 ui/ 内的列表+详情组合示例；translatedTitle 已翻译，editor/list 的业务类型和保存留给模块：

```tsx
import type { ReactNode } from 'react';
import { DetailPane } from '../../../ui/components/huhu/DetailPane';
import { useLeafMetrics } from '../../../ui/react/use-leaf-metrics';

export function RecordLayout(p: {
  logicalLeaf?: HTMLElement | null; translatedTitle: string;
  list: ReactNode; editor: ReactNode; open: boolean; dirty: boolean;
  onOpenChange(open: boolean): void; onDiscard(): void;
}) {
  const leaf = useLeafMetrics(p.logicalLeaf);
  return <div ref={leaf.ref} className="flex h-full min-h-0">
    <section className="min-w-0 flex-1">{p.list}</section>
    <DetailPane open={p.open} leafWidth={leaf.width} title={p.translatedTitle}
      onOpenChange={p.onOpenChange} dirty={p.dirty} onDiscard={p.onDiscard}>
      {p.editor}
    </DetailPane>
  </div>;
}
```

日期弹层传同一 leaf.element 作 collisionBoundary；跨独立页面/导航 React 根要把逻辑所有权明确传递，不靠假想共享 context。

## 页面与恢复

`PageCreate(context,target,state,signal)` 返回 WorkbenchPageBinding：surface、navigate，以及可选 getTarget/getState/restore。ReactSurface 继承 NativeSurface 并拥有一个根；模块从 `api.ts` 获取服务。`context.changed()` 通知路由/标题/有界状态变化，不在 render 中启动终端、创建数据或执行命令。

- `chrome: standard` 默认带标题/导航/页面菜单；`none` 页面自备身份与 openPageMenu 入口，必要时 togglePanel。专注模式仍是同一种工作台叶子，保留“在工作台中打开”；传实际 ownerWindow，成功打开目标后再 detach。
- UI 持久封套是 `huhu-workbench-ui/1`：schema、route、navigation {width,open,lastRoutes}、mode、pageViews。模块状态只保留贡献 stateKeys 允许的有界键，不恢复旧 target/focus/panelOpen/panelWidth/lastTargets/pages 封套，不双写兼容键；领域 schema/机密过滤不因 UI 换版改变。
- 导航到其它功能使用该叶 lastRoutes；当前功能有 Panel 才切导航开合。失败/关闭模块、设备不支持、缺失资源分别呈现可恢复状态；首页/设置保留入口。没有 panel/navigationContext 不隐式生成一列。
- 隐藏页 hidden+inert、setVisible(false)，保留根与实例，暂停轮询/不可见测量；releaseWhenHidden 只按贡献声明。关闭、模块停用或取消时卸载，释放订阅/Portal/监听/异步回执。页面错误边界不带走 shell。
- 编辑器侧栏通过 `app/contracts/editor-context.ts` 的 EditorPanelContribution：`mount(container, documents, visible)` 返回 EditorPanelHandle。宿主跨独立 React 根显式调用 setVisible 暂停/恢复，dispose 才释放；装配见 `app/editor-panel/panel-host.tsx`，不能假定页面 context 自动穿过根边界。
- 原生 DOM adoption/窗口迁移中用所属 Document/窗口重订阅、测量和恢复；保留同一页面/列表节点及可见、隐藏滚动区。浏览器迁移造成的零滚动不能冒充用户复位；只在真实归属边界恢复，不在每次 render 抢滚动/焦点。
- 叶子失去活动焦点不等于不可见。打开新原生标签/分屏前关闭旧菜单；代次/卸载校验防止旧回焦抢新叶焦点。终端恢复只展示占位或明确恢复按钮，用户点击后才启动 CLI。

## 产品组合与领域完整性

按批准 DESIGN §6 和覆盖清单维护“实际入口→表面/状态→领域字段/动作→fixture”映射；共享模板的复用不能代替目录逐项覆盖。下面是组合约束，不代表每个模块已完成替换，更不是可虚构 API 的模板：

| 页面 | 组合与不能丢的行为 |
|---|---|
| 首页 | 12栏网格，编辑布局才出现手柄/移动/移除/撤销；五类卡模板承接真实小组件。18内建+14章节的字段、允许尺寸/多实例取 `home/core/board/widget-table.ts` 和各实际设置，不统一编造尺寸。今日任务与任务页共用完成态；calendar目录归日历生产者，其它Home组合由Home owner接入 |
| 任务 | 日期分组列表/看板/日历、搜索/完成筛选/日期范围/排序、自动保存右详情。保留 title/description/timezone/due/planDate/reminderAt/recurrence/file-folder-archive relations。持久状态仅 open/completed/cancelled，overdue为投影；不引入project/priority/tags/doing或UI任务库。完成保存中禁止重复，成功约1.4秒留行再按筛选移除并提供领域可用撤销；重复实例由task域创建 |
| 日记/导航器 | 周期笔记投影，月历+本月列表、日书页和前后翻天、缺日显式创建；保留原周期路径、周起始/周号/笔记动作、批注与历史入口，不从日历展示偷偷创建笔记 |
| 档案 | 类型→记录树+views/management；表格/卡片/同一编辑session、关联/修订、人物阅读/纪事、归物KPI/生命周期/年度报告、五种定义/发布/升级、资源/恢复中心。text/markdown/integer/decimal/money/boolean/date/datetime/select/multiselect/strings/file/table共13类及递归table、稳定rowId、false/0/null/missing、金额字符串、月精度/offset秒由原schema/codec保真。dirty底条不重挂输入；分页/已加载量与错误重试明确，不只搜前500就报全库无结果 |
| 自动化 | 无二级栏；列表+概览/运行记录右详情、运行日志、编辑Dialog；新建和全部运行记录独立页面。深链缺失保留列表；启停真实异步失败回滚，不取消已开始运行。保留现有 triggers/actions/targets/schema，不把旧页内编辑器当设计要求 |
| 智能体 | 工作区会话导航、标签、终端/分屏、等待横幅、会话右详情与历史/收件箱/账号/用量。无结构化CLI提问协议时只定位终端，不假造统一允许/拒绝；窄宽改变布局而非模拟桌面进程能力 |
| 通知与收件箱 | 系统通知为投递/未读状态与来源；智能体收件箱为会话待处理信息；Home闪念/收集入口属于Home。三者归属、计数与动作不能合并。通知打开即已读并同步轨道/状态栏，不改投递领域 |
| 保险箱 | 锁屏/解锁、分类/快速取密、遮罩/显示/复制、领域错误；清剪贴板只在仍匹配本次值时，锁定清明文。保留宿主与加密边界，不臆造剩余次数或移动端支持 |
| 版本/历史 | 更改分冲突/未暂存/已暂存；历史/合并父提交、A/B端点交换、Git接入与同步暂停、笔记历史/revision-review。浏览不改HEAD/index。暂存/还原/冲突、恢复前检查点/确认及条件撤销交领域；DiffSurface/MultiDiffView、ConflictDiffView 与 CompareEndpoints 按实际端点组合，入口与边界查design-system，不虚构通用DiffView |
| 体检 | 只读扫描、明确incomplete/skipped/locked/unavailable/部分成功；仅注册owner的可用修复，预览后确认，不把扫描或解锁状态当写授权 |
| 设置/内容 | 分组搜索、命中高亮、标签说明与控件、完整现有设置字段；受管文件加载更多与来源窗口打开。外观导入只接受当前源码格式的规范见theme，不借改版新增持久兼容层 |

五类卡模板分别是时间/统计、记录表单、导航/内容、媒体、设置：统计加载保持尺寸且局部报错；表单按领域数值/正文校验；内容搜索与选中独立；媒体固定比例并区分解码/网络错误；设置控件来自真实enum/boolean/number/path/color及其范围、默认、可见条件。应用通用/外观取 `app/settings/react/` 与 `theme/settings.ts`，其它取模块settings入口与navigator的settings-productivity，不抄演示默认值。

状态统一区分 normal/empty/no-results/首次loading/刷新保留/error/unavailable/busy；骨架只用于首次加载。加载、保存和取消来自实际 Promise/能力状态，不用定时器伪造进度。按实体串行/合并保存，草稿代次与 expectedRevision 独立；晚到成功/失败不覆盖新输入，冲突/失败保留草稿及重试。只有领域提供有效逆操作才显示撤销，恢复草稿/放弃/离开确认沿原 owner。

## 原生状态栏

工作台不新增 footer。`app/workbench/surfaces/obsidian-status.ts` 经 addStatusBarItem 注册主窗口状态栏，段来自贡献 statusSegments，经 status-segments.ts 汇总；StatusSegment 的 id/icon/label/order 与可选 tone/count/target 使用真实已翻译数据。

用量根在 `shell/status-bar/mount-usage.tsx` 懒挂 ContainerProviders，DropdownMenu 内显示真实提供方与刷新/显示偏好；没有提供方不画占位。段/用量右键原生菜单的 app.statusBar 偏好及现有功能保持。主窗口只注册一次，popout不复制，服务消失/停用/卸载时完整释放。手机无原生状态栏，页头最多三个状态芯片；自绘顶部也保留该入口。F6、菜单和焦点详见 [motion-a11y](motion-a11y.md)。

## 生产组件验证入口

检查范围仍按 [dev唯一验证选择表](../../dev/references/testing.md) 和当前票风险决定，不要求每次局部修改跑全矩阵。已有T04生产fixture可从仓库根执行下例；将输出换成本次未使用的临时目录：

```sh
node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out /tmp/huhu-ui-review-t04-example
```

当前票的fixture由对应生产者在 `scripts/ui-review/fixtures/frontend-redesign/` 交付，Lead在稳定输入上验收所需矩阵；新票fixture未交付时不能只替换ticket参数就声称可执行或通过。命令末尾加 `--check` 只读取宿主样式、编译fixture、检查适配器并记录计划/输入，结果status为 `preflight`，不启动浏览器、不执行浏览器断言或exercise；退出0不能记作矩阵通过。

该runner使用真实生产组件、生成样式和宿主app.css；同源iframe证明第二Document行为，不是真实Obsidian popout。vault、原生叶子与窗口、插件启停等受影响宿主边界仍按dev选择表验收，不能由组件矩阵替代。
