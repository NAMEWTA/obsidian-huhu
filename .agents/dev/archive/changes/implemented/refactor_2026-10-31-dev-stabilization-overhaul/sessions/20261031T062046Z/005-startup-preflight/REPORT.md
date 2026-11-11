# 任务回报

Session: 20261031T062046Z
Task: 005-startup-preflight
Status: completed

## 聚焦交接

完成 T-14 只读预检，未修改生产、测试或正式状态，也未运行测试/构建。真实阻塞链是 Home startup activation 的 Promise.all → MusicService.load → NeteaseAccount.restore → 原生会话/凭据 Cookie；现有 5 秒截止只缓解无限等待。将恢复移到后台必须同时修正代次、取消、订阅与定时器归属，否则会引入用户登录/登出后被旧恢复覆盖的问题。建议最小改动限于已分配三个生产文件与相应测试；需要 Lead 在正式实施前补充真实 Home 装配测试写集，现有 workbench-lifecycle 不触达 Home。

## 产物与验证

### 输入与范围

复用已读 SpecDev I、dev 与 testing；本轮读取 Map revision 4、T-14、ADR-005、evidence/T-14.md、execution-boundaries，以及 codebase-design、error-handling、test-reliability。T-14 仍 blocked_by T-01，当前任务只读，不是实施许可。依据为 current dev / HEAD 86c500556db1d64865c4cc7f1aff1dd83de071fa；没有执行 Git 操作。

### 真实调用链与消费者

1. src/modules/home/manifest.ts：activation 为 startup。src/app/main.ts:213/356–357 等待 registry.apply；src/app/modules/registry.ts:134–151 按顺序等待模块 activate。
2. src/modules/home/module.ts:152–163 构造 MusicService、先放 owned，再 Promise.all 等待 music.load，与四类本地记录服务一起完成后才发布 homeServices。后续 boards.recoverMoves 是本地数据一致性恢复，不应因本票顺手移出关键路径。
3. src/modules/home/platform/music/music-service.ts:150–168 同步恢复播放列表、索引、音量、模式后 await account.restore。账号恢复没有播放副作用，适合从本地播放器初始化中拆开。
4. src/modules/home/platform/desktop/netease-account.ts:66–104：getSession 去重 session acquisition；restore 等待 cookie，并使用所属 app.workspace.containerEl.win 的 5 秒定时器；cookie 在原生 get 返回后直接写 loggedIn。
5. src/app/workbench/compose-workbench.ts:42–44 的页面加载等待 activateModule，再加载实际页面。因此仅验证 NeteaseAccount.restore 超时不等于证明首页/工作台可交互。
6. 既有 UI 无需改版：src/modules/home/ui/settings/ServiceSettings.tsx 订阅 MusicService，读取 account.loggedIn；src/modules/home/ui/music/MusicPanel.tsx:66 同样订阅，:269 用 loggedIn 判定曲目可播放。后台恢复完成必须走现有 service.subscribe 通知，当前 load 没有 notify。
7. module.dispose:315–324 已销毁 owned.music；MusicService.destroy:513–525 调 account.destroy、清持久化 timer/audio/listeners；context.lifetime 是宿主 Component（src/app/contracts/module.ts:154），没有通用后台任务 API。

### 竞争与资源缺口

| 当前事实 | 风险与实施义务 |
|---|---|
| restoreGeneration 仅在 restore.catch 递增；login/logout 不递增 | 旧恢复在用户操作后返回仍可覆盖账号状态。交互操作开始即失效旧恢复，不等操作成功才失效 |
| restore.catch 无 generation 等值保护，且总是 loggedIn=false；成功路径 generation 不同也会设 false | 后台旧失败/超时会抹掉较新的成功登录。所有状态、错误与通知提交都必须先检查当前代次；失效结果完全静默 |
| cookie() 自身写 loggedIn；login.poll 直到 await cookie 后才检查 done | 已关闭/取消登录的迟到 cookie 可先发布登录状态。读取结果与发布状态分开，或向读取传入有效操作代次；检查必须在状态写入前 |
| getSession 成功无操作代次地清 this.error | 旧恢复的 session acquisition 晚到可能清掉新错误；将恢复/用户操作错误提交归到各自有效代次，不让共享获取 session 顺便覆盖业务错误 |
| restore 没有进行中 Promise 去重 | 同一账号多次恢复会并行读 Cookie，旧失败还可使新结果失效；保存恢复 task，只允许一个自动恢复 |
| destroy 不直接清 restore 局部 timer，也不使 restore Promise 立即完成 | 原生 cookie 永不返回时销毁后仍等截止。拥有可取消恢复句柄，销毁同步清 timer/监听、使任务结束；原生无取消能力的 get 仅忽略其结果，不宣称已取消底层 IO |
| login 轮询/总超时与清理使用全局 window；restore 使用所属窗口 | 保留 restore 的窗口归属，将本票触达的登录计时器统一到账号所属窗口；窗口关闭应失效恢复/登录并清资源 |
| MusicService.destroy 无 disposed 标志；login/logout finally 仍 stopPlayback/notify | 清 listeners 能避免常规通知，但迟到回调仍可操作已销毁 audio。后台完成回调必须检查 service disposed；destroy 幂等，清已登记订阅 |
| getSession 的 pending 由后台非交互恢复与交互登录共享 | 交互登录可能等待同一非交互 session 获取；不能通过修改 Browser 会话合同解决。需区分“旧恢复失效”与“底层会话已取消”，至少保证不发布旧结果、不错误复用旧操作状态；若真实 interactive recovery choice 被阻挡，作为既有合同限制报告 |

Vault 切换对应旧模块/账号销毁、新实例建立，旧实例闭包不得接触新 homeServices。窗口关闭不能只依赖 host 在 acquire 时的 win.closed 检查：Cookie 读取已经开始之后，NeteaseAccount 也必须检查所属窗口/销毁状态，并通过自身可释放关闭监听失效任务。不要改变被冻结的 src/modules/home/platform/desktop/session.ts（同时服务 web/music）或 src/host/desktop/browser-session.ts。

### 建议最小完整实施

1. MusicService.load 只负责本地设置/播放器初始化；保留幂等和不自动播放。新增一个明确拥有、去重、收敛错误的后台恢复入口或内部任务，不把裸 void account.restore 放在 module。
2. module 在核心本地服务已发布、音乐销毁已纳入模块 lifetime 后启动后台恢复，不 await 它。推荐明确登记到 context.lifetime 或沿 owned.dispose 形成唯一所有者；如果两处都可能清理，destroy 必须幂等，不能产生重复 lease dispose/通知。
3. NeteaseAccount 集中维护操作代次/恢复取消句柄。restore、login、logout、destroy/所属窗口关闭都遵守同一“有效结果才发布”的规则；用户操作开始立即淘汰旧恢复，旧成功/拒绝/超时不更改 loggedIn/error，不弹 Notice。登录轮询的 Cookie 返回也在发布前核对该次登录仍有效。
4. 后台任务仍可保留现有有界恢复截止以清理悬挂恢复，**该截止不得再被 load/activate/page 等待**；使用所属窗口计时器，任务完成/取代/销毁均清理。没有必要为去掉启动等待而引入无限重试或取消恢复期限。
5. 成功、当前有效失败或当前超时经 MusicService 现有订阅通知。继续使用现有稳定错误码和 Notice 文案，不新增 UI 状态词典、不改音乐布局。订阅者回调异常不能变成无人处理的后台 rejection。

### 测试接缝与有效反例

| 接缝 | 应新增/保留的断言 |
|---|---|
| scripts/verify-music-account.ts 的 localSession.cookies.get + 真实 MusicService | deferred Cookie 未 resolve，load 已完成，getState/本地列表/订阅可用；不推进 5 秒时钟、不靠“耗时小于 1 秒”当通过。最后显式销毁并释放 deferred，恢复全局桩 |
| src/modules/home/platform/desktop/session-lifetime.test.ts（已在 desktop 写集） | 保留 pending directory 与 destroy 的 lease 清理回归；将现有 40ms + sleep20 的截止测试改为可控时钟/屏障。覆盖恢复去重、成功、拒绝、超时、销毁、窗口关闭、取消登录、恢复→登录/登出、旧失败晚于新成功、旧成功晚于登出、无残留 timer/Notice/监听 |
| 真实 Home module + registry/contribution 接缝 | Cookie 保持 pending 时 module.activate 完成、HOME_WORKBENCH/服务已发布，工作台首页 contribution 可继续创建；同时断言禁用/重开后旧恢复不能通知新实例。Mock 限宿主/其他记录服务与外部 Cookie，不 mock MusicService.load/账号恢复链本身 |
| scripts/verify-workbench-lifecycle.ts | 现有仅测试 WorkbenchPages + 假 contribution，不能单独承接 AC-161；可继续作 shell 回归。新增真实装配测试后仍按票运行它 |
| scripts/verify-music-account.ts 既有播放用例 | 它现在 await svc.load 后假定账号已恢复为 member。拆分后必须通过明确后台完成/订阅屏障准备 member 条件，不能新增 sleep 或把 fee guard 断言放宽 |

预期 red 是旧实现无法在 Cookie 未完成且未推进恢复截止时完成 load/activation，以及旧恢复能覆盖新操作的状态断言失败；测试整体超时、fixture 出错不算 red。正式实施后定向 Vitest + test:music-account / test:workbench-lifecycle，Lead 执行 test:workbench-entry 与 E2E；生产 TS 改动再按冻结期构建及 lint 规则验证。本次没有运行这些命令，也没有实测时长。

### 写集缺口与可保持只读的位置

- **需 Lead 决定增加：src/modules/home/module.test.ts（新文件）**，或同等真实装配测试文件。当前写集只有 desktop/**、两份验证脚本及三处生产文件，现有 workbench-lifecycle 构建命令无 Obsidian alias，直接 import 全 Home 会引入未适配宿主，不能假称已有覆盖。优先新增就近 Vitest 文件，沿现有 Vitest Obsidian stub；不改 package.json。
- scripts/music-electron-stub.ts、scripts/music-vault-fixture.ts 当前只读；可以在已授权测试内暂换 localSession.cookies.get/附加窗口事件桩并 finally 恢复，未证明必须修改这两文件，暂不扩权。
- 若以 DOM 证明登录状态自动刷新，需要 src/modules/home/ui/settings/service-settings.dom.test.tsx 追加测试写集；已有订阅逻辑可用 service 通知测试承接，本次不把 UI 测试扩权当成强制前置。
- 不需要改 Browser 会话 API、session.ts、registry.ts、compose-workbench.ts、音乐 UI 或 shared lifetime 类型。registry.disposeNow 仅立即处置 active/failed 实例，对“仍在其他必要本地 IO 中的 loading 实例”没有同等清理保证；这是已有宿主边界，不能借本票修注册器。本票应尽量在核心初始化后启动恢复，避免新增 loading 阶段后台资源窗口。

### 其他模块可选 IO 的只读初筛

- Home：music 凭据恢复是已确认可选阻塞；habit/expense/pomodoro/reading 是记录读取，boards.recoverMoves 是一致性恢复，不无差别挪动。
- Agent（startup）：module.activate 主要等待 shared workspace、本地 persistence.ready、recovery owner 注册；prepareAccounts 放在显式 prepare 回调中，没有在本次所读 activate 段直接等待。Browser material 分支冻结，未研究或修改。
- Notifications（startup）：inbox.load；Archives（startup）：ArchiveRuntime.create；Automations（startup）：createAutomationRuntime。入口为本地业务装配，尚未深入证明内部没有可选外部 IO，不能标“全通过”。
- Versioning（layout-ready）：current.connect 与 restores.initialize/recoverPending 等需后续分模块计时与可选性判断，不因有 await 就判作启动缺陷。
- Safe / Huhubot（on-demand）：Safe service.probe、Huhubot 页面 runtime.start 不位于全插件 startup 主链；不据此省略未来页面性能采样。
- 本次禁止额外测试/构建，因此分模块耗时全部未测。正式实施在 docs/e2e/dev-overhaul/startup/ 保存隔离 fixture 实测、环境和 mock 边界；不冒充真实 Obsidian 启动耗时，不新增常驻生产埋点。

## 问题与下一步

Lead 核对新增真实 Home 装配测试写集，待 T-01 基线完成后以新 TASK 开放正式实现。当前没有生产补丁，也没有可接受的 AC-161/162 运行证据；此报告 completed 仅指只读预检完成。正式任务需完整补齐状态代次、后台任务所有权与验证，不应仅删除一处 await 后交付。
