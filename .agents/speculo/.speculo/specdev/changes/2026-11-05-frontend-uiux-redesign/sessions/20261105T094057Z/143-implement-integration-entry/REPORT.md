# T-14 最小组件矩阵汇总入口候选

Session: 20261105T094057Z
Task: 143-implement-integration-entry
Status: candidate-ready
Implementer: native:/root/integration_final（sol medium）；Root 唯一正式写入者。

## 聚焦交接

按 TASK、Map revision 53、Goal、Spec AC-901–903、T-14、DESIGN revision 3 与 UI-002，以及132报告末尾收敛方案实施。已应用 dev/ui/testing 约束。仅形成约定四路径候选，未写正式脚本、产品、产物、状态或 Evidence。没有委派，没有构建、正式858矩阵或真实宿主执行。另一宿主 owner 的路径未修改。

最小影响范围：中央 run.mjs 对 frontend-redesign/T-14 在单票 fixture import/build 前委托 integration/index.mjs；原单票主体留原处，仅将既有 waitFor 放到分支前以保留顶层 export。逐 sample 新增实际 matchMedia pointer/hover 五项结果，计划 pointer 标签保持原语义。原 matrix、adapterCounts、T09 Electron、verify/exercise、断言、startup、Chrome/profile/port0 和 cleanup 不变。测试只增共享 CLI 接缝与 integration 正反例。

冻结完成后停止读写并释放。返回0仅表示本派单候选与回执完成，不表示 T-14、G-FINAL 或项目通过。Root 应用后执行实际 --check、独立审查和正式验收。

## 产物与验证

固定候选根：/tmp/huhu-integration-entry/candidate。脚本均为独立副本（冻结时逐文件 nlink=1）；私有 src 是只读硬链接快照，从未写入或 chmod。其余根条目仅为只读输入定位，未修改共享 inode。新文件仅 integration/index.mjs、integration/integration.test.mjs；原文件仅 run.mjs、run.test.mjs，共四路径，无辅助模块。

汇总入口固定 T-01–T-12 与 T-16 十三项白名单，生产入口映射来自真实 TSX imports，逐一核对实际扩展名与存在性。每项调用原 Node CLI，移除继承 HUHU_CDP_URL，每 child 独立输出并保留真实 stdout/stderr/result，复用原独立 Chrome/profile/port0。默认并发2，仅允许环境变量1/2/3。唯一新运行目录避免读取旧结果。即使 child 失败也等待其余项并汇总错误。

父校验要求实际 child exit0、正确 ticket/suite/matrix/status、errors=[]、精确原66 planned/cases、无 sample.failure、原 assertions 数组、实际媒体值及真实 PNG 文件、生产入口/fixture/driver/runner/样式输入存在、每个输入当前 SHA、inputDigest、共享输入及 ASAR app.css 一致；结束再次检查全部输入（含入口自身起始 SHA）以发现后续漂移。T11 原 driver 直接执行 Node assert，但其 sample.assertions 本来为 []，因此保留数组且不擅自要求非空。完整正式汇总为858条 child case 定位；不生成汇总截图，不把计划 fine 冒充实际 fine。受控服务与 iframe 明确不证明原生系统边界。

--check 原样透传至每 child，只接受 preflight 且实际 cases0；不能接受 passed 或计作 E2E。result 保留各 child 当前 source 图、输入摘要、实际媒体、子结果路径与全部错误。

实际验证（均在私有候选运行）：

- node --test /tmp/huhu-integration-entry/candidate/scripts/ui-review/fixtures/frontend-redesign/integration/integration.test.mjs：退出0，13/13；覆盖固定票清单、并发上限/非法值、失败保留、entry missing、child missing/failed、矩阵缺失/漂移、sample failure/media/断言缺失、styles/driver/ASAR 当前SHA漂移、共享不一致、digest篡改、check不通过E2E、PNG缺失/路径、实际子进程参数/CDP隔离/退出码/防旧输出，以及实际ASAR解析。
- node --test --test-name-pattern='redesign T14 delegates|rejects unknown|rejects fixture path|suite and matrix names' /tmp/huhu-integration-entry/candidate/scripts/ui-review/run.test.mjs：退出0，4/4，无编译；验证中央委托及旧参数/suite隔离。
- node --check /tmp/huhu-integration-entry/candidate/scripts/ui-review/run.mjs：退出0。
- 生产映射所有实际路径存在：只读核对通过。

冻结清单独占创建且不覆盖：/tmp/huhu-integration-entry/ready.patch、/tmp/huhu-integration-entry/manifest.json；后者含四路径 before/after SHA256、mode、候选定位。patch SHA256：da072300353bbb8444a7238256644882f4818b289b2816f340fef329ff69a8a7。冻结时正式源 SHA 与 before.json 完全一致，原已有 staged/unstaged 修改未覆盖；两新增文件此前不存在。全部候选模式保持0o664。

## 问题与下一步

Root 全仓 Vitest 运行期间明确要求不启动13子 esbuild 预检，随后要求先冻结交付，实际 T14 --check 由 Root 应用后独立执行。因此本轮未运行全 run.test.mjs（其中旧 T01 --check 会编译）、T14 完整 --check、858、插件构建或真实宿主；不把纯Node样本当生产矩阵通过。Root 需核对 manifest/before SHA 与 patch 再应用四路径，按实际 --check 和独立审查结果处理；正式E2E仍由 Root 在同构建冻结后持有。

没有发现需扩大写集的产品问题。保留正式 owner 的独立高审和验收，不推进任何 Ticket/Map/Goal。return 0，停止读写。
