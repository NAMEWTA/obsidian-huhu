# T-04 B UI handoff

**SOURCE STOPPED。** 仅实际写下表9个已分配UI/DOM文件；独立confirm根未改。GP016/Map17及Page精确增量packet。未写services/core/i18n/shared UI/CSS/create/TabStrip/platform/native/docs/deps/Git/C/main/styles/budget。Root接管整类型/全构建/全lint/产物/冻结与独立双轴审查。

- 完整manifest：`/tmp/huhu-t04-b-source.json`，SHA256 `0036e064151d0d1697c2d7b6247e1e7d50ae899461b893275f1cb402bcd2edda`。
- 全部33条exact argv/cwd/实际child exit/日志及SHA、20截图和harness输入：`/tmp/huhu-t04-b-checks.json`，SHA256 `bc003052ef26ba810329092369c7b84c96ea308b24a69dc09ab5baa2de016ab6`；所有原日志回读SHA匹配。

| 实际写文件 | 最终SHA256 |
|---|---|
| `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx` | `2b46272e18a19f7bc971dfc517510ad5ec59d745ef90fd89b630c5f834625645` |
| `src/modules/agent/ui/AgentWorkspacePage.tsx` | `07f60e9b4b2f73978a76b9239d19c1c02b580210433566bd49b53657ee62ef3b` |
| `src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx` | `fcc42139af562b582faf3dd88f38c11580f7aa1136f131ccead83458d8a19a02` |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | `0f500b21596a56374801ca3733d1af81feb6d23ecde4c912031210035ef2014f` |
| `src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx` | `1137fc1383297c9d13529e049a86e8d4bc45c01b91eb44aeb405508c57485378` |
| `src/modules/agent/ui/sidebar/SpaceNavigation.tsx` | `59347afe0120b5b8391668feb9884a6dcc6fe19e2c0a17373f04c25a9d7aa10c` |
| `src/modules/agent/ui/sidebar/managed-lifecycle.tsx` | `dbae64ac0ace3368f2968259d92edd701154e6ff47779d8b028043048f3d8a8d` |
| `src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx` | `600aa330dac48149275644c91c8c30ee90d4a7b8d88ae572faed78696b3dae42` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `aeab120959e66cc22c8ce453e44bc2d57e37893d0a07fd535f632e982feb772b` |

## 结果与验证

- Sidebar和SpaceNavigation接入原四个停止/归档方法及冻结openManagedRecord：确认前捕获Space/稳定Session/runtime或服务原ArchivePlan；同步ref防重复；取消/ESC/隐藏/unmount之前不admit，代次/名称变化不重算范围。没有runtime的记录只打开只读占位；活动runtime attach返回not-running时不自动晚起新展示意图，下一次明确点击才打开记录。
- 附加/后台记录均有明确停止/归档和状态；check只wait查询，不重发stop；force另经明确确认。StopResult仅stopped且persisted作为操作完成，保存失败保留错误/目标/证据；ArchiveResult只有archived才显示完成，不完整逐行保留身份、清理和保存结果。native root exit、cleanup partial/unknown、output truncated与stop-requested均用A-owned en/zh枚举键，未新增UI writer/cache/业务owner。
- TerminalHost保留原renderer/document retention和全部原菜单；close仍detach。unknown/disconnected/未核实恢复禁止盲启动；Shell明确Restart→restore(true)，Agent有native显示Continue→false，缺native只能明确Restart→true，无continue失败自动降级。原SessionCard end仍调用A已修的冻结集合路径，保留Browser/page导航、rename/split/copy/material/真正end。
- Page受控AlertDialog原来没有Trigger，实际Chrome Escape取消后丢焦点；修为捕获所属document原触发器、目标签名与blur失效，关闭时仅有效且用户未改目标/焦点时返回。跨Space/Tab/窗口不抢焦点，无延时强制focus；菜单发起时优先解析原trigger。长ID按原文本换行，长归档范围限制视口并可滚动。独立confirm.tsx与workspace-context未改。

| 最终检查 | 真实结果/原件 |
|---|---|
| 定向DOM | **5files/43tests/0skip，exit0**；`/tmp/huhu-t04-b-dom-candidate.log`；SHA `dabe070f3c7120b33c14ec99c4893f0d5d988ac5286313d2bcd64d2ec649423d` |
| 5个生产UI源 scoped ESLint | **exit0、零警告**；`/tmp/huhu-t04-b-lint-candidate.log`；SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 实际Chrome局部 | **19画面+9行为/20截图，exit0**；`/tmp/huhu-t04-b-visual-final-v3.log`；SHA `dea013a65ad39dbaa08f07b4da1b8001a47dced98677b5f131ea4f4ae63e9103` |

DOM包括准确stop ref/原archive计划、取消/卸载/换代0effects、重复提交、root已退出但cleanup unknown、只查询、强制停止、checkpoint失败不报成功、原菜单/所有pane去重、只读占位、restored零隐式启动；实际Page ESC返回、窗口失焦后即便重新有焦点也不抢、目标变化不回旧trigger、另document Portal/回焦。SpaceNavigation用真实SpaceService+受控存储/目录/owner边界，UI端口观察不冒充真实native集成。

## 红灯与历史（均保留，不以126冒充通过）

- `/tmp/huhu-t04-b-lifecycle-red.log`：真实5failed/18pass，缺停止/归档入口与未核实恢复门，child126；`space-red`另有2条真实缺归档入口反例。
- `menus-green`首轮1failed：新增逐卡订阅违反原单订阅检查；改为Sidebar一次订阅缓存快照传给各卡，未放宽断言，v2绿。
- `confirm-focus-red`：原按钮确认时disabled的焦点来源问题；分离确认和业务busy，使用同步锁，源按钮可聚焦。
- `page-focus-red`及真实Chrome visual-v2/v3：动画结算后ESC效果0、dialog消失但focus=false，确属Page无Trigger；Page修后DOM与Chrome绿。`blur-generation-red`证明仅末尾hasFocus不足，补blur失效令牌后绿。
- `record-red`：恢复按钮先attach再fallback不符合新只读入口；改为无runtime直接openManagedRecord，绿。
- Chrome历史first/v4/final的部分失败属于探针时序/选择边界（动画尚在关闭、点击了背景同名按钮、按text找aria命名按钮），未算生产红灯；v6后台RAF暂停已用owned fixture Tab bringToFront释放，finally退出Chrome并记录rescue命令；v7缺外document Obsidian createDiv shim、v8未等待外document入退场动画，也完整保留。最终修正探针后实际窗口/外document断言均绿。所有exit值见原runner JSON，不擦除初次失败。

## Design Conformance / 视觉范围

沿批准A、DESIGN rev1/digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。PAGE001空间/会话/终端；PAGE003本票仅明确停止确认；PAGE004仅恢复说明/未运行记录边界。局部AC027/028/029/060/061由组件和DOM/Chrome观察支撑，原生进程收束及AC056/058等服务/native证据归A/C/Root，B不冒领。

实际生产React AgentSidebar/SpaceNavigation/TerminalHost/lifecycle UI + AgentWorkspace确认 + HUHU真实主题CSS；managed服务、native renderer、OS动作和外围workspace-layout/history/jump明确fixture。没有假造Obsidian宿主或Provider成功。19组合覆盖normal/loading/empty/save-error/archive-incomplete、stop-requested/root-exit/partial/unknown/stopped/unconfirmed/restored、停止/归档确认，en/zh、light/dark、1200/960/800/480/320、320×360长归档范围、coarse44px/desktop32px、reduced motion和等效窄视口；严格溢出/命中尺寸均通过。20张图及每图SHA在checks；已实际打开核对窄停止确认、partial、未核实恢复、长归档、保存失败、加载画面。

额外实际Chrome行为包括：ESC取消0effects并回原trigger；确认期间改名仍提交原Space/Session/runtime；归档提交原fingerprint；隐藏确认0effects；实际另Chrome target blur不抢焦点；iframe自身document的Portal与取消回焦；restored按钮只请求readonly view；unknown恢复禁止启动；320×360键盘可到可见确认footer。

视觉原件：`/tmp/huhu-t04-b-visual/`、`results.json`、`behaviors.json`；可重读脚本`/tmp/huhu-t04-b-visual.mjs`及prepare/tail原件均索引SHA。采用本仓库Radix/AlertDialog/Portal/Tailwind与已核验Herdr运行/显示分离机制；无新依赖、外部源码或GPL引入，不提前T09重构侧栏。

未运行：整库生产/测试tsc、global build/lint/architecture/promise/native、真实Obsidian/Provider/五平台E2E。前者由Root冻结后统一执行，真实E2E按用户分工交接；未执行不算通过。正式文档/词典/原生状态仍各自owner负责。**B没有未解决的已复现UI反例；整合类型/产物和独立审查尚待Root，不宣称T04 done。**
