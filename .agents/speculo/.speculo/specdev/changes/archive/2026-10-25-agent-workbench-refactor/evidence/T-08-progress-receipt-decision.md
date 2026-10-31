# T08 输入回执与等待失败的传输接缝

本决定是原工程合同内的兼容追加，由Root根据C在实际broker/ControlProgress中的缺口回读后采用；不新增用户决定、公开after参数、路径或另一个状态manager。

现ControlProgress只有target/phase/effect，不能在broker超时或closing产生最终失败时保全具体输入回执。C在同一canonical给progress增加可选data:json，TS/Rust两端严格生成与解码；整体进度仍8192B，broker最多保留原一个latest progress。复制到失败final后仍核完整49152B envelope，不能只计算data正文。生产effect发生前由原业务adapter预量最坏实际目标、错误及回执形状。

对agent.prompt、terminal.send-text、terminal.send-keys，只有同request/target已收到可信input-submitted/completed进度，才可把后续等待超时、取消或断链的effect保留为completed。应用adapter-applied和PTY written仍是不同回执类型，均不表示模型任务完成。未收到可信完成事实仍unknown；排队取消只有原owner能证明零效果才none；纯wait是readOnly并始终none。启动、stop等mutation不能套用输入回执规则。

已知输入完成后的后续进度必须带原输入回执和原target，更新有限latest观察；不能用“等待中”空data覆盖已知回执，也不能靠无界progress历史恢复。迟到native结果与真正settled责任仍归原输入owner，取消观察不会返还尚未结算的物理槽。

需要真实测试：有/无可信input stage × timeout/closing/cancel；最新进度更替后回执仍在；input body/application未知时不声称零效果；完整包边界与原ordinary/query/stop活性。当前只确认接口方案，尚无该追加的测试通过结论。新操作与同源helper/CLI/Host组合验证还须说明兼容边界，不能用旧bin冒称支持新字段。

## 真实CLI Ctrl-C的有界返回

Root回读client.invoke_inner与broker Waiting/Response确认：原client的read_until(cancel)在SIGINT后立即丢读取状态并断开，CLI无法取得broker已确认的receipt。不能以Session内部取消测试替代该入口，也不能用半关闭解释成已有协议支持。C实际提出窄扩展，Root已采纳并仍限制在原002的17路径内。

同一已认证、每连接仅一个已捕获请求的socket增加严格 `{"type":"observe-cancel","protocolVersion":1}`；由canonical拥有，完整raw上限128B，只接受一次，沿该连接关联原请求而不加入新的大requestId、manager或连接。client保留原增量Reader（含已收partial final），SIGINT后只交出一次marker；取消后的所有写入与最终读取共用 `min(原接收deadline, 取消时刻 + 既有2秒物理返回尾)`，不重置业务观察期限，不重新连接或重放输入。broker撤销原观察并以单个latest可信receipt生成WAIT_CANCELLED回执，原call/业务占用仍等真实settled。

正常握手保持原形。旧helper对额外输入的既有处理是关闭观察；因此新CLI对旧helper取消时只能准确返回readOnly的none或mutation的unknown，不能声称旧端具备completed回执保全。真正断链或没有可信完成证据也保持未知。新helper的Waiting与已经开始发送最终结果的Response都须处理取消竞态，不能让原read_end因marker把已有合法final截断。

可信输入回执固定为 `data.receipt={kind:'pty-written'|'adapter-applied',op:1..u32::MAX}`；agent.prompt只认adapter-applied，两个raw输入只认pty-written，op0不表示真实入队。原完整目标不得被后续省略/降级/冲突目标覆盖。此前8场景及嵌入codec测试只收到C阶段自报，最终仍须Root回读实际命令/源码；新的SIGINT与partial-final竞态此时尚未交回通过证据。
