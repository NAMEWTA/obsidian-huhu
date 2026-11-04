# HUHU 架构

HUHU 是 Obsidian 插件，界面入口为 `src/app/main.ts`，esbuild 生成 CommonJS `main.js`；样式由有序清单生成单个 `styles.css`。原生终端 helper 在 `native/pty-server`，使用自己的受限协议。工程规则从 [AGENTS](../AGENTS.md) 和[开发技能](../.agents/skills/dev/SKILL.md)进入。

## 分区与模块

| 分区 | 职责 |
|---|---|
| `app` | 插件装配、模块注册、设置运行时、命令与叶子 |
| `shell` | 图标轨、侧栏、页面、导航和宿主状态栏 |
| `ui` / `theme` | React 组件、所属窗口 Portal、令牌、主题及 Markdown 外观 |
| `host` | 共用 Obsidian 和桌面适配 |
| `shared` | 纯工具、设置、路径、存储和国际化契约 |
| `modules` | home、task、agent、archives、automations、notifications、icons、comments、navigator、versioning、safe |

模块通过彼此的 `api.ts` 访问服务和贡献点，不能导入别的模块内部实现。core 不依赖宿主；Node/Electron 仅存在于 desktop 边界。模块、页面与设置页按需加载，React/Radix 不进入启动闭包；架构和包体检查强制这些约束。

## 启动与生命周期

插件先注册清单、设置与叶子，再按开关激活模块。模块状态区分关闭、不支持、待加载、加载中、运行、释放和失败；单模块失败不阻止其他模块。模块订阅、任务、监听器和进程在 dispose 时释放。服务的 acquire 返回租约，peek 不激活模块，watch 跟踪可用性。

桌面原生终端 helper 由 app 的惰性 NativeHost 管理，纯端口与帧协议位于 `shared/native`。Agent 的 PTY 与历史租用该 helper。Agent 激活只装配自有状态，账号准备、CLI 检测与登录 Shell 探测在明确使用页面、设置或执行能力时进行。

注册工作台、批注和导航器三种叶子。产品页面通过模块贡献挂入工作台，不新增宿主叶子类型。智能体的终端、看板和统计仍由自己的标签布局管理。详见[工作台](workbench.md)。

## 状态与数据

服务层拥有 zustand/vanilla 业务仓库；React 订阅并发送动作。设置按命名空间和库/设备范围存储，不新增平铺 saveData。叶子只保存有界界面状态，不保存保险箱敏感内容。

用户内容在可见 huhu 根；配置、受管 Markdown 与运行数据在隐藏根。所有路径、设备隔离、链接拒绝、写入合并和恢复的实际约定见[数据与恢复](data.md)。看板与自动化定义才属于隐藏受管文档，不能将任意私有文件回落到普通笔记接口。损坏或读取失败不能当作空内容覆盖。

## React、样式和所属窗口

ReactSurface 每个页面一个根，关闭时卸载；Portal 与 sonner 使用元素所属 Document 的共享容器。所有组件和弹层保留 huhu-ui 作用域。主题、令牌、Tailwind 与中和层见[设计系统](design-system.md)。

## 模块边界

- home 管理看板、小组件与记录；task 独立拥有任务、关联、时间、重复实例与公开工具。看板和日历只消费 task API，周期笔记经 navigator API 访问。
- task 使用可见 `huhu/tasks/tasks.json` 原子保存任务、系列、历史和幂等回执；不扫描旧复选框，不依赖 Home 启停。详见[任务领域设计](task-domain.md)。
- agent 管理 CLI/PTY、Space、账号、技能、标签及工作空间用量。
- automations 拥有定义、计划、预检、设备归属和投递记录；其他模块经 composer 服务创建操作。
- comments 不改写笔记正文；safe 使用独立认证密文仓库，不执行自动明文合并或备份回退。
- archives 在一个领域内管理类型/字段、表单、模板、实体、关系与视图；公开 catalog/query/commands 和工作台契约。v2 定义修订和恢复计划随可见资料保存；详见[档案实施方案](archives-implementation.md)。
- versioning 只接受当前打开库内的仓库身份，不把父目录仓库误作当前库。HistoryQueryService 负责纯读取；NoteReviewService 固定来源 buffer 与比较会话；RestoreService 通过共享写入队列、检查点与正文适配器恢复，SyncService 保留同步调度。
- app/editor-panel 提供同窗口 EditorContextAccess 和批注/历史宿主；revision-review 复用工作台贡献，不新增 Obsidian 原生视图类型。comments 的写入参与者只映射锚点，不回滚评论消息。

## 验证与产物

类型、架构、国际化、DOM、黄金样本、安全回归和真实宿主分层验证。正式代码及资源变更后重建产物并验证可复现，平台验收不相互冒充。命令和发布门禁见[开发发布](development.md)，选择表见[测试参考](../.agents/skills/dev/references/testing.md)。

## 决策与领域术语

长期取舍从 [ADR 索引](../.agents/speculo/.speculo/specdev/adr/INDEX.md)进入，项目术语从 [context 索引](../.agents/speculo/.speculo/specdev/context/INDEX.md)进入。已采纳合同与当前实现分别判断，历史来源和未验收项保留在各条目链接的归档 change 中。
