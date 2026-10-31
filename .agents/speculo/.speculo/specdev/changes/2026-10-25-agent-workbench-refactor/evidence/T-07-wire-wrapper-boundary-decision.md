# T07 内部 wrapper 结构计量澄清

Root在C实际实施中核对的局部工程决定；不改变Spec外部协议、写集、owner或用户授权，不代表已实现/已验。原T-07-engineering-packet.md与初始输入保持不可变，不在实施命令中途改其输入。

外部request/response仍各自独立执行depth32、nodes8192和whole UTF8 32768/49152B限制。把外部对象嵌入helper内部wrapper时，内部严格raw scanner可使用canonical显式结构余量：depth额外2、nodes额外32；即内部最多34/8224。此余量只为固定内部wrapper结构服务，不放宽嵌套外部对象的32/8192，字节仍为既定外部整包+最多1024B wrapper，5B帧头另计。

生成器必须遍历全部实际内部wrapper变体证明额外深度/节点不超过上述固定值，并拒绝新构造突破；codec在外部对象独立层级重新计量，不能因外层34/8224便接纳外部33层或8193节点。注册、认证、小stage各自原profile不因该澄清放宽。

两端共享fixture和实际测试应覆盖：外部合法边界进入wrapper仍合法；外部超界在wrapper中仍拒绝；内部wrapper额外字段/混合discriminator/重复键仍拒绝；生成证明与确定生成check。严格扫描在JSON.parse/serde Value之前进行，旧history/Cookie兼容与单legacy decoder暂存说明不变。

本决定是原“固定wrapper单列”原则的结构计量细化；无新产品决定，也不需要重复用户确认。C唯一拥有canonical、生成器和codec，B消费真实导出，Root在交接后核源码与反例。
