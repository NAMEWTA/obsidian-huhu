# T16 恢复客户端候选

Session: 20261025T043239Z
Task: 082-recovery-client
Status: completed

## 聚焦交接

已完成真实 BotClient 上的 RecoveryClient、目标 Run 的 EventClient.reanchor、runs.recovery 代理与唯一 schema 的 144 方法校验闭包。资格查询只展示服务端恢复记录；ready 不执行，显式 resume 保留同一 Run 与完整 CAS、generation、commandId 和 idempotencyKey，双击共享 Promise，uncertain 只允许原命令显式 retry。同 Profile/commandEpoch 重连使用原 controller 的 setClient，不自动重播；Profile 或 commandEpoch 变化拒绝。9 个生产/测试文件已冻结，全部自有检查和受控子进程均已 Wait；这是 TS 候选交回，不宣布 T16 或联合业务验收通过。081 已收到生产接口和冻结 SHA，真实 TS→Go 恢复链由其永久 fixture 与 Root 独立验收继续闭合，当前报告没有将这项写成已通过。

## 产物与验证

- 工作区：原 change 工作副本，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；无提交、推送、发布，无派生 Agent。正式 Ticket/Map/Evidence、其他任务报告、API/schema/Go/依赖均未写入。
- 输入：完整 TASK、Map20/Goal19 窄窗口、T16/T01/T04、dev 与 SpecDev I 规则；066/073/074/075/076/077/078/079 的实际报告与 Root 079 代码门。原始摘要在 logs/00-inputs.json（历史日志已清理：`logs/00-inputs.json`）、logs/08-independent-stage.json（历史日志已清理：`logs/08-independent-stage.json`）。后者明确是共享合同尚未冻结的独立阶段，不冒充最终 API 输入。
- 当前唯一 API SHA256：`ff921139bdd82f2c6e2b83892fc499489ccef93183e7f827fe6709ec4697a401`。schema SHA256：`a4daa358204d607614ddd15f62aeede4f0e161fe31498cee55c43dc7540de534`。实际 72 方法、144 方法 params/result validator、276 共享方法样本。未关闭 Ajv 严格选项，未 coerce/remove/default，日期、Decimal、Host binding、取消与错误详情的既有约束保留。
- [source-manifest.json](source-manifest.json)：9 自有文件与 10 只读输入的逐文件 SHA；规范 `path + NUL + sha + LF` 排序摘要为 `101eaeadc2c259eabb05cca81208d86355cfcb2c88a52675e801001f694c27a2`。managed.ts、codec.ts、T13 GroupClient、core event reducer/transcript 保持只读。

| 自有文件（均在 `src/modules/huhubot/`） | SHA256 |
| --- | --- |
| services/recovery/recovery-client.ts | `2db067395ef098ce7171ce80961736455daa265726746f0d9718aaff70f00367` |
| services/recovery/recovery-client.test.ts | `546796e35b49272cfd9e13d682ecae0e2479cc3bc0ce249e0a4fb3c87c62995d` |
| services/events/event-client.ts | `31ac66ee70cc75b381e3f0289aa52ad57a88b92e318fed78c1caff611684dca8` |
| services/events/event-client.test.ts | `816b4535ae6cc96e3dbf4e27c394cb0c084cc5e5fdc1456462f9e088b63ffdcd` |
| core/protocol/connection.ts | `5fb8fe71047273993f19f8a8633d32475760184eb8b1723770dda346a4822d25` |
| core/protocol/connection.test.ts | `e66addb00bdd63c3ba48abafd58b5a0f8e89907802249b28ef1fdba94a32e300` |
| core/protocol/method-validation.ts | `ee8092c8d7fefdaeb44e2c7a6f0a5632aa37092a4e7dacd62a39c154f04ab389` |
| core/protocol/method-validation.test.ts | `dec7c04ddf1f1c22a2cc702aaa36c48bad85d758557031ccc6ce67409f360e8e` |
| platform/desktop/transport/managed.test.ts | `13117a224044b2d16e549cfdb244d2145784c0f8066e08bfe4089a878c3e7e6a` |

RecoveryClient 行为：

- 消费实际 `BotMethodMap['runs.resume']` 与 RecoveryStatus，不维护第二套 wire DTO。hello 实际 capability 未启用时不发业务；本地验证缺 CAS、非 canonical generation、旧资格、不同 Run/Profile/epoch，未决另一命令整批拒绝。
- inspect 的 serial/generation 与 AbortSignal 使倒序和 dispose 后的迟到响应无效；完整保留 rootRunId、revision、generation、treeRevision、affectedRunIds、reason、checkedAt，未将 affected 范围缩为当前 child。
- 原 command 只有一个槽位。timeout/EOF/本地未决连接变化为 uncertain，新的资格查询不能替换其身份；retry 与同参 resume 重用原 CAS/generation/key，是否已有持久回执由服务端处理。普通 tail 状态不充当 CAS。
- 收到匹配 RunID/commandId 的持久 receipt 后，投影重锚失败只写 view.error，resume 仍 resolve receipt；权限/恢复拒绝保留原 RPC 错误。receipt 与 caller abort 同轮竞态不把已受理结果变成未知。若接受回调已 dispose，不再启动重锚。
- blocked 资格或 CAPABILITY_DENIED/RECOVERY_BLOCKED 触发目标 Run 当前权限重读。EventClient.reanchor 先废弃旧页与正文，再 runs.get 和从 0 tail；旧页即使 abort 后迟到也不回流。未知/已 dispose 的订阅不创建，兄弟 Run 不受影响，sticky 旧成员代拒绝、完整贡献者 tuple 与更高 revision 单调扩充规则不变；公开 Transcript 沿 T13 独立保留。

未来 T20/T23 的具体组合接缝：

1. controller 按同一 Run 的命令生命周期持有；页面只订阅 view，不能为重连创建新 controller 丢弃 uncertain 身份。
2. 断线时 onClose 自动停读、清资格并保留原未决命令。获得新 BotClient 后，owner 将共享 EventClient.setClient(newBot)，再对原 RecoveryClient.setClient(newBot)。这两步不自动 resume；同 Profile/原 commandEpoch 的显式 retry 才重放原命令。换 Profile/epoch 时旧 controller 拒绝，原不确定结果仍须作为旧归属记录保留。
3. inspect 后由明确用户动作提供完整 CommandMeta，expectedRevision/generation 取同次 RecoveryStatus；展示完整 affectedRunIds。受理后只对目标 reanchor，不 cancel Run、不重建进程、不清兄弟公开历史。
4. dispose 只关闭本消费者的请求、监听器和后续回调，不调用 runs.cancel/BotClient.close/kill。drained 等自身请求 settle；T20 另等 managed.exited 与 Host 自身 drain，不能把三个生命周期当作一个标志。

真实进程边界：生产 managed.ts 未改，SHA `f74ced41a9bf78c5d191ef2164ba7973018e76e8cefd992142a79be44714e989`。新增 Linux 受控可执行子进程实际忽略 stdin EOF 与 SIGTERM，证明 close 立即返回不代表 exited、后备终止后 exited 真 settle，并验证 EOF/TERM 标记、未走 5 秒 failsafe、finally Wait/清临时目录。这替代的是外部子进程行为，不是 Go 资格恢复、统一 shutdown 或实际 OS Host Promise 测试；Windows/macOS 明确 skip，未宣称其真机通过。

原始红绿均保留（所有检查均已实际 Wait）：

| 日志 | 实际观察 |
| --- | --- |
| 01 → 02/03 | 缺 reanchor 的真实 TS 红；新增目标/迟到/双 Run/dispose 及原 group 闭包转绿，4 文件53项。 |
| 09 → 10 | schema 已有144形状时旧固定142触发 METHOD_VALIDATOR_LIMIT；固定144后唯一共享样本绿。 |
| 11 → 12 | 42旧连接项通过但新 runs.recovery proxy 缺失；装配后两文件48项绿。 |
| 13/15 → 14/16 | 新 RecoveryClient 的能力门与显式恢复功能先缺失后实现。 |
| 17 → 18 | uncertain 后新资格允许换 key 的真实转发红，原命令锁定后绿。 |
| 19 → 20 | 倒序 inspect、dispose 后 late resolve 红，serial/abort/generation 后5项绿。 |
| 21/22 → 23 | 接受 receipt 被投影异常拒绝、epoch 变化仍转发 query 红；21测试等待该错误转发超时，22显式安全 peer 拒绝形成有界同反例；修复后8项绿。 |
| 24 → 25 | 权限查询拒绝未重锚旧正文红；补目标当前权限清理后10项绿。 |
| 26 → 27 | 已收到 receipt 后同轮 abort 仍误拒绝红；保留接受结果与 dispose 不新重锚后11项绿。 |

最终独立 TS 检查：

| 命令与原始日志 | exit / 结果 |
| --- | --- |
| `pnpm exec vitest run` + command-observations.json 的 10 个明确文件（logs/31-ts-closure.log） | 0；128 tests。包括 RecoveryClient11、唯一 schema276共享样本、codec/connection/task hash、reducer/transcript、EventClient/GroupClient 及真实受控 child。 |
| `pnpm exec tsc --noEmit --skipLibCheck`（logs/28-production-tsc.log） | 0。 |
| `pnpm exec tsc --skipLibCheck -p tsconfig.test.json`（logs/29-test-tsc.log） | 0。 |
| `pnpm exec eslint` 四个生产文件 `recovery-client.ts/event-client.ts/connection.ts/method-validation.ts --max-warnings 0`（logs/33-production-lint.log） | 0，零警告。 |
| `pnpm test:architecture`（logs/32-architecture.log） | 0；1219模块，无分区/宿主/desktop/barrel/循环违规。 |

[command-observations.json](command-observations.json) 汇集32条实际 exit/Wait 与边界；logs/30-lint.log 保留错误调用：显式传仓库全局 ignore 的4个测试路径，0 errors/4 ignored-file warnings，exit126。33按仓库生产 lint 范围重跑已0，没有禁规则或放宽检查。未跑全插件 build/full lint，按 Root 唯一共同冻结窗口留给 Root。

## 问题与下一步

自有生产实现暂无未闭合失败，源码与测试持续停写；无自有活跃产品、构建、测试或子进程。最终当前输入复核在 final-recheck.json，亲自 return 校验结果在 return-validation.json；正式双轴与代码门由 Root 接纳。

仍待联合验收：081 已获 `RecoveryClient`、`EventClient`、HapConnection 的实际路径与上述冻结 SHA，负责永久真实 stdio/Go/SQLite/Engine 边界链；Root 已准备生产 RecoveryClient→旧 v8 恢复的独立 E2E。082没有自己构建/运行 Go，现有 Peer 测试只证明生产 TS/HAP 编解码与消费者生命周期，不作为 Go 恢复资格、CP/Grant/成员代重查、双短 Tx、旧 generation、回执持久重放、真实 Runner 统一关闭的已通过证据。相关结果应由081/Root据实际最终输入回填正式 Evidence，本候选不可仅凭128项宣布这些业务通过。

实际 Provider/模型、真实 Obsidian/用户 Vault、Windows/macOS OS 终止和宿主不可取消 Promise 的现场操作未运行，按用户后验边界保留。没有修改 T20 或 UI；上述 owner 需组合本票提供的 setClient/retry/reanchor/drained 与既有 managed.exited 原语，仍须用户明确动作才能执行恢复。
