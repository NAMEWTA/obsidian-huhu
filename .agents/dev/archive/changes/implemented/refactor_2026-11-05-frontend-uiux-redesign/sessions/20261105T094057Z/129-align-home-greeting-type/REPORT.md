# 任务回报

Session: 20261105T094057Z
Task: 129-align-home-greeting-type
Status: completed

## 聚焦交接

已完成单源私有样式候选，等待 Root 单写合入与代表视口验收；未把候选应用到仓库。仓库除本 REPORT 外全程只读，不改资产、fixture、状态、服务或行为，不新增实现镜像测试，不委派。

原型依据为 UI-002/final/styles.css:716 .greet-title（design-system.md:876 同值）：font-read、28px/36px、600、-.01em、margin-top 6px、text-wrap balance。实际已生成 CSS 中 text-2xl 本就映射 HU 28px/36px，故保留该类及 font-semibold，只将 BoardCanvas 的 h2 class 从 m-0 mt-2 text-2xl font-semibold 改为 m-0 mt-[var(--hu-space-1-5)] text-2xl font-semibold tracking-[-0.01em] text-balance [font-family:var(--hu-font-read)]。消费现有 HU 字体、字阶及间距令牌，不新建 token；h2 语义、节点、内容与其它字节不变。

检查了 appearance.ts 的原 fontScale 映射：small 使用 --hu-text-sm=13px，medium 清除根覆盖、继承 --hu-text-md=14px，large 使用 --hu-text-lg=16px。原 greeting 已用固定像素 HU 字阶，不随 dashboard 根字号变动；候选保留同一行为，没有引入 em 或新字号缩放。初步消息中的未确认 20/28 字阶推测已根据真实 scoped CSS 更正，本报告与实际证据均为 28/36。

## 产物与验证

全部过程材料在本地 /tmp/huhu-home-greeting-type，不进入 evidence：before/、before.json 保存实际开始源，proposed/ 保存完整候选，greeting-type.patch 为仅一处 class 的补丁，manifest.json 保存前后 hash/mode。ready.json 写入后不再覆盖。

唯一源 src/modules/home/ui/canvas/BoardCanvas.tsx：

- before SHA256：379484d60285e5bcb2688aeeaeb293424715ac5530a5a91acaf9d6fc372a345d，mode 0o664。
- after SHA256：46a38b3d6fc1ecb6718b50889b040b715189b1882405799790f02e0d75b12e58，mode 0o664。
- patch SHA256：624093ecd835a779ec5b94c714a5fb8fdf12d6b9a4ad001b5c2333e1125a7551。
- 只读样式/缩放上下文 context-manifest.json SHA256：efc25ca04373e3c7aa8d956cc21c8ac4e68b961e07c238677d2d1571abc7c253。
- computed.json SHA256：db44b7af2102b2035f33830656bf8e18022f32bd21df8e4ba89a793bbf3ed68f。

实际验证：

1. node node_modules/@tailwindcss/cli/dist/index.mjs -i /tmp/huhu-home-greeting-type/entry.css -o /tmp/huhu-home-greeting-type/tailwind.raw.css --optimize：退出 0。私有入口导入现生产 Tailwind 入口、额外扫描私有候选；不写原 build 或 node_modules。
2. node /tmp/huhu-home-greeting-type/compose.mjs：退出 0。使用真实 scopeTailwind 生产作用域处理，再按 src/styles.json 的 23 个作者源原顺序组合私有样式，仅以新私有 scoped CSS 替换原 build 片段；全部输出在 /tmp。上下文清单包含 23 源及 appearance.ts/Tailwind 入口。
3. google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/huhu-home-greeting-type/chrome-profile --dump-dom file:///tmp/huhu-home-greeting-type/computed.html：退出 0。加载私有真实样式，在 huhu-ui/huhu-dashboard-root 中放置源中提取的旧/新 h2 class，读取真实 getComputedStyle；这是隔离 CSS probe，未启动实际 Home React 页面，不声称完整组件/宿主验收。computed-dom.html 保留原结果。
4. 读取上述真实 DOM 并逐值断言的 Python 检查：退出 0，六组 small/medium/large × before/after 全部通过。三档根字号各为 13/14/16px；两版标题均为 28px、36px、600。旧 family 为 Geist/UI sans 栈、margin-top 8px、letter-spacing 0.14px、text-wrap wrap；新 family 为完整 --hu-font-read 的 Iowan/Palatino/Georgia/宋体/serif 栈、margin-top 6px、letter-spacing -0.28px（28px × -.01em）、text-wrap balance。由实际 CSS 和浏览器计算值确认，不仅检查 class 名。
5. pnpm exec eslint --stdin --stdin-filename src/modules/home/ui/canvas/BoardCanvas.tsx --max-warnings 0，stdin 为私有候选：退出 0、零警告（lint.log）。
6. 源字节断言仅替换新 class 为旧 class 后与 before 完全相等；workspace 实际源 before SHA/mode 无漂移。git apply --check /tmp/huhu-home-greeting-type/greeting-type.patch：退出 0。

## 问题与下一步

候选已 ready，无已知实现阻塞；Root 按 manifest 核对 before/after/mode 后应用并重建正式样式，再完成正常/窄屏代表视口和实际 Home/宿主截图验收。computed family 证明 CSS 字体栈，不证明每个平台实际可用字形或最终选用字体。

未跑 66、43/44 状态、全仓检查、真实 Obsidian 或完整 Home React 页面；不以隔离 probe 代替上述验收。原功能审查和完整矩阵证据由 Root 复用，本任务不改正式 state/Evidence/index。
