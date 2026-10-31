# T-02 independent review, round 3

Workspace: `/home/wta/orca/workspaces/obsidian-huhu/terminal`
Base/HEAD: `33c21e098ef3188cbab5a09f3e0a01fadb787715`
Input: `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-input.md`
Implementers: codex:/root/prepare_t02, codex:/root/implement_t01, codex:/root

Reviewer 未参与本范围实现或修复。本轮仅读取仓库、执行隔离验证，probe/report 只写 `/tmp`；未改源码、C正式工件、预算、生成物或Git，未派子Agent。首两轮报告保留，未变部分仅在实际字节匹配后复用。

<a id="standards"></a>
## Standards

Reviewer: codex:/root/review_t01
Axis: standards
Result: pass
Input-SHA256: 1eab3f4af09475cad4c562fecbe4be304f06b16389c67f579a6763661fe33901
Observed: 核对全部47文件的实际字节、长度和after.sha256，28份来源/锚点摘要，31份T-01复用文件与旧冻结摘要，均匹配。相对round2只有指定5个源/测试文件及main.js、budget变化；来源无变化。完整审查新merge/store及其业务队列、JsonStore、布局ops和测试闭包；当前源码重建的原3个probe、6文件74测试和独立新增时序断言全部通过，未发现需修正的新问题。

关闭依据：

- **Round2 R2-S01 已关闭。** `workspace-store.ts:87–118,125–183` 按Space/shared分别保留base/view/dirty/pending；同ID的真实布局提交也协调，不再因selected ID相同跳过。自己的在途通知先保留，save结算后以提交value为基准重放仅后续本地编辑；`apply`不产生echo写。选择A的primary暂挂→launch完成→select提交→append提交的原probe现在savedTabs和visibleTabs为同一个tab，随后UI保存仍保留原runtime引用。正式接线测试还覆盖select等待期间B新增page，B草稿未丢也未串到A。
- **Round1 S03 保持关闭。** `SpaceService.saveLayout`在业务队列中以不可变 `{base,value}` 对执行时最新layout合并；后台append仍在队列内应用最新值。原两个同时完成的启动保持两个Session/两个tab，切回后两者可见。UI-save先行与append先行、后续page/rename/close、split/group/pane焦点、首次独立groups、失败后明确重试均有通过的生产store/服务回归。
- **Round1 S01/S02 保持关闭。** primary/backup的每次恢复/合并/readback和写入前版本/scope门，以及成功后才采用disk候选的代码未被本轮改变。原future、cold/warm foreign连续拒绝保持原件；一次EIO后第二次明确操作成功。重跑包含needsRecovery与全部scope变体的回归，没有由布局修复绕过permit或自动重放业务。

`spaces/layout-merge.ts`复用共享threeWayMerge/rebaseChanges和已有openTab/closeTab处理新增引用，未改共享全局冲突语义。真实既有字段冲突仍报告DocumentConflict，bridge包装为SpaceError并保留local与已提交remote。仅首次进入草稿时normalize；same-ID rename/error通知不会重置运行派生状态或触发echo save。dispose先停止订阅/计时入口、排空草稿，再由SpaceService排空并关闭owner，原清理合同保持。

另做两个独立反例检查（并非复述实施测试）：提交新page后，在保存回执到来前关闭它，同时追加terminal，最终只保留terminal；关闭最后一个旧tab同时追加新terminal，最终只保留新terminal且有可达活动group。两者均以实际SpaceService/JsonStore/store执行并断言保存结果、显示结果、分组、状态与零报告错误；均通过。

适用工程结论：新代码仍在agent services内，UI/desktop公共边界未扩大，无新依赖。Root本轮build/full lint/architecture/promise-callbacks/最终bundle日志的副本SHA已核对；未掩盖初次2项超预算。main6077894B、Agent激活1016228B，对应本轮增加2366B/2360B且有具体修复理由；阈值6078464/1016832为最小KiB向上取整。styles1421356B未变，eager123531B/106输入仍在原阈值内。未以预算增长作为代码正确性的豁免。

<a id="specification"></a>
## Specification

Reviewer: codex:/root/review_t01
Axis: specification
Result: pass
Input-SHA256: 1eab3f4af09475cad4c562fecbe4be304f06b16389c67f579a6763661fe33901
Observed: 使用与standards相同的47文件冻结输入；28份Spec/implementation-contracts/T-02锚点/Skill/Design等来源全部匹配，无source漂移。按T-02主责任AC-001/003/053/061与布局/Session本地贡献核对；前两轮每个实际反例均已关闭，当前修改没有扩大到后票产品行为，未发现本票仍缺失或违反的合同。

- **R2-C01关闭：** 成功启动归属A的tab在切回A的交叠时序中立即进入当前布局，后续正常page编辑与保存仍保留相同runtime引用；旧Space晚编辑也保存到其原Space。满足本票真实创建/选择/按Space布局接线的可追踪保证，不再仅靠“两个后台append不互盖”的单一路径推断通过。
- **C03保持关闭：** 同cwd不同Space仍以稳定ID和独立layout键处理；后台append与本地保存的两种先后均保留双方无冲突修改，后来的焦点/布局选择不会被旧回执撤销，真实字段冲突保留双方并明确失败。
- **C01/C02保持关闭：** 未知版本/错作用域拒绝发生在恢复和写入副作用前；初次暂时读取失败不会使同实例永久失去显式恢复能力；保存失败仍不进入关联native启动。此次没有迁移旧v1数据，也没有改变目录授权、owner或最后spawn核验合同。

未变的PAGE-001生产UI、文案、设计与目录/OS owner结论在SHA一致的闭包内复用，不伪称本轮重拍或重新执行。T-07/10/14/15等未来组合功能未作为T-02门槛。真实Obsidian/native chooser/Provider/五平台E2E仍由用户执行，本结果仅是本票固定代码与自动化证据的双轴通过。

<a id="verification"></a>
## Actual verification and evidence

所有命令在仓库cwd执行。以下结果由reviewer实际取得：

1. `node /tmp/huhu-t02-review-round3-freeze.mjs`：初次及最终均exit0。47文件、28来源、31复用文件逐字节核对，执行冻结tracked_diff_command，diff SHA `78ef184250a47dbf16bfa4d720b2c771c58bcac595ea5574c0c011d7e9219de5`。最终输出 `/tmp/huhu-t02-review-round3-freeze-final.stdout`。
2. `node /tmp/huhu-t02-review-rebuild-probes.mjs` 和 `node /tmp/huhu-t02-review-rebuild-selection-probe.mjs`：均exit0。原3份entry仍保持原字节，bundle重新从当前源码生成，不使用旧轮bundle充当当前输入。
3. `node /tmp/huhu-t02-storage-probe.mjs > /tmp/huhu-t02-round3-storage.stdout`、`node /tmp/huhu-t02-layout-probe.mjs > /tmp/huhu-t02-round3-layout.stdout`、`node /tmp/huhu-t02-layout-selection-probe.mjs > /tmp/huhu-t02-round3-layout-selection.stdout`：均exit0，原输出保留。probe的exit0仅代表采集完成；另以Node assert解析三份结果，断言future仍v3/foreign均未变/EIO可重试、双tab均可见、selection前后同runtime引用仍在，实际exit0打印 `PASS original three probe observations and all 22 A command log hashes/lengths`。同一核验核对A本周期22条日志的SHA和长度。
4. `pnpm exec vitest run src/modules/agent/services/workspace-store-spaces.test.ts src/modules/agent/services/workspace-service-spaces.test.ts src/modules/agent/services/spaces/space-service-recovery.test.ts src/modules/agent/services/spaces/space-service.test.ts src/modules/agent/services/workspace-store.test.ts src/shared/json-store.test.ts`：实际exit0，**6文件/74测试/0skip**，原输出 `/tmp/huhu-t02-round3-tests.log`。不是全仓测试。
5. `node /tmp/huhu-t02-round3-rebuild-extra.mjs`：exit0，独立新增entry以esbuild stdin/resolveDir=current repo打包。`node /tmp/huhu-t02-round3-extra.mjs > /tmp/huhu-t02-round3-extra.stdout`：实际exit0，含真正assert，输出两条PASS：提交中新page的迟到关闭不被撤销；关闭最后旧tab与追加新tab后分组仍可达。假storage/launch时序不冒充真实PTY/Provider E2E。

本轮selection原probe输出：

```json
{"case":"select-overlaps-attach","runtimeId":"8b695163-5d52-4f77-9ec5-6d052494d018","selectedA":true,"savedTabs":["tab-5773983d-88cd-4c34-9ad2-a88c3afdbfee"],"visibleTabs":["tab-5773983d-88cd-4c34-9ad2-a88c3afdbfee"],"running":1}
{"case":"later-ui-save","savedRuntimeRefs":["8b695163-5d52-4f77-9ec5-6d052494d018"],"running":1}
```

| 实际变更源/测试 | SHA256 |
|---|---|
| `src/modules/agent/services/spaces/layout-merge.ts` | `06baad04a1741894e8d5dec412fbdd284768391e944a0a727475dd7f87942af1` |
| `src/modules/agent/services/spaces/space-service.ts` | `1928d57ef2b763af6aad3fd113c4d1910759ae7cb291cd557814e0f2b08ff69b` |
| `src/modules/agent/services/workspace-store.ts` | `ea30593109d884895bd0dc63fef4a257ee1b72059862a6947a833e5cc66fc307` |
| `src/modules/agent/services/workspace-store-spaces.test.ts` | `fd027b5386fe38f01cd03269c6498c96412f0d54c8049e814c5f1c76ac0cce8b` |
| `src/modules/agent/services/workspace-service-spaces.test.ts` | `6e1b51621d7c8fc8b7459b06fefc4c87023232c3b8cef40ba1509babb81332dd` |

| Reviewer原始产物 | SHA256 |
|---|---|
| `/tmp/huhu-t02-review-round3-freeze-final.stdout` | `e1159f9291fec3a05145025a5712c3114e68a978739568547cbc5d0bcd98f5c4` |
| `/tmp/huhu-t02-round3-tests.log` | `1f5be5dfa0375de1358ad86349865c65a19737802b99997435f6ab2548abf601` |
| `/tmp/huhu-t02-round3-storage.stdout` | `45f83ca158934057833c25e4d6f609c06fa006926489cd377bf740c723ab3307` |
| `/tmp/huhu-t02-round3-layout.stdout` | `317fdded8d1811d9e162228d138d58e2d2e3f877d1cfc9add9a6280d618c6154` |
| `/tmp/huhu-t02-round3-layout-selection.stdout` | `49e1144920854330903d856c131909b5f71e90efff076bae0b6a9dd681322b05` |
| `/tmp/huhu-t02-storage-probe.mjs`（本轮重建） | `3178796581f59044e3792a0fbf715558432899ce9d2d8cc9458d74f1cb4d19ba` |
| `/tmp/huhu-t02-layout-probe.mjs`（本轮重建） | `a58126d2792823b403c95e897cfc89ddf4aa7c53aecbd3b21f35df7834864f54` |
| `/tmp/huhu-t02-layout-selection-probe.mjs`（本轮重建） | `c60e4ffee79808ccbf023d3a7a8669890c04e98b5e7429160a800ef63332de71` |
| `/tmp/huhu-t02-round3-extra-entry.ts` | `7cd8d12dd034b5cc7da3820c2a06b4c4408b3d4314e2fdd0f6d67294b83df8ff` |
| `/tmp/huhu-t02-round3-extra.mjs` | `9c2e2d2e559af13434a607dd3baeee81e921c92dc09b16141f4949b1d9ef6cd7` |
| `/tmp/huhu-t02-round3-extra.stdout` | `083841f3eb1e8f978d39507bd01f7839d11029e9aab3dd0b1e0e15e108e13dc9` |
| `/tmp/huhu-t02-round3-rebuild-extra.mjs` | `655f68a2df6905006a800c7100d5f973565054d1a16a66393ab1fccfc77d045f` |

原三entry摘要仍为：storage `5f9b09d874689ca9c3e08ffc68b2b568aa3d4af98ab56241b80658f062614772`；layout `157f00d7aa7211002592ebdef2141cd29fc63ab75df7f0e810f610fd7a0a03b8`；selection `a74e6ea2d66042ac44a36c2cbbaf04694a113e88eae1bd78cd9768ce7741d8a3`。

冻结scope digest为 `3f7f9f54331660ef697213c32b508909aceb6c8f579668312a00a596de156dfa`；最终raw为 `fb488e9b792794ec065c54449ce53e82b0f316696cdc38ce08134d003ced217f`。差异仅是C/evidence中新增本周期checks/handoff/日志脚本和budget分析共7个范围外工件，完整列表在freeze输出。按官方explicit-files comparable规则，选定scope的全部元数据完全匹配；所有source与交付字节无漂移。未把hash匹配当作新代码审查替代品。

未重复运行完整build/lint/样式或重建main/styles；按冻结字节和已核对Root记录复用。未运行真实Obsidian、原生选择器交互、真实Provider与五平台E2E；按用户约定由用户执行。没有将后票尚未实现的功能列为本票缺陷，也没有声明整个Change或最终产品验收完成。
