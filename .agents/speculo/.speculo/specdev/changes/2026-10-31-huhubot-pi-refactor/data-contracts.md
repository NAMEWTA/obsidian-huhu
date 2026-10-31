# 数据合同、耐久性与恢复

依据 Issue §2/§8，ADR-004/010。以下表/字段为拟议逻辑 schema，不是已创建数据库，也不宣称最终迁移 DDL 已冻结。

## 1. 权威矩阵

| 数据 | 单一 owner / 写入 | 恢复边界 |
|---|---|---|
| Pi sessions/*.jsonl | 所选 SDK SessionManager | 原始会话不能由摘要/FTS 恢复；不得另写其 schema |
| state.sqlite | Runtime StateStore 事务 | 授权、审批消费、预算、幂等、确认事实不可当缓存清空 |
| run-events/*.jsonl | durable outbox exporter | eventId 去重/checkpoint；只有完整权威事件仍在才可补齐 |
| index.sqlite | Projection/FTS worker | 可重建；不删除事实本体；重建时按最新 grant/tombstone 过滤 |
| artifacts/ | 明确 artifact owner | content hash +来源+权限+保留策略；大内容引用不塞 IPC |
| resources/ | 批准的 Skill/工具 manifest 快照 | revision/hash 可追溯；不是自动 HOME 镜像 |

只读 projection 可以丢弃；confirmed facts 与 control ledger 不可以。Pi 自己的 session/entry 与 HUHU audit/run IDs 以显式映射关联，不强行共用 parentId。

## 2. 本地根、锁、备份

Host 从既有 vault/device identity 解析新格式独立本地根，P0 在报告中写出实际 API/路径/权限和 Windows/macOS/Linux 行为。此处不把猜测的 `.huhu/bot-v2` 当已确认最终路径。SQLite WAL 不放网络文件系统、不做跨机器云合并；根锁防多实例，generation 防旧实例迟到写。

权威状态建议以 WAL+FULL 为候选耐久策略，必须测目标 VFS/文件系统与关闭行为，不能把配置当掉电实测。索引可单独使用较宽松策略。备份优先 SQLite 一致性 backup 或协调暂停并处理 WAL；简单复制活跃 `.sqlite` 文件不合格。依据 [SQLite WAL](https://www.sqlite.org/wal.html) 与 [synchronous](https://www.sqlite.org/pragma.html#pragma_synchronous)。

Pi 文件和 state backup 不天然同一事务。备份 manifest 记录 generation、截止 seq、各 session checkpoint/hash、schema/SDK 版本与 artifacts 清单；恢复先对账到一致边界，超出边界的外部效果不重放。导出默认排除 secrets/credential material，来源 scope 仍需授权。

## 3. 拟议逻辑表与不可变约束

| 表族 | 必需键/字段 | 不变量 |
|---|---|---|
| owners / schema_meta | stateRootId、generation、schemaVersion | 单一活跃 owner；schema 不支持时只读或阻断 |
| bots / teams / memberships | botId、revision、snapshotHash、memberId | membership 不等于 delegation allowlist |
| conversations / pi_sessions | conversationId、sessionRef、leafEntryId | 相同物理 session 一个 writer；按真实 ancestry 构建上下文 |
| runs / attempts | root/parentRunId、attemptId、retryOfAttemptId、status | terminal attempt 不改回 running；重试增加 lineage |
| commands | principal、idempotencyKey、inputHash、receipt | 唯一约束；冲突不能覆盖旧 command |
| grants | sourceScope、recipient/provider、operations、expiresAt、rev | 活跃 scope 是调用前实时交集，不由 prompt 授权 |
| approvals | previewHash、bindings、status、expiresAt、consumedBy | CAS 单次消费；批准≠已执行 |
| budget_accounts/reservations | rootId、limits、reserved、charged、knowledge | 原子预留；子/维护/重试共享根；unknown 不归零 |
| effects / receipts | effectId、commandId、intentHash、targetRev、state | prepared 后调用；未知效果不自动重新执行 |
| mailbox / reviews | envelopeId、from/to、workThreadId、receipt、reviewId | 投递幂等；根 review 独立于 child terminal |
| memory_facts / candidates | factId、revision、scope、sources、confirmation | 候选不自动变事实；变更保留来源与确认 |
| memory_tombstones | fact/source fingerprint、scope、createdAt | 自动抽取/重建/向量回填都必须排除；显式重学才解除 |
| durable_events / outbox | eventId、seq、payloadVersion、exportCursor | 与控制决策同事务；成功通知不得先于 commit |

字段类型、FK、unique/index、保留期与 schema migration 在 T-02/T-07 精化；不为未来自定义工作流或远程服务预建几十张空表。新格式未来自身 schema 升级需受控迁移；“不迁旧 Go 数据”不等于永远禁止新格式维护。

## 4. 一次写入的可恢复状态机

```text
proposed → awaiting_approval → approved
approved + current grants/revisions + budget → prepared (durable intent)
prepared → executing → committed(receipt) → reported
                     ↘ failed_no_effect
                     ↘ partial / unknown_effect → reconciling → confirmed outcome
```

prepared 事务包含 command 去重、审批消费、budget reservation、effect intent、outbox。事务 commit 后才允许 Host 发起外部调用。Host 仍重新验证 lease/source revision 与编辑器状态；拒绝发生在效果前可记录 failed_no_effect 并释放可释放预留，但旧审批不能“退回未消费”然后无条件复用。

Host 业务写入不能与 Runtime DB 假装是一个 ACID 事务。Host 返回业务 entityId/revision、operationId、效果摘要和确认级别；receipt 落盘后才发 committed。响应丢失但写入已发生，必须查询业务 owner 的 operationId/目标版本；若对方不支持幂等/查询，保持 unknown，要求人工核实，不能凭笔记文本相似推定安全重试。

部分成功：逐 effect 展示 confirmed、unknown、not-started；root 可以 failed/interrupted 且有成功产物。用户取消不能删除这些事实，也不把所有预算一并清零。补偿必须独立新命令/审批，不默默“反向写回”。

## 5. 崩溃点矩阵

| 崩溃点 | 可信事实 | 允许恢复动作 |
|---|---|---|
| admission 事务前 | 未 durable accepted | 重发相同 key；仍验输入和 scope |
| admission 后、模型前 | 已受理、无已知效果 | 读取原 receipt，按 quota 新 attempt；不能重复 work |
| approval 后、prepared 前 | 批准记录存在 | 重新核对过期/revision/provider，不直接消费旧预览 |
| prepared 后、Host 调用前后无法区分 | intent 已存在，效果未知 | 对账；禁止自动 replay |
| Host 已写、receipt 未到 | 外部可能已生效 | 查询 owner；保留 effectId，不能换 key 规避 |
| receipt 已提交、事件尚未发 | 效果已确认 | outbox 重发；eventId 去重；不再写业务 |
| delta 丢失 | 临时显示不完整 | 用 Pi/Run snapshot 补齐，不写假 assistant 成功 |
| index 损坏 | 原始会话/事实仍可信 | 降级查询与可取消重建；不删 state |
| state 损坏/不可用 | 无法可信决定权限/消费 | 阻断副作用，保全文件，受控恢复；不得只靠 Pi 重建批准 |
| Pi 尾部半行 | 部分 transcript 可读性未知 | 隔离备份，SDK 支持的恢复策略；不静默裁中间记录 |

## 6. Session、分支与索引

SessionRef 必须可映射到 SDK 文件、sessionId、选中 leaf 和关联 conversation/attempt；实际 SDK 类型在适配层封装。读取 chosen leaf 的祖先与 compaction 结果，不取文件最后 N 行拼上下文。摘要 key 至少含 session/branch/source revision/policy version；修改共享授权必须使对应投影不可再取。

session slot teardown await abort 后 dispose；恢复创建新的进程内对象，不恢复 JS Promise。关联元数据用 SDK 支持的 custom entry；custom_message 会进入模型上下文，不用来塞审计。新 attempt 使用已确认 tool receipts 作为可信事实引用，不伪造上一轮成功结果。

## 7. 记忆忘记与源删除

删除记忆：确认事实不可检索，FTS/vector/cache 撤销，tombstone 阻止从保留 transcript 自动提取；用户可明确重新学习。删除会话：分别说明 transcript、引用事实、artifacts、备份保留和已发生外部效果；不能暗示一键撤回发给 provider 的数据。来源 grant 撤销立即改变读取能力，index 更新延迟不得泄漏已撤销内容。

## 8. 旧数据与恢复的产品文案

首次新运行时使用空的新格式根；告知旧格式未自动导入且仍保留。显式清理先展示旧根/数量/大小与备份选择，二次确认准确范围，停止旧 writer 后执行；绝不递归删除整个 native/vault/profile 上级。无明文凭据进入备份，受保护引用失效则提示重新绑定。
