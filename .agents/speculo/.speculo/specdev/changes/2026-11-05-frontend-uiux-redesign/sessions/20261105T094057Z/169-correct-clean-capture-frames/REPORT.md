# 169 三个净帧与原deadline判据修订（dispatch0 / return0）

## 交接

接受168两个精确驱动缺口：166 helper无效帧仍写previous，允许closing=[2,0,0]时只有两个净帧就拍；while仅在await前查deadline，也允许第三个慢采样返回时已达15秒仍拍。它们是判据不足，不说明原三张稳定新图有产品缺陷，也不改写166/168历史。

唯一候选 scripts/obsidian-acceptance/workbench-probe.mjs 已冻结于 /tmp/huhu-canonical-clean-frames。ready.patch SHA256 3c75ac664f81e22564ef19e92f4cfae341a81a70e09866e2e71c884968b2e716；manifest记录before 46fcf0555a856ec7388867a3a199963c92ceda551e0a6eb951b94105c653108a → after 39a26cd4b8bbaaf2e7e1bfa99b2db2f3988bf28e78f5782833e431c82b41c86c，mode0664。仓库源全只读，Root等168释放后单写应用；本REPORT是本次唯一仓库写入。

## 产物与验证

实际diff只有同一个小hunk三处：

1. previous仅在无closing且无有限动画时保存key，否则清空。沿原stableFrames>=2，首次净帧建立基线，第二净帧计1，第三相同净帧计2后才拍；无效或几何变化都会断连续。
2. await c.evaluate采样返回并记trace后立即核对原deadline；已到期直接跳出至原timeout路径。
3. 实际runtime.shot开始前再次核对同一deadline；若trace写入/同步校验已用尽预算，撤回临时成功trace项，沿原timeout追加timedOut记录，不调用shot。不要求截图RPC完成也必须在deadline内。

原共享15秒预算、finite动画筛选、原动画、rAF、87行为、48文件名、surface/overflow/focus/错误和产品输入均未改。没有新增框架或永久镜像测试。

实际检查：node --check /tmp/huhu-canonical-clean-frames/scripts/obsidian-acceptance/workbench-probe.mjs exit0；node /tmp/huhu-canonical-clean-frames/check-frames.mjs exit0；git apply --check /tmp/huhu-canonical-clean-frames/ready.patch exit0（未应用）。纯Node工具直接提取仓库before与最终候选实际stableShot完整原片段执行，只在/tmp提供受控采样与时间；没有启动原生宿主或读取clipboard。

旧helper两个反例均复现：无效→净1→净2共3帧即shots=1；每次采样耗5000ms，第三次返回clock15000仍shots=1。新helper控制如下：

| 控制 | 结果 |
| --- | --- |
| 无效→净1→净2 | shots=0，受控序列结束，无提前拍摄 |
| 再加净3 | 第4次采样shots=1 |
| 净1→净2→无效→净1→净2 | shots=0 |
| 无效动画后重新净3 | 第6次采样shots=1 |
| 几何A两帧→几何B两帧 | shots=0 |
| 几何B再加第3帧 | 第5次采样shots=1 |
| 第3采样返回恰达15000ms | 原timeout，shots=0 |
| 净3在14997ms、trace写入再耗3ms | 拍摄前deadline拒绝，shots=0；timeout trace写入后模型最终15003ms |
| shot在14700ms开始、RPC完成15700ms | shots=1，符合只约束开始时刻的边界 |
| 永久closed / 持续移动 | 均在原15000ms timeout，shots=0 |

模型、before反例与11个新控制的完整结果在 /tmp/huhu-canonical-clean-frames/frame-controls.json，工具check-frames.mjs仅留本地。有限序列结束测试刻意抛controlled-sequence-end阻止继续采样，以明确第三净帧出现前没有shot；未将该模型终止写成正常宿主通过。

## 问题与下一步

按169授权没有再运行native-03、Chrome/66/858、build或全仓检查，没有委派、改产品或改变冻结三资产。以上只证明原helper判据的正负控制；当前新候选的真实87与48图仍由Root应用后用同冻结产物正式运行，再交独立high复核。不能把原先只有两个净帧的历史结果冒称新三个净帧契约已在原生通过，也不将此次驱动修订说成产品修复。

return0；候选/patch/manifest/本REPORT冻结，停止全部读写并释放。不声明T14/Goal完成。
