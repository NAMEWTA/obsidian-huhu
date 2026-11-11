---
schema_version: 2
session: "20261105T094057Z"
task: "082-optimize-t16-bundle"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
保留073已修的7项行为，仅按真实图缩小T16静态grammar/Worker传输与activation，消除其预算责任，不提高任何预算，不重写引擎。Root处理其它模块预算。
## Inputs
AGENTS/dev/ui/适用构建许可/研究复用合同、SpecDev I，Map28/Goal/Spec/T16/DESIGN3/UI002、073REPORT与冻结68项/tmp/huhu-t16-repair/candidate-manifest.json SHA1ed4f94698fe617db4df16401596d0aa3f3249e699b97e5c121d6906a084731b；070已释放，其7项修复后尚待high。原@pierre/diffs1.6.4、Shiki白名单8、shiki-js-only、2MiB读取/异步parser与owner守卫保持。
实际Root诊断/tmp/huhu-module-migration-bundle-initial.json：main9555624>8252416；versioning activation204512>195584；eager140741>135168及其它模块3项另由Root归责任票。lazy高亮字面量917629、main@shikijs/langs580926、Pierre496663。官方rawWorker838903，标准gzip153907/base64205212；8份实际grammar JSON752859，逐份gzip共97112/base64129484；可比较合并压缩去重但不要自造codec。数据源当前物理module默认数组，loader公开返回值必须仍一样。Root已验证fflate npm0.8.3/MIT/modified2026-07-20，SRI sha512-tbZNuJrLwGUp3zshBtdy4W+ORxZuIh8a5ilyIEQDC5rY1f3U20JMry0Ll3WBzU58EZKsEuJFXhb5gwv8CsPvgA==；Root现在安装精确依赖，等receipt后实测，不改package/lock。
建议只是待验证方案：标准gzip在构建压缩、fflate gunzipSync/strFromU8函数级解包；grammar仍在原物理输入路径生成/统计，默认导出实际语法对象/数组、逐字JSON回环与语法输出不变；Worker源在现有同步factory解包再按owner Blob创建，不新增异步握手/消息缓冲/eval/新Worker模型。可根据真实字节提出更小成熟方案，但保留语言/库/同步API、许可与图守卫。
## Workspace and Scope
仅T16既有writable：scripts/diffs-languages.mjs/test、scripts/versioning-worker.mjs、versioning/ui/**（重点workers与纯不可变资产helper/最近测试）、types/versioning-worker.d.ts如实际需要；完整候选/REPORT/tmp/huhu-t16-bundle-optimization。api.ts/core/hunk-restore.ts只读，Root中央owner guard/run/notices/budget/package/lock/资产/词典及正式状态只读。高审081冻结T12/Root14，绝不改相关源码。允许只读内存build/真实最小native Worker诊断，最终产物/全66归Root。不委派/提交/index/worktree/node_modules/用户vault。
versioning activation超8928需要先识别真实闭包，若必须增加领域懒入口文件先给Root精确路径/调用/最小设计，未扩scope不能改新服务/core。禁止改git语义、queue/proof/restore事务或挪到UI。不要为了全局6项门都绿修改其它模块；向Root交各实际责任与delta即可。
## Acceptance
有意义TDD：真实主/两Worker图、8language+unknowntext、JSON与Worker字节回环、真实至少一次高亮/parse原消息语义、main/iframe各owner初始化/卸载/URL/取消，解包耗时与启动闭包无引入；node_modules原始发布源不变，guard 6backend/rawhash/物理次数和Forbidden wasm/highlights/portable保持，未知变化失败。NOTICE真实包图包含fflate并保留原语法包，即使压缩不直接输出原JS；实际raw/encoded/runtime各字节诚实报告。073实体行为与现有93unit/64DOM/92Git不用机械重复，仅改动相关检查与已有真正风险。source/output/decoder失败不伪装正常空态；没有自写压缩算法/解析器/兼容分支。达到最小充分优化后冻结，不进行推测边缘循环，Root再high与最终全门。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，实际基线/字节/图/许可/回环/耗时/相关测试退出与限制、完整owned候选hash/模式/新删。过程仅/tmp；Root独占Evidence/state/产物。validate-dispatch return后停止。
