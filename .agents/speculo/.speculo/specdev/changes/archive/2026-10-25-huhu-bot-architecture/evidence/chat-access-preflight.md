# T03/T05接缝预检（Lead只读）

日期2026-10-25；Map8；T02正在实施，此记录不放行T03/T05生产writer，不变更Spec，也不声明代码验收。任务背景、维护活动/许可与固定版本沿IMPLEMENTATION-REFERENCES及reference-audit.json；本次重新打开三个固定官方源码，未复制实现或引入依赖。

## 固定来源与采用判断

[OpenBot queue.ts](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/work/queue.ts)使用Postgres事务领取、owner条件和持久键，通知仅加速扫描；其重领策略会包含已执行过外部工作的项目。HUHU采用持久意图/扫描补偿思路，使用本库SQLite事务/CAS，不移植Postgres锁或自动重试语义；已离开accepted的工作按本Spec走核查与用户恢复。

[Eino chatmodel.go](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/chatmodel.go#L386-L392)的Message和AgenticMessage执行路径不同，后者注释明确模型流取消监控/重试限制。T03只定义纯HUHU Engine输入/事件/finished-suspended-failed结果，用实际fake实现接同一个Executor；SDK类型不得进入API，真实三协议与桥接交T08–10。不能把框架事件或内存状态当业务持久终态。

[OpenHanako PathGuard](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/sandbox/path-guard.ts)以路径规范化和范围级别处理文件访问。本项目复用其先检查再访问的思路；Bot还需workspace/origin/lease、当前Grant、接收Bot/endpoint和provenance交集，路径包含关系不构成外发权限。不能移入其workspace内FULL授权或Go直接访问Vault的机制。

## 已回读的本项目事实

- sqlite/base.Store只创建一个有界连接，WithinTx不允许网络/Host等待。T03受理和终结均须落同一库的短事务，磁盘/提交失败不能只靠UI回滚。
- api.Facade当前Service/Host共享，T02新增Assistant。RequestIdentity由入站构造而非JSON载入。后续两个入站测试必须调用同一实际Facade/DB。
- T02已交初版AgentConfigPort AcquireSnapshot/ReleaseSnapshot及AgentUsagePort。T03接纳Run时要原子绑定不可变配置引用、回执和Session占用；busy/重放不能遗留未归属snapshot，停用/删除竞争要有数据库约束。具体最小接口由原owner在T02最终输出上确认，不在此冻结草稿代码。
- 现有TS SourceRef的若干来源字段可选，不能把客户端任意DTO直接当受理时的可信来源快照。T03/T05原owner一起区分草稿来源与已固定、可核查的来源。
- src/host/obsidian/references.ts仅格式化现有引用，可回退到另一个Markdown leaf；它没有Host身份、修订/hash或授权资格，不能直接用作Bot安全来源捕获。Bot应捕获用户明确选定的view/selection及当时内容，不在异步执行时重新读取全局activeView。
- 基础Host已有受管身份、lease失效和无Go Vault回退。T05需在同一接口追加来源读取/搜索结果形状和origin/epoch，原owner维护api/schema/router/transport，消费者不新建平行协议。

## 下一批最小验证面

T03：同key并发/异输入、busy仍返回原回执、相同正文新key保持新意图、提交后唤醒前退出重开扫描、终结提交失败保持旧持久事实、一个Session不双占用；fake Engine仅测试注入，生产未装配不能返回假回答。

T05：两份明确附加只读取/外发这两份；切换view不换内容；越界路径、过期/替换lease、撤权、接收方变化拒绝；更高权限Bot不能扩大传入范围；同一权限Port覆盖读取/历史分页/摘要/记忆/投递消费者。真实Obsidian与模型操作按LOG051用户后验，本轮实现对应probe和代码自动化，未运行不能记作现场通过。

迁移003/005可各写自身SQL，注册与执行顺序由原T01 owner串行接纳；T03/T05代码工作依赖T02最终检查/独立审查通过。当前无新产品决定需要用户回答。
