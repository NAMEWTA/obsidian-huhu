---
schema_version: 2
session: "20261026T045732Z"
task: "020-t08-shutdown-result-repair"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

原Lead codex:/root，沿既有codex:/root/prepare_t08_full_cli的gpt-6.1-sol/xhigh身份。只修019完整R3唯一F6/P2：native准确exit1的关闭失败被生产Helper.dispose与最后Host.release/shutdown抹成成功；覆盖修复影响到的原关闭/重开/错误责任。F1–F5已独立关闭。用户完整18票Agent Team授权包含本修复，无需再次确认，不递归派遣；正式状态/根产物/最后验收归Root。

## Inputs

同repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。当前GP030/Map31，T08 in_progress，恢复周期1 attempts1，下一Root候选整合计2；旧周期3和全部失败保留，不重置。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal；原current workspace，无提交/push/PR/发布/归档。

先按I与Map→dev→T08→Goal回读，实际执行适用生命周期/TDD/错误/资源/test-reliability规则；本轮无UI变化。既读未变规则可复用。正式修复合同 evidence/T-08-shutdown-result-packet.md SHA b6d9c9fa5eae76d755babee02aef54667ecb3b89be832d972f99ec5f2320e14e；精确r4 allocation SHA f09a7cdd0dd0987b8e3352598890cf18db78901c1a347add976bd2053cc34dd9。两份必须完整读，不从旧017职责推定当前Rust可写。

Root派前完整冻结 /tmp/huhu-t08-root-r4-preflight-inputs.json SHA30c828515059357885e1346f3c000b97932af350905c7c4ff68e6e03f392a12d，2149输入/2072产品，写集外[]。R3完整语义包 evidence/T-08-review-input-r3.json SHA3cf998b47e027ee153d6a5b9440a907ce705c7a6f98a5de3b3476cc09665b40d为本修复前87路径原字节/模式。正式规划修订不是产品变化。

019 REPORT sessions/20261026T045732Z/019-t08-full-review-r3/REPORT.md SHA0cb8815abc80978c12659d3cd72dab08e86c9febddd7608afb070f0558c40904；Root接受audit evidence/T-08-review-r3-root-audit.json SHA f671b374477dae45b8737b67da68509248b44e495ebe00e6ea5acf6a989a5578。原独立probe /tmp/huhu-t08-full-review-r3-astra/{shutdown-error,host-shutdown-error}.{ts,mjs,stdout,receipt.json}只读。普通EOF5代全0绿单独保留。两个异常probe exit0只表示成功采集缺陷，不能当产品green：已闭全部session/binding后仅替换自身endpoint，nativeexit1且stderr identity changed，dispose/最后release仍resolved。

017新的immutable pair /tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty SHA950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843，31119408B0555；同目录huhu SHA63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74，15428448B0555；producer SHA5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3，0444。原Rust142、native正常EOF12、Windows compile均有效，只供本轮新TS消费者重验，不重build或修改Rust/bin/cache。

## Workspace and Scope

只有以下10产品路径交你唯一写入，包含原C组shared/native/host.ts的一次明确接管；其余完整87路径全部STOP，分组数组不是另一个writer许可：

- src/host/desktop/native/host.ts
- src/host/desktop/native/helper.ts
- src/host/desktop/native/host.test.ts
- src/host/desktop/native/helper-stream.test.ts
- src/host/desktop/native/helper-control.test.ts
- src/host/desktop/native/helper-editor.test.ts
- src/host/desktop/native/host-control.test.ts
- src/host/desktop/native/host-editor.integration.test.ts
- src/shared/native/host.ts
- src/shared/native/lazy-host.test.ts

可新增本020 REPORT与新的/tmp/huhu-t08-shutdown-result-*证据。不得改native Rust、shared input/protocol/schema/codec/generator、业务/controller/UI/i18n、main.js/styles.css/预算/notices、依赖锁/node_modules、任何旧report/probe/bin或正式状态。确需超界先报告Root，不先改后补；不访问真实账号/Vault/Provider/Obsidian。原签名/字段实现可在这10路径最小调整，不机械强制每条都改。

## Acceptance

沿正式packet完整责任，不以单行reject补丁结束：

1. 最小设计比较typed immutable termination outcome与原transport观察端口两种方式，说明为何沿原owner，避免新管理器/重复closed事件。进程退出fence与关闭成功分开；原editor operation/frame在实际退出后的收束不能因terminated变reject漏掉或产生无人观察的rejection。
2. 普通exit0/no signal正常关闭；非0、signal/有限force、未确认退出准确失败，保留bounded diagnostic/code/signal事实，不靠解析本地化文本决定恢复。stderr警告本身不等于failure。关闭admission立即，实际物理结果从dispose经最后Host release/shutdown到既有调用者可观察。
3. 已确认进程gone但清理失败与尚未确认gone区分；前者不能永久卡死下一次明确acquire，后者保留责任不启动第二helper。旧代迟到结果不能清新代。重复dispose/release保持同一次结算，不重发EOF/kill/业务输入。最后owner才关闭，其他Cookie/history owner继续。
4. 启动/握手原始错误与最后cleanup错误都保留；原NativeReleaseError加最后shutdown双失败时不得被finally覆盖丢失原outcomes。原4s kill+1s未退出升级与native8s不要求延长；forced signal不能被当正常成功。
5. 先复制019真实Host反例到新根并形成目标red；至少一条最终真实生产Host→PtyHelper→原017bin路径证明原异常成为准确失败、sentinel不删、普通EOF仍绿。短XDG根0700，若新证据根太长用自己短子根并记录归属。原异常观察后仅清自身记录inode，不能用外部cleanup冒作产品成功。
6. 定向单位覆盖上述正常/非0/信号/无exit/重复/startup/双错误/下一次acquire/原F1 editor retirement/其它owner活性。允许受控调度/stream fake说明边界，不改fake强行符合实现而丢旧风险；正常fake进程必须显式提供真实约定的code/signal，未知结果仍单独负例。

## Verification

执行受影响Host/helper/lazy-host定向测试、生产/测试类型与相关文件lint，命令和前后输入冻结如实记录；不要全仓测试、全native或根构建。如果某旧fixture因终止结果未声明而失败，先保存原失败并核语义，精准修fixture，不能吞异常/删测试/放宽断言。单元时间用可控调度，但真实native错误消费闭环不可省。Root负责最终根构建/实际增量预算归因、Host/control/完整官方Pi组合与完整R4独立两轴；未变UI/Chrome按闭包复用。

## Return

原始失败、每条argv/cwd/UTC/exit/raw、工具/依赖/快照、最终完整diff/路径/模式与记录PID/socket清理、实际return均可回读。不要重复制所有历史大CAS；新增快照用内容寻址并引用原已验证字节。正式REPORT原子写入，Session/Task/Status有效及“聚焦交接”“产物与验证”“问题与下一步”三节；写后实际return validator存独立raw，不预填通过。注明SOURCE STOPPED与唯一交付摘要、当前仍未验证项；候选不代表T08或完整Goal完成。
