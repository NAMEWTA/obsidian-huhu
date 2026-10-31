# T08 启动身份与环境接缝补充

沿 GP026 / Map27、原 84 路径与已授权 T08 实施；这是 Root 对实际调用链的工程澄清，不变更产品范围、用户决定或完成状态。C 在原 002 的 shared/canonical 范围交真实接口，B 后续实现 Host/helper，A 再消费；没有提前解锁其余路径。

## enrollment 与活动源身份

editor enrollment 的 `identity` 仅使用启动时已经存在的 `runtimeId`。`editorId` 单独标识该原生应用绑定。不能在 spawn 时虚构 T06 `bindingId` / `programEpoch`，也不能把同名字段改成另一种含义。

应用注册后的 `ready.sourceInstance` 是实际 T06 注册使用的同一 sourceInstance。A 从当前 RuntimeActivitySnapshot 的 registration lifetime 与 sources 取得真实 bindingId / programEpoch，严格 join 原 runtime 和 sourceInstance 后才允许提交。submit 携带原 sourceInstance，B 最终应用 gate 校验同实例，重载撤销旧绑定；等待捕获并保留真实 T06 tuple 与水位 N。没有注册事实时不能猜第一个 source 或根据 cwd/焦点补身份。

`NativeEditorRecipe` / FileIdentity 子接口维持已交实际版本，A profile 不复制新 DTO。完整 artifact 摘要不等于稍后原生检查又读取了全部 artifact。

## 实际 helper 继承环境

Root 回读 TerminalSessions.create、terminalEnvironment、PtyHelper.start、Rust session spawn 及锁定 portable-pty 0.9.0：Sessions 的 environment/request.env 是 overrides；helper 本身继承启动瞬间的 process.env；子进程再继承 helper 环境并应用 overrides。只拿 Sessions overrides 会遗漏 NODE_OPTIONS、LD_PRELOAD 或实际 PATH。

采用可选同步纯读端口 `spawnEnvironment(overrides)`，由本 lease / generation 的 Host 委托实际 helper；返回私有冻结 values 副本及 `completeness: 'complete' | 'unix-shell-default' | 'unverified-platform'`。values 来自本 generation helper 启动时实际捕获的 env 加本次 overrides，不读取未来 process.env、不启动 helper、不修改或清空普通 spawn 的继承环境。原 owner / generation 不再活跃时准确拒绝。日志和 CLI 回执不输出环境值。

Unix portable-pty 在 SHELL 缺失时可能由 passwd / /bin/sh 补量，此时标 unix-shell-default，不伪造该值；第一条 direct Node/Jiti 分支只依赖已知的加载环境，不能把这一状态称为全部最终环境逐项已知。Windows portable-pty 还读取 HKLM/HKCU 环境注册表并展开/合并 PATH，因此该阶段一律标 unverified-platform，profile 准确 unsupported；不引入未核实的注册表还原或私有 wire。

端口读取上限为 512 项、64 KiB UTF-8，编码前测量，拒绝 accessor / toJSON；超限是有限 typed none/capacity 结果。该上限仅约束 profile 读取，不改变既有普通 spawn env 语义。A 的 verifier 自身更宽上限不扩张此接缝。A 必须核验实际准备完成的 file/args/cwd 和该原 generation 环境，随后的 spawn 使用同一组准备输入；HUHU capability 等最后注入字段须明确不改变被核验的 Node/Jiti 加载配置。

## Pi process.title 与 fresh 检查边界

004 的真实完整 CLI 观察记录在 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z/runs/attempt-02/pty-process-observation.json` 和同目录 syscalls.strace。官方 Pi 正常启动设置 process.title 为 pi，Linux /proc/pid/cmdline 因而不再保留原 Node/entry argv。不能要求该 argv 在最终提交时仍可从 cmdline 读回，否则真实支持分支将永远被拒绝。

后续原生实现依据捕获的 spawn recipe、实际 root PID/birth/SID/TTY/exe 与原认证 app 连接/source 生命周期做本次可证实核验，诚实保留各项证据和缺失条件。原决定已明确同账号恶意干预及未观测同像 exec 不在保证内，OS 观察与稍后 JS gate 不具有原子性；不提升为新鲜全 artifact、任意同像 exec 或尚未验证的 CLOEXEC 保证。004 的 strace 根进程与 LD_PRELOAD 观察环境不能充当正式 direct Node/root 原生正例，后续不为 fixture 放宽 profile。
