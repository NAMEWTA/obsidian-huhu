# T09 F1/F2 窄修候选交付

Session: 20261026T045732Z
Task: 039-t09-review-repair
Status: completed

## 聚焦交接

F1 已在原 GUI→Pane→布局 owner 接缝保留显式 groupId，并在实际准入时重核该组；后台附加不切活动/输入焦点，前台创建仍用原 ForegroundIntent。F2 已在 attach/split 的同步 transform 内，以候选替换本 Space 的 view 重用同一全局索引检查，发布/保存前拒绝第4097叶，没有新增计数缓存或第二 writer。新增目标001六红→002六绿，补充组在等待中消失的准确诊断003红→004绿；最终8文件126项、实际测试types与定向生产lint全部通过。A14于 **2026-10-26T18:51:38.231904Z SOURCE STOPPED**，本报告completed只交回A窄修候选，Root统一构建/消费者与独立复核后决定T09状态。

## 产物与验证

### 输入和精确写集

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、branch `NAMEWTA/terminal`。完整读取039 TASK（SHA `d7791502c91ac91a355003a7428dfbc360f83d865fbfc1130e3eb34079f43a1e`）、036两轴request-changes原REPORT（`185e7567c278be59f581105ba9bf3724a7454387383f3bbfece2917864609b82`）、Root audit与实际group/capacity原反例，复用未变I/dev/ui/TDD/错误资源规则及T09批准合同。没有新产品决定。原028/036报告、reviewer夹具/raw和正式状态全部只读，未改写旧失败。

本次原件根 **R**：`/tmp/huhu-t09-review-repair-20261026T184416Z`。Root输入 `/tmp/huhu-t09-root-review-repair-mq99pq7w/inputs.json` SHA `94a5ee60a357d9fa8d01bfe163208ca0fbb7bc7a0199fbaa3ea0e5aa1cdc7057`，完整冻结输入 SHA `5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4`；派前实际2081产品无漂移，`initial-check.json`保留核对。停源再次核对：只有下列4产品变化，分配外产品drift=[]；A14其余10路径原字节/mode保持。没有提交/index/依赖安装、根build/lint、Cargo、Chrome、产物/预算或正式状态写入，也未递归派遣。

| 本次修改路径 | before SHA256 / mode | stopped SHA256 / mode |
| --- | --- | --- |
| src/modules/agent/services/workspace-service.ts | d300219eaa45a1214a33256b059cbaefea39b19c8c6e37f20fc95ecc89c93917 / 0o600 | 9fc4f50579c73a8ab313b11e655e4f9aa16ceba810ee3037382ee43778f674fd / 0o600 |
| src/modules/agent/services/workspace-service-panes.ts | 44b9d099b6ad403f7f83509ebebe7f1ad252566420ff58e30fb8d21a696b6310 / 0o664 | b75513725460b9c5c1553db7c426c72f69ceb09ad48a7288c08b9fda3341a409 / 0o664 |
| src/modules/agent/services/workspace-service-panes.test.ts | 0b6189502edc11524cddd82eaeaf7ea4b0c4384574462c708d495722d9277061 / 0o664 | 9be90d7596bf1997dc6de4c12dadf18f3d6da4d62169ba1153907dd1d4834cfc / 0o664 |
| src/modules/agent/services/workspace-service-foreground.dom.test.tsx | 223e8ab3a5a26b7749d17230d7495a63e4925d857c402d30748ed5a12b70ea64 / 0o600 | 00c27cf9fd75b86fe3d4ef6b0b0db5c194559482fd076699f2fb71031049d509 / 0o600 |

`a14-before.json` / `a14-after.json`保存完整14路径的字节/CAS/mode，after清单 SHA `66eefcf1fc70d2b639d7eaa9d6c4f90f2b91bbcaa1cfdf97a6ded968d9c0d1a9`；`repair.patch` 是此次精确增量，`source-stopped.json`记录停点及范围核对。不能用HEAD→工作区的大差异归因本次窄修。

### F1 关闭证据

- 原真实消费者只读追踪：TabStrip给NewTabMenu传本组ID；NewTabMenu→Omnibox继续透传；Omnibox执行时构造 `{groupId,spaceId,...,foreground}` 给原 createManagedInteractive。未以先选中右组掩盖问题，也未修改UI。原036 before两项通过/final两项失败的实源反证和原Node receipts/raw SHA在 `review-provenance.json`。
- ensureManagedPane现在调用 `panes.attach(ref,{groupId})`；attach仅增加可选GUI附加参数，B无group调用和其他六操作签名不变。groupId在第一次await前捕获；原Space队列实际transform里检查目标组仍存在，按该组openTab。已存在同Session继续原单显示幂等，不搬移为第二个owner；原后台模式保留activeGroup、各组activeTab和recentTabs，输入焦点不由group参数授权。
- 新单位用例覆盖左组活动、向右组 `attachManaged(focus:false)` 和 foreground create，真实组成员正确、单runtime；无group的pane领域入口仍进原活动组且不抢焦点（不是本组真实CLI运行）。新增两条DOM用原ForegroundIntent：后台附加保持anchor且不采集foreground；前台创建经原presentManagedFocus→commitFocus→consumed，原textarea实际activeElement正确。原Space/owner全部真实，只有外部transport/storage/目录/lease受控。
- 原primary写被barrier阻塞时排队附加，随后原GUI关闭右组；释放原写后准入准确拒绝，未回退左组、未新增显示，已有runtime继续后台。003已证实原通用Managed错误转换丢失新组诊断，004改用既有SpaceError保留 `TARGET_NOT_FOUND / missing-group`。该精确失败/修正原件保留；没有扩大通用错误协议或修改B。

### F2 关闭证据

- 仍使用原4096全局叶上限及同一个index读取来源。index可在本次同步检查中用候选view替换本Space实际快照，其余Space仍读原owner最新已发布dirty/pending view；不新增可漂移计数/索引，不放宽200Tab/四叶或全局扫描限制。attach/split在transform返回之前检查完整新增候选；store随后materialize/check/publish之间没有await，跨Space不能同时靠旧计数接纳最后名额。
- 实际持久化边界：4095→4096最后合法新增completed；4096新增attach/split拒绝 `effect:none, layoutPublished:false, persisted:false, CAPACITY_EXCEEDED`，拒绝和已附加Session重复attach均零storage.write。原4096图仍可list、capture与close；close后primary回到4095，原runtime不stop。
- 覆盖同Space队列和跨Space竞争：两个现有后台Session争最后名额，将首个真实primary写保持未决；观察原draft只发布一个candidate、primary仍是原4095，随后释放原写，两结果恰一completed/一none，最终primary4096。未mock核心owner、缩小4096为测试数字，或在check与publish之间加await。
- `primary-observations.json`索引60份本轮各命令实际primary快照及SHA，含before/last-legal/after-reject/after-close和竞争结算。`original-capacity-primary.json`另保留036原primary的只读复制与校验，实数4096→4097；不拿修复后的快照覆盖旧反例。新增001六项全部目标断言红（包括两Space发布2个而预期1），002六绿；最终覆盖同Space竞争与无group默认后一起进入005。

### 实际命令与闭包

每个 `R/commands/<编号>/` 有 exact argv/cwd/UTC/exit/raw SHA、环境覆盖和源前后快照；全部命令内所观察清单无漂移。`command-index.json`统一索引，runner调用如下。

| 编号 | 实际结果 |
| --- | --- |
| 001-review-findings-and-capacity-red | exit1，新增6条目标全部红，原8条被名称筛选未执行 |
| 002-review-findings-and-capacity-green | exit0，相同6条绿，原8条未执行 |
| 003-explicit-group-focus-and-capacity | exit1，8绿/1红；红为已失败的组目标被转换成CONNECTION_UNAVAILABLE/prepare-failed，准确目标诊断丢失 |
| 004-explicit-group-focus-and-capacity-green | exit0，9条新边界绿；名称筛选37条未执行 |
| 005-final-owner-model-service-foreground | exit0，完整8文件126/126、0skip；原115+本次11条新增 |
| 006-final-test-types | 标准TypeScript CLI `--noEmit --incremental false --skipLibCheck -p tsconfig.test.json`，exit0 |
| 007-final-production-lint | 两条修改生产源ESLint `--max-warnings 0`，exit0、零warning |
| 008-archive-and-owned-cleanup | exit0，原件/闭包/CAS/primary归档、停源A14 drift=[]及自有资源清理 |

005完整集：ops、pane-identity、workspace-store-spaces、workspace-service-panes、workspace-service-spaces、workspace-service-foreground DOM、workspace-service-control、workspace-service。包含原dirty/base/pending/效果事实/取消/原代/T08焦点风险；没有为本次修复跳过、删除或放宽旧断言。真实测试Node固定 `/home/wta/.volta/tools/image/node/26.11.1/bin/node`，避免PATH wrapper将失败1映射126。

实际编译观察：005给Vite的仓库原字节89个；006标准tsc同步read观察3554个；007ESLint4910个，所有命令累计6046个path+SHA变体。`compile-loads.jsonl`、各命令`compile-index.json`、全局`compile-input-index.json`及CAS保留读/编译时原字节，SHA在008实核。tmp Vitest config正常import根项目、alias/setup，仅加原字节load观察与自有cacheDir，未复制/替换生产owner；types/lint preload只观察readFileSync返回、不改值/错误。`tool-inputs.json`含Node/工具入口/version/config/lock与观察器来源。范围是实际repo transform及同步read观察，不冒称所有异步FS、Node内建、OS库或transitive执行字节都已审计。

本轮第一次尝试调用recorder时，新tmp根遗漏commands父目录，recorder在spawn runner前FileNotFoundError/exit1；记录在 `recorder-setup-failure.json`，只创建本任务commands目录后001才实际执行。该装配失败不算产品红，没有改测试/生产来掩盖。原036的Node wrapper126历史也保持原件，不用它代替本次真实0/1。

### 资源与未验证边界

HOME/USERPROFILE/TMPDIR均在R内隔离，移除NODE_OPTIONS/NODE_PATH/XDG_RUNTIME_DIR；180s外层预算未触发。008实际删除本任务runtime-home/runtime-tmp/vite-cache三个自有根，清理前路径/mode/文件SHA与7个已结算runner PID均absent在 `cleanup-final.json`。测试finally释放原workspace/SpaceService/session/native transport与DOM叶/ForegroundIntent/监听；失败与竞争barrier也在finally释放并等待原pending。保留CAS、日志、primary供Root；不删旧tmp或并行资源。这里没有启动真实helper/Rust/Provider/账号/用户Vault。

REPORT以同目录临时文件、无覆盖原子落盘回读后，才运行validate-dispatch --stage return；实际raw/exit另保存编号命令，本文不预填尚未发生的结果。结构通过不等于整票验收。Root负责main/build/完整消费者、原生CLI/DOM/Chrome和独立复核；不重复未变native pair。真实Obsidian/Provider/OS IME/五平台仍由用户执行。

## 问题与下一步

本分配候选没有已知未完成修复；四条改动源与A14其余路径保持 **SOURCE STOPPED**。Root可读取最终66eefc…清单、原红与实际primary，按本次影响统一构建/消费回归，再冻结完整候选交独立两轴；不改035/036原证据，不据本报告将T09正式标完成。未提交、推送、发布或归档。
