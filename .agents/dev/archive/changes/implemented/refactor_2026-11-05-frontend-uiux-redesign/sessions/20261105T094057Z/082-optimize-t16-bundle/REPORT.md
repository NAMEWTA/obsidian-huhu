# T-16 压缩接缝交接

Session: 20261105T094057Z
Task: 082-optimize-t16-bundle
Status: completed

## 聚焦交接

已完成本轮可写预算接缝，冻结交Root作独立high审查；不宣称T-16或全局预算验收完成。073七项修复的其余64个候选路径逐项SHA未变。保留官方@pierre/diffs 1.6.4、shiki-js、八语言、原同步owner WorkerFactory与异步parser语义；未改领域事务、core/API、词典、预算、中央guard/notices、T12 frozen14、正式状态、生成资产、package/lock、node_modules或用户vault。无委派、提交、暂存、推送或worktree。

使用dev与SpecDev I；根据Root已校验TASK、073报告与68项冻结接续。实际写集只有scripts/diffs-languages.mjs、scripts/diffs-languages.test.mjs、scripts/versioning-worker.mjs、src/modules/versioning/ui/diff/workers.ts，以及新增同目录compressed-asset.ts。仅不可变构建资产接缝变化，不改变页面布局或产品文案。

先实测activation闭包：词典65343字节、sync-service18260、repo15179、restore-service9389、module8186；T16 hunk-restore仅1638，UI在该闭包只有dialog-factory307与conflict-extension1432，压缩解码未进入启动或activation。8,928字节activation缺口无法从本票UI资产接缝诚实消除；已向Root回传词典owner分流建议，不伪造第二层懒入口绕过预算统计，也未迁移事务到UI。

## 产物与验证

完整冻结：/tmp/huhu-t16-bundle-optimization/candidate-manifest.json，SHA256 36cf0c8e8f57222661c46283409126756dd53d48e42c1447a783483aff712d19。69项继承073的68项（含原5删除）并增helper；每项含模式、SHA、原baseline、optimizationStart与本轮变化标记。相比073仅上述5项变化；073冻结摘要仍为1ed4f94698fe617db4df16401596d0aa3f3249e699b97e5c121d6906a084731b。过程材料均在/tmp/huhu-t16-bundle-optimization，正式Evidence由Root维护。

实现：构建使用Node标准gzip level9；主图原物理@shikijs/langs/dist/*.mjs输入加载原发布默认数组，JSON压缩后运行时用fflate 0.8.3 gunzipSync/strFromU8还原，逐项Object.freeze，公开返回数组与JSON逐字相同。仍保持八个原物理输入，正常归属原语法包，不虚拟化隐藏许可。Worker内部保留原始grammar JS，仅对完整官方生成Worker gzip，避免嵌套base64压缩浪费；同步factory内还原原源，再使用owner Blob/URL/Worker，URL finally释放。无自写压缩器、parser、eval、消息队列或异步Worker握手。标准JSON解析或decoder异常直接传播。

依赖授权与官方研究继承TASK的Root记录，安装回执/tmp/huhu-fflate-install.log（精确0.8.3、MIT；Root执行pnpm安装，实际可解析后开始实测）。采用的是函数级gunzipSync/strFromU8 API；原始官方链接由Root原研究记录继续保留，本worker未另做联网研究或复制代码。NOTICE的fflate新增与@shikijs/langs保留由Root真实图生成器验收。

### 真实字节

本轮同环境首次内存图main9560038，优化后8389046，减少1170992；Root TASK初始9555624比优化后减少1166578，二者基线不可混称。实际归属见output-measurements.json与before-meta.json/after-meta.json：

| 输入归属 | 本轮前main输出字节 | 后main输出字节 |
| --- | ---: | ---: |
| 八语法实体 | 580926 | 129168 |
| 高亮Worker虚拟源 | 917629 | 203832 |
| parser Worker虚拟源 | 20362 | 9820 |
| fflate解码代码 | 0 | 4947 |
| helper | 0 | 111 |

measurements.json逐项记录真实物理路径与字节：八语法原源619906字节、JSON753079、gzip96240、base64128328；JSON解码/解析合计约21.0ms（Node单次测量，不是稳定性能上界）。高亮Worker raw838903、gzip152852、base64203804，实际127输入；parser raw20209、gzip7342、base649792，实际294输入。raw高亮Worker字节数与TASK原值相同，且测试逐字比对还原Worker与真实buildVersioningWorker输出。原物理语法JSON和冻结条目逐项比对通过。

最新只读预算报告after-bundle.json：main8389046仍超8252416上限136630；eager140746仍超135168，versioning activation204512仍超195584。本轮不提高任何预算；新增解码只在懒UI闭包。其它模块及Root中央并行工作造成前图与TASK起点小差异，本报告不将它们归本轮。

### 实际检查

| 检查 | 结果 |
| --- | --- |
| TDD red：新增真实8语法回环/传输上限测试，在修改前运行node --test scripts/diffs-languages.test.mjs | 目标红灯：原grammar transport812652大于250000；初次曾因测试解析shiki入口错误启动失败，修正真实pierre→shiki解析链后才取得目标红灯。red.log保留最终目标失败 |
| node --test scripts/diffs-languages.test.mjs scripts/diffs-owner-document.test.mjs | 退出0，12测试；8语法/unknown→text、精确6发布backend原hash/tamper/未知源、真实主/双Worker图、禁用wasm/highlights/portable、物理图数量、JSON冻结回环、同步factory逐字源及constructor失败URL释放、错误decoder传播 |
| pnpm exec vitest run src/modules/versioning/ui/diff/parse.test.ts | 退出0，1文件5测试，保留parser响应/失败/取消行为 |
| eslint --max-warnings 0 两个生产TS路径 | 退出0，零诊断；mjs按现有配置被忽略，不声称其经过eslint。首次含mjs调用出现3 ignored warning，最终仅适用TS检查 |
| prettier --write 五个实改文件 | 退出0 |
| node scripts/check-bundle.mjs --json /tmp/huhu-t16-bundle-optimization/after-bundle.json | 退出0，只读真实内存图；未加--enforce，预算仍失败如上 |
| 最小真实Chrome/CDP Worker诊断（native.mjs） | 退出0；main与iframe各经生产createHighlightWorker官方initialize/file消息完成真实JS高亮，生产parseComparison与官方parseDiffFromFile输出逐字一致，取消返回AbortError，terminate正常；各owner URL3创建/3释放；factory首次23.7ms和23.0ms。native-result.json记录原始回执 |
| validate-dispatch --stage dispatch | 退出0，errors/warnings为空 |

Chrome诊断初次使用不符合Pierre解析主题形态的测试fixture，官方Worker返回Theme does not support Shiki；将fixture改为正式resolved theme的textmate结构后完成验证，未修改产品代码规避错误。native结果是Chrome原生main/iframe证据，不冒称真实Obsidian popout。未机械重复073的93unit/64DOM/92真实Git；其输入除本轮构建资产外未变。未运行完整build/全仓lint/test:all或修改生成资产，按TASK由Root在合并固定输入上执行。

## 问题与下一步

Root须对69项候选（含073未完成high的七项修复）独立high双轴审查，验收真实notice包图并完成生产资产、全局预算与最终宿主矩阵。main余136630与eager/activation缺口保留真实待验收，尤其词典及领域分流不属本worker写集。未提高上限、未假造通过、未以独立接缝完成代替T-16完成。冻结后停止源码写入；本不可覆盖REPORT落盘后执行return校验，回执交Root。
