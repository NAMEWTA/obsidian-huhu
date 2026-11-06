# 纠正 Git 接入主按钮目标分支

Session: 20261105T094057Z
Task: 162-correct-versioning-primary-target
Status: completed

## 聚焦交接

实施者native:/root/cleanup_final。157实施时用全文件首匹配误改了no-git EmptyState里的单一Open settings，真正NoRepository创建旁设置仍是default primary；157 REPORT关于“仅改noRepo”的描述与该实际patch不符。这是本执行者的错误，162以真实两分支纠正，不改写旧157 REPORT或补丁历史。

本次只在/tmp/huhu-versioning-primary-corrected生成候选，正式仓库仅本不可覆盖REPORT；未写161冻结生产源、状态/Evidence/index、旧报告/包或正式产物，无委派、提交、用户库/账号/clipboard/真实Git与宿主操作。Root等161释放后单写应用。

唯一候选src/modules/versioning/ui/sync-presentation.tsx，两处精确hunk：SyncPage的snapshot.phase==='no-git' action恢复原default primary（独立单按钮）；只在function NoRepository内部创建仓库同actions row的Open settings增加variant=secondary。创建仍显式primary，原handlers、busy/disabled、place/error、CloneRepository区、确认与Git业务完全不变。修改前按分支边界定位而非再次首字符串替换。

## 产物与验证

真实before为Root已应用157的当前源，SHA256 2f0d2cc24426a36c674da68ca15dc802eef91ca88781af40aacc61c92657ec36，mode0664；初始化与冻结时均逐字核对。候选tree与before副本只在/tmp，实际浏览器绿灯inputs中的该源SHA与最终manifest after一致。独占冻结并设只读：

- /tmp/huhu-versioning-primary-corrected/ready.patch，SHA256 **b71fb71d55e53bc64561b8b213b6ab72a1ab94c987847d6da0b23f3e4f97e949**。
- /tmp/huhu-versioning-primary-corrected/ready-manifest.json，SHA256 **f6fed96ee40509d2de5b32d299829f87761a12439e3833a399e9956bca30a532**，含唯一源before/after SHA/mode与实际根。

有意义分支验证使用临时T98，直接分别挂载真实SyncPage的no-git/no-repo状态并注册真实词典，settings只接阶段回调端口，不调用Git；HuhuProviders与现有Button/EmptyState/CloneRepository均是真实组件。只给真实Obsidian createDiv宿主接口供桩。检测的是实际渲染同一父actions组、variant输出、computed背景/前景及真实鼠标点击后的新增回调，非仅grepClass/字符串镜像。noRepo的collapsed clone是独立区域，不混入同actions组计数，未改它的按钮。

真实输入红绿配对：

- render-before：将私有生产单源换回精确2f0d before，使用同一最终临时driver；实际观察no-git=[secondary]、no-repo=[primary,primary]，正确被“no-git应primary”断言拦住，退出126。proof先记录两个实际phase，再触发红灯；不把工具failed称测试环境错误。
- render-verified：最终候选，纸/墨各960宽1x有限组合，退出0、errors=[]。两组都观察no-git恰1主按钮；noRepo真实同一row恰Create primary + Open settings secondary，Create未被禁用（有效place/非busy），两处settings点击均产生对应phase的新回调。纸色主/次背景分别rgb(44,102,105)/rgb(255,255,255)，墨色分别rgb(111,180,175)/rgb(37,35,31)；no-git单按钮与Create保持相同主背景。

私有runner只选上述两代表组合并使用当前正式styles.css与ASAR app.css；实际输入图/摘要在各result.json。没有改正式driver、正式样式或新增永久镜像测试。红灯后已恢复精确绿灯源，并核对绿灯input SHA与冻结after相同。

实际命令：

| 命令 | 退出/边界 |
|---|---|
| node node_modules/vitest/vitest.mjs run src/modules/versioning/ui/sync.dom.test.tsx | 0，1文件8项，tests.log；不将原ready阶段回归单独当setup层级证明 |
| node node_modules/typescript/bin/tsc -noEmit -skipLibCheck | 0，types.log无诊断 |
| node node_modules/eslint/bin/eslint.js src/modules/versioning/ui/sync-presentation.tsx --max-warnings 0 | 0，lint.log无警告 |
| node scripts/ui-review/run.mjs --ticket T-98 --matrix standard --out /tmp/huhu-versioning-primary-corrected/render-verified | 0，临时限定纸/墨两组真实分支渲染及四次settings回调 |
| 同最终driver对原before的render-before | 126，期望红灯；两个phase实际层级均记录 |
| 正式根git apply --check --whitespace=error /tmp/huhu-versioning-primary-corrected/ready.patch | 0，未应用 |

临时探针过程失败保留：初版缺Pierre实际依赖图的adapterCounts，被正确build guard拦住；改用已存在T16准确声明，没有关闭适配器守卫。下一版缺Obsidian createDiv与过早读取裸uiReview，补宿主桩和globalThis readiness后恢复；一次第二组合沿用标准2x导致500px高视口、未滚动的第二按钮点击超出视口而超时，固定两个明确1x并对每个真实按钮滚动后重新测坐标，最终四次回调均通过。这些是私有探针失败，不冒称产品通过，也未通过改产品绕过它们。

## 问题与下一步

交Root在161释放后应用162，并独立复核两个phase实际目标，保留157错误历史。此处未build正式资产、未正式66/858、未真正Git接入/Obsidian/popout或完整产品E2E；不是独立review，不裁定T16/T14通过。当前单源两hunk与实际分支已闭合，Root统一后续矩阵/截图/产物。

return0；完成return校验后停止全部读写并释放。
