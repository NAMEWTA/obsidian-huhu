# T12 同store故障注入与真实Retry独立窄复验

Session: 20261105T094057Z
Task: 122-review-theme-fixture-retry
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，120原独立审查者，既有gpt-6.1-sol high角色；未参与121提案或Root合入，没有实施或委派。**standards：pass；specification：pass；本范围无新增已验证finding。** 120唯一ST-01/SP-01 P2已在当前真实合入三源关闭；原120报告和失败记录保持不可变，不改写当时request-changes。

**明确释放本次三源及必要只读context冻结。** 三源+五个直接context共8路径始末SHA/模式drift=[]。仓库只新增本不可变REPORT；过程仅 /tmp/huhu-theme-fixture-retry-high，未改源码/fixture/配置/资产/依赖、Git/index、正式状态或Evidence，未跑全仓/66、用户数据或委派。

亲自运行当前源码原T12单组：390/zh/paper/coarse/mobile，46条状态、双Document真实失败/草稿/显式Retry/实际保存与preview、完整exercise/dispose均通过，errors=[]。默认helper不传save的独立真实store控制1/1通过，局部严格types退出0。单组与内存持久化端口不等于最终66、真实磁盘或Obsidian/popout验收，后者仍由Root完成。

## 产物与验证

### 固定输入与有界复用

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。来源为122 TASK、AGENTS/dev/ui/testing与公共review合同、Map47/Goal/Spec/T12、批准DESIGN3/UI002、120与121不可变REPORT。designDigest仍 **49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66**。沿120未变规则和完整接缝审查复用，不重开其它模块；无缺规范/跳轴，source-files不制造Git固定点或远程PR发现。

ready-manifest-v2三份before原文逐项匹配声明，实际当前源SHA/mode精确匹配after；已回读三份完整patch及真实调用，审的是Root实际合入字节，未使用私有source overlay。

| 冻结路径 | 当前SHA256；mode均0664 |
| --- | --- |
| scripts/ui-review/fixtures/frontend-redesign/shared/fixture-theme.ts | 81b451ca862cf4567038133779db5bf2b2214dd87f59a8481447b11c7c3d2dec |
| scripts/ui-review/fixtures/frontend-redesign/T-12/index.tsx | 1f8393e040d26200ec4b135acce149fa29709528f822b4a376d58cf74eca8fec |
| scripts/ui-review/fixtures/frontend-redesign/T-12/index.mjs | 14aca805e24c55155be85292779d27cf11177640a6d002909a60532bb19560d3 |

- 自有manifest.json SHA256 **33b9a36fb3a26585367271ce9f77ee13856b091b5f02bf6596748827a7f4a078**；candidate/、diffs/保存真实源和before→after。120的38项中实际35项字节/模式未变，仅上述三项变化，reuse120.json列完整集合。120 REPORT SHA256 **0aa8a3f76c8a5dec4a186563fd46d8f12275ed2493c45a88a94560eaa4a7cea3**；其其它PASS按原限制继续有效，不宣告所有模块重新通过。
- 五个直接context为SettingsStore、ThemeRuntime/themeSettings、AppearanceSettings、appSchema，均只读固定；context.json SHA256 **31e5ac344e37df87e92308e843fd75526bee546e830ad67bfd6fab57f81eb520**。
- 公共review-scope8路径退出0，SHA256 **353ca789df2875ea49a837a847c25e2c40daaa3515984ecb3f689da3ee6e162d**；authority.json SHA256 **7c0a73d79d865a72f4b95f117a20dbcbdbff5d4753ac3ad9e422e22aeba54340**。review-input.json Input-SHA256 **808582e7b58931633a3ac89b647874ae02972367a15bc9df113c6dab1af986de**，绑定来源、实际输入、独立性、120复用集合与浏览器输入核对。
- 当前原driver单组result的4329个实际输入逐项重新hash，drift=[]；其中ASAR虚拟app.css按真实header/offset提取核对，没有忽略虚拟输入或把它当普通路径。私有runner仅将case选择限制为上述一组，直接import当前真实T12 driver、直接build真实TSX/helper；runner本身也在输入清单，没有overlay生产组件或改原断言。

### standards 输出

Reviewer: native:/root/review_toolchain
Axis: standards
Result: pass
Input-SHA256: 808582e7b58931633a3ac89b647874ae02972367a15bc9df113c6dab1af986de
Findings: []。

**120 ST-01关闭：故障确实进入UI/Runtime共用的真实SettingsStore.save。** helper新增可选SettingsPersistence.save，默认仍原async返回file；暴露原store而非新建镜像。T12只调用一次installFixtureTheme，owner.store和appSettings绑定均来自该store，theme/UI/plugin/ThemeRuntime共用原fixtureTheme.settings。原owner私建store、重复load和重复dispose均移除。

T12 themeIO.failNext接到该实际save回调：尝试时递增attempts，受控一次拒绝发生在成功计数/序列化观测之前；拒绝由真实SettingsStore令status=error并传播至真实AppearanceSettings.perform，界面显示原失败说明，内存草稿/ThemeRuntime已发布的主题保持。没有只设置假error、模拟UI异常、修改生产Store或让无关owner.store提供idle假绿。

**显式Retry确实保存同一handle的主题。** 原driver中的失败提示、motion改变、Retry点击、错误消失、store.status idle和preview/cleanup断言全部保留；新增断言验证失败时实际attempts增加但saved不增加、真正store为error、主/第二Document及plugin共享handle/store、当前roots保留草稿motion。Retry还要求真实save成功次数增加，收到的序列化theme.motion等于当前主题；不只看alert关闭就通过。settings save回调计数与serialized file观测属于内存端口实证，不冒称真实磁盘已写。

本reviewer原样运行当前T12 driver的完整一组，实际46状态、两个Document失败/Retry动作及exercise均通过；120原红记录中“motion已改变、alerts空、错误门超时”没有在当前源重现，而是确实进入失败说明再由UI显式重试恢复。原120红灯仍保存在 /tmp/huhu-final-seams-high/t12-failure/result.json，未覆盖或把旧失败改成绿。

**helper默认语义与生命周期保持。** 可选save未传时仍使用原返回file的默认callback，load、SettingsStore、owner定时器、configure及真实ThemeRuntime均未变；没有给T09/T11/T16加故障行为/第二主题引擎。独立默认路径控制直接调用真实installFixtureTheme（不传options）、同store绑定app namespace并写入，再configure theme和正常theme.update：真实异步写入完成、status idle、app值保留、store.handleOf('theme').get与公开handle同一对象，双Document得到theme/motion属性。dispose后handle更新真实拒绝disposed。该控制不是mock SettingsStore或仅检查默认函数文本。

两个owner先卸载真实root及RuleManager，helper最终统一清理Runtime注册的observer/订阅并dispose唯一store；完整exercise验证双Doc UI/portal移除。120已通过的hostKeys作用域、动态roots/Portal和safe/unsafe palette逻辑本次未改，其原当前源实证有界复用；本轮不重复这些浏览器子矩阵或其它119测试。

### specification 输出

Reviewer: native:/root/review_toolchain
Axis: specification
Result: pass
Input-SHA256: 808582e7b58931633a3ac89b647874ae02972367a15bc9df113c6dab1af986de
Findings: []。

**120 SP-01关闭。** T12“先发布内存值、持久失败不假称回滚、保留草稿与错误、显式Retry真实保存”的原验收现在由同一条生产UI→ThemeHandle→SettingsStore→受控save链表达，原store.status读取已经指向真正store；实际保存观测进一步增强原风险门。没有删除失败、草稿、Retry、preview或cleanup断言，没有恢复主题镜像、修改领域/设置事务或批准DESIGN。

本结论仅限121三源增量与120唯一P2；DESIGN摘要不变，120其它35个相同源的PASS沿原范围复用。通过单组没有覆盖66其它尺寸/颜色/hostMode，也没有证明真实Obsidian多窗口、OS或磁盘，Root仍需据最终输入完成正式矩阵和宿主门。

### 实际命令与限制

| 实际命令/检查 | 结果 |
| --- | --- |
| node /tmp/huhu-theme-fixture-retry-high/t12-original-run.mjs --suite frontend-redesign --ticket T-12 --matrix redesign --out /tmp/huhu-theme-fixture-retry-high/t12-original | 0；1 case、46状态、双Doc完整verify/exercise；errors=[]；原driver直接使用，无断言改写 |
| pnpm exec vitest run --config /tmp/huhu-theme-fixture-retry-high/dom.config.mts | 0；1/1默认helper真实store/namespace/双Doc/正常写入/dispose控制；default-helper.log |
| pnpm exec tsc -p /tmp/huhu-theme-fixture-retry-high/tsconfig.json --pretty false | 0；types.log空；仅选择当前helper/T12 TSX与d.ts、真实transitive graph，沿项目严格选项；非全仓 |
| ready-manifest-v2 before/after实际字节、三源mode与五context初末核查 | 通过；8路径drift=[]；initial/final-verification及post-report-verification |
| 120复用集合、当前浏览器实际输入hash/ASAR核对 | 通过；35未变/3变化；4329输入、1虚拟ASAR，drift=[] |
| validate-specdev --review-scope --mode source-files；validate-dispatch --stage dispatch | 均0；8路径、errors=[]/warnings=[] |

本次没有全仓build/test/lint、资产生成、66或其它票重跑，不将121作者私有绿色归为亲自验证；上表浏览器针对当前实际合入字节。fixture mjs/TS未伪报成全局eslint通过，适用强类型与真实执行已经核验。没有真实用户vault/clipboard/账号/CLI、Obsidian/popout或系统宿主操作，所有Chrome/profile仅管理本次创建实例。无初始live index字节指纹，不把未写Git/index的操作事实冒充独立前后hash证明。

## 问题与下一步

120唯一P2已关闭，本次两轴pass，三源冻结已释放，120/121/122报告及原红绿证据均保持不可变。Root可按最终实际输入继续正式T12矩阵与全局/真实宿主验收；单组不提升为最终66或整项目完成。

若后续该共享helper的默认save、唯一store归属或driver失败/Retry断言再变，则按真实影响重新冻结复验；其余120未变通过结论继续有界复用。本报告不修改状态、Evidence、批准设计或执行提交/推送/发布。
