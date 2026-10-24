# GitHub Theme 来源与改编

- 上游：[krios2146/obsidian-theme-github](https://github.com/krios2146/obsidian-theme-github)
- 固定提交：[`0ec83a88de1161ed0311f76b2e962b6a233121da`](https://github.com/krios2146/obsidian-theme-github/tree/0ec83a88de1161ed0311f76b2e962b6a233121da)
- 参考/改编文件：`theme.css`，特别是 Markdown 排版变量、行内代码、标题分隔线、Callout 和表格规则。
- 版权：Copyright (c) 2023 Vladimir Kidyaev，MIT；完整原文见 [LICENSE](../../third-party/github-theme/LICENSE)。

HUHU 在既有 `github` 编辑器 ID 下新增 `src/theme/styles/github-editor.css`，沿用 `editor-schemes.css` 的 Primer 风格语法色。改编保留文档层次、H1/H2 细线、行内代码形态、代码块、表格、边线引用/提示块与阅读节奏；增加独立样式门控、长代码/宽表格滚动、手动标题覆盖和实际代码表面对比度检查。

没有导入全局 GitHub 界面、Kanban 插件适配、GitHub Projects 数据能力、上游整个 Style Settings 面板或全部可选装饰。选择 GitHub 编辑器只启用笔记结构，界面继续独立选择。共存和撤除规则见[外观](../appearance.md)。
