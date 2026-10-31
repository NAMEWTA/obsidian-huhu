# T-03 A 候选交接（SOURCE STOPPED）

A 已停止全部源码、测试及检查写入；后续只由 Root 安排具体修复。此件是实施候选与实际证据交接，不标 T-03 done/ready 或独立审查通过。

- workspace：`/home/wta/orca/workspaces/obsidian-huhu/terminal`；branch `NAMEWTA/terminal`；dispatch HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 按 I、dev/ui、GP-012/Map13、T-03、Spec/implementation-contracts、DESIGN revision1 PAGE001 获批基线实施；DESIGN 摘要沿原批准 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。T-02 接口只消费最终 `saveLayout({base,value})` 与队列内 `updateLayout`，未写其 owner。
- 16 个 A 实际所写文件在源 manifest；B UI、C `workspace-service-native.test.ts` 精确排除。没有新增依赖、Rust/NativeHost/shared/native、core/space、SpaceService/workspace-store、其他模块、正式记录或 Git 写入。无额外必需路径/产品决定/API/keys 阻塞。

## 交付行为与审查入口

唯一 runtime owner 是 `TerminalSessions`；SpaceService 持久 owner；WorkspaceService 只做编排和缓存只读投影。`core/workspace/managed-runtime.ts` 与公开 API/keys 仍按冻结原件（SHA `0742ec1ee8954a2897724063e615c6aa913f780ecb8874b8c8937908ea8a8be2`），B 已消费，无变更。

1. `TerminalSessions.reserveManaged`（sessions.ts:124）与 WorkspaceService create（workspace-service.ts:139）：verified Session commit 返回后同步 reserve+publish pending，随后才进入 prepare/provider/permission/CLI/account/helper/environment/hooks。stable Session、runtime、captured lease/generation+native sid 分开；pending/取消/失败记录可查，无第二持久 store。
2. 严格 create 默认后台/非交互，Space 必填；GUI wrapper 可显式选择 Space，foreground:false 不 select/建 Pane/open/focus，但仍保留首次 YOLO 确认。后台自动化不弹框/自动确认，准确 AGENT_BLOCKED。账户/配置在接纳时冻结，保留六 provider 原 argv/env/account/Hook、系统空账号与 Pi 精确 transcript locator；冷启动 CLI 用冻结配置和 recovered login-shell PATH。
3. `attachManaged`（workspace-service.ts:200）按稳定身份及 expectedRuntime 复用原 runtime/model/PID；同目标并发附加合并，off-Space focus:false 在队列 transformer 内去重并等持久成功；pending 只返回 pending，restored open/reopen 不 spawn。close/closePane 只移视图引用，headless 持续接收/解析/ACK；普通迟到/split/restore 目标消失留后台，module dispose 才回收迟到 spawn。
4. `foreground-intent.ts:17` 与 controller.ts:677 接入所属 doc/window/active leaf，显式 Space 的前景意图在任何 await 前捕获；新的 select/activate/close/外部焦点撤销迟到显示。受控权限 modal 允许内部焦点和原 anchor 回焦。Controller 旧 newShell/newAgent/start wrapper 无无条件 open；旧 start/resume 最小绑定已闭合，T14 原 automation consumers 保留过渡结果合同，不能视为永久无 Space 例外。
5. lease 捕获路由（sessions.ts:185）拒绝旧 helper sid 复用事件；Session.adopt 不复活早已 exit；null/null 只 disconnected/confirmed:false，不发 exit0，旧 numeric SessionEvent exit.code 合同不破坏。最终窄修：managed spawn-sent reply拒绝的 Session 与 summary 均 disconnected/EFFECT_UNKNOWN；原 confirmed exit7 保留。展示失败返回 partial 且不把真实 connected runtime 改成 failed。

## 实际验证

最终 A 闭包为 **12 文件 / 76 tests passed / 0 skipped**，包含既有 `sessions.e2e.test.ts` 真实 Linux helper。实际 Controller+SpaceService+WorkspaceService+TerminalSessions 组合覆盖取消零启动、pending 早于 deferred preparation、外部焦点失效、配置冻结；真实 FS/JsonStore/Space/Workspace 组合覆盖后台、布局失败、并发附加及前序队列交错。底层覆盖 parse ACK、旧代次、早 exit、未知 exit、取消和 module late cleanup。provider 参数测试调用生产 launcher/resolveCli/argument chain，在账号环境边界隔离，不启动六 provider 实际程序。

最终命令均 exit0（下表；完整 shell argv、历史失败/通过原件及 SHA 见 checks JSON）：

| 检查 | 日志 | SHA256 |
|---|---|---|
| eslint-stopped | `/tmp/huhu-t03-eslint-stopped.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| production-tsc-stopped | `/tmp/huhu-t03-production-tsc-stopped.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| test-tsc-stopped | `/tmp/huhu-t03-test-tsc-stopped.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| final-behavior-stopped | `/tmp/huhu-t03-final-behavior-stopped.log` | `b99a04b639a00b305cba41b57e921ecdb8d4b4ef6c3151733a83807c9976dd37` |

实际红绿：detach、strict YOLO、live runtime/display failure、旧 helper generation 与最终 sent/rejected-reply 均先有精确失败再绿；pending 和 early/unknown exit 做受控缺陷变异，原文件逐字节还原后再绿。generation 首次夹具因 fake end 不发 exit 而超时，已明确为无效红灯，修夹具后的真实断言红灯另存。原关闭/迟到自动 Pane 旧断言按新合同更新，前序持久风险回归保留。所有中途类型/lint/回归失败均保留，未将 filter/skip 当通过。环境实际失败 exit=126 原样记录。

最终生产 tsc、测试 tsc、定向生产 ESLint 均 exit0/零警告；没有由 A 跑全 build/full lint/architecture/Promise fixture 或改产物。Root 在 SOURCE STOPPED 后已生成 CSS 并开始统一 build，manifest 里 main.js/styles.css 的独立共享观察来自该整合窗口，不属于 A files；其余未分配的前序清单源保持原 SHA。Root 后续报告统一 build exit0，扩大91测试有2个 T01 旧fixture缺有效 Vault 路径的失败，Root/C 正在独立处理精确测试文件，A16文件仍冻结。

C 的真实 managed Shell 生产组合与清理证据由其独占 `/tmp/huhu-t03-checks-c.json` 提供，未计入 A 测试数或 source files；Root 已在最终组合重验。Root 统一整合检查、产物、一致性及两轴独立审查仍由 Root 决定。真实 Obsidian、六 provider 账号实际交互与五平台 E2E 由用户验收，本件不冒称通过。

## 原件

- A实际源manifest：`/tmp/huhu-t03-a-source.json`，SHA256 `a8c2bacd78a0b91096e224c9241712d4fd6757cd555264f4f4d03e4ac2aa1f84`。
- 33次行为/静态命令原件索引：`/tmp/huhu-t03-a-checks.json`，SHA256 `dc9ceb104e9343406b369dd2db407222ec68605c6b7f401f8a340fd6c914535e`。
- 只读输入当前hash：`/tmp/huhu-t03-a-inputs.json`，SHA256 `7dc82a31dd006d2bd76cf85620f5ac39fec93fcc3768964c1f23e34c96278d20`。
- 已复用前序明确许可证/活跃项目机制研究，没有复制第三方代码；本票未引入新陌生外部机制或依赖。
