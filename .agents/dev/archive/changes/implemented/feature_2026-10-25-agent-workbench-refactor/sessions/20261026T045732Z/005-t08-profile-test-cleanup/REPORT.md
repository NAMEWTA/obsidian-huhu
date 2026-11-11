# 任务回报

Session: 20261026T045732Z
Task: 005-t08-profile-test-cleanup
Status: completed

## 聚焦交接

已收束 `installation()` 每次新建的测试安装目录：mkdtemp 成功后、第一次复制前，立即通过 Vitest `onTestFinished` 登记仅该 root 的异步递归清理。完整官方正反例仍为 33 项原测试/原断言，没有新增镜像测试或制造形式 red。实际观察正常完成、复制失败和断言失败三种路径的新建目录均已清理。**SOURCE STOPPED**，本次 completed 仅表示窄改候选交回，T08 整票验收仍归 Root。

## 产物与验证

实施者沿原 `codex:/root/implement_t08_profile`、派遣指定 `gpt-6.1-sol / xhigh`，没有派子 Agent。复用原 SpecDev I、dev/testing 已读未变规则，并回读 workspace/catalog 及当前 TASK。工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。

TASK SHA256 为 `79de024d4438ae0f2dadb6be71b6984a460b68684746d55dfeec8a8f4f43c081`。本次仅写产品路径 `src/modules/agent/platform/desktop/agents/program-identity.test.ts`：增加 `rm` 和 `onTestFinished` import，并在 mkdtemp 后增加 `onTestFinished(() => rm(root, { recursive: true, force: true }))`。清理函数在当前用例真实生命周期执行，并由 Vitest 等待其 Promise；不依靠进程退出或全局目录扫描。

| 文件 | before SHA256 | 最终 SHA256 |
|---|---|---|
| `program-identity.test.ts` | `167c801977c3e577c769658152ab2d214de426ea6035dc0d9c84c669a63cae5c` | `a7e2874d73cab1439439afcba9cb375db8f5a6f553dc659b1348bc458dc02c60` |

生产 `program-identity.ts` 仍为 `bbc52091ca3197fa77e05034d2694f5502937e39203717346230996aeb4654ad`；`pi-artifact-profiles.json` 仍为 `3924981f8ce59d0776c258dba19d7755986b4ad155cc63477111bb4a922f3eb3`。没有改 shared/generated、003 报告、历史收据、Root 正式状态/Evidence、package/lock/node_modules、Git index 或根产物；没有根构建、全仓检查、生产 lint、提交/推送/发布/归档，也没有接触真实库/HOME/账号。

本次收据根为 `/tmp/huhu-t08-profile-cleanup-20261026T075000Z`；目录名仅为唯一标识，实际 UTC 见每条 `command.json`。每个检查保存真实 argv/cwd/UTC/exit/raw log、单路径及实际直接编译依赖的前后内容/SHA，并把 TMPDIR 指向本次专用的新空目录。观察器只枚举该新目录的直接子项；从未扫描或删除全局旧 `huhu-t08-profile-case-*`。

| 实际验证 | 退出/观察 | 收据目录 |
|---|---|---|
| 完整定向 `vitest run --project unit src/modules/agent/platform/desktop/agents/program-identity.test.ts`，使用只读官方根 `/tmp/huhu-t08-b-producer-proof` | exit 0，33/33，零 skip；观察到本次 30 个安装 case 创建，结束后 `remaining_cases=[]` | `regression` |
| 隔离入口 `tsc --noEmit --skipLibCheck -p /tmp/huhu-t08-profile-cleanup-20261026T075000Z/tsconfig.json` | exit 0；实际生产/测试入口及 shared 类型 | `types` |
| 单路径 Prettier | exit 0，格式未再改动源码 | `format` |
| 现有正例用独立完整 Pi 副本、故意缺 Jiti 的输入运行 | 预期 exit 1，失败确在第二次 cp 的 ENOENT；观察 1 个 case 创建，结束后 `remaining_cases=[]` | `copy-failure-observation` |
| 现有正例用独立完整官方副本、故意改变 README 一字节的输入运行 | 预期 exit 1，失败确为 unavailable≠supported 原断言；观察 1 个 case 创建，结束后 `remaining_cases=[]` | `assertion-failure-observation` |

后两项是测试生命周期的失败路径观察，不是 TDD red，也不计为官方支持正例或 33 项通过。未修改任何原断言、生产实现或正式 profile；坏输入只在本次新 tmp 构造。其来源说明、修改字节和原日志保留在 `failure-inputs.json` / `assertion-failure-readme.bin` 及对应目录，官方原件和旧 tmp 保持原状。观察记录中标准 Vitest 临时 HOME / Node compile-cache 可能仍列于 `remaining_entries`；它们不是本次 `installation()` case 目录，本次没有越界清理其他 owner 的设施。

共同 Node 为 `/home/wta/.volta/tools/image/node/26.11.1/bin/node`，pnpm 为 `/home/wta/.volta/tools/image/packages/corepack/lib/node_modules/corepack/dist/pnpm.js`。全部 5 条检查各自 before/after 无源码或直接输入漂移。

| 本次索引/固定快照 | SHA256 |
|---|---|
| `source-final.json` | `cbf65571eb22031611983ffdf71b152e64f3560aa0e21f1187219e439c6f41bb` |
| `source-stop.json` | `7ac011f56c257bd68b12d33b8fd6b01326ce5106a2e77ec6c7fc170fbdb6c6ea` |
| `commands.json`（5 条命令、全部日志/清理观察 SHA） | `f998de37ddf0d0441c569f13349c7fcb10ae21f0414e57e57524e9ecf23b79cc` |
| `own-cleanup.diff`（本次单路径精确差异） | `796257b1f4824f6fb6fc0a5931013f6be24aa7a8b5b6cf8bacd9d937ea2a67f4` |
| 隔离 `tsconfig.json` | `e967062265dd9dc8575ef895249ddbe2d3fd1e38d62d8e82257c12daf699cd20` |

## 问题与下一步

本次窄改没有待修复的检查失败；预期的两条失败观察原件保留，不覆盖为成功。Root 回读单路径差异和清理观察后接收即可。原 003 的 artifact/平台/layout/逻辑文件系统期限边界及全部后继未验项目保持；本次未重跑与测试卫生无关的 producer、真实 Provider/Obsidian/五平台或整票根验收，不扩大其通过声明。

**SOURCE STOPPED。**
