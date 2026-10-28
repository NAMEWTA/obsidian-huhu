[English](README.md) | 简体中文

# HUHU · obsidian-huhu

Obsidian 里的个人工作台：把笔记、可组合看板、编程智能体、浏览器、档案、自动化和 Git 同步放进统一界面，内容保存在自己的库中。

本仓库从 **0.0.1** 开始。当前代码、数据约定与文档以此仓库为准；界面支持简体中文和英文。

## 安装与快速开始

1. 从 [Releases](https://github.com/NAMEWTA/obsidian-huhu/releases) 下载 `main.js`、`manifest.json`、`styles.css`，或解压对应插件压缩包。
2. 将三个文件放入当前库的 `.obsidian/plugins/huhu/`，在 Obsidian 的第三方插件设置中启用 **HUHU**。
3. 点击功能区的 HUHU 图标，或运行 `HUHU: 打开工作台`；在工作台设置中选择语言、模块与外观。

需要 **Obsidian 1.13.0 或更新版本**。终端、CLI 智能体、浏览器、Git 同步和保险箱依赖桌面环境；不能把界面可安装理解为全部移动端能力可用。

终端首次使用时，从本仓库同版本 Release 下载 `huhu-pty`，校验 SHA-256 后保存在当前库的设备目录中。辅助程序覆盖 Windows x64、macOS x64/arm64、Linux x64/arm64；无需把二进制放入插件安装目录。

## 功能总览

| 功能 | 当前能力 |
|---|---|
| [任务待办](docs/tasks.md) | 独立领域与工作台、笔记及档案关联、独立截止/提醒时间、逾期承接与 AI 工具 |
| [看板与记录](docs/dashboard.md) | 可拖动和缩放的小组件、日历、待办、收件箱、时钟天气、习惯、记账、阅读、番茄钟和统计 |
| [笔记导航](docs/navigator.md) | 文件夹与标签浏览、搜索、预览、日历、模板及键盘操作 |
| [智能体与终端](docs/agent-workbench.md) | CLI 会话、标签分组、恢复、快捷命令、技能和当前工作空间用量 |
| [内置浏览器](docs/browser.md) | 网页标签、个人资料、Cookie 导入、下载和材料采集 |
| [档案](docs/contacts.md) | 人物与企业档案、关系、资料和关联笔记 |
| [自动化与通知](docs/automation.md) | 手动及定时操作、执行预检、设备归属、运行记录和通知 |
| [高亮摘录](docs/comments.md) | 四色选区高亮、摘录卡片、笔记与讨论、标签检索、批量管理和 Markdown 导出 |
| [图标与外观](docs/appearance.md) | 文件及界面图标、主题、Markdown 配色和本地字体 |
| [Git 同步](docs/sync.md) | 限定当前库的仓库初始化、提交、拉取、推送、忽略规则和冲突处理 |
| [保险箱](docs/safe.md) | 独立主密码、加密记录、锁定、备份与认证恢复 |

各模块可以独立开启或关闭。Git 的远端、认证与自动同步计划需要单独配置；CLI 提供方登录、天气及其他外部服务按各自要求使用。完整操作见 [文档索引](docs/README.md)、[工作台](docs/workbench.md)和[设置](docs/settings.md)。

## 数据、边界与备份

- `huhu/` 保存用户内容：日志、收件箱、待办、档案及各类记录，普通笔记保留原位。
- `.huhu/` 保存配置、看板、自动化、批注、设备状态、浏览器及智能体运行数据、helper 和加密保险箱。
- 库内逻辑路径统一为 `/`；不会将非法路径当作空看板或普通笔记覆盖。本版本从新身份和新目录开始，不导入旧品牌数据。
- 系统 CLI 登录沿用本机位置；托管账号在库内隔离。导航器缓存、系统状态 Hook 和显式导出有单独边界。
- 隐藏目录需要支持它们的同步工具。Git 默认排除凭据、设备运行数据和缓存；使用前核对实际忽略规则。备份应包含内容及需要恢复的隐藏数据。

详见[数据与恢复](docs/data.md)及[隐私与外部访问](docs/privacy.md)。工作空间用量只统计当前库及其子目录中能确认归属的记录，不累计全机数据。

## 开发

技术栈为 TypeScript、React 19、Tailwind CSS 4、shadcn/Radix、esbuild，原生终端辅助程序使用 Rust。pnpm 版本固定在 `package.json`。

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm lint:css
pnpm test:all
pnpm check:native
pnpm check:notices
pnpm check:bundle
```

构建生成并跟踪根目录的 `main.js` 和 `styles.css`。贡献者从 [AGENTS.md](AGENTS.md)、[架构](docs/architecture.md)、[设计系统](docs/design-system.md)与[开发发布](docs/development.md)开始。版本记录仅维护当前项目的 [CHANGELOG](CHANGELOG.md)。

## 问题、需求与商业授权

[创建 Issue](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose)：提供 BUG/修复、功能需求、优化、安装兼容、文档、咨询及商业授权七类表单。报告问题时使用最小示例，附版本和必要的脱敏信息；安全问题先阅读 [安全策略](SECURITY.md)。

[商业授权申请](https://github.com/NAMEWTA/obsidian-huhu/issues/new?template=07-commercial.yml)：企业内部使用、用它完成收费工作、销售集成及商业服务，均须事先获得 **NAMEWTA 的明确书面许可**。提交、回复或关闭 Issue 不自动构成授权。

## 许可证

项目自有代码、文档和原创资源采用 **HUHU Source Available License 1.0**，完整英文条款见 [LICENSE](LICENSE)。非商业使用、修改和符合条款的再分发允许；分发衍生版本或提供网络服务须提供完整对应源码并沿用许可。商用须另行书面授权。这是源码可见许可，**不是 OSI 开源许可证**。

第三方材料保留各自原许可；本项目的商用限制不改变它们独立授予的权利，也不收回此前已经授予的许可。署名、对应提交与完整声明见 [NOTICE](NOTICE)、[来源说明](docs/references.md)、[THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md)及[图标资源声明](src/modules/icons/core/res/NOTICE.txt)。

## 致敬与参考

感谢这些项目的功能、交互和排版启发。**仅参考公开行为或布局的条目没有复制对应实现；实际改编的代码、样式和资源在下表及源码中如实注明，并保留原许可。** 不以“致敬”替代署名，也不声称表中所有部分均为独立实现。

| 项目 | 上游许可 | 使用方式 |
|---|---|---|
| [Orca](https://github.com/stablyai/orca) | MIT | 工作台、智能体、浏览器、自动化及组件；含已声明改编 |
| [apex-dashboard](https://github.com/PandoraReads/apex-dashboard) | MIT | 看板布局、交互、格式及算法；含已声明改编 |
| [obsidian-dashboard](https://github.com/Leolewis2011/obsidian-dashboard) | MIT | 看板设计来源；原仓库现已不可用，保留原声明 |
| [Margin Comments](https://github.com/jonaas-dev/obsidian-margin-comments) | MIT | 批注模型、锚点与交互；含已声明改编 |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | 共享组件配方，部分经 Orca 改编 |
| [Iconic](https://github.com/gfxholo/iconic) | MIT-0 | 图标规则与管理器移植 |
| [obsidian-git](https://github.com/Vinzent03/obsidian-git) | MIT | Git 同步行为，以及已声明的冲突解析和提交模式改编 |
| [skills-manager](https://github.com/xingkongliang/skills-manager) | MIT | 技能发现、哈希、按工具复制与卡片交互改编 |
| [cc-switch](https://github.com/farion1231/cc-switch) | MIT | CLI 包信息、安装发现与版本比较改编 |
| [SuliWorld](https://github.com/sulistef/obsidian-suliworld) | MIT | 界面和编辑器主题改编；字体另循 OFL |
| [GitHub Theme](https://github.com/krios2146/obsidian-theme-github) | MIT | 编辑器排版与 Markdown 样式改编 |
| [dbx](https://github.com/t8y2/dbx) | MIT | 配色参考；没有声称与完整主题兼容 |
| [Notebook Navigator](https://github.com/johansan/notebook-navigator) | GPL-3.0 | 仅学习公开交互行为；不包含其源码、注释或样式 |
| [Marginalia](https://github.com/jpmoo/marginalia) | MIT | 仅参考悬停委托思路 |
| [Hover Annotations](https://github.com/MaxMiksa/Obsidian-Hover-Annotations) | MIT | 仅参考悬停交互 |
| [Margin Annotations](https://github.com/aoldiot/margin-annotations) | MIT | 仅参考侧栏卡片交互 |
| [Side Note](https://github.com/mofukuru/side-note) | MIT | 仅参考侧注交互 |
| [Commentator](https://github.com/Fevol/obsidian-criticmarkup) | MIT | 仅参考批注使用方式 |
| [Smart Composer](https://github.com/glowingjade/obsidian-smart-composer) | MIT | 仅参考宿主内 React / Radix 使用思路 |
| [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot) | AGPL-3.0 | 仅参考公开功能思路；不包含其代码、样式或配置 |
| [obsidian-plugin-skill](https://github.com/gapmiss/obsidian-plugin-skill) | MIT | 开发规则技能的已声明改编来源 |
| [xterm.js](https://github.com/xtermjs/xterm.js) | MIT | 终端渲染引擎、插件与公开 API |
| [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout) | MIT | 看板网格依赖 |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC / MIT | 界面及文件图标；原资源声明另附 |
| [Unicode / CLDR](https://github.com/unicode-org/cldr-json) | Unicode-3.0 | Emoji 和区域数据；声明见图标资源及依赖通知 |
| [Geist / Geist Mono](https://github.com/vercel/geist-font) | OFL-1.1 | 内嵌界面字体 |
| [Outfit](https://github.com/Outfitio/Outfit-Fonts) | OFL-1.1 | 字体来源，完整版权保留于字体许可 |
| [Newsreader](https://github.com/productiontype/Newsreader) | OFL-1.1 | 字体来源，完整版权保留于字体许可 |
| [Manrope](https://github.com/googlefonts/manrope) | OFL-1.1 | 字体来源，完整版权保留于字体许可 |
| [Instrument Serif](https://github.com/Instrument/instrument-serif) | OFL-1.1 | 字体来源，完整版权保留于字体许可 |
| [iA Writer Duo](https://github.com/iaolo/iA-Fonts) | OFL-1.1 | 内嵌原始字体；基于 IBM Plex 的原版权另附 |
| [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) | OFL-1.1 | 上游字体集合声明的来源；不代表全部字体均打包 |
| [Young Serif](https://github.com/noirblancrouge/YoungSerif) | OFL-1.1 | 上游字体集合声明的来源 |
| [Hanken Grotesk](https://github.com/marcologous/hanken-grotesk) | OFL-1.1 | 上游字体集合声明的来源 |
| [Gloock](https://github.com/duartp/gloock) | OFL-1.1 | 上游字体集合声明的来源 |
| [Albert Sans](https://github.com/usted/Albert-Sans) | OFL-1.1 | 上游字体集合声明的来源 |
| [DM Mono](https://github.com/googlefonts/dm-mono) | OFL-1.1 | 上游字体集合声明的来源 |
| [Windows Terminal](https://github.com/microsoft/terminal) | MIT | 仅参考公开终端协议文档，不移植终端源码 |

实际打包的 npm、Rust、CSS 和字体依赖由生成的通知完整列出；字体集合中的来源清单不代表每种字体均被打包。React、Radix、Zustand、Chart.js、Tailwind 等运行与构建依赖的确切版本以锁文件和 [第三方通知](THIRD-PARTY-NOTICES.md)为准。CLI 工具及其服务商是独立外部产品，不随 HUHU 一并授权。
