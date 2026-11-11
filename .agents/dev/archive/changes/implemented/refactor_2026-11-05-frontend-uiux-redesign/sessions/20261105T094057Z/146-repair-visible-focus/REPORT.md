## 聚焦交接

146完成共享焦点最小私有候选，Root单写；未写仓库源/产物/状态/Evidence/index。最终仅采用ready-v2，v1 ready保持冻结但已被v2替代，不应应用v1。T02需独立high增量；真正宿主fine/hover和正式T14仍由Root验收，不宣称整体通过。

根因已由真实Chrome+Obsidian app.css层叠和单变量实验确认：outline-none将--tw-outline-style设为none；更高优先级focus-visible:outline-2虽赢得outline-width:2px，却读取该none变量，因此outline-style仍none。base的.huhu-ui :focus-visible特异性低于neutralize的ID选择器及作用域化工具类，不能兜底；不是失去焦点或未进入focus-visible。旧Button在可信ArrowDown后focus-visible=true、none/2px/offset2；临时只移除outline-none就变solid/2px/变量solid，恢复该类又回none。实际matchedCSSRules和counterfactual保存在observe-cascade-old/result.json。

最小源修复仅src/ui/tailwind/index.css增加@utility outline-2 { --tw-outline-style: solid; }。Tailwind把其组合进现有outline-2及focus/focus-visible/关系变体，明确请求2px描边时恢复solid；不新增全局焦点引擎/重要性/ID堆叠，不遍改组件或模块，不动base/neutralize/date源码。输入glow控件没有outline-2，保持outline-none+强调边框/3px soft glow。

T02 fixture增加真实ScrollArea、DateField、Calendar样本；MJS在原verify中补真实focus-visible、outlineStyle/width/offset/可见accent颜色、输入无额外outline及3px soft glow/强调border。两Document、Button/Switch/Checkbox/Tabs/Tree/viewport/date-trigger/日历nav和day均覆盖；day按现有父格paint owner读样式。可信ArrowDown用于Button，其余可信Shift建立键盘模态且不改变库选择；保存/恢复iframe原style。disabled/unfocused维持none。新增Calendar使旧无作用域thead查询误选日历表头，v2仅将原Table head/body选择器限定[data-slot="table"]，批准36/52阈值未降、产品Table未改。

## 产物与验证

最终候选：/tmp/huhu-visible-focus-repair/ready-v2
补丁：/tmp/huhu-visible-focus-repair/ready-v2.patch
manifest：/tmp/huhu-visible-focus-repair/ready-v2-manifest.json
输入清单：/tmp/huhu-visible-focus-repair/input-v2-manifest.json
patch SHA256：715ee0bd29b506129a6c132fa6125ee978f30acc207b7815e59f6e5b0f4f0653
三路径before/after均0664；冻结后未覆盖。

| 路径 | before SHA256 | after SHA256 |
|---|---|---|
| src/ui/tailwind/index.css | 08c01b411916227fed17d4fff0dec2bfb248e6638fdcbbb9892dd0fa6182ce88 | cf11f28992f58bf2e875843e6080796970d97d191f3698cb41c371d87a766809 |
| scripts/ui-review/fixtures/frontend-redesign/T-02/index.tsx | 4840962378c0dfdba937800021c9dc7eaee26cb5c22d1dd65f9ace24b3aa2c98 | f12f1dd3f2b0dc39ed64e5d23ff67523af99349376543088577be0c1be8a8f27 |
| scripts/ui-review/fixtures/frontend-redesign/T-02/index.mjs | b0030e641e10490ebe6a1bb156661c4e474d065b12498a3155d66391c9c4710b | 962c3e7e7afd4ece756387c4eaa72ac2d1bda29da04735ff27fb641f7974f34b |

实际命令公共参数：`--suite frontend-redesign --ticket T-02 --matrix redesign --out /tmp/huhu-visible-focus-repair/<目录>`。

- 旧styles严格红灯：`node /tmp/huhu-visible-focus-repair/runner.mjs <参数>`，negative，工具退出126；可信ArrowDown后的none≠solid。后续完全相同最终v2 fixture+旧styles：`node /tmp/huhu-visible-focus-repair/v2-verify-runner.mjs <参数>`，v2-negative，工具退出126；先通过既有几何/组合检查，再准确红在新增Button outlineStyle断言，非编译/启动失败。
- 私有CSS编译：`node node_modules/@tailwindcss/cli/dist/index.mjs -i /tmp/huhu-visible-focus-repair/entry.css -o /tmp/huhu-visible-focus-repair/raw-final.css --optimize`，退出0；entry从真实原入口导入并附加候选精确delta；与先前raw.css的cmp退出0。`node /tmp/huhu-visible-focus-repair/assemble.mjs`退出0，用真实scope-tailwind和src/styles.json顺序私有组装styles.css，未构建正式产物。原styles SHA保持e5bc1f3ab5c0e1fa8e0299b4378497617e0a3039a5d1083c09c6cebd42c470a8。
- `FOCUS_CSS=/tmp/huhu-visible-focus-repair/styles.css node /tmp/huhu-visible-focus-repair/v2-verify-runner.mjs <参数>`，v2-verify，退出0：只取正式矩阵中既有960/zh/paper/teal/huhu/comfortable15与390/coarse/compact14两case；运行原verify及新增focusProof，未跑完整exercise/正式66。
- `FOCUS_CSS=/tmp/huhu-visible-focus-repair/styles.css node /tmp/huhu-visible-focus-repair/recorded-media-runner.mjs <参数>`，recorded-media，退出0：paper/ink × 非coarse/coarse四受控配对，两Doc共144条焦点/输入/负控记录。真实matchMedia写入每case.media：coarse两组在两Doc均coarse=true；非coarse两组实际fine=false/coarse=false/hover=false。不能将runner的fine标签当真实fine硬件。本utility没有pointer/hover媒体分支，四配对证明相应不变性，真实fine仍保留Root宿主复验。
- paint/result.json对应私有4配对退出0；本人通过view_image查看focus-button.png、focus-scroll.png、focus-calendar-day.png，Button完整2px环、viewport四边与日历父格描边实际可见，不只检查computed宽度。
- negative-boundary-comparison.json：72项逐字段旧/新配对完全相同，包括Input/Textarea/Select combobox/DateInput的outline/border/shadow、huhu-native/Markdown/CM/外部按钮及disabled/unfocused。原base对部分原生负控本就产生focus样式；这里证明无新增污染，不冒称旧base完全未影响原生。没有改这些负控阈值或来源。
- `node /tmp/huhu-visible-focus-repair/check-types.mjs`退出0，真实模块路径读取候选TSX及其真实依赖，0 diagnostics，types.log。`node --check /tmp/huhu-visible-focus-repair/tree/scripts/ui-review/fixtures/frontend-redesign/T-02/index.mjs`退出0。
- TSX ESLint stdin尝试退出0但文件被仓库规则忽略且提示1 warning，lint.log；不把此尝试称ESLint通过。正式产物/全仓检查由Root统一。
- staged raw SHA仍4258d835a7e5cf5c845a981d441a37baa14fb4c834097f83aedeb34e0fb653ec，未写index。

精确表头诊断：candidate-table-debug/result.json的第一个thead/tr/th均32px，th class为日历`h-8 w-[34px] ...`；htmlfont16px、--spacing .25rem。original-table-debug/result.json的正式Table thead/tr/th均36px，th class `h-9 px-3 ...`，htmlfont16px、spacing同。outerHTML/height/minHeight/lineHeight/padding/border均在JSON逐Document保留；这是选择器目标变化，非产品表格退化。旧无新增样本的私有960coarse自定义配对另在原hitOutside断言失败，未修改命中阈值；v2最终改用上述正式已有两case后完整verify通过。

## 问题与下一步

Root按v2 beforeSHA/mode应用三路径，重建正式styles/main后交high和真正宿主fine/hover复验；保持T14待验。实际fine尝试边界：headless blink pointer设置与CDP媒体覆盖均仍fine=false；独立profile的headed Xvfb启动CDP超时（0case），记录actual-media/cdp-media/headed-media结果，不以这些失败充当focus回归或通过证据。已停止扩大环境调查，未放宽focus断言。

未运行正式66/858、全仓build/lint/test、完整T02 exercise或真正Obsidian宿主；只读使用Obsidian ASAR app.css，iframe不是popout。未碰native144 profile/vault、用户库、账号、clipboard或设计。v1冻结目录不覆盖且已明确废弃；v2为唯一待应用候选。根因与最小接缝已确认，尚未完成的真实fine/hover门由Root统一，不伪改历史票据pass。

return: 0。停止全部读写并释放三路径，无待运行进程。
