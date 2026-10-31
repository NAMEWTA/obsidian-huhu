# Map24 / Goal23：Chat 独立审查修复

用户完整28票55AC与Agent Team授权持续，最新回复再次明确真实模型/Obsidian/目标系统由用户后验，代码开发与本地验证继续。Root已亲自接收098：2032输入和15产物无漂移、return0，两轴request-changes；原始报告及两个真实红探针保持，见 evidence/098-lead-return.json。

F-098-01：把既有execution_runs.intent作为可信原受理Intent传入纯检查，并由同一common校验在Inspector和Resume比较最后初始user正文。不得从CP自身复制摘要充当独立基线，不承诺无可信旧历史基线的完整历史真实性，不机械比较刷新后全部history。保持Chat v1格式/身份/ToolDigest、同Run/CallID和原审批效果。

F-098-02：在解压后有界SSE原始字节、SDK有损JSON解码前校验UTF-8；合法多字节跨Read必须通过，EOF残行必须检查，非法后项阻止整批首Invoke。保持取消、排空、Body.Close、ProducerEnded与unknown保守结算及安全错误。

## 原owner与精确窗口

- 100 / engine_adapter：T08 common/{checkpoint,engine,tools}.go、chat/{body,driver}.go及tests/contract/engine/chat/**内必要测试。仅按最小修改，不换SDK/Engine循环。API/Broker/SQLite只读。
- 101 / foundation_go：T01 internal/application/api/recovery.go；T03 internal/adapters/outbound/sqlite/execution/recovery.go；T06 internal/application/tooling/broker/recovery.go；新增tests/contract/foundation/recovery_intent_test.go。仅两内部Inspection结构加Intent、原同Tx读取既有intent、原Broker透传；公共Run/HAP、迁移/SQL、go.mod/sum和bootstrap不变。字段统一Intent string。

T06由done重开in_progress，旧T16/G1完整接纳及T06历史证据保留；T16生产/测试无改动，保持其已接纳基线。本内部接缝和T08共同复验。T01/T02/T03/T08/T12原候选继续，T08累计attempts=1，不清空原失败。T27许可和七项docs记录保留，完整集成仍待后续。T09/T14研究不授予实施，DAG不变。

两作者可编辑各自不相交文件，但类型接缝稳定前不执行Go产品命令。101先完成透传并通知Root/100；Root在两方停写后给唯一检查窗，固定Go1.26.10/-mod=readonly。复用098既有真实红；一次受影响定向normal/race验证即可，无新失败不扩大旧重型全队列。作者实际Wait交回后Root新构建E2E，不复用旧二进制；再冻结新输入独立复审。所有日志/失败按原样保留，无真实凭证/外部模型/真实Vault，无提交推送发布归档。


Root调度细化：101三个生产接缝实际停写稳定后，100可冻结真实生产/import及自己的Chat测试闭包持唯一Go窗口；101在独立foundation测试文件继续编辑不影响Chat包，不要求冻结无关测试。101仍不跑Go，等100实际Wait交回后再接自己单例。此仅收窄必要输入冻结，不改变实现/审查合同或测试标准。
