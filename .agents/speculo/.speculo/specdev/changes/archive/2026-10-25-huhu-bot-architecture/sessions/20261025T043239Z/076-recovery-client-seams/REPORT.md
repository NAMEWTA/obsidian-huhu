# 076 恢复与关闭的 TS 消费者只读准备

Session: 20261025T043239Z
Task: 076-recovery-client-seams
Status: completed

## 聚焦交接

完成当前TS恢复/关闭接缝与owner清单，见 [interfaces-and-owners.md](interfaces-and-owners.md)；未激活T16，也未改任何生产或测试。公共runs.resume代理与严格schema已存在，但仍implemented=false，expectedRevision目前可省略，Run尚无恢复资格/资格代查询；下一窗口应先由T01唯一owner冻结服务端资格、CAS、幂等和错误合同。075已具备动态群贡献者proof、当前资格重锚与断线清理，可由原owner窄维护连接同Run手动恢复；关闭复用既有transport.close/exited/TERM-KILL后备，完整模块装配和宿主退出仍属T20。075九文件逐SHA差异为空，全部建议自动化与真实操作均not-run；本次只读准备没有T13/T16产品通过结论。

## 产物与验证

本次完整读取076 TASK，SHA `ae677a14a51d5d3d5db2264afe11d762ecb2a3e0def055b61f2d32e875401110` 与派遣一致；先ACK，再按AGENTS roots/catalog/运行指南、dev适用架构/测试参考、Map18/Goal17、T16原票和T20相关生命周期范围读取。复用已读未变的规则；本次不运行实现workflow、不申请或使用生产写权。工作区HEAD/base为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，分支 `NAMEWTA/bot`。

- [interfaces-and-owners.md](interfaces-and-owners.md)：按真实文件/函数/行号/SHA区分现有TS入口、当前缺口、待Go合同和T20职责；给出五个可证伪联合窗口，全部明确not-run。
- [observations.json](observations.json)：43个当前来源完整SHA/行数/时点、075九份冻结源的expected/actual摘要、真实runs.resume required字段和implemented=false、缺失runtime装配路径。Go源码仅时点观察，073/074仍在T13收尾，不冒充最终冻结。
- [return-validation.json](return-validation.json)：报告回读后实际共享return结构校验，另记真实exit；结构校验不等于产品验证。
- [final-recheck.json](final-recheck.json)：报告后复读075九文件和已观察输入，区分稳定TS与仍可能改动的Go；保存自有产物SHA，不改旧报告或正式状态。

关键差异与下一owner请求：

1. **合同**：`api.ts:703` 当前resume输入继承CommandMeta，recoveryGeneration必填而expectedRevision未必填；没有当前资格查询字段。`BotErrorData.details`只供CURSOR_EXPIRED类型快照，不能假借其承载恢复资格。T01/原foundation_go先定唯一DTO/schema/真实用例；原TS owner随后消费，若没有新方法无需改71/142计数。
2. **真实BotClient**：`HapConnection.request`只管hello/严格schema/有界pending与等待，不按capabilities本地禁用；future恢复consumer需明确协商。Abort/timeout结束等待，不撤销已接受命令；30秒合法迟到关联和断线不自动重放已有界限可复用。uncertain不能静默新发/换command身份，runs.get当前状态也不能单独证明某次命令受理。
3. **资格/投影**：`Run.group`更高revision仅可完整tuple集合增长，旧/same-revision冲突不能覆盖；普通event tail不携Run.revision，不能从EventView.status猜CAS或恢复资格。当前Run恢复成功尚无指定Run重锚公共hook，由原T04 owner精确维护；Session/source权限变化先清旧body并server重读，public Transcript独立保留合法历史。
4. **关闭**：连接closed、shutdown accepted、Runner child close、GroupClient.drained和真实Host/Vault producer排空是不同事实。原T01保持transport/EOF/单请求取消边界；T16/Go owner冻结统一关闭服务和producer超时持久状态，T20组合模块/Host/安装/宿主退出，复用现有process manager。当前CLI只有一个stdio入口，其EOF确会经defer Core.Close结束当前进程，不是假定的临时连接守护服务。

066既有八组矩阵保留为背景；本附件不再重写全项目恢复方案，重点补上075之后实际TS事实、普通tail/Run revision的区别、同Rununcertain命令边界和实际managed启动/退出句柄。原066的Go取消/CP/预算观察没有被本研究重新测试为通过。T16新服务路径、资格字段和关闭结果仍须Root/原owner在未来窗口精确登记，不据本附件扩大写集。

实际只读命令包括 `cat` TASK/workspace/入口/066两份全文/075最终报告、`rg --files`及`rg -n`定位T16/T20/消费者、`nl -ba ... | sed -n ...`读取当前TS/Go准确行号、Python标准库读取schema/方法目录并逐SHA对照、`git rev-parse HEAD` / `git branch --show-current`。探索时旧复数tickets目录和旧application/service*定位未匹配，已转到真实ticket目录及application/api/service.go，不拿查找失败当产品失败。没有执行Go/Node产品、测试、build/lint、数据库、网络、Provider/keyring、Obsidian或目标OS；唯一Node运行是TASK明确要求的只读return结构校验。

输入出处：

| 只读来源 | SHA256 |
| --- | --- |
| `sessions/20261025T043239Z/066-recovery-current-seams/REPORT.md` | `22b88e2a54a507477a16aac3c25df8d0e94d9ce1521608262749f8185d05c219` |
| `sessions/20261025T043239Z/066-recovery-current-seams/interfaces-and-owners.md` | `ee0b2c5be23eb52779d7f05e75fd068a6577b3bd25a542a7243f8d2b1cc30f5b` |
| `sessions/20261025T043239Z/075-groups-client/REPORT.md` | `6f9c27445bff8aca0db60167f2f4b877dd4183cefe969ec1319e875d682b3b7e` |
| `evidence/075-lead-return.json` | `a5676c0ab812e77dd1134db4ad0959e2557d09fc31cca3427f4e581ce4d9db70` |
| `tickets-map.md` | `d648b74b1278548c6aa57dd66d4a383df17fbd48e1f809e399265a2b378332d2` |
| `goal-plan.md` | `5eb778950901942443a8691ba5a28666ace05909e5a49d7b6e081058f22c27aa` |
| `ticket/16-cancel-recovery.md` | `81f48c1c9e61b5ef6b16847490cf5a7c48587eae70f04c70769528fc3884929c` |

当前TS API为 `9cf6d25e4783e203bf47a475852bed436490da4892eaec86c1ba2b78739d4f34`，唯一schema为 `d45693a3b4b2abbe635cf2f8b4655b63a4419458bb1e4854723f786a63ed1217`。其它完整摘要在observations.json；SHA相符只支持静态来源一致，不是运行验证。

## 问题与下一步

只读准备无阻塞；没有实施、运行验证或产品pass。本任务交回后停止文档写入；下一窗口由Root在T13最终代码门之后派遣T16，先安排T01/Go owner冻结资格/CAS/统一关闭合同，再给原TS owner指定最小消费者维护路径。真实Provider、Obsidian和目标OS仍user-owned/not-run，不索凭证；未提交、推送、发布或修改正式Ticket/Map/Evidence/他人报告。当前无自有产品/测试进程，所有自有读取/摘要工具均已Wait。
