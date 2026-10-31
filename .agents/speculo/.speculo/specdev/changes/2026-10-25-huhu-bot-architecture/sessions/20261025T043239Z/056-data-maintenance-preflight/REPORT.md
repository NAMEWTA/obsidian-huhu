# 056：Portable 与 Profile 数据维护预检

Session: 20261025T043239Z
Task: 056-data-maintenance-preflight
Status: completed

## 聚焦交接

结论：T18/T19 尚未实现。下次迁移前须将现有 DB 副本补成 **DB＋其引用的完整 Blob＋版本/hash 清单**。Root 已采用此窄方案，057 准备、未来 052 原 owner 实施；本研究没有产品写权，当前无需新增公开 backup API。交回前 Root 通知 050 已接纳、Map14/Goal13 开启；下文源码结论均按实际读取时点，不冒充后续实现验收。

**实际驱动与启动。** ncruces/go-sqlite3 v0.35.6、Go 1.26.10 toolchain，模块 tag `091633ebb62b0c78988d3e079149333b36337599`，MIT；不同于 REF-08 默认分支。`base.Open` 已拒绝非新空库/坏库/不兼容 schema，升级前 VACUUM INTO，再以一个事务迁移；当前 schema 5，随后设置 WAL/FULL。现有备份没有 Blob，迁移后没有完整关系/Blob 验证门。[SQLite 文档](https://sqlite.org/lang_vacuum.html) 确认 INTO 可生成一致 DB 副本，但中断输出可能不完整。

**最小启动修补建议，非已实现。** 当前顺序是持实际 DB 身份锁 → base.Open → Blob.New/Collect → Executor.Start，迁移时尚无新执行器/GC。利用这个边界：

1. 完成旧 DB 副本后，从同一稳定旧库或该副本枚举全部 `execution_checkpoints`，连同 Run/审批引用核对；按已知旧 schema 处理无 Blob 情况，不能将未知结构当空清单。
2. 由原 Blob adapter 校验并独立复制完整 `HUHUCP1` 文件。现有 `Open()` 只返回 payload，不是可恢复的编码文件；不能只存 ref，也不能仅复制 waiting_approval 的 CP。
3. 清单绑定源/目标 schema、application_id、Profile/代数、DB 大小/hash、每个 artifact 元数据及完整文件大小/hash。私有文件关闭、同步、清单最后发布；缺失、损坏、取消或空间不足均阻止迁移。
4. 完整恢复集就绪后才迁移、校验、启用。备份副本放在 live `checkpoints/` 之外，因此 live GC 仍按 `execution_checkpoints` 判断，不必现在增加备份 pin 表。`.migration-v*` 和未完成副本都须纳入未来 T17 受管清除。

原 owner：T01 `foundation_go` 维护 base/store、bootstrap/core 和迁移注册；T06 同一作者维护 effects 的引用枚举与 Blob 完整文件校验复制。内部回调即可，SQL 不进入 Application，base 不反向依赖 effects。精确路径及锁顺序见 [附件](interfaces-and-owners.md)。这是下一迁移接缝，不是已完成 T19 的宣称。

**T19 驱动用法。** 实际为 `BackupInit(srcDB,dstURI)`、`Step(nPage)`、`Close()`；便捷 Backup/Restore 一次 Step(-1)，无 context 参数。`sql.Conn.Raw` 内原生连接不可逃逸/并发。建议分步检查取消、有限 BUSY/LOCKED 重试、收集 Close 错误，显式设置并恢复 SetInterrupt。须同时证明 done 与关闭成功；提前 Close=nil 不等于完成。[官方生命周期](https://sqlite.org/c3ref/backup_finish.html) 区分完成、回滚与清理。002 的查询取消不能证明备份取消；磁盘失败和目标 OS 未验证。

T19 仍须停准入、收尾在途/GC、持锁、预检、固定恢复集、迁移、验证、启用；失败保留原库与受限状态。锁绑定实际文件身份，持旧锁 rename 替库不保护新 inode；替库/保留原 inode 恢复由 T01 profile owner 与 T19 协调。程序回退不能让旧 binary 打开新 schema。

**T18 合同。** 建议有界单文件 JSON＋版本清单；zip 非既定要求。严格检查字段、大小、重复键/ID、类型/hash/关系/路径；限额由 T18 定。只含用户选定内容，排除秘密、有效 Grant/审批、CP、租约和队列。ID/成员/来源显式映射，包不能自证授权。

现有 `portable.export/importPreview/import` 足够表达三步，仍未实现。token 绑定不可变包 hash、目标 Profile/epoch、revision/hash、映射及到期；确认 CAS，同事务内容＋回执，重复确认复用。当前 preview 仅 token/conflicts，映射展示留 T18 请求 T01 补形状。keep/replace/copy 都不能继承旧权限/运行身份；缺外部来源不可召回，重授前零模型/维护作业。不能拼接独立提交或会自动运行的创建命令作为原子导入。

**反复活边界。** Spec §10/NFR-001 要求受管备份参与清除；055 忘却水位/来源墓碑覆盖迟到导入/恢复。建议废止受影响恢复集并删除其正文，失败保持受限。恢复核对当前目录/清除水位，不能信任旧快照 epoch/Grant/lease；缺可信水位不自动恢复运行，按当前代数与 T16 核查/用户恢复。hash 不证明当前权限。用户导出、已交付 Vault 文件不自动删；再次导入走新身份/重授。外部完整磁盘回滚不在产品可保证的反回滚边界内。

## 产物与验证

只写本目录。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。来源时点/SHA/读段见 [observations.json](observations.json)，摘录见 [read-excerpts.log](read-excerpts.log)；许可/活动与官方出处分别见 [固定来源](fixed-reference-sources.json)、[官方来源](official-sources.json)。未重跑历史探针。

所有下列故障用例均 **未运行**，是未来实施验收输入：

| 故障窗口 | 必须观察的结果 | 状态 |
| --- | --- | --- |
| WAL 有已提交数据，旧库含待审批/其他 CP | DB 内容及所有已引用 Blob 属同一恢复集 | 未运行 |
| DB 引用缺失/损坏/元数据不符 CP | 阻止迁移，无“备份成功”标记 | 未运行 |
| Step 未 done、取消、Close 失败 | 输出不准入，连接/文件全部结束 | 未运行 |
| BUSY/LOCKED、磁盘满、Sync 失败 | 有界失败，保留原库与原因 | 未运行 |
| Blob 复制/manifest 发布各点崩溃 | 未完整发布不能恢复，原 Blob 不被提前 GC | 未运行 |
| 迁移 SQL 或迁移后关系/Blob 校验失败 | 不启用执行器，可定位旧恢复集 | 未运行 |
| 坏库、非新空库、更新 schema、别名锁竞争 | 不转空库，不启动第二写者 | 未运行 |
| 替库期间新进程/旧 WAL/新 inode 竞争 | 全程唯一写者，无混代 DB/Blob/WAL | 未运行 |
| 未知包字段/版本、超限、路径逃逸、重复 ID | 预览前拒绝，目标库无内容变化 | 未运行 |
| 预览后改包/改修订/改 epoch、重复确认、中途失败 | CAS 拒绝或同一回执；无部分导入 | 未运行 |
| 来源清除后恢复旧备份、旧命令/lease/迟到作业 | 清除持续有效，零自动恢复/模型请求 | 未运行 |
| 手选内容导入含历史审批/权限/队列或缺失来源 | 新身份、权限重授、缺来源不可召回 | 未运行 |

命令/已恢复定位失误见 [command-observations.json](command-observations.json)，来源复核见 [source-recheck.json](source-recheck.json)。未运行产品/数据库/测试或真实外部服务，未安装/提交/委派。全部命令已返回，无遗留进程。实际结构校验见 [return.json](return.json)，产物摘要见 [artifact-manifest.json](artifact-manifest.json)；均不代表产品验收。

## 问题与下一步

Root 已接纳窄方案，后续原 T01/T06 owner 实施。本研究停止写入。完整目录/清除水位、恢复替库、portable 文件接收与映射预览留 T17–T19；无故障自动化或目标 OS 通过证据，不将研究当产品验收。
