# T08 F7：Cookie读取与最后清理错误保留

GP032 / Map33；恢复周期1当前attempts2，下一Root候选整合计3。沿完整18票用户授权修复现有共享消费者，不开启T09或新增Cookie能力。原周期3、R1–R4、020检查点、023红绿与所有旧原件保持。Root已接收021完整R4两轴request-changes，F1–F6关闭，唯一F7/P2。

## 事实与原合同

021 REPORT SHA256 c72d0496569781666f16c138da534994b80adae023e98927a00d4f8c832c927b；Root audit T-08-review-r4-root-audit.json SHA256 aa4aa329d16bc9100936d18f1f9dd1973fc8d5998c09927e5cc3ec451f7f8a91。主88 scope与实际外部消费者分开；新文件此前未被虚列为已改。原/tmp/huhu-t08-full-review-r4-astra/cookie-dual-error-observed.ts及stdout SHA2564fefb3179704925b0198da99acc33cc5823681ba413a314d6c00009b4f6b7317经Root全文回读。

公开nativeCookieReader→NativeHost→PtyHelper→017真实pair，同次native cookies-result报告缺失SQLite无法打开；Cookie在原PTY owner退出后是最后租约，关闭自身被替换端点产生真实exit1。cookies.ts的finally await lease.release覆盖原request错误，公开结果只有NativeShutdownError，cause/errors为空。该交错是可达的最后owner释放，不依赖mock读取返回；没有真实Cookie资料。Browser调用者因此失去原读取原因。

保留业务与清理失败两份事实，符合Spec §4/NFR004、原共享Cookie能力和T08关闭结果影响合同。不得吞清理错误、回退F6的真实失败、修改exit1为成功、重复读取或重放输入。此为已授权实现范围的缺陷修复，不要求新产品决定。

## 最小设计及精确路径

优先在原nativeCookieReader函数保存request结算后，始终且仅一次等待同一lease.release，再决定返回值或抛错；不引入新生命周期管理器/协议/API，也不修改NativeHost/Helper。比较finally覆盖、忽略清理和显式双结果三种路线，采用保留双结果。

- 两者成功：保持原Cookie结果。
- 只有request失败：抛原错误对象，读取/取消原因不丢。
- 只有release失败：抛原清理错误对象，不返回成功。
- 双失败：可通过AggregateError.errors与cause同时访问两份原对象，原读取作为primary/cause；message应保留可用于现有UI诊断的原业务原因，准确表明还有清理失败。
- acquire失败：不释放未取得租约；原lifetime和signal监听在所有返回路径移除。没有自动重试、重复release、提前返回或观察取消后遗留不受管的清理。

完整分配r6为A34/B16/C36/Root5共91路径。当前唯一开放修复源给codex:/root/implement_t08_profile（原Sol/xhigh，022只读任务已SOURCE STOPPED）：

1. src/shared/native/cookies.ts
2. src/shared/native/cookies.test.ts（拟新增）
3. src/host/desktop/native/host.integration.test.ts

以上3路径由Root先加入Ticket/Map和r6；实际025派遣之前全部STOP。C其余33路径、原B11修复路径、全部Rust/协议/Host/Helper/浏览器UI/依赖/已有bin只读。Root独占main/styles/budget/notices，不能提前让执行者构建根插件。外层readCookieRows的普通fs.rm失败不属于本次finding，不顺手改动。

## 验证合同

改生产前在真实readCookies入口建立目标双失败红灯；编译失败、缺文件或未运行不能当行为红。定向测试覆盖成功、仅request失败、仅release失败、双失败、cancel/acquire拒绝及监听移除/恰一次release。保持原错误对象和准确cleanup outcome，而不只验证字符串。

真实集成追加在既有host.integration.test.ts：正常import生产nativeCookieReader/Host/Helper，明确017 immutable pair；用自有缺失/有效SQLite与自有短0700 runtime，记录同次原cookies-result、公开原读错误与typed清理错误、实际exit、sentinel inode/内容、原helper/child PID。故障注入只安排合法owner交错并替换自己端点，不替换request返回。先证明native未删替代实体、错误已返回，再只清自己的fixture；外部清理不能当产品成功。原真实SQLite锁/Agent关闭不影响Cookie读取用例保留并通过；不得删或放宽原风险断言。

保留每条实际argv/cwd/UTC/exit/raw、实际编译来源/CAS、原红/绿与资源清理；说明controlled Node fixture、真native与真实用户平台边界。复用017只读pair，不重建Rust、不写Cargo target。生产/测试类型、自身生产lint及实际return完成后停止全部源，交Root接收。

Root仅在SOURCE STOPPED/回读后进入attempt3：真实build/lint/enforced bundle、按实际新main归因、Cookie及Browser受影响消费者、当前native组合闭合；原F6三源未改则其127项和021独立真实强杀/迟到退出证据按影响复用，不凑重复测试数量。完整91范围随后由同独立Astra/high执行R5双轴。若第三次仍未通过，保留真实停止点并按新原因重规划，不能清零计数、删测试或降低合同。

真实Obsidian、Provider、OS IME及五平台仍由用户验收。无提交、推送、发布、归档或永久知识写入。
