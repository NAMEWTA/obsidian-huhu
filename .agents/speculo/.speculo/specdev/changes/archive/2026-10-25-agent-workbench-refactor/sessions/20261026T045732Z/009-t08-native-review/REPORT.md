# 任务回报

Session: 20261026T045732Z
Task: 009-t08-native-review
Status: completed

## 聚焦交接

已独立完成固定 C33 原生/共享候选的双轴审查，顺序为 standards → specification，均为 pass，没有确认需要修改的 finding。结论仅覆盖本 TASK 的 33 文件及相对 T08 开始工作副本的 27 处文件增量，不是全 T08、任何整项 AC 或全 Goal 的完成声明。未修改产品、规范、既有证据、Git/index、依赖、Cargo target 或根生成物，未再派遣。后续由 Root 冻结实际 A/B/C/Root 组合并执行整体独立审查。

## 身份与固定输入

- Reviewer: `codex:/root/review_t08_native`；原生独立派遣，指定模型 `gpt-6-astra` / effort `high`。本身份没有参与本范围实现、修复或冲突解决；没有以旧实现者切换角色冒充独立性。模型派遣原始参数与工具回执由 Root 持有，本报告不猜另一个运行时会话 ID。
- Implementers: `codex:/root`、`codex:/root/implement_t01`、`codex:/root/implement_t08_business`、`codex:/root/implement_t08_profile`、`codex:/root/prepare_t08_full_cli`。
- Mode: `working-tree`。Input: `evidence/T-08-native-review-input.json`；Input-SHA256: `0a614ba600141c092c0b999f163e03a2435d49eb716acbeeaed25d41921b022b`。TASK SHA256 为 `bf23c6fc90a7813d67d32ab5fcb47cfe09a604c785acce8fa0d170f062339c57`。
- 实际语义基线为 input.implementation_baseline 所固定的 T-08-dispatch-input.json（SHA `7b2096e05c302df7519f8a80e13925399f19fb7071e2b3420884e65239ad2137`），其中已有 T01–T07；HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715` 只记录仓库/index 来源，没有用 HEAD 差异替代 T08 增量。
- 已校验 102 份冻结原件的摘要及字节数，4 个新增文件的 missing-before 有据；C33 初检及末检的实际字节/权限均与 after 一致。由全部 before/after 独立重建的语义 diff 与原件逐字节一致：415897B，SHA `ed692603f49da0f6e824aab79fa2613384865c9064c7d311c35a9de2eec92955`。
- 完整 scope、33 路径、原字节、来源及 exclusions 沿 input.files / git_scope_result / standards_sources / spec_sources；没有删减未跟踪的新文件。范围外 A/B、Root 产物、T01–T07 原改动和审查证据明确排除。21 份 consumer_context 原件均验 hash，接口追踪读取其中冻结的 helper/Host、协调服务、Session、profile 与扩展快照；没有把变化中的 live 消费者当本次候选。

## 来源发现

已按 workspace.json → catalog.json 发现并读取实际 code-review Skill、runtime guide、source-discovery、Fowler smells、reviewer-contracts、risk-review、working-tree-review、review-evidence、error-handling、test-reliability 与协调 report-template；项目 dev、architecture/testing/licensing 入口已读。

规范发现：HEAD 提交是既有 Bot/设计文档提交，无本次 Issue/PR 引用；当前 change 未发现 source.md，不创建它。显式 Spec、implementation-contracts、T08、GP026/Map27 及 editor-transaction、launch-identity-environment、progress-receipt、engineering-packet 均 found，按 input 的冻结原件回读。docs/architecture.md 的 NativeHost/模块边界吻合；docs/agent-workbench*.md 已发现，A 活跃说明文档不取代本次固定外部合同。C33 没有 UI 实现写集，因此不以 UI DESIGN 未复审阻塞这个原生切片；整票的 DESIGN、AC-061 和真实组件仍在后续组合责任内。

标准发现：根 AGENTS、dev 与三个适用 reference 已冻结；未发现额外适用的嵌套 AGENTS、CONTRIBUTING 或 CODING_STANDARDS。现存 CLAUDE.md 仅为 `@AGENTS.md` 引用，未改变本次规则，也未恢复/改写。另读 package.json、tsconfig、test config、eslint、Vitest 与 Cargo manifest 核对机械检查和并发拓扑；小型原件/摘要保存在本次 /tmp 的 extra-sources。没有新增依赖或外部代码改编；本审查未读取 GPL 终端源码，未把既有研究来源当代码复制授权。

## standards-output

Reviewer: codex:/root/review_t08_native
Axis: standards
Result: pass
Input-SHA256: 0a614ba600141c092c0b999f163e03a2435d49eb716acbeeaed25d41921b022b
Observed: 审查固定差异及原件，重点完整追踪 editor/foreground、Session/InputQueue 接线、Outbox、control broker/client/codec，以及新增共享端口、generator 和回归测试；未发现当前范围内可定位、可达且需要修改的标准轴问题。

Findings: []

| 可证伪风险假设 | 检查结果与具体边界 |
|---|---|
| TS、Rust、字符串扩展各抄一份语法，或大报文绕过限制 | canonical schema → generator 同源输出；embedded bundle 直接使用纯生产 codec。严格 direction/identity、duplicate key、UTF-8、node/depth、完整 stage/final 和 binary body 分开，相关 raw fixture 与 VM 测试覆盖；预检在编码副本之前。 |
| editor 新开 PTY writer、跨 SID 争抢或超时提前返额 | editor UserAction 复用 InputQueue，claimed gate 只占原 SID；正文同 raw 共用每 SID 512KiB/32 与 helper 2MiB/128。write_inputs 对 editor 异步 claim 后继续 reply；真实 app result+settled 与发送结束，或原 root 退出并断开，才释放正文/原 gate。metadata reservation 和 Binding/Session 还保留到各自物理 fence。 |
| 检查/清理阻塞唯一读循环，工作线程尚未终止即回收 | fresh 检查与 capability 清理在独立 worker，状态锁外做 IO；is_finished 后实际 join，auth_checks 参与 Binding 退场。失败清理保持有限 retiring，不借无关通道池。 |
| 身份复用、前台接管或文件替换仍把正文送给错误程序 | 捕获原 root proc/PID/birth/SID/TTY，认证核 peer PID/UID，每次 dispatch fresh 核原前台组、物理 executable/entry 与解析路径。process.title 不错误要求保留原 argv；未把这些有限观察扩张为同像 exec/恶意同账号隔离保证。 |
| cap 清理删除替代实体，或失败后原 SID 被复用 | identity-matched 清理，替代实体/清理失败保留 Binding；Session 回收同时需要 editor_done、writer/reader/master、output 与 reply fence。现有替代文件 sentinel 和恢复清理测试有真实断言。 |
| CLI 取消重连/重放、吞 partial final，或覆盖 completed receipt | 同 socket 单 marker、同 Reader、共同有限尾期；broker Waiting/Response 都识别 marker。可信 op/kind/目标才保留 completed；后续 target/receipt/effect 冲突 progress/final 被拒，真实结果/settlement 不由观察取消假造。 |
| 测试只是检查字符串或 fixture 失败假红 | 已读真实 helper+Node 运输、前台子进程、cap 实体替换、partial response、实际 SIGINT、Outbox barrier 等断言；报告将 bootstrap fixture、类型错误与目标行为红分开。没有把数量或 hash 成功替代语义审查。 |

Fowler 启发式已用于命名、重复权威、owner/锁、数据簇与无必要抽象检查；没有仅因 editor.rs 较长或不同实现风格要求无关重构。共享纯端口没有引入 Node/Electron 宿主依赖，没有跨模块私有导入或新的持久数据 owner。

## specification-output

Reviewer: codex:/root/review_t08_native
Axis: specification
Result: pass
Input-SHA256: 0a614ba600141c092c0b999f163e03a2435d49eb716acbeeaed25d41921b022b
Observed: 在标准轴完成后，分别按 Spec §3.4/3.5/6/11、implementation-contracts §1–4、T08 与固定工程决定检查原生切片；没有用 standards 结论替代规范轴，也未跳过规范轴。

Findings: []

- AC-013/014 的原生贡献成立：完整正文经认证应用通道；一次操作占原队列 gate；queued cancel 为 none，未开始项不会迟到 dispatch；adapter-applied 与 PTY written 分开，均不解释为模型成功。最终原 editor 同步 paste+Enter、空草稿/焦点/IME/第三方扩展约束属于 B 的实际应用 gate，必须在完整 T08 组合复审。
- AC-015/021 的原生贡献成立：不支持的平台不广告 editor 能力，Linux 需要明确双协商；原前台/recipe/root 无法证明时拒绝 editor 输入，保留普通启动和 raw。没有增加模型 API、自动审批或普通 prompt 的 raw fallback。
- AC-017 与 progress-receipt 决定的 native/CLI 贡献成立：readOnly 是 canonical 独立布尔，wait 仍 ordinary；取消观察不 stop、不 replay、不提前释放业务物理责任；已知输入 receipt/原目标在取消、超时和 closing 后保持 completed，未确认时保持 unknown。
- AC-016/018/030 的活动水位、32 observer、被动屏幕读取及 IME/键盘完整体验主要由 A/B 消费者拥有。本次核接口没有发现 C 的破坏，但不以 C33 的 pass 关闭这些整项 AC；原 parser reply/ACK 与 stdout drain 继续原路径，不把 query、Cookie 活性证据说成完整 Browser 成功读取。
- NFR-001/002/003/004/006 的切片约束已落实：有限正文、独立 metadata/receipt 池、有限认证连接、保留 retiring、cap 单运行与目的隔离、敏感 token 不进 CLI argv/常规回执；仅新增现 helper 内部角色，没有第二 daemon。逻辑容量没有冒充 RSS 或内核峰值。
- 仍明确没有保证：OS 检查与稍后 JS 提交原子、新鲜重 hash 全 artifact、修改 process.title 后仍可读取原 argv、任意同像 exec 检测、IPC CLOEXEC 或恶意同账号隔离。未将这些明确排除项误报为缺陷。

冻结的消费者 helper.ts 已包含 `failedNone && editorId === undefined` 的 final reply/termination/output fence 收束分支；因此不能根据 TASK 的“正修”文字声称 B 此时仍未实现。它与 C 的“已有 Binding 必须等待 editor-closed/editor_done”语义可相容。Root 后续告知的 B035、A r9、B033/036 结果仅作为组合上下文，未重新纳入本次固定输入、未据其自报批准完整官方链。

## 产物与验证

本次独立执行的是只读原件/基线/范围检查，没有重跑全仓、全 native、真实 Provider/Obsidian 或共享 Cargo target。实际审计命令与输出保存在 `/tmp/huhu-t08-native-review-astra/`：`audit.py`、`audit2.py`、两次 `final-scope*.stdout/stderr`、`final-audit*.json`。最终 audit2 exit0、errors=[]；其 JSON SHA256 为 `cfa7048572c444553f22d39c6cb88da68bb23f98e1ffca6996999551a1c19e0e`。

已回读 C002/C007 报告及原检查文件；39 条 C007 command record、output 和 preinputs 的摘要全部再次匹配。最终结果：Linux 顶层 131 passed（session_tree 内部另 1 passed / 5 filtered，未重复计数）；TS 三文件 122 passed；scoped types、生产 TS 零 warning lint、精确 Rust/TS 格式、generator 字节检查/嵌入 fixture、不可变 helper verify 均 exit0。最终 native 的 33 份源描述只有后来的 TS 测试 `as const` 修正与最终不同，Rust/Cargo 生产输入不受影响；最终 TS closure 与 types-green 已覆盖该最终测试字节，未用早期 TS7053 失败当通过。

双 bin 实际摘要再次匹配：helper `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca`，CLI `923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee`。Windows GNU `--tests` 仅交叉检查 exit0，并有 unsupported stub dead-code warnings；不是 Windows 运行测试或零 warning 实机证据。

## 最终 scope 核对与限制

2026-10-26T08:50:55Z 重跑 input 中原始 `validate-specdev --review-scope` argv，exit0。33 项 working_snapshot、scope_paths、HEAD、base、index、tracked_diff 与冻结原值完全一致，全部 C33 文件原字节/实际权限以及规范/标准 SHA 无漂移。index SHA 保持 `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`。

工具整体 scope input_sha 从 `b1bcb3741c175ddb24d87c5239e93e9111d71aeb3f9a5614a79921a77f150efa` 变为 `42050a6d4b3039f2953bea7853491e2f7004c40cd0176da9acc45683e67f9afe`，对应范围外排除项 28813→28825；A/B 与证据仍在活动。第一次独立审计因比较这个整体摘要而 exit1，原结果已保留；核对后仅该摘要变化，C33 working_snapshot/index 无变化，第二次审计明确采用范围内事实判定，没有替换/改写固定 input 或掩盖产品漂移。

## 问题与下一步

没有新确认的阻塞或待修 finding。真实 Obsidian、账号/Vault、真实 Provider 及五平台实机均未运行，依 Spec §11 由用户验收；根 main.js/styles.css/notices/budget、最终 A/B 消费者及整票官方 CLI 主链均不属于本报告的完成声明。Root 仍须冻结全 T08 组合做独立双轴审查后维护正式状态。
