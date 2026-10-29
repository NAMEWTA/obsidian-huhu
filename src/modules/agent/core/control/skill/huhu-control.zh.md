---
name: huhu-control
description: 通过本机 `huhu` 命令操作 HUHU 工作台里的终端和智能体。仅当用户明确要求启动、提示、等待、读取、发消息或停止 HUHU 终端/智能体时使用；普通 shell 工作不要用。
---

# HUHU 终端控制

`huhu` 连接启动本终端的工作台。它从不按工作目录或焦点窗口猜测目标，也不会替你批准 Provider 的权限询问。始终加 `--json`，按 `ok`、`error.code`、`phase` 和退出码分支，不要依赖消息文字。

## 先发现

```sh
huhu --json capabilities
huhu --json space list
huhu --json session list --space <space-id>
huhu --json agent list --space <space-id>
```

能力描述不等于能力：只有 `capabilities` 报告的才可用；`CAPABILITY_UNAVAILABLE`（退出码 4）表示停下并告诉用户。

## 提交、等待、读取

```sh
huhu --json agent prompt --session <session-id> --runtime <runtime-id> --text '修复 src/a.ts 中失败的测试' --wait done
huhu --json agent wait --session <session-id> --runtime <runtime-id> --state done
huhu --json terminal read --session <session-id> --runtime <runtime-id>
```

- 等待只是观察。`done` 只表示智能体的原生活动结束，不代表任务成功；报告成功前先读屏或检查文件。
- 状态 `blocked`、`permission`，或错误 `AGENT_BLOCKED`（退出码 5）需要人在终端处理。汇报后停止，不要发按键去批准。
- 等待超时退出码为 6（`WAIT_TIMEOUT`），智能体继续运行。再用 `agent wait` 等待；绝不重发提示。
- 退出码 8（`EFFECT_UNKNOWN`）表示回执丢失。先查询目标，再做别的：

```sh
huhu --json session get --session <session-id>
```

## 长文本走 stdin

最多 16 KiB 的消息正文在本地从 stdin 或文件读取，shell 引号不会破坏它。

```sh
huhu --json message send --to-session <session-id> --stdin < body.txt
huhu --json inbox list --session <session-id>
```

退出码 2 且 `CAPACITY_EXCEEDED` 表示正文过大：请缩短，不要悄悄拆分。

## 仅在被要求时停止

```sh
huhu --json terminal stop --session <session-id> --runtime <runtime-id>
```

停止请求不等于进程已退出；请读取回执的 `phase`。
