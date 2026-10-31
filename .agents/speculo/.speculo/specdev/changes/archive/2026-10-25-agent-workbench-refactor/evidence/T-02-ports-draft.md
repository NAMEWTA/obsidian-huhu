# T-02 最小端口草案与同票拆分

只读准备稿；没有项目代码、状态、Evidence 或构建变更。对齐 GP-008 / Map revision 9、T-02 新增 LOG-030/033 规范段及 Root 已决定的 TCP owner。正式解锁时仍需回读 T-01 最终交付与 T-02 Packet；本稿不授予写入。

结论：**有可用的两人独立边界。** A 先冻结下面纯类型/错误约定，再由 B 独占 desktop/spaces；A 同时实现 repository/队列/生产 UI。B 不实现业务状态、JsonStore、选择 Space 或布局，不改 controller/module；双方只在 A 的装配处汇合。无需另建平台、native 服务、CLI 或业务 DB。

## 1. 文件 owner

| 文件或目录 | 唯一拟 writer | 职责 |
|---|---|---|
| `core/space/model.ts`、`ports.ts`、`errors.ts` | A | 双方共用的纯数据、错误及端口；先落最小声明后冻结，不并发改 |
| `services/spaces/**` | A | v2 envelope、Zustand、JsonStore、业务 admission/队列/permit/drain、Space 解析/选择协调 |
| `workspace-store/service`、`core/workspace/model/ops`、Sidebar/create/WorkspaceLayout、controller/module、i18n | A（经 Lead 委托的唯一共享 writer） | 新模式真实入口、持久引用与 UI 接线 |
| `platform/desktop/spaces/**` | B | realpath/stat、内库路径解析、本机目录 chooser、目录重验、TCP owner 与真实 FS/子进程边界测试 |
| docs/data、vault-layout、dev architecture 事实 | A 或 Root 在 Packet 中唯一指定 | 与最终实际路径一致；B 不碰 |
| main.js/styles.css、正式状态/Evidence | Root | 串行生成、冻结、验收 |

## 2. 纯数据：`core/space/model.ts`

以下是可直接转成 TS 的窄草案。字段名在正式 Packet 中一次确认；B 不应依赖整个持久 envelope。

```ts
export interface PhysicalDirectory {
  readonly canonicalPath: string;
  readonly dev: string; // fs.stat({ bigint: true }) 的十进制字符串
  readonly ino: string;
}

export interface VaultBinding {
  readonly vaultId: string;
  readonly deviceId: string;
  readonly rootPath: string; // 宿主打开的原始绝对路径，用于重验别名是否改向
  readonly root: PhysicalDirectory;
}

export interface VaultDirectoryBinding {
  readonly kind: 'vault';
  readonly relativePath: string; // '' 是库根；非绝对、不含 ..
  readonly target: PhysicalDirectory;
}

export interface ExternalDirectoryChoice {
  readonly selectedPath: string; // 原生 chooser 实际返回值；保留以检测改向
  readonly target: PhysicalDirectory;
  readonly vaultRoot: PhysicalDirectory;
  readonly deviceId: string;
}

export interface DirectoryGrant extends ExternalDirectoryChoice {
  readonly id: string;
  readonly createdAt: number;
  readonly revokedAt?: number;
}

export type SpaceDirectory = VaultDirectoryBinding
  | { readonly kind: 'external'; readonly grantId: string };

export interface SpaceRecord {
  readonly id: string;
  readonly name: string;
  readonly directory: SpaceDirectory;
  readonly archived: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ResolvedDirectory {
  readonly cwd: string; // 只在本次重验通过后返回的 canonicalPath
}

export interface SpaceChoice {
  readonly id: string;
  readonly name: string;
  readonly directoryLabel: string; // 路径原文，不是翻译文案
}
```

解释：

- `dev/ino` 是本机物理标识，不是业务 ID；同 Vault/device 端口键只使用固定 namespace、deviceId 与 root.dev/ino。canonicalPath 与 rootPath 用于核验/诊断，不把逻辑 vaultId、实例 ID、版本或随机值混进互斥 key。
- chooser 返回 `ExternalDirectoryChoice` 仅代表本次选择事实；**A 在用户确认创建 Space 时**同时 mint grantId，并把 grant 与 Space 提交到同一个 envelope。取消 chooser/表单不落 grant，不启动。
- `selectedPath` 必须保留。只存 canonicalPath 会漏掉“授权 symlink/junction 后改向”的失效场景。
- B 不接受任意外部 cwd 字符串作为授权。外部候选只从 chooser 返回；后续调用只能用 A 在 envelope 找到的 grant。T-07 CLI 日后只能传 grantId。
- `SpaceRecord` 的 Vault/device 归属由 envelope 的 vaultId/deviceId 确定；不重复保存各行可漂移的作用域字段。

## 3. 两个 desktop 端口：`core/space/ports.ts`

```ts
import type {
  DirectoryGrant, ExternalDirectoryChoice, ResolvedDirectory,
  SpaceChoice, SpaceDirectory, VaultBinding,
  VaultDirectoryBinding,
} from './model';

export interface DirectoryPort {
  inspectVault(): Promise<VaultBinding>;
  assertVault(expected: VaultBinding): Promise<void>;
  bindVaultDirectory(
    vault: VaultBinding, relativePath: string,
  ): Promise<VaultDirectoryBinding>;
  chooseExternalDirectory(
    vault: VaultBinding, signal?: AbortSignal,
  ): Promise<ExternalDirectoryChoice | undefined>;
  resolveDirectory(
    vault: VaultBinding, directory: SpaceDirectory,
    grant: DirectoryGrant | undefined,
  ): Promise<ResolvedDirectory>;
}

export interface WriterLease {
  readonly instanceId: string; // 诊断用途，绝不参与端口 key
  readonly port: number;
  readonly lost: AbortSignal;
  assertHeld(): Promise<void>;
  close(): Promise<void>;
}

export interface WriterOwnerPort {
  acquire(vault: VaultBinding, instanceId: string): Promise<WriterLease>;
}

export type SpaceChooser = (request: {
  readonly choices: readonly SpaceChoice[];
  readonly signal?: AbortSignal;
}) => Promise<string | undefined>;
```

精确责任：

- `inspectVault` 只读取并冻结当前 logical/device/root 绑定，无 listener/helper/provider/PTY/业务写入。factory 已配置宿主 rootPath/vaultId/deviceId，不向调用者暴露任意新 Vault 的授权入口。
- `assertVault(expected)` 从同一配置根重新 realpath/stat，与 expected.root 物理身份及 expected.deviceId 比较；不静默产生替换绑定。
- `bindVaultDirectory` 只接受规范库根相对路径，先 assertVault，再确认真实目录位于当前物理库内；存在的 symlink 内跳转可以核验，逃逸拒绝；返回本次物理目标，不写盘。
- `chooseExternalDirectory` 使用 factory 注入的所属窗口原生 chooser；取消或已取消 signal 返回 undefined。不可取消原生 modal 时忽略其迟到选择；B 不生成 grant、不打开 Space picker、不 launch。
- `resolveDirectory` 先 assertVault；库内重建 relativePath 并核对 target；库外要求非 revoked grant、id/设备/physical Vault 匹配，并重新解析 selectedPath 与 target 比较。失败不返回 cwd。未授权目录不能降级到库根或 home。
- `WriterOwnerPort.acquire` 仅取得确定端口 listener。B 负责共享的 key 编码/端口算法及 OS 生命周期，不创建记录、不排业务队列；端口占用/碰撞统一拒绝，不 probe 下一端口。
- `lost` 在 error/非预期 close 时同步 abort；A 在注册回调后还必须检查 aborted，避免“返回 lease 到订阅之间”丢事件。正常 close 之后 A 本就不允许业务动作；B 不触发自动重获。
- `assertHeld` 检查本 listener 仍 held/listening 并 assertVault；B 没有独立的业务 permit 或 drain。
- `close` 只幂等关闭 OS listener、销毁已接受 socket，并等待 close；**不调用 flush、不接管 A 的队列，不保证替 A 排空**。A 必须先 drain 再调用它。
- SpaceChooser 的 undefined 是用户取消；非空 id 仍由 A 在当前 repository 精确解析并冻结，不能当成 grant/有效性证明。候选只有一个也必须由用户选择；后台从不调用它。

factory 建议放 `platform/desktop/spaces/ports.ts`，导出 `createDesktopSpacePorts({ vaultRoot, vaultId, deviceId, win })` → `{ directories: DirectoryPort; owners: WriterOwnerPort }`。`Window`/Node/Electron 只出现在该 desktop factory，core 端口无宿主类型。测试可注入 chooser 函数，但生产必须使用本机目录选择器。

## 4. 错误：`core/space/errors.ts`

最小共享错误是 `SpaceError extends Error`，只暴露 `code`、`reason`、有界 `details`；message 为内部 code/reason，UI 由 A 统一 `t()`，B 不加词典或直接吐英文 fs 错误给用户。

```ts
export type SpaceErrorCode = 'INVALID_ARGUMENT' | 'DIRECTORY_NOT_AUTHORIZED'
  | 'SCOPE_MISMATCH' | 'OWNER_CONFLICT' | 'CAPABILITY_UNAVAILABLE'
  | 'TARGET_REQUIRED' | 'TARGET_AMBIGUOUS' | 'TARGET_NOT_FOUND'
  | 'PERSISTENCE_FAILED';
export declare class SpaceError extends Error {
  readonly code: SpaceErrorCode;
  readonly reason: string;
  readonly details: Readonly<Record<string, string | number | boolean>>;
  constructor(code: SpaceErrorCode, reason: string,
    details?: Readonly<Record<string, string | number | boolean>>, cause?: unknown);
}
```

| code | 适用 reason | producer |
|---|---|---|
| INVALID_ARGUMENT | invalid-relative-path / invalid-name | B 路径、A 用户字段 |
| DIRECTORY_NOT_AUTHORIZED | not-directory / missing-directory / directory-changed / grant-missing / grant-revoked / grant-scope | B 真实事实；A 先查 grant |
| SCOPE_MISMATCH | vault-changed / device-changed | B |
| OWNER_CONFLICT | port-in-use / listener-lost / lease-closed | B |
| CAPABILITY_UNAVAILABLE | chooser-unavailable / physical-identity-unavailable | B |
| TARGET_REQUIRED / TARGET_AMBIGUOUS / TARGET_NOT_FOUND | space-required / ambiguous-name / missing-space / archived-space | A |
| PERSISTENCE_FAILED | load-failed / unsupported-version / commit-failed / readback-failed | A |

建议 `details: Readonly<Record<string, string | number | boolean>>`，仅必要目录/端口/身份；不含 env、凭据或完整提示词。B 原始异常可放 cause，服务映射前不丢失原因。不是所有失败都等于无效果：A 对已发磁盘 I/O 的未知单独记录，B 不声明磁盘 effect。此处不是提前设计 CLI envelope。

## 5. A 独占的业务存储与 permit/drain

`services/spaces/records.ts` 拥有 `{version: 2, vaultId, deviceId, spaces, sessions, grants, layouts, selectedSpaceId?}`。目录固定 `.huhu/terminal-agent/<device>/workbench-v2.json`；`layouts` 用 stable spaceId 作 key，值复用 WorkspaceState。持久 Session 的最小字段为 id/spaceId/kind/title/启动配置引用及可选现有 native 来源；不持久化活动 runtime、屏幕或进程存活。完整 schema 由 A 独占，不是 B 的编译依赖。

只读 load 不获得 OS owner、不修 corrupt 文件；需要恢复写入时由同一 mutation 队列处理。JsonStore 的所有 mkdir/backup/corrupt/write/readback 都必须在一个已 admission 的操作内，不以内部 flush 吞错代替成功。

A 内部只需要一个队列和一个生命周期：

```text
新 mutation
  → 检查接纳状态并登记操作（无 await 间隙）
  → 同一业务 queue
  → 懒 acquire 一次 WriterLease / assertHeld
  → 创建本操作内部 permit
  → JsonStore load/recovery/commit + adopt result
  → 完成/失败，操作计数结束

dispose
  → 同步拒绝新 admission
  → 取消布局防抖并将已接收编辑入队
  → 等待全部已接收 queue + 底层 I/O/readback 结算
  → lease.close
```

permit 是 A 私有的 generation/operation 关联对象，不放 core、不传给 B。进入 closing 只禁止新操作，已接收操作的 permit 仍可完成；lost 则使本代全部 permit 失效。每个 await 后、发布成功前、关联 launch 前复核。已发 I/O 不可因 lost 假称回滚，保持失败/未知、不重放。

目录等待/用户 picker 不占磁盘写队列。持久 Session 先提交，最后 launch 边界重新 resolveDirectory/assertHeld 并使用冻结 spaceId；不能在 provider 权限 dialog 中重新读当前焦点。长时间 Provider 就绪不是 JsonStore 队列的一部分。T-03/04 后续负责完整 runtime/停止竞态，不在端口稿引入它们的平台。

## 6. 现有代码接线点

1. **controller constructor**：通过 desktop factory 取得端口；创建唯一 SpaceService，传 privateVaultStorage、现有 vault identity、时钟/ID 生成器和 dialogs.selectSpace。只读初始化不 acquire owner。
2. **module → ControllerDialogs**：增加 `selectSpace: SpaceChooser`，回调中 `import('./ui/create/SpacePicker')` 惰性加载并使用所属窗口/abort signal；服务不 import UI。T-02 picker 可以从当前列表选择或提示先创建；取消准确返回 undefined。
3. **WorkspaceService**：注入 SpaceService。newTerminal/newAgent/split/restore 的新模式通过同一个持久身份路径；ResumeInfo/normalizer 保留 stable Space/Session 引用。不会把 TerminalSession.id 变成业务 Session.id。
4. **workspace persistence**：v2 的布局更新归 A 的 SpaceService/记录队列；旧 createWorkspaceStore 的 v1 writer 只承接 legacy 数据，不能保存选中的新 Space 布局。完整迁移仍 T-15。
5. **Sidebar/create/WorkspaceLayout**：订阅唯一 SpaceService；表单调用 bindVaultDirectory/chooseExternalDirectory 的服务包装，无 fs；提交创建的 confirm 同时保存 grant+Space。无 Space/空 Space/loading/error 分别呈现；browser 不需要 Space。
6. **T-14 接续**：本票产出的 list/resolve/select/requireSpace 可由 T-14 通过 api 投影给真实旧消费者；本票不新增跨模块 key/manifest 平台，后台无显式有效 spaceId 就拒绝，不能弹 picker 或猜 cwd。

## 7. 并行可行性与必须先冻结的内容

冻结点仅为 model/ports/errors、factory 名/签名和端口 key fixture。A 可在正式解锁后先写这三个声明文件，再允许 B 只读引用；B 的真实 FS/TCP/child-process 测试不需要 repository 或 UI，因此可以独立完成。A 使用遵守同一端口的内存目录/lease fixture验证业务顺序，最终再用 B 真实适配器跑一条 repository/生产创建故障链；不能只凭两个子报告完成。

明确不拆：业务 writer 的 acquiring/held/closing/failed、布局防抖和 drain 都是 A 的一套；B 只有 listener 的原始 opened/lost/closed 事实。不要再加 `DesktopWriterManager` 保存 Space/Session、不要让 B 给 JsonStore 写目录、不要让双方各定义一份 DirectoryGrant。

适合并行，但并非零汇合：实际跨进程 owner 失败必须使 A queue/launch 失败，picker 迟到结果必须不落 grant，v2 布局不能回写 v1，这三条由 A 集成测试、Root 固定整体输入复核。若正式实现发现端口需要频繁改动，停 B 的受影响部分由 A 单点修声明；不同时“补兼容字段”。这比两个 writer 都改 controller 更少耦合，没有扩大 T-02 的外部范围。

已有基线 `/tmp/huhu-t02-baseline.log` 是 Root 已跑的当前旧行为证据，未受改动的部分可复用；本稿没有新增通过声明。仍等待 Root 正式 T-02 Packet。
