# 技术栈、复用与升级决定（2026-11-05）

结论：保留 Obsidian 插件 + React + Tailwind + 现有 shadcn/Radix 单一组件系统，升级到宿主与工具链支持的最新稳定组合。新增依赖只有两项：日期 `@daypicker/react`，以及 Git 差异 `@pierre/diffs`（同时移除 `@codemirror/merge`，ADR-006）。日历、树、分屏、拖拽、终端和差异视图都用现成库，不另造。

下表记录设计审查当日 npm 官方 registry 的各包 latest 元数据及当时 package.json 声明，仅代表当时的调研与实施目标。后续 T-01 已实施工具链与基础依赖升级，实际版本和已验证范围见 package.json、pnpm-lock.yaml 与 evidence/T-01.md；DayPicker 和 diffs 的新增集成仍分别属于 T-03、T-16，不能视为已通过。原始响应留本地 /tmp/huhu-frontend-revision/versions.json。后续实施时再次查询并锁定准确版本。

| 包 | 审查时声明 | 当日 latest | 本次选择 | 许可证 |
|---|---|---|---|---|
| `react` | 19.2.8 | 19.3.1 | 19.3.1 | MIT |
| `react-dom` | 19.2.8 | 19.3.1 | 19.3.1 | MIT |
| `typescript` | ^5.8.3 | 7.0.2 | 6.0.3（lint 支持范围内最新稳定版） | Apache-2.0 |
| `esbuild` | 0.25.5 | 0.28.2 | 0.28.2 | MIT |
| `tailwindcss` | 4.1.13 | 4.3.4 | 4.3.4 | MIT |
| `@tailwindcss/cli` | 4.1.13 | 4.3.4 | 4.3.4 | MIT |
| `radix-ui` | 1.6.7 | 1.8.1 | 1.8.1 | MIT |
| `@daypicker/react` | 未安装 | 10.0.2 | 10.0.2 | MIT |
| `@headless-tree/react` | 1.7.0 | 1.8.0 | 1.8.0 | MIT |
| `react-resizable-panels` | 3.0.6 | 4.18.1 | 4.18.1 | MIT |
| `react-grid-layout` | 2.2.4 | 2.3.0 | 2.3.0 | MIT |
| `@dnd-kit/core` | 6.3.1 | 6.3.1 | 6.3.1 | MIT |
| `@tanstack/react-virtual` | 3.14.13 | 3.14.26 | 3.14.26 | MIT |
| `cmdk` | 1.1.1 | 1.1.1 | 1.1.1 | MIT |
| `sonner` | 2.0.7 | 2.0.8 | 2.0.8 | MIT |
| `lucide-react` | 0.577.0 | 1.69.0 | 1.69.0 | ISC |
| `typescript-eslint` | ^8.62.1 | 8.72.1 | 8.72.1 | MIT |
| `@pierre/diffs` | 未安装 | 1.6.4（2026-11-04） | 1.6.4（peer React ^18.3.1 \|\| ^19；依赖 diff 9.0.0、shiki ^3 \|\| ^4） | Apache-2.0 |
| `@codemirror/merge` | 6.12.3 | 6.12.3 | 移除（T-16） | MIT |

TypeScript 7.0.2 暂不选：typescript-eslint 8.72.1 的 peer range 为 `>=4.8.4 <6.1.0`；`npm view typescript@6 version --json` 返回 6.0.2、6.0.3，因此目标锁 6.0.3。升级 typescript-eslint 与 esbuild/类型声明时一起验证，不安装越界版本后靠忽略 peer 警告通过。原始依据：[TypeScript registry](https://registry.npmjs.org/typescript/latest)、[typescript-eslint registry](https://registry.npmjs.org/typescript-eslint/latest)、[TypeScript 6.0.3](https://registry.npmjs.org/typescript/6.0.3)。

React DOM 19.3.1 要求 React ^19.3.1，必须成对升级；Radix/DayPicker/panels 的 peer 均包含 React 19，仍须真实 DOM/Portal 测试。官方：[React 版本](https://react.dev/versions)、[React DOM 元数据](https://registry.npmjs.org/react-dom/latest)、[Radix 元数据](https://registry.npmjs.org/radix-ui/latest)、[panels 元数据](https://registry.npmjs.org/react-resizable-panels/latest)。

## 候选比较与取舍

| 能力 | 复用决定 | 比较与风险 | 原始依据 |
|---|---|---|---|
| 原语/组件 | 继续现有 shadcn + Radix | React Aria 同样成熟，但引入第二套 overlay/focus/collection 会增加一致性成本；不为重构换整套引擎 | [shadcn Date Picker](https://ui.shadcn.com/docs/components/radix/date-picker)、[Radix](https://github.com/radix-ui/primitives)、[React Aria](https://github.com/adobe/react-spectrum) |
| 日历 | @daypicker/react 10.0.2 | 采用官方首选 scoped 包；shadcn 旧 Calendar 模板不能直接当 v10 API。Air 仅离线原型，无 React/date/time 双生产实现 | [v10 升级](https://daypicker.dev/upgrading)、[日期时间组合](https://daypicker.dev/guides/timepicker)、[源码与 MIT](https://github.com/gpbl/react-day-picker) |
| 树 | Headless Tree + TanStack Virtual | 复用 keyboard/typeahead/controlled state；不用自写递归 DOM 导航。过滤、加载、虚拟化与领域分页各司其职 | [Headless Tree](https://headless-tree.lukasbach.com/features/tree/)、[ARIA treeview](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) |
| 分屏 | react-resizable-panels 4.18.1 | 3→4 API/尺寸单位有变化；所有 wrapper 和终端 resize 同一票迁移，不照搬旧 import | [官方源码与文档](https://github.com/bvaughn/react-resizable-panels) |
| 网格/拖拽 | react-grid-layout 2.3.0 + 既有 dnd-kit 6.3.1 | 沿用 widget schema/尺寸表与键盘排序；升级前检查嵌套拖拽及 Portal | [grid 源码](https://github.com/react-grid-layout/react-grid-layout)、[dnd-kit](https://github.com/clauderic/dnd-kit) |
| 字体/图标 | 随包 Geist/Geist Mono、Lucide 1.69.0 | OFL/ISC，离线可用；Lucide 0→1 检查命名/导入/包体与图标选择器，不加另一套图标引擎 | [Geist](https://github.com/vercel/geist-font)、[Lucide](https://github.com/lucide-icons/lucide) |
| 终端 | 现有 @xterm | 保留性能/取消/销毁，重做外壳与 token；不复制 GPL 终端实现 | [xterm.js](https://github.com/xtermjs/xterm.js) |
| Git 差异与历史比较 | `@pierre/diffs` 1.6.4 | 用户指定 diffs.com 技术栈（LOG-013）。分栏/堆叠、词级高亮、折叠展开、改动块接受/拒绝、合并冲突界面、多文件虚拟列表、选行与批注槽、Worker 池都是现成能力，取代现有 340 行 CodeMirror merge 包装与自写 Worker。比较过的候选：`@git-diff-view/react` 0.1.8（MIT，仍是 0.x）、`react-diff-view` 3.3.3（MIT，偏底层）、`diff2html` 3.4.56（MIT，静态 HTML）、`react-diff-viewer-continued` 4.4.0（MIT，无多文件虚拟化与冲突界面）。主要风险是 Shiki 语言目录在单个 CommonJS 产物里被整体打包，由 T-16 的语言白名单插件约束 | [diffs.com 文档](https://diffs.com/docs)、[npm 元数据](https://registry.npmjs.org/@pierre/diffs/latest)、[源码仓库](https://github.com/pierrecomputer/pierre) |

调研已核对核心候选 GitHub 最近两年有维护活动、未归档和明确许可；shadcn/Radix/DayPicker/Headless Tree 为 MIT，React Aria 为 Apache-2.0。此前的日期/候选维护证据见 evidence/report-design-audit.md；这里只复用方案，不复制来源不明代码。新增/改编文件在使用处保留来源、revision、许可与 NOTICE，不能仅在本报告集中署名。

## 实施版本与宿主约束

T-01 负责依赖/lock/构建/lint 与 runner 基础；T-02 负责 Radix/Tree/Lucide wrapper，T-03 DayPicker，T-08 grid，T-09 panels/xterm，T-10 编辑器侧栏宿主，T-16 `@pierre/diffs` 接入、语言白名单与 Worker 构建，以及移除 `@codemirror/merge`。生产包分层与懒加载维持，React、DayPicker、`@pierre/diffs` 与 shiki 都不进入同步启动闭包。

Tailwind 4 面向现代浏览器；最低 Chromium/WebKit 能力以[官方兼容说明](https://tailwindcss.com/docs/compatibility)为准，需核对项目支持的 Obsidian Electron 与移动 WebView，尤其 container query、@property、color-mix。不能只拿本机 Chrome 版本宣称所有宿主支持；不符合时明确最低宿主版本或选最新满足当前宿主的稳定组合。当前不添加另一套 CSS 回退引擎。

安装后必须验证：peer/engine 无未解释冲突；类型/lint/build；新 API 组件 DOM；DayPicker locale/时区/多 Document；panels 尺寸/键盘/xterm resize；图标导入/许可；懒加载与包体。未经过这些验证前，选型标记“实施目标”，不得写成已集成。

036进一步读取了 [固定1.6.4发布包](https://registry.npmjs.org/@pierre/diffs/1.6.4)：官方高亮池处理已解析metadata，原始双文本解析仍同步；React冲突组件回调、行号键盘和多Document有具体适配接缝。T-16现已明确最小领域API、按窗口池所有权、必要的薄parser Worker、先实测再作源守卫适配，以及主包/所有Worker的语言与后端图验证。保留库选择与现有读取上限，不复制diff/虚拟化/Worker池引擎，不将peer或静态源码审查写成已通过运行验收。

## 产品月份日历的实施复用接缝

055/056依据固定10.0.2公开Day/DayButton、controlled month等API比较两种形状，选择T-05在既有calendar/**写集中交付无业务薄基座，picker与产品Month各自skin/内容；Lead让已验收date/Calendar复用该基座并重验原行为。不是新增依赖，也不把picker props扩成任务领域联合。私有完整月份/兄弟任务按钮证明不替代1–5周条、PageUpDown/周边界、领域周号及窄宽产品验证；这些由T-05交付、T-10消费。原始官方依据：[公开组件组合](https://daypicker.dev/guides/custom-components)、[受控月份](https://daypicker.dev/docs/navigation)、[月份与网格](https://daypicker.dev/docs/grid-and-months)。

## 实施预算补充：内嵌资产解包（2026-11-06）

实际源码诊断主包9555624 bytes（门8252416），其中原官方高亮Worker传输字面量917629 bytes、主图Shiki语言580926 bytes；8份实际公开grammar JSON共752859 bytes，标准gzip为97112 bytes。问题来自静态资产重复内嵌，不能删除批准语言或提高预算。

比较维护中的 [fflate](https://github.com/101arrowz/fflate/blob/master/README.md) 与 [pako](https://github.com/nodeca/pako/blob/master/CHANGELOG.md)：均提供浏览器同步gzip解压，可保持Pierre同步workerFactory；pako仍在2026-10更新（MIT AND Zlib），fflate发布包0.8.3于2026-07更新且为MIT，提供函数级导入。选用[fflate 0.8.3发布元数据](https://registry.npmjs.org/fflate/0.8.3)，不复制实现或新增解压引擎。声明的包体优势只是候选理由，最终以本仓库实际图/字节决定，不把上游benchmark当HUHU实测。

仅处理已锁定构建资产，不处理用户文件或改diff/语法语义；同步解包在懒加载入口，须报告耗时并验证不进入启动/模块activation闭包。保留原脚本与grammar的完整输入路径、上游包许可、守卫和两Worker图。失败/取消/ownerWindow清理、字节回环与8语法真实输出必须验证；若达不到预算继续按实际闭包优化，不降功能或抬门槛。过程样本仅本地/tmp，最终结果由T16/T14 Evidence回读。
