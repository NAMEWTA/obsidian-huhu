# T07 C — 单源协议与原生CLI/broker

Root后续实际followup_task才开启本任务；准备文件本身不授权写入。用户完整18票与AgentTeam、模型安排见Goal§4，沿原gpt-6.1-sol/xhigh身份；同cwd=/home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。不另建工作区、不递归委派，不提交/推送/发布/归档。真实宿主/Provider/五平台E2E用户负责。

Change=.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。按AGENTS discovery、Map→dev→Ticket07→Goal及I预检回读；GP022/Map23，T06已done。正式evidence/T-07-engineering-packet.md和T-07-write-allocation.json为本票工程输入；唯一写权C27，不改A/B/Root路径。实际派遣前Root生成evidence/T-07-dispatch-input.json，必须核读冻结源与Skill/tool摘要。

先实现单一descriptor/generator、TS/Rust generated、严格raw codec及两端共享正反fixtures，返回可编译实际API（不只是草稿）给Root；Root核验后B才消费。新lane调用方在调用C编码入口前取得对应许可，C纯codec再做完整预检/计量/冻结输出raw body，B只包装kind1帧；旧encodeControl/controlBytes的16/4096不能进入新32/8192lane。JSON原始重复/转义同名type/新旧混合、invalid UTF8、oversize、depth/nodes必须在parse丢信息前检查；合法旧大history/Cookie保留。严格canonical有限子集、确定生成--check，两端命令/错误/exit/limits/env/help同源；后继未注册能力unavailable。

然后在同huhu-pty内新增有界IPC/broker，独立huhu bin只发现/校验/请求/输出，不启动helper/模块、不添daemon/HTTP/store。结合已读interprocess2.4.6与ctrlc研究，安装/锁图前核真实版本、source许可与feature，仅必要依赖，不顺手升级；明确非Tokio/有限instances/私有DACL/Unix身份清理。新deps notices脚本仅必要双bin措辞，由Root生成NOTICE。Cargo目标目录必须独占/tmp路径；不得覆盖共享target供别人取未固定binary。

完整资源、排队、同代注册、取消/close/late settlement与回入合同见正式packet；不能把应用观察取消等同业务未生效/permit回收，不能阻塞stdin/stdout读写循环，保留旧SID/控制/回复/历史份额和raw→exit因果。8connections、16pending及query/stop保留额、forward/final/stage控制池，编码前许可、实际IO结算、socket deadline均需真实反例和资源峰值；数值不是RSS或未经测量的时延保证。externalmajor1/internalprotocol3 localControl1分离，fresh token不泄入env/日志/业务。

Rust control integration必须实际引用两个CARGO_BIN_EXE并执行双bin行为；不能要求Rust CI装pnpm。A Node control-native owns真实CLI→C→B→A生产闭环，B CI前移check:native并传真实两个built路径，测试缺binary明确失败/0skip。暂不可证明的Windows真实ACL/ConPTY/macOS/宿主保持未运行；适用cfg构造/交叉编译不能冒充实机。回归T05 stdio/Outbox/会话树与控制公平；现有风险不删。

每阶段只跑自有定向检查，保留实际命令argv/cwd/UTC/exit/log及真实输入/工具/配置SHA；共享CAS/manifest不重复复制全仓。不能Root全局build/lint/architecture/Promise/notices或改根生成物。实际Node=/home/wta/.volta/tools/image/node/26.11.1/bin/node，wrapper126不得冒称代码红灯。初始真实wire交接/tmp/huhu-t07-c-wire-handoff.md/.json含源码SHA/编译与负例，先通知Root。后续完整/tmp/huhu-t07-c-handoff.md、source.json、checks.json、diff，交固定0555的helper/CLI双binary及来源/实际SHA。SOURCE STOPPED后Root验收并独立Astra/high审查。任何跨owner变更或新路径先报Root，已有用户决定不再问。
