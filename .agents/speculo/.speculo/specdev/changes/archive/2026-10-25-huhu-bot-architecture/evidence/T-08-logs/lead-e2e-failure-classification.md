# Root Chat E2E 真实失败分类与最终通过

r1 的 Go 默认CLI构建 exit0/Wait1.930s、TS探针构建0/0.398s，Node实际126/0.375s。探针将公开 ModelBinding（含 revision/credentialStatus）送入只接受 ModelBindingDraft 的 models.test，HAP 按 additionalProperties:false 正确拒绝 INVALID_METHOD_PARAMS。原model/schema未修改；r2只传原draft加Responses枚举。

r2 TS构建0/0.513s，Node实际126/0.749s。真实生成、取消及审批已推进；探针错误期待拒绝工具结果含小写 rejected，正式Broker安全工具结果为 APPROVAL_REJECTED，服务端断言主动断流导致Run failed。根源码tools_test已有该固定原因。仅外部探针修正精确语义；原始服务器错误、失败进程和数据库均保留，不能称产品红灯。

r3 TS构建0/0.493s，Node0/Wait0.794s。r2/r3复用r1同1985输入且无漂移的成功Go二进制，均保存原构建回执/复制后binary摘要；未无变化重编译。r3十类产品行为、7生成/1metadata、两个CLI自然exit0/null、stderr0、Host写入/监听器清理、HTTP连接/计时器归零均断言。实际完整输入SHA fe7c6b9e4073ce94556033c10fb8c04c752092badcc87bfc7ddf5c1785a9b306，sourceDrift=[]。

实际SQL只读回读：integrity ok、FK[]，7个attempt均settled/producer_ended1；known4总收费58、unknown3总收费13102；effects committed/rejected各1；pin/slot/reserved全部0。物理笔记更新1且第二笔记不变，原两个call_id顺序回填。

此为生产TS/HAP/默认CLI/真实固定SDK loopback HTTP及生产Host/read/write/receipt适配器，Vault API与Obsidian类型仅受控夹具。真实Provider、Obsidian、用户OS/keyring未验收。r3原始记录 lead-chat-e2e-r3.json，不以本地检查冒充现场。
