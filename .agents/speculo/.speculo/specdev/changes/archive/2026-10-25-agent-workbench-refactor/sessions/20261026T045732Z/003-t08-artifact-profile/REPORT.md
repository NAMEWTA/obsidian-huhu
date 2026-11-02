# 任务回报

Session: 20261026T045732Z
Task: 003-t08-artifact-profile
Status: completed

## 聚焦交接

已交回独立三路径官方 Pi/Jiti artifact verifier 候选；`completed` 仅表示本次候选交接，不表示 T08 done。生产完整 profile 来自已核官方 Pi 1.4.0 的 1279 个文件与实际 bundle loader 解析到的 Jiti 2.7.0 的 16 个文件，已经在只读官方原件及独立完整副本上取得真实支持正例。最终 33 项定向测试零 skip、生产 ESLint 零警告、隔离入口类型检查和只读原件核验均 exit 0。没有接 launcher/Host/editor/UI，没有启动 Pi/Provider、真实库或业务 Session；Root 接收后方可继续集成。**SOURCE STOPPED。**

## 产物与验证

实施身份：`codex:/root/implement_t08_profile`；沿本次实际派遣的 `gpt-6.1-sol / xhigh`，未派子 Agent。工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，引用原 README `execution-context`。仅写本次三条产品路径、本 REPORT 和自己的 `/tmp/huhu-t08-profile-*`；没有改 A/B/C 源、Git index、package/lock/node_modules、根构建产物、正式 Evidence 或永久知识，没有提交/推送/发布/归档。

冻结 TASK SHA256：`c96c0c4c2e344cf9f3735175791a88c7596e5bea4bc3b2056f79cb52eea38274`。实际输入 `evidence/T-08-profile-input.json` SHA256 为 `a44ab3b8bc2ffc9b2c3b33a197b35b61a827a750b31a19eca76413e38bb4d7f1`；官方 producer profile 为 `2e33cbe021af96a1de8b462064a667448be244b8c0bc8408aa178c163465ab48`。三条阶段 before 都真实缺失。

| 路径 | before | 最终 SHA256 |
|---|---|---|
| `src/modules/agent/platform/desktop/agents/program-identity.ts` | absent | `bbc52091ca3197fa77e05034d2694f5502937e39203717346230996aeb4654ad` |
| `src/modules/agent/platform/desktop/agents/program-identity.test.ts` | absent | `167c801977c3e577c769658152ab2d214de426ea6035dc0d9c84c669a63cae5c` |
| `src/modules/agent/platform/desktop/agents/pi-artifact-profiles.json` | absent | `3924981f8ce59d0776c258dba19d7755986b4ad155cc63477111bb4a922f3eb3` |

共 4978 行、201869 字节；其中 JSON 是完整审定文件表，174747 字节。没有把第三方实现代码复制进产品，也没有加入依赖。

全部本地收据根：`/tmp/huhu-t08-profile-20261026T064500Z`。目录名是唯一标识；实际 UTC 以每条 `command.json` 为准。每条命令都有真实 argv/cwd/UTC/exit、`output.log`、产品及直接编译依赖的 `before/after` 内容快照和 SHA256。失败、未能杀死变异的尝试与原日志均保留，未覆盖。

| 索引/快照 | SHA256 |
|---|---|
| `source-final.json` | `b4a4b94a3070ef1ca21192f07b02f057cc456d976bded23204aa61a31309e5b6` |
| `source-stop.json` | `3ec8998e7871aa88fc98d7c3dcf1c2c4fb91b4a1ee9302f7e1db54fec2b1633f` |
| `commands.json`（51 条真实收据） | `2d137e88065cfb1389cdba8c12dfaca0da3cf4c40f1c223796b886c9e1c0ed73` |
| `read-dependencies.json`（实际阅读/编译输入登记，非“全部全文已读”声明） | `32f8a319b2db3ac11f91ca1ace5bc932f60533b8a22a31c9e421427dadc23af4` |
| `own-profile.diff`（三条 absent→最终的独立差异） | `bad7a3fcedef54fca0e2b5b0516f53d12cfa1284581447b10d3f69aee332513a` |
| `official-source-audit.json` | `f388a6b2ae18806fa39f59774f618dfd19012fb4887e64d45fd213f20faae285` |
| `tsconfig.json`（隔离入口配置） | `f435f72e82061b8fb14db29bf503c0721797c8d31cdbf6292e2d09ad0731ca85` |

### 实际 API 与接线合同

唯一行为入口是 `verifyPiArtifact(launch: PiArtifactLaunch): Promise<PiArtifactVerification>`。调用者传已经准备完成的实际 `file`、完整 `args`、完整最终 `env`、绝对 `cwd`、本进程 `performance.now()` 绝对 `deadline` 和可选 `signal`；`limits.maxFiles/maxBytes` 只能降低审定预算。没有最终 env 时准确拒绝，不用当前进程 PATH/HOME 补值。第一次 await 前有限复制 file/args/env/cwd/limits；测试在调用刚返回时修改原对象、数组和 env，结果仍只按原快照验证。调用者仍须启动相同准备输入，不能拿旧 recipe 启动另一套参数或环境。

结果是 `{status:'supported', recipe: NativeEditorRecipe}` 或 `{status:'unavailable', reason}`。类型直接 import 实际 shared generated 的 `NativeEditorRecipe` / `NativeEditorFileIdentity`，没有手抄 DTO。后续 launcher 可把 recipe 交实际 native editor enrollment；unavailable 只禁用这条可认证普通 prompt 分支，后继保留原人工启动/终端操作。不推测尚未交付的 B DTO。

支持的启动形状是直接官方 CLI（允许安装 bin 链接，先 realpath）经其固定 `#!/usr/bin/env node`，或直接 Node 加官方 entry。前者只按最终 env.PATH 找 Node；后者不接受插在 entry 前的 Node flags。file/entry 最终均绑定真实 realpath，executable/entry 的 dev、ino 由 bigint stat 输出十进制字符串。已知平台分支为 Linux/Darwin；本轮只在 Linux 执行，Windows 等返回 unsupported-platform。未知 shell/npm/Volta 等 wrapper、不能确认的解释器或加载配置准确拒绝。

Node 先排除 shell wrapper 并检查本机可执行文件格式，再用**最终已解析 Node**运行固定内置 `createRequire(loader).resolve('jiti')` probe；不加载 Pi 或 Jiti 的模块。loader 是实际官方 `dist/bundle/chunks/jiti-static-loader-2RCDI6B4.js`，没有从薄 CLI 或最近一个 node_modules 猜依赖。probe 前已核完整 Pi、候选 Jiti 全部文件及其 exports 元数据；拒绝优先于包目录的 jiti.js/json/node，不回退全局模块路径。probe 的 resolved entry 必须等于该完整审定 Jiti 的 `lib/jiti.cjs`。probe stdout/stderr 各受 execFile 的 16 KiB 上限，2 秒或更短剩余期限，SIGKILL；回调结算后移除 signal listener。`original-artifacts-final/output.log` 是外部只记录且转发原 execFile 的观察器产生的真实 probe argv/cwd/env/timeout/maxBuffer/killSignal 记录，不是生产替代 profile hook。

拒绝 NODE_OPTIONS、NODE_PATH、NODE_COMPILE_CACHE、LD/DYLD 注入与未审 JITI 覆盖；明确允许官方已审的精确 `JITI_FS_CACHE='false'`，不改写用户 env。`-ne/--no-extensions`、仅 HUHU 扩展、默认 editor/焦点/空草稿等仍属于后续正式接线与最终 gate；本函数不静默加 flags，也不把 artifact supported 称为 Provider/editor 已可提交。

### 完整闭包与有限预算

Pi 全部 1279 文件 / 23419059 字节，Jiti 全部 16 文件 / 1751293 字节；合计 1295 文件 / 25170352 字节。各单文件上限来自审定 profile（Pi 3536719、Jiti 1526691 字节），每次 hash 只用 64 KiB buffer；打开前按文件表及容量判断，读取不超过审定大小，前后 stat 检查身份/大小/mtime/ctime，普通源文件禁止链接并以 O_NOFOLLOW 打开。目录只能来自审定文件表的有限目录集合；未知文件、空额外目录、缺失、替换均拒绝。没有扫描结果 cache 或无限 manager。路径解析最多 64 层 ancestor、64 段绝对 PATH；输入最多 256 args / 64 KiB，env 最多 512 项 / 128 KiB。总本地逻辑期限最多 15 秒，signal 和期限在遍历/读取/hash 边界检查。**正在 OS 中的任意文件系统调用不能被本实现强制中断；不承诺任意存储故障下的硬墙钟终止。**

Pi 包内独立 node_modules 边界是保守支持：只允许 Pi 根的一层 node_modules，且其中恰好只有 jiti 包目录/包管理器链接；Jiti 根之外的安装链接可 realpath，两个审定包内部的源链接都拒绝。内部嵌套 node_modules、其他依赖或安装器元文件拒绝，绝不宽松跳过另一个可执行依赖。**正常 npm 完整安装若在 Pi 包内生成其他 dependencies/.bin/.package-lock，可能准确返回 unsupported-layout；本轮没有声称任意 npm/pnpm 布局都支持。** 外层 node_modules 的其他独立包不进入这个已审 bundle 的实际 Jiti resolution 闭包，不能因此声称它们也经过认证。

固定文件集摘要算法为：按 UTF-8 相对文件路径排序，每行紧凑 JSON `[relativePath, byteLength, fileSha256]` 加 LF，整体 SHA256；完整记录本身也先与固定 fileSetSha256 核对。Pi set SHA 为 `c7fbbe6a4b2f91f04505d7dddb068c64e0e42f99c5e2708ffdcbc6e16445fb78`，Jiti set SHA 为 `176867a8c5336f4cd613ccb7a00fbda2f0f0d04facb8d023b5fa06d6d7712ac7`。artifactDigest 是 UTF-8 `JSON.stringify(['huhu-pi-artifact-v1', piSetSha, jitiSetSha]) + '\n'` 的 SHA256，固定为 `0b61d2d5fb74fef2e4c6d7df4f9e3788c7ecd74cb6e82addff1160a4bd2b33a3`。它绑定完整 Pi/Jiti 内容集，不绑定主机路径；实际路径/物理身份另在 recipe 中绑定。这不是 Node 二进制的官方认证，也不是整目录 hash 到稍后提交的原子安全保证。

生产 JSON 只保留可移植相对文件表、版本、容量、摘要和固定官方 npm 来源；没有 /tmp、主机 resolved 路径或实验 status。`original-file-source-audit-r2` 再次逐文件核对只读官方原件、producer 表与产品表完全一致，并核对两份原 tar SHA。研究复用已核 B 原件及 MIT 许可，不引入外部依赖；另核一手 [Node resolution 文档](https://nodejs.org/api/modules.html#loading-from-node_modules-folders)、[Jiti 官方仓库](https://github.com/unjs/jiti) 与 [Pi 官方仓库](https://github.com/earendil-works/pi)。采用实际 Node 内置 resolver，未复制其实现；Jiti 缓存覆盖的已知风险沿 B 原审计保留。

### 真正红绿与失败保全

| 风险接缝 | 有效 red | 对应 green |
|---|---|---|
| 完整官方支持，最终 Node/entry 身份 | `complete-profile-red`（真实 unavailable≠supported） | `complete-profile-green`；最终原件 `original-artifacts-final` |
| 包管理器 Jiti 独立链接边界 | `package-boundary-red` | `package-boundary-green` |
| thin CLI 不变的 Pi 内部/Jiti 实际内部变化、最近坏 Jiti 不选远端好副本 | `content-mutation-red`（三项均错误支持） | `content-restored-green` |
| 缺 Pi/Jiti 文件 | `missing-mutation-red` | `missing-restored-green` |
| 额外源码 | `extra-source-mutation-red` | `extra-source-restored-green` |
| 同字节源码链接 | `source-links-mutation-red` | `source-links-restored-green` |
| 文件预算 | `budget-mutation-red` | `budget-restored-green` |
| 取消（预先/IO 期间） | `cancellation-r2-mutation-red` | `cancellation-r2-restored-green` |
| 期限（预先/IO 期间） | `deadline-r2-mutation-red` | `deadline-r2-restored-green` |
| 返回真实十进制物理身份 | `identity-r2-mutation-red` | `identity-r2-restored-green` |
| Node wrapper 零执行 | `interpreter-wrapper-effect-red`（实际 marker 被写） | `interpreter-and-cache-green` |
| 只消费最终 PATH | `final-env-r4-mutation-red`（错误接受当前进程 Node） | `final-env-r4-restored-green` |
| 不接受 loader cache 覆盖 | `loader-cache-red` | `interpreter-and-cache-green` |
| await 前冻结实际输入 | `final-input-snapshot-red` | `snapshot-and-cache-green` |
| 已审 JITI_FS_CACHE=false 正例 | `audited-cache-false-red` | `snapshot-and-cache-green` |

有效 red 都是目标行为断言失败的 exit 1，green 为 0。变异脚本及逐次 before/after 保存实际执行源码，finally 原字节恢复；没有把语法错误、过滤掉的其他测试或全部拒绝当正向支持。完整回归另覆盖字节/单文件容量、shadow dependency、missing actual Jiti、Node flags、wrapper、缺最终 env、NODE_PATH/NODE_OPTIONS/JITI 覆盖、env/args 有限捕获与 getter 不执行。

未能杀死的初轮变异也诚实保留：初轮 cancellation 只移除一个检查，后续取消门仍有效；初轮 final-env 因当前进程 PATH 的其他拒绝门而仍拒绝，r4 改为受控已知 Node PATH 后才取得有效 red。最早 wrapper 用外部 touch，因 PATH 没工具而未暴露执行，随后改 shell builtin 并先断言 marker。`original-file-source-audit` 初次因 Python Path 分段排序不同于相对字符串排序而失败，字节 map 一致，r2 修正审计脚本排序后通过；不是原件漂移。`typecheck-initial` 同时暴露隔离配置缺 Node typeRoots 及 JSON tuple 类型问题，均已修正。`lint-initial` 为 Array.isArray 窄化出的 any，且该诊断运行跨过后续改动，不能当固定输入验收；最终 lint 已在冻结源码通过。所有原失败/无效红灯目录未改名清零或删除。

### 最终适用检查

共同 Node：`/home/wta/.volta/tools/image/node/26.11.1/bin/node`；pnpm：`/home/wta/.volta/tools/image/packages/corepack/lib/node_modules/corepack/dist/pnpm.js`。官方测试显式设置 `HUHU_PI_ARTIFACT_TEST_ROOT=/tmp/huhu-t08-b-producer-proof`；未提供原件时仅官方集成组会显式 skip，3 个输入拒绝用例仍可运行。本轮正式验收是 **33/33，零 skip**。

| 检查 | 结果 | 原件 |
|---|---|---|
| 定向 Vitest，生产公共 API + 完整官方副本 | exit 0，33 tests，零 skip | `regression-final-r2/command.json`、`output.log`；log SHA `23f54618035fcd837332b501778c3bddb92918718e3e61c3aa7e900b05e2e23e` |
| 生产 TS ESLint `--max-warnings 0` | exit 0，零警告；之后生产源仅受控变异并原 SHA 恢复 | `lint-final/command.json`、空 `output.log` |
| 隔离入口 tsc `--noEmit --skipLibCheck -p /tmp/.../tsconfig.json` | exit 0；两 TS 入口、项目 d.ts 与真实 shared types | `typecheck-final-r2/command.json`、空 `output.log` |
| 三路径 Prettier，随后测试文件窄改再格式化 | exit 0 | `format-final`、`format-r2`、`format-final-test` |
| 生产源码 bundle → 只读官方原件 verifier | exit 0，真实 supported recipe；无 Pi/Jiti 模块执行 | `bundle-original-harness-final`、`original-artifacts-final`；后者 log SHA `8d421d964045461d8d94a40f7c6b5d3149abaa04a593976e20217afb6ec2a443` |
| 原官方 1295 文件和两 tar 独立回读 | exit 0，产品 records 与 producer/original 完全一致 | `original-file-source-audit-r2`、`official-source-audit.json` |

上述最终 Vitest/types/lint/只读原件检查各自 before/after 均无输入漂移。初始至最终 C 的完整 generated/schema **确有并发加法变化**，已在 `source-before.json` / `source-final.json` 如实记录：generated `f26b0b3a...`→`5ea93bbee7d8494b4c3d00bc27e26bff02c24096696edad452a904a9696b5ccc`；schema `2ab1084e...`→`086bc87efa52dfc6d1c3433d03337491843cbbb97b44e039ef114c5affc50c77`。实际消费的 FileIdentity/Recipe 子接口完整文本在 `recipe-subtypes.ts`，SHA256 始终为冻结输入的 `758cdb0460ed330da7209f75041ffbd0ca8e7f15bffbe63d6de500c5a8a80d07`。不把 C 全文件称为永久冻结。

Skill 实际调用：SpecDev I 完成 workspace/owner/输入预检、当前切片红绿和回读收据；dev 实际用于 desktop/shared 导入边界、按需 JSON/Node 加载、外部来源/许可与上述定向 lint/types/test。已按 Map 回读 ui 入口，本子任务没有 UI 路径或设计交付，不伪造 Design Conformance。正式状态、两轴 review、根整合与产物仍由 Root 拥有。

## 问题与下一步

本次三路径候选没有待修复的已知检查失败。Root 应回读最终三路径、51 条收据索引、原件正例和保守 layout 边界，再派后续 launcher/Host/extension 接线；只有完整受支持官方 editor 实际正向主链、独立双轴审查及根适用检查通过后才可判定整票交付。

未实施/未验证：launcher 消费 recipe、真实 native 物理/OS 前台复核、editor binding 与 prompt 事务、默认 editor/焦点/空草稿/working gate、CLI→broker→Host→helper→Pi 主链、真实 Provider/Obsidian/五平台、根 build/lint/architecture/bundle/native 和独立 review。平台未实测与 npm 安装布局限制保持明确；本轮 verifier supported 仅证明 artifact 与启动解释器接缝，不代表这些后继能力。所有新业务运行仍须显式 Space；本阶段没有创建业务运行或从 cwd/focus 猜目标。

**SOURCE STOPPED。**
