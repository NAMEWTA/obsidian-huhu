# R1 同范围补充：只读查询超时与关闭效果

Root回读broker Waiting/failure与client query路径，发现纯query在forward后的timeout/closing会被统一写成unknown；这与本次操作无副作用及client自身的query none降级不一致。原C在已分配7路径内验证与修复；未加T08 readOnly字段、未改变canonical或池分类。此为既有合同的local-implementation，不扩大GP025/Map26写集。

实际先完成并保留正在运行的检查后，再增加真实CLI/broker永久回归。red中timeout exit6/WAIT_TIMEOUT/unknown、closing exit8/EFFECT_UNKNOWN/unknown；green分别exit6/WAIT_TIMEOUT/none和exit130/WAIT_CANCELLED/none，原target、迟到settled与独立Browser继续可用。mutating超时仍unknown并保留latest target/phase。Root已回读原命令、原日志及生产failure分支；最终完整源/二进制验收仍待C STOP和Root整合。

- query-red: `/tmp/huhu-t07-c-review-r1-repair-query-red.json` / receipt SHA256 `3a34c9c76d333a0667ea223f06174d473f28f9c926a97dace6f25b722e1d3ecb` / exit 101 / log SHA256 `0ccbf640ef1da427bd9f90a5a94902136cf2d821af0672bfd8736db1973f2593`。

- query-green: `/tmp/huhu-t07-c-review-r1-repair-query-green.json` / receipt SHA256 `36e68f6aaf8a1ff39d9882fc4771cf150c51bce8b1b21cf4c729cb1b00897d1b` / exit 0 / log SHA256 `461d2a64f8eb03b284a7db7dd83d6c27d16ae8601fe512decc5a0ef5a6afa8d0`。


原counterexamples保留，后续独立R2需同时审核此补充。T07保持in_progress，当前attempts2；不以此局部green关闭本票。
