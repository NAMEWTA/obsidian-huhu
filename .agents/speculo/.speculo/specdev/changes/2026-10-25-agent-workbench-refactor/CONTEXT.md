# HUHU 终端工作台

本文件只定义当前术语。行为以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path> 为准；已选定 A 的页面与交互以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path> 为准。实施导航与术语字段的接线分别在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path>，研究参照见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>。这些工程映射不改变本文件名词含义，原方案任务平台术语不自动进入当前范围。

**Space（空间）**：组织当前 Vault 内终端与 Agent 工作的容器；工作目录可以是用户明确授权的库外本机目录，同目录不自动合并 Space 或历史。
_Avoid_: 以 cwd 作为空间身份

**授权工作目录**：用户为本次工作明确选择和授权的真实本机目录；目录绑定不等于操作系统沙箱。
_Avoid_: 自动信任任意输入路径

**被动通知**：保存到接收者邮箱的信息，由 Agent 主动读取和确认读取；通知本身不启动新任务，也不自动注入下一次输入。
_Avoid_: 将消息送达等同于模型已经理解

**HUHU 业务备份**：包含 HUHU 自有会话、消息、结果、标注及来源引用的可恢复数据集合；原生完整对话与账号登录凭证不因此自动包含在内。
_Avoid_: 以来源引用冒充已备份原生正文

**共享网页视图**：保留网页原有入口与标签体验、可独立于 Agent 功能开关存在的视图；不是 Agent 会话，也不要求先创建 Space。
_Avoid_: 用 Agent 的启动或停止隐式控制网页生命周期

**终端协作**：通过 HUHU CLI 控制受管的真实终端，向另一个 Agent 发送输入、等待状态，再读取输出或检查产物。首轮不承诺每条输入与最终结果的持久关联。
_Avoid_: 将终端输入回执解释为任务受理或任务成功

**状态等待**：观察指定终端或 Agent，直到其状态达到请求条件或等待结束；达到空闲、完成或待处理等状态，只说明状态条件满足，不能单独证明刚发送的那条任务已成功。
_Avoid_: 把 wait 返回或超时分别等同于任务成功或输入未生效

**Session（会话记录）**：Space 下一个 Agent 或 Shell 的持久身份及来源引用；可在进程停止或视图关闭后保留。不是原生进程、Pane，也不是逐任务 Run。
_Avoid_: 用 PID、标签顺序或 cwd 作为持久会话 ID

**Terminal runtime（终端运行）**：Session 当前一次运行的进程、权威屏幕与活动状态；显式重新启动或继续时更换运行代次，用于隔离迟到事件。
_Avoid_: 将前一次运行的 Hook 或退出事件套用到新运行

**明确寻址**：默认发现当前 Space；指定稳定目标后可控制同 Vault 其他 Space 的会话/面板。跨 Space 操作不迁移归属，跨 Vault 不支持。
_Avoid_: 根据同名、相同 cwd 或过期 endpoint 猜目标

**面板控制**：查询、附加、聚焦、分屏、调整或关闭会话的显示绑定；关闭显示不等于停止底层终端。
_Avoid_: 将关闭 Pane/Tab 实现成隐式结束进程

**原生业务结果**：现有一次性自动化/业务执行接口取得的 Provider 完整答案及原状态；其既有合同继续保留，与新增终端协作的屏幕读取不同。
_Avoid_: 因采用 Herdr 式协作而把既有业务结果降级为屏幕文本
