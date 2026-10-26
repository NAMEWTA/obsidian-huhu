# 独立 Agent Browser 运行时

这是 browser 模块自己的桌面运行时，不依赖 agent 模块、终端会话、Obsidian 访客窗口或人的系统浏览器 Profile。每个 Space 启动独立的完整 Chrome、原生 supervisor 和 TypeScript utility Worker；该 Space 的多个 Page 共用它自己的 Profile。

## 生产边界

当前仅启用 **Linux x64**。Windows、macOS、Linux ARM64 返回明确的 unsupported，未把跨平台编译成功当作原生进程 containment 或 Electron 宿主验收成功。浏览器始终开启 Chromium sandbox；生产启动参数没有 `--no-sandbox`，也不查找或连接系统 Chrome。

固定版本为 Chrome for Testing **156.0.8078.47**，Linux x64 官方完整归档：

```text
https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.47/linux64/chrome-linux64.zip
SHA256 e6c94490f0b6b337225aeb2d2a5034858516b7017356980ba94f5176d8774a50
```

Worker 与 Chrome 的生产通信经过本 helper。Chrome 只开启 `--remote-debugging-pipe`，其 CDP 读写端分别为私有 fd 4 / fd 3，不公开调试 TCP 端口。helper 为同一运行时的 Worker 开启带随机 256 位令牌认证的本机传输；令牌通过主进程私有 IPC 传递，不写入参数、文件或 Agent 返回值。

## 所有权和控制权

`src/modules/browser/platform/desktop/runtime/adapter.ts` 导出：

```ts
createDesktopRuntimeFactoryForWindow({
  dataRoot,
  win,
  chooseBundle: async () => selectedDirectoryOrUndefined,
});
```

返回核心 `BrowserRuntimeFactory`，并提供内部 `readerExecutable()` 和 `recoverEphemeral()`。构建脚本把固定的 host 实现编译为 `main-source.generated.json`，通过宿主的 `bundledMain` 执行；真实 `utilityProcess`、native stdio、owner WebContents 以及进程清理由 Electron 主进程持有。窗口只接收结构化事件和二进制像素，不持有 Chrome 的 WebContents、DOM、CDP 或 Profile 目录能力。销毁 owner WebContents 会触发完整停止；清理失败保留可重试对象。

native 是 CDP pipe 的最终、唯一写入者。普通动作必须携带 runtime / epoch / lease / controller 绑定；最后写入之前核验当前租约及 TTL。鼠标按下与抬起、按键按下与抬起作为完整的一组提交；单独 down/up、跨 session 的组合和系统剪贴板快捷键被拒绝。维护通道仅允许固定的启动、观察、默认拒绝及资源清理操作，不允许任意 JavaScript 或权限授予。

控制权变更通过主进程直达 native 的独立通道完成。native 先切换 epoch 并禁止下载，再返回包含最终派发序号的 ACK；这个 ACK 不等待 Worker 的页面任务或 CDP 事件消费。相同 epoch 仅允许同一 lease/controller/mode 延长到期时间，不改变权限，也不增加请求 revision。身份导入使用私有 provisioning lease；第一次显式控制权变更永久关闭导入窗口。

## 浏览器与画面

Worker 提供固定类型命令：导航、历史、刷新/停止、查找、AX snapshot、click/fill/type/select/press/scroll/wait、截图、缩放、视口和完整的人类输入。网页字符串只能作为结构化参数传给固定函数，公共接口没有任意 evaluate、原始 CDP、系统文件路径或 cookie 读取入口。

AX ref 绑定一次 observation、Page、document 和 epoch。执行前重新解析后端节点，检查连接、可操作性、稳定边界和遮挡；OOPIF 使用 frame owner 的 content quad 逐层转换坐标，并验证父 frame 命中。旋转、倾斜或无法证明的跨 frame 变换明确拒绝。原生 `<select>` 支持受校验的选项值；自定义选择器需用普通页面控件操作，不能把它伪装成原生 select。

人类看到的是 JPEG screencast。Worker 每页只保留一帧待确认和一帧最新候选；主进程到窗口仍使用 Buffer / Uint8Array，禁止把像素转成 JSON 数字数组。帧包含 runtime、document、epoch、viewportVersion、inputSequence、CSS 尺寸和真实像素尺寸。静态页面有真实截图保活，不重新标记旧图片时间。最后一个 observer 关闭后停止画面采集。

缩放由 CSS 视口和 deviceScaleFactor 联动实现，支持缩小及放大。更改几何前停止旧 screencast、增加 viewportVersion；未知结果保持阻塞。截图会短暂改变 Chromium 的内部仿真坐标变换，因此截图、几何调整、命中检查及完整输入在同一 Page 的视觉操作队列内互斥。原生撤权和 dialog/file chooser 回答绕过此队列，不会被页面模态对话框阻塞。

配额包括每个运行时最多 8 个 Page、64 个 frame、32 个未完成的请求和 32 个下载；snapshot 最多 512 个节点、64 KiB 的内容；截图最多 8 MiB；CDP/IPC 帧最多 16 MiB；一次 native 动作最多 4 个 CDP 消息、64 KiB。已结束的目标、下载和临时 DOM 对象及时释放。

## 身份、文件与默认权限

cookie 文件和系统浏览器快照读取使用独立的 `--read-cookies` 模式，与浏览器 Worker / Agent 生命周期无关。该模式只读 SQLite，保留源字段与整数精度，不打开源数据库进行写入；解密、人工选择、源语义校验与导入事务由 identity 服务负责。

导入目标必须是尚未发布的新空 Profile。运行时仅操作自己拥有的 default context，不猜测 browserContextId，也不回退到人的 default context。host-only cookie 使用 URL 定位，domain cookie 保留域语义；session、SameSite、priority、source scheme/port 和 CHIPS partitionKey 均保留。stage 和 target 的完整读回比较在 identity 服务完成。当前 first-party localStorage seed 扩展没有实现，包含此类数据的导入必须明确拒绝，不能静默丢弃。

网页权限默认拒绝。所有 target 在运行网页脚本前安装固定的剪贴板策略，禁用网页 Clipboard API 与旧 copy/cut/paste 路径。受信任界面可显式读取 DOM selection 并自行复制；该结果最多 64 KiB，不读取密码框、系统剪贴板或整页敏感表单值。

HTTP auth 总是立即 CancelAuth。拒绝通知绑定浏览器实际的 request/frame/loader；认证取消导致新文档提交时，仅允许同一个原生 loader 的通知转入该文档，避免通知丢失或错误关联到后续导航。dialog 与 file chooser 按 document、epoch、revision 校验；控制权变化会重新发布仍有效的请求，60 秒超时自动拒绝或取消。

下载保存到 Space 私有目录，并携带开始请求所属的 epoch/controllerId。跨控制权切换的迟到下载或同 frame/URL 无法确定来源的下载直接取消。上传只接受文件服务消费过的一次性 grant 转换出的内部路径。

## 磁盘与崩溃恢复

普通 Space 使用 `<dataRoot>/profiles/<spaceId>` 和 `downloads/<spaceId>`；导入 staging 使用 `import-staging/<spaceId>/profile` 和 `downloads`。版本 marker 在 Profile 旁边，拒绝降级、缺失版本的非空 Profile、损坏元数据和符号链接。

启动前写入认证的创建回执；native 在启动 ACK 前写入包含 spaceId、runtimeId、retention、PID 和 Linux `/proc` birth identity 的认证进程回执。停止和独立回收必须同时通过 HMAC 与进程出生标识校验，不能只根据 PID 发信号。只有验证进程组清理完成后才移除活动回执。清理失败保持 retryable / cleanup_pending。

恢复认证 key 保存在 Electron userData 下固定的 `huhu/browser-runtime-ownership/<canonical-root-sha256>.key`，权限 0600；它不进入 vault 同步，也不包含原始 vault 路径。该 key 仅认证进程/清理元数据，绝不代替 OS safeStorage 加密持久身份。用户以相同 OS 身份控制所有进程或篡改本机 userData 不属于这层边界。

`recoverEphemeral()` 只回收此前 activation 遗留且身份可证明的临时资源。当前 factory 已创建或认领的 ID、正在启动以及仍活跃的 Space 都被排除；清理按钮不能停止当前浏览会话。未知、损坏或缺少签名的非空目录保留并返回 cleanup_pending。来源快照与 runtime staging 子目录分别清理，不递归删除不属于 runtime 的 staging 材料。

## 构建和安装

从仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm exec tsc -p tsconfig.browser-worker.json
node scripts/build-browser-runtime.mjs
cargo test --locked --manifest-path native/browser-runtime/Cargo.toml
cargo build --release --locked --manifest-path native/browser-runtime/Cargo.toml
node scripts/install-browser-runtime.mjs \
  native/browser-runtime/target/release/huhu-browser-runtime \
  /absolute/new-runtime-bundle \
  /absolute/download-cache
```

installer CLI 只从上方固定官方 URL 获取并核验精确归档 SHA256，然后调用 assembler。它不运行下载的安装脚本，不搜索系统浏览器。已有可信的完整 Chrome 解压目录时，也可以显式组装：

```sh
node scripts/assemble-browser-runtime.mjs \
  /absolute/chrome-linux64 \
  /absolute/huhu-browser-runtime \
  /absolute/browser-worker.cjs \
  /absolute/new-runtime-bundle
```

bundle 保留完整 Chrome 文件树及上游 ABOUT / LICENSE，另含本仓库 LICENSE、NOTICE、THIRD-PARTY-NOTICES.md 和每个文件/链接的清单。插件只通过人类界面的目录选择器安装完整 bundle；安装前核验全部文件、链接、版本和与插件匹配的 Worker SHA256，拷贝到私有 staging 后再次核验，再原子发布。清单外的动态库或可执行文件同样导致拒绝。当前没有自动更新器，也没有 Agent 触发安装/更新的路径；清单证明完整性，不冒充发行方的数字签名。

## 验证

```sh
pnpm exec vitest run src/modules/browser/platform/desktop/runtime --maxWorkers 1
node scripts/verify-browser-runtime-native.mjs \
  /absolute/huhu-browser-runtime \
  /absolute/chrome-linux64/chrome \
  /absolute/new-native-evidence-directory
```

native probe 使用一次性 HTTP 站点和临时 Profile，root 环境会切换至非特权 UID 65534，Chrome sandbox 保持开启。它覆盖真实浏览器隔离、cookie/CHIPS、原生撤权、AX 操作、静态帧、缩放后坐标、接管后的 prompt/chooser、HTTP401 导航拒绝通知、OOPIF、下载及进程回收。直接 native probe 验证 helper 与 Driver；Electron utilityProcess、Obsidian 多窗口和界面操作仍需单独的真实宿主验收，不能用这个脚本替代。

`.github/workflows/browser-runtime-build.yml` 只为已启用的 Linux x64 构建，运行锁文件构建、真实 sandbox-on probe、完整清单校验后上传运行时及证据。其他平台在有原生 containment 和真实宿主证明前继续保持 unsupported。

## 后续跨平台门禁

Windows 需要真实 Job Object、禁止 breakaway 的子进程树、正确的私有管道句柄继承、独立撤权通道和 PID 出生标识验证；macOS 需要原生子进程树管理及防 PID 重用的回收标识。各平台必须分别证明 utilityProcess 退出、宿主崩溃、暂停/接管竞态、浏览器进程回收、完整安装目录以及多窗口生命周期，不能直接翻转平台开关。

来源导入同样按字段与加密机制评估。无法解密的 Chromium v20 / App-Bound Encryption 记录明确报不支持，不尝试提权或弱化系统保护；Firefox container、来源分区键或任何目标 context 无法精确保留的语义也必须拒绝。first-party localStorage 只有在网络与站点脚本之前完成可验证的种子注入、并与 cookie 一起通过 stage / target 事务之后，才能增加支持。
