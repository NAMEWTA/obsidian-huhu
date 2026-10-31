# 任务回报

Session: 20261026T045732Z
Task: 033-t10-owner-plan-review
Status: completed

## 聚焦交接

**SOURCE READ ONLY。**已完整阅读 Root 工程草稿、CLI 身份补充及固定原 owner/CLI/schema，结论是同文件、同 SpaceService、被动邮箱路线可采用，无需改变已批准产品行为或重新访谈。正式工程包应补齐下面两个有具体失败序列的工程合同：把重复 ack/取消判定放到所有可能写入的初始化恢复之前；为首次 ack 预留容量。进程内分页 cursor 可以使用原 owner 的内存 generation，无需新增持久 lineage 或第二索引，但 generation 必须按实际已验证邮箱快照的兼容变化计算。T10 未激活；此回报不是最终代码两轴审查、实现交付或任何 AC 通过，最终接收归 Root。

## 产物与验证

### 审视发现

严重度说明：P1 为正式分派前应补齐的正确性合同；本次发现属于工程计划缺口，不是在尚未实现的 T10 上宣称已经复现产品缺陷。固定输入的来源路径只作定位，实际读的是 `verified-inputs.json` / `supplemental-inputs.json` 中的 snapshot 原字节。

**F1 · P1 · 重复 ack 的零写判断必须前移到 JsonStore 初始化/恢复之前。**

- 位置：草稿第 11–13、21、29 行；固定 `space-service.ts:227–260`，尤其 246–255；`guardedStorage():183–210`；`json-store.ts:23–45,58–62`。022 已接收原始探针实际证明 corrupt-primary/valid-backup 的 `load` 会写 `.corrupt`，本次没有重复跑它。
- 触发序列：primary 外层 JSON 损坏、合法 backup 含已 ack 的消息；原 `SpaceService.load()` 零写采用 backup。首次 `ack` 进入原 `mutate()`，在领域回调运行前执行 `candidate.load()`；它先写 `.corrupt`，之后即使领域回调判 `changed=false` 并跳过 `commit()`，也已违反“重复 ack 不再次写文件”。同一个前置顺序还意味着，排队时取消的请求如果只在 `edit` / `beforeCommit` 里检查，会在检查前进入恢复；`pendingWriteGuard` 目前到第 258 行才安装，`mkdir` 也没有调用它。
- 最小补充合同：邮箱队列入口先进行可取消的只读新鲜基线检查，在任何 write-capable `JsonStore.load/needsRecovery` 之前判定 no-op、明确拒绝和已取消请求。有效 primary 证明已经 ack 时直接返回 already-acked/none，禁止初始化恢复或提交。primary 无法验证时，最简单是保持 unknown/source-unavailable，不能为了证明 no-op 启动写恢复；真正需要修改的操作仍沿原恢复 owner，但请求 guard 必须覆盖初始化恢复、backup/primary/corrupt 写和 mkdir 的开始点，并在等待后复核。已有 I/O 不强制撤销，仍由原 owner 收束。
- 关闭条件：生产 SpaceService 故障测试覆盖“冷有效 primary 的已 ack”“冷损坏 primary + 已 ack backup”“排队取消后才放行初始化”“初始化恢复读取期间取消”；记录全部 storage write/mkdir、事件及 primary 字节。前两者可按明确合同返回 no-op 或无法确认，但不能以重复 ack 名义写恢复文件；已取消且尚无副作用的请求不得迟写。测试应击中原 owner，不另造一个跳过初始化的 fake mailbox。
- 精确影响：A 的 `SpaceService` mailbox typed mutation/guarded adapter 和故障测试；不要求修改共享 `JsonStore`。

**F2 · P1 · 发送容量准入尚未为首次 ack 的增长留空间。**

- 位置：草稿第 17、29、33–35 行；批准 Spec §3.6 / AC-024；固定 `records.ts:32–44` 与 `JsonStore.commit()` 的 requested/merged 双重校验是未来子文档必须遵循的真实存储接缝。
- 触发序列：按草稿允许发送到“完整记录 24KiB / 完整子文档 4MiB”边界，消息尚无 ack。首次确认新增一次性 ack 元数据，至少增加若干 JSON 字节；完整记录或整库便可越界。若沿同一完整子文档 validator，就会拒绝一次本应能完成的 ack；若临时放宽 validator，又与公开完整容量边界不一致。邮箱达到上限后没有自动删除历史的路线，因此不能依赖用户先腾空间。其 read 回执也应计入 ack 后的最大形态，而非只检查发送瞬间。
- 最小补充合同：保持候选数字即可。发送准入除实际已存字节外，为每条未确认消息预留其有界 ack 最大增长；单条记录和正常 read envelope 同样按 ack 后形态预检。另一种同样可行的定义是明确把限制改为不可变内容预算、另有固定有界 ack 开销，但必须统一 schema/help/GUI/测试，不能临时忽略超限。不需要新库、删除策略或新增产品能力。
- 关闭条件：有界边界夹具把单条和整库填到最后一个合法 send，之后仍能逐条首次 ack；再次 send 准确 capacity、旧内容保留；重复 ack 零写；ack 后完整 read response 仍可表达。允许 send 的最大字段值不能被误解释为所有字段同时取最大仍必定合法，整体记录/request/envelope 上限继续生效。
- 精确影响：A 的容量/子文档 schema/owner 测试；B 的共享常量与 envelope 边界测试。正文、引用、ID 的候选上限无需因此重设。

### 必须在接口冻结时落下的最小决定

以下是已有草稿原则的具体落点，未另列为产品 bug，也不要求新增架构。

1. **分页采用进程内 generation，足够。**原 `ControlPaging` 的 token 只存在本实例 Map 中（022 固定 `paging.ts:16–40`），关闭/重建后旧 token 本来就不能恢复。因此把 `{scope, recipient, generation, highWaterSequence, lastSequence}` 放进原有有界 token 即可。原 owner 每次采用已验证持久视图时比较邮箱：旧消息 ID、收件人、sequence、正文与来源引用保持不变，ack 只允许未确认→确认且已确认值不变，新消息的 sequence 严格大于旧 high-water，nextSequence 不回退。符合这些 append/ack 变化时保持 generation；删除、重排、ID/正文替换、ack 回退、sequence 回退或 scope/owner 变更时递增/清池；纯布局变化不失效邮箱 cursor。

   不能只按调用方法名判断。具体反例是：第一页得到 seq1 后持 token（H=3）；下一次 `send` 新鲜读取发现 primary 已退回只含 seq1，再分配 seq2。若因为当前方法叫 send 就不 bump，旧页会混入新的 seq2 并丢原 seq2/3。比较新鲜基线与此前已验证读视图即可在 append 前识别；无需把 generation 持久化。所有采用路径都要经过此检查，包括正常 commit、初始化/恢复、unknown 后零写核对和非邮箱修改提交所采用的完整记录。freshness unknown 时先核对或明确 unavailable，不能用旧缓存继续给权威后页。只要遵守这些条件，没有发现必须新增持久 lineage 的序列；未来 T16 restore 复用同一 adoption/invalidation 接缝即可。

2. **B 同时冻结重复 send 与消息回执语义。**重复 ID 不能覆盖已有记录已固定；建议无论正文是否相同都明确返回现有错误大类 + 稳定 `message-id-exists` 细因、effect none、已知 ID/原目标，不自动把它转换成“本次发送成功”。也可选择其他符合批准规范的明确结果，但 A/B/U 必须共享一套，不留到各自猜测。首次 ack 是 ack-saved/completed，已 ack 是 already-acked/none，错误保留已知 ID；canonical 当前没有 `ack-saved` phase，B 在原生成源同步 phase 或选择一致的 data 事实表达即可。

3. **CLI 的 ID 保留包括非 JSON 错误输出。**固定 `cli.rs:380–396` 确认 `run()` 会用 nonce 替换 requestId 占位 `huhu`，故不采纳旧 022 强制 `--message` 的理由。可选 `--message`、缺省生成一次业务 ID 合理；在 run 边界补本次 ID 可以不扩写 `client.rs`。但 `print_result():408–425` 的非 JSON 失败分支只打印 code/message/effect，即使往 data/details 加 ID 也不会显示。B 应同时测普通输出与 `--json` 的 send 断链/超时/取消，确保使用者拿得到本次 ID，并对补字段后的最终 JSON 重新测完整预算；不能只测内部 response 对象。`client.rs` 仍可默认只读。

4. **已保存事实直接由 owner 的 typed outcome 传出。**固定 `SpaceService:260–265` 的 `store.setState` 在 commit 后；现 Router 的强制保留机制主要识别终端 inputReceipt（022 固定 `router.ts:126–139,156–219,251–280`）。邮箱不用伪造 inputReceipt。最小方式是 owner 在 commit/readback 成功后先固定 mailbox outcome，随后 subscriber/source-state 失败只附诊断；薄 handler 返回带 data 的 completed/领域 phase 结果，避免再抛进泛用 PERSISTENCE_FAILED→unknown 的兜底。只有真实接线证明这条方式不够才扩 router 写集，不先机械扩权。

5. **GUI unknown 状态在会被重挂载的抽屉之外保留。**旧固定 UI 在 `page.control && !page.history && visible` 下条件渲染，窄/宽分别创建组件（022 `AgentWorkspacePage.tsx:301–362`）；隐藏、切历史或响应式切换会卸载局部组件。草稿“保留 ID/正文/目标”应由模块 activation 内有界 pending/unknown 状态或不会随抽屉重挂载丢失的上层状态兑现；它只是待核对展示记录，没有自动执行，不是 Outbox。无需把正文放进 `compose stateKeys` 或新增业务文件，也不承诺跨崩溃恢复未保存草稿。T09 最终工具生命周期仍须重核，生产组件验收补 unknown→关闭/切换/重开仍可核对。

### 已核对而不构成新增问题的部分

- 同原逻辑队列拿可信基线、在队列内检查目标/归档/ID/容量并分配 sequence，是正确方向。初始化 `loaded` 未被原领域基线采用的问题已被草稿明确识别，不重复算 finding。真正持久核对必须直接读 primary；原 private `inspect()` 只读内存，不能用它冒充未知写后的核对。
- 归档的线性化点应是归档记录提交；send 与 archive commit 在同队列决定先后，ack/read 保留历史访问。不必复用 launch gate，也不要求收信启动/附加运行。当前缺失 Session 的已知消息继续按原 ID 读，不能套 active runtime 解析。
- 在原 `decodeStored` 对邮箱未知版本/畸形文档准确拒绝，可以通过已有 guarded read 覆盖 primary 与 backup 的覆盖前检查。只给 `isWorkbenchRecords` 增加 false 分支不够，这一点草稿已明确。外层无法解析 JSON 的既有 backup 恢复与已解析但不支持的邮箱子版本应分开。
- 完整 request/response 和字段组合限额已写明。正文 16KiB + 8 个各 1KiB 引用可能受 24KiB 完整记录限制先拒绝，这本身不是矛盾；无需为“每项各合法但组合超限”扩大产品范围。F2 的差别在于已经接纳的记录之后无法执行必需 ack。
- Vault-file 引用经实际 Vault/TFile 元数据适配器确认、打开再校验；不以 cwd grant 授权、`--file` 只由 CLI 读取正文，边界正确。可观察 mtime/size 等版本只承诺其能观察的变化，不承诺内容 hash 不变；暂时无权限/读元数据失败应保留正文、原引用和已保存事实。失效引用不应阻止对既有消息 ack。
- 现状不足的文件写集已由草稿要求 T09 后重新列准；022 的原 records/SpaceService/canonical/CLI/commands/paging/Vault adapter/文档列表可作为起点。controller、i18n 和共享生成源仍各自唯一 writer；没有理由新增通知模块或 Host/helper 邮箱协议。

### 实际输入与验证记录

- 本次唯一证据根：`/tmp/huhu-t10-owner-plan-review-yj3ay4hv`；唯一仓库写入是本 `033/REPORT.md`。未写产品、工程草稿、原 022 输入、正式 Ticket/Map/Goal/Evidence、永久知识或旧 tmp；没有提交、构建、浏览器、native/helper/Provider/Vault 操作，没有递归派遣。
- 实际以 Python `hashlib.sha256(Path(snapshot).read_bytes())` 验证固定 manifest 的 **27** 个对象并保存本地原字节副本；`verified-inputs.json` 保存 source→snapshot→SHA→本次副本映射，`input-recheck.json` 再核原 snapshot 全部不变。复制不等于声称全文审查了每个测试文件；实际全文/定向读取范围如下。
- TASK SHA256：`e71936695562b37c4bb22e9dff1d4c82242699fb46612fd0e4bed94f2be21ea2`；manifest：`b5febff41d7a4d76ed7e60b1bfc50ab5c26a5b34c7f2aa7589c4c75f2f4ad8b1`；工程草稿：`46fa0c98898b3a9df7a89f7adc178d7a5902a4c7c64d6f4649ed6ce9953d7b81`；CLI note：`c5bedd69bf17ac74abb4ee8af1f75e8e435e733e37ef852cad026d48f5879999`。
- 完整读草稿/note、SpaceService、records、JsonStore/write-queue、workspace-view、T10 Ticket 与 022 REPORT；读取 Spec §3.3–3.6、相关 AC、§6 约束，以及 implementation-contracts 的 owner/CLI/回执/限额/旧业务绑定和恢复边界；对 canonical 和 CLI 读取了相关 schema/预算/params/目标默认/parse/run/print_result；对 compose 精确核 stateKeys，对原 recovery tests 核现有拒绝和 needsRecovery 路径。bootstrap、dev/ui 与按需架构/测试参考已经回读。
- 关键产品 SHA：SpaceService `97b9a09a7a08ed6abbc783f8a6b1ec58eb4c7b370e16a1cc68e5040a95c55dd3`；records `a6ef4a9d57fa8c217150aa5a3fe95bb41f096717e692cece5f075223b7961b0d`；JsonStore `74fef079c0f2bac8654081986b142455a1c2f6fbd0674f0c49f0b258e8052e53`；029 CLI `01cd9206980ac8b3be6fd5b865832bb08e2f8573bac6fecdf4e96c554c4d23e1`；029 canonical `f91efa05b4e5617d8674dfdb32b8c8ffc21df5b84d94a3c5fbf274d61389024e`。
- 通过输入中的已接收 `T-10-inbox-preparation-root-audit.json`（`fdb1e1fae0bfe7e7511f4b3bb555d5c54ddb9ef82e73f2ff9605694b1354ae41`）及其固定 source-after（`62a01955e056f6eb66c21c0b3fbf9aed325c1f8d97b4b442f6a8c61a48b530c7`），回读并校验 5 个补充快照：ControlPaging、Router、Commands、AgentWorkspacePage、client.rs。完整映射和 SHA 见 `supplemental-inputs.json`。这些是 022 接受时的基础接口，不冒充 T09 最终接口；没有从并行产品工作副本取源。
- 复用 022 原探针执行回执 `storage-run.json`，SHA `cb24d023eed413cf1acfb5d3910fd9cc942222aa0695ee46c32fea7bca682a3b`，以及原 `005-json-store-probe/raw.log`，SHA `aabd0f6ac7cc1b70d0bde92b365812cdfef21f551252340611401d34dfe03462`；本次实际回读并按固定 audit 验 hash，来源映射在 `prior-probe-inputs.json`。原命令 exit 0 是 **022** 的执行事实，本次未重跑、不挪作 T10 AC 证据。
- 本次实际读取/hash 校验命令均 exit 0；最后 `input-recheck.json` 为 `manifestObjectsVerified:27, supplementalObjectsVerified:5, failures:[]`。无新增逻辑探针；F1 是固定真实调用顺序 + 已接受原探针的可达推导，F2 是完整 JSON 容量与新增 ack 字段的边界推导，不是假称已运行未来实现。
- 本报告先以同目录临时文件、不覆盖目标的原子链接落盘并回读；随后实际执行 `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 033-t10-owner-plan-review --stage return`。独立原始输出与实际退出码保存在本证据根 `return-validation.raw.json` / `return-validation.receipt.json`；结构结果不替代 Root 接收。

## 问题与下一步

本次只读任务没有缺失输入或权限阻塞，报告候选已交回。Root 可直接把 F1/F2 写入正式 T10 工程包，再将上述 generation、重复 send、typed outcome、CLI 输出和 UI unknown 生命周期落实到唯一 owner 的接口与测试；无需要求用户重新决定既定业务行为。T09 结束后仍须冻结最终 CLI/工具抽屉/Scope/owner 接口并精确修订写集；此处对旧基础接口的观察不能免去那次核对。

未验证：T10 代码、最终 T09 接口、实际 CLI→Host→owner 执行、存储故障注入的新邮箱行为、生产 UI 自动化、真实 Obsidian/Provider/OS IME/五平台。它们仍由之后实施、Root 代码验收和用户真实 E2E 分工处理。本报告不改变任何正式状态，不宣称任何 AC 通过。**SOURCE READ ONLY。**
