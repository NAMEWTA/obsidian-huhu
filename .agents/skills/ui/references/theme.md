# 全局主题

代码：`src/theme/settings.ts`（`theme` 设置命名空间、有效风格解析、body 类名和变量）、`src/theme/runtime.ts`（主窗口和每个弹出窗口的应用与撤除）、`src/theme/custom.ts` + `color.ts`（自定义颜色与对比度）、`src/theme/styles/`（色盘、字体、Markdown 装饰，以及 `suliworld-ui.css`、`suliworld-editor.css`、`github-editor.css`）、设置页 `src/app/settings/react/appearance/`（风格选择、真实阅读预览和个人排版）。来源与许可见 [SuliWorld](../../../../docs/third-party/suliworld.md) 和 [GitHub](../../../../docs/third-party/github-theme.md)。

## 工作方式

普通色盘覆盖 `body` 上 Obsidian 的变量；SuliWorld 界面与 SuliWorld/GitHub 编辑器还使用受限的结构选择器。结构规则必须限定在对应激活类下，随切换或卸载撤除，不改写宿主主题或用户 CSS 文件。以下设置独立保存，由 `resolveTheme` 解析有效组合：

| 设置 | 类名 | 内容 |
|---|---|---|
| 界面主题 `theme.preset` | `huhu-themed` + `huhu-theme--<id>` | `default` 没有类名也没有覆盖；`custom` 另外在 `<body>` 上内联 `--nt-*` |
| 编辑器风格 `theme.editor` | `huhu-editor-themed` + `huhu-editor--<effectiveEditor>` | Markdown 颜色；SuliWorld 界面加 `follow` 解析为 SuliWorld 编辑器，其他 `follow` 读取界面色盘 |
| 内容结构与标题／加粗 | `huhu-md-style--github/suliworld`、`huhu-md-headings--<style>`、`huhu-md-emphasis--highlight` | 标题为 scheme 时使用有效方案默认；plain 撤除标题装饰，accented 替换风格默认，避免叠加 |
| SuliWorld 专属选项 | `huhu-theme-variant--cream/forest`、`huhu-theme-cards`、`huhu-md-quotes--plain`、`huhu-md-embeds--plain` | Cream/Forest 属于一个主题族；卡片按 dark/always/never 选择，移动端不启用；引用/嵌入选项只对有效 SuliWorld 编辑器生效 |
| 字体 `theme.fontInterface/Text/Mono` | `huhu-font-<kind>--<id>`；自定义字体另有 `--huhu-user-font-<kind>` | 见 `fonts.css` |
| 字号、行高 | `huhu-theme-font-size` + `--huhu-user-font-size`、`huhu-theme-line-height` + `--huhu-user-line-height` | 字号只作用于笔记区域 |

**界面主题**：`presets.css` 里每个主题是 `.huhu-theme--<id>.theme-light` / `.theme-dark` 两个块，只声明 `--nt-*` 令牌（背景、前景、卡片、弹层、主色、次要、强调、危险、边框、输入、焦点、侧栏、窗口框、图表 1–5，以及 `--nt-faint`、`--nt-link`、`--nt-highlight`、`--nt-destructive-foreground`），不含 `body`，因此带这两个类的任何元素都能预览该主题（设置页色卡就是这样画的）。基础映射规则 `body.huhu-themed.theme-*` 把 `--nt-*` 映射到 Obsidian 变量（`--background-*`、`--text-*`、`--interactive-*`、`--color-accent*`…）；HUHU 令牌（`src/ui/styles/tokens.css`）读取同一批 `--nt-*`，没有时回退到 Obsidian 变量，所以“默认”主题下 HUHU 面板直接跟随 Obsidian。看板的 `--db-*` 从这些令牌派生，没有自己的主题。

**编辑器配色**：`editor-schemes.css` 里每个方案是 `.huhu-editor--<id>.theme-light|dark`，声明 `--ne-*`（H1–H6、加粗、斜体、高亮、行内代码、代码块语法、链接、引用、列表符号、标签、分隔线、复选框和色卡预览变量）。映射规则把它们转成 Obsidian 的 Markdown 变量。一般“跟随主题”从 `--nt-*` 推导；SuliWorld 加跟随使用独立的 SuliWorld 色盘和内容结构。默认界面加跟随、默认排版时不覆盖宿主；独立选择编辑器不改变界面风格。

**结构与表面**：`markdown.css` 保留通用标题/加粗微调；`suliworld-editor.css` 和 `github-editor.css` 负责标题层级、代码、表格、引用、Callout 等内容。装饰限 Reading 与 Live Preview；源码模式保留文本与语法色，不能隐藏标记或修改任务字符。SuliWorld 绿色嵌入、桃色引用、Callout 与 H4 胶囊分别拥有与背景配对的前景变量，嵌套时不能直接继承外层的文字、链接、标题或强调颜色。深色代码块继续使用自己的语法色。

**Forest**：只在侧栏、图标轨和导航器拥有的表面使用深绿背景与独立前景。正文、一般 muted 控件和 body 下的 Portal 保持各自色对；导航器移到中央叶子或另一个 Document 后仍须自己绑定语义变量。看板背景、圆角、透明度和毛玻璃保持局部覆盖。

## 界面主题

精选入口与循环命令共用 `CYCLE_THEME_PRESETS`：`default`、`suliworld`、`pearl`、`claude-code`、`eye-care`、`custom`。其余 `soft`、`graphite`、`cobalt`、`sage`、`amber`、`blush`、`vscode`、`idea`、`xcode`、`jetbrains`、`cursor` 收在附加色盘；稳定 ID 和既有配置仍有效。完整目录以 `THEME_PRESETS` 为准。`.huhu-theme--obsidian` 只用于“默认”色卡预览，不是可选主题。

## 编辑器配色方案

精选 `follow`、`suliworld`、`github`、`claude-code`、`eye-care`，附加色盘为 `one`、`solarized`、`nord`、`dracula`、`gruvbox`。SuliWorld/GitHub 是独立的内容结构；经典色盘共用宿主基础结构，不为近似配色增加完整主题。

## 测试

`src/theme/presets.test.ts` 检查色盘与局部表面的对比度，不降低既有门槛：正文 7:1，普通文字/标题 4.5:1，淡色文字/交互标记 3:1。`custom.test.ts` 验证自定义推导；`settings.test.ts`、`runtime.dom.test.tsx` 验证解析、类名/变量和多窗口清理；`suliworld-scope.dom.test.tsx` 验证 Forest 表面。`test/host/computed-surface.test.ts` 用真实 Chrome 检查嵌套内容的最终色对，不能用仅解析 CSS token 的断言代替层叠检查。真实 Obsidian 的三种编辑模式、中文输入和多窗口由 `scripts/obsidian-acceptance/theme-matrix.mjs` 等验收；DOM 和 Chrome 结果不代表已经完成宿主验收。

## 添加主题或方案

1. 界面主题：把稳定 ID 加入 `THEME_PRESETS`，在 `presets.css` 声明两种模式的完整令牌集合，在 `src/shared/i18n/lazy/appearance.ts` 添加 en/zh 标签；明确是否进入精选目录和循环命令。
2. 编辑器方案：把稳定 ID 加入 `EDITOR_SCHEMES`，增加亮暗色盘与对应标签；有独立结构时接入 `resolveTheme`、`themeBodyState` 和清理前缀，默认装饰通过 `SCHEME_STYLES` 决定。
3. 色盘与局部内容表面的字面量颜色集中在 `src/theme/` 的专属样式和自定义推导中；组件与模块布局只用语义令牌。
4. 按 [验证选择表](../../dev/references/testing.md) 跑定向测试、构建和适用宿主验收；检查实际背景上的文字与嵌套内容，不只检查配置值或色卡。

## 外观设置

工作台设置 → 外观使用 React 组件，依次组织界面风格、编辑器风格、真实阅读预览、个人排版和备份；专属控制只在有效时显示。Obsidian 设置页只留打开工作台设置的入口按钮。值由模式规范化（`#rrggbb`，字号 12–24 或 0，行高 0–2.2，0 表示保持默认）。

预览在脚本禁用的隔离 iframe 内复制所属窗口样式，通过同一个 resolver 和 `MarkdownRenderer` 呈现固定样例；切换亮暗与窄宽度不写用户配置。不能加载用户笔记、外部资源或执行导航，也不能以该阅读预览宣称 CodeMirror 已验收。`parseExport` 接受 v1 与 v2，未知版本或未知主题/编辑器 ID 拒绝导入；当前导出 v2。`resetCurrentStyle` 只恢复当前风格的装饰与专属设置并保留字体；全量恢复使用 `themeSettings.defaults()`。

## 共存

- 界面主题选择“默认”时不覆盖宿主变量；Minimal 等社区主题保持原样，编辑器配色和字体仍可单独使用。
- 其他界面主题会覆盖社区主题的变量；外观页建议使用社区主题时保持“默认”。
- 用户在 Obsidian 自带外观设置里选的字体（`--font-*-override`）优先于这里的字体。
- SuliWorld 界面默认使用浅色 Outfit、暗色 Manrope；有效 SuliWorld 编辑器推荐相应正文、Newsreader/Instrument Serif 展示字体及 iA Writer Duo 等宽字体。推荐只在对应 HUHU 个人字体为 default 时生效，离线字体和 CJK 回退由 `fonts.css` 与 `src/theme/fonts/faces.json` 管理。
- 模块界面必须在每个主题下、在看板未挂载时也显示正常；`--db-*` 变量属于看板。
- body 类名和变量在卸载时于每个窗口中移除。
