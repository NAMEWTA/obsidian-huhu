---
schema_version: 3
artifact: spec
change: 2026-10-29-home-cookie-restore-deadline
status: ready
ready_for_tickets: true
sources:
  - USER: 第二轮复测要求查清首页开启时工作台 150 秒内不出现
  - CODE: src/modules/home/platform/desktop/netease-account.ts
  - CODE: src/app/main.ts
  - DIAGNOSIS: 2026-10-29-home-cookie-restore-deadline
---

# 首页音乐登录恢复的启动时限

## 问题与目标

首页是启动模块。它的激活会尝试恢复网易云音乐登录。恢复要读取 Electron 会话里的 Cookie。系统凭据服务不应答时，这次读取可以一直不返回。插件要等启动模块激活结束才公布工作台，所以整个工作台都不会出现。

目标是：可选的登录恢复失败或超时时，首页仍能完成激活，工作台仍能出现，账号保持未登录。已经成功读到的登录 Cookie 仍按原规则恢复登录。

## 解决方案与外部行为

桌面端 `NeteaseAccount.restore()` 最多等待构造时给出的时限，生产默认 5 秒。时限用所属窗口的 `setTimeout` / `clearTimeout`。

时限到达时：

- `restore()` 结束，不继续占用首页激活。
- `loggedIn` 为 false。
- `error` 为 `browser_session_timeout`。
- 不弹出 Notice。这次恢复是启动时的可选步骤，每次打开库都不应该因为钥匙串无响应而报警。

时限之后才返回的 Cookie 不能把账号改成已登录。读取开始时记下的代次如果已经变化，结果作废。

其他会话错误仍设置 `error`，并按原有文案通知。手机端 `restore()` 仍立即返回。用户主动打开的登录窗口、退出和销毁不改。

## 验收合同

- AC-01：`cookies.get` 不返回时，`restore()` 在时限内结束，`loggedIn` 为 false，`error` 为 `browser_session_timeout`。
- AC-02：时限结束后补上的 `MUSIC_U` 不能使 `loggedIn` 变为 true。
- AC-03：超时不调用 Notice。
- AC-04：真实 Obsidian 在首页模块开启时，工作台在远小于 150 秒内出现，首页状态为 active。

## 范围

包含桌面端音乐账号的启动恢复时限、迟到结果作废，以及对应回归测试。

不包含浏览器空间的系统凭据库、音乐登录窗交互、首页其他小组件的加载失败，以及 Issue 里另写的性能预算。

## 验证策略

单元测试把 `cookies.get` 换成永不返回的 Promise，使用 40 毫秒时限，断言 AC-01 到 AC-03 的可观察状态。真实 Obsidian 用首页开启的一次性库断言 AC-04。

## 未决问题

无
