# 150 Safe timer 下界驱动修订（dispatch0 / return0）

## 交接

仅修148 NATIVE-01，唯一私有候选为 scripts/ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs；未写仓库脚本、产品、其它8个probe、状态、Evidence或旧报告。Root单写应用。

候选冻结于 /tmp/huhu-native-timer-proof；ready.patch SHA256 08179e6b6882e40fa9b3ff476930d749340cacc482ebec7902c407b097c5f944。manifest.json记录before/after SHA与mode0644：before dfd1b94662851caffc7c1919b7f015f71eab8902de6973734318b6ef4e4c1ef2；after 823accb9723511e412b444f10dadd23aba5153b2b31aab786966b641e396a2a8。未覆盖144/148候选或报告。

## 产物与验证

已读150 TASK、148原报告与纯Node反例定位、当前host-boundaries及既有dev/ui/testing约束。本次最小差异仅第二次复制的时间判据：

- 原15秒后recopy、first-copy+31秒旧owner不误清检查保持；第二次await copy完成后立即记录secondCopiedAt，并将原firstCopiedAt、secondCopiedAt、probe/clear时间写入结果行。
- 第二次复制+29秒时检查nonce仍在，并要求实际观测完成仍早于30秒。若调度错过pre-deadline观测就失败，不循环重试copy或放宽检查。
- 明确从第二次copy观测完成起测量clear elapsed，要求29500–32000ms。500ms下界容差用于UI复制完成观测与timer起点之间有限差异，2秒上界用于原生timer/CDP轮询调度；18秒反例远不在容差内。沿原100ms轮询，剩余等待收紧至第二次copy+32秒，没有增大原20秒等待窗口或改产品CLIPBOARD_CLEAR_MS。

其余Safe/modal/lock/hidden/migrate/close/restart/assert/receipt与隔离守卫逐字保持。没有fakeClipboard、生产时钟替换或真正宿主时间加速。

实际检查：

| 命令 | 结果 |
| --- | --- |
| node --check /tmp/huhu-native-timer-proof/scripts/ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs | exit0 |
| node /tmp/huhu-native-timer-proof/timer-predicate.mjs | exit0，四项控制结论匹配预期 |
| git apply --check /tmp/huhu-native-timer-proof/ready.patch | exit0；只检查未应用 |

纯Node控制直接读取最终候选const copiedAt至clear check完整原片段，放入vm执行；不是重写断言。有限模型仅提供Date.now/delay/copy/clipboard/check/until，读状态按各模型deadline变化，没有加载Obsidian或访问原生clipboard。原片段和完整结果在 /tmp/huhu-native-timer-proof/timer-predicate-result.json，控制工具在timer-predicate.mjs，均只留本地。

| 模型 | 实际原片段结果 |
| --- | --- |
| recopy后正确30秒 | pass，first+45000ms，second+30000ms |
| recopy后18秒 | fail，first+44000ms的29秒前置检查拒绝 |
| 旧owner在first+30秒清空 | fail，first+31000ms旧owner检查拒绝 |
| recopy后50秒 | timeout fail，first+47000ms，即second+32000ms |

## 问题与下一步

本次没有运行真正Xvfb、Obsidian、clipboard、build、全仓测试或858，也未委派。纯Node正负模型证明新增判据拒绝148反例，不能当作真实30秒timer或T14通过。Root应用唯一冻结patch后须在最终冻结三资产、独立新Xvfb/新vault/私有HOME与假记录上运行真实host-boundaries，核对secondCopiedAt、29秒nonce观测和clear elapsed回执。

return0；候选、ready.patch、manifest与本REPORT冻结，停止全部读写并释放。不声明T14或真实剪贴板通过。
