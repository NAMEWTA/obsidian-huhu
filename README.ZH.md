[English](README.md) | 简体中文

# HUHU · obsidian-huhu

[![Release](https://img.shields.io/github/v/release/NAMEWTA/obsidian-huhu?include_prereleases&label=release)](https://github.com/NAMEWTA/obsidian-huhu/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.13.0%2B-7c3aed)](https://obsidian.md)
[![License](https://img.shields.io/badge/license-HUHU%20Source%20Available%201.0-lightgrey)](LICENSE)
[![Issues](https://img.shields.io/github/issues/NAMEWTA/obsidian-huhu)](https://github.com/NAMEWTA/obsidian-huhu/issues)

Obsidian 里的个人工作台：笔记、可组合看板、任务、编程智能体、浏览器、档案、自动化、通知和 Git 版本管理集中在同一界面，内容保存在你自己的库中。

![HUHU 工作台：看板、任务与自动化看板](docs/images/readme/gif/hero.gif)

> 本文所有截图和动图都在一次性的演示库中、以英文界面录制；界面同样提供简体中文。

## 目录

- [为什么用 HUHU](#为什么用-huhu)
- [功能](#功能)
- [快速开始](#快速开始)
- [功能导览](#功能导览)
- [平台支持](#平台支持)
- [命令](#命令)
- [数据、隐私与备份](#数据隐私与备份)
- [常见问题](#常见问题)
- [开发](#开发)
- [问题、需求与商业授权](#问题需求与商业授权)
- [许可证](#许可证)
- [致敬与参考](#致敬与参考)

## 为什么用 HUHU

- **一个插件代替一堆插件。** 看板、任务、笔记导航、高亮、终端、浏览器、档案、自动化、保险箱和 Git 历史共用一条图标栏、一个设置页和一套外观。
- **库仍是唯一的数据来源。** 用户内容以普通文件保存在 `huhu/`，配置和运行数据在 `.huhu/`。不需要 HUHU 账号或服务器。
- **智能体就在笔记旁边。** 在限定到库内文件夹的真实终端里运行 Claude Code、Codex、Gemini CLI、OpenCode、Pi 或 Grok，并把笔记、选区和路径交给它们。
- **每个模块都可关闭。** 在 **设置 → 常规 → 功能模块** 中开关；关闭的模块不加载，数据保留。

## 功能

| 模块 | 能做什么 | 指南 |
|---|---|---|
| 看板 | 多个看板与可缩放的小组件网格：日历、任务、收集箱、时钟/天气、习惯、记账、阅读、番茄钟和统计 | [看板](docs/dashboard.md) |
| 任务 | 独立任务工作台、截止与提醒时间、过期顺延、重复、关联笔记/档案 | [任务](docs/tasks.md) |
| 笔记导航器 | 文件夹与标签树、带预览的笔记列表、筛选、日历与日记、模板、快捷方式和键盘操作 | [笔记导航器](docs/navigator.md) |
| 高亮与批注 | 不改写 Markdown 的四色高亮、可搜索的摘录卡片、笔记、标签、批注和导出 | [高亮与批注](docs/comments.md) |
| AI Agent 与终端 | 绑定目录的空间、真实终端、分屏、六种 CLI 智能体、快捷命令、技能与用量 | [智能体工作台](docs/agent-workbench.md) |
| 浏览器 | 相互隔离的个人/任务空间、观察与接管视图、身份导入、授权文件、供智能体使用的 CLI/MCP | [浏览器](docs/browser.md) |
| Bot | 桌面端个人智能体：持久 Bot 与群聊、审批、记忆和任务树 | [工作台](docs/workbench.md) |
| 自动化看板 | 手动与定时操作（提醒、待办、智能体、终端脚本、Obsidian 命令、打开笔记/网页）、预检和运行记录 | [自动化](docs/automation.md) |
| 通知 | 汇集自动化结果和提醒的收件箱，支持应用内与系统渠道 | [自动化](docs/automation.md) |
| 档案 | 自定义档案类型（人物、企业……）、表单、关系和可移植的 Markdown | [档案](docs/contacts.md) |
| 版本管理 | 基于 Git 的笔记历史、三种对比布局、带检查点的恢复与撤销、提交、拉取和推送 | [Git 同步](docs/sync.md) |
| 保险箱 | 独立主密码保护的加密记录、自动锁定、备份与恢复 | [保险箱](docs/safe.md) |
| 图标与外观 | 文件/文件夹/界面图标、界面主题、Markdown 配色、本地字体、简体中文与英文 | [外观](docs/appearance.md)、[图标](docs/icons.md) |

维护中的指南为中文：[指南索引](docs/README.md)、[工作台](docs/workbench.md)、[设置](docs/settings.md)。

## 快速开始

### 安装

1. 从 [Releases](https://github.com/NAMEWTA/obsidian-huhu/releases) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将三个文件放入库中的 `.obsidian/plugins/huhu/`。
3. 在 Obsidian 的 **设置 → 第三方插件** 中启用 **HUHU**。

需要 **Obsidian 1.13.0 或更新版本**。

### 第一次使用

1. 首次启用时，HUHU 会打开工作台并显示一次简短介绍。之后可点击功能区的“打开工作台”图标，或在命令面板运行 `HUHU: 打开工作台`。
2. 打开 **设置**（图标栏底部的齿轮）→ **常规**，选择界面语言并开关模块；在 **外观** 中选择界面主题和笔记样式。
3. 在 **首页** 用“添加小组件”搭建第一个看板，再在任务小组件或任务页中“新建任务”。
4. 在笔记中选中文字并选择高亮颜色；用 `HUHU: 打开批注面板` 打开侧栏查看全部高亮。
5. 在桌面端打开 **AI Agent → 新建空间**，选择库内文件夹，然后“新建终端”。第一次使用终端时，HUHU 从同版本 Release 下载当前平台的原生组件 `huhu-pty` 并校验 SHA-256。
6. 打开 **自动化看板** 新建提醒或每日待办；结果会出现在 **通知中心**（图标栏底部的铃铛）。

![包含 HUHU 命令的命令面板](docs/images/readme/command-palette.png)

## 功能导览

### 看板

看板以标签形式排列在首页顶部。在网格上添加、拖动和缩放小组件；每个看板以 Markdown 文件保存在 `.huhu/dashboards/` 下。

![在第二个看板中添加、缩放并移动小组件](docs/images/readme/gif/dashboard-widgets.gif)

| 浅色 | 深色 |
|---|---|
| ![浅色模式的看板](docs/images/readme/overview-light.png) | ![深色模式的看板](docs/images/readme/overview-dark.png) |

### 任务

新建带截止日期的任务，再按未完成、已到期或已完成筛选。过期任务会显示已过期天数。

![新建任务并切换筛选](docs/images/readme/gif/tasks.gif)

![任务工作台](docs/images/readme/tasks.png)

### 笔记导航器

导航器位于 Obsidian 左侧栏：上方是文件夹与标签树，下方是笔记卡片，另有筛选框和日历。点击某一天会打开当天的任务。

![浏览文件夹、标签和日历](docs/images/readme/gif/navigator.gif)

![笔记导航器](docs/images/readme/navigator.png)

### 高亮与批注

选中文字后选择黄、粉、蓝、绿四色之一，或添加笔记。侧栏按“本笔记”或“全库”列出高亮，可搜索、按颜色和文件筛选，并区分已解决/未解决。

![高亮文字并在全库中搜索高亮](docs/images/readme/gif/highlights.gif)

![高亮侧栏](docs/images/readme/highlights.png)

### AI Agent 与终端

空间把终端和智能体绑定到库内目录（也可以选择库外目录）。可以打开多个终端，把标签拖到边缘即可分屏。安装 CLI 后即可从新标签菜单启动对应智能体；HUHU 不内置这些 CLI。

![新建空间、运行命令并分屏终端](docs/images/readme/gif/agent-terminal.gif)

![左右并排的两个终端](docs/images/readme/agent-terminal.png)

### 浏览器

每个浏览器空间都有独立的浏览器进程、网站数据和下载目录。页面默认以暂停的观察模式打开；点击“接管”后自己浏览，或把任务空间交给智能体。受管运行时目前只支持 Linux x64，通过“安装运行包”从完整且已校验的运行时目录安装。

![观察模式下的浏览器空间](docs/images/readme/browser.png)

### Bot

Bot 是桌面端个人智能体，与 CLI 智能体相互独立。第一次打开 Bot 页面时启动本机 Runner；在 **设置 → Bot** 中登记模型凭证和调用额度，再在 Bot 页面选择协议、endpoint 与模型。

![Bot 页面](docs/images/readme/bot.png)

### 自动化看板与通知

自动化可手动运行，也可按计划运行（指定时间、每小时、每天、工作日、每周或自定义）。打开笔记、打开网页和运行 Obsidian 命令只能手动执行。每条自动化单独选择通知渠道：应用内或系统。定时运行只在 Obsidian 打开时进行。

![自动化看板](docs/images/readme/automation.png)

![通知中心](docs/images/readme/notifications.png)

### 档案

档案类型自定义字段和表单。点击“新建档案”，填写表单并保存，列表随即更新。

![新建一条联系人档案](docs/images/readme/gif/archives.gif)

![联系人档案表格](docs/images/readme/archives.png)

### 版本管理

`HUHU: 打开笔记历史` 列出改动过当前笔记的 Git 提交。可以左右、上下或行内对比，恢复单处变化，或把整个版本恢复为当前笔记；恢复前会先为当前内容保存检查点。

![对比版本并打开恢复确认](docs/images/readme/gif/versioning.gif)

![左右对比与历史侧栏](docs/images/readme/versioning.png)

### 保险箱

保险箱用独立主密码加密保存账号记录。默认 20 分钟无操作后锁定，Obsidian 关闭或插件卸载时总会锁定。

![解锁后的保险箱（演示条目）](docs/images/readme/safe.png)

### 外观与语言

简体中文与英文即时切换，选择界面主题（默认、SuliWorld、洁白、Claude Code、护眼绿或自定义），并配合 Obsidian 的明暗模式。

![切换语言、界面主题和明暗模式](docs/images/readme/gif/appearance-language.gif)

![外观设置](docs/images/readme/settings-appearance.png)

### 窄窗口

页面会适配较窄的面板和小窗口。

![窄窗口中的看板、任务和保险箱](docs/images/readme/narrow.png)

## 平台支持

| 模块 | 桌面端 | 移动端 |
|---|---|---|
| 看板、任务、笔记导航器、高亮/批注、档案、图标 | 支持 | 支持 |
| 通知 | 支持 | 支持 |
| 自动化看板 | 支持 | 支持；智能体和终端脚本操作需要桌面端 |
| AI Agent 与终端 | 支持 | 终端和 AI Agent 页面仅桌面端；保留库内技能发现 |
| 浏览器 | 受管运行时目前仅 Linux x64；其他平台显示为不可用 | 不支持 |
| Bot | 支持 | 不支持 |
| 保险箱 | 支持 | 不支持 |
| Git 版本管理 | 支持，需要系统 Git | 不支持 |

终端组件 `huhu-pty` 面向 Windows x64、macOS x64/arm64、Linux x64/arm64 发布；Bot Runner 二进制面向同样五个平台。详见[设置 → 安装与平台](docs/settings.md#安装与平台)。

## 命令

命令面板中的命令都以 `HUHU:` 开头；可在 Obsidian 的 **设置 → 快捷键** 中为任意命令绑定按键。

| 命令 | ID |
|---|---|
| 打开工作台 | `huhu:open-workbench` |
| 打开看板 | `huhu:open-dashboard` |
| 打开任务工作台 / 新建任务 | `huhu:open-task-domain` / `huhu:create-task` |
| 打开笔记导航器 / 导航器：切换日历 | `huhu:navigator-open` / `huhu:navigator-toggle-calendar` |
| 为选区添加高亮 / 打开批注面板 | `huhu:highlights-selection` / `huhu:comments-open-panel` |
| 新建终端 | `huhu:terminal-new` |
| 新建 Claude Code / Codex / Gemini CLI / OpenCode / Pi / Grok 会话 | `huhu:terminal-new-claude-code`、`-codex`、`-gemini`、`-opencode`、`-pi`、`-grok` |
| 把选区 / 当前笔记 / 当前文件路径发送到终端 | `huhu:terminal-send-selection`、`huhu:terminal-send-note`、`huhu:terminal-send-path` |
| 打开网页 | `huhu:open-browser` |
| 打开档案 | `huhu:open-contacts` |
| 打开自动化看板 / 新建自动化 | `huhu:open-automations` / `huhu:new-automation` |
| 打开通知中心 | `huhu:open-notifications` |
| 打开笔记历史 | `huhu:versioning-note-history` |
| Git：提交并同步 / 拉取 / 推送 | `huhu:sync-commit-and-sync`、`huhu:sync-pull`、`huhu:sync-push` |
| 打开保险箱 | `huhu:open-safe` |
| 切换到下一个主题 | `huhu:cycle-theme` |
| 复制相对引用 / 复制绝对引用 | `huhu:copy-relative-reference` / `huhu:copy-absolute-reference` |

导航器、图标、标签页和 Git 模块还有更多命令，见各自指南。

## 数据、隐私与备份

- `huhu/` 保存用户内容：日记、收集箱、任务、档案和记录。普通笔记保持原位置。
- `.huhu/` 保存配置、看板、自动化、批注、设备状态、浏览器/智能体运行数据、辅助程序和加密保险箱。
- 库内逻辑路径统一使用 `/`。无效路径会被拒绝，不会被当作空看板或另一篇笔记。
- 系统 CLI 登录保持原位置；托管的智能体账号隔离在库内。导航缓存、系统状态 hook 和显式导出各有边界。
- 隐藏文件夹需要同步工具一并包含。Git 默认排除凭据、设备运行数据和缓存，请以实际规则为准。备份时同时备份内容和需要恢复的隐藏数据。

详见[数据与恢复](docs/data.md)和[隐私与外部访问](docs/privacy.md)。工作区用量只统计当前库及其子目录中可归属的记录，不是整机总量。

## 常见问题

| 现象 | 检查什么 |
|---|---|
| 页面或图标不见了 | 模块可能已关闭：**设置 → 常规 → 功能模块**。启动失败的模块在图标上显示警告点，其他模块照常可用。 |
| 第一个终端无法启动 | `huhu-pty` 从同版本插件的 Release 下载并校验 SHA-256，首次需要联网。摘要缺失或不匹配时 HUHU 会停止，不会运行它。见[终端组件](docs/agent-workbench.md#终端组件)。 |
| 新标签菜单里没有某个智能体 | 先安装对应 CLI。从桌面图标启动 Obsidian 时，HUHU 会从登录 shell 恢复 `PATH`（Windows 除外）；特殊位置可在 **设置 → 智能体** 中填写程序路径。 |
| 提示受管浏览器运行时不可用 | 浏览器运行时仅支持 Linux x64，须用“安装运行包”从完整运行时目录安装。见[浏览器](docs/browser.md#开始使用)。 |
| 提示系统凭据保护不可用 | 没有系统凭据存储时，新建浏览器空间需要你明确选择临时存储，且不能保存身份。 |
| 自动化没有运行 | 定时运行只在 Obsidian 打开时进行；系统通知需要操作系统授权。 |
| 版本管理提示待配置 | 需要系统 Git、仓库和认证。开启模块不会创建仓库、保存认证，也不会启用自动提交、拉取或推送计划。见 [Git 同步](docs/sync.md)。 |
| 保险箱自动锁上了 | 达到设定的无操作时长（默认 20 分钟）或 Obsidian 关闭时会锁定；可在 **设置 → 保险箱** 中调整。 |

## 开发

TypeScript、React 19、Tailwind CSS 4、shadcn/Radix 和 esbuild；原生终端组件与浏览器监督程序使用 Rust。pnpm 版本固定在 `package.json` 中。

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

构建生成并跟踪根目录的 `main.js` 和 `styles.css`。贡献者从 [AGENTS.md](AGENTS.md)、[架构](docs/architecture.md)、[设计系统](docs/design-system.md)与[开发发布](docs/development.md)开始。版本记录见 [CHANGELOG](CHANGELOG.md)。

## 问题、需求与商业授权

[创建 Issue](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose)：提供 BUG/修复、功能需求、优化、安装兼容、文档、咨询及商业授权七类表单。报告问题时使用最小示例，附版本和必要的脱敏信息；安全问题先阅读 [安全策略](SECURITY.md)。

[商业授权申请](https://github.com/NAMEWTA/obsidian-huhu/issues/new?template=07-commercial.yml)：企业内部使用、用它完成收费工作、销售集成及商业服务，均须事先获得 **NAMEWTA 的明确书面许可**。提交、回复或关闭 Issue 不自动构成授权。

## 许可证

项目自有代码、文档和原创资源采用 **HUHU Source Available License 1.0**，完整英文条款见 [LICENSE](LICENSE)。非商业使用、修改和符合条款的再分发允许；分发衍生版本或提供网络服务须提供完整对应源码并沿用许可。商用须另行书面授权。这是源码可见许可，**不是 OSI 开源许可证**。

第三方材料保留各自原许可；本项目的商用限制不改变它们独立授予的权利，也不收回此前已经授予的许可。署名、对应提交与完整声明见 [NOTICE](NOTICE)、[来源说明](docs/references.md)、[THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md)及[图标资源声明](src/modules/icons/core/res/NOTICE.txt)。

## 致敬与参考

感谢以下项目。**实际改编的代码、样式和资源在下表及源码中如实注明，并保留原许可**；致谢不代表声称所有部分均为独立实现。

| 项目 | 上游许可 | 使用方式 |
|---|---|---|
| [Orca](https://github.com/stablyai/orca) | MIT | 工作台、智能体、浏览器、自动化和组件；已声明的改编 |
| [apex-dashboard](https://github.com/PandoraReads/apex-dashboard) | MIT | 看板布局、交互、格式与算法；已声明的改编 |
| [obsidian-dashboard](https://github.com/Leolewis2011/obsidian-dashboard) | MIT | 看板设计来源；原仓库已不可访问，保留声明 |
| [Margin Comments](https://github.com/jonaas-dev/obsidian-margin-comments) | MIT | 批注模型、锚点与交互；已声明的改编 |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | 共享组件写法，部分经由 Orca 改编 |
| [Iconic](https://github.com/gfxholo/iconic) | MIT-0 | 移植的图标规则与管理器 |
| [obsidian-git](https://github.com/Vinzent03/obsidian-git) | MIT | Git 行为及已声明的冲突解析 / 提交模式改编 |
| [skills-manager](https://github.com/xingkongliang/skills-manager) | MIT | 改编技能发现、哈希、按工具复制与卡片交互 |
| [cc-switch](https://github.com/farion1231/cc-switch) | MIT | 改编 CLI 包信息、安装发现与版本比较 |
| [SuliWorld](https://github.com/sulistef/obsidian-suliworld) | MIT | 改编界面与编辑器主题；字体另循 OFL |
| [GitHub Theme](https://github.com/krios2146/obsidian-theme-github) | MIT | 改编编辑器排版与 Markdown 样式 |
| [obsidian-plugin-skill](https://github.com/gapmiss/obsidian-plugin-skill) | MIT | 已声明的开发技能指引改编来源 |

**运行依赖与字体。** HUHU 使用 [xterm.js](https://github.com/xtermjs/xterm.js)、[React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)、React、Radix、Zustand、Chart.js、Tailwind 等库；[Lucide](https://github.com/lucide-icons/lucide) 图标与 [Unicode CLDR](https://github.com/unicode-org/cldr-json) 的 Emoji / 区域数据；以及 Geist / Geist Mono、Outfit、Newsreader、Manrope、Instrument Serif、iA Writer Duo 等 OFL-1.1 字体（字体合集声明中提到的 Plus Jakarta Sans、Young Serif、Hanken Grotesk、Gloock、Albert Sans、DM Mono 等并不都随插件打包）。确切版本、许可与署名见 [NOTICE](NOTICE)、[THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md)及[图标资源声明](src/modules/icons/core/res/NOTICE.txt)。

**仅行为参考（不包含其代码、样式或配置）：** [Notebook Navigator](https://github.com/johansan/notebook-navigator)（GPL-3.0）、[Obsidian Copilot](https://github.com/logancyang/obsidian-copilot)（AGPL-3.0）、[Marginalia](https://github.com/jpmoo/marginalia)、[Hover Annotations](https://github.com/MaxMiksa/Obsidian-Hover-Annotations)、[Margin Annotations](https://github.com/aoldiot/margin-annotations)、[Side Note](https://github.com/mofukuru/side-note)、[Commentator](https://github.com/Fevol/obsidian-criticmarkup)、[Smart Composer](https://github.com/glowingjade/obsidian-smart-composer)、[dbx](https://github.com/t8y2/dbx)（配色）以及 [Windows Terminal](https://github.com/microsoft/terminal) 的终端协议文档（未注明者均为 MIT）。来源记录见 [docs/references.md](docs/references.md)。

CLI 工具及其服务商是独立的外部产品，不属于 HUHU 的许可范围。
