# 大队列并发测试的准备与目标边界

Owner: /root
Map: 21
Goal: 20
Date: 2026-10-26

本补充只细化088/090原owner测试写集和验证选择，不改变产品行为、生产期限、28票55AC或代码交付授权。真实Provider、Obsidian和目标OS由用户后验。没有提交、发布或归档动作。

## 已读证据与判定

088联合12七包normal实际通过；13五包race整体失败，approval/recovery/delegation通过，chat4/6树及collaboration-policy的129父用例均在准备阶段失败。日志n=2是第三个root。原失败与源摘要保持，不把部分包通过说成整轮通过。

090外部08/09只观测真实80个完整审批CP、8个合法占用槽和尚未领取的目标父；随后仅将三个分段30秒准备等待改成从startGate起算的单个90秒总context。两生产文件与触发后的5秒结果/回卷断言不变。最终14 normal exit0/Wait4.159s、15 race exit0/Wait73.669s，实际257 Run/129 waiting parents/128 pending approvals/slot0/rank129，目标原父根及早key回卷均完成。Root完整接纳090最终REPORT SHA256 9c3b4fee48aff677dfb5bc7b5a2820b3ae9d8e1179d23221c7e3ec26a31a1052，亲自return0并核381源、30工件与3自有源无漂移，回执为evidence/090-lead-return.json。不是生产性能优化，也不宣称全候选通过。

088外部16观测到第三root在30秒内完成29/32次公开delegate；19单变量控制仅在全部四个真实root进入后暂停构造期间扫描，恢复前后的真实132 Run/124 accepted/4 slots/4 waiting parents完整。暂停段各32次实际delegate约1.38/1.27/1.84秒，对比16相应后段17.43/28.95秒支持扫描争用成本；这不是所有耗时的完整归因。恢复扫描后的原6秒整体目标仍失败，只有5个实际Engine入口，未观察其自然完成，不能写成31个孩子已经完成或候选race通过。控制seam仅在外部副本，永久生产不纳入。

## 088最小测试处置

普通模式继续执行原公开4/6根、每根32委派、RootChildren1/ProfileChildren5的完整构造与真实Close/Done。六个root进入后各有真实Executor两分钟上下文；不抬高生产期限，也不靠无限增加顺序构造等待。

允许088仅在原chat测试子树增加可复现生成入口、说明、不可变Profile fixture及最小loader。固定数据必须由当前生产普通模式、原公开API和同Executor真实构造，并在全部Close/Done后保存原Run/根/限制与文件SHA；不手写或补丁修改SQL业务状态，不含真实凭证、外部账户或用户数据。race每次验证摘要并复制到独立临时Profile，再走原真实重开、恢复资格、公开Cancel/CAS Resume和最终消费路径；保留4树控制与6树从未领取资格none、原身份/唯一性/闭门树/槽/pin全部断言。不得skip目标用例，不把固定fixture当并发构造已测。

目标等待以仅原31/32个eligible Run首次进入持久succeeded刷新6秒停滞上限，另有90秒绝对总预算。轮询、Engine进入、重复行、父状态变化或额外Run都不能刷新；失败/取消立即失败；最终须完整读到每个原ID当前succeeded且原父成功。两次读之间可能发生合法提交，不能把该观察交错误报。旧前页遮蔽零进度仍须6秒失败；最终新测试应在旧固定代码得到有效红，不能仅引用原有不同等待语义的通过。

## 验证分配与未完成项

088实际生成、最终normal/race与必要vet/Go架构完成前仍待验。090与未受影响旧通过包按源/风险闭包复用。Root独立正常模式重建两个大队列并检查原目标断言；Root的race覆盖不同的旧在途恢复、坏CP、Stop失败、producer持锁和审批slot边界，已有作者最终大队列race通过后不再次重复昂贵构造。所有检查基于固定输入、真实exit/Wait，源码/产物逐SHA回读，失败保留。最后仍须新固定候选独立双轴复审；本文件不是任何票或G1通过凭据。
