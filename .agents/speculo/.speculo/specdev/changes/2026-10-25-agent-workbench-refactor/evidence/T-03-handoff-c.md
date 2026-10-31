# T-03 C：真实 native 组合测试交接

2026-10-25，6.1-sol/xhigh；workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，base/HEAD 按 Root 派单 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。T-14 只读预检已先交付；本次仅获授权新增 `src/modules/agent/services/workspace-service-native.test.ts`，未改生产源码、其他测试/fixture、native/shared/host、依赖、正式 change、生成物、预算或 Git。

## 真实覆盖与限制

最终精确运行：Linux **1 test passed，0 skipped，exit 0**，测试本体 506ms。使用生产 NativeHost → PtyHelper → TerminalSessions → WorkspaceService，真实 createDesktopSpacePorts 的 Directory/WriterOwner、SpaceService、createSpaceWorkspaceStore 与 JsonStore；仅隔离 TextStorage 适配临时磁盘，Shell launch port 传入原 options.runtime/cwd/beforeSpawn，未替换关键业务实现。spy 仅观察真实 transport.spawnSession 原方法。Bash 只用内建 printf/read/算术，禁 profile；没有 Provider、子后台命令或用户资料。

- A 显式 Space 前台启动并产生布局/焦点；B 显式另一 Space 后台启动：原选中 A、active tab/group、sessions.focused 和 show 调用保持，B 无 Pane 但可按持久 Session 查询 runtime/PID。
- launch port 在真实 helper 入口前回读 JsonStore 文件，断言该 Session 已属于显式 Space；实际 B cwd 是临时 b 目录。
- B 无 Pane持续真实输出；首次 6 路并发 attach 只产生一个显示引用，并切到 B，仍为原 TerminalSession/PID。
- 关闭 B 最后视图不询问 stop、不结束进程；headless 在零视图下继续收到至少三轮输出，viewState=detached。
- 6 路并发重新 attach 仍为同 runtime/PID/对象，只有一个视图；新 subscriber 回放 detach 期间保留的 headless 屏幕，然后继续 live 输出。两 Shell 全流程仅 **2 次真实 spawn**。
- finally 仅结束本测试自有 Session，依次释放 native owner、等 helper 退出、释放 Space writer；检查两个 Shell/helper PID 均不存在后，真实 writer 能重新 acquire/close，最后删除临时根。没有扫描/kill 其他进程。

这不是真实 Obsidian focus/renderer/几何验收；只证明业务状态、服务焦点投影与 headless 回放。六 Provider/账号/权限/受控迟到由 A 覆盖；真实宿主/Provider/五平台按 Spec §11 由用户验收。Rust 未改、未构建；非 Linux、缺 helper 或缺 Bash 时源码会给明确 skip 原因，此次没有 skip。A/B 全文件仍活动，**结果为时点观察，不是最终固定快照**；Root 停写冻结后重验变化闭包。

## helper 与运行原件

运行前实际核对已有 debug helper：`native/pty-server/target/debug/huhu-pty`，21,681,960 bytes，SHA256 `5f01f05d62625f4199eb3a61866bbbc94697536446dfe7972f4d74cb63aafe91`；release 不存在。API 冻结回执 SHA 与派单一致：`0742ec1ee8954a2897724063e615c6aa913f780ecb8874b8c8937908ea8a8be2`。

最终 verbose 原输出 `/tmp/huhu-t03-native-c-verbose.log` 记录：A runtime `terminal-6e11365d-5475-41cf-bef2-b9bcf19f8094`；B runtime `terminal-09d28308-563c-4aa7-bf45-b7caee087bc2`；B Session `e1563aaf-d716-48c8-a230-03375be40d3e`；Shell PID `1383568 / 1383571`；helper PID `1383566`；detachedTick=7、realSpawnCalls=2。cleanup 日志确认 processesExited=true、writerReleased=true，临时根 `/tmp/huhu-t03-managed-native-qxZZbY` 已删除。

所有检查使用既有 `/tmp/huhu-check-runner.py`，精确 argv/cwd/UTC/真实 subprocess exit/output SHA 均在各自 `.json` 与总表 `/tmp/huhu-t03-checks-c.json`。命令 cwd 均为上述 workspace：

| 原件前缀（均 /tmp/） | 实际命令及结果 |
|---|---|
| huhu-t03-native-c-first | `node node_modules/vitest/vitest.mjs run --project unit src/modules/agent/services/workspace-service-native.test.ts`；exit0，1 passed；默认 reporter 未回显 console。 |
| huhu-t03-native-c-types-first | `node node_modules/typescript/bin/tsc --noEmit --skipLibCheck -p /tmp/huhu-t03-native-c-tsconfig.json`；**真实 exit126**，TS2344：新测试 vi.spyOn 泛型误用。只将本文件声明修为 MockInstance<PtyHelper['spawnSession']>；失败原件保留，不算通过。 |
| huhu-t03-native-c-verbose | `node node_modules/vitest/vitest.mjs run --project unit --reporter verbose --silent=false --disableConsoleIntercept src/modules/agent/services/workspace-service-native.test.ts`；exit0，1 passed、0 skip，含真实 PID/退出清理原输出。 |
| huhu-t03-native-c-types-green | 同 scoped tsc 命令；exit0，空 stdout。配置只以此新测试、global.d.ts 及其 import 闭包为入口，不是全库 tsc。 |

这是新增独立集成测试，生产行为首跑即绿；没有伪造业务 red。首次真实类型失败与修正后 green 都保留。未运行其他测试、全库 lint/build/tsc，未生成 main.js/styles.css；没有为了重复验证扩大检查。

## 文件摘要与停止回执

唯一仓库写文件 `src/modules/agent/services/workspace-service-native.test.ts`：12,844 bytes，SHA256 `dec2134b65b65037ae1ef8d8472f89cf17543c74d8370dc4e1686ccabe88f77b`。

- `/tmp/huhu-t03-source-c.json`：所写/所读输入 path/SHA/bytes、helper 与活跃来源说明；SHA256 `600865200003514558d92991ba9e6e2a4c2f5d023a23058f601ae1a11d6db7e4`。
- `/tmp/huhu-t03-checks-c.json`：完整命令/exit/原输出/runner 与 scoped 配置摘要；SHA256 `c5bce044b53944073bfd3149ffcd4851fd8784750729a77357b88ab4016b28f9`。

规则采用：复用 dev testing 的真实边界/故障原件/有界等待、architecture 的生产 owner/公开端口与 Node desktop 限制（测试夹具使用 Node），licensing 的既定来源，不引入依赖或复制终端实现。Root 当前授权真实临时 Shell/helper 自动化，未触碰用户 E2E 分工。

**STOPPED：唯一源文件已停止写入；交还 Root 冻结、独立审查与整体验收，不自行标 done。**
