# 合法最大事件页客户端修复回报

Session: 20261025T043239Z
Task: 049-event-page-repair
Status: completed

## 聚焦交接

已修复 046 的 STD-02/SPEC-02：合法 65536-byte 文本事件连同 JSON 元数据超过默认 64KiB 页时，EventClient 在同一 cursor、signal 和 generation 下最多补一次既有 512KiB 页请求，成功后继续正常投影。只有精确 `RESOURCE_LIMIT/EVENT_PAGE_TOO_SMALL` 触发此路径；最大页仍失败或其它限额错误会暂停自动轮询并显示错误，用户显式 refresh 仍可进行一次有界尝试。页预算按每个 Run 保存，并随 client/Profile/lease 代数失效重置；旧响应、取消、EOF、dispose 与撤权清理继续受原有 fence 控制。原封 046 的真实 Go↔生产 TS 反例已保存红灯，仅换修复后的 TS 在相同 Go 二进制与相同输入下转绿，65000 对照、65536 完整正文、seq5/succeeded 和重复刷新均成立。生产与测试源码已冻结，所有自有子进程已 Wait；本回报表示候选交回，Root 负责联合接纳及后续 050 独立审查。

## 产物与验证

### 范围和实现

沿 TASK、Map13/Goal12、T-04 原合同和已经读取的 AGENTS/dev/SpecDev I 实施；完整回读 046 REPORT、真实 large probe、65000 对照与 524288 直读对照。未进入 T-07；无提交、推送或发布；无正式 Ticket/Map/Evidence 状态写入。此次唯一修改的源码为：

| 文件 | SHA-256 | 修改 |
| --- | --- | --- |
| `src/modules/huhubot/services/events/event-client.ts` | `9976369d282bb08345d597d79489647e1200d7fdcfff63a9b87e2135b51852b2` | 默认页 65536、最大页 524288；精确错误的同 cursor 单次补读；按 entry 保存页预算；invalidate 重置预算。 |
| `src/modules/huhubot/services/events/event-client.test.ts` | `58324e7d050a833012a0cb5dfe2434564f1e33b44fdc816bcaeac71ea73277fb` | 原 12 项保留，新增 13 项，覆盖文本/转义、次数、最大失败、显式 refresh、其它限额及生命周期/授权中间窗口。 |

`services/events/runner.test.ts` 未修改，SHA `609ded3e6953cf02186aa0bb209eb0c2bd7ea5594bd3d34663d2bd2a709a12e4`。Go 永久跨进程测试 `tests/contract/events/ts_test.go` 由 048 唯一维护，未双写。API/schema、reducer/codec/connection、Go 生产、依赖和根构建输入均未由本任务修改。

一次 refresh 在默认预算下至多两次只读请求（65536 → 524288），使用同一个 query cursor 与 options/signal，成功应用页之前不推进 seq；预算已放大后每次 refresh 至多一次请求。最大页错误保留原有 paused/error 行为，不安排自动 timer，不假装 terminal，也不禁止后续用户显式 refresh。client/Profile/lease 变化、EOF、dispose/detach 会重置预算并 abort 当前 signal；大页响应返回后仍检查同一 generation。第二次请求若撤权，原有正文/消息/事实清理路径照常执行。单 Run 单在途、detach 不 cancel Run、BigInt seq、immutable selector 与独立 Run 投影保持原逻辑。

未扩大单事件文本 64KiB、页 512KiB、HAP frame 1MiB、pendingText 256KiB、投影 1MiB、facts 128 或最多 16 Run 等既有限额。不是对其它 `RESOURCE_LIMIT` 的通用放大或循环重试。冻结的唯一 schema SHA 为 `5a2d1c410dd4c5dbf811933d3938673205dc264055dd70b18a10688be232e863`（63 methods、126 方法形状、234 方法样本、4 valid/12 invalid frame goldens），校验选项未变。

完整 22 项源码/合同/配置输入见 logs/12-final-source-input.json（历史日志已清理：`logs/12-final-source-input.json`），文件 SHA `f83271af57fb6994df0c7de622b9270d21fddd77104d2a83005e31a4b4e49026`。原反例及当前 bundle 的哈希见 logs/02-original-probe-input.json（历史日志已清理：`logs/02-original-probe-input.json`） 和 logs/13-probe-artifacts.json（历史日志已清理：`logs/13-probe-artifacts.json`）。本仓库为共享 dirty 工作树，HEAD/base 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`；没有通过 reset/checkout 处理其他 owner 的改动。

### 真实原反例红→绿

只读复制 046 的 `large.ts`、原生产 TS bundle 与 `events-probe` 到本任务 `logs/probes/`，原 046 产物和日志不写。原 Go probe 通过真实 bootstrap/stdio/Facade/Executor/SQLite 运行，只在模型 Engine 外边界使用受控 fixture；不是新增生产 API。`large-original.ts` SHA `76918d5a190e1daccc539b8d963f5271f2b10d976d1d1f572c4a3be8ac36f1a9`，原 native binary SHA `be60f196efe3b1a3e3fe4e91a977967b1fcea4b8b1903339bb9dec0e4761a6e6`。

| 步骤 | 实际命令/日志 | 退出及观察 |
| --- | --- | --- |
| 原封真实红灯 | `node logs/probes/large-original.cjs logs/probes/events-probe <isolated profiles>`；完整绝对命令见 03 command（历史日志已清理：`logs/03-real-original-red-command.json`），[03 log](logs/03-real-original-red.log) | Node exit 126（预期断言失败）。65000 到 seq5/succeeded、正文 65000；65536 在 seq3/running、paused/EVENT_PAGE_TOO_SMALL 间无法收敛，服务端实际上 succeeded/head5，直接 524288 页可取全部 5 事件。 |
| 单变量构建 | 原 `large.ts` 仅将生产 TS import 打包为 `large-current.cjs`；[05 log](logs/05-original-probe-build.log) | esbuild exit 0；Go binary 与脚本输入不变。 |
| 同输入真实绿灯 | `node logs/probes/large-current.cjs logs/probes/events-probe <new isolated profiles>`；完整命令见 06 command（历史日志已清理：`logs/06-real-original-green-command.json`），[06 log](logs/06-real-original-green.log) | Node exit 0。65000、65536 均 seq3→seq5/succeeded，完整正文分别为 65000、65536；再刷新不重复；直接大页仍 head5/5events。 |

红绿均使用自有临时 Profile，位置记录在命令 JSON，不涉及用户库。父脚本通过 subprocess Wait 等待 Node，Node 的 finally 完成 client/core/transport dispose 和 Go 子进程退出；无强制 kill 的成功替代。复放安排在 Root/048 已释放的窗口，本任务没有启动新的 Go 构建或重测来污染其性能测量。原 binary 固定的目的在于证明 TS 修复，不能把它算作 048 最终新 Go 输入的联合验收。

### 永久测试与本地检查

| 检查 | 实际结果 | 日志 |
| --- | --- | --- |
| 新单元先红 | 改生产前 23 tests：9 failed / 14 passed，Vitest exit 126；失败在缺少补读、最大页暂停和生命周期补读断言。其后补齐 Profile/EOF 两项生命周期测试，最终为 25 项。 | [01 unit red](logs/01-unit-red.log) |
| `pnpm exec vitest run src/modules/huhubot/services/events/event-client.test.ts` | exit 0；25 passed，801ms。 | [04 unit green](logs/04-unit-green.log) |
| `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.json` | exit 0。 | [07 production tsc](logs/07-production-tsc.log) |
| `pnpm exec tsc --skipLibCheck -p tsconfig.test.json` | exit 0。 | [08 test tsc](logs/08-test-tsc.log) |
| `pnpm exec eslint src/modules/huhubot/services/events/event-client.ts --max-warnings 0` | exit 0。 | [09 lint](logs/09-local-lint.log) |
| `pnpm test:architecture` | exit 0；1206 modules，零越界。 | [10 architecture](logs/10-ts-architecture.log) |
| `pnpm exec vitest run src/modules/huhubot/core/events src/modules/huhubot/core/protocol src/modules/huhubot/services/events/event-client.test.ts` | exit 0；5 files / 75 tests，1.32s。包含 25 项客户端及原 reducer/codec/connection/schema 测试，不额外重复计算。 | [11 final targeted](logs/11-targeted-final.log) |

新增单元中 65536 UTF-8 bytes 包含普通 ASCII、NUL（JSON 六倍转义）和引号/反斜杠三向量；断言完整正文/终态/seq、同 cursor/同 options、后续不重复和预算保存。另覆盖：最大页仍不足时仅两次且无自动 timer，显式 refresh 仅新增一次；非 `EVENT_PAGE_TOO_SMALL` 限额不扩大；大页前失效不发第二请求；大页在途 lease/client/Profile/EOF/dispose/detach 失效后 abort 并丢弃晚到正文；client/Profile/lease 重置默认预算；大页拒权清空 pendingText/messages/facts。所有命令已完整等待退出。

**交叉来源**：048 已冻结旧 TS 实际 bundle，并在其永久真实 Go↔EventClient fixture 留下旧实现红灯 [../048-source-delivery-repair/logs/07-large-old-ts-red.log](../048-source-delivery-repair/logs/07-large-old-ts-red.log)（由 048 执行，Node exit 126）；65000 先通过、65536 失败，后续 escaped/Source 向量在旧实现早退后尚未抵达。其新增 fixture 计划覆盖 65000/65536/escaped65536/Source65536 与 15 项观察，最终新 TS 全向量结果由 048 自己交回；本报告不将该尚待收齐的真实链结果记为本任务亲自通过。

**Lead-owned 检查**：Root 在两份 TS 冻结后执行全插件 `pnpm run build` 与 `pnpm run lint`，均 exit 0、Wait 完成，1814 项输入 drift `[]`；已回读 [lead-ts-build-result-r2.json](../../../evidence/T-04-logs/lead-ts-build-result-r2.json)。该结果由 Lead 产出，不冒充本任务执行；构建产物留在共享工作区。

## 问题与下一步

本任务实现与自有检查无遗留失败；原红灯证据完整保留，没有覆盖为通过。生产、测试两文件和 unchanged runner 已冻结；最终哈希复核/进程清点见 `logs/14-final-state.json`，实际 return 校验见 `logs/15-return.log`，其后不再运行测试或写源码。

联合交付仍由 Root 收齐 048 的来源页性能、快照 provenance 和扩展真实大事件回归，再复放 046 三项并进入 050 独立复审。048 的 Go 两项修复不在本任务写集内，本任务不替其给出双轴结论。未运行真实模型、真实 Obsidian 现场或真实用户 Vault；没有本轮 Windows/macOS 运行验收。用户真实操作继续后验，不能从受控 Engine、Node 与固定旧 Go probe 推断这些环境已经通过。
