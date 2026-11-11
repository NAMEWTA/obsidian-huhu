# AGENTS.md

## 项目

HUHU 是 Obsidian 插件，插件 id 为 `huhu`。源码是 TypeScript 和 React，用 esbuild 打成提交在仓库里的 `main.js`。原生终端辅助程序是 `native/pty-server` 里的 Rust。HUHU 库内数据分两块根：可见的 `huhu/` 放用户内容与资料（日志、闪念、收件箱、档案、记账等记录），由 vault API 读写；隐藏的 `.huhu/` 放设置、看板（`.huhu/dashboards/`）、自动化定义和各类运行数据（含加密保险箱 `.huhu/safe/`）。普通笔记、宿主自身数据和 Git 元数据保留原位。系统 CLI 账号、状态 Hook、导航器 IndexedDB 缓存及用户指定导出的边界见[数据与恢复](docs/data.md#库之外的数据)。

## 命令

在仓库根目录用 pnpm：

- 安装依赖：`pnpm install`
- 构建：`pnpm run build`（类型检查、样式检查，并重建 `main.js`）
- 检查：`pnpm run lint`（零警告）
- 测试：`pnpm test`

以上是命令目录，不是每次任务的必跑清单。按改动和风险选择验证，命令与选择依据见[开发验证](docs/development.md)。只读审查和纯文档修改不要求构建插件。

## 按任务读取

只打开当前任务需要的入口和参考；涉及两类职责时组合使用，不递归通读所有链接。已读且未变化的规则可复用：

- 改插件代码、设置、测试、构建或发版：[实施技能](.agents/skills/dev-build/SKILL.md)和[工程约定](docs/architecture.md)
- 改工作台页面、面板、对话框或样式：[界面技能](.agents/skills/dev-ui-design/SKILL.md)和[设计系统](docs/design-system.md)
- 查领域术语、架构决定或当前基线：[开发文档索引](docs/architecture.md)

## 结构

- `src/app/main.ts`：插件入口，产物是仓库里的 `main.js`
- `src/modules/`：各功能模块，彼此只通过对方的 `api.ts` 访问
- `src/shell/`：三栏工作台的布局和导航
- `src/ui/`：设计系统
- `native/pty-server`：终端辅助程序，发行二进制由 CI 构建，本地可构建和测试

分区、懒加载和持久化名称见开发规则里的架构参考。

## 边界

- 只做被要求的改动。修复一处缺陷时不顺手改版式或重排无关界面。
- 面向用户的文案用 `t()`，在所属词典里同时给出 `en` 和 `zh`。
- 不新建插件脚手架，不再更改插件 id，不把仓库改成网页应用。
- 终端代码不复制、不改写 GPL 许可的终端项目。
- 不提交密钥，不改 `node_modules/`。
- 用户没有要求时，不提交、不推送、不升版本、不发版。已有授权在当前任务中持续有效；只有新增范围、风险或缺失决定时才补充询问。
- 构建改了 `main.js` 或 `styles.css` 时，把产物和源码留在工作区；用户要求提交时再一起提交。

## 文档

当前项目维护文档只保留中文；根目录 README.md / README.ZH.md 保持双语。删除重复版本前合并仍成立的独有信息。产品界面继续保留 t() 与 en/zh；原始许可、署名、测试夹具和历史归档保留原文。长期决策与业务背景统一保存在 `.agents/dev/notes/`，由 `dev-archive` 按证据与替代关系整理，不在普通实现中随意改写；入口见[项目知识导航](.agents/dev/notes/index.md)。任务与历史资料按 `.agents/dev/AGENTS.md` 分区保存。不要恢复 CLAUDE.md。

## Git

提交说明用 `type(scope): 说明`。

## 尽可能复用
遇到不熟悉的功能，不要立即从零实现。先检索 GitHub 上维护活跃「近两年活跃」、许可证明确的同类开源项目，比较实现思路、依赖和已知问题。优先借鉴经过验证的设计，不要直接复制不兼容或来源不明的代码。
