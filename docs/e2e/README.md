# dev 集成分支端到端点测

环境：Obsidian **1.14.5**（`obsidian_1.14.5_amd64.deb`），插件为 `dev` 分支上 `pnpm run build` 生成的 `main.js` / `styles.css`。每次点测使用一次性测试库，经远程调试操作真实界面。截图与本报告一起提交在 `docs/e2e/`。

`pnpm run test:all` 在同一棵树上通过：48 个脚本全部通过；其中 Vitest 为 **4297 passed、3 skipped、0 failed**。

## issue 与截图

| 编号 | 功能 | 截图 | 验证了什么 | 结果 |
|---|---|---|---|---|
| #7、PR #10 | 独立任务领域 | [task-create.png](task-create.png)、[task-saved.png](task-saved.png)、[dashboard-tasks.png](dashboard-tasks.png) | 打开任务工作台，填写「集成点测任务」并保存；首页看板挂载同一任务视图 | 通过。未完成计数变为 1，列表出现该任务及创建时间。首页日历旁的任务小组件显示「未完成 0」是打开看板时的空状态，随后在任务页写入成功 |
| #3、PR #13 | 档案通用化 | [archives-create.png](archives-create.png) | 打开档案，侧栏为类型树（定义设计器、迁移与恢复、个人档案、企业档案），点击新建档案 | 通过。进入通用表单，个人档案字段（名称、别名、地区、电话、邮箱等）按类型渲染，并保留值的存在状态 |
| #6、PR #11 | 高亮摘录 | [highlights.png](highlights.png) | 打开笔记，在正文划词 | 通过。出现高亮卡片「是一段可以划词高」，右侧摘录面板计数为 1，可继续记笔记和打标签 |
| #2、PR #4 | Git 笔记历史 | [versioning-history.png](versioning-history.png)、[note-history.png](note-history.png) | 测试库内两次提交后打开版本管理的历史模式，并打开笔记侧栏的历史标签 | 通过。历史列表出现 `revise note` 与 `initial note`。笔记面板的历史标签列出这两次提交和作者 |
| #12 | 保险箱与笔记完善 | [safe-created.png](safe-created.png)、[navigator.png](navigator.png) | 用主密码创建保险箱；打开笔记导航器 | 通过。保险箱进入空库，可见搜索、新增条目和立即锁定。导航器搜索框常驻，并有「在导航器中定位当前笔记」 |
| #1、PR #5、PR #14 | 独立 Agent Browser 及二期 | [browser-workspace.png](browser-workspace.png) | 打开浏览器工作台 | 界面通过。页面是浏览器空间，含新建空间、身份种子、文件，以及安装运行包、重新检查运行时。本环境没有已发布的受管 Chromium 运行包，系统凭据保护也不可用，因此没有继续创建空间，也没有打开同页 Agent 交接对话框 |

## 本环境未能继续往下操作的界面

- 浏览器同页交接（PR #14 的 `handoff`）只在已有受管页面和控制权时出现。运行包未安装，交接对话框没有打开。浏览器模块页面本身已在上表截图中打开。
- `NAMEWTA/bot` 已合入。打开 Bot 页面时插件向发行地址下载 Runner，返回 `HUHUBOT_DOWNLOAD_FAILED`（当前版本没有对应发行附件）。Bot 聊天界面因此没有单独截成成功页。
