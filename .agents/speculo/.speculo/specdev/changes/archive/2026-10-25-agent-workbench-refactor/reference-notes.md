# 实施参考与复用决定

本文件由 T 维护，接收本次 `research` 辅助 Skill 的结果，服务于指定 change 的实施 Tickets。它提供工程依据，不另立产品合同；行为以 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path> 为准，已批准的 A 方案与 DESIGN 摘要保持不变。

## 1. 检索范围与准入

用户要求：遇到不熟悉的功能，先检索 GitHub 上近两年活跃、许可证明确的同类开源项目，比较实现思路、依赖和已知问题，优先复用验证过的设计，不直接复制不兼容或来源不明的代码。

本轮核查日为 **2026-10-25**，活跃窗口为 **2024-10-25—2026-10-25**。以官方仓库的实际 commit 或正式 release 时间证明窗口内活动，同时检查 archived 标志；星数、搜索结果排名、单独的 pushed_at 不替代证据。冻结内容使用完整 commit，浮动分支只用于之后重新检索。研究覆盖终端生命周期、CLI/本机控制、输入/状态等待、屏幕流控、布局与原生依赖；停止条件是每类有可定位的一手参考、HUHU 适配决定、限制及负责 Ticket。

本轮是静态代码/文档研究，没有运行这些外部产品的完整测试。公开 Issue 是风险与复现线索，除非在 HUHU 的固定依赖与环境复现，否则不能称为 HUHU 已确认缺陷。没有把任何外部源码复制进生产目录。

## 2. 五个项目的活动、许可与依赖比较

| ID / 官方项目 | 活跃证据与本轮固定版本 | 许可核验 | 实现思路、主要依赖与 HUHU 选择 |
|---|---|---|---|
| R-01 / [Herdr](https://github.com/herdrdev/herdr) | 未归档；[2026-10-23 commit](https://github.com/herdrdev/herdr/commit/5608de0608918aba2f9d501e7793b984a0ca9cfa)；继续固定 v0.9.5 / `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`，不静默换掉 G 的研究基线 | [根 LICENSE](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/LICENSE) 为 Apache-2.0；不覆盖 vendor 内单独许可的文件 | Rust 受管 PTY、运行注册表、CLI/socket 和多源状态检测；[Cargo](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/Cargo.toml) 含 Tokio、ratatui、Ghostty、portable-pty 0.9 的本地 patch。作为主要行为/机制参照，不移植 UI、parser 或整包依赖。 |
| R-02 / [Wave Terminal](https://github.com/wavetermdev/waveterm) | 未归档；[v0.14.5](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5) 发布于 2026-04-16；固定 `97e560027f494d20fed347b2d6b72b6bcb3e50e0` | [LICENSE](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/LICENSE)：Apache-2.0 | 后端控制 block，前端消费状态，wsh CLI 操作目标；[package.json](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/package.json) 为 React 19/xterm 6/Electron 41，另有 Jotai；[go.mod](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/go.mod) 为 Go 1.25.6、PTY、RPC/SQLite 等。只借控制器与视图分离、显式焦点路由；HUHU 保留 Rust、Zustand 和 Obsidian。 |
| R-03 / [tmux](https://github.com/tmux/tmux) | 未归档；[2026-10-24 commit](https://github.com/tmux/tmux/commit/acee541d6ec53127ee34488a281e0b205890ef91)；本次解析 3.8 为 `7f2a35ad3321f9ba57a1062ca73b1f3ff26aca53`，引用 commit 而非假定 tag 永不变化 | [COPYING](https://github.com/tmux/tmux/blob/7f2a35ad3321f9ba57a1062ca73b1f3ff26aca53/COPYING) 与 [README](https://github.com/tmux/tmux/blob/7f2a35ad3321f9ba57a1062ca73b1f3ff26aca53/README) 说明 ISC 及逐文件版权/许可 | C、libevent 2.x、ncurses；借 pane 稳定身份、命令结果与异步事件分流、慢客户端暂停后重同步。只作协议设计参照，不把 tmux 变成 Windows/插件运行前提。 |
| R-04 / [xterm.js](https://github.com/xtermjs/xterm.js) | 未归档；[2026-10-13 commit](https://github.com/xtermjs/xterm.js/commit/991857a1b1cacf06f9531ba74a6e927a7a6398bb)；对应现有主版本固定 6.0.0 / `f447274f430fd22513f6adbf9862d19524471c04` | [LICENSE](https://github.com/xtermjs/xterm.js/blob/f447274f430fd22513f6adbf9862d19524471c04/LICENSE)：MIT | [package.json](https://github.com/xtermjs/xterm.js/blob/f447274f430fd22513f6adbf9862d19524471c04/package.json) 的生产 dependencies 为空，终端解析/视图与 addons 分开。HUHU 已有 xterm/headless 6.0.0、serialize 0.14、fit/search/webgl 等，继续复用。 |
| R-05 / [WezTerm / portable-pty](https://github.com/wezterm/wezterm) | 未归档；[2026-10-10 commit](https://github.com/wezterm/wezterm/commit/e2a98e1b8af156988ad0ac778658ac27b60a55fb)；固定该提交的 pty 子包。最近 stable release 是 2024-02，单靠 release 不满足窗口，但维护 commit 满足 | GitHub 自动分类为 NOASSERTION，已进一步回读 [LICENSE.md](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/LICENSE.md) 的 MIT 文本及 [pty/Cargo.toml](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml) 的 MIT 声明；不是以自动标签猜许可 | portable-pty 0.9.0，Unix 使用 nix/libc，Windows 使用 windows-sys 等；HUHU 已依赖 0.9。借已有 PTY 抽象及平台限制，继续用本项目 Job/退出验证，不引入 WezTerm GUI。 |

活动、许可证文件与依赖文件的 URL、检索摘要保存在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/reference-sources.json</Path>。执行时若改变所参考提交或引入代码/依赖，重新核验目标文件的许可、依赖图、维护活动与 Issue 状态。

## 3. 可直接定位的机制与 HUHU 适配

| 主题 | 一手定位 | 采用或保留的差异 | 实施票 |
|---|---|---|---|
| runtime 独立于面板 | Herdr [runtime_registry.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/terminal/runtime_registry.rs)、[runtime.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/terminal/runtime.rs)；Wave [blockcontroller.go](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go) | Session、运行代次与显示引用分离。Herdr/Wave 的关 pane/block 可能结束运行；HUHU 关显示只 detach，显式 stop/归档才收束。共享 helper 的 Cookie/历史租约另算。 | T-01、03、04、13 |
| 输入与等待 | Herdr [agents.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/api/agents.rs)、[wait.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/wait.rs)、[Unix actor](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/pty/actor/unix.rs) | 文本+提交统一仲裁，状态水位避开旧 idle，等待结束与停止分开。HUHU 额外约束有界输入与取消未开始操作；不新增任务 Run/Outbox。 | T-07、08 |
| 控制目标与焦点 | Wave [focusblock CLI](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/cmd/wsh/cmd/wshcmd-focusblock.go)、[RPC types](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/wshrpc/wshrpctypes.go)；tmux [Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode) | 稳定目标 ID、普通查询无隐式切焦点、命令结果与事件分开；HUHU 默认当前 Space，显式目标可同 Vault 跨 Space，禁止跨 Vault。 | T-07、09 |
| 屏幕与慢观察者 | [xterm Flow Control](https://xtermjs.org/docs/guides/flowcontrol/)、[tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode) | 使用解析完成/消费确认形成背压；只丢可重建显示帧，保留原始字节解析。由 headless 一次回复设备查询，再以快照水位接增量；不直接套用 tmux 的阈值或协议。 | T-05、08 |
| 原生历史与恢复 | G 的 LOG-013 H08/H09/H12；HUHU <Path>src/modules/agent/platform/desktop/history/resume-command.ts</Path>、<Path>native/pty-server/src/agent_data.rs</Path> | 复用现有解析/索引/精确 argv，新增 Vault 归属与占用核对；不以 Herdr 的自动重启恢复覆盖 HUHU 的显式继续，不引入 Wave 的业务存储栈。 | T-11、12、15、16 |
| 被动邮箱 | HUHU 已有 <Path>src/shared/json-store.ts</Path>、<Path>src/shared/storage/write-queue.ts</Path>；Herdr 的事件机制仅作通知方式参照 | 没有证据证明参考项目现成提供 HUHU 的持久 list/read/ack 合同。先复用本项目存储接缝实现有限的数据操作，读取不自动 ack，消息不唤醒模型；无需复制任务平台。 | T-10 |

## 4. 已知问题、限制与验证责任

| ID | 已核查来源及状态 | 对本项目的验证动作 |
|---|---|---|
| K-01 | [Herdr v0.9.5](https://github.com/herdrdev/herdr/releases/tag/v0.9.5) 撤回 Codex turn hooks，回到屏幕检测；还修复了命名 Claude 会话的 blocked 识别 | T-06 记录真实 CLI 版本及信号来源，可靠原生事件优先，不假定一个 Hook 永远有效；unknown 不冒充 idle。T-08 检查 blocked 时拒绝普通 prompt。 |
| K-02 | 同一 [v0.9.5](https://github.com/herdrdev/herdr/releases/tag/v0.9.5) 修复 macOS 中日韩输入/前缀快捷键、Windows 非 ASCII 用户目录、PATH 同名目录问题 | T-03/08/18 在相应平台加入中文 IME、多行粘贴、非 ASCII 路径、程序路径解析的真实回归；不能仅以 shell 英文 echo 代表 TUI 输入。 |
| K-03 | [xterm Issue #6063](https://github.com/xtermjs/xterm.js/issues/6063)，核查时 open，2026-09-18 更新；报告 6.0.0 增高 rows 且已有 scrollback 时缺 BufferLine | T-05 用 HUHU 实际锁定版本复现 resize/备用屏/持续输出的相邻场景，先记录是否受影响，再选兼容修复或经过回归的版本；不能未复现就升级所有终端依赖，也不能无视报告直接复制上游最新代码。 |
| K-04 | xterm [Flow Control](https://xtermjs.org/docs/guides/flowcontrol/) 明确高输出会压垮无背压消费者；tmux [Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode) 的 pane 输出不保证独立有效 UTF-8，暂停后由客户端重同步 | T-05 验证任意字节/ANSI 分片、慢观察者恢复、有限缓存与 stop 优先；T-18 重跑集成负载。公开机制不是 HUHU 性能数据。 |
| K-05 | [portable-pty Issue #4784](https://github.com/wezterm/wezterm/issues/4784) 是 Windows 0.8.1 的清屏报告，状态 closed，最后更新 2024-06-05 | 历史报告用于 T-03/05/18 的边界回归，不宣称 0.9 仍受影响或已有验证修复。Windows 子进程树回收仍用本项目 <Path>native/pty-server/src/job.rs</Path> 与实机退出证据确认。 |
| K-06 | [Wave v0.14.5 release](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5) 记录配置不存在时创建编辑、网页鼠标前进后退、剪贴板尾空白等修复 | T-09/13 保留焦点、网页标签/历史与复制体验的回归；借其分离思路并不证明搬来控制器即可解决 HUHU 宿主生命周期。 |
| K-07 | Herdr 根许可不能覆盖其 vendor；tmux README 要求逐文件看许可；WezTerm 自动 license 分类不直接代表 pty 子包许可 | T-17 汇总逐文件来源/commit/许可和 NOTICE；GPL/AGPL 终端源码不阅读、不复制、不改写，LGPL 打包及无明确来源的代码不引入。能借鉴公开行为的范围与能复用代码的范围分开。 |

## 5. 已确定的复用路线

1. **保留现有资产**：HUHU 的 React/Zustand、xterm/headless、Rust portable-pty、账号/Hook/历史解析、终端设置、自动化完整原生结果合同，以及已批准的 A 页面结构。
2. **借鉴机制**：以 Herdr 为主，Wave 佐证控制器/视图分离，tmux/xterm 佐证事件与流控；共享 native owner 仍按 HUHU 多模块消费者设计。
3. **只补缺口**：Space/持久 Session、同 Vault 控制入口、明确输入/等待语义、被动邮箱、历史归属与精确继续、恢复及备份。不为借鉴某项目而引入新的桌面外壳、远程 daemon、数据库平台或 Provider Chat 平台。
4. **实施前再核查陌生点**：每票执行者先查对应 R/K；发现这里未覆盖的陌生功能时，继续检索官方 GitHub 项目及近两年实际活动，比较至少两个合理方案（确实只有一个时记搜索过程），记录依赖、逐文件许可、Issue 与适配代价。高影响冲突交回 S/G，低影响实现选择留在本票 Evidence。没有找到适合复用的代码时可以自行实现，但须保留检索与不采用理由。
5. **证据记录**：在所属 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/</Path> 票据证据中记录来源 URL、commit/版本、活动日期、license path、读过的机制、采用/不采用理由、适用测试；实际改编才按项目规则更新 NOTICE、第三方说明与生成声明。研究本身不批准新增依赖。

## 6. 当前结论与未知边界

没有需要改变已确认产品范围或 A 方案的研究结论。K-03 是否影响 HUHU、各 Provider 最新版本状态准确率及五个平台上的实际行为属于有明确接缝的实施验证事项，分别归 T-05/06/18，未冒充已通过。所有代码路径以 T 规划基线 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93` 为准；执行前发生漂移时重新定位。
