# 任务回报

Session: 20261105T094057Z
Task: 054-repair-t04-focus-wheel
Status: completed

## 聚焦交接

既有 native:/root/implement_t01，gpt-6.1-sol medium，未委派。完成053 P-02及Root完整66第59例wheel失败的限定修复，已向Lead明确冻结全部53源/测试/fixture。只改 ShellRoot.tsx 与 T-04/index.mjs；未发现实际滚动保留缺陷，WorkbenchSurface及其测试逐字不变。旧041/050/051/053报告、Root失败结果和本次红灯均保留。本报告不推进Ticket/Goal完成，等待独立057及Lead新完整66。

冻结副本及清单：/tmp/huhu-t04-focus-wheel-repair/frozen、frozen-sha256.json；53路径清单SHA 4f8cd8a0c143219c2fecddfdabb9bd76bc7d9633f4d9af86be2997b638a237ba。两条delta清单SHA 29b4a8e17575c198094f7e018eeaf993ae91cd34c12a2b40cd02eb40b55f9486。其余51条与051冻结相同。当前2251实际输入与三次canonical、重复wheel绿色控制完全一致，inputDigest a84fc4b24d388bbc4fc45c9c83906a34e9d001412cc83b0bcbe2fbd3cad21ec6；含ASAR实际app.css提取复核，final-verification.json各项drift=[]。

## 产物与验证

**焦点规范及实际绘制。** 原offset -2px改为DESIGN §3.6要求的2px solid accent、offset +2px。外框需要4px绘制空间：separator上下及右侧各内移4px，父区右侧保留hit+8px，保持整体panel272、separator物理宽32/44；整条父区边界线保留。命中带中心保留2px强调线用于hover/focus/active。UI-002具体原型是outline:none加强调线，并非当前DESIGN的例外；此次明确采用全局DESIGN +2标准，同时保留有用强调线，没有把原型解释为负偏移许可。

正式fixture在真实键盘ArrowRight令panel272→280后，main/second × normal/reduce分别检查focus-visible、2px solid、+2、32/44目标和外绘制区落在父区内；通过Page.captureScreenshot真实PNG，再在浏览器canvas读取上/下/左/右线中点像素，逐点比较实际accent色（通道误差≤1），不是只检查computed值。每态存PNG；已目视960 fine正常图，四边完整。为2x样本的720高叶提供真实1000 CSS px临时视口，随后恢复原样本视口，避免把窗口裁切冒充组件绘制缺陷。原panel范围220–480、8px/Home/End/reset、拖拽预览/提交/取消和目标宽度断言仍保留。

**wheel根因与红绿配对。** Root /tmp/huhu-t04-lead-repair-final/result.json 确为正常结束failed、59例，未强停：960/zh/ink/plum/huhu/comfortable/15/fine/desktop/normal的原协议无条件再向下180并要求移动及scrollend。私有实际生产图在同一精确样本用真实CDP wheel重复滚动：0→180→2580→4980→7380→9780→10294(max)。各次都有trusted wheel/scroll/scrollend，实际elementFromPoint命中owned列表、connected/visible=true、pendingRestore=false、ownerDocument准确。到max后原+180仅有trusted wheel，top不变，浏览器自然没有scroll/scrollend；原等待如实超时。wheel-bottom-red3/result.json 保留该红灯及每阶段前后top/max、rect/实际hit、owner、事件/迁移诊断。

正式协议现在在已有top>0时以真实负wheel回到0，并等待trusted wheel+scroll+scrollend和精确top0；已为0则只记录前提，不冒称用户事件。之后才执行原+180，并仍要求三个trusted事件及top增加，10秒截止未增加。每阶段重新量真实target/hit/owner/connected/visible/max，使用有界AbortController清理监听；finally保留事件记录。无程序性赋值重置、无减少矩阵、无去掉scrollend、无放松用户意图或修改Surface。私有同样重复至max的绿色控制真实10294→0→180，三事件齐全；wheel-bottom-green/result.json。两次早期私有诊断设置错误（尚未等到page提交、evaluate返回DOM对象）日志分别保留，但不作为产品证据。

**实际检查。** 所有输出在 /tmp/huhu-t04-focus-wheel-repair，资产由Lead唯一构建；CSS 1,284,982 bytes，SHA70dfb92f8e96fd828019dc6fa6c82790602d276f87c47596fb7a439cf125209a。源码与CSS在以下浏览器运行期间保持不变。

| 检查 | 结果 |
|---|---|
| pnpm exec tsc -p /tmp/huhu-t04-implementation/tsconfig-tests.json --pretty false | 退出0；原精确生产/测试/fixture及传递依赖，skipLibCheck，types.log空；不是全仓类型证书 |
| pnpm exec eslint src/shell/ShellRoot.tsx --max-warnings 0 | 退出0，lint.log空 |
| pnpm exec vitest run --project dom src/shell/ShellRoot.dom.test.tsx | 退出0，21/21；shell-dom.log |
| node --check scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs；限定git diff --check | 退出0 |
| driver-case59.mjs，原runner复制仅精确筛选失败样本 | 退出0，完整双doc canonical通过/errors[]；native-exact59/result.json |
| 原051私有driver-320fine.mjs、driver-390coarse.mjs | 各退出0，各1完整原样本通过/errors[]；native-320fine/result.json、native-390coarse/result.json |
| 私有wheel attribution红/绿 | 原边界协议预期退出126超时；真实负wheel后绿色退出0；wheel-bottom-red3及wheel-bottom-green |
| 53源/三canonical及绿色控制2251图最终复核 | drift=[]；final-verification.json |

上述canonical保留原正/负native owner31<40、41<50及同owner菜单真实命中/Escape/精确来源，Intro/Rail已关闭项、CSS580精确及DOMRect微小误差、实际leaf/main、normal/reduce dirty草稿/焦点、真实滚动后双向DOM adoption和可见性/取消/清理。每次新增四个separator绘制态，共12态48个真实像素点；fine32/coarse44均通过。未自行运行完整66。

实际driver SHA：case59 023b9c3e903ab8581235c66110c899f8b2fca1f6295d80f534704b78c963d1fb；320fine 06dd05d2340af452eb13032e2c919fb6fbe1222a01014fdd238ed60ae862aac8；390coarse 6678700e000c447a0f096e430b01daf4556c0fc616d17f155543f1888782b3b0；wheel红700a797ae1f4d2e154dae4b2c6a7b29cdab7c5a8acc03542ade08af311626c9f、绿d427dbb9ddef0ccfcb77041a92b725cf398d02137f895936b68ba26b0c32f770。原runner hash仍属于2251输入，不冒充私有驱动字节。

## 问题与下一步

最初历史CSS/旧协议的精确59新进程曾提前在main Keep editing焦点超时，尚未到wheel；exact59-original-protocol/result.json原样保留并已告知Lead。未为此修改生产焦点或放松断言；当前同样本及320/390完整严格焦点流程均通过，fixture仅补失败时的真实active/source/祖先诊断。独立高审及Lead完整66仍须覆盖偶发性，不把单次未复现写成已定位焦点原因。

未改共享源/资产/配置/依赖/字典/状态/Git，未提交/推送/发布。既有全局类型consumer债务、main.js/真实Obsidian主窗/popout及宿主集成继续由Lead/T13–T14门禁处理；本次iframe是真实第二Document，非Obsidian popout。源码冻结后不再写入，等待独立审查与Lead新结果。
