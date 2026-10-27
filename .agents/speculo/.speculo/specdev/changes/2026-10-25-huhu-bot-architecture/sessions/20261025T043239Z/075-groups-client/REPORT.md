# 075 群提及、真实协议与投影消费者候选

Session: 20261025T043239Z
Task: 075-groups-client
Status: completed

## 聚焦交接

完成稳定 agentId 的明确提及 token、一次整批群发送与成员/协调者 CAS 消费者、独立公共 History 投影，以及按当前成员资格闭包清理 Run 流缓存的生命周期。只消费073唯一 API/schema；当前为71方法、142方法参数/结果 validator、266共享方法样本，GroupBinding.members 上界100，执行深度/累计/并发限制未改。成员 fingerprint 变化会 abort 该群所有未决 Run 页、清未公开正文；已知失效 tuple 拒绝旧代重生，未知新增私有贡献者经 runs.get 重新锚定当前 Run.revision/proof 后才重读，已合法公共 Transcript 独立保留。九份自有生产/测试源码已经停写，所有自有工具与子进程均已 Wait；180项本地TS回归、双类型检查、适用定向lint与架构检查通过。completed 只表示候选交回；074/Root负责真实群 Go↔TS 联调、Root完整build/lint与独立验收，真实Provider/Obsidian/目标OS仍用户后验。

## 产物与验证

### 授权、参考和唯一合同

完整读取075 TASK（SHA `07bfbe9585433bc5b8ead5bb81143d20e1a40b1bb6937f50837f8e964ab8c05d`）、060 REPORT和interfaces-and-owners，以及AGENTS→workspace roots/catalog/运行指南、dev/SpecDev I与适用架构/测试/许可参考。原TASK不改；Root已正式补充Map18/Goal17的 `services/groups/**` 消费者路径及原T01 managed启动原因窄维护，依据分别为 [map18窗口](../../../evidence/T-13-logs/map18-window-supplement.md)（SHA `72c1b348b2882ff239109d91208e1ec64b2c78e11d71c10bf519582350a5b705`）、[managed窗口](../../../evidence/T-13-logs/managed-startup-supplement.md)（SHA `2bede0b8fc27eb9bc7194b25bca35512c6919f9d99bc7dd892c8882396f32d2f`）。根目录仍为 `/home/wta/orca/workspaces/obsidian-huhu/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；未提交、推送或发布。

唯一合同由073负责写入，本作者全部只读：

| 实际输入 | SHA256/事实 |
| --- | --- |
| `src/modules/huhubot/api.ts` | `9cf6d25e4783e203bf47a475852bed436490da4892eaec86c1ba2b78739d4f34` |
| `contracts/hap/v0.1/schema.json` | `d45693a3b4b2abbe635cf2f8b4655b63a4419458bb1e4854723f786a63ed1217` |
| 方法目录/方法validator/共享方法样本 | 71 / 142 / 266；固定缓存数和Ajv严格选项保持原值/原行为 |
| GroupBinding | 同Session、完整agentId/incarnation/historyRevision tuple集合，最多100；不同成员ID不得重复 |
| 公共History | VisibleMessage.seq为独立持久Decimal公共顺序，afterSeq exclusive/throughSeq inclusive，cursor始终opaque |
| 展示附件 | VisibleMessage.attachments只保留发送时SourceSnapshot/SourceScope引用元数据；不把标签当作模型来源授权 |

最初263样本、单成员不变proof只是中间合同，最后检查已消费266。073/074在真实私有消息/结果消费者中发现贡献者闭包需要增长，Root明确的最终语义为：同一Run只能在更高Run.revision严格累积完整tuple，不能删除/替换旧tuple；同revision不同proof冲突，较旧Run不能覆盖当前proof。纯orchestration根依旧Members=[]、不触发A模型或全员唤醒。客户端没有手写第二张方法DTO/权限表，没有修改api.ts/schema/Go或依赖。

### 自有实现与源码冻结

逐文件完整摘要在 [最终输入manifest](logs/37-final-inputs.json)（SHA `aa29a3edf3a513d2f3bae083fbd915177a3df0affd587fce6e2f1c3dfd0341e6`）：

| 自有文件 | SHA256 |
| --- | --- |
| `src/modules/huhubot/core/mentions/mentions.ts` | `4d9ff0a72e05da4b9406e336a929e91da0a86820f5363ecc70cff42eb2cc2336` |
| `src/modules/huhubot/core/mentions/mentions.test.ts` | `0d3c1fdeb3d11dc90fe7e8fb22400b04ad51b530e5f5853d8604fd2ea7013902` |
| `src/modules/huhubot/core/events/transcript.ts` | `44223f4725cfeaaedaac4080a139d97db74a69619699abd3296778652d4dd428` |
| `src/modules/huhubot/core/events/transcript.test.ts` | `214dc3ccc6c472e18b0d59b000b9cff858247f5b502bcc4a01a08dacdc3b08ff` |
| `src/modules/huhubot/services/events/event-client.ts` | `1c4813afb2c8a5df25dbec9825c9c286d0d6d1d4892c2184a00aad62ecd1dae0` |
| `src/modules/huhubot/services/events/event-client.test.ts` | `c99d437f6cd32a2377aa4b13f97118e68bd343919b12427b9909970893b5ce1c` |
| `src/modules/huhubot/services/groups/group-client.ts` | `9a951074020c491e9a96e237589ee613da4df461a7a079dc8ca04115d3f3ca33` |
| `src/modules/huhubot/services/groups/group-client.test.ts` | `5d1611366989bd90670c277b0ce46d3ab2a166508d364aa7bb8f675d82df123f` |
| `src/modules/huhubot/platform/desktop/transport/managed.ts` | `f74ced41a9bf78c5d191ef2164ba7973018e76e8cefd992142a79be44714e989` |

- `core/mentions` 是纯本地编辑器元数据，UTF-16 offset、stable agentId 与显示label分离。重名候选明确显示身份，普通姓名/裸文本@/代码/邮件不解析为执行身份；只有用户选择后形成的token决定target。空ID、未知、停用、非成员、被编辑破坏/重叠/拆开surrogate的token整批拒绝，保留draft/mentions，绝不丢token后回退A。重复token去重但保留原文，Agent改名不把旧token悄悄换身份。
- `services/groups/GroupClient` 只通过实际BotClient的hello capabilities与方法组工作；构造完整targetAgentIds一次runs.start，使用当前Session CAS。显式retry保留原command/idempotencyKey/expectedRevision和来源上下文，不自动重放、不静默rebase。已受理命令的同回执、busy后的CAS是否失效由真实服务端决定；REVISION_CONFLICT仍保留草稿，用户刷新Session后以新命令重发。请求在途的新编辑不会被旧accept清空，退出/换Profile/断线会abort并清缓存，dispose不会runs.cancel。
- `core/events/transcript` 只接纳服务器已发布History；以Decimal/BigInt公共seq排序/去重，允许过滤导致的seq空洞，不借消息ID或Run事件seq猜公开顺序。相同ID/seq可被后续授权读取明确替换/去除正文；跨Session/冲突seq拒绝。窗口最多512条/1MiB，满额明确停在原opaque cursor，用户可显式重置窗口继续，未删除持久历史事实。
- `EventClient` 保留原64KiB默认页→仅精确EVENT_PAGE_TOO_SMALL补一次512KiB、正文/投影/frame限额、EOF/lease/取消/晚页等既有行为。attach接纳从真实Run传来的revision；更高revision完整proof严格superset会abort旧页、清旧正文，100个tuple逐个核当前成员代，旧revision不覆盖，等revision不同proof和任何subset/旧代替换拒绝。成员fingerprint变化时全群Run流先变unknown并清空/abort，避免本地尚不知道的新私有依赖被移除后残留正文；合法兄弟refresh先runs.get当前proof再tail0。实际Snapshot中的Run也执行相同revision/proof规则，较旧或冲突snapshot不能覆盖缓存。已知失效proof保持denied，重加入新incarnation也不复活旧Run；没有取消仍有效兄弟任务。
- `permissionsChanged()`/History权限拒绝/连接和Profile变化清公开缓存及该群Run流；成员移除本身保留已合法公开History。未来T21需要连接实际权限/Session更新事件到这些现有消费者接缝，不能把公开缓存视为免撤权。
- managed.ts仅新增有限安全原因 `PROFILE_MIGRATION_FOREIGN_KEY_FAILED`，保留未知stderr/正文/路径抑制，未改进程生命周期、参数、环境或凭证。[完整单行diff](logs/38-managed-one-line.diff)。

T21真实composer交接：处于@候选交互中的未决项必须保留显式pending/invalid token（例如空agentId），阻止发送并保留草稿；用户明确把它作为普通文本后才不算token。core不会用正则一律拦截裸@；当前测试分别证明普通文本与显式空ID token的不同处理。本票未跨写UI、module激活、Host/source/receipt适配器或资产。

### 研究来源与复用决定

按AGENTS陌生能力先检索，比较维护活跃、许可明确的[Tiptap mention](https://github.com/ueberdosis/tiptap/blob/242a44e16d77e0773678811142edc612f9aced15/packages/extension-mention/src/mention.ts)（固定commit `242a44e16d77e0773678811142edc612f9aced15`、对应文件活动2026-08-26、MIT）及Lexical官方MentionNode。采用稳定身份/显示文本分离与明确选择token思路；[上游复制粘贴问题4845](https://github.com/ueberdosis/tiptap/issues/4845)说明正文不保证保留token元数据，故本实现检查显式token文本/range。没有引入编辑器框架、依赖或复制上游代码，未执行上游。具体URL/许可摘要/比较见 [research-mentions.json](logs/research-mentions.json)、[固定commit观察](logs/mention-commit.json)。

### 真实红灯、修正与最终检查

完整实际exit/Wait与观察汇总见 [36-checks.json](logs/36-checks.json)，原始失败没有抹除：

| 日志 | 实际观察/退出码 |
| --- | --- |
| 01、03、05、07 | 缺少mentions/transcript/GroupClient、缺sessionChanged和绑定冲突处理的真实红，126 |
| 08、09 | 测试响应缺required receiptId被唯一严格schema/类型检查拒绝；修夹具，不放宽生产validator，126 |
| 18 | 中间18文件/175测试绿，0；这是当时263方法样本输入，非最终样本数 |
| 25 | 最终动态闭包语义反例真实红：严格revision superset和未知新贡献者失效未处理，126 |
| 26 | 新实现下旧“无关兄弟缓存一直保留”断言失败；最终合同要求全群Run缓存先清并重读，126 |
| 27 | 45测试绿，含唯一schema266方法样本，0 |
| 29 | 测试直接改readonly BotClient.runs.get的类型错误，改为创建fixture时构造mock，126 |
| 30 | 7文件/64测试绿，0：未知依赖清理与get锚定、100th成员撤销、较旧/同revision冲突snapshot等 |
| 31 | 五份适用生产TS定向ESLint，`--max-warnings 0`，0 |
| 32 | `pnpm exec tsc --noEmit --skipLibCheck`，0 |
| 33 | `pnpm exec tsc -skipLibCheck -p tsconfig.test.json`，0 |
| 34 | `pnpm test:architecture`，1218模块、无zone/host/desktop/barrel/cycle问题，0 |
| 35 | 最终19文件/180测试，0；原协议、日期、取消/迟到、Host读写/receipt、来源捕获、assistant、事件/大页既有回归全部保留 |
| 39 | 额外把四个测试文件显式交ESLint，既有ignore规则产生4个ignored-file warnings、0代码errors；`--max-warnings 0`故126。未改规则或声称测试已被lint，适用生产lint以31为准 |

[35-final-ts-consumers.log](logs/35-final-ts-consumers.log) 的命令为 `pnpm exec vitest run` 后逐项指定 `core/protocol/{connection,codec,method-validation,task-config-hash}.test.ts`、`platform/obsidian/sources/sources.test.ts`、`platform/obsidian/note-effects`、`services/host-write`、`services/host-read`、`services/events/event-client.test.ts`、`core/events`、`services/assistant-client.test.ts`、`core/mentions`、`services/groups`、`platform/desktop/transport/managed.test.ts`（均在src/modules/huhubot下）。19文件180项是Vitest测试个数；266是其中method-validation消费的共享样本数量，不混为额外266个测试。

GroupClient就近测试使用真实生产HapConnection+严格framed peer，证明客户端原子组装/错误保草稿/生命周期；peer回复是明确受控边界，不声称它证明Go同Tx授权、真实忙/CAS语义、模型路由或公共publisher顺序。074拥有生产GroupClient/EventClient/mentions→真实GoCore/stdio/SQLite/同Executor受控Engine的唯一永久群联调fixture；Root另有独立真实链。075已向两位交最终源码SHA与新增runs.get锚定行为，截至本报告未取得其最终联调回执，不把预备/Mock请求次数写成生产Go业务通过，也不为等待其重矩阵占用writer。

### 启动安全原因的实际边界

Root提供只读真实v7 Profile/完整DB+5CP，manifest SHA `33638a60e3e0619eb4f4f6c6e9e5f251d0ee4f5e132a993eb2bc90202caf1dae`。本作者逐SHA确认原6文件后，独立复制到自有临时managed root，保留0700/0600；只在副本关闭foreign_keys后注入一条conversation_messages.session_id孤儿。实际临时Go CLI构建exit0，binary SHA `a70471a1024c445b2d559d39b0e6ffcb041ddb9d26043ab24addd9285a5564cb`；原始来源和临时输入在 [22-managed-inputs.json](logs/22-managed-inputs.json)。未篡改原件，也没有用hardlink。

[23观察](logs/23-managed-red.log)仅证明旧allowlist抑制此真实启动失败，不能证明它原本就是新FK原因；[24原绿预期失败](logs/24-managed-green.log)保留exit126。只读核实的真实CLI输出为CONFLICT/PROFILE_BACKUP_FAILED、stdout0：`CompleteMigrationBackup`在013迁移之前全库PRAGMA foreign_key_check，旧库孤儿触发CHECKPOINT_ASSOCIATION_INVALID后被包装成PROFILE_BACKUP_FAILED，完整CP不能绕过该先验保护。073和Root均确认不放宽备份检查；013内生FK/rollback由073在成功备份后受控注入的永久Go测试负责。该实际CLI不是新FK原因透传绿证据。

另用 [controlled-startup-probe.mjs](logs/controlled-startup-probe.mjs) 启动真正受控可执行子进程，经过生产DesktopHapTransport/HapConnection与launchBotClient，明确只替代进程输出的启动stderr，不冒充真实013迁移。固定旧bundle/new bundle各测试known reason/unknown reason，四观察全通过：[28-controlled-startup.log](logs/28-controlled-startup.log)、[结果JSON](logs/28-controlled-startup.json)。旧版抑制新原因，新版只透传 `CONFLICT: PROFILE_MIGRATION_FOREIGN_KEY_FAILED`；未知reason/私有路径正文仍抑制；所有公共launcher及直接transport流程都await退出。中途初稿probe在等待exit前读取startupError，会先见STDIN_WRITE_FAILED；已修正自有观察脚本为Wait后选startupError，与现有公共launcher一致，没有改生产生命周期。

[40初始输入比较](logs/40-start-input-comparison.json)表明原19输入中只出现本票允许的两个EventClient文件和073拥有的API/schema/共享fixture变化，其余14项只读输入未变；managed原文件另存before副本及单行diff。最终manifest再次核Root原6文件SHA完全不变。所有自有Vitest/tsc/lint/架构/CLI/受控startup子进程已实际Wait，当前无自有活跃产品或检查进程。

## 问题与下一步

自有生产实现无遗留已知失败；39是对既有ESLint忽略范围选择的额外工具失败，24是实际备份保护与假定迁移原因不一致的有效记录，均未通过放宽规则消除。九份源码冻结，REPORT后只执行return结构校验和自有输入漂移复读，不再扩大实现或重复Go重矩阵。

下一步由074/Root基于本manifest执行真实群Go↔TS同输入联调并由Root完整插件build/lint和独立审查；真实Provider、Obsidian composer/宿主生命周期、Windows/macOS依然not-run并留给用户后验。T21须按上述pending token与权限变更hook接入现有消费者，不在本票替代UI实现。本作者未改正式Ticket/Map/Evidence、未改他人报告、未提交推送发布；return实际回执另存本目录logs后以MESSAGE/FINAL真实交回。
