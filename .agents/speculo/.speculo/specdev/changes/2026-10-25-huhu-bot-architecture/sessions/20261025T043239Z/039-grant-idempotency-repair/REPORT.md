# 039 Grant 重试意图摘要修复报告

Session: 20261025T043239Z
Task: 039-grant-idempotency-repair
Status: completed

## 聚焦交接

交回 035 STD-03 / SPEC-03 的最小修复候选。`Grants.Create` 与 `Grants.Revoke` 在计算摘要前复制强类型命令，仅把副本的 `CommandID` 置空；原命令元数据和业务参数原样交给 Repository。相同 key、业务输入和 epoch 的新尝试恢复原 Grant / Receipt；原 Receipt 的 CommandID 保留首次尝试身份。expectedRevision、Profile、epoch、接收方及其余业务字段仍参与摘要或原有前置验证，未放宽 CAS。

本轮唯一源码/测试写入为 `native/huhubot/internal/application/access/grants/service.go` 和 `native/huhubot/tests/contract/access/access_test.go`。没有新增 import、依赖、公共接口、迁移或生成物，没有修改 commands、SQL、API、凭证、锁文件、正式状态、他人报告或 035 原探针。当前沿用既有 dev / SpecDev I 规则与 Map10 / Goal9 / T05；执行身份为 native `/root/credential_provider`，未再委派、提交或发布。

两文件已停写，所有本轮命令与 probe 均结束并 Wait；最终摘要见 [final-source-sha.json](logs/final-source-sha.json)，清理及未变输入核对见 [08-freeze-cleanup.json](logs/08-freeze-cleanup.json)。此候选仍待 Root 组合冻结及未参与实现者复审；不把本报告当作正式 Ticket 接纳或双轴 pass。共享 Go 接缝本轮未改，038 的独立 TS 修复不属于本写集，联合输入以 Root 随后固定的版本为准。

## 产物与验证

先完整回读 039 TASK、035 REPORT 两轴及 raw-probes 的原 Facade/SQLite 反例源码，复用原测试入口，没有从内部 digest 单测替代实际调用链。自有隔离副本位于 `/tmp/huhu-grant-idempotency-039/module`；从 `/tmp/huhu-chat-review/module` 复制，未改原目录。原 probe 的输入、原 ID 正常对照和 SQLite 事实保留，绿色回放仅替换自有副本的 service 与两个缺陷断言，接受断言要求恢复原 Grant ID 和完整原 Receipt。原探针文本、接受文本与断言差异分别保存在 [original-review-probe.go.txt](logs/original-review-probe.go.txt)、[acceptance-review-probe.go.txt](logs/acceptance-review-probe.go.txt)、[probe-assertions.diff](logs/probe-assertions.diff)。

永久回归 `TestGrantRetriesRecoverOriginalResultsAcrossAttemptIDs` 经真实公共 Facade → application service → SQLite，包含：

- Create / Revoke 原 commandId 重放对照与只改 commandId 的重试，原 Grant / Receipt 一致。
- workspace、scope、resource、recipient endpoint、operations、session、task、expiry、expectedRevision 真正差异仍为 `IDEMPOTENCY_INPUT_MISMATCH`；Revoke 换资源/expectedRevision 同样冲突。
- 新 key 使用已失效 revision 仍为 `REVISION_CONFLICT`；错误 Profile 拒绝；隔离数据库实际推进 command_epoch 后，原/新 commandId 的旧 epoch 重放均为 `COMMAND_EPOCH_CONFLICT`。
- 撤销后的旧 Create 原/新 commandId 重放均返回同一 revoked / revision 2 Grant，不恢复 active。
- SQL 对照 Grant 总数、Receipt 总数、Grant revision/state、Profile revision 和 Grant clock，证明成功重放与所有负例没有新增持久写入。已有八并发同 key / 两并发撤销 CAS 和 principal 隔离测试原样保留。

实际命令与结果如下；Go 命令工作目录除注明副本外均为 `native/huhubot`，使用 `GOTOOLCHAIN=go1.26.10`、`-mod=readonly`。每份日志保存完整命令及实际退出码。

| 观察 | 命令 | 结果 / 日志 |
|---|---|---|
| 原缺陷复现 | 副本 `CGO_ENABLED=0 go test -mod=readonly -v ./tests/contract/chat -run '^TestIndependentReviewGrantAttemptIdentity$' -count=1` | exit 0，原 probe 断言缺陷：Create / Revoke 换 ID 均观察到冲突；这是红灯事实，非接受通过。[01](logs/01-original-probe-red-observation.log) |
| 永久回归红灯 | `CGO_ENABLED=0 go test -mod=readonly -v ./tests/contract/access -run '^TestGrantRetriesRecoverOriginalResultsAcrossAttemptIDs$' -count=1` | **Go exit 1**，仅三个换尝试 ID 的恢复断言失败，邻近负例通过。[02](logs/02-facade-regression-red.log) |
| 同永久回归转绿 | 上条相同命令 | exit 0。[03](logs/03-facade-regression-green.log) |
| 035 同输入接受回放 | 副本第一条相同命令，改接受断言 | exit 0，两个换 ID 返回 nil、原结果一致，仍一 Grant 撤销一次及一 create / 一 revoke receipt。[04](logs/04-original-input-acceptance-green.log) |
| 完整 access | `CGO_ENABLED=0 go test -mod=readonly -v ./tests/contract/access -count=1` | exit 0，1.425s。[05](logs/05-access-full.log) |
| 并发检查 | `CGO_ENABLED=1 go test -mod=readonly -race ./tests/contract/access -count=1` | exit 0，5.176s。[06](logs/06-access-race.log) |
| 静态检查 | `CGO_ENABLED=0 go vet -mod=readonly ./internal/application/access/... ./tests/contract/access` | exit 0。[07](logs/07-access-vet.log) |
| 格式/范围核对 | `git diff --check -- <本轮两文件>`、`gofmt -l <本轮两文件>`、对新增 diff 行补充空白检查 | exit 0 / 无待格式化，写集及输入 SHA 核对通过。[08](logs/08-freeze-cleanup.json) |

完整 access 包也运行现有真实生产 bootstrap/stdio ↔ TS HapConnection / HostReadService 受控外部 HostSources、fake Engine 联调；其自身记录两个进程 Wait。它不是真实 Obsidian、Vault、模型或产品 CLI 现场验收，本轮也未新建这些活动，未触碰 OS keyring 或运行 D-Bus 探针。未重复全仓、schema、构建和凭证检查，因为此次仅改变强类型命令摘要输入；Root 最终联合验证仍保留。

固定输入/产物 SHA256：

| 文件 / 输入 | SHA256 |
|---|---|
| 035 原审查输入 | `2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d` |
| 039 TASK | `176e865e4d6fb05f9a28d3978f19eca7ba576d45046456be13c975397e32f972` |
| 035 REPORT（只读） | `3f132d0d2ec4467a6a8e9ba4bce7c8235485115e4f74245ae456160bcb56e16a` |
| 035 raw-probes.log（只读） | `8063a7ea630374080aba6e395cc0f90bc1ff2b67112c13f94dcd7bb9147df627` |
| 原独立 review_test.go（只读） | `859b60877c4aa8d2bdd228a80f8f1cf0aceebc69a05fd1d99a9453ff87dcea51` |
| service.go 修复前 | `0defb1bb0c7310f1ffa3f8fd0aac67c25e0167b94533073420fd6b0004c3e8d7` |
| service.go 最终 | `20db193c85270182f7d12ac0c11bb9521df375d4e6198c14560d43c609514faa` |
| access_test.go 修复前 | `0bd4743d986e1fa262096a092b6a2ae6fc39f99e87638d8f9dc1e1c6c19b5a5e` |
| access_test.go 最终 | `b66e55eebb44fc5a549d8ea4b1abe9ec48c19691ff2338cea3775ae39528b9c7` |

输入的 API、commands、SQL、go.mod/sum 与旧报告/原探针 SHA 在结束时均与开始相同；详见 [input-sha.json](logs/input-sha.json)。生产及测试实际差异在 [repair.diff](logs/repair.diff) / [test.diff](logs/test.diff)。无外部代码复制改编或新增许可证来源。

## 问题与下一步

本轮无未解决的 039 实现失败。035 原失败日志保留，不因修复改写；真实 Vault / OS / 模型现场仍由用户后验。源码和测试已冻结，报告后的动作仅 return 结构校验及向 Root 真实 MESSAGE / FINAL 交回。return 结果与最终报告摘要保存在本目录 logs，由 Root 回读后决定共同冻结、独立复审和接纳。
