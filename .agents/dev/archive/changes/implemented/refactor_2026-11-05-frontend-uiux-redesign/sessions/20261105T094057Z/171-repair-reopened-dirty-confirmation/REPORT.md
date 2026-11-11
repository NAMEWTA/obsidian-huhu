# T02 模态原生事件归属修复候选（T04 消费者重开）

Session: 20261105T094057Z
Task: 171-repair-reopened-dirty-confirmation
Status: candidate-ready; Root integration and formal acceptance pending
Implementer: native:/root/integration_final（sol medium）；正式源唯一writer为Root。

## 聚焦交接

从当前第三轮T04实际32case失败的新轨迹出发，已定位一个可确定性复现的真实共享producer缺口：子确认框Keep click正确关闭后，父Sheet在该click结束后收到原pointerdown的迟到outside通知，重新requestOpen(false)，脏稿保护据此重新打开确认框。不是未点击，也不是确认框还没关闭的单纯focus恢复问题；不推定flake。原formal新轨迹为 /tmp/huhu-t14-root-final4-matrix/children-b41Hso/T-04/result.json，第32组960/zh/paper/indigo/huhu/comfortable15/main/reduce，旧alert id2 closed/卸载后新alert id5 open，事件记录未丢。

按Root后续接受，归共享T02 producer，只写私有六路径候选：src/ui/react/modal-layer.tsx，src/ui/components/sheet.tsx、dialog.tsx、alert-dialog.tsx，以及既有sheet.dom.test.tsx、modal-layer.dom.test.tsx。**dirty-modal业务保持原样**，T04仅消费、原完整verify不改，产品源/资产/状态/Evidence均未正式写入。本轮无正式build/66/858/native。

## 产物与验证

### 因果路径与旧red

实际编译图使用Radix Dialog1.3.1、DismissableLayer1.2.1、FocusScope1.3.1。DialogContentImpl在真实依赖index.mjs:266设置deferPointerDownOutside=true，:267的onDismiss调用context.onOpenChange(false)；DismissableLayer的usePointerDownOutside在click及其setTimeout(0)后派发先前的original PointerEvent，:58调用onDismiss。事件目标此时可以已经脱离DOM，所以迟到时只看当前top、composedPath或target.isConnected不足以判断归属。

私有实际Sheet+Alert回归在Keep真实自动focus时设置明确屏障：focus本身仍调用原生实现，然后从该按钮发原生pointerdown，待确认框挂载完成后发pointerup/click。未调用或mock requestOpen、未改Radix内部实现、未增加timeout。旧源码确定性重开，exact field focus断言红。私有debug仅记录实际requestOpen/confirmation变更与Sheet onPointerDownOutside调用栈；原失败末态与此受控同路径一致，但不把受控栈冒充原formal当次未记录的栈。

真实顺序保存在 /tmp/huhu-dirty-confirmation-repair/causal-trace.json、dom-red-trace.log：confirmChange(false)1329.23 → sheetOutside(original type=pointerdown,target=BUTTON且已disconnected)1342.35 → requestOpen(false,confirm=false,open=true,dirty=true)1343.10。最后requestOpen栈包含DismissableLayer.usePointerDownOutside:58 → Dialog.onDismiss:267 → useDirtyModal.requestOpen。旧red日志为1 failed exact-focus断言，终端包装返回126；不是以未复现绿色结论替代红灯。初始私有原失败单组debug执行曾passed1，仅作为trace对照保留，不称该次复现。

### 最小修复与所有权边界

useModalContent在原生pointerdown capture时，用WeakMap以原PointerEvent为key保存当时actual ownerDocument、origin entry symbol，以及当时同Doc逻辑owner链和该Doc既有ordered modal stack里origin以下的owner IDs。所有集合在捕获时一次生成，迟到处理不读当前DOM、当前top、变动后的ownerParent或composedPath。Entry不需要复制到事件里；只保留symbol与Doc，Event弱键释放后不引入监听器/定时器或持久状态。

迟到outside只在该原事件的不可变lower-owner集合包含当前entry且origin不是自身时preventDefault。没有owner记录、其它Document、origin以上/无关owner仍按原Radix路径处理。父/子迁移或关闭重渲染不会重写旧快照；同Doc独立React根的openReactDialog实际createRoot场景不能共享React context，因此同Doc已存在的ordered stack快照是必要补充，不只沿逻辑ownerParent。

接线精确为useModalContent的三个真实消费者：SheetContent、DialogContent记录capture并在原props outside handler之后应用归属guard；AlertDialogContent只记录capture（其类型/API原本不允许outside handler，Radix已处理其自身outside保护）。原props capture/outside回调保留，用户已preventDefault则不覆盖。Alert子事件仍可执行Keep/Discard；guard只阻止它在迟到父通知中变成背景关闭。没有时间窗口、重试、吞全部outside、强制focus或改变dirty/discard逻辑。

### 实际验证与冻结

私有工作树 /tmp/huhu-dirty-confirmation-repair/diagnostic 的src/scripts为独立副本，候选根 /tmp/huhu-dirty-confirmation-repair/candidate，六文件nlink1；其它根链接仅只读，未写Node依赖或正式源。所有最终候选和正式before SHA在冻结时重新匹配。

- 旧red：实际私有Sheet DOM屏障focus断言失败，调用栈如上；日志dom-red.log、dom-red-trace.log。
- 最终DOM：node /home/wta/projects/obsidian-huhu/node_modules/vitest/vitest.mjs run --project dom src/ui/components/sheet.dom.test.tsx src/ui/components/huhu/DetailPane.dom.test.tsx src/ui/react/modal-layer.dom.test.tsx，退出0，3文件16/16，dom-final.log。回归包括原真实deferred事件红转绿、精确原field/selection、下一次合法outside仍开启dirty确认、Discard关闭/还焦，以及原DetailPane保节点/草稿/selection/scroll/presentation与现有modal嵌套/关闭行为。
- 新owner边界回归以真实render与pointer capture调用hook，补独立React render根的同Doc lower-owner保护、原事件path被清空、target脱离、parent adoption且Provider rerender后旧事件仍按快照保护；捕获于另一Document的modal事件与未capture的foreign外部事件均不跨栈吞掉。它们是所有权方法边界验证，不冒充独立popout像素证据。
- 最终真实组件单失败输入：node /tmp/huhu-dirty-confirmation-repair/diagnostic/scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out /tmp/huhu-dirty-confirmation-repair/single-final-candidate，退出0、passed1、errors=[]。私有runner只筛选原960/zh/paper/indigo/huhu/comfortable一组；driver是正式原driver独立copy，原verify+exercise全部执行，含2Doc/2motion/脏稿节点/selection/scroll/焦点/清理，未删原断言。原先仅逻辑owner策略的single-candidate通过仅作中间记录，最终以single-final-candidate为准。
- 四生产源定向ESLint退出0、零输出，eslint-final.log。源码随后只增加ReadonlySet类型及有意义Doc/多根测试，最终ESLint输入已覆盖最终冻结生产内容。
- node .../typescript/bin/tsc --skipLibCheck --noEmit --pretty false -p tsconfig.test.json，退出0，types-skipLibCheck.log为空。第一次误未带项目规定skipLibCheck，只有依赖声明错误（无src错误），types.log保留；该失败不称通过。
- 私有pnpm exec最初因依赖环境预检提出非TTY安装后中止，未执行测试；后续直调已安装的Vitest/TypeScript/ESLint，无依赖安装。首轮私有config定位错误也已在本地纠正，不涉及正式文件。
- git apply --check /tmp/huhu-dirty-confirmation-repair/ready.patch：退出0，未apply。

独占冻结包：/tmp/huhu-dirty-confirmation-repair/ready.patch、manifest.json、frozen-files.json。manifest逐一列出六路径before/after SHA256与mode（均保持0o664），精确候选定位及实际验证。patch SHA256 e5ce943aeee0776004f4e2812c9effe53b0756357b138b417a8b460b0433dc2f。冻结后未修改候选；不把repo既有staged/unstaged设计改动计作本派单diff。

## 问题与下一步

候选共享producer已在确定性真实Radix DOM路径取得旧red→新green，并通过受影响单组真实浏览器原verify；尚待Root独立high审、正式应用后的构建/工程检查、真正宿主与T04原全66及G-FINAL新输入验收。三轮原矩阵历史不重置；当前private passed1不冒完整矩阵或原生popout通过。

若独立审查暴露新的owner边界，沿固定包增量修正，不修改已冻结包或用无关重构扩大范围。所有正式源/资产仍保持Root原冻结输入；交付仅供Root核对before SHA后应用。return0后停止全部读写并释放。
