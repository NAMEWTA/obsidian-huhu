# 121 T12 故障注入接缝修复候选

## 交接

仓库源码、产物、state/index 全程只读，仅新增本报告。冻结候选在 /tmp/huhu-theme-fixture-retry/ready-manifest-v2.json：helper-v2.patch、T12-v2.patch、T12-driver-v2.patch；对应 before 原文与 proposed 独立 v2 文件同目录。manifest 保留每项精确 before/after SHA256 与原mode0664。已释放路径不再覆盖；v1 为未交付的中间方案，不得取代 v2。final-integrity-check-v2.json 核对当前工作区仍匹配 before、提案匹配 after，三项均真。

根因事实：117 接入真实 ThemeRuntime 后，UI 的 plugin.theme 与 Runtime 都使用 helper 的同一 ThemeHandle，但 T12 owner.fail() 仍只让旧 owner.store 的 save 失败。真实点击改变了主题，却未让真实主题写入失败；原 main: persistent save failure 断言超时。driver 的旧 owner.store.status 当时也与实际主题写入无关。

沿当前真实调用核对：SettingsPage.tsx 没有读取 plugin.runtime.store 的持久化错误栏；AppearanceSettings.tsx 的 perform() 包裹 plugin.theme.update()，拒绝后显示错误并保留原 action，显式 UI Retry 再 perform(retry)。因此修复注入接缝必须让该真实 update 拒绝，而不能只改 oracle 或隐藏 alert。

v2 使 T12 的 owner.store、appSettings 所属 store、theme/UI/Runtime 都使用 fixtureTheme.store；仅保留一个真实 SettingsStore/ThemeHandle，不再另建设置镜像。helper 可选 save 参数默认仍为原来的 async 返回 file，新增 store 导出只供 fixture 真实生命周期与观测使用，hostKeys 继续是模块作用域。T12 一次失败 flag 与成功回调计数接实际 store.save；重复 load/owner.dispose 移除，最后由 helper 在两个 owner 根均卸载后统一 dispose。

## 产物与验证

真实红：

`timeout --signal=TERM --kill-after=2s 50s node /tmp/huhu-theme-fixture-retry/baseline-v1-run.mjs --suite frontend-redesign --ticket T-12 --matrix redesign --out /tmp/huhu-theme-fixture-retry/baseline-v1`

真实运行当前未修改源的原 verify/exercise 路径，1 matrix case，main: persistent save failure 超时；result.json保留红灯，工具真实退出126。没有用编译失败、空case或假异常冒充该红灯。

真实绿：

`timeout --signal=TERM --kill-after=2s 60s node /tmp/huhu-theme-fixture-retry/fixed-v2-run.mjs --suite frontend-redesign --ticket T-12 --matrix redesign --out /tmp/huhu-theme-fixture-retry/fixed-v2`

退出0，1 case（390/zh/paper/coarse/mobile），原46条状态断言、main/second实际 trusted motion toggle、原显式 Retry、原预览 portal 和完整 exercise/dispose 均通过，errors=[]。全部原失败、最新草稿与显式Retry断言保留；原 store.status oracle 继续读取 owner.store，只是该字段现在指向真正共享的 store。新增断言要求：失败时同 store.status=error、成功 save 次数未增加、实际 save 尝试增加；两 Document 及 plugin 使用同一 handle/store，失败后的每个真实 .huhu-ui 根保留最新 motion；Retry 后 error 消失、同 store idle、真实 save 回调成功次数增加、收到的序列化主题 motion 与当前主题一致。不是仅关闭 alert 就算保存。

`pnpm exec tsc -p /tmp/huhu-theme-fixture-retry/tsconfig-v2.json`

退出0。该定向配置包括私有 helper/TSX、src/**/*.d.ts，typeRoots 指向本仓库 node_modules/@types，沿用真实项目严格选项及本地 noEmit。临时 node_modules 只是指向仓库依赖的读取软链接，没有修改仓库依赖。types-v2.log为空。私有文件通过绝对来源导入并解析同一生产组件，runner 对 TSX/helper/driver 使用明确临时 overlay；仓库源码未应用提案。

默认行为核对：helper 不传 save 参数仍使用与原实现相同的回调、计时器、SettingsStore、ThemeRuntime 和 configure/dispose；未给 T09/T11/T16 加故障行为或第二个引擎。没有复跑这些消费者的正式矩阵。

## 问题与下一步

Root 可按冻结 manifest 审合三个候选；本轮不改高审输入与状态。46条状态与完整 exercise 的绿色仅针对上述私有一个 case，不代表66正式矩阵通过。真实 Obsidian、popout、用户 vault、外部SDK/账号、插件构建、全量lint/test、提交/发布均未执行。本轮只验证内存 save 端口经真实 SettingsStore 与UI链路的失败和恢复，不将其称作真实磁盘或真实宿主持久化验收。

结束时没有本轮 runner/Chrome profile 遗留，查询仅匹配查询命令自身；没有终止用户进程。最终已核对三项真实工作区 before hash未变化。return0 后冻结并停写。
