# 来源、致敬与许可

完整项目清单及使用方式集中在[中文 README](../README.ZH.md#致敬与参考)和[英文 README](../README.md#acknowledgements-and-references)。功能和排版启发不等于源码复用；当前确有改编的部分如实记录，不写成“全部独立实现”。

## 来源记录

| 来源 | 当前记录 |
|---|---|
| Orca | [映射及固定提交](third-party/orca-terminal-workbench.md)、[原 MIT 许可](third-party/orca-LICENSE.txt) |
| apex-dashboard | [布局、格式与实现对应](third-party/apex-dashboard.md) |
| Margin Comments | [批注映射](third-party/margin-comments.md)、[原 MIT 许可](third-party/margin-comments-LICENSE.txt) |
| Notebook Navigator | [公开行为参考边界](third-party/notebook-navigator.md)，不包含其 GPL 源码或样式 |
| 工作台 CLI 与交付 | [来源与许可登记](third-party/agent-workbench-cli.md)：只借鉴公开机制，未复制或改编第三方源码 |
| skills-manager | [发现、复制与界面对应](third-party/skills-manager.md) |
| SuliWorld / GitHub Theme | [SuliWorld](third-party/suliworld.md)、[GitHub](third-party/github-theme.md)，字体另循 OFL |
| Iconic、obsidian-git、shadcn/ui、cc-switch 等 | [NOTICE](../NOTICE)与源码头中的固定来源 |
| Bot Runner 的 Eino/EinoExt Chat、官方 Responses / Anthropic SDK、SQLite 和系统凭证依赖 | [实际采用、固定版本及附加许可](third-party/huhu-bot.md)，按 Go 目标编译闭包生成通知 |

## 法律与生成产物

- 自有材料许可见 [LICENSE](../LICENSE)，商业使用须事先获得 NAMEWTA 书面许可；第三方原许可不因此改变。
- [NOTICE](../NOTICE) 保留改编、移植、资源及版权声明。上游原始文件路径和固定提交属于来源记录，不因目录改名删除。
- [THIRD-PARTY-NOTICES](../THIRD-PARTY-NOTICES.md) 由构建输入、CSS/字体、Rust 正常依赖图及 Go 五目标非测试编译闭包生成，收录实际分发依赖和附加声明。
- 缺少许可文件的发行包使用按版本固定并保存在仓库内的上游原文；生成器核对来源与摘要。SPDX 的 OR 可以选择允许分支，AND 所要求的附加文本必须保留。
- 图标、Emoji 与 Unicode 数据见[资源声明](../src/modules/icons/core/res/NOTICE.txt)，字体原文分别随字体保留。

纯行为参考项目不随插件打包；GPL/AGPL 参考只研究公开功能，不复制代码、样式或配置。相似度检查只是辅助定位，不替代来源与许可核对。原始法律文本保留原文。

Bot Runner 当前的 Chat / Responses / Anthropic SDK、SQLite、系统凭证及 Go 运行时许可见[Bot 依赖说明](third-party/huhu-bot.md)。直接调用 SDK 与源码改编分别记录；各 SDK 内置的 Go JSON 编码实现独立保留 BSD 义务，未消费的候选、测试与构建工具不列作运行依赖。
