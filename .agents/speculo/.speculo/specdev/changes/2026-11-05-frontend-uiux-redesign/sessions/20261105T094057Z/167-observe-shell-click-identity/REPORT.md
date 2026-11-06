# T04 Keep editing 点击观测单driver候选

Session: 20261105T094057Z
Task: 167-observe-shell-click-identity
Status: candidate-ready; original-cause-undetermined
Implementer: native:/root/integration_final（sol medium）；正式源唯一writer为Root。

## 聚焦交接

只为下一必要T04原66保留失败当次证据，不修产品、不推定flake。165未复现的边界完整保留：原第五case second/reduce失败仍有效；fresh单组与获批原前5顺序均未复现，不覆盖原failed。

唯一候选 scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs。原click仍是同一次evaluate取点、原elementFromPoint断言、原两次CDP mousePressed/mouseReleased与原tick；仅在既有evaluate返回point前同步记录实际dispatch点。Keep步骤原关闭确认框且exact draft focus条件、原waitFor/timeout、原失败trace与原throw保留，外包观察器生命周期。dirty/discard、双Document、两motion、66矩阵、生产源与预算均不改，无新重试、延时、强制focus或手动close。

## 产物与验证

候选根 /tmp/huhu-shell-click-observation/candidate；仅一个driver独立copy（nlink1），未写正式源/产品/产物/状态/Evidence/其它QA。Node有限控制脚本仅在 /tmp/huhu-shell-click-observation/observation-control.mjs，不入库、不新增测试框架。

新增专用观察器只在已标记Keep editing后创建，监听本ownerDoc的pointerdown/mousedown/pointerup/mouseup/click/focusin/focusout。WeakMap给目标/实际事件target/active/alert节点分配身份；记录同目标标志、事件坐标、pointerType/button、捕获阶段defaultPrevented；当前与MutationObserver快照记录target是否仍选中、是否connected、active和alert列表/data-state。操作前、dispatch-point、after-click及最终成功/失败快照均留存。新记录不读textContent/value、不保留草稿/用户内容，不操作DOM/focus/业务。实际click point新观测仅留x/y/hit/scope，不复制原helper的文本字段。

事件数组最多128项，超出仅计dropped；最终current独立保存。每Keep步骤finally在浏览器端read后立即abort全部listener、disconnect observer并delete临时global；部分setup失败也abort/disconnect。正常和失败统一加入sample.actions的keep-editing-observation，原失败仍抛出；若cleanup异常则记录独立错误，存在原失败时不覆盖原错误，原步骤成功时cleanup错误继续失败。没有把采集异常当passed。

实际命令与结果：

- node --check /tmp/huhu-shell-click-observation/candidate/scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs：退出0。
- node /tmp/huhu-shell-click-observation/observation-control.mjs：退出0。实际导入候选中的观察函数（仅把既有radix import定位到正式只读绝对URL），用有限EventTarget/MutationObserver控制验证同/异target身份可区分、Alert open→closed→移除、原目标断开/选中改变、active转draft、无PRIVATE text/value、300事件后records=128且dropped增加、stop后listener=0且observer断开、stop后事件/mark不再写入，以及observe抛错时已注册7监听均abort。不是源码字符串匹配测试，也不模拟产品逻辑来判通过。
- git apply --check /tmp/huhu-shell-click-observation/ready.patch：退出0，未apply。

165现成真实组件证据有界复用：/tmp/huhu-final-shell-focus-diagnosis/run2-first5/result.json、trace-summary.json 与 diagnostic-manifest.json，原前5一次运行的20次Keep完整真实事件、10次reduce后draft恢复/alert0，证明这种节点/事件/Alert观测可区分正常路径。该次是旧私有instrumentation，不能称本精简候选已跑组件或原缺陷已修复。

独占冻结且不覆盖：/tmp/huhu-shell-click-observation/ready.patch 和 manifest.json。原driver before SHA256 b95e797f213fbd42f445cb1e7610befd3d90b47fb0183b1ee864cfe208665c7a；候选after SHA256 90b41c9458a57c790c668739bfb589d5477a6d30ba27b47a4e8a4f914050d7b5；mode均0o664。patch SHA256 d32b632c4523ca70938329ac08a747e73ffb9f2f933d964f880a225692cb1054。冻结结束正式before再次匹配，未变。

## 问题与下一步

本轮未跑任何组件、66/858、构建或native。单driver候选尚待Root独立高审、当前父matrix结束释放输入后核对SHA应用；下一次正式T04仍须原66和所有断言，保留新失败当次轨迹再判断click未到达、节点替换/重开或焦点恢复顺序。128上限超出时dropped明确提示观察不完整，最终snapshot仍保留；不能把观测造成的时序变化或一次绿色当因果/flake结论。

无产品修复授权请求，无正式状态推进，不裁定T04/T14pass。return0后停止全部读写释放。
