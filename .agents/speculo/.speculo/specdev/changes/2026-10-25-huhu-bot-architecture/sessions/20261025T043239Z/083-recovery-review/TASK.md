---
schema_version: 2
session: "20261025T043239Z"
task: "083-recovery-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 取消与恢复完整候选的独立双轴审查

## Goal
由未参与本范围实现的独立 reviewer 对 T16 及原 T01/T03/T04/T06/T11/T12 及T13测试必要维护分别判断标准轴、规范轴。沿用户既有 gpt-6-astra/high 偏好，不再委派，不修生产或永久测试。当前仅准备；Root 收到真实作者交接、亲自完成固定输入代码验收后才原生派遣。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map21/Goal20，28票55AC。AGENTS 发现、dev/testing、T16及维护票、SpecDev I 最终审查与独立 code-review/risk/error/test-reliability。LOG051及用户最新确认：真实模型、Obsidian、目标OS验收由用户进行，不索凭证，不冒称已验证。

完整读080/081/082/086最终REPORT与085诊断、Root真实接收回执、当前独立E2E/build/lint及原始失败；固定输入为 evidence/T-16.md#review-input-recovery-r1，实际摘要由Root派遣附上。当前行为窗口是 evidence/T-16-logs/recovery-window-map20.md，精确测试补充为evidence/T-16-logs/map21-fixture-maintenance.md。079已接受群候选是旧基线，只在逐SHA和影响闭包一致时复用，不将旧门代替T16新增行为。

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
