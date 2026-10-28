# T-03 repair-1 独立双轴复审原始报告

Reviewer: native:/root/review_browser
Implementer: native:/root/audit_browser
Mode: native；保持独立身份，未参与实现/修复，未递归派遣。
Input-SHA256: `7dbf389cc0a226899141fcf3ef77ca27774fabb2982c45e3bd7700bf6a1b2b73`
Observed: 2026-10-27。原 3 项 finding 已闭合；本轮未发现新的阻塞问题。standards=pass；specification=pass。结论限固定源码与下述自动检查，不代表真实浏览器/宿主/平台验收通过。

## review-input

完整固定对象：[T-03-review-input-r2.json](T-03-review-input-r2.json)。摘要由工具对完整对象执行 `JSON.parse` → `JSON.stringify` 后计算，不是内部 scope.input_sha256。

- working-tree 显式 14 文件，共同 base/head 为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；本轮 Map plan_revision 6 与 T-03 新测试写集已绑定。
- 开始时逐项核验 14 文件 after SHA256 与 31 份来源原字节 SHA256，全部匹配。
- 实际读取修复的 API、Ledger、Protocol、Workspace、对应回归以及迁移后的 fixture/集成测试引用；不变持久化、RPC、依赖票与规则沿已读且摘要一致的事实复用，没有把旧失败结论改写为通过。
- 结束重跑相同 review-scope 选择：base/head、index SHA、tracked diff SHA、14 文件完整 working_snapshot 全部匹配；31 份来源再次核验全部匹配。r1 已记录的 Map/Ticket 来源漂移在本轮已重新冻结。
- 原 `src/modules/browser/platform/desktop/persistence/operation-ledger-process.fixture.ts` 实际不存在，新文件在 `test/release/browser-operation-ledger-process.fixture.ts`。原文件相对共同 Git 基线本就是新增，当前不存在不伪造 Git 删除对象。
- 结束 inventory/excluded 的新增仅为本轮输入 JSON，没有本轮审查代码漂移。

## standards-output

Reviewer: native:/root/review_browser
Axis: standards
Result: pass
Input-SHA256: `7dbf389cc0a226899141fcf3ef77ca27774fabb2982c45e3bd7700bf6a1b2b73`
Observed: 实际核对三项修复与回归，执行原生产反例及相关 deadline/生命周期边界；架构检查亲自重跑通过。无新增标准轴 finding。

### S-01：fixture 架构违规关闭

- 纯测试进程 fixture 已移到 test/release，业务源码不再从 platform 反向导入 services。
- integration test 的静态导入及 esbuild entryPoints 都指向新路径；四个 prepared/intent/effect/completed SIGKILL 接缝保留，没有通过删除故障测试或放宽架构规则解决。
- reviewer 实际运行 `pnpm test:architecture`，退出码 0：

```text
Architecture: 1248 modules; no zone, host-package, desktop-only, barrel or cycle violations.
```

本次数量是 reviewer 运行时的真实输出；不沿用作者此前 1246 modules 的数字。

### S-02：当前 execute deadline 消费缺口关闭

- BrowserAgentAccess.execute 的内部可选剩余时长回调沿 Protocol→Workspace actions 队列→OperationLedger 传递；batch 的 execute 也携带同一个请求预算，没有增加公开 JSON 参数或工具能力。
- Ledger 固定有界单调请求期限，并同时检查剩余时长回调与原票据期限。首次执行在 validate 前、validate 后、dispatch-intent 提交后且网页 dispatch 前检查到期，不能通过较晚/增长预算延长原票据或已捕获期限。
- active 与 terminal 已有操作先复用，不让短重复请求替换/取消原动作；HMAC payload 检查与原 scope/authority 门禁仍在。
- 原实际 Protocol→Workspace→Ledger 队列反例现在到期拒绝，runtime 只执行第一动作。过期的重复调用仍查询原 completed 事实：

```text
S02 closed {"remaining":0,"deadlineReads":2,"runtimeCalls":1,"state":"rejected","error":"operation_expired","duplicate":"completed"}
```

### S-03：只读实例关停回归关闭

- Workspace 用 ledgerStarted 记录实际启动账本；dispose 同时要求已启动且当前非 readOnly 才维护账本。只读第二实例不在关停时初始化或访问另一个 owner 的账本。
- 主实例维护失败仍经 finally 释放 persistence，并将维护错误保留给上层；没有通过吞错掩盖真正 journal 故障。
- reviewer 实际反例确认只读路径零账本访问且 dispose 成功；主 owner 的 checkpoint 写失败仍报告 journal_unavailable，同时 persistence 已释放：

```text
S03 closed readonly accesses=0/disposed=true
owner shutdown failure retained/persistence released
```

标准依据仍为固定 AGENTS/dev、architecture/testing、工程配置、code-review 双轴与风险/错误/可靠性合同。原子 checkpoint、低水位/精确映射、结果文件与 HMAC 的未改部分按原报告读取事实复核，没有发现因本次接缝修复而回退。

## specification-output

Reviewer: native:/root/review_browser
Axis: specification
Result: pass
Input-SHA256: `7dbf389cc0a226899141fcf3ef77ca27774fabb2982c45e3bd7700bf6a1b2b73`
Observed: 对 AC-006、原 T-03、Issue #1 §14.1/§14.3/§15.5 与当前 docs 的真实消费者、截止时间、权限和回归合同复核；原 R-01/R-02 均关闭，无新增规范轴 finding。

- 当前 execute envelope 已过期但原 prepare 票据仍有效时，动作在 Space 队列放行后不会首次派发到网页；这与“不取消已经派发的原操作”分开处理。
- ticket/request 两个期限取更早边界，运行期由单调时钟约束；重复调用不扩期限、不重复派发、不把已知完成结果改为超时新动作。
- ready/readOnly 的第二实例遵循持久 owner 边界并正常释放；主 owner 的维护失败仍可见，且释放自身 persistence。
- 迁移测试 fixture 服务于原 SIGKILL/故障验证，没有改变产品范围、公开控制 schema 或恢复旧 Run/capability 的策略。
- 原 checkpoint/水位、活动 authority 精确去重保留、结果独立正文与 unavailable、容量只重试本地写、legacy UUID、unknown 不重派等合同未被本轮修复替换。前序 T-02 观察输入/guard 作为不变依赖保留。

## reviewer 实际执行与证据

本轮没有重复全量 Vitest 或所有磁盘/进程故障套件。实际执行了固定输入/结束快照与来源核验、上述 `pnpm test:architecture`，以及一个包含原失败反例和必要回归边界的 Node assert 内存实验；实验进程退出码 0。

内存实验方法沿 r1：读取当前 workspace.test.ts 首个 describe 之前的 fixture，移除 vitest import、替换简单函数 spy，采用 esbuild stdin/write:false 和 Module._compile；生产 Protocol、Workspace、Ledger 实际执行，runtime/persistence 作为测试端口。Connection capability 使用有效长度。没有修改源文件、写临时生成物或操作真实网页；finally 释放 gate 并 dispose 工作区。

实际完整输出：

```text
S02 closed {"remaining":0,"deadlineReads":2,"runtimeCalls":1,"state":"rejected","error":"operation_expired","duplicate":"completed"}
S03 closed readonly accesses=0/disposed=true
owner shutdown failure retained/persistence released
earlier deadline {"ticketMs":50,"requestMs":10000,"state":"rejected","effects":0}
earlier deadline {"ticketMs":10000,"requestMs":50,"state":"rejected","effects":0}
active and terminal expired duplicates reuse original effects=1
```

队列反例：第一动作在 runtime 用 deferred gate 阻塞，第二张已 prepare 票经 Protocol.execute 排队；当前请求剩余预算从 1 变为 0 后释放第一动作，断言第二动作 rejected/operation_expired、runtimeCalls=1。源码及作者新增回归另有旧票 expiresAt 不被扩展的检查。没有靠 sleep 构造时序。

额外单调期限反例分别设置 ticket/request 为 50/10000 和 10000/50；validate await 后把单调时间推进到 60、把回调预算增至 10000，均仍拒绝且 effects=0。active/terminal 重复请求使用预算 0，只复用原结果，effects=1。只读端口 read/write/keys 一旦访问即抛 owned_by_other_instance，当前整个 initialize→dispose 没有触及它们；主 owner 故障反例在关停 checkpoint 写时注入 journal_unavailable，错误保留且 persistenceDisposed=true。

作者报告的 34 files/227 tests、test tsc/lint/diffcheck、四 SIGKILL 保留等是作者提供的检查事实，本报告不冒充 reviewer 亲自重跑。reviewer 的独立证据为实际修复阅读、定向反例、架构真实运行和输入核验。

## 来源、恢复边界与未验证项

继续应用已读且摘要未变的 code-review/dev 及 source-discovery、risk-review、fowler-smells、reviewer-contracts、review-evidence、working-tree-review、result-reuse，错误/可靠性和范围/研究合同。31 份来源完整，规范轴没有跳过；未增加界面，ui 不适用。

原报告明确的“核心空 checkpoint/无结果正文”实验限制保持：本轮没有扩展恢复旧 authority 的能力，没有把 core 默认 writable 实验解释为生产旧 boot RPC 重放，也没有借它开放历史查询权限。原有旧 Run/capability/control lease 重启失效的生产边界保持。该限制不因为本轮修复变成已完成的额外恢复验收。

未运行真实 Chromium/helper/Obsidian/四平台/人工视觉/性能验收，SRC-010 明确由用户执行。未构建或验证最终 main.js/browser-worker.cjs/browser-cli.cjs/generated bridge 组合，仍由 Lead 最后串行统一。代码审查 pass 不替代这些环境验证，也不是整个 change 的完成声明。

本轮唯一写入本报告；没有改源码、正式状态、旧报告或产物。findings=[]；standards=pass；specification=pass；skipped_axes=[]。交回后停写。
