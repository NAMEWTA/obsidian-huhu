# T-05 实施方向与交接门

Root在GP-018/Map19、T04代码交付与G01代码关闭后采用以下工程路线。它补充原Ticket，不改变Spec/设计/用户Space决定。四份proposal为研究原件；本文件选择其语义和边界，真实跨owner签名与数值仍由生产源码冻结回执拥有。

## 选择与不变量

1. Route C：保留xterm/headless6.0.0为唯一原始字节解析器，visible xterm保留交互和渲染。集中source/target adapter导出/导入已经解析的双buffer格子、基础与extended属性、OSC8来源、必要input/display状态及去重effect；私有访问不得扩散，不共享源可变对象，不让目标接续raw。原Serialize接口可为旧测试/诊断短期保留，但退出生产展示路径，不用其冒充完整parser快照。
2. 每runtime单模型事务覆盖原始UTF-8、local提示、resize、reset/clear/scrollback、snapshot和exit的解析顺序。model callback ACK必须捕获原port/sid/bytes，只在实际解析后，不等待view、OS write/resize或其他调用者。此前原始output与最后local提示完成后再向对应observer交付exit；T04最后native notice/provenance/checkpoint/lease drain顺序不可回退。监听器抛错与慢view不得阻断权威解析或其他owner。
3. 连续水位绑定runtime；snapshot与其后的journal无缝，observer只有限引用和in-flight，超限仅丢可重建帧后resync。普通输出用增量，不每帧整屏reset/replay；结构语义来自真实Buffer/CircularList事件/操作或明确replacement，不能猜LCP/LCS冒充marker移动。read分页绑定稳定snapshot/位置/expiry，超长cell/row也受byte限额，过期明确重取。
4. 唯一view尺寸lease：注册/可见/fit不抢owner，明确有效focus才转移；隐藏/卸载/失去资格撤销晚fit，无owner保留最后grid。所有display按权威帧geometry调整，followerview不向native反向resize。模型requested与nativeapplied/none/unknown/superseded分开，不等OS完成才解析CPR。
5. C拥有相关整笔输入准入：protocol3 +可选inputAdmission1，input-part候选kind4、parser-reply候选kind5；C先在统一TS/Rustfixture落下严格类型/codec与能力上限，Root核读后A消费。begin全量预留bytes/FIFO/结果槽→完整parts+commit→queued→started/written。取消与claim同一同步点，partial/丢回复unknown且不重发。Node.write(false)已交出该frame，只暂停下一帧；byte账本含pending/in-flight/encoded copies。resize与input同FIFO，只合并连续尾部resize。reply单独有界保留，保留单OS writer，不承诺抢占已阻塞系统write。
6. 全helper单公平有界outbox，PTY output遵守credit及每SID output→drained/truncated→numeric exit屏障，root notice可早发。控制/stop/ACK/取消/结果槽有预留，内存和worker准入在producer构造大结果之前。Cookie/history成功仍返回完整既有shape；超预算准确失败，不静默截断或换成screen答案。物理pipe整体停读仍仅承诺有界+准确unknown，不虚构响应保证。
7. 原手工input/paste可保留void wrapper，必须观察结果并以合并诊断可见；旧helper强submit先none/unsupported，手工legacy一次frame best-effort不得标queued/written。不为新能力重启仍被Browser持有的helper。prompt-runner与AgentRuntime两处paste+CR改一笔；Controller.typeWhenReady只将not-ready映射原就绪提示，容量/未知准确分类，不改业务成功、native全文、invocation、取消、账号或T14配置。

## 采用有界值的门

先K03实际当前版本复现，再给有限profile并实测、公开值；不是先选未经测量的性能承诺。计数包括normal/alt typed arrays真实allocation、combining/extended/OSC8+markers、注册的parser handlers retained units、decoder/write/pendingraw、snapshot/journal/clone/observer/readtokens及native输入/输出/请求/worker。运行模型与展示帧限额分开，不能只限制队列却称全部内存有界。每runtime与TerminalSessions/共享helper聚合准入在真正分配/发副作用前完成。

模型资源超限必须明确错误并沿T04捕获身份收束；不剪掉combining/OSC/原始bytes、重置parser或提前ACK伪装完整。每小批解析前预留最坏增长与已准入credit/有限cleanup reserve，解析后核实际计数；不能证明的单批或保留对象上界及时报Root。逻辑payload上界与V8/RSS实测分别报告。native/closed模型slot需真实释放，不通过抛constructor错误遗留已启动PTY；当前模型构造本就先于spawn，沿此顺序保持。

## 实际先后

- K03测试阶段A，仅已派两测试路径。区分外部强制缺行stand-in与本项目自然入口，未证问题不先改引擎/升级。
- K03结果Root验收后：A实现纯screen DTO/shape+source接口并先交实际API回执；C实现唯一wire fixture/TS接口并先交实际API回执，两者不交叉写。其他内部实现可按已派路径推进，但公开接缝变更先协调。
- Root核实际源后才解锁B visibleadapter/接线。链接临时buffer context只允许集中同步try/finally且无外部事件的固定版本行为验证；若不成立，报最小缺口，不能直接patch依赖或复制engine。
- Root在K03结果与固定版本adapter方向确认后可精确pin现有xterm6.0.0/search0.16.0；不默认升级或改其他依赖。cargo/target唯一C；A/B真实helper使用C交出的immutable副本；Root产物与全局检查独占串行。
- 原始red测试修订执行前保存实际source字节、command、UTC、exit和raw；失败不改写。SOURCE STOPPED后统一build/lint/受影响真实组合/压力与预算归因，独立Astra/high完整双轴审查。用户真实Obsidian/Provider/五平台E2E仍待用户，生产Chrome/nativefixture不得冒充实机。

## 交付所需压力与交互证据

多字节与半CSI/OSC/DCS任意join/resize/reset；双buffer、margin/charset/savedcursor后续输出；真实headless+两个visiblexterm的链接/extended/Search/selection/IME/mouse/focus/2026，本地timeout同token不重启；单尺寸owner与晚fit；慢observer独立resync，第二终端stop/resize仍完成；整笔长prompt+CR被拒时0写、cancel/unknown不重发；false/drain只发送一次、reply满user独立、resize顺序；真实PTY固定机器/工作量/速率、各队列/模型峰值、控制时延与自身进程清理。适用失败边界单独准确记录。
