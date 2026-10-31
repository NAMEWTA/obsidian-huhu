# T-18 人工验收清单索引

用户可执行的清单是 `docs/agent-workbench-acceptance.md`（候选版本记录、五行平台矩阵、M-01..M-17 通用场景、平台特有项、已知现象）。本文件只列交接索引，不宣称任何项已运行。

| 平台 | CI 行（runner / target） | 资产 | 状态 |
|---|---|---|---|
| Linux x64 | ubuntu-22.04 / x86_64-unknown-linux-gnu | huhu-pty-linux-x64、huhu-linux-x64 | 本机仅跑 cargo test、release 构建、verify-pty-helper；人工 M-01..M-17 未运行。AC-063 代码交付完成，等待用户端到端 |
| Linux arm64 | ubuntu-24.04-arm / aarch64-unknown-linux-gnu | huhu-pty-linux-arm64、huhu-linux-arm64 | 仅 CI 配置核对；未运行 |
| macOS x64 | macos-15-intel / x86_64-apple-darwin | huhu-pty-darwin-x64、huhu-darwin-x64 | 仅 CI 配置核对；未运行 |
| macOS arm64 | macos-15 / aarch64-apple-darwin | huhu-pty-darwin-arm64、huhu-darwin-arm64 | 仅 CI 配置核对；未运行 |
| Windows x64 | windows-latest / x86_64-pc-windows-msvc | huhu-pty-win32-x64.exe、huhu-win32-x64.exe | 仅 CI 配置核对；未运行 |

覆盖的场景（均在清单里有步骤与期望）：两个 Space、后台 A/B、跨 Space prompt/wait/read、人工审批、关面板重附加、历史继续/冲突、独立网页、退出恢复、Codex/Claude、六个入口、输入法、多行、目录与权限差异、迁移、备份与恢复、命令行工具查找、界面检查。

已知现象（已写入用户文档）：T-02 写端口为物理库+设备的确定性散列（16384–65535），被无关程序占用时该库的 Space 写入以 `OWNER_CONFLICT:port-in-use` 安全失败；处理为释放端口或重启 Obsidian（`docs/data.md`、清单“已知现象与处理”）。

`test/release/platform-acceptance.test.ts` 自动断言：CI 矩阵五行自洽、清单逐行覆盖 runner/target/资产名且结果列为“待填”、17 个场景齐全、文档互链。
