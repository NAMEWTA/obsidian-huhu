---
schema_version: 2
session: "20261025T043239Z"
task: "163-global-memory-runtime"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-15
---

# 全局提案事务、独立能力与可信用户入口

## Goal

原T01 API owner native:/root/foundation_api_repair 接160后继并作为T15本域作者，实际实现015 proposal/用户确认原子事务、纯应用两能力包装和T01真实HAP/stdio/Core装配。与161原Memory、162原Events/Grants消费同一契约，不复制第二事实/授权/账本。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map42/Goal41。全部28票55AC、Agent Team和代码层总验收持续；真实Provider/Obsidian/目标OS用户后验，不索凭证/不提交推送发布归档。读Map→dev/testing/architecture→T15/T01与I实际并发/持久化/agent-experience分支，复用已读未变规则。

T14真实基线和159最终代码门已存T-15-logs/review-baseline-global-r1.json/.zip。160四源/27输入/24工件和原红/绿已Root回读、return0（160-lead-return.json）；160及158原工件冻结。采用160 contract.md准确纯API/adapter端口及Root两项范围处置：unknown AllowedTools既有配置兼容；普通和managed本机stdio都以明确owner能力进入，ManagedOwner不是授权。161/162是当前真实共同作者，可原生沟通精确接口。

新已确认消费者缺口：160 validMemoryProposal把pending一律要求Body，拒绝可信owner来源已撤销后只用目标元数据的delete新预览。161和Root均确认；在本163做最小delete Body=nil正控，create/update缺Body仍拒绝，严格ID/head/scope/hash/expiry保持。模型不可借此洗白，实际tool prepare仍完整来源。

## Workspace and Scope

T15可写internal/application/memory/global/**、domain/memory/global/**（只真实需要的纯规则）、adapters/outbound/sqlite/globalmemory/**、migrations/015-global-memory.sql、tests/contract/global-memory/**。均相对native/huhubot/。

T01精确维护：api/memory.go与global_memory_test.go上述delete shape；adapters/inbound/hap/memory.go、router.go及新增global_memory_test.go；inbound/stdio/server.go及新增global_memory_test.go；cmd/huhubot/main.go、bootstrap/core.go、migrations/embed.go；新增tests/contract/foundation/global_memory*.go与旧memory_runtime_test.go、groups_migration_test.go的实际schema版本预期（其余断言保持）。contracts/hap/v0.1/generate.mjs及该真实generator输出methods.json/schema.json/fixtures methods与golden、protocol/hap/methods_generated.go/schema_generated.json仅必要两个方法flag和合法新结果夹具；可运行独立generator，但先核其全部实际输出未超写集。src API和手写TS验证、Broker/common/三SDK、Memory/014、Events/Grants、锁文件和root build产物均只读。自己的163 REPORT/contract/logs/manifest与/tmp可写，不改旧TASK/REPORT或正式状态。

当前source-only。唯一允许起始检查为api+stdlib delete shape反例红/绿（先核闭包仍不含161/162写集），固定Go1.26.10 absolute/local/GOWORKoff/GOEXPERIMENT空/readonly/GOPROXYoff/CGO0。不运行其他Go/go list全模块/DB/CLI/race，组合检查等Root冻结。新代码可先完整写入，跨owner未装配显式列待验，不把编译或手工SQL当真实入口通过。必要额外路径先回Root。

## Acceptance

1. 两个不同具体应用wrapper：OwnerCommands仅owner GlobalMemoryAPI；ToolProposer仅api.GlobalMemoryToolProposer，Broker拿不到可type-assert Resolve的对象。普通hap.New未装owner，显式hap/stdio NewOwner参数只能由真实本机CLI composition给；JSON user/role/creator/ManagedOwner不能授权。常规与managedstdio均可由真实用户确认，模型/Leader入口无Resolve。
2. 015只存proposal固定snapshot/preview/完整实际源、actor/target/head/hash、expiry/state/CAS和原receipt关联，schema11连续注册，不改014旧迁移，不新增global事实/账本。复用161 Memory-owned WithGlobalTx一次Tx、原Grant fence和admission/cancel/Stop。propose插pending与receipt但不动014item catalog；多个pending可共用旧catalog，后续仅一个create approve按旧CAS成功。
3. ProposeOwner支持独立用户Sources空[]或真实选择，PrepareOwner重核事实；ProposeTool由真实Run/claim/pinnedConfig/AllowedTools和完整已消费源派生，模型不传sources。稳定工具幂等key=(profile,principal,runID,toolCallID)，输入hash含实际actor/config/源，不含跨恢复不稳定claim。重复同键同输入同结果，异输入明确冲突，模型无源不变用户独立提案。
4. Resolve同一Tx中先查同key/hash原receipt，再owner/epoch/pending revision/previewHash/expiry/原文/target/current资格；approve调用唯一Memory Apply事实，proposalCAS+receipt同提交。reject不写014；过期/冲突/原文变化/撤权无半效果或成功receipt，必须新预览。原Run正常结束/pin释放不能让合法pending永不可确认；保实际历史actor和current source/target规则。update保旧完整祖先但被替换head只audit，防自我立即失效。metadata-only owner delete不泄露撤销正文，不泛化吞错误。
5. 实现160准确ProposalReader及Events.GlobalProposalDeliveryReader；Get/List在传入原只读Tx按当前owner/state/expiry/source/head过滤，terminal/body-free stub/cursor有界且绑定实际水位；提案页水位不是014create CAS。physical reader同Tx逐subject取最短deadline，和162实际250ms gate组合。HAP memorySubjects覆盖直接proposal/MemoryObject/page内每个带Body项；pending元数据delete无敏感正文subject，输出仍验证。解除memory list/get global/proposal硬拒只在真正reader已安装下，owner方法仅owner port存在才advertise；两个global implemented flag与实际装配一致。
6. 持久测试通过真正Core/Application入口：未确认不可召回，create/update/delete approve一次，reject/expiry/target/source/preview竞争不写，重复命令与不同输入、并发approve/reject，statement/commit fault后014/015/receipt原子；模型伪造/普通Router无owner、普通与managedowner均可，模型propose→正常Run结束→用户确认。恢复/reopen pending与accepted不重复，私有维护不被确认流程阻塞。你可先写测试，实际Go运行等统一窗口；Root生产TS/物理CLI/SDK与三协议最终由Root验。
7. Core把两wrapper、Memory Reader、Events Reader接入原唯一Store/executor/生命周期；T06 Broker.SetGlobalProposer与T08工具消费者由后续原owner实现，先给精确接线需求、不自行越权。所有api/schema/request/result/物理边界无body leak，所有阶段实际源与日志可回读，未实施消费者清楚列出。

## Return

首h2前Session:20261025T043239Z、Task:163-global-memory-runtime、Status。先用原生消息给接口/运行装配checkpoint与具体消费者缺口；阶段source-only完成后报Root冻结范围/需要Go验证，非静默启动。最终REPORT/manifest包含源bytes/mode、红/绿、真实命令exit/Wait、原子状态回读及未验。亲自validate-dispatch return、全部进程Wait后停写；Root维护正式T15/Evidence/Map/Goal并完成物理E2E与独立双轴。不签整个G3或Goal。
