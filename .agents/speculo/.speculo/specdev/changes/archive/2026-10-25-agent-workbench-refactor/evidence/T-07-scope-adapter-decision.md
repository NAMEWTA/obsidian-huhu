# T07 原始 Vault 路径与协议 scope 的窄映射

Root 接线决定；没有新增路径或产品语义，也不改变 C 已冻结 wire。生效写入仍须在 B 实际接口回读后的 A 正式续派中授予。

A7 的业务 `ControlScope` 只含 vault/device/instance 与 physicalRoot，C 实际 generated scope 还需 rootPath。Root 已回读 `core/space/model.ts`：现有 `VaultBinding` 同时保存原 `rootPath` 与 `root` 物理身份。两者不能互相猜测，符号链接路径可能不同于 canonicalPath。

在 A 后续原 A22 写集中，窄解冻 `core/control/context.ts`、`services/spaces/space-service.ts`、`services/spaces/space-service-control.test.ts`：业务 scope 补捕获原 `vault.rootPath`，scope 核验同时比较它；保留 physicalRoot 字段及原 DirectoryPort/lease 核验。唯一 transport adapter 将 `root: scope.physicalRoot`、`rootPath: scope.rootPath` 映射到实际 generated ControlScope。不得新造 UUID、从 cwd/GUI/canonicalPath 代替原路径、另排 writer 或扩大授权。

必要反例：原 rootPath 与 canonicalPath 不同仍准确保留两者；捕获后原路径/物理身份发生变化拒绝；只读 scope 不等待已有磁盘写队列。B 与 C 无需改公开 wire；A 原7源交付仍作为阶段历史保全，新增窄改动必须有当前源码与定向证据。
