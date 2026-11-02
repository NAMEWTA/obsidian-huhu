---
schema_version: 2
session: "20261025T043239Z"
task: "091-recovery-review-r2"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 取消与恢复完整候选的独立双轴审查

## Goal
由未参与本范围实现的独立 reviewer 对 T16 及原 T01/T03/T04/T06/T11/T12 及T13测试必要维护分别判断标准轴、规范轴。沿用户既有 gpt-6-astra/high 偏好，不再委派，不修生产或永久测试。Root 已接纳实际作者交接并完成固定输入代码验收；本 TASK 经 dispatch 校验后由 Root 原生派遣。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map21/Goal20，28票55AC。AGENTS 发现、dev/testing、T16及维护票、SpecDev I 最终审查与独立 code-review/risk/error/test-reliability。LOG051及用户最新确认：真实模型、Obsidian、目标OS验收由用户进行，不索凭证，不冒称已验证。

完整读080/081/082/086/088/090最终REPORT与085/089诊断、原083失败审查、Root真实接收回执、新固定输入E2E-r3以及原build/lint逐SHA复用记录和原始失败；固定输入为 evidence/T-16.md#review-input-recovery-r2，实际摘要由Root派遣附上。当前行为窗口是 evidence/T-16-logs/recovery-window-map20.md，精确测试补充为evidence/T-16-logs/map21-fixture-maintenance.md。079已接受群候选是旧基线，只在逐SHA和影响闭包一致时复用，不将旧门代替T16新增行为。

## Workspace and Scope
仅写自己的REPORT/log、外部固定副本中的独立探针。生产、永久测试、正式Evidence/Map/Goal、他人报告均只读；不提交、推送、发布或归档。全量实际调用路径都在审查范围，文件owner不限制找缺陷。实际规范/代码/模式/HEAD/index有漂移立即报Root；重检查由Root唯一窗口安排，不抢跑并行构建。所有实际子进程与producer必须Wait，保留失败，不运行真实keyring/模型账户或用户Vault。

## Acceptance
先提出可证伪失败假设，再从公开TS/HAP/Facade、同Executor、SQLite和真实执行末门追踪。两轴各自pass或request-changes，不限制finding数量；实测、推断、未验证分开，给路径、触发、影响、最小修复和验证条件。

核对取消只关闭指定真实树/子树，再通知同Executor；所有accepted/ready/children/question/approval claim、delegate、Attempt.Dispatch与物理Host写入均受同门约束，另一树正常。旧worker或Background context不能绕开取消代/关闭准入；真实已派发后的known/unknown结算仍可落账。

崩溃恢复严格区分未领取accepted、正常waiting审批、未消费子结果与问答、实际Resume中断、编排root和终态。ready只是资格，启动、query、子结果到达、重连都不自动调用模型。原Run/root/thread/config/budget/CP/decision/投递身份不变，新claim，不能Clone或重置账本、claimed父结果、已完成子结果。真实旧schema8在途fixture必须来自旧代码实际Resume/Dispatch后的kill，不能改SQL状态冒充；016完整DB+CP备份、旧列/行保留、DDL中途失败回滚和不可半升级均检查。

资格watermark绑定真正受影响树集合、修订、固定配置、完整成员tuple/来源/Grant/凭证、CP/阶段、审批/效果/尝试/投递/预算；事务外完整检查前后短Tx CAS，点击再检查。两次query不无故提升generation；旧CAS/旧代/并发不同key不能双释放，相同key先回原持久receipt，响应丢失仍可沿原命令查回。不能把event seq、Run.revision、claim、取消代与资格代混用。

只读CP检查经真正Blob Port完整读HUHUCP1 envelope及payload，hash/版本/config/tool/adapter/完整reader hold/Close；Inspector纯本机、零模型/工具。假claim、只查ref或读裸文件不能替代。缺CP、坏payload/长度/hash、版本/工具不兼容必须blocked。审批已completed但SaveResume失败窗口须恢复原已完成Decision且Host只写一次；未知效果必须先沿旧账本核查，不能重Invoke、kill即当无效果。owned无正文Effect查询/核查保留，正文预览仍当前授权。

旧SourceSnapshot的Host连接/lease/epoch是固定身份，真实重启出现新lease时应明确blocked且Read/Engine/Dispatch为0；当前没有获批旧capture到新lease的重绑协议，不能偷偷放宽。完整Group贡献者包括后来实际消费的零Source私有结果和temporary后代；remove/rejoin拒旧代、公开历史保留、未公开缓存失效。纯编排root无模型CP/pin/假A授权。

统一Stop先同步关闭进程准入，再落库/取消/真实drain。持久Stop写失败不能让晚Background Dispatch或新root逃逸；重试同Stop事实并保留Profile锁。超时期间实际producer、pin/slot、DB/锁仍保留；只有真实join后释放。CLI EOF/shutdown和managed close/exited/kill区分，真实关闭不等于只设置一个disposed。检查正常与失败清理都释放自有资源，无孤儿进程或未知效果丢失。

TS RecoveryClient直接消费唯一144方法形状/276样本合同；capability与Profile/epoch门、本次CAS/generation命令、双击同Promise、uncertain不换key、setClient原controller显式retry、dispose和迟到响应不恢复正文。已收到receipt不因重锚失败变未知。EventClient仅目标重新按当前权限读取，不混普通tail CAS或清兄弟公开历史。真实TS→Go证据与Peer单测分开，T20/T23未来组合仍未声称本票完成UI。

080两处真实红/绿、原整模块normal与r2两包normal的旧测试能力/版本断言失败、081夹具失败、082ignored-test lint误调用均须如实分类；不因构建/样本数量通过就认证语义。仅按影响选择独立反例，不重复无关重矩阵，不降低旧100/800来源250ms、270delta等边界。现存全局计划/UI/doc锚点诊断单独保留，不称全局通过。

## Return
REPORT首h2前Session/Task/Status准确。standards-output与specification-output独立锚点各含Reviewer/Axis/Result/Input-SHA256/Observed。记录自有探针命令/exit/Wait、正常与反向控制、限制与最终输入复核。亲自return0、所有进程结束且停写后实际MESSAGE+FINAL；Root全读后才维护正式状态。不宣布剩余票或Goal完成。


原events首轮3s挂起没有Run/SQL状态捕获；081单变量外部overlay证明同类独立fixture writer在MarkRunning读后写前会出现database is locked并留preparing，只有受控实验因果已证实，原事故同源仍是推断。最小永久修正只让active executor fixture先按原3s等终结，再附原synthetic delta；paused路径和所有270/seq274/撤权断言保持。foundation失败分支Start后立即注册Close/cancel/Wait once，旧首次normal仅顶层Wait可证，不将后来无进程倒推历史子进程已Wait。


联合11包race的groups/events真实失败由085外部单变量诊断：合法晚读已公开History触发旧fixture Derived恰好1谓词主动失败；第二case是487 waitTerminal内timerCtx3s到期而270事件持续推进，约0.2s后自然seq274。原report行号误判已纠正、原日志保持。等价guard合一外部候选仍红，没有进入生产。086精确测试修复须核对严格真实provenance、两种合法历史交错及原安全断言；事件等待处置需依据实际normal/race/观察竞争与目标行为，3s helper兜底不冒称Spec吞吐性能门，800/250ms产品门继续原样。不能用无变化择绿或盲目抬超时代替原因判断。


事件测试lane处置的实际依据与原owner追加窗口：evidence/T-16-logs/events-lane-supplement-map21.md（be4500df1334224af3f2a008ad108c96da8c8c1ed50a653e07b8898e454dc399）。086三条外部定量对照已由Root完整回读；普通270emit299ms，race+5ms观测3262ms/终态3421ms，race等待真实emit后才GetRun则2050ms/终态2170ms，故障为插桩和单连接观测竞争而非永久卡死。仅该case270正确性等待6秒，其它helper3秒与独立800/250ms产品门保持。审查需核对该选择依据与原业务断言承接，不误认外部诊断10秒等于原测试3秒通过，或把helper期限当产品吞吐合同。


Python 协议验证器维护按 evidence/T-16-logs/python-validator-supplement-map21.md：原全局 Python 缺包和随后通用 sample() 构造非法 none+range 正向样本的失败分开保留。080 仅在原 contracts 写集中改 validate.py，采用唯一生成器规范正向值并检查144形状精确覆盖/无重复；25 decimal负例和276共享正反例仍由独立Python validator执行。核对没有改schema或固定样本迎合检查，以最终实际日志为准；Go测试/vet/生成按未变输入复用，不将脚本样本错误冒称产品故障。


Root独立探针r1的失败亦须回读 evidence/T-16-logs/lead-probe-r1-failure-classification.md 与两个原始日志：错误类别/原因混用，以及把持久interrupted配置pin误当应立即清零。仅外部overlaySQL读回确认known charge5=1、pin1、interrupted1、slot0；r2精确断言公开Fault并保持interrupted配置，随后用公开CAS Cancel验证真正终态释放pin且账本不变。生产与永久测试无变化，不把Root探针修正冒称产品修复；最终实际E2E回执由冻结输入派遣指定。


## 候选2实际新增审查重点

083原F-083-01为实际P1：固定128项后过滤造成合法后部accepted/recovering饥饿。088另有真实审批continuation前项slot占满阻塞其他树与父结果已消费后的Stop拒绝仍提交两项红绿；089以公开128根产生129等待父并单独取消无关前根证明同类父候选饥饿，090为原T12修复。候选2审查完整调用闭包并验证这些修复，不能仅查看修复diff或用原Root绿证据覆盖083失败。原报告与失败日志保持。

核对三种扫描的有限稳定keyset/跨Claim进度/回卷，提交失败和取消不推进游标，不缓存资格；每候选仍同Tx当前权限/恢复/取消/slot和claim。父结果/来源派生消费与slot必须和真实Work原子，最后Claim拒绝不能commit无Work。内部ParentCursor/ParentReady只由execution持调度状态，usage是唯一消费实现，控制接口与真正调用者一致。并发Claim串行等待必须可取消，未ready/闭门/暂满前项不能永远挡住合法后项，旧进程/旧cursor不重置业务事实。

088早期07 race在32次真实delegate构造未完成时触及fixture6秒等待；加入实际rootBuilt屏障后，13联合race仍在第三个root（日志n=2，零基）的30秒构造阶段失败。090父例同轮也在真实129父准备前失败。13实际approval/recovery/delegation三个包通过，chat与collaboration-policy未通过；没有DATA RACE输出并不等于检查通过。随后088外部观测16证实第三root在30秒内完成29/32次真实委派且持续推进，090外部08/09证实80个完整审批CP已形成且8个实际合法槽继续推进；这些观测不单独证明所有耗时都来自Claim扫描。后续控制、最小测试处置及实际最终normal/race结果须以作者最终REPORT及Root r3原始日志为准；不得用准备超时冒充产品回归红或删掉未通过记录。

最终测试分层按 evidence/T-16-logs/race-queue-fixture-supplement-map21.md：090仅准备共享90秒总预算，实际normal/race通过且原5秒目标不变；088需要保留normal完整公开构造，并以相同公开路径生成、带原ID/状态/文件SHA的不可变Profile用于race恢复消费。生产两分钟Engine期限不改，没有pause seam/SQL业务状态注入/skip。审查fixture生成入口、关闭后捕获、每次独立复制与完整恢复/CAS/原31或32孩子唯一终态；6秒停滞只能由原ID新增持久成功刷新，另有90秒总上限，旧零进度反例须仍真红。当前实际结果仅以最终088报告和固定输入回执认定，不把外部19中5个Engine入口当最终成功。Root独立正常模式重建大队列，race覆盖其余不同恢复/停止/审批边界；已经收齐作者大队列race通过后不机械重跑同样构造。

两轴Reviewer必须为`native:/root/recovery_review`，Input-SHA256使用本次真实冻结输入。原083曾仅更正该namespace格式，旧/新SHA历史保持；本次不要使用无namespace身份。build/lint因1875输入与产物未变复用，Go-only修复没有伪称重新跑过。


## 本次实际固定验证

088最终REPORT SHA256 `92f44a578c1b45cc2f6beafe635a515b6a7193f06ff35b067637ffbf7402218c`；090最终REPORT SHA256 `9c3b4fee48aff677dfb5bc7b5a2820b3ae9d8e1179d23221c7e3ec26a31a1052`，均已实际MESSAGE/FINAL、Root全文回读、return0与源摘要核验，停止写入及检查。088最终4/6 normal生成0/8.437s、旧083新六秒停滞语义0-success预期红1/15.022s、当前相同目标race0/84.838s、全module vet0、Go架构0；15自有与389联合源无漂移。090最终两父例normal0/4.159s、race0/73.669s。历史失败仍保留，不将组合矩阵称作同一轮全绿。

Root实际r3快照 `/tmp/huhu-lead-recovery-r3-2x1i2chq`，2116输入摘要 `ec560efba0dd2c9149a5f4f6caeb11c5444b1a4f73b23047891d31451c950463`。普通独立完整4/6树+rank129父+旧四个恢复边界+审批slot通过0/21.950s；不同旧崩溃/损坏CP/drain/Stop/审批边界race通过0/19.503s。实际Runner build0/0.548s、TS bundle0/0.488s、生产TS/HAP/stdio恢复0/0.625s；10个wire行为成立，实际Model入口1/恢复请求2/真实Provider0，旧unknown7+新known2保留，最终3Run成功/唯一child投递/pin-slot0/完整性ok，全部Wait/no-force/sourceDrift[]。详情及所有原始日志见 `evidence/T-16-logs/lead-recovery-e2e-r3.json`。旧插件build/lint的1875个输入和main.js/styles.css摘要已逐项复核；`lead-plugin-reuse-recovery-r2.json`明确无重跑。

独立检查窗现已释放。先复核固定输入，再按风险选择反例；任何新失败保留全部原始输出并通知Root，不修改正式源。不重复已无失效的重型构造来择绿。
