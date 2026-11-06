# 当前 T04 Keep editing 失败的有界只读诊断

Session: 20261105T094057Z
Task: 165-diagnose-current-shell-focus
Status: diagnosis-returned; cause-undetermined
Implementer: native:/root/integration_final（sol medium）；无委派。

## 聚焦交接

当前原始失败仍有效，不能用本次诊断绿色覆盖。原result在第五case（390/en/paper）second Document、motion=reduce 的 Keep editing focus 超时；前四case无failure，并非五case都失败。原末态alert1、active Keep editing、draft仍connected且在aria-hidden祖先下。该末态仅证明确认框当时仍存在，不证明实际click已完成，也不证明只是焦点恢复失败。

在原允许的失败单组fresh诊断外，Root随后明确批准“一次原前5组顺序有界诊断”，已执行一次，保原完整verify/timeout、未删断言，未扩大66/858。两次均未复现：fresh单组passed1，原前5顺序passed5。**因果未定，不判flake、不提出未经证据支持的产品修复，也不裁定T04/T14通过。** Instrumentation改变了观察与事件时序，负载亦未做受控等价对照；不能据此归因为调度。

## 产物与验证

正式repo全只读，源/产物/QA冻结未修改。仅本REPORT和 /tmp/huhu-final-shell-focus-diagnosis 写入。私有candidate/scripts为独立副本，src及其它根为只读符号链接；从未写入链接目标或chmod。只改私有runner的计划选择和私有T04 driver的诊断记录，没有产品候选patch。

原失败输入：/tmp/huhu-t14-root-final3-matrix/children-eQduAX/T-04/result.json。读取完整最后case actions、errors、主图定位并追踪T04 click→DirtyModal→Sheet/AlertDialog→ModalLayer/DetailPane链路。当前关键9输入与原failed result的SHA逐项相同，并在诊断结束再次核验未漂移，完整清单保存在 /tmp/huhu-final-shell-focus-diagnosis/inputs.json 和 diagnostic-manifest.json。精确关键SHA：

- run.mjs：f11d56983f20bf75cdc43d2c0f9a20e1645fc3099af9ad3f217a16d2be5dbf1b。
- T04 index.mjs：b95e797f213fbd42f445cb1e7610befd3d90b47fb0183b1ee864cfe208665c7a。
- T04 index.tsx：16503a549def15a12cab5dd03e16607bb43ae944594829798769ab35e6ea19b5。
- dirty-modal.tsx：c94b48b37442302167244d3d934c984969ad782be6b39815ec018c0566d83b76。
- modal-layer.tsx：575ce1d21bfbd618e7669a962a77d10eb03b4fd94f5b37fc767f55301fc11185。
- styles.css：ae8a0e9196a784336a4a9dc2ee218b5dc6544fe20b818472e4f16ddc7696dca9。

诊断1命令：node /tmp/huhu-final-shell-focus-diagnosis/candidate/scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out /tmp/huhu-final-shell-focus-diagnosis/run1。私有计划限定390/en/paper/compact/desktop一组，原verify与exercise保留；退出0、passed1、errors=[]。记录main/second × system/reduce四次真实pointer/mouse/click/focus序列。此阶段旧listener每motion增加，部分trace会重复记录同一事件，不能按重复条目算重复点击；后续诊断2已用AbortController清理该观察器局限。

诊断2命令同上，输出改为 /tmp/huhu-final-shell-focus-diagnosis/run2-first5，私有计划只取原前5：320/en/paper、320/en/ink、320/zh/paper、320/zh/ink、390/en/paper。Root新增授权后执行一次；退出0、passed5、errors=[]。语法检查私有T04 driver退出0。未改等待时限或重试逻辑。run1.log、run2-first5.log、两result及实际截图均保留本地。

诊断2证据：20次Keep均有pointerdown→mousedown→pointerup→mouseup→click，事件target与预标记原Keep按钮同节点；点击前elementFromPoint均hit=true。英文点坐标(768.96875,567)，中文(829.9765625,567)，第二Document iframe为x0/y0/1440×1000，因此此对照无iframe坐标偏移。scope state=open、pointer=auto、z=50。10次reduce随后都有focusout→draft focusin，观察点alert0；system关闭有原动画，点击后短观察仍可alert1，随后原waitFor正常完成。原始细节含WeakMap节点身份、data-state、MutationObserver节点增删与事件时间戳；紧凑摘要在 trace-summary.json。

原失败与对照的可区分事实：原末态active Keep按钮无data-review属性，而诊断20次实际点击原目标都有keep-editing标记。原trace没有点击前后节点ID、pointerup/click目标或alert开闭轨迹，所以无法确认是按钮节点替换、属性移除、关闭后重开，还是命中了其它节点；不将标记缺失直接当节点替换结论。原click的前置hit校验只检查发CDP之前，不能证明其后点击已按预期到达；本次事件轨迹则只证明本次对照确实到达。

## 问题与下一步

本轮未得到原失败可复现因果，因而不满足“已确认根因”的结论条件。原第二Document失败仍待解决，源/driver当前SHA一致也不能排除运行时事件竞争。未验证原失败当次的真实mousedown/up/click目标、节点开闭顺序和负载因果；没有证据支持加timeout、盲重试、删除焦点断言、改CSS或产品focus顺序。

最小下一证据应在实际下一次必要T04运行保留失败当次按钮节点identity、pointer/mouse/click目标、alert data-state/增删与外层Sheet onDismiss/onOpenChange轨迹；Root接受后才把窄诊断留存接入正式driver，不能把本地instrumentation直接当修复应用。若要产品改动，应先捕获关闭/重开或丢click的真实链路，再提出精确hunk。按授权本轮不继续重跑。return0仅指诊断派单返回，停止全部读写释放。
