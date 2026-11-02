# Notebook Navigator 参考范围

[笔记导航器](../navigator.md)的交互参照 [Notebook Navigator](https://github.com/johansan/notebook-navigator)（johansan/notebook-navigator，GPL-3.0）。HUHU 只参考它的**行为**：双栏结构、键盘表、多选方式、拖放、预览和缩略图的概念，以及搜索过滤语法、日历与周期笔记、模板标记、自定义创建命令、库配置档、合并笔记和标签操作的使用方式。**HUHU 没有包含它的任何源代码、注释或样式文本**；`src/modules/navigator/` 是按 HUHU 的模块结构、React 与设计系统令牌独立重写的，缓存、选择和键盘处理都是另行设计的实现。

来源说明与核对方式：

- 相关导航器源文件头部保留 `Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.` 声明；文件头是来源说明，不能单独替代实现审查。
- 相似度复核使用 [scripts/check-similarity.mjs](../../scripts/check-similarity.mjs)，必须显式提供 HUHU 源目录和已经准备好的参考检出目录。
- HUHU 自有材料按 [HUHU Source Available License 1.0](../../LICENSE) 分发；行为参考不引入 GPL 运行依赖，也不改变第三方材料的原许可。

在仓库根目录运行，例如将 `/path/to/notebook-navigator/src` 替换成实际参考检出的源码目录：

```bash
pnpm run check:similarity --ours src/modules/navigator --theirs /path/to/notebook-navigator/src
```

脚本不下载参考项目，只输出匹配文件路径和数值；`--min` 控制报告的显示下限，不是自动验收门。检查结果需要结合固定参考版本逐项审查，不能仅凭命令退出成功认定没有代码复制或许可问题。许可核对范围与后续责任见[参考映射与许可](../references.md)。

参考的版本是 v3.4.x 的公开文档和行为，不表示 HUHU 跟随它的后续版本。

## 日历对照版本

本轮日历交互对照固定为 [ede7a1b06cdb282beb8767e8f18e209630f58d94](https://github.com/johansan/notebook-navigator/tree/ede7a1b06cdb282beb8767e8f18e209630f58d94)（3.4.3）：紧凑周窗口、完整月份、十二个月年面板、日期状态、预览、封面和周期菜单均为独立实现。HUHU 日期单击采用当日日程语义；任务仍按 HUHU 的来源和日期规则聚合，打开/创建周期笔记另设明确动作。共用展示位于 `src/ui/components/huhu/calendar/`，业务分别保留在 home 与 navigator。未复制上游源码或 CSS；真实 Obsidian 同屏视觉对照需在宿主验收中进行。

## 许可核验

2026-10-31 核对上述已采用的 3.4.3 提交：原路径为公开 `README.md` 与 [LICENSE](https://github.com/johansan/notebook-navigator/blob/ede7a1b06cdb282beb8767e8f18e209630f58d94/LICENSE)，许可为 GPL-3.0，版权行是 `Copyright (c) 2025 Johan Sanneblad`。使用性质为仅公开行为参考；当前对应位置为 `src/modules/navigator/` 与 `src/ui/components/huhu/calendar/`。此核验确认固定版本的许可文本，不代替源码相似度或宿主行为验收。
