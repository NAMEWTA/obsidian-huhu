# T06 Hook 资源 profile 建议（只读，非冻结/验收）

推荐采用**同一 Hook owner 的分级有限池 + 有积压时连续有界轮转**。此前交流的“每 scope 两槽、全局四通用槽、300ms 只读一份”被本报告替代：它虽有限，但正常 Start→Prompt→Tool 突发也容易拒绝。以下数字是待实施、可证伪的建议，不是当前源码已有约束，也不是 API/预算冻结。

当前 Controller 和 AgentRuntime 各构造一个 AutomationHooks（controller.ts:169、agent-runtime.ts:123）。新额度必须由同一实现内的共享 pool 统筹，不能给两个实例各发一份“全局”额度，更不能每次 prepare 重建额度。本文不新增 runtime/业务 manager；Token、配额和临时 spool 仍由 AutomationHooks 生命周期拥有。

## 1. 具体建议值与整体边界

| 项目 | 推荐值 | 计算/语义 |
|---|---:|---|
| S：同一物理 Vault/device pool 的 scope 总数 | 32 | 包括 preparing、live、closing、未清完 orphan；需自行强制，不借 native 的32 SID宣称已实现 |
| 每 scope 的在途 ingress ticket | 1 | 等待采集或正在采集；取得额度前不积累 stdin；额外并发准确容量失败 |
| C：全 pool 同时 stdin collector | 4 | 每个先取得原子额度，才允许收集旧 I=16MiB；等待 ticket 仅常数元数据 |
| 小 publication | Nsmall=8/scope；Gsmall=128/pool | Esmall=64KiB，按实际编码量分级；不能只按事件名猜大小 |
| 大 publication | Nlarge=2/scope；Glarge=4/pool | Elarge=16MiB+64KiB=16,842,752B；专供完整答案/实际大 metadata，普通小活动不能占其保留额度 |
| reader batch B | 每 round 最多16份小 + 1份大；仅1个读/parse在途 | round 后让出事件循环；有积压则下一 task 继续，不再等300ms |
| 活动摘要 | 8KiB UTF-8 JSON总额 | 超量拒摘要/unknown，不截断身份后采纳；与原完整事件分路 |
| D：无真实序号来源的 delivery 去重 | 4,096条/scope；总131,072条 | 不遗忘 LRU 后重认旧 Stop；达到上限则活动来源 unknown/capacity |
| source registrations | 8/scope；总256 | 采纳 A 的候选；包含拒绝重择/关闭待回收，不能靠来回切源绕过额度 |
| 真来源的 reorder window | 8份有限摘要/source | 每份≤8KiB；总≤32×8×8×8KiB=16MiB；缺段/超界 unknown |
| activity listeners | 32/Session | A 所有；共享同一 immutable snapshot，不给每 listener 复制完整 payload |

一次最多32个已准入 Hook scope，并不等于“最多32个外部 Hook 子进程”。Provider 自己能并发启动调用；未获得 ticket/collector 的调用只能有界等待或流式排空后准确失败，不能收集16MiB，也不在 HUHU 再挂无限 Promise/数组。这个 profile 不声称限制用户 OS 里的任意外部进程数。

**总量。**已发布/待发布正文（含 pending/consuming/删不掉的 tombstone）最多 `128×64KiB + 4×Elarge = 72.25MiB`；大类为64.25MiB、小类8MiB。每个正文只落一份，pending→ready→consumed 用 rename，不 copy。固定 claim/reference/fault 元数据另设全 pool≤256KiB；scope 元数据≤2KiB/份，publication claim/reference各≤512B/份，fault≤512B/scope，ingress ticket≤256B/份，collector claim≤512B/份，达到总额拒准入。此数是逻辑占用，未计文件系统块/日志/缓存；不是已测磁盘占用或 RSS。

三个正常短事件 × 32 scopes = 96份小事件，小池128、每scope8可以容纳这次突发。reader发现积压后最多6个小 round便可读完96份，而不是96×300ms。它仍不承诺无限吞吐：32 scopes各8份同时积压会超过128，超出必须可观察容量错误/unknown。大池隔离保证“小事件池已满”不会单独耗尽完整答案的四个保留位；如果四份大答案/collector 都被挂住，也只能有界失败，不能声称无限保存任意同时完成的答案。

## 2. 原子跨进程协议与 crash/pending

建议在现有 system runtime 根下使用**固定、跨 prepare/重启不随意换名绕额度**的 `runtime/hooks/resource-v1`；同物理 Vault/device 的两个 AutomationHooks 实例及子进程共用。实际根从 accounts 的 owned-directory 接缝解析，logical Vault别名不能创造第二套物理额度。

1. pool 有固定32个 scope位、4个 collector位、128个 small位、4个 large位；通过 exclusive mkdir/open(wx)取得某一固定位置，不是先数目录再写。每次 claim 带不可复用 nonce、scope token关联和固定大小记录。进程间同时竞争最后一位只能有一个成功。
2. scope先取得自己的 ingress ticket；collector未取到时暂停 stdin，不积累用户 payload，仍受原3s总 Hook deadline约束。四个 collector先取位再收集，逐块计算 UTF-8 bytes，超过旧16MiB即准确 HookError。所有等待/容量拒绝共享该deadline，不每次重试延长。不可获得额度的调用可流式排空 stdin并输出原 `{}`，不产生批准/续跑决定。
3. eventData白名单生成后，以不构造完整 JSON字符串的有界扫描计算实际转义字节，再取对应 scope+global publication位；先固定顺序、失败回滚自己已取得的位，不能形成互持等待。小实际值才走small；大metadata走large，不能截成small或悄悄更改原 NativeHookEvent shape。collector在最终编码/文件写入结束、HUHU大引用已释放后才能归还。
4. 正文写在带本次 nonce 的专属子路径，大小≤E，完成后同目录原子 rename为ready，再发布常数大小reference。读方只消费原scope/token/claim nonce一致的reference；旧进程的旧nonce路径不会指向复用后的新位。读方使用实际打开的文件限读E+1，核文件形态/路径后校验；`lstat≤E`后无界readFile不算通过。当前guard同样要反复检查实际根/所属scope，不跟随旧路径兜底。
5. reader先把该 publication原子改为consuming/consumed，记其本次投递已开始，再分别调用旧raw consumer与新摘要consumer。两个consumer各自隔离错误；一个抛错不能阻止另一个。callback失败不自动重播可能已有副作用的raw答案；报告准确错误，不能转成功/idle。此fence保证的是**同一次物理publication不重读重投**，不是无条件的全局业务 exactly-once。
6. 消费后依次删除正文/reference并返还对应 claim。unlink失败就保留同一nonce的consumed/tombstone及原额度，后续只清理、不再回调；连续3个轮转清理失败即发布清理诊断/unknown，之后每个空闲poll最多重试1份直到close收集，不能无限产生新tombstone。未删掉正文前不返还global位。fault标记是每scope一个固定512B位置，不随错误次数增长；满池也能读到overflow/fault。
7. `.pending`、半成品、崩溃后claim一律仍计原位。只有持有本次nonce的owner能清理自己的部分成功，正常close立即撤callback后await实际自有清理。**不按PID存在、mtime或超时抢走未知owner的位，不新建随机pool绕过旧位。**父宿主崩溃留下的孤儿可能导致后续capacity/unknown；这是一项明确可用性限制。没有可靠旧owner终结证据时不自动回收；后续恢复/显式清理必须单独有安全授权/证据。本提案不借此新增锁服务、权限或daemon。

如果实际工程无法让多个实例共用上述固定物理pool，或不能给准备失败/close保留资源归属，这些数字就不能称“整体上限”；应在准入时回报缺口，不能只在内存Map里各自计数。

## 3. 旧完整答案、stdin和新分配分账

旧语义保留：`MAX_ANSWER_BYTES=2MiB`按**答案原文 UTF-8**判断；原生全文、nativeSessionId/transcript引用、receipt/cancel仍走原NativeHookEvent/agent-runtime。2MiB的控制字符答案在JSON中可膨胀到12MiB，因此不能用“2MiB答案+8KiB摘要”当spool E。Elarge取旧16MiB stdin envelope级别再加64KiB外层元数据，保留当前输入中合法的完整事件；Pi/OpenCode生成的2MiB原文及受限metadata也应落入此界。异常 `huhu_answer_error` 当前可来自任意字符串，不能只按短枚举估算：真实编码总额超过E时准确失败，不先造出超额完整JSON。

8KiB活动摘要只保存有限白名单：建议sourceInstance/adapterRevision≤128 UTF-8 B、delivery/binding≤256B、event≤128B、title≤512B、nativeSessionId≤1024B、transcriptPath≤4096B，且合计编码8KiB优先。新producer正常delivery/source UUID可固定36 ASCII B。原旧字段8192字符等范围不因新摘要子上限被截断；摘要超限只让新活动来源unknown/拒整摘要，**已经合法且取得publication位的原完整答案原样交给旧consumer**。容量不足必须给原consumer/运行明确错误或不确定结果，不能静默丢答案、截断后报成功，也不能自动重放模型请求。

| 阶段 | 有限账本 | 不能混算/虚报的部分 |
|---|---|---|
| command stdin收集 | 4×16MiB=64MiB UTF-8逻辑输入；最坏UTF-16承载可到128MiB | 旧collector若用input+=chunk还有临时字符串复制；建议有限chunk列表后仅一次合并，合并峰值另记，不能把读限当RSS |
| stdin解析/eventData | 仅4个collector持有；解析输入、提取字段/answer与发布编码各自计费 | JSON.parse对象/字符串开销、V8 GC、Provider已持有的原答案属于不同分配；无实测不能给精确RSS结论 |
| publish编码 | 每个collector至多一份已预检≤Elarge的编码结果，最坏4×Elarge=64.25MiB UTF-8逻辑量 | JS编码字符串按最坏UTF-16另计≤128.5MiB；若同时转Buffer再加≤64.25MiB，合计≤192.75MiB承载，尚不含引擎开销；优先避免额外Buffer复制，不冒充已去重 |
| disk待消费 | small8MiB + large64.25MiB，正文只一份 | 是落盘份额，不与publisher内存相互抵消 |
| reader | 全pool只有一个 `E+1` read Buffer；decode字符串/JSON parse结果独立 | 大Buffer约16.063MiB；UTF-16 decode最坏约32.125MiB；DOM/字符串和GC额外，不承诺硬RSS |
| activity摘要/重排/去重 | reorder≤16MiB；D原始UUID字符最多131072×36=4.5MiB | Set/Map对象开销另记；raw全文不放进reorder/history；listener共享同一snapshot |

所以这是**有界逻辑队列/副本准入profile，不是测得的堆/RSS预算**。未来实施需记录真实峰值、证明编码前预检和collector/reader唯一性；如果采用一次性JSON.parse，必须如实记录其引擎放大，不能用E掩盖瞬时分配。原16MiB单次stdin限本身从未等于整个模块内存上限。

D=4096只约束活动摘要接纳的UUID去重；有真实实例/序号者用常数high-water加有限reorder，不为每条永久保留UUID。达到D时活动source fail closed、lastFact保留，不能遗忘后认旧完成。旧raw通道是否继续接纳**新物理publication**由上述consume/nonce fence和原AgentRuntime turn规则承担；它不依赖遗忘D而重读文件。若某实现做不到该fence，D满后必须对旧通道也明确容量失败，不得声称全局exactly-once或默默丢/重放答案。

## 4. 公平调度、Shell root/guard与close

300ms仅是没有已知积压时的发现周期。共享reader轮转scope及大小类：每round最多16small+1large；每个scope最多取1份后移cursor，下一round继续，MAX SID/末scope回绕不能饿死其他scope。有积压就排下一task；不得在一条poll调用里while到目录清空。无大事件时小类照常前进；持续大答案也不能让小活动永远等大池清空。每次只parse一个E，CPU解析不可抢占，不把“下一task”伪装成已证实时限；具体burst延迟在定向fixture实测。

Shell root建议仍从 `accounts.ts` 提取不依赖AgentId的owned system-runtime根。用独立 `HUHU_HOOK_ROOT` 指向本pool的合法根，DIR为捕获scope，TOKEN绑定scope+nonce；guard不依赖伪造账号。只新增ROOT/DIR/TOKEN/NODE，不改HOME/Provider homes/账号/凭据、启动权限或argv；Shell被动发现不install六家配置。明确Agent启动/用户系统Hook设置仍沿旧安装授权；无实际adapter就unknown。Token/根/claim文件不进入A DTO、持久Session或备份业务记录。

prepare入位前/每个await后/poll回调前核signal、slot对象和binding.active；close首个await前撤销再复用同一Promise清理。closing scope、等待unlink及cleanup失败均计S，实际完成前不能换scope继续膨胀。两个AutomationHooks实例共用配额/reader公平性，但各自只能close其捕获scope，不清另一个实例或Vault。

## 5. 可证伪的实施夹具与精确路径

本轮全部未运行。未来至少用真实临时FS/自有child而不是只测Map计数：

- 原子竞争：多个自有发布子进程同时争最后small/large/collector/scope位；各类成功数严格不越界，未取得collector者零累计stdin；跨两个真实AutomationHooks实例合计仍同一pool。单纯模拟Promise并发不能证明跨进程占槽。
- 正常突发：32个scope同时各发Start/Prompt/Tool，完整96份小事件无遗漏/重放，确证连续轮转而非96个300ms；另在小池持续满时发布合法大答案，观测两类及所有scope前进。超过128/8或4/2边界准确容量失败，scope不变idle。
- 字节保全：原文正好2MiB的中文、NUL/转义字符、中文混合答案原样进入真实旧consumer；MAX+1走原answerTooLarge；旧16MiB stdin边界、E/E+1、metadata/error异常长串；8KiB摘要超限但旧合法全文仍完整。编码前超额拒绝，记录所有本服务新分配副本峰值。
- 故障生命周期：取得global但未取得scope位、pending写一半、rename前后、read/E+1、callback抛错、unlink失败3轮、close→晚publish、prepare→abort；保留原占位/nonce而不重投，其他scope仍前进。杀的仅是自有fixture子进程，观察其真实exit；崩溃pending占槽不按mtime/PID回收，连续新prepare不得绕额度。
- 去重：同文件/nonce重读不再进两个consumer；真实source seq倒序/重复/gap/reorder第9份；D第4096/4097份后unknown且不LRU复活旧Stop；raw新publication仍受同slot consume fence与原turn过滤，summary失败不触发原请求重放。
- Shell：无AgentId准备及晚close，ROOT/token/path/nonce错误、旧scope复用、symlink/junction改向均拒绝；环境原HOME/账号保持；spy所有六家install/config写入为零；原账号Agent明确安装/用户命令保留回归。

精确生产候选：`src/modules/agent/platform/desktop/hooks/{automation-hooks,native-extensions,event-payload,spool-guard,system-hooks}.ts`、`src/modules/agent/platform/desktop/agents/accounts.ts`；建议在既有hooks目录新增纯内部 `src/modules/agent/platform/desktop/hooks/hook-spool.ts` 及 `hook-spool.test.ts` 统一publisher生成片段/limits/reader规则，防三份脚本复制漂移，仍同owner而非新服务。既有 `src/modules/agent/platform/desktop/hooks/{automation-hooks,native-extensions,event-payload,system-hooks,remove-status-hooks}.test.ts`、`src/modules/agent/platform/desktop/agents/accounts.test.ts` 覆盖真实组装；现 `hook-entries.ts`/`settings-write.ts`只复用，不默认申请写权。A消费接缝仍是 `src/modules/agent/core/workspace/managed-runtime.ts`、`src/modules/agent/services/terminal/{session,sessions}.ts`、`src/modules/agent/services/controller.ts`。类内共用pool可以不改两处constructor；如旧完整答案生命周期须接await清理，额外精确路径为原owner的 `src/modules/agent/services/agent-runtime.ts` 及就近测试，须Root确认后接线，不在本报告擅自扩写。

不需新增native字段、foreground研究或helper改动。上述分级池和新内部文件必须经Root精确派单后才实施。本轮仅写 `/tmp/huhu-t06-hook-resource-profile.md`；没有运行脚本/测试/安装/Provider/编译，没有更改仓库/正式工件/Git/cargo/target或immutable helper。

READ-ONLY SOURCE STOPPED。
