# 多 Agent、Team 与可核验交付

## 1. 不是“spawn + 画布”

持久 Bot、临时执行者、Team membership、允许委派目标、实际授权互不等同。每个子工作拥有独立 PiSession/Attempt，继承的是明确目标、交付物、验收条件及缩减来源，不是父的整个聊天/私密记忆/密钥/内部推理。@Bot 只决定路由，不能授予读权限。

Conversation 的共享消息可见性按成员和 recipient/provider 再过滤。孩子更换模型若改变接收方，必须重新授权来源；临时 Agent 完成后保留可追溯配置快照而非自动新增持久 Bot。

## 2. Admission、等待、终结

root 的 reserve/depth/total attempts/wakes/concurrency 事务化；子重试也占总 attempt。先获取 session 操作所有权，再等全局容量；父等待孩子时释放容量但保留自己的 session writer，避免所有槽都被等待父占满。收到结果后用幂等 wake 重新排队，不递归在回调中启动无限工作。

取消 tree 记录意图并向子/工具传播，保留未确认终止的节点；root 不因“已发送 cancel”立即显示全部 cancelled。已确认外部效果不撤回，unknown 先对账。复原历史不会复活旧 Promise，恢复产生新 attempt/连接，引用可信回执继续。

## 3. Mailbox 与审查

| 状态/事实 | 证明什么 | 不证明什么 |
|---|---|---|
| pending | envelope durable，尚未接收 | 执行已开始 |
| accepted | 目标接收或入队 | 已消费/已完成 |
| consumed | 目标确认消费该输入 | 任务成功 |
| child terminal | 一次执行结束及其结果状态 | 根目标通过 |
| submitted artifact | 子结果提交，含来源与版本 | Lead 已验收 |
| root review accepted | 根验收合同通过 | 不代表所有外部效果可逆 |

相同 envelopeId 重投递返回同一回执；相同 ID 不同 payload 拒绝。目标已结束拒绝并给安全动作，不暗中唤醒任意新工作；明确续做须新 attempt。review 带结果 revision，过时产物不能被批准为最新结果。

## 4. 三图分离

Pi 分支图节点用 session/entry IDs；执行树节点用 run/attempt；通信边用 envelope/reply IDs。执行 ancestry 不许环；通信覆盖层允许环。UI“拖动布局”只能改 display position，不写 parentRunId。节点链接应回到真实 transcript/source/approval/artifact，不另造只存在画布中的任务。

树先复用现有 headless-tree/虚拟化；图层候选 @xyflow/react+Dagre 按需加载。父子 DAG 布局后叠通信；动态节点尺寸、折叠和500节点用夹具测，不以库名充当性能证明。原型仅固定3节点示意，不是自行实现 production layout engine。

## 5. 样例 C 的可判卷步骤

创建“研究笔记协作方法”根工作 → Lead 选2个临时研究者 → 预览每个来源范围/模型接收方/预算 → 分配独立 session → 其中一个提问，用户答复进独立 Mailbox → 另一个失败并受限 retry → 两个孩子提交带来源 artifact → Lead 展示接受/退回/要求修订 → 只有根 review 通过才显示交付完成。

负向路径：parent等child时并发槽可用；预算不足不新增child；超过depth/attempt拒绝；发送重试不重复消费；取消后迟到结果不改 terminal；私有记忆 canary 不出现在孩子提示/检索/日志；受限来源撤销后再汇总不得泄漏。完整步骤与 A14–A17 见 acceptance-plan。
