# 候选三独立双轴复审

Session: 20261025T043239Z  
Task: 072-notes-collaboration-r3-review  
Status: completed  
Reviewer: native:/root/foundation_review（未参与实现；未再次委派）  
Input-SHA256: 87f4067efd60dea5b08c6edeec20c648bc253827e2826cdc96569349b34f1fc2

## 聚焦交接

**标准轴 pass；规范轴 pass。** 当前完整冻结候选未发现未关闭的代码门 finding。070 唯一 P2 测试同步问题已关闭，原059三个产品问题的关闭结论在生产字节完全不变的条件下继续有效。此结论不改写候选1/2失败，也不代表真实Provider、Obsidian、目标OS或全部28票已验收。

唯一输入：[T-07 review-input-notes-r3](../../../evidence/T-07.md#review-input-notes-r3)，265文件/73来源，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，当前attempts3。初次及末次完整核验HEAD/index/Git mode、工作副本和来源；摘要均一致。相对070只有 `native/huhubot/tests/contract/delegation/wait_test.go` 变化，当前SHA `7c5d9de337c41651384ef0c98c6dbd179887e6ce417daedd230f1b843f33fa1d`，其余264文件和原69来源不变。新增4个来源没有改写既定产品合同。

已完整回读070两轴、整包race原红/强制合法交错红/isolated原顺序绿；071最终REPORT、精确diff、目标和整包normal/race原始输出及完整当前摘要。071 REPORT SHA `fa869f8e8263f4ef49d96702927ec0182e63cdcd64fc2cf6ac423829feea75a2`；070最终REPORT SHA `7a5044ad9a4a22ec79b343216582a39a811e807dd8dd5821cc622865854deb07`，独立回读一致。继续使用已加载的dev、I最终独立审查与公共code-review/risk/error/test-reliability规则；没有另开C Work或实施修复。既有gpt-6-astra/high偏好不构成运行时模型attestation。

<a id="standards-output"></a>
## 标准轴原始结果

Reviewer: native:/root/foundation_review  
Axis: standards  
Result: pass  
Input-SHA256: 87f4067efd60dea5b08c6edeec20c648bc253827e2826cdc96569349b34f1fc2  
Observed: STD-070-01关闭；当前normal/race及独立强制正常顺序均通过；CP与pin负向控制如预期拒绝绿色。无新增finding。

### STD-070-01关闭：同步真实状态，未删除原生命周期合同

审查位置：`wait_test.go:153–350`。原错误是把“所有六parent与root均waiting”当成任何调度下都成立的释放前提；合法早到的四leaf会占四槽，末两parent应当排队。070原整包失败没有抓取当次SQL，不能事后断言其精确顺序；独立强制交错红灯证明错误前提确实可达，释放后13 calls/6 resumes/slots0证明不应报告产品死锁。071只改变测试同步、观察及断言；生产排序、Claim、权限和API未变。

新测试的稳定前缀由真实四leaf进入Engine、六parent公开工具受理完成及root持久waiting三个条件组成。四个被测试持有的leaf占满根4槽，阻止剩余parent继续运行；waiting与accepted分布此时可观察且稳定，不再需要不可保证的7waiting前提。两种合法顺序都有明确承接：

- 永久 `batch-admission` 保持原连续公开委派；本轮normal/race均实测parent waiting6/queued0。它允许合法4–6 waiting分布，不把其名称误作“必然全部parent先受理”的保证。
- 永久 `four-leaves-before-last-parents` 在root第四次委派后等待真实四leaf握手，再发最后两parent，严格得到waiting4/queued2、calls9/resumes0。此状态对应070原强制反例，当前正常完成。
- 为独立验证另一个端点，在外部精确副本仅给batch的parent创建leaf前增加等待 `parentsAdmitted` 的握手。于是全部六parent必须先完成受理，再有leaf受理；生产Executor不变。race实际观察6/0，另一个永久控制仍4/2，两者均通过。差异仅见 [forced-parents.diff](probes/forced-parents.diff)，没有在仓库永久测试中增加实现。

关键合同没有被放宽：所有前缀握手/持久等待共用原5秒timer，终态仍沿用原8秒wait helper；每次实际child Run与Resume入口检查自身running/slot1、根≤4、Profile≤8及实际活动child≤4。等待/排队slot必须0且对应配置pin存在。每次Resume真实打开、完整读取并关闭CP，验证child-state、成功leaf原文和真实父子Run关系。最终必须13 Run、6 Resume、6 leaf、13个succeeded、最大活动child4、活动数/slots/pins/wait edges全部0；公开History包含六个joined且非partial。没有绕过Tools/Executor、扩大fixture权限、修改生产FIFO、重复测试求绿或放宽250ms等无关预算。

独立负向控制仅写外部测试及隔离临时数据库：

1. 将真正发布的CP正文改为 `reviewer-wrong-checkpoint`，保留Resume原验证。六次Resume均实际读到该正文，返回错误，最终原生命周期断言拒绝通过，Go exit1。日志中的calls13/resume6仍相等不代表绿色：完整断言还要求13个Run成功等条件。见 [negative-checkpoint.log](logs/negative-checkpoint.log)。
2. 在原强制交错稳定点删除一个真实waiting parent的task配置pin，RowsAffected严格为1；原pin断言立即报 `waiting/queued task released its live configuration pin`，Go exit1。见 [negative-pin.log](logs/negative-pin.log)。

两项为预期红，验证测试未退化为只等终态/只数调用；不是候选缺陷。未声称完成所有可能变异测试。失败路径defer释放held leaf，现有Core.Close取消并Wait Executor；reader、timer/ticker和观察DB释放路径已核，实际探针均退出并Wait，无剩余自有进程。

### 完整候选的复用与影响闭包

除单个测试函数及必需database/sql import外，其他测试、所有生产、依赖、配置、合同和Host字节均不变；同文件先前显式CP children/question测试与辅助类型保留。071单根测试只实际填满4槽，不把Profile≤8检查冒称已填满8；原多根Profile8测试在070及071整包race中均通过，原日志已回读。

因此复用070实际通过的原059三反例及正常对照、共享Claim事务/真实question CP相邻探针、chat/approval/effect-reconcile race；复用071当前完整delegation normal/race作为整包重测证据，但明确是作者运行，不冒称本review新跑整包。原070整包 exit1历史保留，新候选由已改变测试的独立新normal/race和受控调度验证关闭该原因。

原059白名单前置、queued撤权有限持久失败及无关root继续、持久constraints/expectedOutput进入真实Run/Resume仍有效；SQL/未知Fault/真正Commit错误原子回滚、无正文失败与正常父聚合/CP、raw三项合计128KiB和Context材料化Task另128KiB（合法合计超过128KiB）等观察未因单测试修改失效。详细事实沿用 [070完整报告](../070-notes-collaboration-r2-review/REPORT.md)及其original059/adjacent-probes/impact-race原始日志，未以“旧全绿”替代本次新同步判断。

<a id="specification-output"></a>
## 规范轴原始结果

Reviewer: native:/root/foundation_review  
Axis: specification  
Result: pass  
Input-SHA256: 87f4067efd60dea5b08c6edeec20c648bc253827e2826cdc96569349b34f1fc2  
Observed: SPEC-070-01关闭；两种合法调度均保护原槽位、CP和真实结果合同；原059三个规范差距保持关闭，无新增规范冲突。

规范只规定根4/Profile8、停止等待producer释放槽位、queued不占槽及Resume原子重新领取等行为，并未规定一级parent总先于leaf。新测试通过握手承接6/0和4/2状态，在真实consumer上核查原不变量；删除的是不成立的调度假设，替代它的状态与生命周期断言更具体，并非删除要求来获得绿色。原5秒前缀及终态等待未扩大，真实leaf结果、六次CP Resume和根History结果都保留。

完整当前范围仍是T07/T11/T12及共享维护T01/T02/T03/T05/T06、T27已交切片，并按实际调用影响考虑T04。原Host来源/授权/receipt/HMAC、恢复/预算/lineage/事件边界、已接受配置与工具能力、明确业务拒绝和基础设施错误边界等，按070有效字节及实际闭包复用。没有修改wire/SQL迁移/生产输入或隐去用户现场边界。T08–10/T13/T16等未实现部分不被冒充交付；T13未激活。

真实模型/Provider、Obsidian、用户目标OS/keyring仍user-owned/not-run，未索取凭证、未运行旧默认D-Bus或访问真实用户Vault。本轮代码门不把这些缺失变成新增finding。原输入六个文档锚点问题仍按 [067实际检查](../../../evidence/067-lead-docs-check.json)独立保留，不称全局docs通过。两轴pass只针对本次完整固定候选的代码审查，不代表全T27或28票55AC完成。

## 产物与验证

实际独立工具链 **go1.27.1 linux/amd64**，见 [toolchain.log](logs/toolchain.log)。071作者使用 **go1.26.10**，正常/竞态原始记录独立保留，不混成同环境结果。所有测试串行、`-mod=readonly -count=1`，没有重试择绿。

| 独立执行 | 实际结果 |
| --- | --- |
| 当前仓库Go模块：`CGO_ENABLED=0 go test -mod=readonly -count=1 -v -timeout=45s -run '^TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots$' ./tests/contract/delegation` | exit0，包0.431s；[target-normal.log](logs/target-normal.log)，两顺序均13/6/slots0 |
| 同当前输入，CGO1并加`-race` | exit0，包6.100s；[target-race.log](logs/target-race.log)，子场景2.59s/2.49s，无race报告 |
| 外部仅增加batch父受理握手，CGO1相同race命令 | exit0，包6.091s；[forced-parents-race.log](logs/forced-parents-race.log)，受控6/0与4/2均满足完整原断言 |
| 外部CP正文负向，CGO0，仅选择`/four-leaves-before-last-parents$` | Go exit1，包0.206s，预期检查阻止通过 |
| 外部真实配置pin删除负向，同一选择 | Go exit1，包0.124s，预期原pin断言失败 |

负向完整命令、返回及实际Wait在 negative-results.json（历史日志已清理：`logs/negative-results.json`），执行器 [negative-controls.py](probes/negative-controls.py) exit0只表示两次预期红均验证成功；没有把Go exit1改写成Go绿。所有外部差异、原测试字节和变体保存在 [probes](probes/)。结束时外部测试已恢复当前冻结字节，209项native/contract精确副本核验一致。

初次/末次固定输入核验：[input-start.log](logs/input-start.log)、[input-final.log](logs/input-final.log)、input.json（历史日志已清理：`logs/input.json`）、[核验脚本](probes/check-input.mjs)。脚本排除新报告造成的excluded inventory元数据，不排除选定产品或来源。Root [r3复用回执](../../../evidence/T-07-logs/lead-note-repair-r3-reuse.json)明确没有新跑产品E2E；本review逐SHA重新核对作者265、Root当前2032、插件1867及main.js/styles.css，全部一致，Root r2→r3恰一处测试差异。结果见 reuse-readback.json（历史日志已清理：`logs/reuse-readback.json`）。原生产E2E、151TS/build/lint、迁移及无影响平台矩阵按该闭包复用，没有本轮重新执行的主张。

071完整diff与原始normal/race已回读，其265最终manifest匹配当前输入。作者初次mode检查把Git100644与文件系统0600直接比较的诊断错误，及目标normal中间版本与最终版本的区别均保留；它们不是产品失败，也未将中间normal冒称最终字节验证。070整包红、强制红和isolated绿的不同含义维持原记录。

## 问题与下一步

本轮无待修finding。原STD/SPEC-070-01在候选三关闭，原059三个问题保持关闭；前两次失败与attempts历史由Root保留。Root收到并全读本报告后维护正式状态，本review不修改Evidence、Map、票状态或启动后续实现。

所有自有exec及负向子进程均已实际Wait，剩余probe进程为空；产品/永久测试写入0、委派0，见 process-cleanup.json（历史日志已清理：`logs/process-cleanup.json`）。末次完整输入无漂移，亲自return结构校验结果见 [return.log](logs/return.log)。真实MESSAGE/FINAL交回后停写，释放重测试窗口；没有提交、推送、发版或归档。
