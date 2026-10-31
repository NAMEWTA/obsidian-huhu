# Tool Gateway、安全与预算合同

依据 Issue §6/§10/§11，ADR-005。用户界面中的开关不是安全边界；模型提示、网页文字、MCP 描述、Skill 文本都不能为自身增加权限。

## 1. 描述与执行分离

Descriptor：namespace/name、revision、input/output schema、risk、requiredCapabilities、availability、timeout、maxInput/ResultBytes、source/provenance。Catalog 没有密钥、App 或执行函数。Runtime 只发 toolId/revision 与规范化参数；Host 在自己拥有的映射表里找实现，不能接受 arbitrary method/path/code。

已有 Ajv/Zod 用于边界校验；Pi 需要的 TypeBox/schema 适配单点维护。验证数字/字符串差异、union/oneOf、unknown fields、schema 大小和嵌套深度，不用 `as any` 跳过合同。外部返回也校验、限量和脱敏，截断必须显式且可回读受权 artifact。

## 2. 能力计算

有效能力 = 当前 principal grant ∩ Bot allowlist ∩ attempt snapshot ∩ delegation 缩减授权 ∩ live module lease ∩ source/provider recipient policy ∩ 当前工具 revision 约束。任一缺失则拒绝。Team membership、@mentions、看到工具名字、模型自称管理员都不扩大交集。

snapshot 固定模型当轮看到的工具/Skill 描述；live checks 固定执行瞬间的有效权限。两者并存，不以“稳定快照”为理由继续已被禁用的模块，也不在活跃模型上下文悄悄换 schema。

## 3. 副作用管线与 TOCTOU

schema → identity/scope → data recipient → quota reserve → prepare preview → user single approval → durable prepared intent/approval consume → Host live checks → owner API → durable receipt/outbox → settle。预览与批准可有 UI 等待；执行前复核必须接近真实业务写入，由业务 owner 原子检查 target revision/dirty buffer（支持时）。仅 Runtime 先 check 再过很久调用会留下竞态。

批准绑定 principal、root/attempt、tool revision、canonical params hash、resource IDs、source/target revisions、recipient provider、capability snapshot、expiresAt、consumption。用户改需求、文件被人工编辑、provider fallback、工具/MCP schema 变更、lease 撤销都失效。拒绝不调用工具；连续双击只有一次 CAS 消费。unknown_effect 页面禁用再次批准同一 intent，先核实结果。

## 4. 信任边界表

| 边界/攻击 | 必须阻断或降级 | 对应验证 |
|---|---|---|
| SDK 默认 read/bash/edit/write | 初始化显式 noTools/allow/deny 与受控资源；实际枚举可调用集合 | builtin/extension/MCP/codemode/tool-search 敌对调用 |
| MCP 仍留在 codemode/search | `tools` 字符串白名单不等于完全停用 MCP；验证实际 dispatch | 不以工具列表截图代替执行证明 |
| 任意 JS/TS Extension | v1 默认关闭第三方执行；可信内部扩展明确主机权限 | 不宣传 utilityProcess 沙箱 |
| shell / powershell | 默认关闭；高级能力单独审批/期限/权限说明 | cwd/path checks 不等于 OS sandbox |
| scratch read/write | normalize/realpath/符号链接边界/大小/revision | Windows 路径、symlink、遍历、别名冲突 |
| note write | public API + source/target revision + dirty-editor 检查 | 不用 fs 直接覆盖 Obsidian 编辑器 |
| archives/safe | 字段/记录 scope；密码、token 默认不可检索 | 禁止 fulltext 绕过字段权限 |
| 外部内容提示注入 | 文本为带来源数据；不能触发新安装/权限/密钥读取 | 网页/MCP/Skill 伪造“系统命令”夹具 |
| credential errors/log/export | 秘密从保护服务获取，最短生命周期与脱敏 | token canary 扫日志/JSONL/导出/错误 |
| 模块禁用、旧 generation | Host 最后核对连接与 lease，拒绝迟到执行 | 调用前/调用中 revoke 与 dispose race |

Pi options 的真实关系见 [sdk.ts v1.4.0](https://github.com/earendil-works/pi/blob/v1.4.0/packages/coding-agent/src/core/sdk.ts)；这也是不能凭 allowlist 命名推断安全的理由。

## 5. 预算不变量

根账户（可加 profile 上限）统一拥有已用、预留和限额。模型/工具/子委派/重试/摘要/标题/compaction/远程 embedding 都在调用前入账；并发 reserve 在同一状态事务检查，防止两个孩子同时拿到全部余额。

token、请求、tool count、concurrency、depth、attempts、wall-time 分别可执行；费用带 currency/price source/更新时间与 unknown/estimate/known，不把缺 usage 记零。不能承诺任意供应商都有精确货币硬停止。未知占用保守保留并显示原因，直到可信结算/明确人工策略，不把断网当免费。

Pi 自动 compaction 的计量与限额钩子必须在 P0/T-07 证明可覆盖；无法覆盖时禁用相关自动路径或阻断该配置，不能为了预算控制又自写 compaction loop。第三方 provider retry 不跨重复效果；协调重试由一个 owner 持有限额。

候选多 Agent 配额 children concurrent=2/depth=2/root attempts=16 来自 Issue，尚需夹具和产品冻结。维护任务不得另拿无限 budget。UI 同时显示已计量、预留和未知，避免一个看似准确的货币总数。

## 6. MCP 特别约束

Client 只使用已批准 server identity/config/command/cwd；不自动运行返回的安装指令。schema/身份变化暂停相关 capability，下一安全边界重建快照。Server 默认关闭，外部主体单独配 grant，只暴露允许子集；Host/Origin/身份/size/rate/timeout 都验证，loopback 不替代认证。

MCP response 只表示标准协议工具结果；HUHU 的外部效果状态需真实 receipt。外部请求断连不自动撤销已经执行的写；重复请求须进入同一幂等/approval 管线。具体 SDK 与协议版本选型见 reuse-map R-008，禁止把不同版本示例混合。

## 7. 安全出口

无法证明未产生效果：UNKNOWN_EFFECT，保留 effectId、诊断与核查入口，禁止自动 retry。已确认部分成功：逐项列出，依赖全量结果的后续步骤暂停。权威 state 不可用：fail-closed。合法只读但模型不可用：保留历史、草稿和明确降级，不白屏。
