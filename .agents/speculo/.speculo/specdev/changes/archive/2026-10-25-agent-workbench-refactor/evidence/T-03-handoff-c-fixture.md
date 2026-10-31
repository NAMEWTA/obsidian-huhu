# T-03 C：旧 native 惰性 fixture 窄修交接

GP-013 / Map14 / LOG-047；workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，沿 Root 指定 base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。按 Map→dev/testing→当前 Ticket/LOG 回读，未改变产品合同。唯一仓库写文件：`src/modules/agent/services/controller-native.test.ts`。

## 改动与实据

两条原测试仍完整保留：① enabled unused Agent 不进行 Provider discovery/login-shell probing/idle scheduling；② desktop module 发布 passive workbench/usage/native-cookie ports，同时 Provider preparation/probing/native acquire 均不发生。原全部断言、原 execFile/Electron 夹具保持；没有 mock SpaceService/Controller/Native 主链、删断言或 skip。

增加 withTemporaryVault：每条测试用 mkdtemp 创建自己的真实临时目录，memory 业务 adapter 增加 getBasePath 返回它，真实 Space directory inspect/realpath/stat 继续执行。原生命周期 callbacks 清理后 await Controller/module dispose；即使生命周期 callback 抛错也通过内层 finally 执行 dispose。外层 finally 等待 rm 删除仅此次新建的目录，不触碰其他进程或用户库。

未改生产目录门或生产源码；原 `workspace-service-native.test.ts` 及 A/B 文件保持 SOURCE STOPPED，未重跑其测试。

## 实际命令与退出

均由 `/tmp/huhu-check-runner.py` 记录，cwd 为上述 workspace；完整 argv、UTC、真实 subprocess exit 与原输出 SHA 在 `/tmp/huhu-t03-c-fixture-checks.json`。

| 原输出 | 命令与实际结果 |
|---|---|
| `/tmp/huhu-t03-c-fixture-red.log` | `node node_modules/vitest/vitest.mjs run --project unit --reporter verbose src/modules/agent/services/controller-native.test.ts`；**exit126，2 failed**，均为 DIRECTORY_NOT_AUTHORIZED:invalid-directory，经真实 SpaceService inspectVault 空路径拒绝，与 Root 原 `/tmp/huhu-t03-root-integration.log` 一致。 |
| `/tmp/huhu-t03-c-fixture-green.log` | 同一精确单文件命令；**exit0，2 passed，0 skip**。所有原零副作用断言通过，test finally 完成后返回。 |
| `/tmp/huhu-t03-c-fixture-types.log` | `node node_modules/typescript/bin/tsc --noEmit --skipLibCheck -p /tmp/huhu-t03-c-fixture-tsconfig.json`；**exit126**，首次自定义 closure config 只含 global.d.ts，未带项目原 Electron ambient declaration，故 files.ts/trash.ts 两项 TS2307；保留失败原件，不算通过。 |
| `/tmp/huhu-t03-c-fixture-types-green.log` | scoped /tmp config 补入既有 src/types/*.d.ts 后，同命令 **exit0，空输出**。入口只有此测试及原声明，检查其 import 闭包，未跑全库 tsc。 |

没有运行 build/full lint/其他测试、native/helper/Provider/Obsidian，未产生 main.js/styles.css/预算/依赖改动；没有 Git 操作或正式 change 写入。纯测试 fixture 修改按 dev/testing 使用测试自身与类型闭包验证，Root 独占后续总集成。

## 最终摘要与停止回执

- 唯一源文件：5,449 bytes，SHA256 `ddf2520976892701993331afa7650c6cdbc317106f1e897fab23565d84b9bb54`。
- `/tmp/huhu-t03-c-fixture-source.json`：SHA256 `55ebf425bd636ed1662bb82801336582e787de9464b6940032149f2cb107b3c3`。
- `/tmp/huhu-t03-c-fixture-checks.json`：SHA256 `98b70b2eb353b1a39e5fc3b3b441e2dc596e789082c5267a57bea5cbeeaa453f`。

**STOPPED：源码已停止写入，交还 Root 冻结/整体验收，不自行标 done。T-04 未解锁，未展开其他工作。**
