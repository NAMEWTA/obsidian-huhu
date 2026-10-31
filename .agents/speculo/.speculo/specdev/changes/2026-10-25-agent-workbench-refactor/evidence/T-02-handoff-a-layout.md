# T-02 A 布局协调修复交接

**全部源写已停止。** 本次仅处理 round2 R2-S01/C01，输入 `48497f9ed2f152160f58af21073bb0dc5b96c1ebf245372c75264adbf6ba2b96`；完整报告已读回，SHA `75813e95f58a6693b299806db354f18d0d1481f153e6d10559b4f25ed2e65902`。Root 接管 build/full lint/bundle/freeze/独立 round3；A 不标 done，不改 C/Git/产物/预算。

完整 A manifest：`/tmp/huhu-t02-a-source-manifest-v3.json`，**36文件**，SHA `0293b2ef3c4501658952af92a6a12f07795a24f6c66af4cc8db37d192c921f81`。包含原全部34路径及新增2文件，31个原文件与v2 SHA相同。精确本轮5文件：

| 实际改动 | 最终 SHA256 |
|---|---|
| `src/modules/agent/services/spaces/layout-merge.ts` | `06baad04a1741894e8d5dec412fbdd284768391e944a0a727475dd7f87942af1` |
| `src/modules/agent/services/spaces/space-service.ts` | `1928d57ef2b763af6aad3fd113c4d1910759ae7cb291cd557814e0f2b08ff69b` |
| `src/modules/agent/services/workspace-service-spaces.test.ts` | `6e1b51621d7c8fc8b7459b06fefc4c87023232c3b8cef40ba1509babb81332dd` |
| `src/modules/agent/services/workspace-store-spaces.test.ts` | `fd027b5386fe38f01cd03269c6498c96412f0d54c8049e814c5f1c76ac0cce8b` |
| `src/modules/agent/services/workspace-store.ts` | `ea30593109d884895bd0dc63fef4a257ee1b72059862a6947a833e5cc66fc307` |

`SpaceService.saveLayout(spaceId, {base,value})` 在唯一业务队列与执行时最新布局合并；v2 bridge 为每个 Space/shared 保留 base/view/dirty/在途状态，协调相同selected ID的真实布局提交。在途通知先保留，自己的save ack结算后只把submitted之后的本地编辑rebase到结果，不能无条件adopt覆盖本地。切换保留旧Space dirty draft；首次恢复才normalize，不用same-ID通知重置runtime state/unread。

唯一布局merge复用现有 shared threeWayMerge/rebaseChanges 及 workspace openTab/closeTab，未改shared全局语义。处理首group独立创建与新增引用，再保留更晚本地activeTab/group/focused pane、split、page/rename/close。真实字段冲突明确拒绝，保留local及已提交remote，DocumentConflict path/baseline/local/remote在cause中；bridge包装既有SpaceError持久化错误，生产controller复用已有en/zh文案，不显示raw英文。没有新增依赖、队列、Provider等待锁或自动重放失败业务。

上轮future/foreign scope permit内primary/backup/needsRecovery门、disk候选成功后才采用、一次EIO显式恢复、owner/drain与最后spawn校验保留。v1 writer未改，既有回归通过。

最终验证：**14文件/116测试/0skip，生产与test tsc、生产定向lint均exit0。** 比首轮115多了“select主写暂挂后B发生本地page编辑”的真实接线分支。包括精确select→attach反例及相反顺序、双启动、dirty/in-flight两种先后、page/rename/close、split/focus/runtime状态、首次不同group、冲突、无布局通知不echo、失败后显式retry。定向lint按仓库配置检查生产源；被默认ignore的测试由Vitest/test tsc验证，未声称对其lint通过。

三条原reviewer entry从最终生产源码重打包至独立周期输出；原stdout/C副本未覆盖。selection现在savedTabs=visibleTabs=1且running=1，后续UI保存savedRuntimeRefs仍为原runtime；双启动两个Session/两个tab/切回可见两个；storage仍拒绝future、cold/warm foreign重复无覆盖、一次EIO第二次成功。额外断言核对probe值和全A36文件SHA/长度。probe本身exit0仅采集完成，不单独冒充合同通过。

逐次命令记录：`/tmp/huhu-t02-a-layout-commands.json`，**22条**，SHA `6a4b200a645cd452a896ea17ce581d7556791cbf748240d9180d8cee2ad70cf6`，含exact runner argv/真实child exit/原日志路径、字节及SHA；最早三次仅有logical argv/tool exit，child未单独捕获，明确保留未知。原红灯、fixture错误、lint失败没有覆盖：fixture改为显式播种unread以符合openTab激活语义；lint回调改显式boolean，生产路径lint消除ignore警告，不修改全局工具。

| 检查 | 实际结果 | 原输出 | SHA256 |
|---|---|---|---|
| 正式红灯 | tool126；1failed/8pass，child exit未单独捕获 | `/tmp/huhu-t02-a-layout-red-selection.log` | `f99d6b626b4512e377d4841eb48552d9f271ecbb2fab5d44d8629c378a8162ae` |
| 新增测试首次失败 | tool126；4failed/10pass，fixture unread预期有误 | `/tmp/huhu-t02-a-layout-coordination-first.log` | `d6f03359cc4b00db96c758e675b6dd9c3ccbce9a481c363a0ec67e5b4cdf354d` |
| lint首次失败 | runner child126；Promise truthy回调及ignored测试警告 | `/tmp/huhu-t02-a-layout-lint-first.log` | `5ed35c8a6aba2a9156a4666fd08539d1991f77118dcaa08688e4ca4999ce8cdb` |
| 最终故障闭包 | child0；14files/116tests/0skip | `/tmp/huhu-t02-a-layout-unit-final.log` | `79b0ddfabc59c625e97f06a4eac7850b5420ca5d743305d0719ba335edb01437` |
| 最终生产类型 | child0 | `/tmp/huhu-t02-a-layout-type-final.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 最终测试类型 | child0 | `/tmp/huhu-t02-a-layout-test-types-final.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 最终定向生产lint | child0，零警告 | `/tmp/huhu-t02-a-layout-lint-final.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 原storage probe | child0 | `/tmp/huhu-t02-a-layout-storage-probe.log` | `45f83ca158934057833c25e4d6f609c06fa006926489cd377bf740c723ab3307` |
| 原双启动probe | child0 | `/tmp/huhu-t02-a-layout-two-launch-probe.log` | `ec78aeb8c5477f0c9e873d67b6fb13c5955f5cd1ef3370b3f95d0c79ec5cd412` |
| 原selection probe | child0 | `/tmp/huhu-t02-a-layout-selection-probe.log` | `82ab3c85431681040aaeeac62f4b22ff0b432dfd64649dd69d940a57003f5e11` |
| 三probe值+全A36SHA断言 | child0 | `/tmp/huhu-t02-a-layout-assert-observations.log` | `3d4205b1d41e4007f500e51a1325dcd9dfc4391c37422de55c528b3e4a3a409e` |

未重跑无变化UI截图/DOM/B22；既有冻结来源/证据可复用。本轮真实FS+desktop adapter+业务接线通过隔离自动化，不冒充真实Obsidian/Provider/PTY端到端。真实平台E2E仍按用户约定由用户执行；整build/full gates由Root执行。无范围扩大，不触及T03-runtime/detach或T14旧消费者。本周期方案 `/tmp/huhu-t02-layout-repair-plan.md`；没有引入新外部代码，原参考采用理由保持。
