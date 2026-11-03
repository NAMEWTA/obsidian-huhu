# 来源、致敬与许可

本页集中记录第三方材料的使用性质与核验入口；[中文 README](../README.ZH.md#致敬与参考)和[英文 README](../README.md#acknowledgements-and-references)提供致谢摘要。功能和排版启发不等于源码复用；实际改编、色盘转写及未核实的历史来源分别记录，不写成“全部独立实现”。

## 使用性质

| 性质 | 判断与记录位置 |
|---|---|
| 运行依赖 | 实际进入构建或原生目标编译闭包的库；版本与许可由 [THIRD-PARTY-NOTICES](../THIRD-PARTY-NOTICES.md) 和对应来源说明记录 |
| 复制或改编源码、样式 | 保留固定提交、原路径、版权、原许可及 HUHU 对应位置，见 [NOTICE](../NOTICE) 和下表映射；不能仅以“致敬”替代声明 |
| 素材、字体 | 图标、Emoji、Unicode 数据及实际分发字体分别遵循资源许可；见下方法律与生成产物说明，不把参考字体合集等同于全部打包 |
| 仅公开行为、协议或视觉参考 | 不作为运行依赖；记录所参考的公开入口、核验快照与当前对应功能。dbx 已存在色盘数值转写，单独保留其复制/改编边界及历史许可待核实状态 |

核验快照证明查证时的上游状态，不自动证明历史采用版本或全部分发义务已完成。未核实字段明确标注，不能由当前许可证反推过去的许可。

## 来源记录

| 来源 | 当前记录 |
|---|---|
| Orca | [映射及固定提交](third-party/orca-terminal-workbench.md)、[原 MIT 许可](third-party/orca-LICENSE.txt) |
| apex-dashboard | [布局、格式与实现对应](third-party/apex-dashboard.md) |
| Margin Comments | [批注映射](third-party/margin-comments.md)、[原 MIT 许可](third-party/margin-comments-LICENSE.txt) |
| Notebook Navigator | [公开行为参考边界](third-party/notebook-navigator.md)，不包含其 GPL 源码或样式 |
| Obsidian Copilot | [公开行为记录](third-party/behavior-references.md)：AGPL-3.0，未复制代码、样式或配置；历史采用提交待核实 |
| Marginalia | [公开行为记录](third-party/behavior-references.md)：MIT，高亮、悬停与侧栏参考 |
| Hover Annotations | [公开行为记录](third-party/behavior-references.md)：MIT，悬停标注参考，不采用正文内 HTML 存储 |
| Margin Annotations | [公开行为记录](third-party/behavior-references.md)：MIT，边注交互参考；区别于实际改编的 Margin Comments |
| Side Note | [公开行为记录](third-party/behavior-references.md)：MIT，选区评论与评论视图参考 |
| Commentator（obsidian-criticmarkup） | [公开行为记录](third-party/behavior-references.md)：MIT，评论/审阅参考，不采用 CriticMarkup 解析器 |
| Smart Composer | [公开行为记录](third-party/behavior-references.md)：MIT，带笔记上下文的 AI 交互参考；历史采用提交待核实 |
| dbx | [色盘数值转写与视觉参考](third-party/behavior-references.md#dbx)：当前核验为 Apache-2.0；历史采用提交、原路径、版权及采用时许可待核实 |
| Windows Terminal | [公开协议记录](third-party/behavior-references.md)：MIT，ConPTY win32-input-mode 文档与本地键盘编码对应 |
| 工作台 CLI 与交付 | [来源与许可登记](third-party/agent-workbench-cli.md)：只借鉴公开机制，未复制或改编第三方源码 |
| skills-manager | [发现、复制与界面对应](third-party/skills-manager.md) |
| SuliWorld / GitHub Theme | [SuliWorld](third-party/suliworld.md)、[GitHub](third-party/github-theme.md)，字体另循 OFL |
| Iconic、obsidian-git、shadcn/ui、cc-switch 等 | [NOTICE](../NOTICE)与源码头中的固定来源 |

## 法律与生成产物

- 自有材料许可见 [LICENSE](../LICENSE)，商业使用须事先获得 NAMEWTA 书面许可；第三方原许可不因此改变。
- [NOTICE](../NOTICE) 保留改编、移植、资源及版权声明。上游原始文件路径和固定提交属于来源记录，不因目录改名删除。
- [THIRD-PARTY-NOTICES](../THIRD-PARTY-NOTICES.md) 由构建输入、CSS/字体、Rust 正常依赖图及 Go 五目标非测试编译闭包生成，收录实际分发依赖和附加声明。
- 缺少许可文件的发行包使用按版本固定并保存在仓库内的上游原文；生成器核对来源与摘要。SPDX 的 OR 可以选择允许分支，AND 所要求的附加文本必须保留。
- 图标、Emoji 与 Unicode 数据见[资源声明](../src/modules/icons/core/res/NOTICE.txt)，字体原文分别随字体保留。

纯行为参考项目不随插件打包；GPL/AGPL 参考只研究公开功能，不复制代码、样式或配置。相似度检查只是辅助定位，不替代来源与许可核对。原始法律文本保留原文。

