# T-06 repair-1 独立双轴复核原始报告

Reviewer: native:/root/review_browser  
Implementer: native:/root/audit_browser  
Mode: native；延续原独立 reviewer，未参与实现或修复，未递归派遣。  
Input-SHA256: `13285d8c864d8d8e498184872a1801101b2137ed9d79a60a29b1b77bb2614aa9`  
Observed: 2026-10-27；standards=pass；specification=pass；新 findings=0。

## review-input

完整固定对象：[T-06-review-input-r2.json](T-06-review-input-r2.json)。实际对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算 UTF-8 SHA256，得到上列摘要；没有使用内部 scope.input_sha256 替代完整对象摘要。

- working-tree 显式 17 文件，base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；前序仍为 T-02-r3、T-03-r2、T-04-r2、T-05-r2 联合快照。完整 scope、sources、exclusions 由输入对象固定，未修改输入。
- 开始逐项核验 17 文件 after SHA256 和 54 项来源原字节 SHA256，全部匹配。相对首轮仅 workspace.ts、workspace.test.ts、BrowserActionError.tsx、i18n.ts 四文件变化；新增来源为原始首轮报告。
- 结束实际重跑相同 `validate-specdev.mjs --review-scope --repo <cwd> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，逐项传入同一 17 个 `--file`：base/head、index SHA256、tracked_diff SHA256、完整 working_snapshot 全部 MATCH；54 项来源再次核验无漂移。
- excluded additions 仅为本轮 T-06-review-input-r2.json，excluded removals=[]；报告随后作为唯一允许的新输出落盘，不宣称整个仓库无其他工作。
- 继续应用已读且摘要未变的 code-review/dev/ui 及 source-discovery、Fowler、risk-review、reviewer/reuse/evidence/working-tree、错误/测试可靠性、架构/测试、范围/研究、design-contract。规范包括 AC-003/004/008、T-06、Issue #1 生命周期/接管原条款、ADR/docs、SRC-010、DESIGN revision2/PAGE-004 与封板。没有缺轴或另建正式状态。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: pass  
Input-SHA256: `13285d8c864d8d8e498184872a1801101b2137ed9d79a60a29b1b77bb2614aa9`  
Observed: 原 S-01 已经实际反例与必要失败边界复核闭合；未发现新增可达缺陷。

### 原 S-01 已闭合：旧 stop 未结算时不接受新 start intent

- 修复位置：`src/modules/browser/services/workspace.ts:455`。startOwned 在 starts 合并、intent 推进、状态/runtimeId 修改、persist 或 factory 调用之前检查 stops；尚未结算则抛 space_stopping。
- 原窗口仍可真实出现：旧 stop 已把内部状态改为 stopped，但还在最后一次 catalog await；其他 Space 事件也仍可 notify 暴露这个投影。现在该投影不会使重开请求被接受，因此后续 stop 合并旧 Promise 时不存在已被接受的新 start 可被吞掉。
- stops 仍按原 stopSpace finally 清除，成功或失败都会结算并释放门；同代 stop 合并没有改成重复回收。没有在新 guard 中增加写入、强制删 profile 或恢复旧 lease。
- BrowserActionError 白名单和 en/zh 词典接入 space_stopping，明确要求等停止完成再重开；不是向 UI 透出内部异常路径。当前消费者既有 run/report 路径能够呈现该错误。

### 独立重演原反例与成功/失败边界

使用真实 BrowserWorkspaceService、账本和 catalog 串行写队列，MemoryPersistence/FakeRuntime 为合成端口。实际创建两个 Space，截住目标旧 stop 的最终 stopped catalog 写入；另一 Space 发正常 native page 事件，确认公开 getState 已为 stopped，然后执行原来的 start→stop 调用顺序。

分别让该最终 catalog 写入成功和抛错，独立观察：

```json
{"failFinal":false,"exposedStatus":"stopped","startResult":"space_stopping","intentUnchanged":true,"stopResults":["fulfilled","fulfilled"],"afterSettlement":"ready","oldTailNewRuntimeStopCalls":0,"profileRemovals":0,"desiredIdsPreserved":true}
{"failFinal":true,"exposedStatus":"stopped","startResult":"space_stopping","intentUnchanged":true,"stopResults":["rejected","rejected"],"afterSettlement":"ready","oldTailNewRuntimeStopCalls":0,"profileRemovals":0,"desiredIdsPreserved":true}
```

其中 afterSettlement=ready 是两个 stop 都完成/失败结算之后，再明确调用一次 startSpace 的正常重开结果；窗口内的原 start 已被拒绝。实际断言包括：

- 被拒绝的原 start 没推进内部 intent，没有增加 factory.start 调用，也未生成新 runtime。
- 最终写成功时两个同代 stop 都成功；最终写失败时两个 stop 都失败，没有吞持久化错误伪报成功；结算时目标仍 stopped。
- 之后显式重开可 ready/paused，使用新 runtimeId；旧 stop 尾部未 stop 新 runtime。原 desired Page ID/URL 完整保留，removeProfile 调用为 0。

### 其余生产链与回归

本轮只改变生命周期入口的一道同步前置门和相应错误/测试；首轮已核对的 driver target 归属清理、Host 独立 native revoke ACK、Worker 普通/urgent 任务收敛与 5 秒边界、FrameBroker/SpaceViewer 本地存活检查、root/所属 Document 生命周期代码与来源均未变。按输入逐项对照与修复接缝阅读，没有发现对原安全边界的回退。

早期 reclaim/start 失败仍归 faulted 或 quarantined，保留旧 profile/desired pages；已有 Space 不重新 seed。失败页仍按原 ID 单独重试，成功页保持；未知 target 清理仍故障隔离。控制收敛未证仍 blocked，不授予 human，也不重新激活旧 Agent 读写；lost viewer 的输入门/暂停和不因残帧续租仍成立。没有扩大权限、重派网页效果或改变前序 T-02–T-05 的提交事实规则。

本轮实际定向测试也复查同代 stop 合并、早期 reclaim/start 和未知回收边界，见命令记录。未重新运行未变 native/Worker/viewer 套件，不把首轮有限证据提升为真实 helper/宿主证明。

Findings: []。原 S-01 关闭；未限制新发现数量。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: pass  
Input-SHA256: `13285d8c864d8d8e498184872a1801101b2137ed9d79a60a29b1b77bb2614aa9`  
Observed: 按 AC-003/004/008、T-06、Issue #1 §7.2/§7.3/§8.1/§9/§15.5 与 PAGE-004 核对；原 R-01 闭合，没有新增规范差距。

- 旧停止尚未结算时明确拒绝重开，不建立新 runtime/intent；较晚 stop 因而只合并同代停止，不再吞掉已接受的当前启动。停止失败仍可定位，完成/失败结算后保留显式重开的恢复入口。
- 旧 profile、完整 desiredPages 和 Page ID 保持；正常重开分配新 runtime，paused 发布，不重 seed、不自动恢复旧 lease 或网页副作用。
- 未变的 personal/task 隔离、独立 browser owner、接管 ACK/收敛、实时结果失效、失活查看器和清理归属保持首轮已检查的代码合同。此复核没有免除 SRC-010 的用户真实验收。
- DESIGN revision2、digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c`、PAGE-004/批准来源未变。space_stopping 通过现有错误组件与中英词典表达，不新增设计或声称已完成实际明暗/窄屏/popout 视觉验证。

Findings: []。原 R-01 关闭；skipped_axes=[]。

## reviewer 实际命令与边界

实际执行完整输入摘要、开始/结束代码与来源校验、同选择 review-scope 重建；回读原报告、四文件变化与真实 start/stop/UI 消费接缝；独立重演原 catalog await + 另一 Space 通知反例，并分别注入最终写成功/失败。

实验沿原方法读取 workspace.test.ts 的 fixture 前缀，仅在内存替换 vitest spy，esbuild stdin/write:false 后 Module._compile；真实 Workspace/账本/写队列执行。intent 只作只读观察，没有改写私有状态。finally 释放 gate 并 dispose 工作区，没有写源码或临时生成物，也未调用真实浏览器。

实际定向命令：

```text
pnpm exec vitest run src/modules/browser/services/workspace.test.ts -t 'rejects reopening during a stop final|coalesces overlapping stops|records an early|quarantines an early'
Test Files 1 passed (1)
Tests 6 passed | 47 skipped (53)
Exit 0
```

作者报告的 workspace 53 tests、browser/CLI 39 files/325 tests、全 test tsc、3 生产 lint、i18n 5199 与 diffcheck 未冒充 reviewer 重跑；没有无差别重复首轮已稳定检查。独立原反例和成功/失败对照构成本次闭合依据，绿色数量不单独构成结论。

未运行真实 Chrome/helper/Obsidian/四平台/人工视觉/性能，按 SRC-010 由用户验收；未读取真实用户资料/账号/系统秘密，未 build 或验证最终生成物组合，由 Lead 串行集成。唯一写本新原始报告，未修改生产源码、正式 Evidence/Ticket/状态、输入或旧报告。

最终：standards=pass；specification=pass；开放 findings=0。交回后停写。
