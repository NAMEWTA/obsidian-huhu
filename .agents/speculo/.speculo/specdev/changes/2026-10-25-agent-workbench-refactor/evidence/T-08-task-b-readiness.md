# T08 输入就绪正例只读准备

原 Goal 全18票、GP023/Map24；T07 正在实施，T08 未解锁。B 的 T07 12个产品文件保持 SOURCE STOPPED，本任务不授予产品、正式状态、设置或产物写入。当前仓库 HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；既有 T01–07 工作区由原 owner 持有。只可写 `/tmp/huhu-t08-b-readiness-*` 和自有临时研究目录；不得使用真实用户HOME、Vault、Provider账号或发消息，不安装/改仓库 node_modules，不提交推送发布。

目标：用新的可证伪角度核查 T08 的正常 Agent prompt 路径，不重新泛搜 Provider，也不把全部拒绝当成功。先读 `ticket/08-terminal-coordination.md`、Spec §5/输入相关条款及 implementation-contracts 对应条款，再读已有实际报告：

- `/tmp/huhu-t08-a-positive-path.md/.json`
- `/tmp/huhu-t08-a-editor-identity-addendum.md/.json`
- `/tmp/huhu-t08-root-controlled-pi-candidate.md`
- `/tmp/huhu-t08-root-pi-control-sources/source-index.json`

已有事实：HUHU inputReady 只是连接/未关闭/bracketed-paste，不证明Agent接收prompt。官方MIT Pi固定提交 d5b3de22d0e24a3e9c38a9410d3329b099717283（@earendil-works/pi-coding-agent 1.4.0）的 CustomEditor 类型/idle 不能独立证明默认输入位，startup时序有反例。Root 新候选仅适用于用户本来已配置 --no-extensions 且实际直接已审定CLI只载HUHU扩展；不自动禁用他人扩展、不替换编辑器、不改成模型RPC。此候选未被选择或验证。

请完成一个有结论的窄研究：

1. 区分规范明确要求与既有研究附加的技术假设，给出最小可支持的正常路径条件；不要仅重复“都不可靠”。若当前假设导致不必要地无法实现，指出原文与具体可收敛边界。
2. 固定源的公开 ctx.ui.onTerminalInput / pasteToEditor / session_start 等实际消费顺序，能否在原TUI事件栈验证并提交到正常默认编辑器，同时保留原生working→steer语义、审批/selector/启动/扩展reload/已有文本/组字等拒绝条件。明确哪些能力公开、哪些实际不存在。不要提出无必要的新daemon或持久store。
3. 若需要核对发行 bundle 与扩展构造器是否同身份，可只从官方 npm/GitHub 固定版本获取已审定MIT材料到/tmp，在干净临时HOME、无账号/网络模型调用的离线实验验证。不运行真实Provider任务，不安装项目依赖。实验失败保留实际原件；缺依赖时说明，不把源码推导写成运行通过。
4. 给出可证伪的支持/不支持结论、最小后续实施边界与必需正反例；新通道只是候选，不改当前 schema/输入合同或解锁代码。未知OS前台与每次实际write接收者仍交C/native设计，不能由JS焦点替代。

只使用已有本地原件或官方MIT主源；需要最新/外部事实用web工具核查并记录固定URL/SHA，不接触GPL终端源码。返回 `/tmp/huhu-t08-b-readiness-report.md/.json`，列实际输入摘要、引用行、命令/UTC/exit/log、已跑与未跑、产品写入为0。不要为形式扩展资料库。此研究不是T07独立审查，也不是T08验收。完成后 READ-ONLY SOURCE STOPPED。
