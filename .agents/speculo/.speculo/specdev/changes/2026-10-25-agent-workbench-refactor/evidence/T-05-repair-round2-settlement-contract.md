# T-05 设备回复结算接缝增量

C 在 round2 窄修复中报告：仅将旧 packet 放入同 SID FIFO，不能证明 exit 之后才产生的 writer 结果已结束。Root 已通过实际 `collaboration.send_message` 接受下述最小增量；仍属原14路径、原 C owner、GP019/Map20，同一 repair cycle attempts2。原 Packet/Input 原样保留，未扩大 A/B 写权。

1. 内部 protocol3 双向可选协商 `capabilities.replySettlement=1`。无能力时不发送新 wire、不等待不存在的 fence；保留旧兼容行为，并明确旧 helper 不具备晚 I/O 诊断的结算保证。不能用 protocol3 本身推断新能力。
2. Node→native 严格控制帧 `{type:'reply-close',sid}`。收到 numeric exit 时同步关闭新 reply；其后调用给准确本地 `none/closed`，不产生新 wire。此前已准入的 reply 仍在原 SID reply FIFO 中，close marker 排在其后。容量不足只保留每 SID 一个待 marker，全 helper 最多32；writer恢复后只准入一次，不重发已 handed 的帧。
3. native→Node 严格控制帧 `{type:'reply-settled',sid}`。只有收到该 SID ingress fence、InputQueue 已关闭、writer 实际完成/丢弃后才产生。它沿同 SID stream 排在真实 reply-failure 后，使用常数独立预留，物理 write 后归还。numeric exit 和 master close 不等待 writer；EOF 可作最后 ingress fence 收束。待结算原生 Session 仍计有限槽，不能提前复用或为未知 SID 新建状态。
4. `NativeConnection` 增可选只读 `replySettlement?:1`；`NativeEvents` 增可选 `replySettled(sid):void`。Helper/Host 用它保留和退休 captured generation/SID/owner，A 既有 replyFailure 消费合同不变。重复、未知 SID、未开始结算就到达的 settled 不能提前释放路由。
5. Host release 沿原10s观察边界：未结算准确 timeout，保留有限原 scope 与晚结果路由；最终断链沿原 closed 处理。Browser sibling 不受影响。不得无界 tombstone、提前伪造 claimed 写失败、跨 generation 投递、重复 stop 或重放设备回复。

必须实际验证生产消费链、真实 Outbox writer 与全部结算时序，含 exit 前已排队 reply、exit 后 raw 解析的本地拒绝、marker容量/恢复/断链、正常成功、真实晚失败、owner release/timeout/sibling、legacy无cap及最终归还。当前是正式实现接缝，尚无新通过结果；原 reviewer 红灯及无cap旧探针来源保留。
