# T-04 Browser fixture 窄修交接

SOURCE STOPPED。唯一修改 `src/modules/browser/module.test.ts`；其他17份源、Rust、Cargo/target、锁文件、binary、main/styles/budget、正式Change与Git均未写。

仅将 framed native transport fixture 参数化为 confirmed/legacy，两条用例仍走真实 Browser module装配、BrowserEngine、NativeHost 与 TerminalSessions。confirmed 模式声明 terminalTermination=1，并在后置 numeric exit 前发送合法 confirmed/drained notice，验证 Agent dispose 正常 resolve。legacy 模式不声明 capability、仅 numeric exit，明确断言 AggregateError 包含 NativeReleaseError，以及原SID/cleanup-incomplete/无伪造notice；finally 也准确观察该拒绝，未吞错或放宽生产证据。两条均保留 Browser activate零native启动、Cookie已接受后Agent停止、Browser继续连接、Cookie读返回、最后owner结束helper、总共只启动一个helper的原断言。

## 实际检查

- 原红灯复现：`node node_modules/vitest/vitest.mjs run src/modules/browser/module.test.ts`，exit126，1failed，NativeReleaseError（与Root原integration同源）。原记录/输出 `/tmp/huhu-t04-c-browser-red.{json,log}`。
- 同一单文件绿灯：相同argv，exit0，1file/2tests通过。`/tmp/huhu-t04-c-browser-green.{json,log}`。
- 测试类型闭包：`node node_modules/typescript/bin/tsc --skipLibCheck --project /tmp/huhu-t04-c-browser-tsconfig.json`，exit0/noEmit，只以该测试和声明文件为入口。`/tmp/huhu-t04-c-browser-types.{json,log}`。

完整argv/cwd/UTC/exit/stdout SHA在 `/tmp/huhu-t04-c-browser-checks.json`；唯一源path/bytes/SHA和快照在 `/tmp/huhu-t04-c-browser-source.json`。这是本地模拟framed transport的生产消费者接线测试，未运行真实helper/用户宿主/Provider；未跑build/full lint，Root做统一回归与审查。

派单原prepared SHA51f4ef...与当前packet不同，仅因Root附actual_dispatch；去除该记录字段后逐字节重现原prepared SHA，无合同/权限变化，source manifest同时记录两hash。

SOURCE STOPPED。
