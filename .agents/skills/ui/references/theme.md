# UI 主题与笔记外观

UI令牌/组件见 [design-system](design-system.md)，本文件只维护主题来源与笔记结构。生产源：`src/theme/settings.ts`、`runtime.ts`、`color.ts/custom.ts`、`styles/`，外观入口 `src/app/settings/react/appearance/`。保留 [SuliWorld](../../../../docs/third-party/suliworld.md) 与 [GitHub](../../../../docs/third-party/github-theme.md) 的原始许可、署名及适用内容；借鉴笔记结构不意味着接管整页UI布局。

## HUHU UI 根

- preset 仅 system/paper/ink；system 随所属宿主明暗解析为 paper/ink，不表示继承社区主题全部颜色。source 为 huhu/obsidian；accent 为 teal/indigo/pine/ochre/plum/graphite。完整枚举/默认值只查 settings.ts，不恢复旧UI preset/custom/Forest色板或稳定别名。
- `applyInterfaceTheme` 将 data-theme/accent/source/density/ui-size/motion 和必要UI字体覆盖写在 `.huhu-ui` 根，Portal也应用同一设置；不以 body.huhu-themed 全局覆盖宿主当UI机制。
- source=obsidian 由 runtime 从实际宿主表面读取配对颜色，经过对比度检查，不安全的一组整体回退HU色对，不能只换背景而留下不可读前景。不要凭静态 token 宣称所有社区主题均安全。
- 默认UI字体是随包Geist，mono为Geist Mono；界面 fontInterface 可显式选host/其它支持字体/custom，作用于HU根，不改变用户Obsidian界面。阅读与终端的个人字体按各自设置，不把来源设置或遗留字体CSS注释当优先级事实。字体来源/回退/许可查 `fonts.generated.css`、`theme/fonts/faces.json` 及原许可文件。
- density、uiSize、motion 由根属性选择规范令牌；不要在模块按配色、CJK或用户字体重新定义一套尺寸。模块在Home未挂载、独立叶和Portal内也必须成立；`--db-*` 只作Home局部桥接，不能成为所有页面依赖。

## 笔记编辑器独立保留

`resolveTheme`、`themeBodyState` 与 runtime 管理笔记外观。editor=follow 保留宿主结构；独立 editor scheme 包含 github/suliworld 和其它实际 EDITOR_SCHEMES，不能因为UI替换就删除合法的 claude-code/eye-care/one/nord 等编辑器取值。SuliWorld/GitHub是独立内容结构，经典色盘复用宿主基础结构，不为近似颜色新增结构。

- editor-schemes.css 的 `--ne-*` 映射Markdown语义；markdown.css 与 suliworld-editor.css/github-editor.css 限定激活的笔记结构。Reading/Live Preview 装饰、源码模式文本/语法和标记边界分别保持；不隐藏源标记或改任务字符。
- themeBodyState 写 editor/md/text/mono 与阅读字号/行高，不重新启用旧UI body调色。标题/加粗plain或accented避免与scheme叠加；SuliWorld引用/嵌入开关只作用于有效编辑器。嵌套引用、Callout、嵌入、H4等表面使用自己的前景/链接/标题色对，代码块保留语法色。
- 字体显式值和自定义family原文保留；笔记字号/行高默认与有效范围由settings模式规范化，不把UI字号应用到正文。`--huhu-user-font-*` 的现有用户数据不因UI无旧preset就清除。
- 原生宿主正文与HU组件分离，MarkdownRenderer外包huhu-native；移到中央叶/另一Document的导航器仍使用HU根令牌，不能继承某个旧Forest UI背景。
- 切主题或卸载逐Document撤除runtime自己写的属性、类、变量与监听；不修改宿主主题文件/用户CSS，不删除其它owner的样式。

## 外观设置、预览与导入

按批准组合展示配色来源、明暗、accent、UI字号/字体/密度/减少动效、实际预览；保留编辑器、个人排版和已有模块设置字段。设置值经过所属模式与队列写入，失败显示真实错误并恢复状态；专属控制只在有效时显示。

预览使用禁脚本隔离iframe、固定样例与所属窗口样式，经相同resolver/MarkdownRenderer呈现。预览切换不写用户设置，不加载用户笔记/外部资源、不执行导航；阅读预览不能代表CodeMirror验收。resetCurrentStyle只恢复其职责范围、保留字体；全量恢复走themeSettings.defaults。

`src/app/settings/appearance.ts` 当前 EXPORT_VERSION=2，parseExport 严格比较 kind/version，未知或旧格式及无效 preset/editor ID 拒绝，不引入兼容别名。`appearance.test.ts` 已有 v1 拒绝、v2 往返及未知版本/ID 负控制；后续改导入仍须核对实际 parser 与适用测试，规则本身不构成运行通过证据。

## 验证边界

用实际 src/theme 测试核对解析、来源、对比度、多根/Portal和逐窗口清理；`test/host/computed-surface.test.ts` 检查真实嵌套层叠，不用仅解析token代替实际色对。正文、普通/次级文字和控件按批准设计/实际对比度合同检查，必要文字不能借“淡色”降低门槛。真实Obsidian的阅读/Live Preview/源码、中文输入和popout按 [dev测试选择](../../dev/references/testing.md) 验收；静态、DOM、Chrome各只证明各自边界。
