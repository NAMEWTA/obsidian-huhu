# SuliWorld 来源与改编

- 上游：[sulistef/obsidian-suliworld](https://github.com/sulistef/obsidian-suliworld)
- 固定提交：[`bb73ca60dbc1169eb8d4c81fefb0c721ff7faf42`](https://github.com/sulistef/obsidian-suliworld/tree/bb73ca60dbc1169eb8d4c81fefb0c721ff7faf42)
- 参考/改编文件：`src/theme.css`；资源取自同提交 `fonts/`，版权与许可取自 `LICENSE` 和 `fonts/OFL.txt`。
- CSS 版权：Copyright (c) 2026 Stéphane Sulikowski，MIT；完整原文见 [LICENSE](../../third-party/suliworld/LICENSE)。字体独立适用 SIL OFL 1.1。

界面与编辑器分别位于 `src/theme/styles/suliworld-ui.css`、`suliworld-editor.css`；色盘位于 `presets.css`、`editor-schemes.css`；字体桥位于 `fonts.css`。改编保留 Cream、Forest、暗色、桌面卡片、标题层次、引文、提示块、深色代码、嵌入卡片等视觉特征，增加可撤除类名、HUHU 语义变量、混合表面前景、中文回退和对比度适配。

未复制全局裸选择器、`!important`、`:has`、窗口拖动覆盖、Bullet Journal 特殊状态/禁止点击处理。阅读/实时预览结构单独门控，源码保留语法和编辑行为。可选首字下沉未纳入；字体采用默认亮暗组合，不引入其余可选配对。

实际分发七个未修改字体文件，清单为 `src/theme/fonts/faces.json`。家族为 Outfit、Newsreader、Manrope、Instrument Serif、iA Writer Duo；项目作者版权与完整 OFL 原文见[字体许可](../../src/theme/fonts/LICENSE.txt)。许可文件保留上游完整字体集合的原始声明，清单未列出的家族不打包。CSS 家族别名以 `HUHU Suliworld` 开头，避免冲突；构建器将 WOFF2 内嵌到 `styles.css`，运行时不下载。

本适配不声明为上游官方移植或完整设置面板复制；HUHU 个人字体、覆盖优先级、移动端和任务语义保持自身契约。验收入口见[外观](../appearance.md#维护与验收)。
