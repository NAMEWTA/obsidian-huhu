# T16 最终差异焦点诊断与私有候选

Session: 20261105T094057Z
Task: 125-diagnose-final-diff-focus
Status: completed

## 聚焦交接

**确认存在真实产品连续重画失焦，同时原 driver 也会读到正常恢复前的空窗；不能仅加等待修复。** 在当前真实生产 fixture、Chrome 153.0.8010.47、单 case 加完整 exercise 中，捕获同一次 trusted Enter 的 copy DOM mutation、microtask、两次 onPostRender、恢复 RAF 和连续 paint：旧产品第一次 RAF 已恢复后，第二次库重绘再删除 gutter，第二 paint 仍无焦点。根因是 102 在第一次恢复 RAF 开头 release 焦点归属，后续同一库操作的重绘失去 owner；inline React 回调引起的重绘与库自身渲染并非单一同步批次。

私有候选只改 keyboard.ts 和 Root 拥有的 T16 index.mjs。产品保持该次键盘焦点归属直到移焦、metadata/Document 改变、隐藏、虚拟行消失或卸载，在每次真实 onPostRender 完成 gutter 绑定后同步恢复同 line/side，删除恢复 RAF；没有定时等待、循环聚焦、全局 fallback、另造引擎或改 MultiDiffView。driver 在有界生命周期后检查两个连续 paint，仍逐次要求真正 gutter 焦点、solid、2px，不能轮询到一次成功即通过。旧产品配同一稳定 driver 仍红，候选的完整 exercise 与晚重绘/取消控制均绿。

仓库始终只读，只有本 REPORT 写入；最终候选已冻结且停写，待 Root 单写应用和 high 独立复验。原正式 66 失败与所有本轮诊断失败原样保留；此结果不替代正式矩阵或真实 Obsidian。

## 产物与验证

### 实际症状与区分性时间线

过程根为 /tmp/huhu-final-diff-focus。before/ 与 before.json 保存开工真实 dirty 字节、SHA 和模式；repo-verification.json 证明四个只读输入最终 drift=[]，包括 keyboard.ts、DiffSurface.tsx、review-repairs.dom.test.tsx 与 Root index.mjs。依照 AGENTS/dev/ui/testing、TASK、102 已读实施合同与当前 DESIGN3（摘要 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）核验入口、现有 FileDiff 实现和两消费者生命周期；没有重选设计。

paired-lifecycle/result.json 是当前旧产品的精确单 operation 红灯（注入仅记录，不改变焦点策略）：

- second Document：13761.6ms trusted Enter 前 gutter1 真聚焦；13775.7ms copy mutation 与 microtask 已有复制条，active=BODY、无 shadow 焦点。
- 13775.4ms 第一 onPostRender 安排恢复；13790.9→13791.4ms 恢复 RAF 将 gutter1 聚焦，首 paint 为 solid/2px。
- **13794.1ms 第二 onPostRender 再次重绘，active=BODY；原 driver 13794.4ms proof=none；第二 paint 13806.5ms 仍 BODY。** 这不是仅早于第一次 RAF 读取。
- 同一运行的 main 展示另一种情况：copy mutation/microtask/首 paint 尚无焦点，随后恢复，第二 paint 稳定。两种现象均可解释原单 case 偶尔通过、正式 churn 后失败；没有把单纯时序推测写成根因。

私有 instrument 使用 esbuild onLoad 从本地观测副本加载，记录 performance 时间和真实 activeElement；原仓库源从未替换。observed-full-exercise 单次立即读恰在恢复后通过，随后 paired-lifecycle 真红才完成诊断。最初保留 owner 但仍使用 RAF 的探索候选在 proposed-detail 中再次证实：第二恢复也可能排在观察 paint 回调后，同帧出现空窗，因此最终改用库已经提供的 onPostRender 同步接缝，而不是再延长等待。

### 冻结交付

不可覆盖候选目录为 /tmp/huhu-final-diff-focus/proposed，补丁为 candidate.diff，清单为 candidate-manifest.json，清单 SHA256 **f7c486c4ed8190e8b886c6f9306626458a449f11211f53f6e79abae09a9190c1**。

- src/modules/versioning/ui/diff/keyboard.ts：before SHA256 00fb14f432bfdf108f703b5a3190225ddbebdceca64ff9f784ec29a46d3a579f；candidate **a160dad6b91b9ca2fe91493e2ae4908d31690a30112f19dc8972e5876dc7d304**；模式 0o664。
- scripts/ui-review/fixtures/frontend-redesign/T-16/index.mjs：before SHA256 655f399879b998b0b6b06d4bd29c1a2f275225aed53cf218172ab709d552eeea；candidate **bae6d10921a49d62f15ce895cdd4adc8cf0c793bfe958fdd1eb67bf7d300f73b**；模式 0o664。

keyboard.ts 继续复用同一节点 WeakMap、库 setSelectedLines 和两个消费者已有 bind/unbind；owner 中只保存当前 keyboard focus stint，没有全局 Document。用户 focusin 到其它控件立即 release；新的选区替换旧 owner；相同选区不再错误消耗归属；metadata/Document/可见性/真实当前焦点仍严格检查；虚拟行缺失与 unmount 释放。恢复在所有 gutter 的 tabindex/role/handler 绑定完成后执行，因此不存在延后 focus 循环。DiffSurface、MultiDiffView、词典、样式、产物与服务均未改。

driver 的两个 snapshot 分别位于 copy 出现后第二、第三个 owner paint；两个都须 keyboardFocus=true、outline=solid、width=2px，且 line 相同。保留原有后续严格焦点与 outline 断言，不放宽复制条、Next hunk 或资源断言。该有界观察不承诺掩盖任意迟到重绘；产品 owner 接缝负责实际每次 redraw。

### 命令、红绿与正常控制

以下均使用 --suite frontend-redesign --ticket T-16 --matrix redesign，只取既定 390/zh/paper/coarse 一个 case；没有执行 66。

- node /tmp/huhu-final-diff-focus/observed-runner.mjs ... --out /tmp/huhu-final-diff-focus/paired-lifecycle：预期红，工具退出 126，result.status=failed；上述真实 second-paint 丢焦。
- node /tmp/huhu-final-diff-focus/old-stable-runner.mjs ... --out /tmp/huhu-final-diff-focus/old-stable：预期红，工具退出 126；旧产品即使使用相同两 paint 稳定 driver，仍 keyboardFocus=false/none/0。
- node /tmp/huhu-final-diff-focus/old-control-runner.mjs ... --out /tmp/huhu-final-diff-focus/old-controls：预期红，工具退出 126；真实 FileDiff forceRender 晚重绘后 line=undefined。旧产品负控制不是编译失败或未执行路径。
- node /tmp/huhu-final-diff-focus/proposed-stable-runner.mjs ... --out /tmp/huhu-final-diff-focus/proposed-stable-final：退出 0；最终未插桩候选加最小 driver，单 case 与完整 exercise 通过，含两 Document 与全部原有断言。
- node /tmp/huhu-final-diff-focus/proposed-control-runner.mjs ... --out /tmp/huhu-final-diff-focus/proposed-controls-final：退出 0；只通过私有探针暴露真实已安装 FileDiff instance，不替换库。main、second 在正常 Enter 后再次真实 forceRender，均保持 line1/solid/2px；Shift+Enter 1→3 后再重绘仍 line3 且范围含 1、3；isComposing Enter 未选行；外部真实 button 聚焦后重绘不抢焦；hidden 后重绘不恢复，重新显示仍无旧焦点；使用不同 cacheKey 的真实新 metadata 后不恢复；卸载不迟到恢复。外部、隐藏、换比较、卸载 focusin 监听计数均 0。
- node /tmp/huhu-final-diff-focus/check-types.mjs：退出 0，types-final.log 为 Private candidate checked through real module path: 0 diagnostics。TypeScript CompilerHost 仅将真实 keyboard.ts 路径的内容换为私有候选，依赖仍走真实仓库声明，无伪造库类型或替身。
- pnpm exec eslint --stdin --stdin-filename src/modules/versioning/ui/diff/keyboard.ts --max-warnings 0 < /tmp/huhu-final-diff-focus/keyboard.proposed.ts：退出 0，lint-final.log 为空。

探索失败均保留且未冒称通过：proposed-stable/proposed-stable2 是仍用 RAF 的中间设计；proposed-controls 前两次误把初次异步高亮后已失焦的场景当作下一次正常 Enter 起点，驱动修正为独立操作明确 focus 后通过；proposed-synchronous-controls 的新 identity 控制使用相同 cacheKey，库正确判同目标，改成真实新 cacheKey 后 owner 释放得到验证。最终 immutable proposed/ 只有收敛后的两项交付，不含 traceFocus、focusHandles 或这些试验代码。

## 问题与下一步

无已知本次目标遗留失败。Root 核对 candidate-manifest 与 before 后单写应用，交 high 独立审查，再按其剩余正式矩阵额度验收；本任务没有把源文件写回、运行全仓检查、构建产物、真实 vault、系统服务或其它票矩阵。真实 Obsidian popout、多叶和 OS IME 不由 Chrome iframe/合成 composition 控制证明；全仓及正式 66 仍归 Root。原始正式失败 /tmp/huhu-t16-lead-theme-final/result.json 未覆盖。
