# 061 当前限制测试夹具修正

Session: 20261025T043239Z
Task: 061-ts-limit-fixture
Status: completed

## 聚焦交接

仅修正 connection.test.ts:98 的初始预算响应 limits 夹具，由旧的 4/16/32/64/16 改为当前真实默认 3/32/4/8/8。先在原输入上真实复现 INVALID_METHOD_RESULT（41通过/1失败、Vitest exit126），再以同一命令验证修正后42测试全部通过、exit0。原 CAS、初始 decimal 全零预算、严格响应校验和全部断言不变，生产 TS/API/schema 未修改。源码已停写，所有自有进程已 Wait，Root 可继续151全消费者/build/lint，不重复Go/Host E2E。

## 产物与验证

本次复用 dev 与 SpecDev I 的已读未变化规则，完整读取061 TASK（SHA4028d2780d1eaec63716f345e2b7573b2391aa4decb9ad35c0a9994af1335ba8）、Root原红日志、LOG079/082和唯一schema的 collaboration.budget.result 全部约束。工作区仍为 /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，无提交/推送/发布。054报告与原日志保持原时间输入。

唯一仓库源文件为 `src/modules/huhubot/core/protocol/connection.test.ts`。保留完整 before快照（历史日志已清理：`logs/connection.test.before.ts`）、单行diff（历史日志已清理：`logs/02-fixture.diff`）、输入/只读文件摘要（历史日志已清理：`logs/00-inputs.json`） 及 最终逐SHA复读（历史日志已清理：`logs/04-final-inputs.json`）。这是测试输入跟随已批准合同；当前schema对 maxDepth/rootChildren/profileChildren/maxWakes 的上限分别3/4/8/8，旧4/32/64/16本就不合法，未发现要求放宽产品校验的新问题。

| 输入 | 旧/当前 SHA256 |
| --- | --- |
| `src/modules/huhubot/core/protocol/connection.test.ts` 修前 | `076061553362706c5e95c8d84746cd2bfba9fb49562c173c560685987a27bd41` |
| 同文件修后 | `ff589efd4ef674fa748f358a1d94544e75c7690ef4b40654b4d238b3dd3a17aa` |
| `src/modules/huhubot/core/protocol/connection.ts` 未变 | `c515e32ec0a632fe5259ee65b2d82c930859a7ed13ad15aa93f1240823c6e655` |
| `src/modules/huhubot/api.ts` 未变 | `40452f41168ce8d6afc1e8a4b1acf4b786dc05fcb6ec35daa76bd26034aaa80c` |
| `contracts/hap/v0.1/schema.json` 未变 | `4f373cb78cc7f8345192e5c0d54a77315ccfd064cf73b8fb9b94dc6f305cf8dc` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/054-note-effects-client/REPORT.md` 未变 | `17e14cb04a74d9b3ed1efb3e2d698941721c2f2d94caa8da8143d355e581ab70` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-07-logs/lead-current-ts-consumers-r1.log` 未变 | `fce0fcb7a842627506356eba52f5fb5091511aeaf7318b874245c291a64a38d4` |

实际只运行两次同一定向命令：

```sh
pnpm exec vitest run src/modules/huhubot/core/protocol/connection.test.ts
```

- 红：[01-red.log](logs/01-red.log)、exit/Wait回执（历史日志已清理：`logs/01-red.json`），42项中41通过、1失败，Vitest exit126；失败正是 initial zero budget / INVALID_METHOD_RESULT，与Root151中的失败一致。外围记录脚本的exit0仅表示已捕获预期红灯，不冒充测试通过。
- 绿：[03-green.log](logs/03-green.log)、exit/Wait回执（历史日志已清理：`logs/03-green.json`），42项全部通过，Vitest exit0，821ms。原fixture CAS调用、响应严格校验、取消/迟到/兄弟隔离等该文件既有断言均保留。
- 最终逐SHA复读仅授权的 connection.test.ts 改变；connection.ts、api.ts、schema、Root原红日志、054 REPORT 均未漂移。未运行全151、build/lint、Go或宿主检查，按TASK由Root负责后续稳定窗口，不把未运行检查写成通过。

## 问题与下一步

本次精确修复无遗留失败，所有写入与工具进程停止。Root接续151消费者/build/lint和正式验收；真实Provider/Obsidian/目标OS仍用户后验。本次不改054报告，也不更新正式Ticket/Map/Evidence；REPORT后实际运行 return校验并将回执另存自有logs。
