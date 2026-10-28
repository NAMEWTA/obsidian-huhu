# Go / HAP 正式独立双轴复审 Round 3

- Reviewer：`native:/root/review_runtime`，由 Lead `native:/root` 实际派遣，未参与生产/测试/合同/配置/修复实施；仅 /tmp 报告和 overlay，无项目文件修改，不接管 SpecDev 状态。
- Implementers：`native:/root` 与 `native:/root/review_data`。baseline `23785924829c1db0847f9ae564b7b2f668cbfe25` 仅作背景，审查使用实际未提交源码。
- Lead 原 Round2 输入 + 唯一 test delta 的有效481文件 SHA256 `63c7c8677653aa1b1c899a72d789ca54c50832055aa7ff495941a6b05698c740`；新 owner 冻结12文件 `portable-preview-bounded-delta.json` 原始文件 SHA256 `260d912bb54cb5955baa08f22ecb62bd69b3dca4b2207d49d82c8c0d3d04b8f1`，canonical JSON.stringify SHA256 `c986db0b9e347d7e0c29f6dd9c0db777ba4c2a6535942a5e20c6d6e9a3b9ddc5`。12项均已核对0 drift。
- Lead 随后发布的完整正式冻结 `final-go-input-delivery.json` 与本 reviewer 独立合成输入在 JSON 结构、482项路径/bytes/hash、sources/exclusions及canonical SHA256上完全相同，已再次核对0 drift。
- **本报告有效 Go/HAP 输入**：`final-go-input-delivery.json`（独立合成副本 `reviewer-go-round3-effective-input.json`），将12项中的11项 Go/HAP 增量合入上面481文件，新增 budget_test.go，得到 **482文件**；canonical JSON.stringify SHA256 **`caac63f228eda48db11bf0b471396b69d2c3f664f0a7f4acdc5fa9d603de0349`**。TS api.ts 不混入 Go scope，留给独立TS最终输入。除公布增量外原481文件无漂移；审查结束482项及6项标准/规范 sources再次核对0 drift。
- 标准：输入内 AGENTS.md、dev/SKILL.md、architecture/testing refs；code-review/reviewer-contracts/risk-review。规范：change spec.md 行为合同、ARCHITECTURE.md 设计。独立读实际服务→HAP→TS消费者发现并更正之前遗漏，没有用旧pass掩盖新证据。
- `final-go-review-ts14-amendment.md` 曾将两轴置 request-changes（TS14/GO07、GO08）；本报告在修复固定后重新判断。原Round2原文保存在 `final-go-review-round2-before-ts14.md`。

## standards

**result: pass**

**findings: []**

对全部固定字节、既有 Go runtime/application/data owner 与本次增量复核后，没有确认仍需修复的标准问题。此前 RT-01/02、GO01~06 的修复未变化；数据 gate、审批/来源/导入事务 CAS、WAL失败 restricted、Profile身份/凭证 owner 和三协议工具执行边界保持。新 preview 预算定义在 Application 的 transport-neutral DTO，Application 未引入 HAP/SQL/Provider SDK；HAP adapter复用相同预算防注入服务越界。拒绝在任何 sink write、任何 token slot publication 前发生。

新增风险闭合：

- 多同名候选不再最后一个目标胜出。Service和底层Import同时检查候选唯一性；歧义 keep/skip/replace 一律在任何写入前 `INVALID_ARGUMENT:AMBIGUOUS_IMPORT_TARGET`，copy仍使用token下固定新ID。覆盖 Agent、Session、Memory；Agent keep 的群成员/记忆namespace依赖仍正确。
- 公共 preview JSON预算 **64KiB**、冲突构造硬上限4096；超额在保存token槽之前返回 `RESOURCE_LIMIT:PORTABLE_PREVIEW_TOO_LARGE`。HAP对注入服务同样检查，拒绝不是不可发送的success。单次错误和后续status可编码；最大8项近预算成功preview batch可编码；冲突笛卡尔增长提前拒绝。

## specification

**result: pass**

**findings: []**

仅对本报告482文件 Go/HAP source scope成立；TS/API/UI最终渲染、真实 Provider/Obsidian/发行OS不由此pass替代。

- **TS14a / AC-041 closed（Go/HAP边界）**：应用返回token、`mappingMode:copy-candidate`、完整kind/from/to及冲突kind/existingId/reason/needsReview；schema/fixtures/generated/HAP贯穿。不把默认copy候选冒充keep/replace最终ID。真实HAP预览→拒歧义keep/replace→copy后按候选ID实际get新Bot，两个原Bot修订/人格不变，定向回归通过。
- **TS14b / GO07 closed**：独立原Go反例从committed=true/agent:second变为写前拒绝；正式三类对象、多种动作及单目标keep/replace/copy依赖回归通过。
- **GO08 closed**：独立原1,507,454bytes出站失败反例现返回可编码的小错误；正式token槽未占、后续status、8项batch和构造限额回归通过。

## 独立验证

Linux，`GOTOOLCHAIN=go1.26.10 GOWORK=off GOMAXPROCS=2`，`-p=1`，不跑整套-race或新大编译。

1. `reviewer-go-round3-portable-targeted.log`：4包定向12个顶层测试及子例，exit0，总约0.6s测试时间。覆盖实际bootstrap/HAP固定映射与歧义不覆盖、Import receipt/CAS、group replace无旧成员/活动Run拒绝、纯三类对象keep/skip/replace/copy、响应预算/token槽/8batch/冲突构造边界。
2. `reviewer-go-round3-ambiguous-overlay.log`：原独立歧义目标overlay复跑 exit0，0.004s。
3. `reviewer-go-round3-frame-overlay.log`：原独立1.5MB HAP响应overlay复跑 exit0，0.140s。配合正式实际错误kind/status/batch断言，不将仅成功WriteFrame冒充全部预算证明。
4. 原RT/GO01~06定向、新Profile真实reopen、WAL外部reader及Profile publisher barrier证据在下面保留的Round2事实中；本次逐项确认其源字节未变。没有重复整套大测试，也没有将Lead尚未收口的全局检查冒充本reviewer执行通过。

## 未验证及边界

- 真实三协议 endpoint/model、真实 Obsidian多leaf/多窗口全部故障组合、OS Keyring及其余发行平台/架构没有本reviewer实机证据，fixture/交叉编译不替代。
- TS scope须新统一source_snapshot单独验收。全量工程测试/构建由Lead维护真实回执；临时空间、Vitest teardown等运行问题不得写成全套exit0。
- 没有提交、推送、发布、归档，历史session transcript未修改。

---

## 仍有效的 Round2 既有修复事实（结果已由上文覆盖）

| 原 Finding | 本次判定及实际依据 |
|---|---|
| RT-01 notify 不可消费 | closed。associated notify 校验 root/target/实际 pin 接收方并固定真实工作线程；unassociated notify 以 principal+root+target mailbox 供已授权线程消费，不创建/唤醒 Run。初始 context_plan 与恢复 inbox 共用 mailbox selection。真实委派合同回归通过。 |
| RT-02 取消后 usage 固化 | closed。结算在原事务刷新终态 Run/祖先 usage/revision并追加 usage.settled，不重开/重复扣费。取消 child 的公共 Run/祖先回读回归通过。 |
| GO-01 cleanup 失败未持久门禁 | closed。SQL pending + runtime gate 同事务，直接 portable entry 有持久 admission，restricted status 暴露可恢复信息，旧 token 可重试。失败/重启合同通过。 |
| GO-02 在途 artifact publication 越过清除 | closed。production bootstrap 将 portable 和两种清理连同一 data gate。正式 Session 分支回归通过；本 reviewer 另用 Options.Artifacts 注入受控 writer，验证真实 Profile.Delete 等待在途 publication、结束后擦除旧包，overlay 通过。 |
| GO-03 group replace 保留旧成员 | closed。replace 先拒 active/unresolved producer/effect，再失效全部旧 membership/incarnation/historyRevision，激活批准成员；成员映射和 CAS 在导入事务。去掉 B 的 A-only 包不再保留 B；active Run 分支拒绝。 |
| GO-04 Profile retain 形成孤儿数据 | closed。API/store/preview 均拒 Profile retention；Session 明确保留的条目转为独立 profile scope、旧 lineage/revision正文清除。对应真实读取测试通过。 |
| GO-05 WAL 残留正文 | closed。Session 完成前、Profile 身份轮换前截断 WAL；外部 reader 钉住时返回 pending，释放 reader后原 token 重试并扫描 DB+WAL 无 canary。正式 red→green测试本 reviewer独立重跑通过。 |
| GO-06 全清后新 Profile 无法 hello | closed。轮换事务插入显式 paused/zero policy；成功全清→实际停止→重开→真实 HAP hello 回归通过，重开给非零 Options.Budget 也不会继承。Profile SQL-erased/WALbusy→重启restricted hello→retry 分支通过。 |

其余新增数据行为已核：portable 导出经真实 Memory/History 权限读者；导入 preview 绑定目标完整 CAS，在写入事务复核并持久 exact command receipt；stage 按 principal/connection/epoch 绑定，固定大小/规范 base64/offset/aggregate reserve，完整包校验后在 gate 内发布；pending Agent proposal 的 list/reject/confirm 绑定 owner、来源、revision、hash，来源撤权时过滤/拒绝。Session unknown effects 的正文清理保留最小 binding/fingerprint以供核查，不将旧正文重新公开。

## 独立执行验证

环境：Linux，本地 Go **go1.26.10**，`GOWORK=off`；不使用宿主 Go 1.27.1 的 sonic 警告噪声作失败判定，不重跑会触及 fixture 硬 deadline 的整套 -race。

1. `reviewer-go-round2-targeted.log`：5 包定向实际测试，exit 0。覆盖 bootstrap 数据真实闭环、两类失败清理/重启、group replace、导入 receipt/CAS、chunk stage真实 HAP、WAL reader busy/重试/扫描、新 Profile hello；Host renewal；artifact symlink；credential 会话擦除/worker unknown；notify及late usage。
2. `reviewer-go-round2-proposals-delta.log`：purge + delegation，exit 0。覆盖唯一 test delta、真实 HAP proposal list/reject、来源撤权、确认 CAS/hash/原子性。
3. `profile-publication-round2-overlay.json` / `profile-publication-round2_test.go` / `reviewer-profile-publication-round2.log`：仅 /tmp overlay，exit 0（0.08s）。实际 bootstrap 共用 gate：export 在 Put barrier，Profile.Delete 用短deadline明确等待；释放 publisher 后 fullclear，旧 private artifact 不再可读。
4. 审查结束 481 文件再核对有效固定输入，0 drift。Lead 正运行全量 `pnpm check:huhu-bot`；本报告不冒充本 reviewer 已独立执行全量检查。
