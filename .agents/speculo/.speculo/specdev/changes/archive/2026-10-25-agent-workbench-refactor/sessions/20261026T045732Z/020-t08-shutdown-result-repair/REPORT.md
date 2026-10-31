# 任务回报

Session: 20261026T045732Z  
Task: 020-t08-shutdown-result-repair  
Status: blocked

## 聚焦交接

本020仅保存未完成检查点。Root因新语义影响既有未分配 helper.test.ts，要求停止全部产品写入和新检查，先正式扩写11条修复路径/88总范围后另派023 continuation。当前三产品路径已 SOURCE STOPPED；所有已启动命令001–004均已结束，没有未完成 exec。未写 helper.test.ts 或其他未分配路径，未修改Rust、新旧pair、UI、根产物、依赖或正式规划。原恢复周期和integration attempts不重置；不宣称F6修复或T08完成。

## 产物与验证

证据根 /tmp/huhu-t08-shutdown-result-0ee4bbc8（R）。实际TASK SHA核为18ce1e836252b8bf4f1530265f0bb2de17bd448cfcf6ccbfb56d76d237f1df66；按GP030/Map31、正式packet及r4十路径执行。R/input.json是Root2149输入preflight原件，meta.json保存十路径前像，commands保存真实argv/cwd/UTC/exit/raw/前后闭包和显式017双binSHA；使用Node绝对入口，无LD_PRELOAD/NODE_OPTIONS。

001-build-host-red：exit0，实际esbuild捕获10个生产依赖/入口的onLoad字节、metafile、工具及bundle。原019 Host反例复制至新根并增目标断言，原件不改。

002-real-host-shutdown-red：exit1，无timeout。直接生产Host/PtyHelper→原017 immutable helper；全部Session/binding/reply/output已闭后仅替换自身endpoint。native实际exit1且stderr为control identity changed，sentinel正文保留，但lease.release和host.dispose均resolved；目标断言F6: last Host release hid native exit1 cleanup failure真实红。完整observation在R/run/e4/observation.json及raw，旧probe只读。finally只清自身replacement及original endpoint，原件事件和失败raw保留。

随后仅改三生产文件，候选尚未验收：shared/native/host.ts新增冻结NativeShutdownError.outcome（exited/not-started/unconfirmed、code/signal/forced/stdioClosed/有界diagnostic），error.termination为永不reject的物理fence；未新增Transport事件。helper.ts保持editor的真实物理fence，dispose另等exit+close，保留4s+1s预算、原启动错与cleanup错。host.ts拟区分已确认gone和未确认退出：已gone退休旧代但把关闭错误交原调用者；unknown留责任并按同fence迟到结算；release/startup双错聚合、Host.dispose缓存同次结果。设计选typed不可变错误及原owner fence，避免增加transport全局观察状态。此为未通过完整回归的中间候选，不能直接整合。

003-original-fixture-regression：原6文件fixture未改运行，在75秒外层预算终止，exit143/timed_out=true。raw保存host-control11项各5秒timeout、exit0但stdioClosed=false等原失败；这是现有fake只发exit而没有Node真实close的适配问题，不能算产品绿，也没有删除旧风险断言。

004-unallocated-helper-fixture：只读新增运行helper.test.ts --bail1，exit1，无外层timeout；首项5000ms测试超时，其余未完成，不把7项当通过。Root已核该文件两处normal finish只emit(exit,0,null)，需补真实exit→close；本020未获该路径写授权，故原件保持。Root将正式扩写，不能直接改它或放宽生产stdio责任来迁就fake。

R/checkpoint-source.json保存本次冻结、十路径现像/模式、四条回执和待办；checkpoint-diff.patch相对本020前像。当前实际改动如下：

- src/host/desktop/native/host.ts SHA f8d2ac4e6ab8d8dcf13f0ee077e687763371f479428aefff0664e888d32da428
- src/host/desktop/native/helper.ts SHA 12f639a3a2a55686cf8e0ffb9e2f05672afe15d7861109dd4f64f1890d57e8e7
- src/shared/native/host.ts SHA 55550d57db87996a0c885f7e96d6675ad6274161f971613f526267126f712c1f

其余七个授权文件未变；helper.test.ts也未变。所有工具命令均在四条receipt内，001/002为改源前目标红，003/004为改源后的真实fixture失败。暂无新定向green/类型/lint/return，不预填通过。

## 问题与下一步

等待Root先正式落GP/Map/r5和新的023 continuation TASK。本次范围未完成：需要修正授权fake真实退出/stdio事件，补正常/非0/信号/强杀/未退出/迟到gone/重复结算/startup/双错/下一次acquire/原operation fence与其他owner活性矩阵，至少一条真实生产Host→Helper→017bin green与正常EOF，再定向回归、类型、lint和最终return。Root负责根build/官方Pi/消费侧及完整独立R4。仅因写集调整停止，不标F6已闭或Goal完成。

SOURCE STOPPED — 当前三生产候选和其余路径全部停止，保留原失败，等待正式续派。
