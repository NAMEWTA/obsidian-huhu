# T-17 cli-delivery：只读预检

2026-10-25；`/root/prepare_t02`，6.1-sol/xhigh。Root 声明 current workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`、branch `NAMEWTA/terminal`、base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；未运行 Git。按 workspace→catalog 定位 SpecDev，本次只读发现/准备，不启动 I/Delivery/Goal；复用已读未变 dev（architecture/testing/licensing）及 ui 规则，新增回读 build-and-release。回读 GP014/Map15、T17/T18、Spec §3.5/3.9/3.10/5/§11、公共合同、LOG027/030、Goal Gate05/06、reference-notes 和 T07预检。T03修复已停源，Root正在集成；本文不对其候选作审查或冻结结论。

**结论：现有 helper 发布/下载/校验链可扩展到同批 CLI，但当前没有 huhu CLI、配套产品 Skill、CLI help/schema 或新验收脚本。T17 必须接收 T07 最终 schema 与 T09–16 全部真实用例，不能在交付票重新实现 gateway/业务 owner。当前最明确缺写集是 `.github/workflows/release.yml`，以及实际共享 native 文案/能力握手与随插件打包 Skill 资源的精确接线。**

## 1. 当前真实发行链

- Cargo package `huhu-pty`、version `0.0.1`、publish=false，只有显式 bin `huhu-pty → src/main.rs`；`src/bin/huhu.rs` 不存在。正常依赖 portable-pty0.9、serde/serde_json、rusqlite0.32(bundled)，Unix libc，Windows windows-sys0.60相关feature；不在预检调用cargo metadata或升级依赖。
- terminal-build.yml 五个**原生 runner 配置**在同 github.sha 执行 cargo test/build --locked --target，Node24执行 verify-pty-helper，然后只拷贝 helper+`.sha256`。配置不是本次运行/成功证据，runner标签可用性未外查。
- release.yml 同SHA checkout；needs checks+terminal 且两者success才进入release，无continue-on-error。lint.yml矩阵Linux Node22/24+Windows Node24，包含frozen install/build/产物diff/bundle/lint/CSS/test:all/notices/native。release再核tag/package/manifest/versions/CHANGELOG、重建、验证插件产物、zip/provenance，下载terminal-*，严格校验五helper，执行packaged Linux helper，生成所有附件SHA256SUMS，最后softprops发布。
- **verify-release-artifacts.mjs 当前严格只接受5 helper+5 checksum，额外CLI资产会失败。** verifyVersions目前核插件版本/兼容entry/CHANGELOG，未核Cargo版本或CLI兼容major。plugin verifier核完整LICENSE/NOTICE banner、无inline sourcemap、main/styles等于候选源码产物；不能移除严格extra-file检查来容纳CLI。
- 本会话没有commit/tag/push/workflow_dispatch/发布权限；T17只准备源码、流程与可核验资产，不能因读到release.yml的发布步骤执行它。版本目前manifest/package/Cargo均0.0.1、minAppVersion1.13.0，未授权升版本。

## 2. 五平台资产与协议边界

| OS/arch | 当前runner / Rust target | 当前helper资产 | 未来CLI资产（T07冻结后核对） |
|---|---|---|---|
| Linux x64 | ubuntu-22.04 / x86_64-unknown-linux-gnu | huhu-pty-linux-x64 | 建议 huhu-linux-x64 |
| Linux arm64 | ubuntu-24.04-arm / aarch64-unknown-linux-gnu | huhu-pty-linux-arm64 | 建议 huhu-linux-arm64 |
| macOS x64 | macos-15-intel / x86_64-apple-darwin | huhu-pty-darwin-x64 | 建议 huhu-darwin-x64 |
| macOS arm64 | macos-15 / aarch64-apple-darwin | huhu-pty-darwin-arm64 | 建议 huhu-darwin-arm64 |
| Windows x64 | windows-latest / x86_64-pc-windows-msvc | huhu-pty-win32-x64.exe | 建议 huhu-win32-x64.exe |

CLI候选命名来自T07预检，**不是已发行资产名**。每个二进制各自摘要，严格枚举预期十个binary与十个checksum，未知/重复/缺失/空资产拒绝；各自runner执行自己的helper/CLI黑盒，不能在Linux直接执行其他架构文件并据编译声称可运行。保留五个旧helper稳定名、terminal-*收集关系和插件三个安装资产，不另起桌面应用/daemon。

当前 **stdio HELPER_PROTOCOL=3**（shared/native/frames 与 Rust main，verify脚本也写3），计划对外control **major1** 是另一层。PtyHelper.start先spawn已校验helper→hello→核accepted/protocol；helper.version只记录返回值，现有protocol3不意味着支持未来control。T07须交真实capability/兼容握手；T17的表应列插件发布版本、helper版本/内部协议、CLI版本/controlmajor、schema能力。错major或缺control capability在任何业务spawn/input/commit前拒绝，不自动启模块或重试任务。需要诚实区分：**摘要不可信的bytes不启动进程；已验证binary的协议不匹配可能只运行了hello，仍须保证业务副作用为零并回收进程。**不能把两者都写成“从未exec”。

## 3. 下载/离线信任链与最小扩展

实际owner在 `src/host/desktop/native/binary.ts`；Agent pty/binary.ts只是T01兼容re-export。assetName只允许五组合；ensureHelper按物理root/device/target/version序列化，库内 `.huhu/helpers/<device>/<target>/<version>/`，不覆盖旧运行版本。下载采用Obsidian requestUrl、受限大小/超时、正式Release同version摘要、wx临时文件校验后rename；development override复制入库，不直接从任意外部路径执行。protectedReceipt绑定dir/name/version/digest/source，离线只认可受保护回执且现存bytes重新hash；手写同hash stamp、旧legacy stamp不授权执行。

CLI安装宜复用同一可信下载/本机发布机制，按**asset role/name**隔离receipt及安装key，不能拿huhu-pty.json或helper cache替CLI背书。保持offline无网络、已验证匹配asset可重用、未知platform拒绝、旧版本同时存在、取消/并发失败保留前一有效文件。T07确定CLI的定位/环境提示以后再接path；不修改用户全局PATH、不自动向账号技能目录写文件，不把环境变量当跨Vault身份认证。

现有binary.test已覆盖自写receipt/污染bytes、五asset名、legacy正式hash、独立version路径、在线后离线、hand-placed需正式digest、checksum缺失/不符、offline、失败重试；binary-download.test覆盖HTTP/network/deadline/redirect凭据不泄露，native/runtime.test覆盖共享en/zh反馈。T17新增CLI同类夹具、mixed pair与并发，保留helper原风险。安装测试用真实临时FS+fetch/receipt seam，exec/spawn spy断言坏bytes绝不进入执行；不要整个installer mock成成功。

## 4. help/schema/产品Skill与来源

- 等T07单源描述、T09/10/11/12扩展冻结后，CLI parser/help/schema、能力列表、TS/Rust wire、文档/Skill 示例从同源生成或逐字段契约比较。当前 `docs/agent-workbench-cli.md` 及新CLI都不存在，不能把implementation-contracts的计划拼写当已运行命令。
- 示例覆盖发现/明确Space/Session/runtime、后台创建与attach、同Vault跨Space、input/wait/read、pane操作、mailbox read≠ack、history显式resume/import。stdin/file长正文传字面内容；输出stdout完整JSON、日志stderr、effect/phase/稳定code/退出码对应合同，不靠中文文本解析。超时取消只结束wait，unknown先query，输入提交不等于模型成功，blocked由人在TUI处理，Skill不得自动批准权限。
- LOG030：所有新运行有明确Space；旧入口先选择，无绑定后台失败；不能从cwd/当前焦点/唯一候选默补。旧invocation/receipt/原生答案不改写或重放。产品Skill触发仅“明确操作HUHU终端/目标”，普通写代码/聊天不触发；不把repo开发用AGENTS/SpecDev Skill当产品资源。
- SkillManager目前只管理真实目录中发现的Skill；refresh才scan，toggle只显式copy，保留来源hash/owned marker，手放目录/链接不可覆盖删除。尚无内嵌HUHU Skill源。可在已授权core/control目录放拟新增 `skills/huhu/SKILL.md` 静态资源，用现有.md文本loader随插件打包，再经受控安装动作/临时已验证source接现有copy语义；具体API由实际T07产物与实施决定，不为预检造第二Skill manager。资源路径、触发说明、完整示例、copy/update/禁用负例需共同测试，加载插件或启用Agent不安装。
- 许可：现有NOTICE含Orca等改编映射，third-party-notices从真实esbuild输入+CSS/fonts+Cargo普通/build依赖图（含各target、排dev）生成全文；license-texts拒未知/限制性分支、缺全文/附加notice、未固定source commit/hash。增加第二bin后要把Rust声明说明扩为helper+CLI的实际依赖覆盖；同package共图可复用但不能仍声称只覆盖helper而漏CLI特有路径。新crate在引入当票就核验/生成，不等到T17补救。
- 复用reference-notes既定R01 Herdr/R02 Wave（Apache-2.0）、tmux ISC、xterm MIT、portable-pty MIT与K07逐文件边界，只借机制；不得读/移植GPL终端vendor。实际改编才保留头/commit/NOTICE/映射，不为只借公开行为添虚假copyright。similarity是线索，不能用无超阈值当完整许可证明。本轮无新陌生设计/依赖，未外查，不冒称重新核验远端状态。

## 5. 精确写集缺口

1. **`.github/workflows/release.yml`**：T17没有此路径；实际合并资产/packaged CLI smoke/完整校验/附件发布列表在这里。至少正式派单前补入，否则只改terminal-build不能闭合发布输入。现有test/release/workflow-gates.test.ts在已准test/release/**内，可扩大同SHA/双bin/不skip门禁断言。
2. **`src/shared/i18n/lazy/native.ts`、必要 `src/host/desktop/native/runtime.ts` / `runtime.test.ts`**：共享安装反馈真正owner，T17的agent/i18n与host binary*.ts不覆盖runtime。新增CLI通用安装提示若复用旧key不能混淆角色；需要新key时这里是精确路径，不为文案激活Agent。
3. **真实握手/源schema文件**：若T07最终需要改PtyHelper/version能力接线，host/helper.ts/helper.test.ts、shared/native/frames.ts及最终control生成源/产物不在当前T17全写集；应先按实际交付补精确文件，不自行扩大整个native/shared。当前T17 `native/src/bin/huhu.rs` 不覆盖T07未来src/lib.rs/control子模块，发行修复若碰到它们也需补。
4. **产品Skill资源与加载入口**：core/control/**可容纳上述拟资源；若最终选择别处如bundled资源目录，精确追加。SkillManager/desktop skills路径已准；若纯registry类型或module/app注入必须变，`core/skills/library.ts`/`registry.ts`、agent/module.ts或app/native.ts当前并未普遍获准，不能以整个服务glob替代。CLI安装单纯位于已准desktop/control可闭合时不扩写。
5. **可独立CLI验证脚本**：当前只准verify-pty-helper。可把双binary验证保持在该脚本+参数内，若另拆拟 `scripts/verify-huhu-cli.mjs` 和契约fixture，先补精确路径。package/lock已准不等于必须新增依赖或改版本；manifest/versions/CHANGELOG未获升版授权，保持现状并以临时release fixture测试。

## 6. Root可独立执行的未来检查与拒绝矩阵（本轮未执行）

源码全部停写且固定后，Root串行重建CSS/插件、跑build/full lint/CSS/architecture/i18n/docs/styles/bundle/notices/native与适用Vitest；完整入口以package/testing为准，test:all会枚举所有test:*且可能重复部分Vitest/使用Chrome等环境，先记实际skip。可在一次性目录运行release verifier的fixture、五资产集合负例、当前本机helper/CLI实进程及同源schema/help/Skill黑盒；不能仅跑help宣称完整业务通过。非本机runner仅配置核验，未经授权不触发远程workflow/发布。

| 负例/兼容 | 必须观测 |
|---|---|
| checksum缺失/非法/错bytes/伪造receipt/污染离线file/跨role stamp | installer拒绝，exec0，原有效bytes保留，offline fetch0；正式digest匹配才可adopt。 |
| unsupported OS/arch/version、额外/遗漏/重复/空asset | 不猜或降级到其他平台，不fetch未知名；release集合严格拒绝，不忽略CLI文件。 |
| verified旧helper只支持stdio3，CLI/controlmajor错、schema能力缺 | hello后拒绝具体PROTOCOL_MISMATCH/CAPABILITY_UNAVAILABLE，业务spawn/input/commit0，进程/lease/pending正确释放；不重复请求。 |
| 同时安装/下载中断/覆盖失败/旧运行升级 | 一个明确结果、临时文件与receipt准确，旧版本不被替换，重试不授权坏bytes；finally清理并await child exit。 |
| CLI stdout/stderr/exit/长中文/字面shell字符 | JSON完整、稳定code/effect/phase/target与退出码对应；prompt在stdin不被shell展开/泄漏，超限拒绝。 |
| Skill自动扫描/安装/更新/取消、手放同名目录 | 只有明确动作落副本，mark/hash正确，用户目录不覆盖，普通对话不触发；所有示例在真实CLI+受控生产用例fixture上执行，Provider/宿主交用户。 |

T17主责AC019/062/064；五平台实机与最终64AC汇总归T18，不提前补写为通过。70份时点输入见 `/tmp/huhu-t17-source-observation.json`，SHA256 `892caaba26c79eb5250be8187207eacf790db30f7426257052ee1aaf2f111709`。后续T07实现、T13–16 owner/schema、Cargo/deps/CI、生成物或Skill内容改变后重审影响闭包；此次hash不代表冻结候选。

只写本报告与observation JSON；未改仓库/正式工件/生成物/依赖/Git，未运行tests/build/lint/cargo/native/helper/provider/宿主进程、未下载/发布、未创建Goal、未派Agent。**READ-ONLY STOPPED（T-17）**。
