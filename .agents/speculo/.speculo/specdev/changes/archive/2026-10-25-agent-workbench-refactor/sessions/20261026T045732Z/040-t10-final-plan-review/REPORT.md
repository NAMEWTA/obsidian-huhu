# T10 r4 最终工程计划只读预审

Session: 20261026T045732Z
Task: 040-t10-final-plan-review
Status: completed

Reviewer: codex:/root/review_t10_plan；沿用户指定 Astra/high；未参与 T09/T10 实现。
Scope: planning-review；SOURCE READ ONLY。

## 聚焦交接

完整核对固定 r4、54 路径分配、038 UI 方案和必要原 owner/页面接缝，保留一项实施前应补齐的计划缺口：发送与 ack 的未知观察需要同一个明确的容量准入合同，并预留有限结果/诊断增长。其余所列新接缝没有发现需要另建存储、第二 writer、持久 lineage 或扩大路径集合才能解决的矛盾。033 已接收的冷重复 ack 与持久容量预留不重复计为本轮 finding，原探针未重跑。T10 未激活；本报告不是 T10 Ready、任何 AC 通过或最终代码两轴结论，也不审查 039 修复中的 T09 产品。下一步由 Root 接收本计划意见并冻结最小补充，T09 新冻结候选仍须另行派遣独立 R2。

## 产物与验证

### 固定输入与读取依据

证据目录：`/tmp/huhu-t10-final-plan-review-wlq4i0mv/`。只写此新目录及本 REPORT；没有改产品、草稿、路径分配、正式状态、永久知识、旧报告/探针或 Git/index。

| 输入 | 实际 SHA256 |
| --- | --- |
| 本 040 TASK | `5f5f1f11ae71a7671b2dfbe53c62d6d8fd685090517fc6c71a9277ef18ac88ea` |
| `/tmp/huhu-t10-root-final-plan-review-76vxx1v6/inputs.json` | `202dff059848881b74ef6e7c14fc811ee2a4b0f352c6b2624fa60c5954307cea` |
| `engineering-packet.r4.draft.md` 固定 snapshot | `48f7287c62faedf0cb43a65a91b76b3eee008d3db9df37dd762e98b26918ccf0` |
| `owner-paths.r4.draft.json` 固定 snapshot | `ff70e72b357a4a60ceef9b695c7c3018a65f2dbf0c6be303cf9688f51de74ee0` |
| 原 033 REPORT | `b9d6ab3435aee7b467c8631565ded7ab3a91f3724c140b32809f1ca88141219f` |
| 原 038 REPORT | `2b94cb3338284eea6b3674c98aa2a9008bb7cc0e29ae9a46329728502edb5e74` |
| Root 038 audit | `e1324196b0ba4155f2a4a9c9a69cba395efe6cf7067865411f0b5f3bb9885c89` |
| 最终 R1 原来源 manifest | `5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4` |

`verified-inputs.json` 保存全部 8 个固定输入及其 CAS locator/hash；均实际匹配。`selected-sources.json` 保存本轮 9 个必要产品来源的固定 snapshot/hash；全部复核匹配。`ui-source-hash-check.json` 核验 038 的 27 个保留来源原字节全部匹配，其中 23 个产品来源也匹配 R1 manifest；另 4 个为 Spec、implementation-contracts、DESIGN 与 approval，不属于 R1 产品清单，不能把其 `matches_r1:false` 误解为源码漂移；`source-check-summary.json` 明确分类。

原产品只从 CAS 读取，没有读取 039 动态 workspace-service/Pane 工作副本。`read-scope.md` 区分本轮实际读取的函数/章节与复用的 033/038 已读材料，不宣称本轮逐行重新审查全部 27 个 UI 来源。Spec §3.6、AC-002/023–025/046/061 与 DESIGN PAGE-003/响应式/键盘合同保持；I/P、codebase-design 仅作只读规则参考，没有激活其实现或原型步骤。

### Finding F1：观察容量只定义发送准入，ack unknown 与结果增长未闭合

级别：P2，计划合同缺口；应在 A 的 presentation API 冻结前补齐。位置：固定 r4 第 76–78、87–89、99 行；原 038 REPORT 第 49、53、73、75、136 行。不是尚未存在的 T10 产品红灯。

r4 第 76 行把 activation 的“发送观察注册表”限制为 32 条、完整 JSON 1MiB，并要求先准入再发；第 78 行又禁止 unknown 被关闭、TTL 或 LRU 淘汰。第 89 行同时要求 ack unknown 保留原消息 ID 与动作诊断，但没有确定 ack attempt 是否占用这 32 条/1MiB、何时准入、满额时如何在首次副作用前处理。038 的提案同样只给发送观察的容量口径，不能作为已补齐 ack 记账的依据。

具体失败序列：activation 已保留 32 条发送 unknown；用户在收件箱显式 ack 一条已有消息；primary 可能已写而读回失败；随后关闭真实 leaf。若 ack 结果只放 InboxPanel 局部状态，关闭后丢失待核对动作；若追加到同一注册表，突破 32 条；若在结果返回时才拒绝登记或淘汰旧记录，则在副作用之后才发现无法履行未知保留合同。另开未定上限的 ack map 也没有完成有界设计。该序列是由拟定行为组合推出的风险，本轮没有执行模拟或产品测试。

同一预算还应覆盖已接纳 attempt 后续附加的 outcome/诊断。只计入发送前 payload 的当前字节，不能保证已接纳操作进入 unknown 时仍可完整登记其身份和有限诊断；观察注册表的预算与持久邮箱最坏 ack 字节预留是两个独立边界，033 F2 已关闭并不自动关闭此处。

最小关闭条件：在原 A presentation 内明确 send/ack 有副作用 attempt 的有限记账方式。优先复用同一 32 条/1MiB 注册表；也可明确独立有限 ack 池，但不需要新存储或产品路径。首次可能产生副作用前预留 slot 及有限最大 outcome/诊断编码成本；满额准确拒绝该新 attempt，不调用 writer，不抹去旧 unknown。诊断使用固定错误码/有限字段和有界展示文本，不把任意 Error/stack/循环对象放入不可淘汰记录；业务 ID、原目标、send 的原正文/refs/source 不截断。已结算 unknown 的 ack 只做原 fresh-primary ack 字段核对，不自动再次 ack；记录关闭/晚到 epoch 合同沿用现有 presentation。

未来验证只需在现有 `presentation.test.ts`、`service.test.ts` 和必要 `InboxPanel.dom.test.tsx` 覆盖：发送观察满额后 ack 的副作用前准入、ack unknown 闭叶重开保留、已接纳 attempt 的最大有限诊断增长仍在预算内。这里列的是关闭条件，不是本轮已运行检查。

### 已闭合或不应扩大的接缝

| 关注点 | 固定原来源与判断 |
| --- | --- |
| 原队列、新鲜 primary、冷 ack | 原 `SpaceService.mutate` 第 227–290 行会在编辑前初始化 JsonStore；原 JsonStore `loadNow/commit` 有恢复/backup/primary 写入。r4 已要求冷重复 ack 与取消在这些步骤之前只读判断，且 guard 覆盖 mkdir/corrupt/backup/primary。原 033 F1 已被吸收，不新增第二条同义 finding。 |
| archive gate | 原 `acquireArchive` 第 630–648 行先在 inspect/tail 内登记 gate，停止等待在队列外，持久 archived 晚于登记。r4 第 64 行明确 send 必须看匹配 gate，read/ack 不受活动 runtime gate 限制，解决了只看 archived 的窗口；不需把停止过程搬回持久队列。 |
| 唯一 writer 与 generation | r4 明确所有采用 records 的入口共同分类邮箱变化，包括非邮箱提交与 unknown 核对。原 JsonStore 三方合并会在局部字段未改时保留 remote 变化，不能仅凭 SpaceService 内存 base 就断言非邮箱提交必丢邮箱。需要在 A 实现时核对实际 adopted result；无需第二索引/持久 lineage。 |
| controller 装配与结束 | 原 controller 构造已拥有唯一 SpaceService/WorkspaceService；原 dispose 第 1362–1448 行把 bounded observation 与真实资源 settlement 分开，writer 最后释放。A 独占 controller，可创建 source/facade/presentation 并注入 B commands，不需新增 module.ts writer。 |
| pending/unknown/晚到 | r4 已按真实 leaf + 每次 PageCreate token + 每 attempt 身份区分，不用业务 ID 覆盖观察；闭叶仅 detach，强记录不持有 DOM，旧 epoch 不污染新 activation。实现须按实际 writer settlement 释放 per-view in-flight，不能把 UI promise 超时当结算；这是原文已明确的不变量，不要求为此预造新公开 API。 |
| 完整 payload 核对 | r4 明确核对 messageId/recipient/body/source/refs，ID 相同而 payload 不同是冲突；not-found 只代表该次新鲜快照。无需自动 Outbox、重试或重放。 |
| metadata source | 原 PathPicker 的 items/kind/allowCreate 与 vaultPathItems 枚举 metadata 可以复用；MaterialPicker 读正文和 attachMaterials 不可充当邮箱选择器。共享 normalizeVaultPath 宽松归一化不等于 wire 校验；r4 已在 A adapter 要求先检原路径/current vaultId，再核 TFile/stat，send/open 重核，保存后失效 refs 不阻 ack。 |
| agentTool 与焦点 | 原 createAgentPage/getState、compose stateKeys 和真实 contribution 测试均被 U 路径覆盖。保留 control 开闭、仅加 agentTool 枚举，history 优先；工具框包原控制内容，Bell 显式选 inbox，消息变化/read/ack 不调用终端或导航动作。无需新增 Shell target/导航协议。 |

### 54 路径核验

`allocation-check.json` 实际结果：A 17、B 19、U 14、Root 4，合计 54 个且唯一 54 个；16 个声明新增在固定 R1 中不存在，38 个既有路径均存在；B stage1 的 10 个路径全部属于 B。没有跨 owner 重复路径。

A 覆盖记录、原 SpaceService、core、facade/presentation/source、唯一 controller 装配、故障测试与数据文档；B 覆盖 canonical/生成物/CLI、commands/router/paging 与真实 native 组合入口；U 覆盖原页面/toolbar、工具框/inbox、view state/compose/贡献恢复、i18n/文档/原 Chrome runner；Root 独占产物/预算/许可。F1 可在已分配 A/U 路径中关闭，没有证据要求扩大到共享 JsonStore、TextStorage、Shell host、MaterialPicker 或 module.ts。T09 039 修复后仍由 Root 在正式 DoR 对最终源重核，当前分配只是静态候选。

### 实际验证与限制

- 实际哈希核验：8 个固定输入、9 个选择的原产品快照、038 的 27 个来源快照均匹配；路径集合检查 errors 为 []。
- 实际运行 Node 26.11.1 `validate-dispatch.mjs --repo <repo> --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 040-t10-final-plan-review --stage dispatch`，exit 0、errors []、warnings []；原 stdout/stderr/argv/UTC/TASK hash 见 `dispatch.*`、`dispatch-receipt.json`。
- 本报告原子无覆盖写入后才执行同工具 `--stage return`。其真实 stdout/stderr/exit 与 TASK/REPORT hash 单独保留在 `return.*`、`return-receipt.json` 并原生交回；本段不提前假称 return 已通过。
- 未运行产品测试、构建、Chrome、native/helper、Provider、Vault 操作或旧探针；没有产品候选红绿，也没有真实 E2E。没有检查或修改 039 动态修复，原 036 两轴发现/证据不受本咨询替代。

## 问题与下一步

Root 接收 F1 后只需固定 ack 观察准入与有限结果增长预算，再由 A 在现有 presentation 合同中落实；不需要用户新增产品决定、持久存储或额外路径。其余本轮重点没有发现阻止按 r4 正确实施的新矛盾。正式 T10 激活、DoR、原实现验证、两轴审查与 AC 判定仍由原编排推进，当前停点保持 SOURCE READ ONLY。
