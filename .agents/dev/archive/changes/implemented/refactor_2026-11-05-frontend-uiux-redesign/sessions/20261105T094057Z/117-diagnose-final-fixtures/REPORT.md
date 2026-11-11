# 117 剩余原生 fixture 诊断

## 交接

仅新增本 REPORT；仓库代码、产物和 state/index 均由 Root 独占写入。全部候选、浏览器过程材料在 /tmp/huhu-final-fixture-diagnosis/。未跑66、未操作真实 Obsidian/vault/账号/CLI/剪贴板。

冻结交付分三批：

- 第一批 ready-manifest.json：T09/T11 主题接入、T08 getAllLoadedFiles，以及薄 shared helper。Root 已合入。第一批 helper proposal 曾在后续拆函数时被覆盖；Root 当时复制到中间版本并在正式 configure 发现 hostKeys 越域，此轮正式失败不能视作已过。后续全部按独立新名和 manifest 引用冻结，不再覆盖交付输入。
- waiting-ready.json：T09 对真实 TerminalSession 调用 setActivity('waiting') 的单行增量。before d2e6c8b6c1de8875788b8ca5e3a64484aa1ace6252cd1b9ac5dfce23c3d31cbf，mode0664；保留原 waiting banner 断言。
- second-ready.json：仅应用其中引用的六个 patch：helper 最终作用域修复、独立 configureFixtureHost 导出/真实 settings handle；T12/T16 完整接入；已有真实 Runtime 的 T07/T08/T10 只补宿主 palette/leaf canvas。每项 beforeSHA/mode 在 manifest。目录中的 shared-theme-increment-proposal.tsx 是未释放的中间材料，不能代替 manifest 指定 patch。
- final-fixture-ready-v3.json：T08 后续内存端口/真实 Settings 容器/场景 modal 重置；T10 folder 形状与 driver 焦点等待/回复前焦点。含 before/afterSHA、mode、独立 v3 patch/proposal。两个 TS 的基线明确是第二批 host-only patch 应用结果；driver 基线是生成时实际源码。Root 串行核对后应用。frozen-artifacts-receipt-v3.json 记录最终临时材料哈希。

## 产物与验证

以下结果均为私有单 matrix case + 所声明范围。所有对照使用真实生产组件、样式、ASAR app.css，内存应用端口；第二 Document 是 iframe，不是 Obsidian popout。

主题事实：T11 原 ink 配置只有外层 MAIN 的属性正确；safe-unlocked/safe-quick 内层 DesignScope 与动态 portal 无 data-theme，computed canvas=#F2EFE8、fg=rgb(29,26,22)，外层与内容透明，body 是宿主 rgb(28,28,28)。T09 settings/new 同样出现纸色内层。前证据 t11-before、t09-before/result.json。薄 helper 仅使用真实 SettingsStore+ThemeRuntime，注入内存持久化/workspace 和既有共享 theme fixture 的宿主色样，没有复制主题引擎；物理 leaf 使用现有 --hu-canvas/--hu-fg 绘制宿主表面。

修后 t11-after/t09-after 显示所有实际内层/portal 均获得 ink/teal/huhu/compact/14，canvas=#171614、fg=rgb(237,233,225)，leaf 背景 rgb(23,22,20)。t11-host/result.json 对 paper/ink×obsidian safe/unsafe、双 Document 每个 root 的 theme/accent/source/density/uiSize/system 字体作真实断言；safe 接受宿主 palette，unsafe 全组 fallback，dispose 通过。T12 使用同一真实 theme handle，保留 appearance UI 更新；t12-theme-fixed 的 appearance/appearance-fonts、t16-theme-fixed 的 diff/sync 观察到 nested/portal 正确属性与 computed 值，无运行异常。这两项是定向 computed 探针，没有替代原完整验收。

T08 单变量链：

1. 原 verify 通过 anniversary-config 后，album-config 真实 VaultPathField 抛 getAllLoadedFiles 缺失；补内存枚举后进入 settings。
2. 裸挂 DashboardSettings 时390视口scrollWidth396。加与真实 src/app/settings/react/SettingsPage.tsx 相同 p4/p6 内容容器后该断言通过。未改生产 CSS。
3. PipelineSection 的 metadataCache.on 缺失；补成可注销内存事件引用后通过；MediaPanel 的 preferences-not-initialized 则通过真实 initializeVaultPreferences+内存 SettingsStore 初始化，最终 dispose 验证引用归零。
4. 所有 states 通过后 exercise 的 Edit layout 未命中。t08-click-console.jsonl 的 CLICKPROOF 记录实际 elementFromPoint 和 trusted pointer/mouse/click 均落到遗留 catalog dialog-overlay。fixture show() 未重置 store.dialog。每次新场景先 setDialog(null)，catalog 场景仍会按原逻辑真实打开，从而保留 catalog 验收并释放后续交互。

T10 单变量链：

1. 原完整 exercise 的 month 断言超时；t10-trace/result.json 保留 key/focus 轨迹：两个 ArrowDown 与 Enter 都仍发向首 option，Radix 延迟 focus 尚未完成。driver 每步等待实际 activeElement 达到对应 option，再发下一键，五周期原 footer 断言全部通过。
2. 随后 saving 立即 failed，writeGate仍true。memoryVault 的现有 folder 在 getAbstractFileByPath 中只有 {path}，真实 ensureVaultFolder 把它当文件。fixture 仅为现有非 TFile folder 补 children:[] 后，实际 pending/失败恢复/成功保存断言通过。
3. 随后回复不持久化；原 enter() 最后 Tab 已把焦点离开 textarea，而生产 Composer 的 Ctrl+Enter 处理在 textarea。提交前再真实点击 textarea，原持久化计数断言通过。

最终可回读命令（统一加外层 timeout --signal=TERM --kill-after=2s 50s，仅止损，绿灯均正常提前完成）：

- node /tmp/huhu-final-fixture-diagnosis/t08-final-v3-run.mjs --suite frontend-redesign --ticket T-08 --matrix redesign --out /tmp/huhu-final-fixture-diagnosis/t08-final-v3：退出0；1 matrix、原86条 states 断言及完整 exercise、metadata/preference/portal dispose 通过，errors=[]。
- node /tmp/huhu-final-fixture-diagnosis/t10-final-v3-run.mjs --suite frontend-redesign --ticket T-10 --matrix redesign --out /tmp/huhu-final-fixture-diagnosis/t10-final-v3：退出0；1 matrix、原 verify 与完整 exercise 通过，errors=[]。
- T-11-full-run.mjs → t11-full：退出0，1 ink case+原完整 exercise。t09-waiting-run.mjs → t09-waiting：退出0，1 ink case+原完整 exercise。没有删产品断言。
- T-12-theme-probe-run.mjs → t12-theme-fixed、T-16-theme-probe-run.mjs → t16-theme-fixed：退出0，各1 ink case定向 computed 观察；第一次私有拆函数探针发现 hostKeys 越域，最终 helper 修复后才绿。Root 的正式记录单独保留，不覆盖。

红灯的明确断言和真实堆栈分别保存在 t08-original/port/settings/metadata/preferences/click 与 t10-current/trace/focus/saving/folder/result.json，命令实际完成但返回失败（工具部分失败退出显示126）；未将红灯或外层timeout当通过。

## 问题与下一步

只读扩查结论：T02/T03 有真实 safe/unsafe host 样本，但仅 configure 时扫描现有 roots；T04 有 configure、新 surface/setMotion 扫描，未安装动态 root 观察器；T06 每次自身 render 后扫描，异步 portal 仍缺同等保证。T12/T16 原先仅外层；上述第二批提供接入候选。T05 已有真实 Runtime；T07/T08/T10 同样已有 Runtime，先前“只有外层”的 T07 先验不成立，但缺 hostMode 实际色样。本次不修改 T02/03/04/05/06、不扩跑它们；这些旧66可支持当时观察到的交互/布局，不能据此宣称所有未来 nested/portal 主题或安全/不安全宿主 palette 都已覆盖。

Root 在本诊断期间串行合入第一批，实际生产源码也可能被其它已授权 owner 更新。所有最终私有运行路径、候选 before/after 与各 result inputs 保留，不能把早期不同输入的绿色相互替代；本轮私有 driver/TS 的路径与冻结哈希以临时 manifest 为准。Root 应先核对并合入冻结增量，再作最终正式原生验收和次数处置；本报告不改任何状态、不宣称最终66完成。

最后进程查询未发现本轮 huhu-117-* Chrome/profile 或本轮 runner 遗留；仅查询命令自身匹配。未结束用户其他进程。真实 Obsidian popout、系统 SDK/账号、跨平台终端、生产构建/lint/全测试均未执行，也不由本轮 fixture 诊断证明。
