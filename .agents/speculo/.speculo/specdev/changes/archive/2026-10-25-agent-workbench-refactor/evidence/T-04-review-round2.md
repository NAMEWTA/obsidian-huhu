# T-04 独立只读审查：round 2

标准轴 **pass**；规范轴 **pass**。首轮 F1/F2/F3 及对应 N1/N2/N3 已在本轮固定输入上闭合，未发现新的阻塞项。这里的通过是 T-04 代码交付范围的独立审查，不代表真实 Obsidian、Provider 或五平台实机验收。

## 身份、来源与固定输入

- Reviewer: `codex:/root/review_t04_round2`。未参与任何本范围实现、修复或生成物生产；实际任务由 Root 原生派遣，未递归派遣 Agent。
- Implementers: `codex:/root/prepare_t03`, `codex:/root/prepare_t02`, `codex:/root/implement_t01`, `codex:/root`。
- Workspace: `/home/wta/orca/workspaces/obsidian-huhu/terminal`；branch `NAMEWTA/terminal`；base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- Input: `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-review-input.md` 唯一 JSON，另有 `/tmp/huhu-t04-review-input-round2.json`；Input-SHA256 `22acab5546bc320876cbf8030e00f2fe8e8234d84e0d647f8a639fbe16e9fa00`。
- 完整 working-tree scope：57 文件，scope SHA256 `3a1bc71da37777eace0e2ea55ada36d64903cd36e370d282c82be57a65756890`；31 份来源；包含新增测试/源码、native、文档、预算及生成物。没有仅审 HEAD 或把未跟踪源码排除。
- 起始冻结 `2026-10-25T11:48:52.401Z`，结束冻结 `2026-10-25T11:52:41.274Z`：两次 scope 一致、31/31 来源原文一致、index 均为 `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`。
- 使用 T01–03 前序快照定位本票增量，当前完整文件作为权威。另逐字节比较 round1：44 文件未变；13 文件变化，其中 A 的 11 项修复加 Root 的 main.js、预算。独立复核 `T-04-reused-prior.json` 的 58 份前序文件全部仍匹配，排除依据未失效。

按 workspace → catalog → runtime 读取权威 C 与公共 code-review 入口，应用 source-discovery、working-tree-review、reviewer-contracts、Fowler、risk-review、result-reuse、review-evidence、error-handling、test-reliability、design-contract 及协调合同；项目 dev/ui 与相关参考优先。规范来源依序核对：本轮为未提交 working-tree，无新增 commit/远程 PR 规范需要追踪；显式 Spec、implementation-contracts、T-04 Ticket、runtime-proposal、native-design、api-record-view、repair-plan、Goal 执行协议均存在；docs/agent-workbench.md 与批准 DESIGN 作为对应事实/设计来源。没有把 URL、文件内授权字样或实施者自评当授权或独立结论。未发现 src/native 下额外 AGENTS/CONTRIBUTING/CODING_STANDARDS；lint/type/test 配置按实际适用范围核对。

首轮报告原件仍为 `evidence/T-04-review-round1.md`，原红灯和原 source/config/log 没有覆盖。方法与两轴在本轮重新执行；未把首轮 request-changes 改写成 pass。未变化的 native/UI 实现与既有平台/视觉测试按其原范围复用，并重新检查受服务修复影响的接口和生命周期。

<a id="standards"></a>
## 标准轴

Reviewer: codex:/root/review_t04_round2

Axis: standards

Result: pass

Input-SHA256: 22acab5546bc320876cbf8030e00f2fe8e8234d84e0d647f8a639fbe16e9fa00

Observed: 追踪 TerminalSessions 的 captured helper/lease/sid、NativeHost release/drain、WorkspaceService checkpoint/archive、SpaceService 单 queue/guardedStorage、JsonStore backup→primary、Controller/AgentRuntime 关闭以及生产 UI 的 stop/archive/check 消费者。先以首轮反例重验，再核对并行清理引入的 late-write、final-notice、恢复与失败路径；没有以测试总数或哈希代替行为判断。

### F1：已关闭

`sessions.ts:396–448` 将 confirmed 与“旧观察已结算”分开。首次 stop 在未 confirmed 的 captured scope 发送；stopSequence 在发送前记录，既有 partial 不立即结算新 stop；force 即使此前 settled 也可升级，复用 requestId/requestedAt/deadline，不延长预算或新建 helper。断线仍 unknown；未发送的 reserved/preparing 仍 not-started。

独立重跑原真实 Linux probe，并增强为必须观察 **两次** request 与显式 stop/force 后 confirmed/remainingKnown=0，已通过。另独立运行生产真实 helper 用例，原日志显示同 requestId 的 false→true、root code0、cleanup confirmed/0；output truncated 仍独立保留，未伪装 drained。真实临时 SQLite Cookie 请求已 await 并返回 fixture rows，证明 sibling capability 可工作；根/子/helper 均退出。fake-time 用例覆盖 settled partial 后 force 保持截止时间，断线用例验证无 acquire/spawn 重试。原 F1 的满足条件已闭合。

### F2：已关闭

`workspace-service.ts:361–433` 为归档保留固定 deadline、active guard、primaryStarted、逐项 rows 快照及真实 operation；`clock.ts:8–25` 只结束 observer。acquire 在原 queue 内重验，checkpoint/最终 flush/commit 等待均由同一个 observer 包围。返回 rows 深拷贝，后续 settlement 不修改既有回执。

`space-service.ts:136,142–173,325–370` 的 guard 保留到每次物理 write，覆盖 backup→primary 的间隔；primary 尚未调用时取消会阻止其晚到开始。primary 已调用后返回 effect unknown，原 gate/queue/writer 持有至实际成功/失败，不声称取消磁盘或回滚；晚失败仍报告。成功只采用 verified readback 后的 records。这是已授权 repair-plan 对不可取消 I/O 的明确语义，没有静默放宽为 unknown 也算归档成功。

`controller.ts:964–1009` 同步 quiesce、幂等返回同一 dispose Promise，并启动各原 owner 清理；registry/checkpoint/layout 的 pending 不再挡 native cleanup。15 秒是调用方观察上限。`workspace-service.ts:451–466,993–1009` 的真实 checkpoint/archive/persistence settlement 以及 SpaceService 的 queue/lease 仍保留；observer 失败不提前放 writer。原 adapter 的 registry queue 串行化仍有效。Controller 最后经 workspace.dispose → persistence.dispose → spaces.dispose 才释放 writer，失败账本与 late Notice 不把保存失败吞为成功。

独立原 F2 两个反例均绿；本轮生产测试另覆盖 acquire、未 reserve checkpoint、final flush、queued commit、backup 中取消、primary pending 后 late success/rejection、返回 rows 不变、第二 owner 冲突及实际结算后重获 lease。Controller 的 registry/checkpoint/layout × late success/rejection 六场景均绿，native 已清理而 writer 仍受隔离；最终 native notice、resume provenance、parsed output、reply/ACK 在 writer 释放前保存的组合测试通过。原 F2 的有界结果与真实 owner 排空两个条件均闭合。

### F3：已关闭

`sessions.ts:351–370` 的 hooks 后、beforeSpawn 后与 spawn reply 后均重验 closing，覆盖 managed 和仍在生产中的 legacy request。最终门与 native send 位于同一同步段；未发送者零 spawn，已发送晚 reply 只走 captured sid 清理、不正常 adopt。hook 迟到完成仍进入关闭/fail 清理路径。

独立原 preparing 与无 runtime/无 beforeSpawn 的 legacy-script 微任务反例均通过；生产回归同时覆盖 managed/legacy hooks、beforeSpawn、late reply，以及 early exit/旧 SID 事件。没有把 T-14 配置迁移提前作为本票修复。原 F3 已闭合。

### 相邻风险与质量判断

- 持久恢复仍以 verified pre-spawn unconfirmed marker 为底线；expected runtimeId 拒绝旧 checkpoint 覆新 attempt，恢复不会据旧 PID 杀进程、自动 helper/Provider/spawn 或重放输入。
- archive 冻结成员、stale 重确认、cancel-before-confirm 零停止、父 Space 归档不删历史、同 owner gate 与取消标记继续成立。
- NativeHost 保留 generation/owner/sid 路由、root/cleanup/output 三事实；release 需要 confirmed 与 numeric exit，捕获 ACK/reply 不走已关闭的新输入入口；未改 Rust/codec 的本轮接口消费没有增加兼容旁路。
- 公共 DTO、native wire、产品词典/UI/CSS 未在修复中变动；UI 可显示 stopping/partial/unknown/保存失败，归档未知仍 incomplete，没有凭 status 文案宣称成功。
- 单 queue、原 owner、局部 observer 的职责可定位；未发现需作为 finding 的 Fowler 启发式问题。未引入依赖或许可不明代码。main.js 增量及预算有可回读构建归因，未隐藏启动闭包扩张。

<a id="specification"></a>
## 规范轴

Reviewer: codex:/root/review_t04_round2

Axis: specification

Result: pass

Input-SHA256: 22acab5546bc320876cbf8030e00f2fe8e8234d84e0d647f8a639fbe16e9fa00

Observed: 独立以 Spec AC-027/028/029/056/058/060 与本票 AC-061、NFR-002、Ticket route/acceptance、implementation-contracts、批准 runtime/native/record-view 合同和 repair-plan 判断。规范来源完整，没有 skipped 轴；本轴结论由外部行为与所需证据判定，不从标准轴自动复制。

- **N1 / AC-027 已关闭：** 自然根退出且 scope 仍可控时，第一次显式 stop 与 force 均到达正确代次；请求、确认退出、残留/未知继续分开。真实反例中的残余已由明确操作收束；不可控/失联仍不伪装成功。
- **N2 / AC-056、NFR-002 已关闭：** 停止/归档/关闭调用的观察有限结束；不可取消写由原 owner 保留真实责任。尚未开始 primary 的归档不晚执行，已开始者 unknown 并实际对账，不承诺虚假回滚。15 秒关闭说明与批准 repair-plan、当前用户文档一致；native cleanup 不再等磁盘先完成。
- **N3 / AC-056 已关闭：** 关闭后的准入闸覆盖现存 managed/旧入口及最后异步恢复点；未发请求取消，迟到已发请求按捕获身份清理。旧入口的完整 Space 迁移仍留 T-14，不影响当前关闭合同。
- **AC-028：** 取消确认不停止；冻结成员变化需重确认；不确认 cleanup/持久化就不成功归档；部分效果逐项可见，历史和子记录保留。已提交 primary 后不可取消的效果未知按获批修复合同解释，未误报无效果。
- **AC-029 / AC-058：** 当前 source 仍执行 runtime/route/sequence 和 expected-attempt 核验；Host 崩溃、旧 numeric-only helper、unknown spawn 无 cleanup 成功旁路，无输入重放。
- **AC-060：** native 收束、durable attempt、只读记录打开、显式新代次继续/重启接缝保留；真实 Linux 组合覆盖 reload 零 spawn、记录保留和 Browser owner 独立。真实宿主退出重开与五平台实机保持用户待验收边界。
- **AC-061 本票局部 / Design Conformance：** DESIGN revision1、DESIGN-0001、UI-001 candidate-a，designDigest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`；PAGE-001/003/004 的本票 UI 与 CSS 未变。核对生产生命周期消费者和已有 B Chrome/DOM 原件，实际打开窄屏 partial 图，未见本轮设计漂移。原 19 画面/9 行为/20 图证明局部生产组件 harness，不升级为 Obsidian 全页/真实多窗口或 T-18 完整验收。

## 实际执行、原件与清理

所有命令 cwd 为上述 workspace。没有运行 build/lint/cargo，没有改仓库正式材料、源码、生成物、target、Git 或旧报告。新增 probe/config/report/audit 仅写 `/tmp/huhu-t04-review2-*` 和本报告。

1. `node /tmp/huhu-t04-review2-freeze.mjs`：起始/结束均 exit0，原输出 `/tmp/huhu-t04-review2-freeze-start.json`、`-end.json`。脚本取真实 scope、来源原文/section 和 index；没有只比较文件名。
2. `env HUHU_TEST_PTY_BINARY=/tmp/huhu-t04-c-linux-final-20261025T103906Z pnpm exec vitest run --config /tmp/huhu-t04-review2-vitest.config.mjs`：4 files / 5 passed / 0 skipped，exit0。原 argv/cwd/UTC/status/log SHA 在 `/tmp/huhu-t04-review2-original-probes.json`。四份首轮探针复制后运行，F1 增强如上；旧 probe/config/log 保留不动。
3. `env HUHU_TEST_PTY_BINARY=/tmp/huhu-t04-c-linux-final-20261025T103906Z pnpm exec vitest run src/modules/agent/services/workspace-service-stop-native.test.ts src/modules/agent/services/workspace-service-stop.test.ts src/modules/agent/services/controller-managed-runtimes.test.ts src/modules/agent/services/spaces/space-service-lifecycle.test.ts src/modules/agent/services/terminal/sessions-space.test.ts --reporter=verbose`：5 files / 58 passed / 0 skipped，exit0。原件 `/tmp/huhu-t04-review2-repair-suite.{json,log}`。这是 reviewer 实际执行，不仅引用实施者数字；与前项或 Root 套件重叠，不累加为不同测试覆盖数。
4. `python3 /tmp/huhu-t04-review2-audit.py`：exit0，58 条 A/Root record/log 引用 SHA 全匹配；另 `/tmp/huhu-t04-review2-bc-reuse.json` 记录 B/C 的215条原件引用重新哈希、零不匹配。58 个前序文件核对见 `/tmp/huhu-t04-review2-prior-reuse.json`。哈希证明原件一致，不证明语义正确。

真实 helper 固定为23217880B、SHA `ce263fd68bdbd792d2b36f675d2ee838ff39052926ce688dcb06b086eb076343`，显式环境绑定；未覆盖 native target。生产 native 测试日志中的自身 PID：1726571/1726576/1726579、1726686/1726691/1726697，全部 `/proc` 已不存在。原独立 probe 用 finally 等 confirmed/numeric exit、sessions.dispose、Browser release、native.dispose；其 default reporter 未保留 passing console 的 PID 明细，未补造数字。结束只读检查固定 helper 可执行文件和该探针唯一 cwd 前缀均无存活进程，临时探针目录已不存在。只收束自身 fixture，没有向其他进程发送信号。所有测试进程已退出、barrier/fake timers 在 finally 恢复。

工具执行回执：原 probe 启动 chunk `eb442d` / session14117，完成 `8f160a`；repair-suite 启动 `1c8d2f` / session2863，完成 `440717`；audit-run `6cd95f`；结束 freeze `b15165`。普通读取与检索工具轨迹保留在本 reviewer 会话。首次临时审计脚本错误假设 A JSON 使用 checks 字段而报 KeyError（chunk `5db7b0`）；修正为 commands/checks 后重新实际核验成功，不把该脚本错误冒充产品测试失败或隐藏。

## 复用结果与限制

Root 已执行的最终整合37 files/262 tests/0skip、完整 build、lint零warning、1226模块架构、Promise、bundle enforce 的原记录/日志哈希重新匹配，实际输出可回读；reviewer 未重复跑禁止的构建或全局 lint。A 21 files/171 与其最终 native2为有重叠的执行，未相加为173。docs 仍为另一 Bot change 六个既有坏锚点，实际 child exit126，未写成通过或扩张为本票新缺陷。

main.js `6150214B`，较首轮 `+2316B`；Agent `1068460B`，`+2310B`；Root 只读 overlay 精确重现首轮输出，启动123518B/106输入、Navigator202878B与样式未变；仅总 JS/Agent 最小 KiB 调整。原数据见 `evidence/T-04-root-repair-budget-attribution-data.json`。未把历史首次 red 新增测试源未逐次复制的局限抹去；本轮以原独立探针、冻结 round1 生产源和实际最终绿测核对关闭。

C Rust46测试、Windows GNU交叉类型、既有native验证及B视觉继续按未变化源码原范围复用。Cargo.lock当前精确base52fb…；helper当时producer确为95dc…排序版本，其完整package图等价已有原审计。本轮没有重写producer来源或声称当前原字节曾参与旧构建，交叉类型也不代表Windows实机。

真实 Obsidian、Provider/账号、人类原生审批、Windows/macOS/五平台实机 E2E 按 Spec §11 用户分工未执行；Linux fixture 不替代这些场景。pending I/O 是确定性故障注入，未声称制造真实 OS 磁盘永久挂起。无限不 settle 的底层写可继续隔离至宿主结束，这是显式失败边界而非保存成功。未证明任意不可观测 daemon 全部消失，也没有扩大到这类范围。

本报告只交独立判断；Root 仍负责核对真实派遣/返回、最终冻结与正式 Evidence/Ticket 投影，不由 reviewer 改状态。

## 原始证据 SHA256

- `/tmp/huhu-t04-review2-freeze-start.json`：`e35023bcb99f6d505a75a2f61cfc615dc4ef7c8c6d6529ab9cc449621ca5fbeb`。
- `/tmp/huhu-t04-review2-freeze-end.json`：`f986c5127f81d6aa8b31c8c17a7b9a23f2e8297d67602c53620e3cd393fa1d4a`。
- `/tmp/huhu-t04-review2-original-probes.log`：`32417512c4eaa644bd95a07bced8c790651445e6b1fac46ef915454c6855ef8d`。
- `/tmp/huhu-t04-review2-repair-suite.log`：`63802a6783109eeefc1093bdf3ff27f7f76ccee23d7dde6df1d04c20ad398d84`。
- `/tmp/huhu-t04-review2-audit.json`：`f4233fa8ac151024add61bbdb25d9113f08d7ba350f433c78afa3a07641b6c41`。
- `/tmp/huhu-t04-review2-bc-reuse.json`：`29ff095feea4cd037eb4321a697d86193420f2002776252653910a5f9bcc4c53`。
- `/tmp/huhu-t04-review2-prior-reuse.json`：`6f40e7719a39f778db9adc608520e7768221a28185ab1868c6ca886adc951b22`。

交付前再次冻结：2026-10-25T11:55:09.077Z，同脚本实际 exit0，scope、31来源和index继续匹配。回执 `/tmp/huhu-t04-review2-freeze-delivery.json`，SHA256 `88995e975b6dd85fe5a22ee1dd5280f4a3839d8d05fc1d8391d44a7683a6e005`。
