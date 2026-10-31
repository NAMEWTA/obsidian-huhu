# 056 接口、owner 与一致性细节

这是只读实施建议；下列建议接口/数据结构都未实现、未测试。规范事实来自 Spec §9/§10、NFR-001、ARCHITECTURE §10、ADR-003/004/020/024、T17 44–69、T18/T19；ADR-012 的首版手工范围已有后续决定覆盖，不能借旧范围削弱来源传播。完整来源摘要/时点与读段见 observations.json；本附件的 source 路径均相对 repo。052/053 等后续生产任务不是本研究写权。

## 一、当前真实接缝

| 当前路径与读段 | 已观察事实 | 直接约束 |
| --- | --- | --- |
| `native/huhubot/internal/bootstrap/core.go:54` | Acquire → base.Open → catalog/Blob → Collect → Executor.Start | 现有启动迁移阶段没有新执行器或 GC；这是当前最小修补可利用的停受理边界 |
| `native/huhubot/internal/adapters/outbound/sqlite/base/store.go:24` | 空旧库/坏库/schema/application_id 先拒绝；MaxOpenConns(1)；74–98 只生成并 Sync DB 副本，99–127 迁移事务 | 不能在占住唯一 DB 连接时再经 `Store.Database()` 嵌套查询；备份外部 IO 不放进迁移事务 |
| `native/huhubot/internal/adapters/outbound/sqlite/migrations/embed.go:1` | 当前 Version5：001、002、003、005、006，历史 SQL 不改 | 新迁移注册由原 T01 串行；不能按文件号误判 schema version |
| `native/huhubot/internal/adapters/outbound/sqlite/effects/store.go:113` | CP 注册、审批、Effect、Run、事件同事务发布；145–148 的 GC 引用谓词只查 execution_checkpoints | 备份引用源是已提交 registry，不能只扫磁盘或只查 waiting_approval |
| `native/huhubot/internal/adapters/outbound/blob/store/store.go:77` | 不可覆盖文件发布、临时 in-memory hold、完整 metadata/payload 校验；Open 返回 payload | 备份必须保留完整编码 envelope；不得通过 Publish 重建新 ref 破坏 DB 对应关系 |
| 同文件 `Collect` | 持 Blob mutex 扫 live `checkpoints/`，再调用 DB 引用谓词；只删无引用且无 hold 的 CP | 启动 GC 前可固定快照；未来 live 备份先协调 GC，不可与“持 DB 连接再取 Blob mutex”形成锁反序 |
| `native/huhubot/internal/runtime/profile/profile.go:75`、`lock_unix.go:1`、`lock_windows.go:75` | canonical path、SameFile/硬链接检查；锁归实际 DB 文件/文件 ID | 替换 inode 后旧锁不能覆盖新文件；仅凭路径名相同不保证排他 |
| `src/modules/huhubot/api.ts:119`、`:360`、`:560`；wire slice | ArtifactRef 为 artifactId/mediaType/size；preview 仅 token/conflicts；三 portable 方法 implemented:false | 没有现存 Portable/maintenance 生产实现；不能称安全漏洞已暴露于已上线消费者 |

当前迁移备份目录是实际 Profile 下 `.migration-v<source>-<random>/profile.sqlite3`。Blob 在 `<Profile>/checkpoints/<32hex>.cp`，ref 是 `cp:<32hex>`；当前仅有这一已实现 Blob 消费者。将来的记忆/摘要/索引等 Blob 必须在各自首次真实消费者出现时补统一备份枚举，不能现在伪造 memory 表。

## 二、下次 schema 迁移前的最小恢复集

建议由原 owner 在已有启动链加入一个 **adapter 内部** 的“迁移前恢复集完成”阶段，不新增 Application/HAP 方法，不建第二个 bootstrap。

```text
实际 Profile 锁
  → 旧库 preflight（尚未 Start Executor / Collect）
  → 受支持 DB 副本
  → 从同一稳定源/副本读取 committed Blob inventory
  → 验证并复制完整 Blob 到该恢复集私有目录
  → 同步 DB、Blob、manifest；完整标记最后发布
  → 迁移事务 → 关系与 Blob 完整性验证 → 正常启用
任一前置失败：关闭句柄，保留源库，副本不准入；不执行迁移
```

1. `base.Open` 当前一体化完成备份与迁移。最小维护可增加可注入的 pre-migration hook/阶段调用：在 DB 快照成功后、BeginTx 前交给 bootstrap 中组合的 adapter 完成 inventory＋Blob。传递仅 adapter 层的版本、受管 snapshot 定位及必要 DB 访问能力；Application 不含 `*sql.DB`，base 不 import effects，避免循环依赖。具体名称由原 owner 定。
2. 从固定副本（推荐）或完全停止写入的原库枚举 `execution_checkpoints(ref,run_id,artifact_json)` 全部行，读取后关闭 rows/归还连接，再处理文件。逐条解析严格 artifact，校验 Run/审批/continuation 引用闭包，不丢终态但仍被 registry 引用的 CP。更旧 schema 按已知兼容表判断是否确实没有 Blob；未知 schema/悬空引用失败，不把“表不存在”泛化为零引用。
3. 在现有 Blob adapter 内复用校验器增加“验证完整编码文件并复制”的窄能力；不将真实路径暴露到应用 API，不复制第二套 HUHUCP1 编解码。内容为 `HUHUCP1\n + uint32 header size + JSON envelope + payload`，保留原 ref/run/attempt/metadata。校验 Ref、FormatVersion/EngineVersion/DefinitionDigest、payload 大小及 digest，并记录完整文件大小/digest。现有每 CP payload 上限 1 MiB；完整头部/总集大小同样需有界，不能用 payload 限制冒充文件总量限制。
4. 建议 manifest 字段：`backupFormatVersion`、生产者 build、application_id、源/目标 user_version、Profile ID、源 commandEpoch/revision、DB 相对名称/大小/SHA256；每项 `ref + artifact + 相对名称 + 编码文件大小/SHA256`。这些字段供兼容性/完整性核查，**不是当前权限或恢复准入授权**。目录/文件由程序生成，0700/0600 私有边界；禁止用户任意路径、symlink、碰撞覆盖。字段名称/具体格式待原 owner 实施冻结。
5. 采用独立普通文件副本，放在该 `.migration-v*` 目录；复制结束后关闭/Sync，manifest temp→最终完整标记最后发布，适用平台同步目录。只有完整 manifest 才能登记为可用恢复集。既有无 manifest 的 DB-only 目录不能追认成完整集。中断残留保留可解释状态，但始终处于受管清除范围。
6. 独立副本不在 Blob.Collect 扫描的 live `checkpoints/` 内。迁移后即使删除 live registry/清理孤儿，也不会破坏备份副本。仅写 manifest 引用 live 文件无法获得这个性质；那会额外要求持久 backup pin＋GC 交集，本轮没必要引入。in-memory holds 不能跨重启，也不能代替独立备份所有权。
7. 新 schema 启用前验证已期望版本/metadata、外键与应用关系、每个 live Blob hash/格式；不把单独 ReadMetadata 当完整验证。提交前 SQL 失败由事务回滚；提交后检查失败保留升级后的库及旧完整集，进入受限恢复状态，不能自动删库/创建空库。完整 T19 选择/回退 UX 留后续。

此方案依赖当前启动阶段独占并且没有清除/GC/执行在跑。未来在线调用 T19 时必须实际关闭准入并等在途提交/Blob 发布/GC/清除达到同一维护屏障；不能复用这一启动假设而遗漏运行中 writer。

## 三、实际 v0.35.6 备份 API 与错误边界

实际模块 `/home/wta/go/pkg/mod/github.com/ncruces/go-sqlite3@v0.35.6`：

| 实际方法 | 行为与使用限制 |
| --- | --- |
| `(*Conn).Backup(srcDB, dstURI string) error` | 内部 BackupInit，defer Close，Step(-1)；便捷包装返回 Step 错误，不能用它证明显式检查了 Close 错误 |
| `(*Conn).Restore(dstDB, srcURI string) error` | 打开只读 source URI、向当前连接目标库恢复；一次 Step(-1)。不是完整 Profile 恢复协议 |
| `(*Conn).BackupInit(srcDB, dstURI string) (*Backup,error)` | 源是当前 Conn；内部打开新 destination（READWRITE/CREATE/URI），其生命周期归 Backup。不要套 mattn 的双连接参数形式 |
| `(*Backup).Step(nPage int) (done bool, err error)` | DONE 才 done=true；负数处理剩余全部页。OK 可是 false,nil，需继续 |
| `(*Backup).Close() error` | backup_finish 后关闭内部目标句柄；未完成的 backup 回滚。每次成功 Init 必须一次 Close |
| `Remaining()/PageCount()` | 最近一次 Step 的进度，不是稳定业务快照标识 |
| `(*Conn).SetInterrupt(ctx) oldContext` | Go Conn 不并发安全。Raw 回调需显式设置并恢复；Step 本身没有 context 参数/显式检查 |

driver 官方示例是 `sqlConn := db.Conn(ctx)`，在 `sqlConn.Raw(func(dc any) error { raw := dc.(driver.Conn).Raw(); ... })` 内使用；Backup.Close 必须在 Raw 内完成，再返回 leased sql.Conn。不能让 raw pointer 或未关闭 Backup 逃逸回调。未关闭 statement/blob/backup 会使原生 Conn.Close 返回 BUSY。源连接配置不等于新 destination 自动经 database/sql driver init；目标使用程序构造的可信 URI，必要 pragma 与 durability 需明确设置/验证。

建议 T19 增量循环以小的正页数 Step，步骤间 ctx 检查，BUSY/LOCKED 按总时限有限等待；错误、取消或超限统一关闭资源并拒绝部分输出。保留 primary error 与 cleanup error，不以 Close=nil 覆盖 Step failure。源码没有给出硬实时备份取消承诺，文件系统阻塞/单次 Step 最长耗时须未来测试，不能保证 50 ms。

SQLite 官方 [Online Backup API](https://sqlite.org/backup.html)、[backup_finish](https://sqlite.org/c3ref/backup_finish.html) 支持逻辑 DB 备份，包括 WAL 中已提交内容。不同步骤间 source 可以变更并导致重启，destination 在备份中独占；因此仅靠在线 DB 快照不足以固定外部 Blob。没有先拼复制 `profile.sqlite3/-wal/-shm` 的受支持捷径。对象完成与句柄清理是两个条件；提前 Finish 可能回滚，Finish 成功不表示 Step 已完成。

`VACUUM INTO` 仍是当前启动阶段可复用的受支持选项，无需为此次最小 Blob 修补强制换驱动/换备份算法。它要求新/空目标、没有活动事务/未结束语句；取消或掉电的目标不能当可用备份。原生 API 成功、文件 Sync、目录/manifest 发布是不同检查点。[SQLite VACUUM](https://sqlite.org/lang_vacuum.html)

002 既有证据仅复用“ncruces 实际 backup 可运行”的结论：当时 WAL 20362 bytes、备份行数 1、integrity_check ok；未重跑。其查询取消探针只证明查询中断，不证明 backup cancellation、Blob 一致集或任何 Windows/macOS 恢复行为。

## 四、Portable 内容包与确认事务

当前 wire 参数：export 选择 agentIds/memoryIds/sessionIds；importPreview 取 Profile ID＋ArtifactRef；import 取 CommandMeta＋previewToken＋`{id,action:keep|replace|copy}[]`。ArtifactRef 是 opaque artifactId/mediaType/size。可由服务器把 artifactId 绑定不可变字节/hash，无需仅为 T07/T11/T12 先增加 wire digest。

首版建议一个有界 JSON 包，内容 manifest 明确版本、实体种类/本地包 ID、正文摘要/大小、关系与来源；这只是实现建议，不将 zip 定为需求。严格拒绝不支持的 schema/字段、重复 JSON key/实体 ID、跨类型错引用、未选内容、非法路径/URL、超限/不符 hash；数值界限在 T18 对实际消费者确定。若未来选择 archive，另加压缩前后总量、entry 数/重复名/穿越/符号链接边界，不因格式选择放宽上述规则。hash 不赋予作者身份或执行权限。

预览不能只持客户端可变 artifact 路径。服务端 preview token 应绑定包 hash、目标 Profile ID/commandEpoch、实体 revision/hash、计划重映射和有效期；不可由模型或包选择目标权限。包的来源命名空间 ID 与目标 ID 分开，完整列出 Agent/成员/来源映射。当前 preview 结果没有 mapping 字段；应于 T18 正式窗口向 T01 提精确 DTO/schema/TS codec 更新请求，重验数目门和 fixtures。

确认时在短事务内重读当前修订、epoch、token、清除/来源水位，做完整内容写入与同一 command 回执；重复确认返回原结果。多个现成 create 用例可能独立提交、增任务或授默认权限，不能拼成导入事务；需要原领域 adapter 提供参与同一 Tx 的内部写入入口，SQL 不进入纯应用 Port。包外部文件 IO、hash 计算在事务前；如将来有导入 Blob，先发布 immutable Blob，再同事务写引用，失败留无引用孤儿按既有规则收集。

导入全部新身份，包不能指定有效 Grant/Approval/CP/Run/Effect/lease/凭证。对于 keep/replace/copy，保留目标是显式决策；任何来自包的新增/替换内容仍使用预览过的新 ID 映射，replace 不是继承目标授权/历史执行身份。确切名称冲突与替换 UI 由 T18/T25 冻结，不在此发明另一条覆盖规则。缺失外部来源保持不可召回并要求重授；不能靠删除 provenance 把自动来源变成人工独立记忆。055 的可信 revision/lineage、forgotten 水位继续用于确认与迟到作业检查。

## 五、清除后的备份与恢复权限

Spec §10 180–188、NFR-001、ADR-020 的行为要求是：受管备份不能回灌已清除正文/来源；未知效果可保留最小核查账本，不能借此留完整 CP；全 Profile 清除等待未决效果解决；用户导出与 Vault 成果不连带删。具体“目录/清除水位”形状尚未实现，以下是最小建议。

- 备份目录管理包含成功集、`.migration-v*`、半成品与维护暂存。清除屏障与备份/恢复发布互斥。最简单策略是使任何包含被删来源的恢复集失效并删除整集；若以后保留净化副本，必须重新生成 DB＋Blob 清单/hash，旧集不能仍可用。删除失败保持清除未完成/受限，恢复入口拒绝该集。
- 当前可恢复目录/清除水位不能一起被旧 snapshot 回滚。恢复只接受能与当前权威水位核对的受管集合；备份里的 epoch、权限、墓碑或标志不能自证当下有效。缺水位/目录不一致时 fail closed，保持可解释受限核查路径；不是悄悄将旧历史导成活动 Profile。
- 恢复后的命令准入使用当前有效代数，旧借用 lease/claim 失效，所有 Run/CP 按 T16 重新分类，旧 Grant 要与当前撤权状态相交。恢复待核查 effect 需要保留稳定 effect 身份及最小证据；不能换 ID 后重发 Host，也不能靠旧备份把“效果未知”改成“可重试”。当前恢复目录/代数实现留 T17/T19/T01 联合窗口。
- 全 Profile 清除后的新建 Profile 使用新身份；不能自动重新绑定旧 Profile 文件。用户显式导出本来就在清除范围外；其后明确导入是 T18 选内容、新身份、权限重授且零自动执行。清除不是承诺抹除 Provider 远端、用户备份或任意外部系统的历史。

## 六、精确最小 owner 请求

| 最早窗口 / 原 owner | 必要路径 | 最小维护 / 不扩范围 |
| --- | --- | --- |
| 下一次 schema 迁移前；T01 foundation_go | `native/huhubot/internal/adapters/outbound/sqlite/base/store.go`、`native/huhubot/internal/bootstrap/core.go`、`native/huhubot/internal/adapters/outbound/sqlite/migrations/embed.go` | 原启动备份前后分阶段/窄 hook，完整集完成后才迁移；注册仍唯一 owner；不新增公开 backup API，不改历史 SQL |
| 同一窗口；T06 foundation_go | `native/huhubot/internal/adapters/outbound/sqlite/effects/store.go`、`native/huhubot/internal/adapters/outbound/blob/store/store.go` | 只读 committed CP inventory、复用完整编码校验/复制；CP domain/API 元数据可复用；不扩大模型/工具权限 |
| T19；T01 Profile 原 owner | `native/huhubot/internal/runtime/profile/profile.go`、`lock_unix.go`、`lock_windows.go`；原 base/bootstrap | 维护阶段与关闭资源/锁、替库身份和 WAL 清理协调；不要在旧 inode 锁下暴露新 DB |
| T19 自有 | `native/huhubot/internal/application/data/maintenance/**`、`native/huhubot/internal/adapters/outbound/sqlite/maintenance/**`、`native/huhubot/tests/contract/migration/**`、`native/huhubot/testdata/migration/**` | 恢复集选择、校验/迁移/恢复编排与故障证据；当前目录待建；不复制 profile/bootstrap |
| T18 自有 | `native/huhubot/internal/application/data/portable/**`、`native/huhubot/internal/adapters/outbound/portable/**`、`src/modules/huhubot/platform/desktop/portable/**`、portable contract/testdata | 有界文件接收/导出、包解析、preview/确认用例；文件 picker/opaque artifact，不把用户任意 path/URL 透传 Runner |
| T18 请求 T01 公共合同 owner | `native/huhubot/internal/application/api/**`、`src/modules/huhubot/api.ts`、`contracts/hap/v0.1/schema.json` 及派生 Go/TS/夹具/validator 准确计数 | 只在实际映射展示/错误合同需要时补 preview 映射及适用状态；三方法名称可复用，不现在预造第二套 DTO |
| T18 请求原内容 owners | T02 `sqlite/assistant/store.go` / `application/assistant/**`；T03 `sqlite/conversation/store.go`；未来 T13/T14/T15 原实现路径按届时真实 inventory | 同一 Tx 内导入纯内容/关系、不授旧权、不入队；T02 原 owner 是 foundation_go；未建 group/memory 路径不猜成现有 helper |
| T17/T19 联合；T01/T03/T06 等原 owner | 原 base/profile/bootstrap、execution/effects、Blob 与未来 purge/maintenance 自有路径 | backup 清除水位、旧 epoch/lease/claim 失效、最小效果账本和受限状态；source/forgotten 契约复用 055，当前不新造公开恢复 API |

以上请求只由 Lead 收敛到准确 Ticket/Map/原 owner 的后续写集；研究角色没有实施权，也不把潜在后续要求记为当前冻结候选已触发缺陷。
