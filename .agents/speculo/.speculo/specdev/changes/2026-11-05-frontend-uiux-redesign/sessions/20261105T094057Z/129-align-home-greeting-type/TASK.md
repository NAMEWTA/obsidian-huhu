---
schema_version: 2
session: "20261105T094057Z"
task: "129-align-home-greeting-type"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-08"
---
## Goal
medium最小对齐首页问候字阶/衬线与已批准原型；repo只读/tmp候选，Root单写。不改行为/服务/状态，不写镜像实现测试。
## Inputs
AGENTS/dev/ui、Map48/Goal/Spec/T08/DESIGN3/UI002。DESIGN3 §3.5 --hu-font-read明确含首页问候；UI002 final/styles.css:716 .greet-title规定font-read、28px/36px、600、-.01em、margin-top6、text-wrap balance；当前BoardCanvas.tsx:474 h2 m0 mt2 text2xl font-semibold，实际Root真实host截图为UI sans，未消费font-read。现token --hu-text-2xl=28/--hu-lh-2xl=36已存在，不加新值或主题token。
Root123已合入Analytics，126两轴pass；/tmp/huhu-t08-lead-final当前原66+完整exercise已passed，3200输入固定。这次只收这个明确样式差，原32registry/44状态及功能审查复用。
## Workspace and Scope
repo全只读，只写本REPORT+/tmp/huhu-home-greeting-type。唯一生产候选src/modules/home/ui/canvas/BoardCanvas.tsx（仅h2 class）；不改其它源/fixture/资产。保存真实before/hashmode/after/冻结patch，交付路径不覆盖。可从私有Vite/esbuild overlay和/tmp拷贝样式构建做当前组件computed前后对照，禁止写repo styles或node_modules；不跑66/全仓/委派。
## Acceptance
用现HU字体与字阶token对齐family28/36/weight600/-.01em/6px/balance，语义h2与节点稳定不动；检查现Home字体缩放设置是否需要保留既有映射，不顺手重构。真实computed或精确CSS证据说明旧/新，正常/窄屏布局由Root最终代表视口验证；这类可逆样式不新增实现镜像DOM测试。新类若无既有CSS可在/tmp独立生成样式验证，不能把源码class名当实际字体通过。
## Return
三节聚焦交接/产物与验证/问题与下一步，不可覆盖REPORT；前后字节SHA/mode/原型引用/实际验证命令退出/私有和未验边界，return0停写。不写正式state/Evidence/assets/index。
