# 任务回报

Session: 20261026T045732Z
Task: 004-t08-full-cli-proof
Status: completed

## 聚焦交接

已补出官方 Pi 1.4.0 的完整 `dist/bundle/cli.js → main → 实际 loader/TUI/default editor → 原始 AgentSession → 受控 loopback HTTP/SSE → 原生 steer 消费` 机制证据。成功命令012实际 exit 0，原 CLI 以 `/quit` 正常退出0、fixture退出0，收到了生产扩展的 `Stop` 完整最终回答及 `AdapterClose`。只有原样生产 `PI_EXTENSION`，没有测试 extension、Session Proxy、editor/onSubmit/handler 补丁，也未手工创建 editor。

本轮输入由标准 Linux PTY 模拟人工键入，模型端由固定报文 loopback 服务替代；不是 T08 authenticated editor 事务、真实 Provider、模型任务成功、native slot/Host/broker 或 Obsidian/五平台验收。**PTY root 是 strace wrapper，子 Node 环境含 LD_PRELOAD 网络连接保护，二者不符合后续正式 profile/native recipe 的要求。** 后续复用同服务时必须直接目标 Node/root，去掉子进程 loader 注入或改用不改变启动 recipe 的隔离/外层完整连接审计，不能放宽 profile。Root 回读后决定后续 B 产品任务，本任务不解锁或改写任何状态。

## 产物与验证

### 可回读机器收据与原件

- 完整机器交付收据：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/delivery-receipt.json`，SHA256 `e70f836dd58288595696388fedff1d647446795d5080e284b4728b8d6dda4385`。包含16条真实命令回执、全部输入/脚本/日志/文件的绝对路径、字节数和 SHA；`objects/` 保留每条命令之前/之后的输入快照，不覆盖失败版本。
- 最终只读审计：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/final-audit-v2.json`，SHA256 `28badf1e09bf1139995b4c565f9313eee513f33966cadfe8fe93b02841c584ec`；命令016 receipt/raw 均在 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/commands`。之前014的审计也保留：Pi 设置 process.title 为 `pi`，初审按 argv 找 Node 漏列其 PID；016依据原始 PTY 进程快照把所有前台组成员纳入清理，没有重跑 producer。
- 最终真实输出：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/pty.raw.log`，SHA256 `b03f407f157991e03e2a211131611bc0964014992f89eea2712c5560abb1855f`；没有截断或去 ANSI。每次原始 PTY write 的字节/hex/UTC 与 read 偏移在 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/pty-io.jsonl`。
- 每次请求的原 HTTP method/URL/headers/body：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/requests.jsonl`，SHA256 `f2026815ca4567b238319dde457170b7a53f412a8b6dbfc3a7dabdeab101cb58`；每条原 SSE wire 报文及时间在 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/responses.jsonl`，SHA256 `a4657442bcfad866819c1d642360fc3d09b61ea190230b0ef2a79bec8d2b1cab`。服务实现 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/harness/fixture.mjs`，SHA256 `b6b71f70c1d477f74d579a682d3cce53cba5439e72c620343b60d398e5730066`。只绑定127.0.0.1，最多2次成功请求、单请求体262144B、首响应释放上限12秒、服务总寿命45秒；首轮不支持 `/exit` 的第3请求被固定边界拒绝并保留。
- 真实会话 transcript：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/sessions/2026-10-26T05-52-37-842Z_01a176c4-97d0-74fd-97b4-7ee3e00721ca.jsonl`，SHA256 `fb1effb62c5d92e664677274b031aa9d8eadb305277741d79283937366842012`。生产 HookSpool 原 collector 的事件：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/hooks.jsonl`，SHA256 `537433d37520e4b52e1bc26f1c4d1fc0551a91d33eae026f5565b6cbe10e0119`。完整最终答案来自原扩展 `agent_end → agent_settled → Stop.data.last_assistant_message`，没有用屏幕文本冒充完整答案；首轮完整回答另由原 transcript 保存。
- 原生 V8 coverage：`/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/v8-coverage/coverage-27882-1792993961026-0.json`，SHA256 `da5d2da3ff41674dc5d00d891e746fa5b299e196a60d848eef4f90378a2ee50b`；精确函数体、UTF-16 offsets/ranges 和默认editor构造/原steer submit分支计数在 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/coverage-analysis-v2.json`，SHA256 `19716215f1aeaf627a9c7fd4cffd81de2a52aa5ca7e87a168105fc9f700b694a`。这是 Node 原生观察开关，没有修改被测源码。

### 官方及生产输入身份

固定 npm Pi1.4.0 原 tar SHA256 `d155c16ef6fa00960fbf58b2911536e80b05f33700e0b14fbd08967ede0c7428`；package metadata 声明MIT，原 tar没有单独LICENSE，此事实延续上轮已核原件。Jiti2.7.0（MIT）完整许可证仍在原件及本轮副本中。本轮未联网安装依赖，未复制/改编其他终端项目。

原研究目录和本轮私有副本分别完整核对1279个 Pi文件、16个Jiti文件；Pi文件集 SHA `c7fbbe6a4b2f91f04505d7dddb068c64e0e42f99c5e2708ffdcbc6e16445fb78`，Jiti文件集 SHA `176867a8c5336f4cd613ccb7a00fbda2f0f0d04facb8d023b5fa06d6d7712ac7`。`vendor-before.json` 与 `vendor-after-v2.json` 列出双方全部相对路径/字节数/SHA，均与已审 profile 完全相同。当前生产 `native-extensions.ts` SHA256 `ea204539ccd9f450c596e04039ee379e79e58a979aacd754534610ce91d08b8b`。只在新tmp用现仓库esbuild编译原模块并求原 `PI_EXTENSION` 导出字符串；加载的 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/huhu-pi.mjs` 为11515B，SHA256 `cd7415297fb581c4d040c79e89909fb813ea41e509706452c53bd2460ea8fe44`。扩展 factory/handlers 原样未改；生成物没有测试观察 hook，也没有自造输入能力。

### 实际启动、环境与 PTY

真实 CLI argv（外层 strace 完整 argv 与精确25项环境值保存于 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/cli-launch.json`，SHA256 `e7495c96736fae555963f3c7afef3911ea5e9fe4b1059bb47c771687b551f104`）：

```json
[
  "/home/wta/.volta/tools/image/node/26.11.1/bin/node",
  "/tmp/huhu-t08-full-cli-proof-20261026T054807Z/vendor/package/dist/bundle/cli.js",
  "--offline",
  "-ne",
  "-e",
  "/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/huhu-pi.mjs",
  "-ns",
  "-np",
  "--no-themes",
  "-nc",
  "-nt",
  "--provider",
  "huhu-loopback",
  "--model",
  "t08-loopback",
  "--thinking",
  "off",
  "--session-dir",
  "/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/sessions",
  "--tui-mode",
  "regular"
]
```

子进程环境严格白名单为：`COLORTERM, COLUMNS, HOME, HUHU_FIXTURE_ALLOWED_PORT, HUHU_FIXTURE_NETWORK_LOG, HUHU_HOOK_DIR, HUHU_HOOK_ROOT, HUHU_HOOK_TOKEN, JITI_FS_CACHE, LANG, LC_ALL, LD_PRELOAD, LINES, NODE_DISABLE_COMPILE_CACHE, NODE_V8_COVERAGE, PATH, PI_CODING_AGENT_DIR, PI_OFFLINE, PI_SKIP_VERSION_CHECK, TERM, TMPDIR, TZ, XDG_CACHE_HOME, XDG_CONFIG_HOME, XDG_DATA_HOME`。HOME、TMPDIR、XDG、agent目录、session目录、V8输出均在本次新tmp；`JITI_FS_CACHE=false`、`NODE_DISABLE_COMPILE_CACHE=1`、`PI_OFFLINE=1`。没有沿用当前进程HOME，没有继承用户密钥、代理或账号环境；models.json使用字面假key `huhu-local-fixture-only`。运行目录为空的本次临时cwd，`-ne`关闭发现且只有一个明确 `-e`；`-ns/-np/-nc/--no-themes/-nt`限制本次不需要的资源/工具。原loader `loadExtension` 实际执行一次；V8中本次扩展URL唯一为 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/huhu-pi.mjs`。

PTY由 Python `pty.openpty()` 建立100×32标准Linux终端，fork子进程setsid/TIOCSCTTY后直接exec strace，再由strace exec原Node/官方CLI；原TTY路径、session/pgrp/tpgid、进程表及原argv在 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/pty-process-observation.json`。成功轮 root/foreground pgrp为27880，实际Pi Node为27882、服务为27868。Pi会改process.title为pi，不能据此重新推断入口；execve原系统调用记录证明实际Node/CLI启动。V8实际计数为 `[{"name": "prompt", "count": 1}, {"name": "_runInputHandlers", "count": 2}, {"name": "prompt", "count": 2}, {"name": "_queueSteer", "count": 1}, {"name": "setupEditorSubmitHandler", "count": 1}, {"name": "main", "count": 1}]`，原默认editor构造、绑定为current editor和原streaming提交分支的最具体覆盖范围均大于0。

### 真正观察到的输入与结果

1. 正常中文多行 `你好，正常输入\n第二行保留中文` 由一次完整bracketed paste和唯一CR经过原default editor；第一次HTTP请求和原transcript均逐字符相同。没有app提交事务，两个PTY writes只是明确的人工型fixture操作。
2. 首SSE正文已经实际发出且响应连接保持打开：`2026-10-26T05:52:39.184Z`。第二次普通输入 `正在工作时的新输入\n仍走原生 steer` 的唯一Enter为 `2026-10-26T05:52:39.193268+00:00`；到 `2026-10-26T05:52:40.042978+00:00` 仍只有1请求、首响应未结束。首响应于 `2026-10-26T05:52:40.048Z` 结束，第二HTTP请求于 `2026-10-26T05:52:40.062Z` 发出，按顺序包含两个精确user消息和完整首assistant回答。真实AgentSession原生 `_queueSteer` 覆盖count=1，prompt count=2，原UI stream分支也实际执行，证明不是事后第二个独立idle prompt或受控Session调用记录。
3. 原Hook事件严格为 `AdapterStart → SessionStart → UserPromptSubmit → Stop → AdapterClose`，只有一个 `agent_start`，Stop原生最终消息为 `第二份原生回答：已消费 steer 中文多行。`，记录时间 `2026-10-26T05:52:40.391Z`，AdapterClose为 `2026-10-26T05:52:41.011Z`。原transcript还保存首份完整答案 `第一份原生回答：开头\n首轮结束。`。它们证明受控服务下真实会话/原hook合同；不证明真实模型或任务语义正确。
4. 成功命令012从 `2026-10-26T05:52:37.240676+00:00` 至 `2026-10-26T05:52:41.694744+00:00`，实际exit0；`/quit`正常退出，未用强杀冒充成功。016核对两轮所有已记录CLI/服务/前台组PID均已不存在，端口42457/41711均可重新bind，原生产scope与服务均已关闭。

### 网络隔离与全部红灯

001 `unshare -Urn true` 实际exit1：容器拒绝uid_map。没有把namespace当作已生效。002编译自有连接保护时 `-Werror` 发现未消费write返回值，exit1；原C源码已按命令前快照保留，005只修自有保护后exit0。009以TEST-NET地址做负例，保护在libc connect前返回EPERM，strace确认没有对应connect系统调用；未联系该地址。

成功轮实际connect系统调用仅2条，均为 `127.0.0.1:41711`；两条guard记录allowed=1，原 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/syscalls.strace` 和 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/network-guard.log` 均留存。连接保护为本轮测试用LD_PRELOAD libc边界＋完整本轮connect审计，不是内核或对抗恶意子进程的网络沙箱；正式profile正确拒绝此注入环境，后续不可沿用该launch。

010首轮真实机制断言已经成立，但脚本误用 `/exit`（本版合法退出命令为 `/quit`），产生第3普通HTTP请求、服务500和 `StopFailure`，最终等待退出超时，因此整轮exit1。原第三请求/原输出/失败堆栈不删不标绿，清理SIGTERM后CLI自身退出0亦不改变该轮失败。012仅将自有脚本收尾改 `/quit` 并修正until检测子进程刚退出的逻辑，在全新隔离run目录重测；没有改第三方或生产代码，没有换会话/输入机制。官方启动还按原逻辑探测不存在的fd/fdfind（execve ENOENT），rg实际可用；原系统调用保留，这些不是伪造的全部子命令exit0。

### 写集与未验边界

本任务只写 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z` 与本REPORT；16次命令前后B15均匹配Root冻结输入（含三个仍不存在的文件），第三方原件和副本逐文件不漂移；正式Evidence、B/C/A产品路径、Git index、依赖、构建产物、状态均未由本任务修改。工作区存在其他owner的并行变化，最终git观察只保存事实，不归为本任务改动。不构建、不提交、不推送、不发布、不归档，也未启动子Agent。

未验证：正式profile支持的直接Node/root与native fresh foreground/recipe；authenticated editor/app私有认证与原NativeInputQueue持槽；拒绝gate、IME/partial paste、异步clipboard、并发、deadline/cancel/late/IO结算；Host/broker完整生产链；真实Provider、Obsidian及五平台。现T07双bin未使用，不能从本测试声称T08新协议工作。

## 问题与下一步

没有阻塞本次只读机制交付的问题。Root先回读本REPORT、delivery-receipt、012/016回执、原requests/transcript/hooks/V8/PTY与失败010，再决定解锁B产品阶段。可复用 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/harness/fixture.mjs` 的原模型SSE服务、生产HookSpool和固定报文；后续runner必须进入真实生产editor事务/原native队列并使用正式profile允许的直接Node/root，无LD_PRELOAD注入。不能把本轮人工PTY fixture直接当作新事务正例，也不提前建立另一产品manager。

READ-ONLY SOURCE STOPPED
