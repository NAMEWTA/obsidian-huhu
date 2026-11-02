# 任务回报

Session: 20261031T062046Z
Task: 007-optional-init
Status: completed

## 聚焦交接

已完成 T-14 候选：MusicService.load 只恢复本地播放设置，Home 发布本地服务后启动并拥有音乐账号后台恢复。恢复任务去重、异常收敛并发出一次服务更新；登录/登出/关闭/销毁在异步结果写状态前撤销旧代次，原生 Cookie 不返回也不阻止 Home 激活。恢复和登录计时器归所属窗口，销毁与窗口关闭及时结算任务并释放订阅/租约，销毁幂等。真实装配链、账户竞争与其他启动模块隔离计时均已验证；候选交回后停止写入，待 Lead 独立审查、构建与最终宿主验收，未自行标 Ticket done。

## 产物与验证

修改文件：

- `src/modules/home/module.ts`：发布本地服务后启动恢复，将 music.destroy 注册给模块 lifetime。
- `src/modules/home/platform/music/music-service.ts`：local-only load、去重后台恢复及通知、幂等销毁、销毁后不再登录/登出通知。
- `src/modules/home/platform/desktop/netease-account.ts`：账号 epoch、恢复取消/期限、登录中断与迟到结果守卫、登出守卫、窗口拥有计时器和 unload 监听。
- `src/modules/home/platform/desktop/session-lifetime.test.ts`：7 个生命周期/竞争测试，使用可控屏障和窗口时钟。
- `src/modules/home/module.test.ts`（新增）：3 个真实 Home→MusicService→NeteaseAccount 装配/通知测试；仅替换无关记录、UI 和原生宿主。
- `scripts/verify-music-account.ts`：新增旧恢复成功/失败晚于新登录、关闭登录窗/销毁后的迟到 Cookie 检查；原有收费/会员播放、取消、清理、-110 重试/跳过断言保留。
- `docs/e2e/dev-overhaul/startup/{README.md,vitest.config.mjs,activation.test.ts,electron.mjs,tsconfig.json,activation-results.json,home-results.json}`：可重跑真实模块激活计时及替身边界。

行为失败证据：先观察到旧 Cookie 在 logout 后把 loggedIn 改回 true；Home Cookie 屏障未释放时 active 为 false；销毁后恢复 timer 仍为 1；session 获取被阻塞时销毁后 login 仍 pending。修复后相应断言通过，不以延长超时、放松断言或推进五秒期限获取绿灯。

实际验证（Linux、Node v26.11.1、共享工作区）：

| 命令 | 退出码与观察 |
| --- | --- |
| `pnpm exec vitest run src/modules/home/platform/desktop/session-lifetime.test.ts src/modules/home/module.test.ts` | 0；2 文件 10 测试通过 |
| `HUHU_STARTUP_REPORT=docs/e2e/dev-overhaul/startup/home-results.json pnpm exec vitest run src/modules/home/module.test.ts` | 0；3 测试通过；activate 完成即停止计时 1.709 ms，Cookie 仍挂起 |
| `pnpm test:music-account` | 0；账户/播放断言通过，media DOM 5 测试通过 |
| `pnpm test:workbench-lifecycle` | 0；10 测试通过 |
| `pnpm test:architecture` | 0；1480 模块，无边界/环依赖违规 |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0 |
| `pnpm exec tsc -noEmit -skipLibCheck` | 0（核心生产改动后已执行） |
| 定向 ESLint（Home module / music-service / netease-account） | 0 |
| `pnpm run lint` | 首次 126（内层 1）；新增 Node 计时工具受插件 lint 规则约束，见问题与下一步 |
| `pnpm exec vitest run --config docs/e2e/dev-overhaul/startup/vitest.config.mjs` | 0；所有五模块真实 activate 成功，Versioning 为 layoutReady=true |
| `git diff --check`（本票生产/既有测试及脚本） | 0 |

分模块实际 activate 单次样本：Notifications 4.580 ms、Archives 8.078 ms、Automations 82.723 ms、Agent 1059.856 ms、Versioning 240.964 ms。不是 Vitest 用例耗时；导入/工厂计时单列在 JSON。每个模块使用独立真实空临时 vault，真实生产模块/内部运行时；Obsidian/Electron、设置及服务注册等宿主装配接口为替身。样本不代表 Obsidian 整体启动、不覆盖有历史数据/账号/扩展的用户环境，也不设性能阈值。

调用审计：Notifications 必要本地 inbox load 保留；Archives 索引已有布局就绪后后台路径；Automations 读取本地定义/历史，动作不在激活执行；Agent 读取本地工作区与恢复，账号准备为显式调用；Versioning 布局就绪后处理本地 Git/历史恢复。未修改这些模块的生产实现。未采用外部代码；设计沿用仓库既有 lifetime、lease 和 epoch 机制，session.ts / Browser 宿主冻结文件未修改。

未验证：真实 Obsidian 工作台入口、关闭/重开与原生窗口集成，以及最终 build/check:bundle 产物由 Lead 执行。本票无 Git index/commit/push，未改共享 main.js/styles.css，全部候选留工作区。原生 Cookie 调用本身不能取消；已验证拥有的任务及时结算、timer 清理、迟到结果失去发布资格。

## 问题与下一步

生产实现无阻塞。Node 计时工具的 fs/path 导入被 obsidianmd/no-nodejs-modules 标为警告，--max-warnings 0 因而失败；动态导入仍警告，局部 disable 也被禁止，已移除 disable。已向 Lead 请求在共享 ESLint 的既有 Node 工具排除列表补授权 startup 工具；worker 没有修改共享配置。目录独立 tsconfig 已解决 project service 找不到工具的问题，`pnpm exec tsc -p docs/e2e/dev-overhaul/startup/tsconfig.json` 退出 0。Lead 审查候选并执行约定最终构建、工作台入口/生命周期与必要宿主验收；完成前保持待验收。隔离计时中发现的缺失 Electron import、workspace.getActiveViewOfType、editor.addExtension 均仅补齐授权夹具宿主接缝后重测通过，未扩权改生产。曾发生测试 teardown 早于重开恢复完成的 Vitest RPC 日志错误；已显式等待重开实例自己的恢复任务后销毁，随后 10 测试及重跑 3 测试正常退出。

全量 lint 首次运行退出 126（内层 ESLint 1）：新增 docs 下工具 .ts 不在 project service；两个纯 JavaScript 工具改为 .mjs，未调整共享类型或 lint 配置。最终结果见上表。
第二次全量 lint 启动早于新增目录 tsconfig，结束同样退出 126（内层 1），仍报告工具 project service 缺项；之后定向 lint 已能解析两工具，仅剩 config 的两条 Node 导入警告（退出 126）。因此不声称全量 lint 通过。Lead 加入合法工具边界后需最终复核。
