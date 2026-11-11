# 144 当前真实宿主驱动候选（dispatch0 / return0）

## 交接

已按 TASK 与132旧审计执行私有候选适配；仓库脚本、产品、构建、状态及 Evidence 均未写入。正式脚本由 Root 单写应用，T-14 仍待最终正式验收。本 REPORT 是本次唯一仓库写入。

候选已冻结于 /tmp/huhu-native-final-proposal；ready.patch SHA256 为 5032e3a75c45b473474d0b2784df30d2189857e1e3e4f2b64c3be4c70e04e136。manifest.json 逐项保存8个现有文件及1个新文件的 before/after SHA256、mode、nodecheck退出码。冻结后不再写这些候选。cdp.mjs 是未改动的本地运行依赖副本，不在 patch/manifest；本地 node_modules 软链接只供既有 comments 的 esbuild 导入，不入库。

精准写集：scripts/obsidian-acceptance/{workbench-probe,workbench-window-owner,terminal-merge,versioning-history,theme-matrix,navigator-restored-leaf,comments-edges,fresh-vault}.mjs，以及新增 scripts/ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs。没有新增 helper、runner、页面或引擎。143 的 integration/index/test 与中央 run 两源未触碰。

实施前已回读实际入口、调用方与依赖。必要适配：fresh-vault 保留原 launcher/lifetime，仅复制三资产后 expected/installed SHA receipt，并记脚本/native输入；workbench 等待真实 native surface，而非 rail active/旧文字，覆盖11真实rail+native notes；Diary 的真实路由是 navigator/diary，automations 是复数；terminal 的外层虽然为Radix menu，内部仍是cmdk Command.Item，现role=option合法，未盲改menuitem；history 按当前 data-note-history/data-choice-key 与 Pierre Shadow pre，保留原Git/恢复/草稿/多叶/Worker/重启/popout断言；theme 将旧全局17preset迁到当前root契约，保留独立Markdown schemes、字体、三种原生编辑器模式、preview和卸载恢复；comments 按精确面板动作跳转和保留选区的当前语义检查可见高亮。Unified 是批准设计替换掉的旧第三布局，本报告明确记替代，未称三个旧布局均保留。

## 产物与验证

静态最终候选：9个 node --check 均 exit0；git apply --check /tmp/huhu-native-final-proposal/ready.patch exit0。没有 build、lint、全仓测试、正式858矩阵或委派；Root全仓运行期间仅静态工作，收到 Root 可诊断通知后才启动下列独立宿主。

所有真实诊断均从仓库根执行，公共输入为 HUHU_PLUGIN_SOURCE=/tmp/huhu-t14-final-artifacts/plugin、HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian、HUHU_PTY_BINARY=/tmp/huhu-final-native-binaries/huhu-pty，并经 xvfb-run -a -s '-screen 0 1800x1300x24' 启动私有候选，使用各自不存在的新root、私有HOME/profile。端口按脚本或 HUHU_ACCEPTANCE_PORT 独立设置。主产物 main.js SHA 为 c9a47f6a7a765a6fa78bcad8318e90f909d16d4411eea346d1cfebffcea5b7d1；每次三资产安装 receipt 位于对应root/evidence/installed-artifacts.json。实际环境 Obsidian1.13.7 / Electron43.3.0 / Chrome150.0.7871.212 / Linux x64。

| 实际调用（候选目录下脚本；root均在候选根） | 实际结果与证据 |
| --- | --- |
| workbench-probe.mjs diag-workbench-01 | exit126，CDP拒绝maxTouchPoints=0；纯驱动错误，已修合法参数，未改阈值 |
| workbench-probe.mjs diag-workbench-02/03/04 | exit126；02把视觉36px框误当命中框，实际::before44px及四边命中均真，改测真实pseudo hitbox；03误测宿主Tab焦点，04改真实rail ArrowDown后仍证实产品无可见outline |
| diagnose-workbench.mjs diag-workbench-05 | exit0仅为继续诊断副本；87行中85通过、fine/coarse焦点2行失败。它有意不因这两行停止，末尾旧passed:true不可作为总通过；不进patch。12真实表面×纸墨×1440/390、其他响应式宽度、设置、panel、模块开关、restart route、errors均过 |
| terminal-merge.mjs diag-terminal-01 | exit126；DOM Node直接返回被CDP按值序列化失败，改until显式boolean |
| terminal-merge.mjs diag-terminal-02/03 | 两session、纸墨terminal生产token、close/reopen输出均过；home→terminal重显卡住，最终owned回收后exit126/unsettled await。03已显式空widgets看板，仍复现 |
| diagnose-terminal.mjs diag-terminal-04 | 同一确定性卡住；预启Debugger/Profiler取得paused.json、cpu-profile.json；owned-cleanup.json保留回收PID。额外调试副本不进patch |
| versioning-history.mjs diag-history-01/02 | exit126；01遇真实5000行Render anyway门，已补点击原动作；02 Other.md相同内容无diff pre，改隔离fixture中仅此文件有本地current draft形成真实比较，不删popout风险 |
| versioning-history.mjs diag-history-03 | exit0，25项全过：Git HEAD/index不写、preview、confirm/cancel/undo、未保存draft、评论、两叶竞争、copy undo、5000行真实Worker、restart hold/receipt/expired、独立popout source及释放hold |
| workbench-window-owner.mjs diag-owner-01 | exit0，13项过：原explicit owner/ribbon/focus复用，真正第二renderer的ink/plum、DateField/Portal/calendar与关闭。最终候选将只detach原leaf增强为detach该popout所有leaf再核对owner无残留；这个最后增强未再跑 |
| theme-matrix.mjs diag-theme-01/02/03 | 01 exit126：旧UI monospace override断言错误作用到独立HUHU字体；改查真实Markdown .cm-inline-code。02 exit0/123项。03 exit0/125项，含新增显式不安全宿主palette整组回退与plugin unload恢复，SCHEMES、source/reading/LP、Markdown字体/颜色、preview、主窗/迁移popout、独立界面参数均保留 |
| navigator-restored-leaf.mjs diag-navigator-on-01 on / diag-navigator-off-01 off | 两次exit0；原restore on/off风险保留，新增root hide/show三次保持同一root、module off拆除、reenable仅一个root、errors为空 |
| comments-edges.mjs diag-comments-01/02/03 | 01 exit126：全局input[type=color]误命中新custom highlight颜色，迁精确Comment color字段。02 exit126：旧跳转断言要求选中TARGET，当前生产明确保留选区；迁精确Jump to quoted text、可见TARGET高亮及保留空选区。03 exit0，14行结果，保留真实双叶/popout、anchor、external/vault jump及全部rich reading overlay；新增gutter非交互role=img与隐藏panel同root |
| host-boundaries.mjs diag-boundaries-01/02 | 均额外 HUHU_ISOLATED_XVFB=1；01真实复制/recopy/45.25秒timer及主嵌套modal先过，随后后台Lock now按钮被详情pane遮挡；改走正式huhu:safe-lock命令。02 exit0/12项，真实nonce复制、15秒recopy、旧timer不误清、新timer实际45.246秒后清空、lock/隐藏/迁移/闭窗/restart和两个renderer嵌套modal均过 |

Safe 未读任何既有剪贴板内容：首次读前只在独立Xvfb写入本次假记录nonce。未注入clipboard实现、未改生产30秒timer。仅本地新Git仓库，无remote，无用户账号或外部消息。最终候选对home场景明确seed空widgets看板；早期旧widgetWeatherEnabled已被schema忽略，不能单凭该字段宣称禁用天气，也没有把旧诊断算最终网络隔离证据。最终正式运行须沿候选空widgets，而非旧root。

## 问题与下一步

1. 当前冻结产品有两个真实失败，正式T14不得称通过。共享焦点：diag-workbench-04/evidence/partial.json 中实际fine+hover，真实ArrowDown移动到Tasks rail，:focus-visible=true，computed outlineStyle=none / width=2px / shadow=none。Root已派146生产者窄修；正式候选保留失败断言。
2. 终端home→terminal重显的生产栈已精确交Root与147 /root/terminal_native_repair。paused.json 显示 isSelectableInput→focus→handleFocusOut→focusFirst→RovingFocusGroupImpl onFocus→React焦点事件→focus→handleFocusOut循环；冻结main.js第5458行列72931/73145/74466/250902/253004。怀疑FocusScope/RovingFocusGroup争焦点仅作线索，未冒充已确认根因。先前卡住后enable/pause无响应，gdb被ptrace拒绝；预启Debugger才取到栈。所有本fixture卡住的Obsidian/helper已按owned清单回收。
3. 最后两项候选增强尚未实际重跑：window-owner关闭所有同owner叶子；Safe反馈由弱detail存在检查收紧为真实Password copied status所属root。最终fresh-vault的script/native SHA扩展也晚于部分诊断；旧receipt不冒充这个最终版本。Root应用冻结patch、对146/147必要生产修复重build并重新冻结三资产后，须用最终脚本正式运行全部必要宿主，不能复用这些旧构建诊断替代。
4. 未覆盖原生系统file picker、Windows/macOS（非本Linux必需范围）、真正主窗Safe timer之外更长idle分钟策略。comments隐藏root检查未直接计数服务查询，原T10独立fixture的隐藏不查询风险与本次真实native owner/root证据须由Root组合归因；没有声称本脚本已直接证明服务零查询。独立popout错误捕获由window-owner/history承担，host-boundaries仅断言主窗native errors，不能将后者扩大为所有renderer console全覆盖。

return0。候选/manifest/ready.patch与本REPORT已冻结，停止读写并释放；不声明T-14整体通过，不执行正式验收、提交、推送、发布或状态写入。
