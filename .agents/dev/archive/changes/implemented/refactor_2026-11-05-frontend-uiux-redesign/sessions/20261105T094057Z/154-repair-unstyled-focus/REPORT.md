## 聚焦交接

154完成最小三路径私有候选，Root当前矩阵/152冻结输入保持原样；未应用生产源、资产、正式状态、Evidence或index。ready已独占冻结，等Root批量应用及独立high增量；不把待集成候选称T14通过。

修复接缝：保留base原低特异性focus规则以保持当前边界，再为HU默认focus-visible增加**单个既有假ID**的(1,2,0)规则，精确高于neutralize的(1,0,1)。规则仍位于工具类之前，和普通outline-none utility的(1,2,0)持平，故后面的作者utility继续赢；显式focus utility更高。未!important、未堆第二ID、未改neutralize或146 Tailwind utility。新规则排除Input/textarea/combobox、native/Markdown/CM边界及dialog/alertdialog容器，默认裸button得到批准的2px solid+2px offset+focus token。没有遍改AgentBoard或其它模块。

T02真实共享根新增AgentBoard:159同class/父article的可Tab原生button，以及普通HU button；另含作者outline-none、显式inset outline和ring控制。既有146焦点/输入/native/disabled/unfocused控制保留；临时Dialog/Sheet容器只在focusProof期间创建并删除，不干扰原modal流程。默认两控件和作者控制由实际Tab进入，记录keydown/keyup的isTrusted与keyup真实目标，不用轮询refocus。两Doc焦点proof记录实际pointer媒体。

确定性结论：最终同一fixture+旧CSS红在unstyled-agent outlineStyle none≠solid；仅替换base后，两默认button在两个Doc、paper/ink、非coarse/coarse下均solid2/offset2/正确accent。作者outline-none仍none且无shadow，作者ring仍只有原3px soft glow，显式inset outline保持solid2/offset-2；输入glow/非HU边界和modal容器不新增描边。实际截图已人工确认默认Agent代表四边描边在父article内完整可见。

## 产物与验证

唯一冻结候选：/tmp/huhu-unstyled-focus-repair/ready
补丁：/tmp/huhu-unstyled-focus-repair/ready.patch
manifest：/tmp/huhu-unstyled-focus-repair/ready-manifest.json
输入清单：/tmp/huhu-unstyled-focus-repair/input-manifest.json
patch SHA256：957f54e8c4f1f281bd27c4a831521cfb83ad42dec38dc1da8d88eaabccab1553
所有before/after mode0664。冻结后未覆盖。

| 路径 | before SHA256 | after SHA256 |
|---|---|---|
| src/ui/styles/base.css | 485591d5cbd015aa31e761eb6b861209a08418a2b85f8abeffc5484c6ba7d5b2 | af1a6aba05dfc7c0853796b6ceb2c367907688590289bad61050b7da9a27cb6c |
| scripts/ui-review/fixtures/frontend-redesign/T-02/index.tsx | f12f1dd3f2b0dc39ed64e5d23ff67523af99349376543088577be0c1be8a8f27 | 48b736f2b5d9e0f4e8967d7c72ad5f6087e49930c8af32404a6dd8247400f2a8 |
| scripts/ui-review/fixtures/frontend-redesign/T-02/index.mjs | 962c3e7e7afd4ece756387c4eaa72ac2d1bda29da04735ff27fb641f7974f34b | b01c70a9df32ab866cc875b421677d31a12b08c7710c54f4bd445864bf46c1b9 |

命令公共参数：`--suite frontend-redesign --ticket T-02 --matrix redesign --out /tmp/huhu-unstyled-focus-repair/<目录>`。

- `node /tmp/huhu-unstyled-focus-repair/observed-runner.mjs <参数>`，final-negative，工具退出126：最终fixture+真实旧styles，真实Tab keydown/up均trusted，keyup target为目标，active/focus-visible=true，但outline none≠solid。准确症状红灯，非编译/启动失败。
- `node /tmp/huhu-unstyled-focus-repair/assemble.mjs`，退出0：当前冻结styles中唯一base作者源精确替换为候选，私有生成styles.css；不重编Tailwind、不写正式styles/main。浏览器实际应用该完整CSS且记录matchedCSSRules，新增(1,2,0)默认规则赢过中和声明。
- `FOCUS_CSS=/tmp/huhu-unstyled-focus-repair/styles.css node /tmp/huhu-unstyled-focus-repair/observed-runner.mjs <参数>`，final-positive，退出0：paper/ink × 非coarse/coarse四有界配对，两Doc，共200条默认、显式、输入、作者和边界记录。每个新默认目标的style/2px/offset2/颜色与真实可信Tab均有断言。final-positive/result.json保存defaultFocusCascade、key证明、实际媒体和计算值。
- `FOCUS_OBSERVE=1 node /tmp/huhu-unstyled-focus-repair/observed-runner.mjs <参数>`，final-observe-old，退出0：仅观察相同最终fixture的旧CSS，用作逐属性配对，未当可见焦点合同通过。两份运行唯一样式差异为base。
- `python /tmp/huhu-unstyled-focus-repair/compare.py`，退出0，boundary-comparison.json：184项旧新控制对照，其中168项style/width/offset/color/shadow/border（或disabled/unfocused）逐属性完全不变；16项作者none/ring的style/shadow/border保持，outline仍不绘制，其未绘制的computed width从3px变2px、color从前景变accent，源于较早fallback的长属性留存。没有将这16项虚报逐属性完全一致，ring绘制仍只有原soft3px，不新增双框。
- `FOCUS_CSS=/tmp/huhu-unstyled-focus-repair/styles.css node /tmp/huhu-unstyled-focus-repair/verify-runner.mjs <参数>`，final-verify，退出0：正式已有960/zh/paper/teal/huhu/comfortable15与390/coarse/compact14两case的**原verify+扩展focusProof**；原36/52表格、尺寸/命中/组合断言未改。未跑完整exercise或正式66。
- `node /tmp/huhu-unstyled-focus-repair/stylelint.mjs`，退出0；真实项目stylelint配置检查候选base，0 warnings/invalidOptionWarnings/parseErrors，stylelint.log。
- `node scripts/lint-css.mjs --check-token-file /tmp/huhu-unstyled-focus-repair/tree/src/ui/styles/base.css`，退出0，token-guard.log。
- `node /tmp/huhu-unstyled-focus-repair/check-types.mjs`，退出0，真实T02模块路径读取候选及真实依赖，0 diagnostics，types.log。`node --check /tmp/huhu-unstyled-focus-repair/tree/scripts/ui-review/fixtures/frontend-redesign/T-02/index.mjs`退出0。
- 本人通过view_image查看final-positive/default-focus-painted.png，完整accent描边已实际绘制，父article padding容纳2px+2px，不只看computed宽度。
- freeze.py退出0；ready三路径before仍等真实workspace；root-audit.json确认Root3冻结artifact摘要/mode未变、153的11关键源SHA/mode未变、2468本次读取输入SHA前后未变。main9b281b1...、styles76910cca33251303d7aa9b152b41d8e0d4485eec4335f9fc9d07e5f28d3e2548、manifest416a808d...全匹配/tmp/huhu-t14-repaired-final-artifacts/manifest.json。未写index。

实际媒体：非coarse样本在headless为fine=false/coarse=false/hover=false（pointer:none）；coarse样本在两Doc均coarse=true。名称fine不当真实fine硬件证据。新默认选择器无pointer/hover条件；真正fine/hover由Root后续宿主复验。当前native/Markdown/CM负控保留旧低特异性规则下的已有样式，本轮证明无新增污染，未声称旧边界完全无HU样式。

## 问题与下一步

Root等152完整图审后按manifest核beforeSHA/mode，批量单写三路径、重建正式产物，交high并统一最终门。shared base是唯一产品写集，T02两文件只加强真实回归；neutralize/Tailwind/Module均未改。作者特殊样式验证针对既有utility表达，不伪称所有未来任意CSS的优先级都已审。

未跑正式66/858、全仓build/lint/test、完整T02 exercise、真正Obsidian/fine/hover/popout；未触用户vault/账号/clipboard或其它派单。没有降低阈值、隐藏失败、改设计/旧报告/状态；当前Root矩阵输入完全未受影响。

return: 0。停止全部读写并释放三路径，无待运行进程，ready不可覆盖。
