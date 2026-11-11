# 终端重显挂起诊断

Session: 20261105T094057Z
Task: 147-repair-terminal-reveal
Status: completed

## 聚焦交接

已用冻结产物和真实本地 PTY 确定根因：共享 DetailPane 在 Sheet → inline 切换的 ref 提交阶段搬移保留内容并同步恢复焦点，早于旧 Radix FocusScope 的被动清理。旧 trap 的 container 已断开，而 lastFocusedElement 是已搬到 inline 的 WorkspaceTools tablist；它与 Tabs roving focus 在 tablist 和 control tab 按钮间同步递归。JumpPalette、xterm、PTY helper 不属于本次根因。已向 Root 申请 src/ui/components/huhu/DetailPane.tsx 与 DetailPane.dom.test.tsx 的精确共享生产者权限；本轮未获得新增授权，因此未生成或应用候选。此 completed 仅表示诊断交回，不表示 T-09/T-14 修复或验收完成。

## 产物与验证

- 真实旧红：/tmp/huhu-terminal-native-repair/owner-red-01/evidence/paused.json、cpu-profile.json、focus-owner.json。冻结 plugin=/tmp/huhu-t14-final-artifacts/plugin，helper=/tmp/huhu-final-native-binaries/huhu-pty。脚本为 /tmp/huhu-terminal-native-repair/diagnose-owner.mjs，沿用144诊断步骤，仅在挂起后用 Debugger.evaluateOnCallFrame 读取真实闭包和 DOM。
- DOM 证据：handleFocusOut 的 c 为 data-slot=sheet-content、标题“终端控制”、connected=false；b.current 为 WorkspaceTools role=tablist，connected=true、visible=true，祖先包含 inline ASIDE；F.relatedTarget 是 control tab 按钮；E.paused=false；Document 中 dialogs=[]。
- 最小调用链：AgentWorkspacePage.tsx:236 默认 control 详情 → DetailPane 的 ResizeObserver 按父宽决定 Sheet/inline → DetailPane.tsx:79–90 的 target ref 搬 host，调用 focusEditor → 旧 Radix handleFocusOut → focus(lastFocusedElement) → WorkspaceTools.tsx:31–47 的 Tabs/RovingFocusGroup → focusFirst(control tab) → 旧 handleFocusOut 循环。
- 真实单变量对照：/tmp/huhu-terminal-native-repair/control-closed.mjs 只在离开终端前把真实页面已有 view.control 设 false，其他冻结产物、PTY、流程和断言不变。执行退出0；两个 nonce、两会话、关闭重开、Task → Home → Terminal、输出保留与 console-clean 全通过。证据 /tmp/huhu-terminal-native-repair/control-closed-01/evidence/terminal-merge.json。此对照确认故障依赖该 DetailPane，不是修复交付。
- 命令均为 HUHU_PTY_BINARY=/tmp/huhu-final-native-binaries/huhu-pty HUHU_PLUGIN_SOURCE=/tmp/huhu-t14-final-artifacts/plugin HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_ACCEPTANCE_PORT=9447（对照9448）xvfb-run -a -s '-screen 0 1600x1100x24' node <上述脚本> <全新root>。旧红抓栈后按真实进程树回收，退出137，清单 /tmp/huhu-terminal-native-repair/owned-cleanup-red.json；对照正常退出0。无真实用户库/账号/外部写入。
- 未修改生产源码、构建产物、Rust、领域、测试预算或重试设置；未生成 ready.patch/manifest。未运行 build/lint/DOM tests，因为尚无源码候选。

## 问题与下一步

Root 需要接管共享生产者，或给新任务精确授权这两个 DetailPane 文件。建议最小候选：target ref 仅搬保留 host、恢复滚动；inline 的编辑器焦点恢复放到 React passive effect，在旧 Sheet trap 清理之后执行；进入 Sheet 仍由既有 onOpenAutoFocus 在新 scope 内恢复。该方案尚未实现或验证，不宣称新绿。需要增加真实 Radix Tabs 内容的 Sheet → inline 回归，并覆盖现有 draft/selection/scroll 测试，再用同一冻结 native 脚本验证候选的默认 control 打开路径。其他消费者有 task/automations/safe，验证共享呈现切换与关闭恢复；不需要更改这些模块的领域源。所有本轮自有 fixture 进程已停止，return0 后停止读写并释放。

**最终续验回执（保留以上首次诊断交接原文）：** 首次报告落盘后、正式 return 前，Root 消息确认 Map56/T09 已授权 DetailPane 两文件私有候选，并把授权追加到 TASK；以下最终结果替代上文“未获新增授权/尚无候选”的停点。生产源仍完全由 Root 单写。

- 最终候选：/tmp/huhu-terminal-native-repair/ready.patch；清单 /tmp/huhu-terminal-native-repair/manifest.json；只含 src/ui/components/huhu/DetailPane.tsx 与相邻 DetailPane.dom.test.tsx。原模式均0o664并保留。patch SHA256=3d94c4b75122083b2b958121188d9a14fdb8498f8a103aa8f338ce1b8e5182f3。git apply --check 退出0。所有 before/after SHA 在清单内；源最终CAS仍等于初读before。
- 实现：ref仅搬 host/恢复滚动，inline 编辑焦点通过 React passive effect 在旧 Sheet trap 清理后恢复；Sheet 保持原 onOpenAutoFocus。无timer、sleep、retry、预算、xterm、Rust、领域或消费者源改动。
- 私有实际编译：node /tmp/huhu-terminal-native-repair/build.mjs 退出0，产物 /tmp/huhu-terminal-native-repair/plugin/main.js，SHA256=9b281b1bf0c781809eaac219a1a65faa8eed96e2618c504478c15aec08a735fd。候选styles/manifest直接继承冻结plugin；另用同生产build options和before源实际编译 baseline，main.js SHA256=c9a47f6a7a765a6fa78bcad8318e90f909d16d4411eea346d1cfebffcea5b7d1，与冻结plugin逐字节一致。证明真实native红绿之间唯一生产差异为该DetailPane修复。
- 新DOM回归用真实 Sheet/Radix Tabs，记录 inline 恢复 focus 是否早于旧 focusout listener 清理；仅在旧回路发生前拒绝那一次不合法focus，使旧红有界并给出准确断言，未替换库。before+新测试：exit126，unexpectedFocus实际["BUTTON"]，预期[]，见 /tmp/huhu-terminal-native-repair/dom-red.log。after+新测试+全部现有 DetailPane 和 modal-regressions：39/39，exit0，见 dom-green.log，既有草稿、同一editor实例、input selection、scroll、dirty-close和来源恢复回归保持通过。
- 私有候选检查脚本 /tmp/huhu-terminal-native-repair/check.mjs：生产源遵守仓库 ESLint 配置，0错误/0警告；tsconfig.json、tsconfig.test.json 与项目build相同 skipLibCheck/noEmit，使用只读 compiler-host 两文件替换，均0 diagnostics，exit0。相邻测试按仓库规则不属于ESLint目标，由测试类型检查覆盖。初次检查脚本漏 skipLibCheck 引发外部库声明错误，已纠正为项目build既有选项，未更改项目配置或规则。
- 同完整真实 PTY 脚本新绿：HUHU_PLUGIN_SOURCE=/tmp/huhu-terminal-native-repair/plugin、port9450、新root /tmp/huhu-terminal-native-repair/candidate-green-02，144原 terminal-merge.mjs 全部7项通过，exit0。默认 control 面板保持打开；两nonce、两会话、关闭重开、Task→Home→Terminal、输出保留和console-clean均过。
- 补充轴：/tmp/huhu-terminal-native-repair/terminal-axes.mjs、port9451、新root candidate-axes-01，原流程外增加1session先做Task→Home→Terminal，再2session/关闭重开/同样往返，最后真实可见textarea恢复输入焦点并输入新echo，验证原进程仍可响应。10项全部通过，exit0。证据分别在上述root的evidence/terminal-merge.json；截图在对应evidence目录。没有调timeout或重试。
- 失败历史保留：最初私有文本替换因缩进未匹配，未删掉ref同步focus，造成无效候选 candidate-green-01 仍红及首次DOM同步挂起；回读后纠正实际删除，重新编译产生以上最终SHA。该次不得作为最终方案失败或任何通过证据，进程已定点回收，清单 cleanup-incomplete-candidate.json。
- 自查两轴：diff仅共享producer和紧邻回归；现有React/Radix焦点所有权、草稿/selection/scroll保持，设计无视觉变更；DESIGN3 UX-AGENT-1与§7浮层焦点合同沿用，未关闭默认control或trap换绿。未验Windows/macOS/popout真实平台，也未代Root运行正式工作区build/lint与整体T14验收。Root应CAS应用两源、按T02 producer批次构建产物并继续全局验收。
- 最终已核对本轮 /tmp/huhu-terminal-native-repair 所有native/check/vitest进程无残留；return0 后停止读写释放。T09/T14正式状态和原Evidence不由本执行者修改。
