# 三协议模型请求与预算接缝研究接纳

Root 实际派遣 047-model-protocol-preflight，收到 /root/foundation_research 的真实 MESSAGE 与 FINAL 后，完整分段回读 REPORT（1–107、108–229 行），亲自运行 return 校验 exit 0、errors/warnings 空，并核对 REPORT SHA-256：df2313f9ddcef414a7fbc5e63ed8d2b7d84d2567f571e5fda82f473dcd8f8956。原报告：sessions/20261025T043239Z/047-model-protocol-preflight/REPORT.md。manifest SHA-256：9cd487ca133a58be473f5e14972dfd146da7e501d69e480ee3f292552e4824bd，其列出的 10 个产物逐一实算字节数与摘要一致。

作者已停写，所有自有命令退出，没有产品进程或待回收子进程。45 个观察源文件在作者最后回读时摘要未变；这只证明该观察时点，不替代后续生产候选冻结。首次 return 的标题结构失败和修正后的实际 exit 0 均保留。

本次接纳的是实施研究，不是 T08/T09/T10/T12 验收。后续合同与实现应落实：可信 Run 绑定、逐实际 HTTP attempt 的持久 reserve/dispatch/settle、known/estimate/unknown 用量和取消在途不盲退；区分既有根 4 / Profile 8 子执行限制、实际 HTTP 生命周期与预算预留；所有模型轮次、工具后续、重试、问答、摘要和记忆维护使用同一准入机制。T01/T12 先用受控消费者验证，再由 T08–T10 接真实 SDK。

三协议适配需保留完整终结事实与协议状态，特别是 Chat EOF 与明确终结的区别、Responses usage presence / call_id / 最终 opaque reasoning，以及 Anthropic redacted / 空 thinking 签名。SDK 隐含重试必须关闭或逐 attempt 受控；stream Close 后还须观察 producer 真正结束。CP 继续复用既有不可变 Blob 与同事务发布，首个待批意图关闭新效果准入，拒绝/过期/续跑不得重复效果。具体受控桥由原 owner 在正式写集内完成，研究不授权越界修改 SDK 或公共合同。

报告中的 HTTP/SSE 故障矩阵全部未运行；002/034 历史编译和中断证据不升级为协议完成证明。真实 Provider、Obsidian 与目标 OS 操作仍由用户验收，本轮不请求凭证、不连接真实模型、不触碰系统 keyring。T02 配置/pin 原 owner 仍是 foundation_go。

T08–10实际消费者交接补充：当前 ModelAttempts 是可信 Go Engine 的窄 Port，公开注释要求 actual producer 结束后才 Settle；ProducerEnded 不能来自模型wire或仅逻辑cancel。三协议适配必须在每次HTTP的真实dispatch/stream goroutine退出后结算，含错误、EOF、取消和retry；保留在途producer时的额度与槽位。此处是已落地Port使用义务及未来消费者验证要求，不是三协议已完成。
