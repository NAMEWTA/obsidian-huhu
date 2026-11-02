# 任务回报

Session: 20261026T045732Z
Task: 001-t08-business-stage1
Status: completed

## 聚焦交接

本次交回 T08 A 首批八路径阶段候选：原 Session 的有限活动等待、领域结果、首次本地执行上下文，以及 raw named-key 编码/原输入 owner 接线。等待沿原 runtime/source/watermark，复用原 32 listener 额度；独立 wait 可立即匹配当前，输入观察先占 listener 并捕获 N/初始 working，只有 activate 后才接受同源 activitySequence>N。已消费 C 的实际 ControlWaitState/CONTROL_WAIT_STATES，未复制 canonical 状态枚举或 editor DTO；TerminalWrittenInput 只重用现 PTY written 事实，不冒充 adapter-applied。最终定向九文件 162 测试、五生产文件 ESLint 和独立八路径 tsconfig 类型检查均通过，返回的是候选而非 T08 done/Root 验收。**SOURCE STOPPED**，下一步由 Root 回读实源，等待 C/B 正式端口后再续派第二阶段。

## 产物与验证

- 实施者：`codex:/root/implement_t08_business`；沿父派遣指定 `gpt-6.1-sol / xhigh`，未派新子 Agent。
- 唯一工作区：`/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 冻结 TASK SHA256：`c8b433ff808b19424f18d27707db18d0870f0852155f2c10f5f85ba95b086350`；本地再次核对等于父派遣值。
- 原有 T01–07 工作和当前 C writer 保留。仅写 TASK 八条产品路径、此 REPORT 及 `/tmp` 证据。未提交、推送、构建 main/styles、写 Git index、装依赖、改 node_modules、改真实用户库/HOME/账号。
- 本阶段的 before/after 源、所有检查的 argv/cwd/UTC/exit/完整日志/前后源哈希均在 `/tmp/huhu-t08-a-stage1-20261026T050045Z`；失败目录从未覆盖。`source-before.json`、`source-final.json`、`own-stage1.diff` 给出本次相对真正阶段 before 的差异，不能用 Git HEAD 的整个脏 diff 代替本阶段差异。
- 最终冻结：`source-final.json` SHA256 `02556c53c95129cfb918245b79a3fa4b65827a84b90c7e4fa43d60ef02772b36`；`source-stop.json` SHA256 `f30df117ed9d9b3761968f9c243b88b3965b68cd42b2d7526289f84a4dbaf0a1`；独立差异 SHA256 `3e75ca59dc090fa668b9e4f61f061e24ef64083a31415500eee93f35f38b930e`。
- 实际人工回读范围：`read-scope.json` SHA256 `83c9431a5d3f522e75aae7af7dc2c2075eea527f338d04113581efb90ce20653`。最终验证使用 `dependency-paths.json` 的 218 项保守静态项目依赖闭包，逐次保存 before/after；最终检查均无漂移。它是验证输入闭包，不冒称 218 文件均人工全文读过。

### 具体实现

- `context.ts`：只增加原 signal + 首次本地 monotonic deadline 的领域上下文。`captureControlExecutionContext` 在调用首次同步 capture 时计算并冻结，预算校验重用 canonical CONTROL_LIMITS；本阶段尚未把它接 commands/router。
- `TerminalSession.captureActivityWait/waitActivity`：原 `observeActivity` 的同步 snapshot + 注册；不另立计数器或 manager。捕获原 source bindingId/programEpoch 与 N，保存 initialWorking；afterInput 观察在输入前占额度，activate 只负责允许匹配，不伪造输入回执。每个观察只有最新完整 snapshot，先从 join 提取独立 disposer，再丢弃带初始 snapshot 的 join 对象；结果只带有限摘要。新的 UI deadline 可通过 after 重用原 baseline，不重发输入或换 target。
- 原 signal（含 typed WAIT_TIMEOUT reason）与本地 deadline 结束观察；清 listener/timer/abort handler，不调用 stop/end、不重发。runtime exit/lost/stop/program/source 撤证据先于普通 unknown；实际 source 改变与原 source 自身 mismatch 保留不同有限 reason。重复 activate/dispose 幂等。
- `terminalWaitOutcome`：纯 wait effect 始终 none；显式已确认的原 PTY receipt 在等待超时/取消/失联后保留 effect completed、input-submitted、原 target/op。拒绝跨 runtime 拼接事实；匹配只说明活动条件，不推导模型任务成功。测试中的 written 是领域已知事实/原生边界 fixture，未执行 prompt，更不是 Provider 正向证明。
- `encodeNamedKeys` / `submitKeys`：最多 4096 ASCII 字符、256 presses；空格分隔的有限名称（Enter/Tab/Backspace/Escape/Space、箭头/Home/End/Insert/Delete/PageUp/PageDown、F1–F12、字母/数字），唯一 Ctrl/Alt/Shift 前缀。普通大写字母等于 Shift+该键；带前缀的字母名称按物理基键大小写不区分，Shift 由显式前缀表达。未知/非法/当前 legacy 不能区分的修饰组合整笔拒绝。复用原 encodeKey 的 kitty/win32，win32 离散按键含 release；legacy 导航使用原模型 applicationCursorKeysMode。整笔仍进入 submitInput，不新增 writer，材料仍只粘贴不追加 CR。

### 真正红绿与失败保留

所有目录内 `command.json` 都有真实 argv/cwd/UTC/exit，`output.log` 为完整原件，`before/`、`after/` 与各自 JSON 为对应源快照。总目录索引 `commands.json` SHA256 `ab6979760bc0ed7b88afc6b28d9c321dd98fa19888a5f1978ec41adb1cbb00b3`。

| 行为 | 真实 red | 对应 green |
|---|---|---|
| 独立当前匹配 | `wait-current-red`（unavailable≠matched） | `wait-current-green` |
| N/输入确认/latest-only | `wait-watermark-red`（旧 idle 过早结算） | `wait-watermark-green` |
| runtime/source 撤证据优先 unknown | `wait-lifecycle-red` | `wait-lifecycle-green` |
| 原键盘有限语法/legacy 序列 | `keys-legacy-red` | `keys-legacy-green` |
| kitty/win32/app cursor、IME encoder 229 | `keys-modes-red` | `keys-modes-green` |
| 原 Session 单笔输入接线 | `keys-session-red`（发送了键名字面量） | `keys-session-green` |
| 首次 capture deadline 不续期 | `context-deadline-red` | `context-deadline-green` |
| 已 written 后等待不抹 completed | `outcome-effect-red` | `outcome-effect-green` |
| 大写/Alt/不可表达修饰组合 | `keys-modifier-red` | `keys-modifier-green`、`keys-tokens-green` |
| source-mismatch 不伪装 unknown 匹配 | `wait-source-mismatch-red` | `wait-source-mismatch-green`；该两条 -t 只选本风险，未把被过滤的 18 项算通过 |

red 的实际 pnpm 退出码是 126（保留真实值，不伪写 1），green 为 0。质量失败也保留：`lint-source` 为 AbortSignal.reason 的 any 未窄化，已改为 unknown；`regression-accepted` 暴露新 source-mismatch 优先级遮蔽真正 source-changed，已调整判断并保持原断言；`lint-final-stopped` 暴露提取 disposer 的 unbound-method，已用不保留 join 的显式绑定修正。没有删/放宽断言或永久 skip 造绿。

### 最终检查（当前最终源，无漂移）

| 实际命令（共同 node/pnpm 前缀见每条 receipt） | 结果 | 精确原件 |
|---|---|---|
| `pnpm exec vitest run --project unit` + 新 session/control/keyboard、原 terminal-core/session/sessions-activity/prompt-port/prompt-runner/session-material 九文件 | exit 0，9 files / 162 tests，零 skip | `regression-final-r3/command.json`、`output.log`，log SHA256 `1f8c6922fcd4b9015cb4aff2ee8a4bfbe0ad105d2379e9534b256f427f16e7c2` |
| `pnpm exec eslint` + 五个生产修改文件 `--max-warnings 0` | exit 0，零警告 | `lint-final-r3/command.json`、`output.log` |
| `pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t08-a-stage1-20261026T050045Z/tsconfig.json` | exit 0；只以本八路径及项目 d.ts 为入口，未冒充根 build | `typecheck-final-r3/command.json`、`output.log`；config SHA256 `cbad399de7ddaaf0fd142f1ffdffaed5318aff1c1d57d5d3ece66ae74d96ea0b` |
| `pnpm exec prettier --check` 八路径 | exit 0；后续仅 disposer 的一行绑定与注释，格式保持 | `format-check-final/command.json`、`output.log` |

Node 精确入口 `/home/wta/.volta/tools/image/node/26.11.1/bin/node`；pnpm 入口 `/home/wta/.volta/tools/image/packages/corepack/lib/node_modules/corepack/dist/pnpm.js`。runner/runner-final 的完整代码及每次 before/after 也留在同根；最终 reader 可按 metadata 独立重放，不需要真实账号或网络。

### 八路径最终 SHA256

| 路径 | 阶段 before | 最终候选 |
|---|---|---|
| `src/modules/agent/core/control/context.ts` | `3c337ac23abd9133e87344288e920470d9015f8703af44628058dc8acbe4883f` | `282f8f16ce5d9b88665a2c1bf7a6a43c9756c96ebc11913d78dc31f37c6c4ed7` |
| `src/modules/agent/core/control/terminal-coordination.ts` | `absent` | `ee0bd140c8394e289318c132125eb2ab167cab9fc623b4597e9409440f45fbaf` |
| `src/modules/agent/services/control/terminal-coordination.ts` | `absent` | `3d8fa522cabc7533244f05ef145d22025ebc9e79906318ea40ec2fbc48531d80` |
| `src/modules/agent/services/control/terminal-coordination.test.ts` | `absent` | `66bac95e9551fe66e7cef787c458bff6726760d49a239f904646e168263e685c` |
| `src/modules/agent/services/terminal/session.ts` | `19a9900f5a4dd49c497bec9e2eed3a402bd190c0c407ceb84accded66030f1a9` | `90788e1b43a27508c2638bee5b3547fde8d2a3406b55abfe5e1c50f5d7d90879` |
| `src/modules/agent/services/terminal/session-coordination.test.ts` | `absent` | `0ce16290314816cf8e8ef9b5988971da5078083a442ded2466e9e1a617102df0` |
| `src/modules/agent/core/terminal/keyboard.ts` | `56c7311b677789a02e74325c539e6347e2ef2c5abbec74ed801e83bb2e96191a` | `e366a8f4ac6f2bdbc105b1f566a851b3067f012dd8192256f15bf66097eab93d` |
| `src/modules/agent/core/terminal/keyboard.test.ts` | `absent` | `5a48b9e0ae692582a2f927bb33e54a83ad1222f81013a61ba14a015d2558b8cf` |

## 问题与下一步

本阶段没有阻塞。Root 需先回读最终源/报告及真实命令，再续派 commands/router、prompt/launch/应用事务、UI；不能直接把阶段候选记作 T08 done。C 后续 generated 仍可追加字段，最终检查的输入摘要代表真实检查时点，不把整个 generated 文件 SHA 宣称永久冻结。

未实施/未验证：完整 CLI→broker→Host→新 native/editor 的 prompt/wait/read；真正 adapter-applied；真实 Pi/main/Provider/Obsidian/五平台；整票 envelope 容量与 ordinary/query/stop liveness；生产 PAGE003/Design Conformance；Root 根 build/lint/architecture/bundle/native 与独立双轴 review。现 TerminalView 未把 legacy keyCode 229 传入 KeyDescription，本阶段仅新增纯 encoder 的 229 拒绝并保留原 composing/Process/Dead/Unidentified 路径；若后继要声称实际 229 DOM 路径受保护，需要在获授权 UI 写集接线并验证。Ctrl-C 选择复制逻辑未改；纯 encoder 与原 terminal-core 回归不能冒充真实宿主复制/IME验收。

所有新业务运行显式 Space 的 LOG030 决定持续有效；本阶段没有新增运行、从 cwd/focus 猜目标或提前改旧消费者。旧消费者由 T14/T15 沿原计划完成。

**SOURCE STOPPED。**
