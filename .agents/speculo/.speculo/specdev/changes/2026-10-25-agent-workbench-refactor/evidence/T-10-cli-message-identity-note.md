# T10 CLI 消息身份：Root 准备补充

只读源码核验后的工程候选，不是正式 Ticket / Spec 修改、写权限或验收。T09 正在实施；T10 要在其最终接口、实际 DoR 和精确分配稳定后开始。

022 准备报告建议把 `message send` 的 `--message` 改为必填，理由之一是 parse 阶段默认 requestId 为 `huhu`。Root 回读 T09 初始冻结的实际 cli.rs，确认公开 run() 在 IPC 前已经调用原 `ipc::platform::nonce()`，把该占位 requestId 换成随机 ID。原报告只观察 parse 阶段，不代表公开 CLI 传输使用固定 ID；旧报告及原始证据保留，不回写。

请求关联 ID 与持久消息 ID 仍然是不同身份。原批准 implementation-contracts §CLI 示例是 `message send --to-session <id> (--stdin|--file <path>)`，没有要求额外 message 参数；不应仅因准备建议就将已有计划用法改为失败。

推荐在原 CLI 边界允许可选 `--message <id>`，未提供时使用已有生产 nonce 原语生成一次消息 ID；原始 wire send 仍要求完整消息 ID，宿主不得在写入后才分配。不要增加随机数依赖，不复用 requestId 作为业务 ID。显式提供 ID 的调用者在发送前已知它，GUI 也在发送前保留一次生成的 ID、原收件人与正文。每次请求均保留原 scope/deadline/取消边界。

正常回执和可能写入的失败都须保留本次 message ID。现 control/client.rs::failure 只保留 request/operation/target，不含 params；因此实现时必须在原 CLI run/结果边界或最小共享接缝把本次已知 ID 带到输出，再核完整 envelope 上限。先检查是否可只改 cli.rs，不机械扩大 client.rs 权限。响应丢失后按 ID 进行同 owner 的只读持久核对，禁止自动重发。

这不承诺 CLI 被强杀后仍能输出 ID，也不承诺 exactly-once。需要跨调用者崩溃保留核对身份的脚本应显式提供 message ID。重复 ID 只做原记录唯一性防护，不覆盖原文或偷偷变更收件人；准确响应语义在正式工程合同中固定，并通过真实 CLI → Host → 原 SpaceService 的测试证明。

正式实施前复核点：T09 最终 CLI 参数默认目标规则、canonical 字段与完整 response data 预算；T10 send 的真实持久事实和 unknown 核对 API；`--to-session` 与 `--session` 重复拒绝、stdin/file 有界 UTF-8 读取、已知消息 ID 的网络前失败与发送后断链输出。此补充本身没有运行任何产品测试。
