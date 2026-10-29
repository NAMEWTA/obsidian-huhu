---
name: huhu-control
description: Operate HUHU workbench terminals and agents through the local `huhu` command. Use only when the user explicitly asks to start, prompt, wait for, read, message or stop a HUHU terminal or agent; never for ordinary shell work.
---

# HUHU terminal control

`huhu` talks to the workbench that launched this terminal. It never guesses a target from the working directory or the focused window, and it never approves a provider permission prompt for you. Always add `--json` and branch on `ok`, `error.code`, `phase` and the exit code, never on message text.

## Discover first

```sh
huhu --json capabilities
huhu --json space list
huhu --json session list --space <space-id>
huhu --json agent list --space <space-id>
```

Capability descriptions are not capabilities: only what `capabilities` reports is usable, and `CAPABILITY_UNAVAILABLE` (exit 4) means stop and tell the user.

## Prompt, wait, read

```sh
huhu --json agent prompt --session <session-id> --runtime <runtime-id> --text 'Fix the failing test in src/a.ts' --wait done
huhu --json agent wait --session <session-id> --runtime <runtime-id> --state done
huhu --json terminal read --session <session-id> --runtime <runtime-id>
```

- Waiting is observation only. `done` means the agent's native activity ended; it does not mean the task succeeded. Read the screen or inspect the files before you report success.
- `blocked` or `permission` (state) and `AGENT_BLOCKED` (error, exit 5) need a human at the terminal. Report it and stop; do not send keys to approve it.
- A wait that times out exits 6 (`WAIT_TIMEOUT`) and the agent keeps running. Wait again with `agent wait`; never send the prompt again.
- Exit 8 (`EFFECT_UNKNOWN`) means the receipt was lost. Query the target before doing anything else:

```sh
huhu --json session get --session <session-id>
```

## Long text goes through stdin

A message body of up to 16 KiB is read locally from stdin or a file, so shell quoting cannot corrupt it.

```sh
huhu --json message send --to-session <session-id> --stdin < body.txt
huhu --json inbox list --session <session-id>
```

Exit 2 with `CAPACITY_EXCEEDED` means the body is too large: shorten it, do not split it silently.

## Stop only when asked

```sh
huhu --json terminal stop --session <session-id> --runtime <runtime-id>
```

A stop request is not the same as the process having exited; read the receipt `phase`.
