# 任务回报

Session: 20261031T062046Z
Task: 025-host-cleanup-repair
Status: completed

## 聚焦交接

022 独立审查 S1/S2 的修复候选已交回，四项源码/测试停止写入。Host disposer 的执行结果持久归属原 session；refresh 完成不再遗忘失败，重连中的同步异常不再跳过进程停止。原 owner 等待进程和 Host 结果收齐后才失败，调用者观察超时不取消清理。completed 仅表示候选交回，等待 Lead 与 sources 对新输入复审；原018/022失败候选及历史证据均保留。

## 产物与验证

### 影响与边界

current/dev，base HEAD `86c500556db1d64865c4cc7f1aff1dd83de071fa`。先只读 TASK、022 REPORT、runtime/managed/stop 实现、module 调用方和既有测试，向 Lead 提交影响及红灯计划；收到 wave3 结束明确放行后才写。复用 dev/testing 与原票合同，无新增外部代码、依赖或公共 API。仅下列四路径和本 REPORT 有本次修改，T16 五项、其他六项 T06、T04/Go/wire/schema、共享生成物均未修改；无 Git 写入或递归派遣。

- `src/modules/huhubot/platform/desktop/runtime/client-runtime.ts`：每个已注册 disposer 包装为最多执行一次的 Promise，同步抛错和异步拒绝统一保存于 session 的 Host 工作集合；refresh 自身失败也保留。统一 finishHost 收集在途 refresh 和该 owner 全部清理结果，再结算 managed session 已有 retainUntil 屏障。重连与晚到 Host 的失败路径先独立启动 stopOwned，再 allSettled 等进程/Host 结果，不提前清掉未完成 owner。自然退出、refresh、stop 复用结果，不重复调用非幂等 disposer；refresh 在 await 前后动态检查关闭状态，晚到 Host 先清理再退出。
- `src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts`：同步/异步 refresh 清理失败已结算后再 stop，必须失败且清理一次；closed HAP 重连同步 cleanup throw，必须立即启动原进程停止，held exit 前观察超时，释放 exit 后同 owner 准确 failed，不能二次 launch。
- `src/modules/huhubot/platform/desktop/transport/managed-session.test.ts`：三个场景使用真实 createBotRuntime、launchManagedBotSession、managedStop、模块级 reservation；仅物理 transport/HAP 与安装环境是替身。两个 runtime 共享同绝对 Profile，held exit 时阻止第二次 launch，退出后 Host 失败进入 recovery-required，第二 runtime 仍不能 launch；不只检查 mock 错误字符串。
- `src/modules/huhubot/platform/desktop/transport/runner.test.ts`：真实 Go Runner 的同步/异步 Host cleanup 失败已结算后 stop；真实退出 code0、signal null、forced false 和四阶段完整也不能掩盖 Host 失败，state failed 且第二 runtime 被 recovery-required 阻止。finally 仅处理自己持有的 transport，先收割再由既有 fixture 删除临时根，异常时显式 force 收尾。

### 实际验证与失败记录

Linux，当前 Node26/pnpm11/Vitest5 工具环境。Go 构建由 runner 测试既有 beforeAll 执行，`GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0`；sources 明确释放 T09 窗口后才运行，完成后已通知释放。没有全量 Go、插件构建、真实 Obsidian 或跨 OS 实测。

| 实际命令 | 结果 |
|---|---|
| `pnpm exec vitest run src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts -t 'settled\|synchronous reconnect'` | 126，内部 Vitest 3失败/13未选中；sync/async refresh 后 stop 意外 resolved，重连 close 调用0；真实行为红灯，`/tmp/huhu-t06-cleanup-red.log` |
| `pnpm exec vitest run src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts` | 0，16例，1.01s；初步修复后 `/tmp/huhu-t06-cleanup-control.log` |
| `pnpm exec vitest run src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts src/modules/huhubot/platform/desktop/transport/managed-session.test.ts src/modules/huhubot/platform/desktop/transport/managed-stop.test.ts` | 0，27例，898ms；`/tmp/huhu-t06-cleanup-controls.log` |
| `pnpm exec vitest run src/modules/huhubot/platform/desktop src/modules/huhubot/services/events/runner.test.ts` | 0，11文件67例，25.99s，原59例全部保留；`/tmp/huhu-t06-cleanup-joint.log` |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` 首次 | 126；新增 await 前后重复 closed 比较触发 TS2367，编译器保留了旧窄化。改为动态 inactive() 检查，非行为红灯；`/tmp/huhu-t06-cleanup-types.log` |
| `pnpm exec eslint src/modules/huhubot/platform/desktop/runtime/client-runtime.ts --max-warnings 0` 首次 | 0；`/tmp/huhu-t06-cleanup-lint.log` |
| `pnpm test:huhu-bot-architecture` | 0，77 production files；`/tmp/huhu-t06-cleanup-architecture.log` |
| 同上测试类型命令，修正后 | 0；`/tmp/huhu-t06-cleanup-types-retry.log` |
| 同上生产定向 eslint 命令，修正后 | 0；`/tmp/huhu-t06-cleanup-lint-retry.log` |
| 同上三个控制文件命令，修正后 | 0，27例，1.04s；`/tmp/huhu-t06-cleanup-controls-retry.log` |
| `git diff --check` | 0 |

联合67例之后唯一生产变化是将等价的 await 前后关闭判断移入动态 inactive()，解决 TS2367；对此重跑受影响控制27例、类型和定向 lint，未无依据重复真实 Go 构建。所有最终运行无跳过；最初红灯的13项为 -t 未选择，不是跳过负向回归。共享最终生成物/预算由 Lead 负责，旧预算观察不改写成通过。

### 完整十项候选 SHA256

本次实际改动仅上文四项，其余六项摘要用于绑定累计 T06 新候选。

```text
a4496f6fec41c8f8d073c09bf309093cca535b9adf3e1cb551d6326cfb066514  src/modules/huhubot/platform/desktop/runtime/client-runtime.ts
b8ac454178efbd8aabe19cacf3e15cd8aae5f770786e3133f75575abf2a56862  src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts
e31e38f2e1ccac82b27f0e02e7ebebbc49550c87c3eba7fe8fff1d4814084d57  src/modules/huhubot/platform/desktop/transport/managed.ts
2c4a772b84d2ac94941b6c9a66345f0ea8fd879fa9f23accd608d051199308a8  src/modules/huhubot/platform/desktop/transport/managed.test.ts
1a21bdae29af6f89d9c8242e414d3713cb39dbe1c58188ce082656bb55c75b96  src/modules/huhubot/platform/desktop/transport/managed-stop.ts
f7e3efc5b6f61618edc638a4ef7f8ae13a011e7326fa868c84122cbf899384eb  src/modules/huhubot/platform/desktop/transport/managed-stop.test.ts
d44b7abce3e04a2b415efa7170cc8d6e97f2e89cfd495ae60dc593c1e9dce5e4  src/modules/huhubot/platform/desktop/transport/managed-session.test.ts
d16319eab8490858d1f716d65230a6cc4fb7026d6cdabf2dd65d7ff964762ed8  src/modules/huhubot/platform/desktop/transport/credentials-runner.test.ts
9edfb161866af8f4a93d7d1645fb2259cb41cd27d4048c2171aab29d9094477e  src/modules/huhubot/platform/desktop/transport/runner.test.ts
837fcb37938341596b2b84b263425d194ffd8a651af477b7631dd80527be64e3  src/modules/huhubot/services/events/runner.test.ts
```

## 问题与下一步

无已知残余阻塞，四项已停写，等待 Lead 固定新快照供 sources 两轴复审。失败 reservation 的恢复边界保持不变：进程内记录持续到实际模块缓存被销毁或宿主进程退出；普通停用/重启模块并不保证清除 ES module 状态，未新增自动接管或恢复 API，也不把 reload 当已验证恢复。T33 仍应消费真实 failed/recovery-required 状态并提示明确恢复。
