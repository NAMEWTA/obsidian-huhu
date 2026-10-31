# 任务回报

Session: 20261026T045732Z  
Task: 034-t11-engineering-plan  
Status: completed

## 聚焦交接

只读 T11 工程计划候选已完成，未激活 T11、未写产品或正式状态、未执行两轴审查或宣称任何 AC 通过。唯一正式接收 owner 为 Root。034 TASK 的“AC025–028”为 Root 已通过原生消息确认的编号笔误；实际按冻结 Spec §3.7、T11 AC-033–036 及本票 PAGE-002/AC-061，T12 AC-037–040 仅作下游接缝，不改原 TASK 字节。

候选沿原 NativeHistory/agent_data/JsonStore/SQLite，不新增 daemon 或业务数据库：完整 source identity 与 sourceVersion 分开；HUHU 精确绑定 → verified realVault cwd → 单一精确来源 grant；六 Provider 保留原正常格式，在有界 metadata gate 后才进入原正文 consumer。单 NativeHistory facts writer/facade+subscription 替代两个同文件标注缓存实例；分页选择有版本门的 offset，按需预览、epoch/消费者计数、完整 CLI envelope 预算。仅开放 history.list/preview，open/resume/import 留 T12。

两个额外工程接缝不能遗漏：分页后 WorkspaceUsageStore 不能 aggregate 当前加载页，必须走同一准入索引的有 coverage 聚合；原 generic CLI 已支持 --space→target.spaceId，Space筛选优先消费可选target，不机械改parser或新增同义params。controller、commands、schema/generated、usage以及新事实/缓存名称均需 Root 正式补精确写集，不能用旧 T11 glob 直接开写。

## 产物与验证

新证据根 R=`/tmp/huhu-t11-engineering-plan-7ulykmax`。主要产物：

- `R/ENGINEERING-CONTRACT.md`，SHA256 `1a8378c840497b32dd66b3cfa5622407009572c5b3eb10cf49cbb81bd96d574b`：完整 tuple/版本、每 Provider 最小 metadata/正文停止点、安全打开与 TOCTOU、原事实与 cache 分工、阶段 API、分页/缓存/取消及 CLI/UI 约束与取舍。
- `R/owner-paths.json`，SHA256 `8a5edd7df19ff40ce4dc13923e0b522cb9786ab60eabc5828c31485f518eb987`：33 个精确候选路径，A/B/C与Root唯一writer分组；条件路径明确不属默认写集；未分派实际实施者。
- `R/VERIFICATION-MATRIX.md`，SHA256 `c5fef580e3db3ab8a1e13488d02d0a7ca67457c2126fd6e952808780f7affc46`：对原owner、六真实parser、源打开、事实持久化/恢复、分页/epoch/共享取消、usage与CLI/UI的可证伪 normal/failure/recovery 序列；所有未来生产验证均标未执行。

输入与来源：

- 冻结 TASK SHA256 `7a5ae8ebf2244892082ad0bdb8b0a2824e1f7851a6ea152da337e13f47961932`；`R/inputs.json`原字节SHA256 `b5006e5cf1f300742c52c135c8d0e381e0c238e4ad10cd27e8b4047a54bbf6ee`。
- 024 source-manifest-final 原字节SHA256 `0ec922ffe853bf0e67f4ae26ea7a101c7c0c82084a104090f45736a0f3d7d0f9`，复制为`R/source-manifest-reused.json`；7个固定输入与其67项snapshot在开始/结束核验原字节摘要，mismatches=[]。只核冻结字节，不宣称当前并行工作副本无漂移或所有源码内容通读。
- Spec SHA256 `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618`；T11 `a81eadf21ca3c4cab2df82584ab5280274377b980368c9a35f34f51efc52de39`；T12 `520717316d3f910519322e15f49e8a40302278a0e8fc8c9e5924fe1ff4162285`；024 REPORT `d34756553fab33ef2173f3469cb3da161ec766b92f7e10b522a40ba5d55c639e`；Root accepted audit `c1ea4f2be6a76627851bbc72cfff950c152bcdaa943cc633564dc767bff58bf1`。其它输入全摘要见inputs。
- 仅补读 generator/协议fixture及测试、Cargo已有依赖、host路径检查与validator闭包，先保存实际path/原字节SHA再读，见`R/new-observation-manifest.json`。Cargo已有libc/windows-sys FileSystem，未添加依赖；host absoluteHuhuPath仍不能证明同句柄安全。规则读取及相关源码范围分别见rules-manifest/content-read-ledger。采用024已接受原活动/许可/依赖证据，不重新联网或声称最新API/Issue核验。

实际独立probe：`R/envelope-probe-003.receipt.json`保存argv/cwd/UTC/真实exit=0/raw/script SHA和消费的两份冻结生产codec源码。经已有TypeScript 5.8.3单文件转译，仅在本R输出执行：ascii data49103/完整49276B、中文49003/49176B、control转义49063/49236B均在完整envelope被CAPACITY_EXCEEDED；完整49152B可计数，+1B被拒。原raw为`R/envelope-probe-003.raw.log`，runtime字节身份见probe-runtime.json。它只验证原生产counter，未测试未来history handler、native parser、CLI进程或任何AC。001/002两次Node内置TS擦除失败均真实exit126，原script/raw/receipt保留，没有改写失败；003换为已有纯JS转译器后成功。没有运行插件/native全仓构建或新测试。

本REPORT原子落盘后实际运行 validate-dispatch --stage return；完整原始输出/退出码/validator与TASK/REPORT字节摘要由`R/return.receipt.json`和`R/return.raw.log`保存。此处不提前填该退出码；Root应回读真实回执。结构检查也不代表工程候选或AC被接受。

## 问题与下一步

Root等T09/T10最终接口稳定后，按候选第9节重核最小闭包与实际SHA：controller/records/runtime、最终UI容器、commands/router/paging/errors/cancel、schema/generated、history lease/connection、usage和既有query消费者。候选依然基于024冻结旧接口，不能当作届时最终DoR。新facts文件与cache精确名称、授权投影同步门以及同句柄安全打开属于可审阅工程选择；正式owner需接受路径再派遣。SQLite DB/sidecar的OS/VFS安全打开尤其需要真实平台证明，不能用lstat后重开假装完成，也不能默认移除OpenCode正常支持面。

建议验证必须击中原NativeHistory+实际JsonStore和六Provider原parser，观察未准入正文打开/索引写入、坏源局部降级、cache重建后标注保留、版本失效和生产CLI整外壳。用户仍负责真实Obsidian/Provider/OS IME/五平台验收；Root负责最终代码与生成资产验收及独立审查。本轮未实施、未读取账号/原生历史正文/Vault用户数据；未创建PTY/helper/Provider、监听器或服务，无运行资源待清理；不提交、推送、发布、迁移或归档。

SOURCE READ ONLY。
