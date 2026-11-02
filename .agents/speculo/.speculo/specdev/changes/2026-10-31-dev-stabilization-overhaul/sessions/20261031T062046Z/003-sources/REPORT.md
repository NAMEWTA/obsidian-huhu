# 任务回报

Session: 20261031T062046Z
Task: 003-sources
Status: completed

## 聚焦交接

T-03 文档候选已完成，等待 Lead 应用共享来源页补丁并验收。十项均有明确的使用性质、固定核验提交、许可状态和本地对应位置；Notebook Navigator 复用既有记录，其余九项集中于新说明。Copilot 继续明确为仅公开行为参考、未复制代码/样式/配置；dbx 单独说明色盘数值转写，修正当前许可误称 MIT 的问题，同时保留历史采用提交、原路径、版权与当时许可待核实。没有修改生产代码、Browser 内容、NOTICE、生成通知或 licenses 目录；候选交回后停写。

## 产物与验证

- 基线 HEAD：86c500556db1d64865c4cc7f1aff1dd83de071fa，current dev；不修改既有 staged 规划资料，未暂存、提交或远程写入。
- 修改：README.md、README.ZH.md 的行为参考段及新增 dbx 段；docs/third-party/notebook-navigator.md 的许可核验和过期自有许可说明；新增 docs/third-party/behavior-references.md。
- 影响分析：只调整来源说明与导航。只读核对 src/theme/styles/presets.css、src/theme/custom.ts、src/ui/styles/tokens.css、Agent 上下文资料与终端键盘入口、Comments 浮窗/侧栏入口、现有来源文档与许可规则。无运行行为或打包输入变化。
- dev 实际执行：读取 SKILL.md、licensing.md、testing.md；按 documentation 分支核对真实源、范围、链接、双语一致和许可文本。纯说明无代码 TDD，不运行构建。SpecDev research 的 decision 为十项如何分类并固定来源，caller 为 specdev/implement / T-03，接收位置为本 REPORT；停止条件为每项有已核验来源或明确未知。
- 外部核验：GitHub 官方仓库 README、LICENSE 与 commit API；Copilot API SSL EOF 后返回 403 rate limit，改以 git ls-remote 固定 HEAD，再读固定 LICENSE，核验成功。dbx NOTICE 的 API SSL EOF 后以固定 GitHub 页面回读成功。所有最终 SHA、原始 HTTPS 引用、作者与局限已写在交付文档中；没有读取 GPL/AGPL 源码。
- `git diff --check -- README.md README.ZH.md docs/third-party/notebook-navigator.md docs/third-party/behavior-references.md`：退出 0。
- Python 定向检查本次四个文件的相对文档链接、本地源码位置、README 同指 docs/references.md、双语 Apache-2.0 与移除笼统 MIT 断言：退出 0。
- `pnpm test:docs`：工具返回退出 126（pnpm 内层报告脚本退出 1），列出 12 个既有 archive 文档失效链接；本票四个文件没有出现在失败项。失败涉及 2026-10-25-agent-workbench-refactor 的 DESIGN/INDEX，以及 2026-10-25-huhu-bot-architecture 历史 session 中已退役源码/夹具链接。与 Lead 已固定的文档基线类别一致，未越界修改历史归档。
- `check:notices`：未重复启动，Lead 已有同输入检查运行；`test:license-texts`：复用 Lead 通知的 priority-test-license-texts.json 退出 0，本次没有更改任何许可原文或生成器输入。
- 标准轴自查：已去除错误许可概括，明确核验快照不等于历史采用提交，不以 FSF 许可文本版权冒充 Copilot 项目版权，不混淆 Margin Comments 与 Margin Annotations。
- 规范轴自查：覆盖十项、四类使用性质候选、README 双语一致、仅写分配路径；shared docs/references.md 未直接写入。最终两轴验收由 Lead 执行。
- 未完成或未验证：共享补丁尚未应用；全仓文档门仍失败；notices 等待 Lead 当前运行结果；未做历史源码相似度审计，dbx 历史来源与分发义务仍按文档明确待核实，不宣称法律审计完成。

## docs/references.md 精确候选

仅由 Lead 应用以下三处修改，其余正文（包括 Orca / CLI / Bot 等现有行）原样保留。

### 1. 替换首段

将标题后现有以“完整项目清单及使用方式集中在”开头的整段替换为：

```markdown
本页集中记录第三方材料的使用性质与核验入口；[中文 README](../README.ZH.md#致敬与参考)和[英文 README](../README.md#acknowledgements-and-references)提供致谢摘要。功能和排版启发不等于源码复用；实际改编、色盘转写及未核实的历史来源分别记录，不写成“全部独立实现”。
```

### 2. 在 `## 来源记录` 前插入

```markdown
## 使用性质

| 性质 | 判断与记录位置 |
|---|---|
| 运行依赖 | 实际进入构建或原生目标编译闭包的库；版本与许可由 [THIRD-PARTY-NOTICES](../THIRD-PARTY-NOTICES.md) 和对应来源说明记录 |
| 复制或改编源码、样式 | 保留固定提交、原路径、版权、原许可及 HUHU 对应位置，见 [NOTICE](../NOTICE) 和下表映射；不能仅以“致敬”替代声明 |
| 素材、字体 | 图标、Emoji、Unicode 数据及实际分发字体分别遵循资源许可；见下方法律与生成产物说明，不把参考字体合集等同于全部打包 |
| 仅公开行为、协议或视觉参考 | 不作为运行依赖；记录所参考的公开入口、核验快照与当前对应功能。dbx 已存在色盘数值转写，单独保留其复制/改编边界及历史许可待核实状态 |

核验快照证明查证时的上游状态，不自动证明历史采用版本或全部分发义务已完成。未核实字段明确标注，不能由当前许可证反推过去的许可。

```

### 3. 在既有 Notebook Navigator 表格行后插入以下九行

```markdown
| Obsidian Copilot | [公开行为记录](third-party/behavior-references.md)：AGPL-3.0，未复制代码、样式或配置；历史采用提交待核实 |
| Marginalia | [公开行为记录](third-party/behavior-references.md)：MIT，高亮、悬停与侧栏参考 |
| Hover Annotations | [公开行为记录](third-party/behavior-references.md)：MIT，悬停标注参考，不采用正文内 HTML 存储 |
| Margin Annotations | [公开行为记录](third-party/behavior-references.md)：MIT，边注交互参考；区别于实际改编的 Margin Comments |
| Side Note | [公开行为记录](third-party/behavior-references.md)：MIT，选区评论与评论视图参考 |
| Commentator（obsidian-criticmarkup） | [公开行为记录](third-party/behavior-references.md)：MIT，评论/审阅参考，不采用 CriticMarkup 解析器 |
| Smart Composer | [公开行为记录](third-party/behavior-references.md)：MIT，带笔记上下文的 AI 交互参考；历史采用提交待核实 |
| dbx | [色盘数值转写与视觉参考](third-party/behavior-references.md#dbx)：当前核验为 Apache-2.0；历史采用提交、原路径、版权及采用时许可待核实 |
| Windows Terminal | [公开协议记录](third-party/behavior-references.md)：MIT，ConPTY win32-input-mode 文档与本地键盘编码对应 |
```

## 问题与下一步

Lead 应用上述共享补丁后核对链接、十项覆盖与 Browser 冻结内容不变，复用未失效许可检查并记录当前 notices 结果。全仓 test:docs 的历史归档失败由 Lead 按原 owner 处理，不应将本票定向通过称为全仓通过。dbx 的不确定性已按 Ticket 的“未核实写待核实”规则公开记录；若要进一步补做历史采用与分发义务审计，需要准确历史来源，而不是扩大本票改写 NOTICE 或生产样式。
