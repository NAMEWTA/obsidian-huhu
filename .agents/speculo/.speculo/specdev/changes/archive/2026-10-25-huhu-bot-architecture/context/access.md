# access 访问上下文

**Principal**：由可信连接/认证过程建立的调用主体；普通请求、模型和工具描述不能自行声明其权限。
_Avoid_：clientInstanceId、Agent 显示名。

**Grant**：对主体、资源范围、操作和资料接收方的可撤销授权。
_Avoid_：安装成功、已经登录、人格指令。

**Approval**：针对一个确定 Effect 的单次决定，绑定参数、目标修订、能力/策略版本与有效期。
_Avoid_：写入成功、永久批准所有同类调用。

**Workspace**：资料和宿主能力的授权边界；它不作为同一个数据库的写锁分片。
_Avoid_：本机数据库身份。

**Host Lease**：受信宿主连接在一个 epoch 内提供能力的资格；连接失效后旧 epoch 不再取得新派发资格。
_Avoid_：用户资料授权、进程数据库锁。

**资料流向**：某份授权资料及其派生结果允许发送到的模型/服务目的地。
_Avoid_：只有 UI 显示权限。


## 实施与参考

领域术语和不变量保持由本文与 Spec 负责；T-05/06/07/15/23 的调用方、写集与验证见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。相关参考 REF-03/04 的机制、许可、依赖和不采用边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>。这些资料不赋予模型权限，不替代持久回执或实际验收。
