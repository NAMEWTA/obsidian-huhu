# 工作台五平台人工验收清单

本清单交给用户在真实 Obsidian、真实 Codex/Claude 和真实机器上执行。代码层面的自动化已在开发机（Linux x64）完成；其余四个平台、真实宿主、真实 Provider 和输入法**没有**在那里运行过，不能用别的平台或自动化结果代替。每个平台独立填一份记录，缺项就写“未运行”，不要写通过。

## 先记录候选版本

每份记录先填：

| 项 | 内容 |
|---|---|
| 操作系统与版本 | |
| CPU 架构 | x64 / arm64 |
| 插件版本与 `main.js` 的 sha256 | |
| `huhu-pty`、`huhu` 的版本与 sha256 | 来自同一次 `terminal-build` 的 `terminal-artifacts` |
| Obsidian 版本 | |
| Codex、Claude Code 版本 | |
| 测试库 | 用全新空库，不要用日常库 |

## 平台矩阵

CI 配置已核对为同一提交跑下面五行（`.github/workflows/terminal-build.yml`，`cargo test --locked`、release 构建、`scripts/verify-pty-helper.mjs`、打包与兼容记录）。“配置核对”只说明 workflow 写了这一行，**不等于**该 runner 已成功运行，更不等于真实 Obsidian 验证。

| 平台 | runner | target | helper 资产 | CLI 资产 | 本表人工结果 |
|---|---|---|---|---|---|
| Linux x64 | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | `huhu-pty-linux-x64` | `huhu-linux-x64` | 待填 |
| Linux arm64 | `ubuntu-24.04-arm` | `aarch64-unknown-linux-gnu` | `huhu-pty-linux-arm64` | `huhu-linux-arm64` | 待填 |
| macOS x64 | `macos-15-intel` | `x86_64-apple-darwin` | `huhu-pty-darwin-x64` | `huhu-darwin-x64` | 待填 |
| macOS arm64 | `macos-15` | `aarch64-apple-darwin` | `huhu-pty-darwin-arm64` | `huhu-darwin-arm64` | 待填 |
| Windows x64 | `windows-latest` | `x86_64-pc-windows-msvc` | `huhu-pty-win32-x64.exe` | `huhu-win32-x64.exe` | 待填 |

每个平台各自核对 `.sha256` 与 `huhu-<平台>.compat.json`（协议主版本、`sha256` 指向自己）。

## 各平台的代码路径

| 平台 | 资产选择与下载 | 控制通道 | CI 验证 |
|---|---|---|---|
| Linux x64 / arm64、macOS x64 / arm64 | `src/host/desktop/native/binary.ts` 按平台与架构选 `huhu-pty-<平台>-<架构>`；CLI 同源 `binary-cli.ts` | `native/pty-server/src/control/unix.rs`（Unix 套接字，当前用户权限） | `terminal-build.yml` 对应行 |
| Windows x64 | 同上，资产带 `.exe` | `native/pty-server/src/control/windows.rs`（命名管道，当前用户/SYSTEM ACL） | `terminal-build.yml` 的 `windows-latest` 行 |

## 第 0 步：本机预检（每个平台）

在能构建的机器上：

```sh
cargo test --locked --manifest-path native/pty-server/Cargo.toml
cargo build --locked --release --manifest-path native/pty-server/Cargo.toml
node scripts/verify-pty-helper.mjs native/pty-server/target/release/huhu-pty native/pty-server/target/release/huhu
```

Windows 的程序名带 `.exe`。验证脚本退出码 0 才算这一步通过。没有构建环境时，直接使用 CI 产物，并只做校验值与兼容记录核对。

## 通用场景

在每个平台、用全新空库逐条执行。每条记录“通过 / 未通过 / 未运行”和现象；未通过要保存终端与设置页的截图。

| # | 场景 | 步骤 | 期望 |
|---|---|---|---|
| M-01 | 两个 Space | 创建 Space A 与 Space B（相同名称、相同目录各试一次），分别启动 Shell | 两个 Space 是独立对象，会话、布局和历史不混；重命名后 ID 不变；创建空 Space 不启动进程 |
| M-02 | 后台 A/B | 在 A 中用“在后台启动”创建 B，不打开窗格 | 侧栏立即出现 B，不抢当前焦点；B 的输出和状态持续更新 |
| M-03 | 跨 Space 控制 | 在终端里 `huhu --json session list --all-spaces`；`huhu --json agent prompt ... --wait done` 指向另一 Space 的会话；再 `terminal read` | 默认只涉当前 Space；明确目标才能跨 Space，回执带原归属；等待超时说“目标继续”，不重发输入 |
| M-04 | 人工审批 | 让 Codex/Claude 触发一次权限提示 | 控制输入被拒绝而不是注入；侧栏出现待处理，点击回到原终端，只能由你批准或拒绝，批准后同一会话继续 |
| M-05 | 关面板与重新附加 | 让会话持续输出，关闭其窗格，再从侧栏重新附加 | 关闭只解除显示，进程继续；重新附加是同一运行，屏幕连续，没有第二个进程 |
| M-06 | 历史继续与冲突 | 结束一个 Codex/Claude 会话；在“当前 Vault 历史”预览并继续；再在另一个 Obsidian 窗口或另一个库对同一会话继续 | 预览不启动进程；确认框写明目录；继续保持原 Session 身份、新运行；同一原生对话同时只有一个可写运行，另一处报冲突或定位，不 fork；取消不启动 |
| M-07 | 独立网页 | 不创建任何 Space，打开网页标签；停用 Agent 模块后再打开 | 网页独立可用；Cookie 读取不启动 Agent 或终端；停用 Agent 不影响网页 |
| M-08 | 退出恢复 | 有运行中的会话时退出 Obsidian 再重新打开 | 进程随宿主结束；Space 与布局恢复；会话显示“已停止/可继续”，不自动启动、不重发提示词；明确继续才启动新一代 |
| M-09 | Codex 与 Claude | 两个 Provider 各自创建、输入、读屏、停止、归档 | 账号与权限模式沿用原设置；缺少程序时给出明确提示，可纠正后重试同一会话 |
| M-10 | 六个入口 | 依次试：侧栏新建、「+」菜单、输入框（`claude` 等）、快捷命令、看板技能按钮、自动化动作 | 每个入口都要求先选定 Space；取消不留副作用；后台调用没有 Space 时记录“需要 Space”失败而不是猜测 |
| M-11 | 输入法 | 在终端里用系统输入法输入中文或日文，组字中途按 Enter、Esc、方向键，再提交 | 组字未完成时不提前提交；复制、Ctrl-C 中断语义不变 |
| M-12 | 多行与正文等待 | 分别用 `message send`、`agent prompt`、`terminal send-text` 的 `--text`、`--stdin`、`--file` 发送中文多行正文，三种来源一次只选一种；原始文本后显式 `send-keys Enter` 与 Agent prompt 提交分开核对。消息正文测试恰为16 KiB和多1字节；另测试超过完整JSON请求32768字节。保持stdin打开后用Ctrl-C与短 `--timeout-ms` 终止本地读取 | 文本与末尾换行逐字保持；`message send` 本地正文最多16 KiB，另外两类本地读入最多256 KiB，但完整请求仍须符合32768字节帧容量，不能据本地上限认为256 KiB一定能提交；过限返回 `CAPACITY_EXCEEDED`（2），互斥来源返回 `INVALID_ARGUMENT`（2）。提交前取消/超时分别130/6、effect none且无输入；已提交或效果未知时先查目标，不盲目重发 |
| M-13 | 目录与权限 | 授权一个库外目录创建 Space；之后撤销授权或替换目录；用无权限目录再试 | 无授权拒绝；撤销或替换后新启动被拒，已有历史保留；不按 cwd 字符串获得授权 |
| M-14 | 迁移 | 用旧版本的库副本升级（含旧工作台布局、网页标签、自动化） | “导入空间”可核对，布局一致，同 cwd 不被合并；自动化保持未绑定并提示选择 Space；旧写入端被拒绝；设置页“旧数据导入”有说明 |
| M-15 | 备份与恢复 | 设置 → 智能体 → 备份：导出，换一个库导入，再故意制造冲突、损坏文件、中途重启 | 清单列出不包含的内容（原生全文、凭证）；检查通过前不写入；失败可重试；导入与重启后没有任何 Agent 被启动、通知被发送 |
| M-16 | 命令行工具 | 新开一个 HUHU 终端运行 `huhu --json version` 与 `doctor`；断网后重试 | 受管终端里能找到 `huhu`；首个终端可能暂时没有该命令，之后的可用；离线时使用已校验副本，不会因下载而卡住启动 |
| M-17 | 界面检查 | 浅色与深色、中文与英文、侧栏拖到最窄和最宽、窗口缩到 480 与 960 左右、系统缩放 200% | 无意外横向溢出或遮挡；键盘焦点可见，关闭弹层后焦点回到触发处；状态有文字，不只靠颜色；桌面目标至少 32px；工作台宽度小于 600px 时，工具栏、窗格标题与关闭、标签栏滚动与关闭、快捷命令、历史抽屉/筛选菜单/继续确认等全部按钮至少 44×44px 且不溢出标签栏；状态（空闲、完成、失败、中断、运行、待处理、未知）在任何分组方式下都有不同形状，不只靠颜色 |

## 平台特有项

| 平台 | 额外检查 |
|---|---|
| Linux x64 / arm64 | 自己的 shell 与权限；剪贴板与输入法（IBus/Fcitx）；关闭 Obsidian 后 `ps` 中没有残留 `huhu-pty`；arm64 必须在真实 arm64 机器，不用交叉编译或模拟 |
| macOS x64 / arm64 | 首次运行下载的二进制是否被系统隔离或需要授权（记录提示原文）；系统输入法；主窗口与弹出窗口之间的焦点；用户 shell 与路径 |
| Windows x64 | 默认 shell（PowerShell/cmd）；named pipe 控制是否仅当前用户可访问；Defender 或杀毒是否拦截 helper；路径含空格、中文和盘符的目录；关闭后无残留 `huhu-pty.exe` |

## 已知现象与处理

- 写入端口被占用：同一物理库和设备使用由散列得到的固定本机端口（16384–65535）。若本机另一个无关程序恰好占着它，该库的 Space 写入会以 `OWNER_CONFLICT`（原因 `port-in-use`）失败，不换端口也不强占。处理：先找出并关闭占用该端口的程序；只有占用者是短暂程序或残留的旧 HUHU 进程时，重启 Obsidian 才有帮助，长期占用的无关程序必须先释放端口。详见《[数据与恢复](data.md#库之外的数据)》。
- 第一次使用时最先打开的终端可能还没有 `huhu` 命令；见《[工作台本机 CLI](agent-workbench-cli.md#终端里如何找到-huhu)》。
- 真实 Provider 权限弹窗、登录和额度由 Provider 自己管理，HUHU 不会代替用户批准。

## 开发机已跑与未跑

- 已在 Linux x64 开发机跑过：全量 Vitest、native 单元与集成测试、本机 `verify-pty-helper`、文档/i18n/架构/第三方声明检查，以及生产组件的 DOM 与隔离浏览器检查（见 `scripts/obsidian-acceptance/agent-workbench-*.mjs`，它们用受控端口，不含真实 Obsidian 或 Provider）。
- `scripts/obsidian-acceptance/workbench-probe.mjs` 可在全新空库里探测真实 Obsidian 的工作台外壳（需要 `HUHU_OBSIDIAN_EXECUTABLE`）。
- `scripts/obsidian-acceptance/terminal-reliability.mjs` 只覆盖 win32-x64 的已发布版本安装演练，不是五平台检查。
- 其余四个平台、真实 Obsidian、真实 Codex/Claude、输入法和负载场景全部未运行，等待你填写上面的记录。
