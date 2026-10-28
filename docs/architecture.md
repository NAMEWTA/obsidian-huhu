# HUHU 架构

HUHU 是 Obsidian 插件，入口为 `src/app/main.ts`，esbuild 生成单个 CommonJS `main.js`。样式由有序清单生成单个 `styles.css`；原生终端 helper 在 `native/pty-server`，通过 stdio 帧通信。工程规则从 [AGENTS](../AGENTS.md) 和[开发技能](../.agents/skills/dev/SKILL.md)进入。

## 分区与模块

| 分区           | 职责                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `app`          | 插件装配、模块注册、设置运行时、命令与叶子                                                         |
| `shell`        | 图标轨、侧栏、页面、导航和宿主状态栏                                                               |
| `ui` / `theme` | React 组件、所属窗口 Portal、令牌、主题及 Markdown 外观                                            |
| `host`         | 共用 Obsidian 和桌面适配                                                                           |
| `shared`       | 纯工具、设置、路径、存储和国际化契约                                                               |
| `modules`      | home、agent、browser、archives、automations、notifications、icons、comments、navigator、sync、safe |

模块通过彼此的 `api.ts` 访问服务和贡献点，不能导入别的模块内部实现。core 不依赖宿主；Node/Electron 仅存在于 desktop 边界。模块、页面与设置页按需加载，React/Radix 不进入启动闭包；架构和包体检查强制这些约束。

## 启动与生命周期

插件先注册清单、设置与叶子，再按开关激活模块。模块状态区分关闭、不支持、待加载、加载中、运行、释放和失败；单模块失败不阻止其他模块。模块订阅、任务、监听器和进程在 dispose 时释放。服务的 acquire 返回租约，peek 不激活模块，watch 跟踪可用性。

桌面原生 helper 由 `host/desktop/native` 的宿主 owner 管理，纯端口与帧协议位于 `shared/native`。app 注入惰性入口；Agent 的 PTY/历史和 Browser 的每次 Cookie 请求分别租用能力，模块只释放自己的租约，最后一个 owner 释放后等待 helper 退出。helper 崩溃会使该代次的租约失效，后续明确请求才建立新连接；Agent 停用不会中断 Browser 已接纳的 Cookie 请求。Agent 激活只装配自有状态，账号准备、CLI 检测与登录 Shell 探测在明确使用页面、设置或执行能力时进行。

注册工作台、批注和导航器三种叶子。产品页面通过模块贡献挂入工作台；智能体内部的终端、看板和统计使用自己的标签，浏览器由 browser 模块贡献独立工作台页面，并与 Agent 标签共享同一布局 owner。详见[工作台](workbench.md)。

## 状态与数据

服务层拥有 zustand/vanilla 业务仓库；React 订阅并发送动作。设置按命名空间和库/设备范围存储，不新增平铺 saveData。叶子只保存有界界面状态，不保存保险箱敏感内容。

用户内容在可见 huhu 根；配置、受管 Markdown 与运行数据在隐藏根。所有路径、设备隔离、链接拒绝、写入合并和恢复的实际约定见[数据与恢复](data.md)。看板与自动化定义才属于隐藏受管文档，不能将任意私有文件回落到普通笔记接口。损坏或读取失败不能当作空内容覆盖。

## React、样式和所属窗口

ReactSurface 每个页面一个根，关闭时卸载；Portal 与 sonner 使用元素所属 Document 的共享容器。所有组件和弹层保留 huhu-ui 作用域。主题、令牌、Tailwind 与中和层见[设计系统](design-system.md)。

## 模块边界

- home 管理看板、小组件、任务聚合与记录；周期笔记经 navigator API 访问。
- agent 管理 CLI/PTY、账号、技能、标签及工作空间用量；browser 经公开宿主服务提供网页能力和独立工作台页面。
- automations 拥有定义、计划、预检、设备归属和投递记录；其他模块经 composer 服务创建操作。
- comments 不改写笔记正文；safe 使用独立认证密文仓库，不执行自动明文合并或备份回退。
- sync 只接受当前打开库内的仓库身份，不把父目录仓库误作当前库。

## 验证与产物

类型、架构、国际化、DOM、黄金样本、安全回归和真实宿主分层验证。正式代码及资源变更后重建产物并验证可复现，平台验收不相互冒充。命令和发布门禁见[开发发布](development.md)，选择表见[测试参考](../.agents/skills/dev/references/testing.md)。
