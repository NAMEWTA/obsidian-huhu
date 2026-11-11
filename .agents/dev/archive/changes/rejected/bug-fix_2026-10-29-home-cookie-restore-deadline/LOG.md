# 首页 Cookie 恢复时限决策日志

## LOG-001 — 2026-10-29 — 确认启动被 Cookie 读取拖住

- **状态：** confirmed
- **问题：** 首页模块开启时，为什么 150 秒内工作台不出现？
- **事实与来源：** 只开启 home 的一次性库里，`workbench` 为空，`home` 为 loading。音乐会话 `migration.json` 已验证。关闭首页后工作台出现。`onload` 在 `applyModuleFlags()` 之后才赋值 `workbench`。
- **结论：** 根因是 `NeteaseAccount.restore()` 等待永不返回的 `cookies.get`。不是工作台装配的暂时性死区，也不是信任对话框。
- **影响工件：** diagnosis.md、spec.md、ADR.md。

## LOG-002 — 2026-10-29 — 时限内放弃并丢弃迟到登录

- **状态：** confirmed
- **问题：** 启动恢复应该等多久，超时后怎么对待后到的 Cookie？
- **结论：** 默认 5 秒。超时保持未登录且不弹通知。代次变化后的 Cookie 不能登录。计时器用所属窗口。
- **原因：** 登录是可选能力。无限等待会挡住全部工作台。通知会在每次启动重复出现。
- **影响工件：** `src/modules/home/platform/desktop/netease-account.ts`、`session-lifetime.test.ts`、`scripts/music-vault-fixture.ts`。
