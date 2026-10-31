# T-01 修复后独立审查原报告

## Standards

Reviewer: codex:/root/review_t01
Axis: standards
Result: pass
Input-SHA256: fc8df230d0ade566b6a291d90e1c73ca396d36fdec52ab31a531e2b749833749
Observed: 已核对新冻结对象的 JSON.stringify 摘要、38 个范围文件的全部 after.sha256/bytes、scope.tracked_diff_command 的实际差异摘要，以及全部 17 个 sources（含锚点）的原文字节；全部匹配。重新 resolveReviewScope 得到 0f0eaa0f18396e0b2a50bb7dd85d7b1009937dea7c2d76f1b313e457ae5013b1，结束前复核仍一致，无未解释的来源或实现漂移。base/HEAD 仍为 33c21e098ef3188cbab5a09f3e0a01fadb787715。亲自运行定向 3 文件/11 测试通过，重建原始反例后 uncaught 数组为空。

首轮报告保留，不覆盖；复用首轮对未变化文件的逐文件、架构、生命周期、启动边界、文案迁移和预算合理性检查。本轮相对首轮只有四个交付文件变化：`sessions.ts`、新增 `sessions-cancellation.test.ts`、`main.js`、`bundle-budget.json`。来源仅 Ticket acceptance 勾选状态改变，验收文字与责任边界保持。

首轮 S-01 的 P2 已关闭。`src/modules/agent/services/terminal/sessions.ts:216` 现在只在 `spawning && helper.alive` 时发送 end。helper 是该 create 捕获的原始租约；NativeHost 的 alive 会拒绝 released、owner/generation failure 或已退出 transport。检查与 end 同步执行，无异步间隙；既未吞掉任意异常，也未削弱 NativeHost.active 的所有权检查，更未改用可指向下一代的 this.helper。原 native owner 仍负责迟到 spawn 的清理和 exit 等待。

新增测试回读了实际字节。测试在独立 Node 子进程内使用真实 NativeHost、TerminalSessions 和 nativeCookieReader，仅 transport I/O 可控；用 deferred 固定三种顺序，监听 uncaughtException 后明确断言数组为空。它还断言正常释放时晚到 spawn 被结束、owner 在退出前没有完成关闭、Browser Cookie 成功、最终 helper 已关闭；crash 分支确认原 Cookie 失败和新代次没有收到旧 end。隔离临时目录由 mkdtemp 分配并在 afterAll 删除，execFile 有超时。未发现该最小修复引入的新问题。

实际执行：

1. `pnpm exec vitest run src/modules/agent/services/terminal/sessions-cancellation.test.ts src/host/desktop/native/host.test.ts src/modules/browser/module.test.ts`：exit 0；3 files passed，11 tests passed，无 skip；本轮工具进程 session 96654 完成回执，Duration 14.59s。
2. `node /tmp/huhu-t01-review-rebuild-probe.mjs`：exit 0。已先阅读脚本，确认校验首轮 probe SHA256 后提取原 entry 并以当前工作区源码重新 bundle，未把旧预打包程序冒充当前代码。实际输出：

```text
{"uncaught":[]}
Original reviewer entry, rebuilt against current sources: uncaught must be empty — PASS
```

重建 probe `/tmp/huhu-t01-review-abort-repro-fixed.mjs` 的 SHA256 为 `36afca1170daa791e63240808333b459041190e357fd91870262567f00c93980`。首轮 probe 保持原摘要 `c30f9bbd3960b1c9f06b794a6721b9a795b752a952f4cb535851b16815354bb8`。

另外回读 worker 的有效 red 原输出（2 failed / 1 passed，失败来自 uncaught 数组非空）、修复后 11 tests 的 green、定向 lint/type 日志，以及 Root build-v3/bundle-v3 原输出。它们属于相应执行者的证据，本 reviewer 未重复运行构建或 lint。main.js 当前实测 6042405 B，比首轮 +9 B；启动求值仍为 123387 B，6042624/123904 预算阈值未再次增加，预算理由只更新最终字节数。

没有修改仓库文件、Git index 或 ref；仅按授权写本 /tmp 报告和重建 /tmp 探针。没有新增标准轴 finding。

## Specification

Reviewer: codex:/root/review_t01
Axis: specification
Result: pass
Input-SHA256: fc8df230d0ade566b6a291d90e1c73ca396d36fdec52ab31a531e2b749833749
Observed: 按相同冻结 T-01/AC-057、AC-059、共享 NativeHost 合同和既有消费者取消保证复审。首轮 C-01 与 S-01 是同一 P2，本轮真实消费者回归与原始反例重建均证明该异常不再逃逸。没有扩大到后续票的产品验收；其余首轮未失效的规格检查保留。

本次修复保留三项关键行为：关闭/崩溃后旧请求不再向失效租约发 end；native owner 继续处理迟到 spawn 并等待所属退出；独立 Browser 租约仍能完成 Cookie 请求。crash 后原代次的请求明确失败，新请求才取得新代次，未自动重放。严格租约、代次、last-owner shutdown 以及惰性工厂均未修改。

首轮 pending acquire/dispose 的“不另报缺陷”判断保持：取消接纳可以早于宿主最终回收，但 owner 和 closing 门仍由 NativeHost 持有，新代次等待旧 helper 清理。该路径没有被本次修复改变；没有把快速取消返回等同物理退出完成。

本轮结论为 T-01 当前代码快照的双轴通过。真实 Obsidian、真实 Provider、五平台机器 E2E 仍未运行，按用户约定由用户验收；Linux 真实 helper 的既有自动化证据和本轮隔离 transport 测试不冒充这些 E2E。Browser 无 Space/Agent-off 完整网页入口仍属 T-13，所有未来运行显式绑定 Space 的后票实现也不属于本次通过声明。既有范围外 docs 六个锚点问题保持原记录。
