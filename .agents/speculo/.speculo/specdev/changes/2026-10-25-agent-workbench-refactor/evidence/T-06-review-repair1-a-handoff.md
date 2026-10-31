# T-06 review-repair1 A4 交接

**SOURCE STOPPED**。停止时点 `2026-10-25T23:40:58.277699Z`；此后仅只读定向检查与 `/tmp` 交接。四条活动写集全部纳入最终快照；原 A23 的其余19条逐字节未变。未写正式工件、产物、B/C源或后续票。

本轮实现已冻结的 `observeOrdered(values, gapPending)` 与 `ACTIVITY_LIMITS.reorder=8`，公开签名与 Root 已准入 API v1 一致。Session 为捕获来源保存一个临时 gap 位，立即发布 unknown，保留原事实、阻塞身份、完成与 seen。完整批先校验结构、连续序列及完整摘要预算，逐事实推进活动序号而仅最终通知一次；Stop 保留自己的完成 N。直接 observe 不能清 gap；有序 HookError/关闭在最终通知前生效，硬失效与原停止/失联优先。没有第二重排队列或计数。C 独占原 Map/high-water 与 root fence，A 未修改其源。

## 最终活动源

| 路径 | SHA256 |
| --- | --- |
| `src/modules/agent/core/workspace/managed-runtime.ts` | `9b8146b8955ad18eced070a583a3d8ec53bb338f9676c7a274d3d0530ca14a4b` |
| `src/modules/agent/services/terminal/session.ts` | `19a9900f5a4dd49c497bec9e2eed3a402bd190c0c407ceb84accded66030f1a9` |
| `src/modules/agent/services/terminal/session.test.ts` | `6a3aa282cf2c4f559819bb8429e06478a2e46976d26a15a3bc935d08785eba75` |
| `src/modules/agent/services/terminal/sessions-activity.test.ts` | `35d5dcf7e1c09e861f0bdfc38116e18ee138566337c0e8055edf2dcebc6d3f24` |

接口在 managed-runtime.ts:284，窗口常量在 :370；session.ts:436 为批入口，:538 起为 gap 可信度投影，:626 为批通知门。新增回归主要在 session.test.ts:685 起；实际 TerminalSessions/NativeHost 控制输送与终止门组合在 sessions-activity.test.ts:224 起。

## 实际验证

- `21-final-combined-green`：四文件完整组合 **79 passed / 0 skipped**，`2026-10-25T23:40:48.418527Z–23:40:58.277699Z`，实际 Node/Vitest exit0，前后输入无漂移。A 两文件52项，C 两文件27项；包含实际 consumer→Session、多洞/完整八格、Stop 原 N、批内关闭与 HookError，以及物理 spool/生成 OpenCode extension/root 冲突。
- `22-final-types`：最终 A4 scoped TypeScript exit0，23:43:12–14Z，无漂移。
- `16-final-lint`：两条自有生产源 zero-warning ESLint exit0，23:38:00–06Z；此后生产源未变，仅测试夹具收尾。
- `23-final-formatcheck`：最终四条自有路径 Prettier check exit0，23:43:17–18Z，无漂移。
- 原行为红灯 `01-consumer-gap-red`：真实 consumer 将 seq4 留待 seq3 时，Session 仍 working/current；修后同测试在最终完整组合通过。`02` 是缺 API 的功能红灯，不冒称同一行为因果。

最终组合前输入中的 A/C 源摘要已与交接观察逐字节核对；A23 全清单还独立核对原 STOP 清单，活动集之外19条未变。每命令保留实际前输入、CAS 字节、真实 Node ELF/工具入口、Vitest/TS/ESLint/Prettier 配置/setup、UTC、argv/cwd、实际 exit、原输出及后漂移。格式命令的自有源预期变化独立记录。命令与日志完整索引见 checks JSON，不回填或覆盖历史。

## 失败历史（原件均保留）

- `03`：两条新增断言错误要求 aggregate 在 source closed 后仍有 lastFact；原合同是 per-source 保留历史。仅修测试断言位置，保留 aggregate 原行为。
- `06`：测试 discriminant 经 assert.equal 收窄后仍重复分支导致类型错误；修测试。
- `09`：新失联夹具在 parser barrier 尚未结算时误期望清理拒绝；未改变生产终止顺序。
- `12`：Array.isArray 对 readonly 参数的 TS narrowing 产生 any，触发14条 lint；改用 unknown 别名做 runtime guard，接口与行为不变。
- `14`：新夹具立即断言 disconnected，与原 disconnect 先撤活动证据、再等 parse barrier 才改变 connection 的路径不符。修为立即核 unknown/拒补洞，再 await whenParsed 核 disconnected。
- `19`：78 pass/1 fail。真实 lost 路径在 parse 后返回 AggregateError，包含 NativeReleaseError outcomes 的原 sid/disconnected，属于原 T04/T05 未知清理合同；仅将测试改为准确断言此拒绝，且 native.dispose 放独立 finally。未吞异常或把未知清理改成功。Root 已回读确认 `14/19` 为夹具期望问题。

`20` 保存最后一项测试清理修正的格式原件，随后 `21` 取得79项全绿；`22/23` 为最后的类型与格式检查。23条命令无遗漏，所有失败原输出均保留。

## 原件索引

- A23 源清单（实际本轮改A4）：`/tmp/huhu-t06-a-review-repair1-source.json`，SHA256 `d8892556a191f93e79e094ba72ce7152f74c40e203a71753cf08b59adf2e500c`。
- 命令/日志索引（23次）：`/tmp/huhu-t06-a-review-repair1-checks.json`，SHA256 `a2ece33c64b375e17abbb2aab868104c424368683bd1355847f5a9f4b51e4b4d`。
- 本轮A4原基线→最终 diff：`/tmp/huhu-t06-a-review-repair1.diff`，SHA256 `38a02c76eeae4384c788cd1933679284f0c02242cfe381b844600901b3d264d9`。
- 最终组合输出：`/tmp/huhu-t06-a-review-repair1/21-final-combined-green/stdout.log`，SHA256 `1f64f988c2b35f57d795c2ff0afe0b8c8dacbaa750910fe699188b5a830db4c9`。
- 各次不可变前输入/原输出在同目录 `01-…` 至 `23-…` 的 receipt.json/stdout.log，实际源字节在 objects/sha256。早期 API v1 回执保持原件不覆盖。

未执行全局 build/lint/guards、Chrome、真实 helper、Provider 或用户库操作。A 原生生命周期用受控 NativeConnection；C 的生产生成 extension/物理 spool 是隔离自动化，均不等于真实 Provider/Obsidian/五平台 E2E。Root 负责统一冻结、受影响整合与独立审查，用户负责真实产品 E2E。未宣称 T06 done。
