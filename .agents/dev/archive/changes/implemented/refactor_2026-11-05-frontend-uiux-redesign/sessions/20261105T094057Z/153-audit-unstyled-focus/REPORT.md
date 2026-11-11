## 聚焦交接

153只读核对完成，**确认共享通用focus fallback仍有缺口，未实施任何修复或生成候选**。当前146显式outline-2修复正常，但不带该utility的HU原生button没有可见键盘焦点。等152完整12面清单后由Root批量授权修，不扰当前矩阵。

精确生产调用：src/modules/agent/ui/dashboard/AgentBoard.tsx:159，Card的原生`<button type="button" className="flex w-full flex-col gap-2 text-left" onClick={select}>`，无disabled、负tabIndex或其它焦点类；默认可Tab。父article仅relative/rounded/border/bg/p-3及状态背景，没有focus-within表达。核对的是该真实class与父结构的DOM代表，不是完整Agent领域渲染、真实会话或交互数据验收。

真实当前CSS下，可信Tab在两个Document均到达该代表，active=true、matches(:focus-visible)=true、disabled=false；computed outline-style:none、width:3px、offset:2px、color:rgb(29,26,22)、box-shadow:none。宽3是none风格下的computed默认值，不能当可见宽度；目标没有2px描边，也无其它shadow焦点指示。父article在外部控件聚焦与目标聚焦前后outline/shadow/bg/border/color完全相同，未提供替代视觉反馈。截图已人工查看，只有常态卡边线，没有焦点环。

实际matchedCSSRules确认base.css:76 `.huhu-ui :focus-visible`的outline2 solid规则被neutralize.css假ID规则的`outline:none`覆盖（0,2,0低于1,0,1）；box-shadow也由中和规则清为none。146的outline-2 utility没有匹配这个普通button，因此不能修复通用fallback。不是无焦点/disabled/错误目标，亦不是Button显式utility再次失效。

## 产物与验证

过程目录：/tmp/huhu-unstyled-focus。没有ready/patch/候选。

- `node /tmp/huhu-unstyled-focus/runner.mjs --suite frontend-redesign --ticket T-02 --matrix redesign --out /tmp/huhu-unstyled-focus/current-parent`：退出0，单一paper/960受控样本、main/iframe两Doc，各7个控制，14次可信Tab。此命令断言准确症状与正常控制，退出0只表示诊断匹配，不是可见焦点合同通过。current-parent/result.json含焦点/实际媒体/目标与父outerHTML/parentBefore/parent、可信事件及CSS.getMatchedStylesForNode输出。
- `node /tmp/huhu-unstyled-focus/require-visible.mjs`：工具退出126，真正可见焦点红灯；准确失败在main裸button outline-style none≠solid，final-require-visible.log。消费上述真实浏览器结果，不是编译或启动失败。
- 对照：当前真实Button两Doc为solid/2px/offset2；Input保持outline none+3px soft glow；裸button为none+shadow none。huhu-native、Markdown、CM负控均保留当前既有solid2+宿主3px shadow，外部HU之外按钮保留宿主3px shadow；没有把这些不同的原有视觉来源误当本轮修改结果。没有改任何阈值。
- 实际媒体两Doc均fine=false/coarse=false/hover=false，即headless pointer:none；不冒称fine或真正宿主。关注的base/neutralize选择器本身无pointer条件。没有重跑全部focus、正式66/858或触碰Root native/profile。
- 本人用view_image查看current-parent/unstyled-keyboard-focus.png，目标已被可信Tab聚焦但卡片没有焦点描边；同屏常态border不是focus反馈。
- `python /tmp/huhu-unstyled-focus/audit.py`：退出0；全部2468个本次fixture编译/读取输入的前后SHA一致，两个代表父视觉前后一致，Root冻结main/styles/manifest摘要与mode完全匹配。audit.json保存逐输入摘要。before.json与final-after.json对11个关键生产/fixture/资产路径逐项SHA及mode完全一致，`cmp`退出0。模式均0664。没有写index或Root数据。

关键冻结输入（始末相同）：

| 路径 | SHA256 |
|---|---|
| styles.css | 76910cca33251303d7aa9b152b41d8e0d4485eec4335f9fc9d07e5f28d3e2548 |
| main.js | 9b281b1bf0c781809eaac219a1a65faa8eed96e2618c504478c15aec08a735fd |
| manifest.json | 416a808d099711bcfcf4194dfdce167b670e02bcbf22922a141658036692da16 |
| src/modules/agent/ui/dashboard/AgentBoard.tsx | d23c506361c810c1ed5199c0489fd85806aa1c28a07f2905593d8d3f9a59f5ac |
| src/ui/styles/base.css | 485591d5cbd015aa31e761eb6b861209a08418a2b85f8abeffc5484c6ba7d5b2 |
| src/ui/styles/neutralize.css | 6ac2c3366f79e84e31fc0248fcde909c20b8795d14ddd52219c67791fe7d569b |
| src/ui/tailwind/index.css | cf11f28992f58bf2e875843e6080796970d97d191f3698cb41c371d87a766809 |

## 问题与下一步

交Root的最小producer写集建议：共享fallback由src/ui/styles/base.css持有，在既有中和/工具类层叠关系中让HU普通可聚焦控件获得真实2px solid/offset2，保留Input/textarea/combobox的3px glow并明确原生内容边界；neutralize.css是必须共同核对的直接依赖，若选择改变reset合同再原子协调，不能盲叠!important。回归由T02 fixture TSX/MJS加入本普通button代表与正常Button/Input/原生负控。无需先遍改AgentBoard或所有模块，也不能只追加一个显式utility就声称通用fallback已补齐。具体CSS方案与写集以Root等152后的授权为准，本轮未编写方案代码。

未证明所有同类原生控件、真实Agent数据、全模块视觉、真实fine/hover/宿主popout；未build、全仓测试/类型/lint、正式矩阵、用户vault/账号/clipboard。保留这一已确认NFR缺口，不能将当前可见焦点合同或T14整体标通过。

return: 0。停止全部读写并释放；Root冻结输入未改变，无待运行进程。
