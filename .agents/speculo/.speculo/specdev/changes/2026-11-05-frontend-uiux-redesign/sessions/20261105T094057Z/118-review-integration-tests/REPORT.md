# 118 集成测试迁移与runner限时独立窄审

Session: 20261105T094057Z
Task: 118-review-integration-tests
Status: completed

## 聚焦交接

Reviewer: native:/root/review_t07；sol high；Strategy independent；Risk high；Independence required；Mode native。未参与116候选、114诊断或Root实际合入，无委派。仅写本不可覆盖REPORT与 /tmp/huhu-integration-tests-high，未改source/assets/state/Evidence/index或真实用户数据。

**standards: pass；specification: pass；Findings: []。** 六测试迁移保留原风险，runner限时接缝保留正常值/原异常与清理路径。九项冻结源始末hash/mode drift=[]；return校验后明确释放。此结论不证明renderer未知挂起根因已修复，不取代Root全仓与最终矩阵/宿主验收。

## 产物与验证

### 输入与范围

沿已解析workspace/catalog及已读未变AGENTS、dev/ui、测试与独立审查合同执行；本次回读Map44、T16、116/114报告及真实patch。规范轴依据Goal/Spec、T16移除旧CM/复用Pierre与保留真实恢复风险、唯一UI schema、批准DESIGN3/UI002（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）。标准轴检查实际生产API、测试断言可靠性、精确选择器、Promise错误/计时器/清理。无PR/commit-message外部引用，source-files审查不以HEAD代替真实before。

冻结 /tmp/huhu-integration-tests-high/frozen.json 共9项，SHA256 0b6dd5ba08b66b5d318b78022a70cd5618463a1a58d073c14f4c90944d76b97c。六实际测试源逐项等于116 proposed.json，九项模式均0664、非symlink。116真实before/proposed副本也逐项字节/模式验证，copiesDrift=[]；before.json SHA256 df4f00febbf20da8b9a20d17e8f8e2440cd90b54c0c717e0a1c6b9c6ffece6d8，proposed.json SHA256 892d1a1f9f75df3797a08162d203a36c7d34121787a8e0b278c28b3fe323ae37，完整proposal.patch SHA256 8f24a6a50d03e1f28736023fceb42f4cbf3d6a85d13376ae3aea8d265fc6c73f。全量阅读六路径真实before→proposed差异，未只看最后断言或作者私有绿灯。

Runner当前run.mjs SHA256 4e6a1232b5dd5fea61f3b58e533341ef7c26666c4067d53089ba5319d4999c00；bounded-startup.mjs 8fa4f4564afb14d67c68b233e1ecae35a0ed56104fc3331fd48618336f30f13f；bounded-startup.test.mjs 40317be4bf3672692d2d8dd5e3e3f78b8a6809e81ff8c170832fc6da65931740。对照114真实bounded-run.patch检查，额外Root输入清单纳入helper源码摘要；Root117其它fixture/theme不在本冻结范围。

### standards 输出

Reviewer: native:/root/review_t07；Result: pass；Findings: []。

1. **safe schema**：safe-contribution.test.ts使用实际WORKBENCH_UI_SCHEMA值huhu-workbench-ui/1，route/navigation.lastRoutes与生产normalizeWorkbenchState契合；原resourceId/focusId/section去除、cleanPageState及激活/禁用/移动端断言保留。新增pageViews明确断言safe target被净化且state={}，没有因类型错误改成不经过normalizer的伪输入。
2. **expense精确选择**：仅去掉RoleOptions不支持的exact，name仍为原字符串；安装版@testing-library/dom 10.4.2的role.js使用matches(computeAccessibleName(...),name,text=>text)，matches对字符串执行严格相等。未换模糊/regex或放宽命中。
3. **foundation真实尺寸标记**：icon-xs迁至生产Button实际支持的icon-sm；原StrictMode/跨Document往返、refs、受控/非受控草稿与生命周期断言不减，新增data-size/data-hit-control核对生产输出。DOM未断言真实32/44像素；原fixture命中门未被修改或冒充通过。
4. **newline风险迁移**：git-hunk-newlines.test.ts直接调用真实Pierre parseDiffFromFile，displayText与hunkProof均来自生产；context:2、完整解析true与生产parse.ts/parse-worker.ts一致。原最小CR/LF跨界危险proof仍精确断言selected=['0:4:0:4']、native editableText转换及prepare拒绝/零写入。5种prefix逐一覆盖first/last/both，原BOM、相邻blankline、两个独立库hunk、拒绝不写checkpoint/annotation、成功receipt/原beforeObject/事件顺序/undo与whole/copy保留。十行未变上下文保留，没有复制diff算法或恢复CM引擎。实际7个测试执行15个选区循环与其它控制均通过。
5. **唯一appearance样本**：新输入仅以合法system/source/accent/density/uiSize/motion适配批准主题schema，原editor、heading/emphasis、自定义两模式色值、字体与18/1.9精度、Home装饰字段仍在真实normalizer产物。新增断言dashboardFile不会入样本。唯一snapshot实际diff只改preset并加入六项UI偏好；未变其它业务格式/快照、未运行-u。真实user-formats整文件通过，不能把旧eye-care非法枚举继续作为新schema合法值。
6. **限时/异常/清理**：boundedStartup默认10000ms，Promise.race返回正常结果或原异常对象；finally清除本次timer。实际runner把startup readiness等待与startup Promise置于同一budget，解决单次cdp.evaluate挂起时waitFor自身deadline无法执行的问题；只对FixtureStartupTimeout跳过失败截图，一般异常仍截图/入errors/status=failed/非0。原finally先保存result，再Browser.close、3秒SIGTERM fallback、close CDP、移除临时work、写finishedAt路径保留；没有把timeout改成pass、跳过全部失败截图或覆盖原启动异常。helper源码已进入inputs摘要。

### specification 输出

Reviewer: native:/root/review_t07；Result: pass；Findings: []。

六路径是旧测试接口迁移及唯一获批UI schema样本更新，无领域生产delta；Pierre恢复危险用例仍经真实库与原领域服务，符合T16删除旧引擎且保留风险承接要求。safe机密route/pageViews边界未放松，exact查询语义与原跨Document草稿保证未放松，按钮元数据检查没有伪装成像素验收。外观样本只覆盖全局主题/Home装饰，继续排除看板路径。

runner为原startup观察/止损的薄封装，10秒默认值、正常启动/原失败、显式timeout与原资源清理语义符合118要求。114真实Chrome never-startup运行已证明原10秒helper→catch→finally能写failed/finishedAt并清理；本轮复用其有限证据。114该运行发生在扩大包装到readiness之前，本轮扩大部分按真实源静态检查与相同helper实际控制确认；未宣称本次重新跑真实Chrome readiness挂死或修复renderer根因。

### 本人实际验证与边界

| 命令/检查 | 实际结果 |
| --- | --- |
| validate-dispatch.mjs --task 118-review-integration-tests --stage dispatch | 0；errors=[]/warnings=[] |
| 六源实际合入+before/proposed副本hash/mode，九源开始/结束审计 | 0；start-audit.json/final-audit.json，drift=[] |
| pnpm exec vitest run src/app/workbench/safe-contribution.test.ts src/modules/home/ui/expense/records.dom.test.tsx src/ui/react/foundation.dom.test.tsx test/sync/git-hunk-newlines.test.ts test/golden/user-formats.test.ts --maxWorkers 2 | 0；真实workspace 5文件44测试，targeted.log；不使用116内存替换Vite插件 |
| node --test scripts/ui-review/bounded-startup.test.mjs scripts/ui-review/run.test.mjs | 0；9/9，runner.log；含真实CLI拒绝/缺fixture/共享T01 --check预检，无浏览器矩阵 |
| node --test /tmp/huhu-integration-tests-high/startup-control.test.mjs | 0；2/2，startup-control.log；独立观察默认timer=10000且resolve/reject清除精确timer、原异常同对象；never实际默认耗时10007.9ms并抛指定timeout |
| pnpm exec tsc --noEmit --pretty false -p /tmp/huhu-integration-tests-high/tsconfig-owned.json | 0；types.log；五个实际迁移测试及其生产依赖，非116 CompilerHost替换；不冒充全仓test types |

未跑全仓pnpmtest、66/其它矩阵、完整构建、真实Obsidian/native/用户vault；Root正在运行的全仓测试及旧缓存结果未被计入本人证据。run.test中的--check仅bundle/input预检，不证明视觉/宿主。没有新增产品修复、业务snapshot更新或正式状态操作。

## 问题与下一步

本窄范围无待修finding；Root可继续全仓最终类型/测试与117相关fixture/视觉/宿主收口。114未知renderer卡死根因仍未作归因证明。REPORT不可覆盖；return通过后九项冻结明确释放，停止本审查写入，不推进票据或Gate。
