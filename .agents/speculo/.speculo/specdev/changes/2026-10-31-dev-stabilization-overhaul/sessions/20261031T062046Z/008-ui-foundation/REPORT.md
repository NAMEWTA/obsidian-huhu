# 任务回报

Session: 20261031T062046Z
Task: 008-ui-foundation
Status: completed

## 聚焦交接

T-23 实施候选已交回，completed 仅指 worker 候选完成，不表示 Ticket 已验收。新增 DesignScope 内容叶边界、单一来源 token、真实生产 ComponentGallery 接入和可复用独立 UI runner；没有第二套 UI/通知运行时。最终 worker 候选 `docs/e2e/dev-overhaul/ui/T-23/candidate-3/result.json` 为 passed，48 例、55 张图、13 组交互、runtime errors=[]，命令 exit0，自然完成 59.435 秒。所有生产与 runner 输入已冻结，Lead 已接手正式同命令 E2E；worker 不再写实施输入。

## 产物与验证

### 修改及行为

- `src/ui/styles/tokens.css`：新增 `.huhu-ui.huhu-design` 的间距、字体尺寸、控件尺寸、圆角、焦点、动效、输入边界和可访问主色 token；旧 `.huhu-ui`/`--db-*` 不变。用户 `--nt-primary/foreground` 优先；默认宿主亮主题主色白字原对比 3.425，scope 中提升至至少 6.637。
- `src/ui/styles/base.css`：仅 scope 内应用批准外观；复杂 `:not` 排除嵌套未接入 `.huhu-ui`，不用需要新最低版本证明的 `@scope`。新增控件边界/命中区/焦点和流内通知规则；不覆盖 Select sm 的显式高度，保留默认 Textarea 64px，仅为 min-h-0 编辑格补足命中下限。
- `src/ui/react/design-scope.tsx`：独立 ownerDocument portal lease；NoticeOutlet/useDesignNotice 使用现有 Toaster、Sonner 原生 toasterId，同一 store、唯一区域 id、显式通知 id 命名空间、所属消息清理、迟到回调保护。
- `src/ui/react/gallery.tsx`：唯一生产接入是设置的 components 分类下 ComponentGallery；它不承载 Browser。现有三处通知接入叶级出口，页标题 20px。基础 Button/Input/IME/Slot/cn 实现不重写。
- `src/ui/react/design-scope.dom.test.tsx`：StrictMode 生命周期、双 Document portal 独立释放、通知 id/卸载/迟到回调隔离。
- `scripts/ui-review/run.mjs`、`run.test.mjs`、`fixtures/T-23.tsx`、`fixtures/T-23.mjs`：公共生命周期/矩阵/摘要/截图与 Ticket fixture 分离；真实生产组件、主/第二文档、真实键鼠及 IME、ConfirmDialog 异步失败重试。缺依赖/缺 fixture 非通过，不静默 skip。结果先落盘再回收 Chrome，清理失败保留失败状态及路径。
- `docs/e2e/dev-overhaul/ui/T-23/`：命令日志与退出码、失败链、矩阵图、最终输入摘要、冻结文件核验和集成说明。详细入口/边界见 `implementation.md`，逐条实际命令见 `command-results.md`。

### 最终有效验证

环境：Node v26.11.1、pnpm 11.1.3、Google Chrome 153.0.8010.47；HEAD `86c500556db1d64865c4cc7f1aff1dd83de071fa`。见 `environment.json`。

| 验证 | 实际结果 | 证据 |
|---|---|---|
| `node scripts/ui-review/run.mjs --ticket T-23 --matrix standard --out docs/e2e/dev-overhaul/ui/T-23/candidate-3` | exit0，48 例、13 交互、55 图、errors=[] | candidate-3/result.json、candidate-3.log/.exit |
| 三文件定向 Vitest（scope/foundation/button） | exit0，3 文件 21 测试 | dom-final.log/.exit |
| `pnpm exec tsc --noEmit --skipLibCheck` | exit0 | typecheck-final.log/.exit |
| 生产 TSX 定向 ESLint | exit0，零警告 | lint-verified.log/.exit |
| `node scripts/lint-css.mjs`（最后 CSS） | exit0 | css-hit-final.log/.exit |
| `pnpm check:styles` | exit0 | check-styles.log/.exit |
| `pnpm test:i18n` | exit0，35 字典、6345 keys | i18n.log/.exit |
| `node --test scripts/ui-review/run.test.mjs` | exit0，3 测试 | cli-fixed-input.log/.exit |
| 原冻结清单 hash | 172 文件均未变 | candidate-files.json |
| 源差异空白检查 | exit0 | environment.json |

最终 runner inputDigest：`1b3cb6b2e17481dd20acccdd8a1ae92664f67489b3e188b0416878bcb7b5a20b`。已实际检查窄容器通知和保存失败截图；顶部 notice 确实占位，失败文本持续可见，输入保留且可重试。汇总见 `candidate-summary.json`：最低文字对比（primary/input text）6.637/12.191，input/Checkbox/Switch 边界最低 5.099，focus 最低 3.426；最大完整页面高度 10886 CSS px。

### 矩阵的实际组合与替身

48 = 3 个窗口宽度（420/600/1440）× 2 语言 × 4 主题（宿主亮/暗、真实 Pearl 用户亮/暗）× 2 压力组合。第一组合为 100%、fine、正常动效；第二组合为 200%（CSS viewport 减半，deviceScaleFactor 2）、coarse、reduced-motion。没有运行缩放/指针/动效三个轴的全部笛卡尔乘积，不宣称覆盖未运行交叉项。单独交互另在 420px/fine/reduced-motion 下验证主/第二文档弹层归属、Tab 圈定、Esc 归还、菜单箭头、Tabs、Tooltip 键盘/悬停、真实 hover/active 几何、IME、保存 busy 防重入、失败保留/重试、用户与宿主字体优先级、宿主 0ms、通知隔离与清理。

14 种异步状态使用真实组件的调用方输入样板；实际异步事务采用真实 ConfirmDialog。外部替身只有 Obsidian createDiv DOM 扩展与离线读取的 app.css；独立测试页面解除宿主固定 body 高度/contain 以拍完整页面。第二文档是同源 iframe，不冒充真实 Obsidian popout；没有启动 Obsidian 或访问 vault。

### 失败与修复证据

保留所有原日志/退出码；本环境非零 shell 常报告126，未重写成通过。scope-red 是缺入口的搭建失败，不算行为 red。有效行为 red 包括默认 primary 3.425、Checkbox 边框 1.271、asChild anchor coarse 高36、短文本 Button 宽43.78125、Textarea cell 高42；均修实现，没有降低目标值或删除断言。candidate-2 的 main/other 全部 targets 已逐项筛选，当时仅剩 Textarea cell 一项。Select sm 的统一高度覆盖经自查删除，新增 fine32/coarse44 验证。

早期 runner 修复了不存在 data-slot 的定位、宿主滚动/contain 对全页截图的影响，以及 Chrome profile ENOTEMPTY 清理使结果丢失的问题。preview-6 整轮不算通过；旧 profile 已清理并留日志。preview-7/8 旧36例通过不代替最终48例；最终候选以 candidate-3 为准。完整失败链见 implementation.md。

### Skill Execution Records / Design Conformance

实际应用 dev（hash `9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7`）、ui（hash `ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff`）与 SpecDev I 风险适配方法；先检查真实组件、Portal、ReactSurface、Browser/Home/Agent 共享消费者，再消息列影响。design_ref revision2 digest `566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b`，页面 UI-GALLERY，AC-351/AC-352。DS-006 明确允许颜色过渡，故不沿用旧 skill 的 transform/opacity-only 限制；采用 `min(host fast,120ms)` 保留宿主更短/0ms 与批准上限。没有重新选风格或用原型截图冒充生产。

复用仓库既有 shadcn/Radix/DS 组件、现有 Sonner 和已有 CDP/esbuild adapters；本票没有下载/复制新的上游代码，没有新增依赖，原组件的作者/许可证注记保留。没有新增必须由 Lead 写 docs/references.md 的第三方复制条目。

## 问题与下一步

- Lead 正式固定输入 E2E、test:ui-styles/test:ui-runtime、最终构建与预算尚由 Lead 验收；worker 不自行标 Ticket done。第一轮混合 wave1 main.js 为 8,255,650B，超过预算3234B，见 `docs/e2e/dev-overhaul/bundle/wave1-report.json`；不能把 esbuild exit0 写成预算通过。最后 Lead 生成 styles.css 为1,441,440B，CSS预算余352B；main.js 仍须最终重建/量化。未提高任何预算。
- 旧全局 token、Tailwind 默认、db 别名、未接入控件和 Document 全局 Toaster 因冻结消费者保留，不声称全局迁移完成。后续票仅在非 Browser 内容叶接入；不得包 ShellRoot/PageFrame children/PageSlot/Agent/Home 整树，T-36 再清理无冻结消费者的旧定义。详见 implementation.md。
- 未执行真实 Obsidian 宿主内验证；未覆盖所有任意用户自定义配色或全部压力轴交叉组合，不能据此声称这些均已通过。无 Git index/commit/push/checkout、远程写入或 Browser 专项诊断。

worker 的生产、runner、fixture 写入已停止，全部自启进程自然结束并回收；下一安全动作是 Lead 审查当前固定候选和正式 E2E 结果。
