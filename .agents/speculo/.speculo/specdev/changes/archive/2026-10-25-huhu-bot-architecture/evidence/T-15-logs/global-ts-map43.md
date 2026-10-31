# Map43 / Goal42 Root TS消费窗口

Root是T01原实现owner，当前唯一手写TS writer：src/modules/huhubot/core/protocol/method-validation.ts及新增global-memory-validation.test.ts。只补新全局提案pending/terminal、metadata-only delete、目标CAS/来源创建者、proposal页互斥与生产HapConnection拒绝非法结果，不改私有算法、API形状或UI。163/161/162只写各自Go/DDL，contract generator等Root协调不并发更新Node输入；API纯Go检查如需不依赖TS，其他Go/DB仍冻结。

先当前TS真实结果反例，再最小实现，限定Vitest检查固定TS/schema输入；后续generator实际新有效夹具稳定后再全协议矩阵、lint/build，Root物理CLI最终集成与独立审查另做。已有TS只检查hash语法，Go重核正文hash；本任务不从零引入浏览器同步SHA实现，不冒称客户端完成密码学验证。
