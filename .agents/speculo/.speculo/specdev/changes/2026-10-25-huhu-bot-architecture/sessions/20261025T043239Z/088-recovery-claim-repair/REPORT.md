# 088 恢复领取修复

Session: 20261025T043239Z
Task: 088-recovery-claim-repair
Status: completed

本次派遣实现与必要检查交回；Root 独立 E2E/复审及正式代码门仍待接纳。

## 聚焦交接

本轮按原 T03/T06 owner 修复 F-083-01。采用进程内公平 keyset 游标：每次领取事务最多检查 128 条 accepted/recovering，按 `created_at,run_id` 稳定顺序前进；短页耗尽后回绕。游标仅在真实 Commit 成功后发布，串行 Claim 等待可由 context 取消。恢复、取消、资格、slot 和唯一 claim 仍在同一事务检查。

没有采用一次事务内扫描所有页，避免将任意规模闭门队列变成长事务。没有将 recovery guard 复制成简化 SQL 预过滤；原 guard 同时涵盖树/runtime/停止事实，仍是最终权威。没有提高 128 常量或放宽执行限额。

原 T06 Ready 的唯一消费者改为同一事务逐个检查有界候选；第一条候选的 root slot 满时继续检查其他候选，continuation 只在真实领取时消费。内部签名补充来自 [Root 精确维护说明](../../../evidence/T-16-logs/claim-scan-supplement-map21.md)。waiting-parent 同类路径经 089 在原固定源码真实确认，随后由原 T12 owner 的 090 实施；[父扫描联合补充](../../../evidence/T-16-logs/parent-scan-supplement-map21.md) 精确开放 T03 内部 ParentCursor/ParentReady 与唯一接口。我只维护外层游标/消费，090 独占 usage 两文件；没有平行选择器。

## 产物与验证

| 原始记录 | 实际结果 |
|---|---|
| [00 输入](logs/00-input.json) | 377 来源与已接纳 080 相同，tree `9ef3b363489583b9b1a5332a02e5041dba06b9bd3972b23ce3ad8bb7f96dd718` |
| [01 主 Claim 旧生产红](logs/01-closed-pages-red.log)、[退出](logs/01-closed-pages-red-result.json) | exit1/Wait；4 树 CAS 恢复对照绿，6 树后方原 32 children 零 Engine，单独取消前方无关树后原孩子完成 |
| [02 审批 slot 旧生产红](logs/02-ready-slot-red.log)、[退出](logs/02-ready-slot-red-result.json) | exit1/Wait；第一 root 被真实 producer 占 slot，第二 root 的原 CP 饥饿；只释放前 root 后两原 CP 均消费一次 |
| [03 两公开路径修复绿](logs/03-fair-claims-green.log)、[退出](logs/03-fair-claims-green-result.json) | exit0/Wait，chat 7.446s、approval 0.142s、总 9.804s |

6 树永久夹具用显式 `ProfileChildren=5` 和 5 个真实 producer 固定第 6 树尚未领取，故修复后前提不依赖旧扫描缺陷。4 树保持真实用户 CAS 恢复，6 树未取消/恢复前五树而使目标原 32 children 各执行一次；前五树仍 blocked/155 accepted，无新增 Run。审批对照实际读取原 CP，拒绝决策保持 denied/APPROVAL_REJECTED，零 Host 写。所有这些 Core Close/Done、producer 已结束；本轮不运行真实模型、Obsidian 或目标 OS。

[04 真实停止交错红](logs/04-parent-stop-red.log) / [退出](logs/04-parent-stop-red-result.json)：公开 A→B→C 和实际 finalization 形成 B 待汇合；包装实际策略的 ReadyParent 在同事务已选 B、占 slot、消费 parent_results 后，调用同实例 StopAdmission。T03 二次实际 Claim 返回 false/nil，旧路径仍提交，B 留 waiting_children/result claimed/slot 残留。此为真实停止事实的窄故障 seam，不是完整 Core.Close 的并发时序证明，也不是伪造 false 或 SQL 改 Run 状态。

T03 保留最后 Claim 门，将该拒绝转成 RUN_CLAIM_CHANGED 并回滚整个事务。[05 同输入绿](logs/05-transaction-boundaries-green.log) / [退出](logs/05-transaction-boundaries-green-result.json) exit0/Wait1.856s；原 B 结果与 slot 回滚，新策略实例可以唯一汇合原 B 及根。另验证真实 Commit FK 失败和取消串行 Claim 等待，未提前发布游标，重试仍领取原首 Run、第二 Run 各一次。

[06 定向 race 输入](logs/06-before-target-race.json) 为 380 来源、相对初始仅 3 production + 3 新 test。[07 首轮 race](logs/07-target-race.log) / [退出](logs/07-target-race-result.json) 实际 exit1/Wait28.286s：4/6 树均在 setup 的第一个父执行 32 次真实 delegate 尚未提交 waiting_children 时，被夹具 6 秒 helper 截止；未进入后方目标扫描断言。Commit/取消等待、真实停止回滚及审批 CP 同轮 race 通过。原失败保留，不以该输出声称扫描 race 已通过。

Root 接纳的 race 准备修正只影响新 chat 夹具：父 Engine 完成 32 次真实 delegate 后发 rootBuilt 屏障；30 秒仅防构造挂起，随后仍用原 6 秒等提交，目标公平性观察仍 6 秒。旧 07 不改。另在未执行的静态回读中，Root 指出新父游标可能合法先空页回卷再领取较早根；新 Stop 测试改为有界真实 Claim 循环，保持同 A/结果/唯一性断言，未将其列为产品红。

[10 自有冻结](logs/10-own-source-freeze-r2.json)：7 文件 tree `eef861e930a0a6d2277e54a5521a472bbd8b79dde7280dd895a6fe70c4befab3`。相对初始仅 4 production（execution/executor.go、store.go、children.go、effects/continuations.go）及 3 新测试。正式源补充链接与 TASK 原摘要保持，不改公共 API/schema、旧 SQL、依赖或正式状态。

[11 联合输入](logs/11-joint-before-checks.json)：381 文件 tree `23f19c050ee6e58ee9295c77a84b97d939304d0adae45bcd63e2a6c7b6ca88fb`，逐项核对 088 七文件和 090 三文件一致。相对初始 377 来源，仅 6 production + 4 新 test，共 10 路径；包含原支撑规则、全部 native、合同及必要 TS 消费者。

[12 七包 normal](logs/12-joint-normal.log) / [退出与漂移](logs/12-joint-normal-result.json) actual exit0/Wait42.818s，381 sourceDrift=[]：chat9.917s、approval5.919s、recovery5.398s、delegation6.066s、collaboration-policy4.019s、groups4.844s、effect-reconcile1.617s。090 的真实 129th 父/回卷 3.55s、闭门旧父与新父控制0.10s 同轮通过。其[旧固定副本永久主例红](../090-recovery-parent-repair/logs/03-old-permanent-red.log)由 090 实际执行，本作者不冒称独立运行。

[13 五包 race](logs/13-joint-race.log) / [退出与漂移](logs/13-joint-race-result.json) actual exit1/Wait368.610s，381 sourceDrift=[]。approval53.277s、recovery24.466s、delegation92.696s 包级通过。chat 两个新公平 subcase 仍在构造阶段第 3 棵 root（zero-based n=2）的 32 次真实公开 delegate 未在30秒内完成（主 case108.64s）；本作者最初向 Root 写“第2root”，已按实际 n 纠正。policy 新129父 case 在目标 leaf 通道30秒未到时失败（48.42s），未达到129 parents前提；小恢复门1.48s通过。没有据此归因 race 成本或产品领取缺陷，vet/架构后续停止。

[14 外部副本](logs/14-diagnostic-copy.json) 按11共同381逐SHA精确复制；[15 实际overlay](logs/15-executed-overlay.json) 仅加每次delegate起止、deadline后真实状态及最多64条慢Claim计时。[16 单4树诊断](logs/16-setup-diagnostic-race.log) / [退出](logs/16-setup-diagnostic-race-result.json) actual exit1/Wait63.347s，共享sourceDrift=[]，未改30秒/目标6秒。

[17 实际观测](logs/17-diagnostic-observations.json)：root0 32次实际admission合6.215s，root1 32次合17.433s；zero-based root2在30秒前已提交29/32，逐次context/error仍nil。截止时parent running/reason空、29children/28accepted/rootSlot1，Profile slots3/accepted90；仅测试清理取消后下一次call才返回context canceled。64条慢Claim样本63条无Work，callback合10.077s、均值157ms/max254ms；样本有上限，不是完整累计成本或单变量充分因果证明。没有把这个原30秒失败改写成通过，暂不加fixture/生产优化。

[18 单变量控制准备](logs/18-control-prepared.json)、[19 实际控制](logs/19-setup-scan-control-race.log) / [退出](logs/19-setup-scan-control-race-result.json) actual exit1/Wait38.040s、381漂移为空。[20 定量观测](logs/20-control-observations.json)：仅在四个原 root 均真实进入后，构造32个孩子时暂缓外部副本的Claim扫描，退出root构造即恢复；未改共享生产或SQL状态。root0未暂停合5.769s，root1–3暂停后分别1.380/1.267/1.837s；真实构造132 Run/124 accepted/4 held slots/4 waiting parents已成立。随后原目标6秒仍失败，仅5个原孩子进入Engine，不冒称这5个已持久成功或最终目标通过。该结果支持构造竞争的局部成本，不能证明单一暂停即可修复整个测试。

Root按[夹具可靠性补充](../../../evidence/T-16-logs/race-queue-fixture-supplement-map21.md)选用普通模式真实公开构造的完整Profile作为race准备输入，不改生产两分钟上下文。普通模式仍完整构造并执行最终消费；race只替换准备来源，仍实际重开、Recover、资格/CAS、领取与唯一性、其它闭门树及pin/slot。目标观测改为仅原eligible ID首次持久succeeded刷新6秒停滞钟，另有90秒绝对上界；累计集合不代替当前完整成功行及父succeeded。旧零进度反例须以该新语义重新确认。

[22 可审代码](logs/22-fixture-code-review.patch) / [摘要](logs/22-fixture-code-review.json)为11个自有路径（原生产4个均未漂移），尚未执行Go生成或编译。预期只新增4/6树各archive/manifest四项资产；来源清单含实际内嵌SQL，排除自产输出。加载严格校验archive/逐文件摘要与原ID、阶段、限制，不要求未来代码等于历史来源。发布回调最后执行，完整case及所有Core/DB清理通过才写资产。

## 最终固定输入与实际检查

[23 生成前385输入](logs/23-before-generation.json) tree `bb0fd4c181594615313a4a832b9ecca8601bd41c7f05608cb9e42c499528c1aa`，已核11自有来源与090最终三文件。[24 普通显式生成](logs/24-fixture-normal-generation.log) / [退出与预期写入](logs/24-fixture-normal-generation-result.json) actual exit0/Wait8.437s，case7.395s（4树2.91s、6树4.48s）；完整公开构造、Close/Done、真实恢复/CAS和全部最终断言通过后才发布四份预期资产。385原输入drift=[]，四项资产作为预期生成结果另记，未混称漂移。

[25 最终联合389输入](logs/25-joint-after-generation.json) tree `df79ef6ecb2df7d8973d05cc7242d52de6d5be0fbb4ed5f9050e7139987a4290`。4树完整Profile含132 Run，6树198 Run，schema9；archive分别134844/198203bytes，DB及当时实际存在的WAL/SHM、空checkpoints目录全部保留。172项历史生成来源含go:embed SQL，来源摘要 `48fa537c03bde29eae4356ebae447ed13ab78146b7aacb92d377c8d662894fc4`。`manifest.json`逐项绑定Profile/epoch、原ID/真实状态、持久限制和文件SHA；合法历史来源不强制与以后代码字节相同。

[26 旧083独立副本输入](logs/26-old-progress-input.json)，280原文件逐SHA保持；仅加入相同新chat测试和必要helper，未复制新生产。[27 新语义旧源红](logs/27-old-progress-red.log) / [退出](logs/27-old-progress-red-result.json) actual exit1/Wait15.022s，显式unset生成变量。真实公开6树构造达到原前提，六秒新原success停滞钟报告completed=0/32、原父waiting_children/Engine0；只公开取消一棵无关front后同一批32个原孩子全部当前succeeded、原父成功、各消费一次且全部Core Done。此为预期有效红，不把它列成未达前提或当前候选失败。原083、外部副本及共享389全部drift=[]。

[28 当前相同4/6用例race](logs/28-fixture-target-race.log) / [退出](logs/28-fixture-target-race-result.json) actual exit0/Wait84.838s，4树43.38s、6树38.82s（包83.270s）；生成变量显式unset，真实复制并验证普通模式完整输入，随后全部Recover/Cancel/CAS/Claim/原31与32个孩子持久终结、原父成功、其它闭门树、唯一执行、pin/slot及Core Done断言实际通过。race阶段没有执行高密度公开构造，不冒称该准备阶段在race下通过。389 sourceDrift=[]，没有生成写入。

[29 全module vet](logs/29-final-vet.log) / [结果](logs/29-final-vet-result.json)：`GOTOOLCHAIN=go1.26.10 CGO_ENABLED=1 go vet -mod=readonly ./...` actual0/Wait0.529s。[30 Go架构](logs/30-final-go-architecture.log) / [结果](logs/30-final-go-architecture-result.json)：`node scripts/verify-huhu-bot-architecture.mjs` actual0/Wait0.075s。两条均显式unset生成变量，389无漂移。

最终[31自有冻结](logs/31-own-final-freeze.json)共15项，tree `49762a62f9524629cbb78388780e34cc841a4ae7ca6558bfdeeb78b3508c0185`：生产4文件、原新测试3项、夹具helper/两build-tag/README4项和四份夹具资产；生产保持10原SHA。公共API/schema/SQL迁移/TS/依赖/产品产物均未修改。090原T12独占的两生产与一个测试已正式交回，实际相同接口消费者包含在共同389清单；不将其写成自己的写集。

## 问题与下一步

本次最终结果是组合矩阵，历史07/13两轮race均真实exit1而非整轮绿：12七包normal生产已固定后全部通过；24只重跑唯一变更的chat4/6构造/最终目标，090的两例normal按其正式日志14独立通过。13中approval/recovery/delegation三个包race真实通过，本次测试准备变更不改变其生产或用例；chat其它新事务回归在07/13已通过，28补完整4/6目标。090的原129父与恢复闭门两例已在其最终日志15实际race通过（Wait73.669s），本作者没有重复运行或冒称执行。其准备预算为单90秒，所有原5秒目标及257/129/128、slot/唯一/回卷断言保留。详细输入/复用边界随32最终交接回执列明。

原生产扫描、slot、事务停止红灯及后续准备失败、外部单变量诊断均只读保留；没有用夹具路线将其覆盖成绿。所有本作者实际命令、Core和受控producer已Wait/Close/Done，当前停止全部产品/测试writer及Go/Node检查。独立源副本与原始诊断证据保留供Root回读，临时运行Profile由测试清理；固定夹具是明确授权的测试输入。

本轮不做真实Provider/Obsidian/目标OS验收，不运行Root独立E2E，不开启T08。TS/schema/build等输入未改，按Root实际影响复用原证据而非重跑；没有声称在当前新字节完整重跑所有历史包/平台。Root的固定输入E2E和独立复审/正式门仍待处理；`completed`仅表示088派遣产物和必要检查交付，不宣布T16/G1/Goal完成。080/081/082/086/090历史报告与正式状态均未改。

结构return首轮因本报告身份字段带Markdown反引号得到REPORT identity mismatch（实际exit126/Wait），见[33原回执](logs/33-return-first-result.json)；只修报告字段为结构要求的原值，未改产品/测试/验证来源，第二轮[34回执](logs/34-return-final.log)实际exit126/Wait，提示最终重写时缺少必需的问题与下一步标题；恢复该标题后重做[35最终return](logs/35-return-final.log)，不改产品。
