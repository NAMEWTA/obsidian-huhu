# T-03 独立双轴审查 round 1

Reviewer identity: `codex:/root/review_t03`。未参与本范围实现/修复，未派遣其他 Agent。本轮按 standards → specification 顺序审查。工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`；C 指 `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。

固定输入：`C/evidence/T-03-review-input.md`。Input-SHA256 `db7cb4065ab35568e1159321b71be2d5524bbb4d87c588e5d25d1fa867335223`，原 scope `d7c840741599f8c00465d0df59d860ad86f2d44e05e8b69c7108048d573c7343`，base/observed HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。完整工作副本 29 文件，包括新增文件及 main.js/styles.css，不以 HEAD 替代交付。

<a id="standards"></a>
## Standards

Reviewer: codex:/root/review_t03
Axis: standards
Result: request-changes
Input-SHA256: db7cb4065ab35568e1159321b71be2d5524bbb4d87c588e5d25d1fa867335223
Observed: 已核对当前完整交付、实际 tracked diff、未跟踪新增文件、来源与前序复用摘要；追踪创建/保存/注册/原生启动/失败/附加/关闭显示/显式重启及 GUI 消费链。发现两个已证实的正确性问题，均以隔离生产链探针确认。没有修改仓库代码、配置、产物或正式 Evidence。

### STD-01 · P2 · 将已知缺程序误报为效果未知

- **位置：** `src/modules/agent/services/terminal/sessions.ts:335`，以及 `src/modules/agent/services/workspace-service.ts:174–178`。相关生产边界为 `src/host/desktop/native/helper.ts:110–113`、`src/host/desktop/native/host.ts:139–151`、`native/pty-server/src/main.rs:102`。
- **可达前提：** 已提交合法 Space/Session，用户选择 custom Shell，配置的可执行文件不存在。helper 仍正常运行，Rust 返回 `spawn-failed`，helper 将其转成普通 Error。
- **实际结果：** T-03 以 `stage === 'spawn-sent'` 将所有 rejection 传入 `session.fail(..., true)`，包括这个明确的 ENOENT。调用方得到 `failed/effect:unknown/EFFECT_UNKNOWN/spawn-result-lost`，runtime 为 `disconnected`，用户只看到“启动可能已经发生”。真实 probe 中 `helperStillAlive:true`，原始 failure 为不存在文件的 ENOENT。它并非响应丢失。该分类还使 `reserveManaged` 的 disconnected 保护拒绝原 Session 新代次，无法按已知启动失败处理。
- **风险/依据：** 错误恢复边界被压平成一个布尔阶段；违反公共 `error-handling.md` 对“未发生/已发生/结果未知”及稳定错误类型的区分。用户失去配置错误的准确原因与处理入口。Fowler 启发式在此表现为可能的 Primitive Obsession（用 spawn-sent 推导全部效果），不是单纯风格建议。
- **修复边界：** 保留结构化、可证明的 spawn 失败类别/效果，沿 native→helper→host→managed 用例传递；不能解析 ENOENT 展示文案。**不能简单把所有 `spawn-failed` 当作零进程**：`native/pty-server/src/session.rs:119–122` 在 spawn_command 成功后仍有 reader/writer 创建失败；这些分支须证明已清理并确认退出，或保留 unknown。可由负责 owner 增加最小类型/协议接缝，不应放松未知结果禁重试。
- **验证方法：** 真实 helper + 不存在 Shell 应返回可定位的已知启动失败（已有 Session 的副作用仍计 partial）；另测真实断连/丢失响应仍 unknown；对 post-spawn 初始化失败验证清理/未知保证，保留 early-exit 7 的既有回归。当前反例见 `/tmp/huhu-t03-review-probe.ts`、`.log`，退出 0 表示诊断断言成功确认缺陷，不是验收通过。

### STD-02 · P2 · 托管附加丢失 Shell 选择，显式重启改用默认程序

- **位置：** `src/modules/agent/services/workspace-service.ts:245`、`:260–266`；后续消费者 `:680–689`，实际默认解析在 `src/modules/agent/services/controller.ts:694–697`。
- **可达前提：** 用户在“其他 Shell”明确选择与全局默认不同的 Shell（如 bash），创建后进程正常退出，再点同一终端的“重新启动”。该原有入口仍在当前交付中。
- **实际结果：** `prepareSession` 保存 `SessionRecord.shell='bash'`，第一次 launch.shell 也收到 bash；但 attachManaged 传入的 shell 参数恒为 undefined，metadata 只读这个参数，不从持久记录取值。Pane 的 ResumeInfo 没有 shell；restore 从该 Pane 构造 bound，第二次 launch.shell 收到 undefined，Controller 回落到全局默认。probe 观察 `launchChoices:["bash",null]`，`spawnPrograms:["bash","default"]`，同时原 SessionRecord 仍为 bash。
- **风险/依据：** 持久 owner 已有配置但显示引用丢失该字段，重新启动依赖有损副本，违反 dev 数据 owner/兼容性要求；可能的 Duplicated Code/Data Clumps 风险已具体表现为两个配置投影不一致。默认 Shell 不同时，用户得到另一种程序/语法；不是仅标题变化。
- **建议：** 由持久 Session 的已接纳配置生成重启信息，确保同 Space/跨 Space、前台/后台及 detach/reattach 的所有附加入口使用同一来源。不要从当前全局 Shell 反推原选择。
- **验证方法：** 让全局默认与显式选择不同，创建→确认退出→显式 restart，断言两次 Shell choice/实际程序一致；再覆盖后台首次 attach、关闭显示后 reattach、持久布局读回。当前 probe 使用生产 SpaceService/真实磁盘/WorkspaceService/TerminalSessions，native spawn 是记录参数的 fixture；不宣称真实第二 Shell 或宿主重启 E2E 已运行。

### 工程标准覆盖与已证伪线索

已追踪保存先行、失败不 spawn、pending 在环境准备前发布、唯一运行 owner、旧 helper SID 路由隔离、早退出不被 adopt 覆盖、unknown 保留、并发 attach 去重、关 Pane 保留 headless、前台意图撤销、GUI 卸载晚结果、账号/argv/env 与首次权限确认、只读查询不激活原生资源、模块/目录边界、t() en/zh、共享控件/所属窗口/键盘与可见状态。未发现本票新增依赖、跨模块私有导入或 GPL 代码引入。未将格式、已机械检查项或未实现的 T-04–18 功能计为 finding。

YOLO “整份冻结设置覆盖用户新设置”的假设已证伪：生产 `controller.ts:541–544` 通过 SettingsHandle.update 只合并当前 draft 的 yoloAcknowledgedAgents；未写回其他冻结字段。该结论是当前生产接线审阅，不宣称另跑了实机确认对话框。

<a id="specification"></a>
## Specification

Reviewer: codex:/root/review_t03
Axis: specification
Result: request-changes
Input-SHA256: db7cb4065ab35568e1159321b71be2d5524bbb4d87c588e5d25d1fa867335223
Observed: 按 T-03 七个冻结锚点、Spec AC-005/008/026/061 及 AC-006 本地贡献、实施合同和 DESIGN revision 1/PAGE-001 独立核对外部行为。AC-005 的缺程序分类及程序配置保留存在两个已证实缺口；其他已检查本票场景未发现新增合同偏差。未来票据能力及真实宿主验收未冒充完成。

### SPEC-01 · P2 · AC-005 缺程序的可解释失败未实现

- **位置/可达前提：** `src/modules/agent/services/terminal/sessions.ts:335`、`src/modules/agent/services/workspace-service.ts:174–178`；已绑定合法 Space，custom Shell 指向不存在文件。
- **合同：** Spec `AC-005` 要求“缺程序或缺能力可解释”；T-03 `verification-plan` 明确要求配置不存在程序、失败 Session 可核对。`implementation-contracts.md` §3 将 EFFECT_UNKNOWN 用于连接中断等动作可能已发生的情况；Ticket 风险段要求响应丢失保留 unknown，并未要求吞掉有证据的缺程序失败。
- **实际违约/风险：** 同 STD-01 的真实生产链反例返回 `spawn-result-lost` 和“启动可能已经发生”，掩盖已知缺程序，并使 Session 被归为失联而非可纠正启动失败。可定位身份保留了，但错误分类/下一步不满足 AC-005。
- **修复与验证：** 保留可机读的缺程序/确定未启动结果，持久 Session 仍保留；读回失败 phase、effect、messageKey/nextAction。丢失响应与 post-spawn 清理不确定时仍 unknown；不能按错误字符串选择恢复。真实 helper 反例原件见验证附录。

### SPEC-02 · P2 · AC-005 原 Shell 程序选择未随原会话重启保留

- **位置/可达前提：** `src/modules/agent/services/workspace-service.ts:245`、`:266`、`:680–689`；显式选择非默认 Shell，正常退出后使用现有 restart。
- **合同：** Spec `AC-005`“账号/程序配置保留”，§3.2 保留原终端设置；T-03 implementation-route 要求复用原 launcher/配置并回归原入口，用户说明 `docs/agent-workbench.md` 仍承诺明确重新启动。本 finding 针对已接入且被本票修改的路径退化，不把 T-04 的整体重启/停止功能未完成算作本票缺陷。
- **实际违约/风险：** SessionRecord 已保存 bash，但创建的 Pane 未保存该选择，当前 restart 传 undefined，改用默认 Shell。用户对已有会话的显式继续不再保留所选程序。
- **修复与验证：** 让持久 Session 配置贯通附加和重启；以默认值不同的 fixture 断言原程序再次启动，并覆盖后台/再次附加路径。当前可执行反例同时读回持久记录与两次 launch 参数。

### 合同覆盖和界限

明确 Space：生产 requireSpace 不从 cwd/焦点/唯一候选猜测；严格入口不弹框，旧交互入口取消无 admission/spawn；UI 当前选中 Space 作为显式用户上下文传入。保存失败不 spawn、目录最终核验和已接纳目标冻结有实际生产接缝证据。六 Provider 使用原 account/argv/env/权限链；对应自动化未实际登录/运行 Provider。

AC-008/026：已检查 attach 原 runtime、并发去重、关闭显示不 end、原 headless 继续解析及重新附加；Root/C 的真实 Linux helper 两 Shell 日志是生产集成证据。AC-006：strict 默认后台、无 Pane 可查、后台及晚完成不改当前焦点；未来 CLI 驱动仍由 T-07。AC-061：已查生产组件与 DOM/Chrome 记录，亲自打开窄屏中文菜单、宽屏英文侧栏和窄屏恢复占位三张图；菜单滚动、命名/后台、错误/取消/pending/restored 和关闭提示纳入本次 UI 范围。没有把这些隔离 fixture 图当作 Obsidian/Provider E2E。

## 来源发现与证据核验

- 工作副本模式无新 commit range；基线 commit message 无 Issue/PR 引用，远程 source.md 入口为 not-applicable。显式 Spec/Ticket/实施合同/Goal/DESIGN/UI 批准包 found；相关当前文档 `docs/agent-workbench.md` found。
- 根 AGENTS、dev/ui 及固定 11 份参考 found；适用目录未发现额外 AGENTS/CONTRIBUTING/CODING_STANDARDS。实际 eslint、tsconfig、Vitest 配置已检查；公用 review skill 的 working-tree/source-discovery/Fowler/risk/reviewer/evidence 与错误/测试可靠性规则已读。
- 29 文件当前字节/模式/base/HEAD/index/tracked diff 与固定 selected scope 一致。tracked diff SHA `50603e88a61d3a90240f280da4959d5bcb37fb35d77d806ab5ed0f90bb8e0e15`，index SHA `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`。28 来源（含显式锚点）全部摘要一致；64 份前序复用文件全部一致。完整工具核验日志见下表。
- 重算 scope 的整体摘要为 `aa08561200aff8c3fb44866b69e79be818f31776cdd93fbe9af0d9003cb12f98`，仅 excluded inventory 新出现本次 `T-03-review-input.md`、`T-03-review-dispatch-round1.json`、`T-03-reused-prior.json`；按 working-tree 合同剔除 excluded_paths/inventory_sha256/input_sha256 后 selected scope 完全一致。不是源/标准/规范漂移。
- A16/B8/C2 交付清单当前 SHA 全匹配；A33/B33/C4 命令原件与输出摘要逐项核对（33/66/4 个有声明的 log/record 摘要），Root13 条 log/record 均匹配。Root 最终 build/css、91 集成测试/0 skip、全测试类型、lint/css/i18n/architecture/promise/bundle 成功为复用事实；没有自行重跑全局构建。原失败记录（含早期 fixture/预算126）保留；docs126 的范围外 Bot 六旧锚点不改写为通过。
- 预算核对实测 main6104991→阈值6105088、Agent1037298→1037312，以及无新依赖/最小 KiB 理由；前序预算变化按前序证据复用。生成物字节与固定构建候选匹配；reviewer 未重新构建 main/styles。

## Reviewer 实际验证

所有可写物均在 `/tmp/huhu-t03-review-*`。实际执行：

| 命令 | 退出 | 观察 |
|---|---:|---|
| `node /tmp/huhu-t03-review-verify.mjs` | 0 | selected scope、28 来源、64 前序复用及 Root13 检查摘要一致 |
| `python3 /tmp/huhu-t03-review-audit.py` | 0 | A/B/C 所写源与声明的检查原件摘要一致 |
| `node /tmp/huhu-t03-review-run.mjs` | 0 | esbuild stdin/resolveDir 隔离编译后执行生产链反例，未生成仓库文件 |
| `node /tmp/huhu-t03-review-probe.cjs`（由 runner 实际调用） | 0 | 确认两个错误行为；真实 helper finally dispose 后 kill(pid,0) 为 ESRCH，alive=false；临时数据根删除 |

Probe 第一个场景实际使用 Linux debug `huhu-pty`，SHA `5f01f05d62625f4199eb3a61866bbbc94697536446dfe7972f4d74cb63aafe91`，不存在的 Shell 从未启动。第二个场景记录 fake native spawn 参数，使用真实生产持久/业务链；不宣称运行真实 bash/default 或跨平台 E2E。最后再次运行固定输入核验，结果附于 `verify-final.log`。

未验证：真实 Obsidian 集成、真实六 Provider TUI、用户账号/授权窗口、多平台 PTY/ConPTY、真实重启恢复；这些按用户指示交用户验收。本轮未注入 Rust post-spawn reader/writer 故障；该风险只作为 STD-01/SPEC-01 修复约束，不冒称已复现泄漏。没有 remote/Git/依赖/正式状态写入。全部仓库 SOURCE STOPPED。

## 原始工件摘要

以下为 reviewer 实际保存的原件，供 Lead 回读和正式留存，不代替原工具派遣回执：

| 路径 | SHA256 |
|---|---|
| `/tmp/huhu-t03-review-verify.mjs` | `a200749c2af4dfcdb640b31b00d8e2512c84ad522b39b4048423fa8d4cbd58ff` |
| `/tmp/huhu-t03-review-verify-start.log` | `d32f87f289a276b409951d7a62af16748eb9dd08f058daadbaaf3bb4f6ce0c11` |
| `/tmp/huhu-t03-review-verify-final.log` | `d32f87f289a276b409951d7a62af16748eb9dd08f058daadbaaf3bb4f6ce0c11` |
| `/tmp/huhu-t03-review-audit.py` | `371e90c9844097ad82d166f41ecd38c8144b7afe1e97f5a55fda67be7f8f3032` |
| `/tmp/huhu-t03-review-audit.log` | `018ab841842546b7286802a28b776e2e3290923453dd91c374c847d94842e7c3` |
| `/tmp/huhu-t03-review-probe.ts` | `e189c56125c94d9f18b76016126e0012b6f57bc51fe3f5f3840e75b0f00b6f4e` |
| `/tmp/huhu-t03-review-run.mjs` | `972ac01a9864c8f945d68587c5f42acbc145ce0a37a45f15b04643ef7712a776` |
| `/tmp/huhu-t03-review-probe.cjs` | `3350ee07065bf2527bd0c758dccea8a50309698d19aaf981f58935c320e84943` |
| `/tmp/huhu-t03-review-probe.log` | `218288683e3a95cf07ae2331b6d3a21b45d36f7a6ebd5b3c7d1192e59256db0d` |
| `/tmp/huhu-t03-review-probe-check.json` | `c014544ac50da98615ba015888f90f3d0fa827226f2e949e24484ddd4a14a33a` |

SOURCE STOPPED — reviewer 未改任何仓库交付文件；两轴各 2 条 P2，涉及 2 个独立产品问题。
