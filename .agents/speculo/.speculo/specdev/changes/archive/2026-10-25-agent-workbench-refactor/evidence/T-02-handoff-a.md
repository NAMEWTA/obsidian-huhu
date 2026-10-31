# T-02 A 实施交接（项目写入已停止）

- Owner：`codex:/root/prepare_t02`；workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 仅实施授权 A 写集；保留 T-01 已验收脏改。没有创建 worktree、提交、推送、PR、发版、改正式 C 状态/Evidence 或生成 main.js/styles.css。B 的 `desktop/spaces/**` 8 文件未写。
- A 实际触及 33 文件，完整机器清单 `/tmp/huhu-t02-a-source-manifest-v1.json`，SHA256 `9205b57bbbede2a74c31a9383657ca0cadc1a6da40b5ca2ef2b393e80d91f94e`。共享文件的整文件摘要包含保留的 T-01 前置内容，不把其余 T-01 文件冒称 A 改动。
- 已停止项目源码/测试/docs 写入，Root 接管固定输入、全构建/预算和独立双轴审查；本报告不自行标 done。

## 实际实现与合同观察

1. 三份 core/space 纯合同按 ports-draft 落地并冻结；factory 是 `createDesktopSpacePorts({vaultRoot,vaultId,deviceId,win}) => {directories,owners}`。model/ports/errors 初始冻结摘要与最终摘要相同。B 仅提供物理目录与 OS listener，业务只有 SpaceService 一套 queue/permit/drain。
2. v2 envelope 固定 `.huhu/terminal-agent/<device>/workbench-v2.json`，含 logical vaultId/deviceId/physicalRoot、Space/Session/grants、按 spaceId 分开的 layouts、selectedSpaceId，以及 Root 批准的无 Space Browser/board/usage `sharedLayout`。生产使用 createSpaceWorkspaceStore；v1 createWorkspaceStore 仍保留但不承接新生产布局。无自动迁移、无 v2 回写 v1。
3. AC-001：空 Space 创建/重命名只提交记录，ID 不变，不启动 Provider/PTY/helper；真实 B factory + 文件存储 + WorkspaceService 集成检查 native acquire/spawn 计数。Space ID 和持久 Session ID 都由独立随机 ID 产生，不等于 TerminalSession.id/PID/cwd/name。
4. AC-002 本地切片：两个同 cwd/同名 Space 的 Session 与 layout 独立，实盘内容及原属 Space 可观察；邮箱归 T-10，本票不声称完整 AC-002。
5. AC-003：库内相对路径交给 B bind/resolve；库外选择仅经 DirectoryPort chooser。服务保存一次 pending choice，只公开 opaque receipt+label；create 不接受任意外部 path/choice 对象。确认时 grant+Space 同 envelope 提交，取消/迟到/伪造/重复 receipt 不 mint grant。撤销后已提交 admission 的 beforeSpawn 也拒绝；B 测试覆盖真实 symlink/目录边界。本票的 Session 始终带原 Space，未做全账号历史摄入或 T-11/12 的完整历史产品。
6. AC-004 本地切片：list/resolve/requireSpace 可复用。缺目标、同名歧义、过期/归档目标明确错误。通用 WorkspaceService 新建没有显式 spaceId 就走注入 picker，即使只有一个候选；后台调用 requireSpace 默认不交互并拒绝缺绑定。Omnibox/空 Space 的内部按钮显式冻结所选 ID。旧消费者全面接线归 T-14，不将本票接缝冒称其已完成。
7. AC-046 本地切片：WorkspaceService 新建/split/restore 先做 verified Session commit，再发 launch；提交失败不进入 native acquire/spawn。账户引用随已提交记录传给 agent launch，Space/目录不再取 cwd 或异步焦点推断。取消 Space picker 不创建 Session、不 acquire helper。通知保存组合仍归 T-10。
8. 最后实际 spawn 门：CreateSession.beforeSpawn 在 helper/environment/hooks 全部等待完成之后、spawnSession 之前调用；钩子后再次检查 abort/disposed。controller 为已提交 admission 注入 closure；真实目录在 environment 等待时被替换的组合测试观察到零 spawn、failed TerminalSession 与已保存 Session 可定位。Provider 等待不持有磁盘 queue，切 Space 不改变已接纳归属。
9. restore 保留原账号/transcript/YOLO 路径；仅已提交 Space admission 的 controller 注入 validateCwd，核对仍是冻结 cwd，再走最后 beforeSpawn。旧无注入调用继续 canonicalVaultCwd。没有复制 launcher，也没有放开任意外部 cwd。
10. AC-053：B 真实确定端口 listener 作为合作实例互斥，不是业务控制服务；A 所有 JsonStore mkdir/backup/corrupt/write/readback 都经过同一 active permit 的前后校验。只读 load 不 acquire writer、不恢复写。进入 closing 同步关新 admission，但允许已接纳 queue 完成后才 close；lost 永久使本实例拒绝关联写/启动，不重获、不按 PID/mtime 抢锁。
11. 实际第二子进程在 A accepted write/drain 被阻塞期间收到 OWNER_CONFLICT；排空/close 后 replacement 成功 held。测试所有失败分支 kill 后也 await exit，再删夹具。B 的独立 22 条 OS/FS/强杀重启证据由 B 原报告拥有，本报告没有重复跑来替代其原证据。
12. 损坏/恢复：可解析且不是已知 version2 的 primary 拒绝 unsupported-version，不能拿旧 backup 覆盖未来格式；坏 JSON/已知 v2 坏结构可只读采用有效 backup，但首次恢复写必须在 permit 内保全 corrupt。Session codec 校验实际消费的 Provider/shell 枚举及 account/native/transcript 字符串、要求 Agent 有有效 Provider，并拒绝不在 Session schema 中的 env 等字段。prepareSession 也按白名单构造持久记录。
13. 可恢复提交错误不会永久卡死：只有显式后续 commit+readback 成功才清除旧 failure；owner lost 不恢复。workspace bridge 采用后续已验证保存替换旧 pending 失败。普通磁盘失败保留可操作的 create/rename 重试入口；初始化未知格式/作用域失败、closing/lost 不允许写。
14. controller.dispose：即使 strict workspace drain/stats 等失败，也继续 sessions、materials/prompts/runtime/hooks/usage/history 等所有清理，最终 AggregateError 保留原错误；没有为清理吞掉 flush 失败。真实 AgentController.prototype.dispose + 真实 SpaceService/bridge 故障 fixture 已验证。

## 生产 UI 与设计一致性

沿用已批准 A / PAGE-001：侧栏 Space 导航、新建/重命名 Dialog、目录选择、no-Spaces/empty/loading/error；现有标签/分屏与 Browser 路由保留。module 惰性注入 SpacePicker，services 不导入 UI。新文案 en/zh 使用 t()；纯错误统一映射为人可处理文案。

- DOM 使用真实 SpaceService/存储队列与生产组件：键盘创建/重命名、IME Enter 不提交、chooser 未保存及取消不落 grant、箭头/Home/End/Enter 精确选 ID、同名全 ID 可选、加载禁用、失败可重试、无 Space Browser 操作、空 Space 启动显式传 ID。
- SpaceForm 受控 open；deferred save 期间 Escape/关闭 X 仍可见，失败后不会留下隐藏且无法重开的表单；成功才 finish。普通失败后关闭再重开并显式重试有 DOM 证据。
- Chrome 截图是**生产组件的隔离渲染**，使用真实 Obsidian app.css 与当前生产 Tailwind/令牌；目录/owner 是隔离 fixture，不是 Obsidian 宿主或真实终端 E2E。preview 脚本、CSS、HTML、bundle 仅写 /tmp，未生成仓库产物。
- 脚本 `/tmp/huhu-t02-a-visual.mjs`；最终原输出 `/tmp/huhu-t02-a-visual-v5.log`；量测 `/tmp/huhu-t02-a-visual/results.json`。已实际查看 normal dark、窄屏 empty、窄屏 form 截图。7 组均无水平溢出；桌面控制最小高 32px，coarse-pointer form 所有按钮至少 44×44。

| 状态 | 宽度/主题/语言 | 截图（共同前缀 /tmp/huhu-t02-a-visual/） |
|---|---|---|
| Space 导航/正常空内容 | 1200 dark en | normal-1200-theme-dark-en.png |
| 长名称/正常空内容 | 800 light zh | normal-800-theme-light-zh.png |
| empty Space | 480 dark zh | empty-480-theme-dark-zh.png |
| no Spaces | 480 light en | no-spaces-480-theme-light-en.png |
| loading | 800 dark en | loading-800-theme-dark-en.png |
| recoverable error | 800 light zh | error-800-theme-light-zh.png |
| create Dialog/coarse pointer | 480 dark zh | form-480-theme-dark-zh.png |

真实 Obsidian、原生 chooser 所属 popout 窗口、Windows/macOS/junction 与五平台 E2E 依用户授权交用户执行。本票代码/自动化与隔离视觉不冒充这些场景。

## 命令、退出与原输出

所有命令 cwd 为仓库根。未运行完整 build 或会改 main/styles 的命令；Root 负责最终生成与预算。ESLint 按项目配置忽略测试文件，测试用 Vitest 与 test tsc 验证；没有为此关闭规则。

| 命令/范围 | 实际 exit | 原输出 |
|---|---:|---|
| `node node_modules/vitest/vitest.mjs run src/modules/agent/services/spaces src/modules/agent/services/workspace-service-spaces.test.ts src/modules/agent/services/workspace-service.test.ts src/modules/agent/services/workspace-store.test.ts src/modules/agent/services/controller-space.test.ts src/modules/agent/services/launch/launcher-space.test.ts src/modules/agent/services/terminal/sessions-space.test.ts src/modules/agent/services/terminal/sessions-cancellation.test.ts src/modules/agent/core/workspace/ops.test.ts src/shared/storage/vault-identity.test.ts` | 0：11 files / 61 tests | `/tmp/huhu-t02-a-unit-v6.log` |
| `node node_modules/vitest/vitest.mjs run --project dom src/modules/agent/ui/create/SpaceForm.dom.test.tsx src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx` | 0：2 files / 8 tests | `/tmp/huhu-t02-a-dom-v5.log` |
| `node node_modules/typescript/bin/tsc -noEmit -skipLibCheck` | 0 | `/tmp/huhu-t02-a-type-v5.log` |
| `node node_modules/typescript/bin/tsc -skipLibCheck -p tsconfig.test.json` | 0 | `/tmp/huhu-t02-a-test-types-v6.log` |
| production ESLint：core/space、core/workspace model+ops、services/spaces、workspace store/service、controller、sessions、launcher、ui/create、SpaceNavigation/AgentSidebar/WorkspaceLayout、module/i18n、vault-layout，`node node_modules/eslint/bin/eslint.js ... --max-warnings 0` | 0 | `/tmp/huhu-t02-a-lint-v4.log` |
| 上述 lint 后实际再改的 SpaceService/records、WorkspaceService、Space UI，`node node_modules/eslint/bin/eslint.js src/modules/agent/services/spaces src/modules/agent/services/workspace-service.ts src/modules/agent/ui/create src/modules/agent/ui/sidebar/SpaceNavigation.tsx --max-warnings 0` | 0 | `/tmp/huhu-t02-a-last-edit-lint.log` |
| `node scripts/verify-architecture.mjs` | 0，1219 modules | `/tmp/huhu-t02-a-architecture.log` |
| `node scripts/verify-i18n.mjs` | 0，31 dict / 4592 keys | `/tmp/huhu-t02-a-i18n.log` |
| `node scripts/verify-docs.mjs` | 工具报告 126，失败，未记 pass | `/tmp/huhu-t02-a-docs.log` |
| `node /tmp/huhu-t02-a-visual.mjs` | 0，7 组截图/量测 | `/tmp/huhu-t02-a-visual-v5.log` |
| `git diff --check` | 0 | 工具原输出为空 |

全仓 docs 失败仅列另一 change `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md` 的六个缺失 heading anchors（9/12/14/15/17/19）。本票没有写该文件，也没有越界修复；本票事实文档已同步实际路径与功能，未将这条失败冒称通过。

## 原始红灯与修正轨迹

- `/tmp/huhu-t02-a-red.log`：先写 repository 行为测试，模块尚不存在时红灯；工具 exit126。
- `/tmp/huhu-t02-a-spawn-red.log`：beforeSpawn 未实现时两条真实 native session 测试红灯（钩子未调用、取消后仍 spawn）；工具 exit126。实现钩子后 `/tmp/huhu-t02-a-core.log` 另发现测试把既有 fail() 的 activity 当 failed；改为检查真实 connection=failed/error，未改旧 fail 行为。
- `/tmp/huhu-t02-a-workspace.log`：legacy resume spy 多传 undefined 参数的回归；保留 legacy 二参调用，后续 workspace suite 通过。
- `/tmp/huhu-t02-a-integration.log`：假 native transport 的 end 没发 exit，真实 NativeHost 正确等待释放导致超时。补真实 exit 事件，未加超时/睡眠绕过；v2/v3/v4/v6 集成均后续通过。
- `/tmp/huhu-t02-a-controller.log`：node 环境缺 electron，只 mock 未执行的 desktop/files 外壳；真实 controller.dispose/SpaceService 保留，随后 `/tmp/huhu-t02-a-failure-v2.log` pass。
- `/tmp/huhu-t02-a-type-v1.log`、`test-types*.log`：作用域引用、unknown ReactNode、mock 泛型/AgentId/NativeSpawnOptions 类型问题；均由实际 source/fixture 修正，最后生产 tsc v5 / test tsc v6 为权威，不用 Vitest transpile 代替类型检查。
- `/tmp/huhu-t02-a-lint-first.log`、`lint-v2.log`：不必要断言、unknown throw、控制字符正则、unbound callback，逐项改代码；没有关闭规则。`lint-final.log` 是误把配置已忽略测试作为显式 ESLint 参数产生 ignored warnings 的失败，后续只校验配置负责的生产文件，测试仍有完整 tsc/Vitest。
- `/tmp/huhu-t02-a-visual.log`：首次隔离 Chrome 导航冷启动未渲染；补 Runtime enable 后 v2 真实渲染，发现 preview 自己漏注册 common 词典（生产 module 已注册），修 preview 并重拍；v5 包含最终 tooltip/coarse-pointer UI，无 raw common key。
- 所有历史 `/tmp/huhu-t02-a-*` 原输出保留。失败时工具常报告126；一律按失败记录，不将日志里局部pass或空输出当检查成功。后续直接 node 包入口的绿色命令实际 exit0。

## 参考采用与范围保留

已复用预检/ports 原报告及固定 reference-notes 的真实活动/许可证据：R-01 Herdr `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`（Apache-2.0）用于比较活跃 owner/lease 与崩溃释放机制；R-03 tmux Control Mode（ISC）只作后续控制机制参考，本票没有复制实现或提前建 CLI。Wave 固定来源与官方 Node/libuv/Windows bind 语义比较由已保存 preflight/B 报告拥有。TCP 是 Lead 已确定的最小合作实例互斥，不把 exclusive:true 解释为 Windows 安全凭据。

实际代码复用现有 JsonStore、storage ports、vault identity、工作区 normalizer、Dialog/Button/Input/Tooltip 和 i18n；无新依赖/业务 DB/daemon/helper 服务，无 GPL 终端代码复制。保留 T-03/04 runtime/stop、T-07 CLI、T-10 邮箱、T-11/12 历史、T-13 Browser 独立owner、T-14旧消费者、T-15迁移等后继 owner，不用未来功能阻塞本票切片，也不声称已交付它们。

## A 实际文件清单

- `.agents/skills/dev/references/architecture.md` — `c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2`
- `docs/data.md` — `f1b8c4808f44d67eee5564e29682a4bb5f67c9bf3dbb152aa485e8f63f7d5bf5`
- `src/modules/agent/core/space/errors.ts` — `8159653372f3b24851644c4933b3a251584ae75faddd670bb385c9d78898062e`
- `src/modules/agent/core/space/model.ts` — `867ef47ae8e7a9f6ea079dd6263e850af55bd3b43d94421cb6e12c5e8458132e`
- `src/modules/agent/core/space/ports.ts` — `5bb0fb11e6dd8928f3adee6905824f2c1588ecf277d686dd07209b6c4fd4c5b1`
- `src/modules/agent/core/workspace/model.ts` — `a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a`
- `src/modules/agent/core/workspace/ops.ts` — `d7e191afac0e92a9374cf7fabc1e841a7995f4277071430749f028f34f3ac037`
- `src/modules/agent/i18n.ts` — `8525a772108fa99bdb8e641f55db55512602ef19764e0d1b49ea7c6c87a89259`
- `src/modules/agent/module.ts` — `e5a1b8717022742d6796d8063cdaeb96bb8582f4b5bfb6aca16d89b5d77aeb00`
- `src/modules/agent/services/controller-space.test.ts` — `6907184d4b3842bb2d6233d727267c1c572e84034c7c502967746f68bf15759a`
- `src/modules/agent/services/controller.ts` — `4aaeae21fe5c032d4df4944fd7c6e3502d09a01fda0be453374a83d7c9c48336`
- `src/modules/agent/services/launch/launcher-space.test.ts` — `b1193badddbda4d1b5cad93d2676c6764796bbf667968dbc63bfdce6fb51707b`
- `src/modules/agent/services/launch/launcher.ts` — `70ec678f407c442f7bdfd1f7f586b5c2541e8f40c0c7dc9c65c5de11f1b38dc3`
- `src/modules/agent/services/spaces/messages.ts` — `bc1fe43f7f31b0c89a946e224d110d12fd45d71d4471eb915a2dfd573fd48c83`
- `src/modules/agent/services/spaces/records.test.ts` — `e4c81015e5caf71cf80b608553d44ccd1997479d78f481b705b2a2e8836342ad`
- `src/modules/agent/services/spaces/records.ts` — `1f6ac211a8ba2933532acb1fe70e124297e2f975952bc6c12f75a46fd1c795b3`
- `src/modules/agent/services/spaces/space-service.test.ts` — `249ec1a373317bc8b8d6e71d67ce527f086fe96910053202b85b5f73ba8d6774`
- `src/modules/agent/services/spaces/space-service.ts` — `8712c1981016dff663fb688cf69de038d053b11e1dbd6427f3cf064abdde2de7`
- `src/modules/agent/services/terminal/sessions-space.test.ts` — `831a034d21eeee992822ef8d808f0a029962d780338b12fd6ebba5eb996e9eb8`
- `src/modules/agent/services/terminal/sessions.ts` — `94069dfd409b84eb96314d0fa827e9fcf01e3a6a0e9ea2c913c4cc0f1f61d323`
- `src/modules/agent/services/workspace-service-spaces.test.ts` — `3a0ba25a7a34f909150ce6c5f9d6622b919957cdabe0e3cd2458c8b55024e430`
- `src/modules/agent/services/workspace-service.ts` — `3a62ab673d88bc04e5ff7c5019aeae1cb2d0d256fbc4211e3e926a906f2e163f`
- `src/modules/agent/services/workspace-store.ts` — `cd0eba9b220e237ea69f464eb80eefee729ce7e2440f41947674516dd59bc11a`
- `src/modules/agent/ui/create/Omnibox.tsx` — `9a070017f6272694033f120c0750cdb2b844205cd2fccd9ca7aa5483f5be99b2`
- `src/modules/agent/ui/create/SpaceEmptyState.tsx` — `9734d3964a4f718301cf9d9cefb35d18ed30c51444c10a96bc0a4ee134fac388`
- `src/modules/agent/ui/create/SpaceForm.dom.test.tsx` — `ef536b41d7af0dc718dd421570e6bf606a6838af81e76adb6119f59d066c6b6e`
- `src/modules/agent/ui/create/SpaceForm.tsx` — `0a4ddba94c3e8a0de45ee58a72e76f71e77b1b1f0143610b27255717b2c3dec9`
- `src/modules/agent/ui/create/SpacePicker.tsx` — `bdefb334c060049394abfa8a19fa1a9fbba247d1bc58c03d502098e10f26389c`
- `src/modules/agent/ui/create/space-errors.ts` — `9ca2dbb4c37e03decfd5d9c0d474238be743fa5dc80e0f52cb7763a26d06784c`
- `src/modules/agent/ui/sidebar/AgentSidebar.tsx` — `29e6842a70efca313e8e5ca5f19682f464c20b062bb88e43700d964ee33b5a3a`
- `src/modules/agent/ui/sidebar/SpaceNavigation.tsx` — `9cfb58d9798b82c59b29bfedabdfb1fa816d64eb9ad9ee9fe5afd9071ef4ddaa`
- `src/modules/agent/ui/workspace/WorkspaceLayout.tsx` — `e8c3c3a6d112725c32a1c20bf69b883501f18308f2d55546430dcca620f824c6`
- `src/shared/storage/vault-layout.ts` — `152ed5c79ac456e9752aec09adddc2ecaf0f1cc0ad7829f5e1a1907d2ed21f55`

## 最终补记与完整 lint 命令

- test tsc v6 工具返回实际 exit0，原输出为空；覆盖最后增加的 grant revoke 测试。
- Root 已回报自己执行 `pnpm run build` exit0；该生成物与预算验证由 Root 的记录拥有，不伪称 A 执行。
- 完整 production lint v4（exit0，日志 `/tmp/huhu-t02-a-lint-v4.log`）：

```sh
node node_modules/eslint/bin/eslint.js src/modules/agent/core/space src/modules/agent/core/workspace/model.ts src/modules/agent/core/workspace/ops.ts src/modules/agent/services/spaces src/modules/agent/services/workspace-store.ts src/modules/agent/services/workspace-service.ts src/modules/agent/services/controller.ts src/modules/agent/services/terminal/sessions.ts src/modules/agent/services/launch/launcher.ts src/modules/agent/ui/create src/modules/agent/ui/sidebar/SpaceNavigation.tsx src/modules/agent/ui/sidebar/AgentSidebar.tsx src/modules/agent/ui/workspace/WorkspaceLayout.tsx src/modules/agent/module.ts src/modules/agent/i18n.ts src/shared/storage/vault-layout.ts --max-warnings 0 > /tmp/huhu-t02-a-lint-v4.log 2>&1
```

- 完整最后改动 lint（exit0，日志 `/tmp/huhu-t02-a-last-edit-lint.log`）：

```sh
node node_modules/eslint/bin/eslint.js src/modules/agent/services/spaces src/modules/agent/services/workspace-service.ts src/modules/agent/ui/create src/modules/agent/ui/sidebar/SpaceNavigation.tsx --max-warnings 0 > /tmp/huhu-t02-a-last-edit-lint.log 2>&1
```
