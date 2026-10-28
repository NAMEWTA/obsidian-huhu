# T05 原生容量拒绝用例的准备屏障修正

GP019/Map20、current workspace与HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、原全18票代码交付授权保持。仍是fast-exit补修周期attempt2，下一Root整合为attempt3，不重置历史。仅实际followup后开启一条测试路径：

- `src/host/desktop/native/host-stream.integration.test.ts`

其他全部生产源、既有3路径、Rust/Cargo/target/helper、A/B、原sessions.e2e、预算/main/styles、正式状态和旧原件STOP。沿原C的gpt-6.1-sol/xhigh身份；实际调用I与dev测试规则。

## 已知事实与边界

Root同68364 helper组合226/227，唯一失败是原容量用例`filled.size===32`在4s准备截止未满足，未执行第33个请求。原wire没有记录全部filler的spawn-failed，不能确认该次根因。一次/tmp只读原例probe实际通过：32 filler于166.36ms全spawned、无filler失败/stderr/write(false)，第33个真实请求typed-none/pty-unavailable/replySettled:true，清理全部32numeric exit、helper exit0。该次通过不抹掉原失败，也不作为原失败因果。

静态准入中pending和live存在短暂重叠，可能保守拒绝同时bootstrap请求；合同只规定32上界，不承诺32并发bootstrap全部成功。容量测试应先建立32个已确认的真实scope，再证明第33个真实native拒绝和Node route释放。只修测试的准备过程，不据候选猜测更改生产准入。

## 唯一实施切片

保持外部SID1000–1031、真实/bin/sh→sleep30、绕开Node本地ledger的32scope和原第33个请求/typed-none/route0/replyClosePending0/Browser存活断言。以同一原4s总deadline逐项发spawn并等待该SID真实spawned后才发下一项；绝不为每项重置4s，不增加时限、不重试失败、不降32、不改全局测试并发、不替换mock。

收集有界32SID的spawn-failed/明确错误，准备失败时准确报告而不是仅等待空boolean；最多保持原相关控制帧范围，不打印环境/凭证。保留所有原body/cleanup错误与清理所有已发请求/真实helper结束。没有新产品行为和新公共字段。

原Root失败是准备阶段红，记录为test-reliability修正，不能声称它证明了生产缺陷或这一变化单独证明原竞态根因。给出前后实际差异与同一总deadline不变的解释。

## 验证与返回

用同只读68364helper运行修后单目标，再运行完整host-stream.integration.test.ts四项（真实压力/容量），原预算/断言不变；scoped类型与本文件lint。不得重跑Root全组合/cargo/build/Chrome。仅测试修改，无须重建相同生产产物。

交回新`/tmp/huhu-t05-capacity-fixture-c-{handoff.md,source.json,checks.json}`，执行前源、原命令/UTC/exit/log以及前后源字节保全，不覆写任何失败/原probe。明确SOURCE STOPPED后Root冻结v8并进行attempt3组合；原v7build/Chrome/production lint/架构/包体只在源码闭包仍一致时复用，新增测试本身需有真实验证。任何超出单文件的必要变化先停对应分支报Root。

固定输入：`T-05-capacity-fixture-input.json` SHA256 `b00859aefc357f5881ed4a4b277dd595e77fb74166c9393435e59d715a2a3f97`。Root已逐项核1948当前输入/66probe源/固定helper，保全原失败与唯一未复现probe；trace嵌套可变数组的时间解释以原console序列化行和独立wire事件为准。
