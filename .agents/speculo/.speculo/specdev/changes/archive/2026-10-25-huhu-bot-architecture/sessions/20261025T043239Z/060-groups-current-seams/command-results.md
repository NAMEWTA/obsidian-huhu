# 060 命令与边界记录

本任务实际执行轻量文件读取、rg定位、Python标准库摘要/自有报告生成、Git branch/HEAD读取，以及最终Speculo return结构校验。没有启动产品、数据库、Provider、构建或测试进程；没有后台exec session或子代理。

|实际操作|退出/结果|
|---|---|
|读取TASK、dev、T13、045报告、Map/Spec及当前源码|成功；逐段读取时点、SHA和字节见observations.json，内容见read-excerpts.log。|
|rg路径/符号定位|绝大多数0；误查不存在的`api/usage.go`出现2，随后定位到`application/api/attempts.go`；误查`native/huhubot/internal/api`出现路径错误，已改为真实`internal/application/api`。部分组合命令最后状态0不能掩盖前面的rg错误。|
|初次恢复旧read helper|functions JS加载不存在的read056后调用replaceAll报错，未发出shell命令；随后建立本任务read060 helper。|
|首次wire切片Python|exit1：methods为字典而非对象数组，字符串没有get；在写文件前失败。改为按字典键读取后exit0，产物wire-group-slice.json只保留所需方法/DTO。|
|Python只读摘要/来源复核及自有产物写入|各已完成调用exit0。观察到usage/store.go、assistant/store.go、effects/approvals.go漂移，相关段已回读；不是锁定作者文件。|
|git branch --show-current；git rev-parse HEAD|各exit0：NAMEWTA/bot；33c21e098ef3188cbab5a09f3e0a01fadb787715。|
|Speculo return validator|真实命令、exit、stdout/stderr见return-validation.json和return-validation.log。只验交接格式。|
|自有manifest字节/SHA复核|结果见manifest-verification.json；manifest自身及验证结果不互相自引用。|

少数工具显示输出被截断，但被记录的完整来源段保存在本任务read-excerpts.log；不把定位命令或文件存在当实现验收。以上失败均为只读研究脚本/路径错误，未产生产品变更；未通过重测试补证。
