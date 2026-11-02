---
schema_version: 1
artifact: diagnosis
change: 2026-10-29-home-cookie-restore-deadline
status: root-cause-confirmed
feedback_loop_ready: true
red_command: "只开启 home 的一次性库启动 Obsidian，150 秒内检查 app.plugins.plugins.huhu.workbench 与 registry.state('home')"
red_evidence: "150 秒内 workbench 仍为空，home 停在 loading。会话目录 migration.json 已是 phase fresh 且 verified true，说明会话目录已经准备好，卡住的是随后的 cookies.get。回归测试 a cookie read that never returns does not keep startup waiting or accept a late login 把同一症状收成 40 毫秒时限。"
cleanup_status: clean
updated_at: 2026-10-29T09:00:00+08:00
---

# Diagnosis: 首页开启时工作台不出现

## 1. 现象与影响

干净库把首页模块留在开启时，150 秒内工作台不出现，模块状态停在 activating / loading。关掉首页后，同一启动路径几秒内就能出现工作台。其他模块的激活没有这条等待。影响是默认设置下整份工作台不可用，不是某一个首页小组件空白。

## 2. 红灯反馈回路

- **命令：** 只把 home 设为启用，其余模块关闭，启动 Obsidian 1.14.5 并轮询 `app.plugins.plugins.huhu.workbench`。
- **至少一次真实输出：** 超过 150 秒，`workbench` 仍为假，`registry.state('home')` 为 `loading`。同一次运行里，音乐会话的 `migration.json` 已经写成 `phase: fresh`、`verified: true`。
- **精确症状断言：** 首页激活结束之前，插件不会给 `this.workbench` 赋值；激活结束取决于 `music.load()` → `NeteaseAccount.restore()` → `cookies.get`。
- **耗时：** 红灯观察超过 150 秒仍未返回。修复后同一探针在 6730 毫秒得到 `workbench: true`、`home: active`。
- **确定性/复现率：** 在没有系统凭据服务的这台 Linux 环境里稳定复现。回归测试用永不返回的 `cookies.get` 稳定复现，不依赖那台机器的钥匙串。
- **Agent 可运行性：** autonomous
- **无法建立时已尝试方式和所需输入：** 不适用

## 3. 最小复现

- **环境与输入：** 桌面端、首页模块启动激活、`NeteaseAccount.restore()`、`cookies.get({ url: 'https://music.163.com' })` 不返回。
- **剩余步骤：** 插件 `onload` 先 `applyModuleFlags()`，再赋值 `workbench`。首页 `activate()` 等待 `music.load()`。
- **逐项删除证据：** 关掉首页后工作台出现，所以不是工作台装配本身。会话目录已经验证通过，所以不是 `session.fromPath` 没返回。`composeWorkbench` 里后声明的 `refresh` 没有在订阅时立刻调用，全模块启动在时限修复后能赋值 `workbench`，所以不是暂时性死区。
- **最后红灯证据：** 永不返回的 Cookie 读取让 `restore()` 不结束。
- **捕获物：** 无

## 4. 假设与证伪

| 排名 | 假设与预测 | 支持证据 | 单变量实验 | 结果 |
|---|---|---|---|---|
| 1 | `cookies.get` 在系统凭据服务不应答时永不返回，首页启动被它拖住 | 会话目录已验证，状态仍是 loading | 只让 `cookies.get` 挂起，其余会话步骤正常 | 确认。`restore()` 在时限前不返回 |
| 2 | `composeWorkbench` 在声明 `refresh` 前就调用它，抛出暂时性死区 | 源码里若干闭包引用后声明的 `refresh` | 全模块启动并检查是否赋值 workbench | 排除。订阅不会立刻调用监听器，修复 Cookie 等待后工作台出现 |
| 3 | 首页以外的某个启动模块单独卡住 | 关掉首页后工作台出现 | 只保留 home | 排除。单开 home 就会卡住 |
| 4 | 信任对话框没点掉，所以工作台看起来没出现 | 信任对话框会挡住界面 | 点掉信任按钮后继续等 | 排除。对话框消失后 home 仍停在 loading |

## 5. 已确认根因

- **触发条件：** 桌面端首页启动激活，并且网易云 Cookie 读取不返回。
- **失败机制：** `restore()` 没有时限。它处在首页 `activate()` 的 `Promise.all` 里，模块注册表会等这次激活。插件要等启动模块激活完才赋值 `workbench`。
- **根因位置：** <Path>src/modules/home/platform/desktop/netease-account.ts</Path> 的 `restore()` / `cookie()`。
- **漏检原因：** 原有生命周期测试把 Cookie 读取打成会返回的桩，没有覆盖永不返回。真实钥匙串不可用只在这台没有系统凭据服务的环境里出现。
- **为何排除其他候选：** 见假设表。会话目录完成和关闭首页都能把等待点收窄到 `cookies.get`。
- **确认实验：** 挂起的 `cookies.get` 必须在时限内结束恢复，并保持未登录；事后补上的 `MUSIC_U` 不能把账号改成已登录。

## 6. 修复契约

- **必须改变：** 启动时的可选登录恢复在时限后结束。超时后账号保持未登录，首页激活继续，工作台可以出现。迟到的 Cookie 结果不能登录。
- **必须保持：** 手机端 `restore()` 仍直接返回。用户主动登录、退出和销毁语义不变。超时不弹通知。其他会话错误仍可以通知。Cookie 仍只留在隔离会话里，不写入设置。
- **正确测试 seam：** <Path>src/modules/home/platform/desktop/session-lifetime.test.ts</Path>
- **回归测试：** `a cookie read that never returns does not keep startup waiting or accept a late login`。修复前这条会一直等到测试超时；修复后 1 秒内结束，`loggedIn === false`，`error === 'browser_session_timeout'`，随后放入的 `MUSIC_U` 仍不能登录。
- **OUT：** 不改浏览器模块的空间凭据策略，不实现系统钥匙串，不改音乐登录窗口的交互。
- **风险与回滚：** 时限内钥匙串较慢时，这次启动会显示未登录，用户可以再打开音乐页登录。回滚是去掉时限，但会恢复工作台被拖住的故障。
- **推荐下游：** I-implement

## 7. 清理

- **原始回路重跑：** 修复后的首页单独启动在真实 Obsidian 中于 6730 毫秒到达工作台，home 为 active，控制台错误为空。全模块启动于 7451 毫秒到达工作台。
- **`[DEBUG-...]` 搜索：** 无临时插桩。
- **一次性脚本/原型：** 启动探针只留在本次点测过程，不进入仓库。
- **未清理项 owner 与删除条件：** 无
