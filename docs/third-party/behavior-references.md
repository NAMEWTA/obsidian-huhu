# 公开行为、协议与色盘来源

本页补充[来源总表](../references.md)中的公开参考，Notebook Navigator 继续由[既有记录](notebook-navigator.md)负责。核验日期为 2026-10-31；下列 SHA 是本次许可核验快照，除另有说明外，**不是已确认的历史采用提交**。历史 README 的致谢只能证明曾记录参考关系，不能证明逐文件继承或没有复制；本次没有开展全量相似度审计。

## 公开行为参考

下列八项不作为 HUHU 运行依赖，也不登记为复制或改编源码、样式、配置或素材。公开功能以各项目 README 为参考入口；当前 HUHU 位置是可核对的对应功能入口，不表示实现一一对应。除 Windows Terminal 的协议文件外，历史记录未保存更细的上游路径及采用提交，均保留为待核实。

| 项目与仓库 | 许可核验提交、原路径与作者 | 采用方式与当前 HUHU 对应位置 |
|---|---|---|
| [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot) | `2f18b88e2f83cf7d8b994dd30088e3c8e5bebd38`；[LICENSE](https://github.com/logancyang/obsidian-copilot/blob/2f18b88e2f83cf7d8b994dd30088e3c8e5bebd38/LICENSE) 已核实 AGPL-3.0；公开 README 作者为 Brevilabs Team / logancyang，LICENSE 未给出项目专属版权行（FSF 行属于许可文本） | 仅公开的 Obsidian AI 工作流行为参考，未复制其代码、样式或配置。当前相关入口 `src/modules/agent/ui/AgentWorkspacePage.tsx`；历史参考到当前具体交互的继承关系未核实，不能据此称该文件改编自 Copilot |
| [Marginalia](https://github.com/jpmoo/marginalia) | `769fe4f81a763ef550bf4cb349e929fa9a6d24b0`；[LICENSE](https://github.com/jpmoo/marginalia/blob/769fe4f81a763ef550bf4cb349e929fa9a6d24b0/LICENSE) 已核实 MIT；版权行 `Copyright (c) 2025`，未列姓名；README 作者 JPMoo | 高亮、悬停批注和侧栏的公开行为参考；对应 `src/modules/comments/ui/panel/CommentsPanel.tsx`、`src/modules/comments/ui/popover/CommentsOverlay.tsx` |
| [Hover Annotations](https://github.com/MaxMiksa/Obsidian-Hover-Annotations) | `f8029113cf79ecd41b4457345aa09aeb3d887f19`；[LICENSE](https://github.com/MaxMiksa/Obsidian-Hover-Annotations/blob/f8029113cf79ecd41b4457345aa09aeb3d887f19/LICENSE) 已核实 MIT；`Copyright (c) 2025 Zheyuan (Max) Kong` | 悬停显示标注的公开行为参考；对应 `src/modules/comments/services/overlay.ts`、`src/modules/comments/ui/popover/CommentPopover.tsx`；HUHU 不采用其正文内 HTML 标注格式 |
| [Margin Annotations](https://github.com/aoldiot/margin-annotations) | `4ffe9b1f03b01ac5d626496a7a45b29b1ce4df31`；[LICENSE](https://github.com/aoldiot/margin-annotations/blob/4ffe9b1f03b01ac5d626496a7a45b29b1ce4df31/LICENSE) 已核实 MIT；`Copyright (c) 2026 hex` | 文内标注与边注交互的公开行为参考；对应 `src/modules/comments/ui/popover/CommentPopover.tsx`；HUHU 使用旁路存储，不采用其写入原文的存储方案 |
| [Side Note](https://github.com/mofukuru/side-note) | `23d057137a1e8db136baa20ae35ef022812c12a4`；[LICENSE](https://github.com/mofukuru/side-note/blob/23d057137a1e8db136baa20ae35ef022812c12a4/LICENSE) 已核实 MIT；`Copyright (c) 2025 mofukuru` | 选区评论和评论视图的公开行为参考；对应 `src/modules/comments/ui/panel/CommentsPanel.tsx` 与 `src/modules/comments/ui/popover/Composer.tsx` |
| [Commentator（obsidian-criticmarkup）](https://github.com/Fevol/obsidian-criticmarkup) | `ffe0df4feea9e14233fc5e98f101f5bc01ccf001`；[LICENSE](https://github.com/Fevol/obsidian-criticmarkup/blob/ffe0df4feea9e14233fc5e98f101f5bc01ccf001/LICENSE) 已核实 MIT；`Copyright (c) 2022 - 2023 kometenstaub and Fevol` | 评论和审阅的公开行为参考；对应 `src/modules/comments/ui/thread/CommentBody.tsx`。上游 README 使用 CriticMarkup plugin 名称；HUHU 未采用其 CriticMarkup 解析器或修改原文的建议模式 |
| [Smart Composer](https://github.com/glowingjade/obsidian-smart-composer) | `6b38ab3c57e03c5c6cbeb79815277857df59cbd8`；[LICENSE](https://github.com/glowingjade/obsidian-smart-composer/blob/6b38ab3c57e03c5c6cbeb79815277857df59cbd8/LICENSE) 已核实 MIT；`Copyright (c) 2024 Heesu Suh` | 带笔记上下文的 AI 交互参考；当前相关资料入口 `src/modules/agent/services/session-material.ts`、`src/modules/agent/core/launch/context-material.ts`。历史参考到当前实现的继承关系未核实，不将这些文件登记为源码改编 |
| [Windows Terminal](https://github.com/microsoft/terminal) | `703ef7f969d90d3f7e132b9a5f51a8815e77d586`；[LICENSE](https://github.com/microsoft/terminal/blob/703ef7f969d90d3f7e132b9a5f51a8815e77d586/LICENSE) 已核实 MIT；`Copyright (c) Microsoft Corporation. All rights reserved.` | 公开协议参考：[doc/specs/#4999 - Improved keyboard handling in Conpty.md](https://github.com/microsoft/terminal/blob/703ef7f969d90d3f7e132b9a5f51a8815e77d586/doc/specs/%234999%20-%20Improved%20keyboard%20handling%20in%20Conpty.md)，作者 Mike Griese；对应 `src/modules/agent/core/terminal/keyboard.ts` 的 win32-input-mode 编码，未复制终端源码 |

批注的实际源码改编来自另行登记的 [Margin Comments](margin-comments.md)，不能与 Margin Annotations 混为同一项目。HUHU 当前高亮与旁路存储行为见[批注文档](../comments.md)。

## dbx

[dbx](https://github.com/t8y2/dbx) 是视觉色盘与自定义主题推导思路的来源，不能与上表一起笼统称为“未采用任何样式或配置”。本地 `src/theme/styles/presets.css` 文件头明确注明将 dbx 色盘作为不透明十六进制数值映射到 HUHU 的 `--nt-*` 名称，并对部分颜色进行对比度调整；`src/theme/custom.ts` 文件头注明五个用户颜色推导界面颜色的思路参考。`src/ui/styles/tokens.css` 消费这些色盘令牌。

- **使用性质：** 视觉参考及色盘数值转写；是否构成复制或改编上游样式文本的边界待核实。不是运行依赖，也不是字体或图像素材。
- **本次核验：** `53c4d244ff643834e3b244dcb5c2bd8f0e7ae46c` 的 [LICENSE](https://github.com/t8y2/dbx/blob/53c4d244ff643834e3b244dcb5c2bd8f0e7ae46c/LICENSE) 为 Apache-2.0，不能继续写为 MIT。仓库归属 t8y2；该 LICENSE 未列项目专属版权行，色盘作者版权未核实。
- **原路径与历史版本：** 当前本地注释只指向仓库及主题名，没有固定历史采用提交或原色盘文件路径；这些字段及采用时许可均待核实。本次核验 SHA 不补造历史来源，也不把当前许可追溯应用到旧材料。
- **核验边界：** 已阅读该快照的 [NOTICE](https://github.com/t8y2/dbx/blob/53c4d244ff643834e3b244dcb5c2bd8f0e7ae46c/NOTICE)，它记录 PL/SQL 调试贡献，不能作为色盘版权证明。本次仅修正来源说明，不宣称已完成色盘分发义务审计；如确认复制或改编样式，需按实际采用版本补齐原路径、版权和相应许可声明。
