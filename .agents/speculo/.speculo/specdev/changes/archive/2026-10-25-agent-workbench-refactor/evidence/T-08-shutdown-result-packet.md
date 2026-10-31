# T08 关闭结果传递修复：恢复周期1 / R3 F6

原Lead codex:/root沿完整18票与Agent Team授权执行；GP030/Map31，当前workspace/HEAD、模型、Spec/DESIGN和用户实机边界不变。R3完整两轴request-changes，唯一F6/P2，F1–F5关闭。Root已完整回读019报告及三独立probe/消费者并接受，见T-08-review-r3-root-audit.json（SHAf671b374477dae45b8737b67da68509248b44e495ebe00e6ea5acf6a989a5578）与T-08-review-r3-report.md（SHA0cb8815abc80978c12659d3cd72dab08e86c9febddd7608afb070f0558c40904）。这不是新恢复周期；本周期已整合1次，下一候选计2，原周期3及所有失败保留。

R3实际生产PtyHelper和NativeHost公开调用均复现：自身editor端点被测试sentinel替换，原Session/binding/output/reply已闭，native新bin正常执行安全identity检查并exit1/stderr诊断，但helper.dispose、最后lease.release与host.dispose全resolved。原closed('closed')提前发布并置ended，随后exit被close早退，terminated本身丢失code/signal。

最小责任目标：关闭接纳与物理退出结算分开；原terminated依然让所有editor/frame/operation清理在真实退出后收束，但dispose的公开结果必须保留实际exit失败/信号/未能退出。正常0且无signal才可报告正常helper结束；stderr普通警告不等于失败。真实EOF清理failure须能由最后Host release/shutdown消费，不能仅私有stderr可见。

需比较保留typed不可变termination outcome与扩展transport观察字段两种方案，沿原生命周期选择；不用新daemon/全局状态/重复closed事件伪造通知。不能把terminated改成reject后使原void then清理漏掉/unhandled。物理已退出但cleanup失败与物理退出未确认必须可区分：前者结束原generation占用但保留本次rejection，后者保留未结算事实，不创建第二helper。原owner释放错误与最后shutdown同时失败时，两份真实事实均保留，不让finally覆盖丢失原NativeReleaseError内容。

这是修复影响约束，不声称当前已存在“修复后acquire永久阻塞”产品finding。若改dispose为reject，Host现有仅在成功后clear current会被影响，必须覆盖同代重复release/dispose及后继明确acquire；原已关闭generation迟到回调不能清新generation。启动/握手先前错误不能被cleanup二次错误替代丢失。最后owner才shutdown，其他Cookie/history owner仍能继续。

原helper4000ms升级kill、后1000ms未退出拒绝以及native共同8s是当前各层预算，不要求盲目延长。若本次确实由kill结束，不能把signal当正常exit0。强制终止后的文件残留不外部删除冒作产品成功；准确失败和自身夹具清理分别记录。

本次由原Sol/xhigh codex:/root/prepare_t08_full_cli唯一修复：host.ts、helper.ts、host.test.ts、helper-stream.test.ts、helper-control.test.ts、helper-editor.test.ts、host-control.test.ts、host-editor.integration.test.ts、shared/native/host.ts、shared/native/lazy-host.test.ts。它们都在既有完整87范围，正式r4分配已建立，仅020 TASK实际投递后解锁；native Rust/新旧pair、UI/A和其它B源继续STOP。

先按019原probe保存真实红，再最小修复；至少正常0、非0/迟到诊断、信号、未退出有界失败、重复dispose同结果、启动失败保留原错、实际最后Host lease failure、已证physical-exit后的明确新acquire/未证则拒绝、其它owner继续、双错误不丢事实。真实integration用017immutable pair，不改Rust/既有原probe，也不必重跑142 native测试。受影响Host/helper/lazy-host单位/类型/lint；Root在候选STOP后统一build/预算归因及真Host/control/官方Pi组合，未变UI/Chrome等有界复用，再完整R4独立两轴。恢复周期1下一次Root整合attempts2，旧周期3和本周期1失败均保留，不reset。
