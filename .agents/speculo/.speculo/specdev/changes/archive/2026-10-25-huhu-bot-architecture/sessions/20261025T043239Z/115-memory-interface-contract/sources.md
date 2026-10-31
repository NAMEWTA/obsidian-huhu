# 115关键来源

这是实际只读覆盖/当前hash，不能冒称全文件都读全或整冻结输入独立核验。已知118两文件变化见JSON；无产品检查。

| ID | 实际路径 | SHA256 | 覆盖 |
|---|---|---|---|
| R01 | `AGENTS.md` | `50db128fbe7d1807a8147291fb25ae4d8cab3866bc3d772bf4857af5a36311ef` | reused stable project instructions |
| R02 | `.agents/speculo/.speculo/workspace.json` | `331c75683416ffe2afa5d9a6d2b93a11b4fc8a5332127bcf877f3e0fe76d5ae1` | full |
| R03 | `.agents/speculo/catalog.json` | `1e7d53e94d684906320ef5abc259d6b7f96d2b9e34fd449408828ae8d600dd37` | relevant discovery entries |
| R04 | `.agents/skills/dev/SKILL.md` | `5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293` | reused unchanged full |
| R05 | `.agents/skills/dev/references/architecture.md` | `0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42` | actual boundary/Go partition chapters |
| R06 | `.agents/skills/dev/references/testing.md` | `1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b` | full selection rules, no product check run |
| R07 | `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md` | `2984173f37c210b79c27f7a3d982aca18f12b41179efbff51020ad53101a0fae` | reused read-only-preparation branch; does not activate T14 |
| D01 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md` | `3c1414c294ca55b2d6c8210d4b93f43169adf0e938f59a7501ff62119e89be2d` | memory/source/budget/recovery/protocol/API/delete clauses; targeted lines |
| D02 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md` | `d05a6885c3e87f263c341d8730f6bad3328b07c0c87e6263370f3a112f780138` | ADR024 full; superseded ADR012 and ADR025 authority context |
| D03 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/14-private-memory.md` | `02714047454cffcb461cf4daa07623818e19ce71cb4e65e4ab894849a6fca6d6` | full |
| D04 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/15-global-memory.md` | `891c7541aa1e3a76bf4a67b440f9d74f71e344b7ba57c0da3bc936590f715c25` | full across targeted reads |
| D05 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/app.js` | `d57ce7bf7df7c4053e385621bde9aeba05a4494c96914f1baad5258572cc2216` | actual autoEnabled line33 and memory view/toggle |
| D06 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/099-memory-preparation/REPORT.md` | `6ad279907190c0d63b4681aba3c898008d617034f9100927bba6bd3dbe1d9813` | full |
| D07 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/099-memory-preparation/interfaces-and-owners.md` | `b25967d834947752fba88022a3b1a98bb8047edf0a91cbac6c08a5e9172224ca` | full across two reads |
| D08 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/099-memory-preparation/failure-matrix.md` | `1908c45fbc72f066577ba124c2fb535d45fc9b07f7420f293676d05fa16acd30` | full |
| D09 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/043-events-implementation/TASK.md` | `7da56059af2c5b06542d4b5cf196c3e62542d760551e7466a7d164ab7d6f9a83` | full; actual T04 owner credential_provider and T01 stdio boundary |
| D10 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/107-protocol-common/logs/16-own-final-source.json` | `920a660bfbb1f459f338aecc1a03aab42cb1f120c6873c51546fd4aed0b8ff06` | baseline protocol/registry hashes only |
| C01 | `native/huhubot/internal/application/api/types.go` | `3a8019d4638b666e8e81506781a8bc0f6795287ed5363811c36d72b9ca4ceaf9` | RequestIdentity/Facade metadata |
| C02 | `native/huhubot/internal/application/api/conversation.go` | `e66c6fb6fa5fde5b2fb106d6e8951062735b71931e8f8d6f1f740807820fff4a` | full |
| C03 | `native/huhubot/internal/application/api/tooling.go` | `7af2c5abddf71bd171a17f063409eb73364f0c78e08c3080873f0a4dcc2c280e` | full |
| C04 | `native/huhubot/internal/application/api/access.go` | `5ab3b6e753665db96bc270e45716d6d0f4390cd008832ba1bb780de7a4554f6b` | full |
| C05 | `native/huhubot/internal/application/api/attempts.go` | `100af5f4f77c709e1cc1b318fe8abe7dfca1d754637a9a1b0690964ac84e67e4` | full |
| C06 | `native/huhubot/internal/application/api/recovery.go` | `a20bc1d0eb926b1b4f474a81b794c9668b5833a6cdc4d15f00688f977fd13e7f` | reused current108 full |
| C07 | `native/huhubot/internal/application/api/collaboration.go` | `9db6035349d907363751b1f814b67bb50760c041ba5cd9c5dbc94d4dbc8b060e` | namespace/config/Derived/lineage/task result targeted |
| C08 | `native/huhubot/internal/application/api/events.go` | `668d504fb2cfb5787eab30bc1ccb9fafbf75ffc5d851288f51719362cce91a83` | full |
| C09 | `native/huhubot/internal/application/api/assistant.go` | `0d218e36aceef643dfee227351795dc95dd7e8024421aa28ef6dd15a0fc04c74` | usage/lifecycle data targeted |
| C10 | `native/huhubot/internal/application/execution/executor/ports.go` | `8cf2e56c9269742fa83c18722a1229c9f55ae3c85a6e78a713cab0bc199beb4d` | full |
| C11 | `native/huhubot/internal/application/execution/executor/executor.go` | `e789ce1614acc88489d200c0c3d332d326ce05221d61b790a31ebb4b5af044ef` | full |
| C12 | `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go` | `93bfe1b9715e0b160b3155b76e057c825d57d21dc13595bc663cd52b57128a31` | full |
| C13 | `native/huhubot/internal/adapters/outbound/sqlite/execution/store.go` | `4ecbc1dc8f83a9107d5d2c37d1fdeb897b5b2d30d2fcfea728ee0ec5460de623` | GetRun/SnapshotUsageInTx targeted |
| C14 | `native/huhubot/internal/adapters/outbound/sqlite/execution/children.go` | `1aeb39448764913dce32ab78f6d0169e0790e4da60041ab9977ba4d39e679d76` | NewChild/Pin/recovery config targeted |
| C15 | `native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go` | `ec8e245d87922cd4acfc6e38e35caea701cf2302a7c542d8c4c83d3f1f306762` | PinTask/ReadTask/ReadAgent/usage targeted |
| C16 | `native/huhubot/internal/adapters/outbound/sqlite/usage/store.go` | `6600cf9abfae1cd463dccb8acbd86cb4e186bf0dacfcc06faf288a43d1e2d3a6` | claim/binder/current/account/Reserve/Dispatch targeted |
| C17 | `native/huhubot/internal/adapters/outbound/sqlite/usage/budget.go` | `eba52849e031e1a0993f3e5a60ef8aa4ac996ce9568c227c2b1101b44dd5cef8` | full |
| C18 | `native/huhubot/internal/adapters/outbound/sqlite/grants/access.go` | `ade097d0afe156fc3e2a33fb22798f537d5218aab3ab4c98a736105ae0c873b8` | full |
| C19 | `native/huhubot/internal/adapters/outbound/sqlite/grants/delivery.go` | `d995051c87ebc1eeedf0b679f9b8f56adea4e9faedcb60da7b76b5202d3c8e87` | full |
| C20 | `native/huhubot/internal/application/access/grants/service.go` | `8a8af95f70833230f3d7ee0ef679f787cd4984e5f077b36c934f454a845bd324` | validation/operation set targeted |
| C21 | `native/huhubot/internal/application/access/context/service.go` | `49854b78cfedbc531f537eeb2715f47ca6842c2a02de5a78a2eabb272ea425de` | Validate/lease/admission/prepare/history targeted; reused108 remainder |
| C22 | `native/huhubot/internal/adapters/outbound/sqlite/recovery/snapshot.go` | `4343bf672ddfa00d26a9910b9ce2ed598be1d370e6560b33314c12503aac58c6` | full |
| C23 | `native/huhubot/internal/adapters/outbound/sqlite/recovery/commands.go` | `95af93402451b1150732c89c8c8df655d95c198552d84c63cd1fe148c54a3adb` | current/Get targeted |
| C24 | `native/huhubot/internal/adapters/outbound/sqlite/events/store.go` | `c0cd01a78ff2802cd83e20181de554e73478ac82f5a825d7d2f4cc3b95201908` | WithDelivery and message batch reader targeted |
| C25 | `native/huhubot/internal/application/execution/events/service.go` | `67b6a9bb8ae6f46da621be7cf329f22f79d1f378b845a015d36ec867bf6ce3ee` | full |
| C26 | `native/huhubot/internal/adapters/inbound/stdio/server.go` | `3404bd3043f9d54af2037937408c9f2e7c08f07a76fa1677142773ff20419076` | deliver/mergeDeliverySubjects targeted |
| C27 | `native/huhubot/internal/adapters/outbound/eino/common/engine.go` | `b906da361ba1e543c1b1abdfc1fec567d1af1116ab01506ef8070a3bc23d4773` | Run/Resume/initial input/loop targeted |
| C28 | `native/huhubot/internal/adapters/outbound/eino/common/checkpoint.go` | `291168afac790301af8186be202fb13990b41acfe57e207986d2d0411d387c0a` | legacyDTO/readState/Inspector targeted and reused108 current |
| C29 | `native/huhubot/internal/adapters/outbound/eino/common/protocol.go` | `31bc1acce212f8c918711702af1693beedfbc878d47a3d6ddf8514c5ae1ecbe2` | pre118 full; post118 literals/unchanged signature targeted |
| C30 | `native/huhubot/internal/adapters/outbound/eino/common/registry.go` | `8a9a50e6d716a2bff84bdfb33835903545c33fce13ed09dad024383d23486db1` | pre118 reused108 full; post118 exact tuple targeted |
| C31 | `native/huhubot/internal/bootstrap/core.go` | `d271ab45e892c0a73e93863e5c21526096535469e51874a530a9b1ad38f7f807` | default assembly reused108; RequestStop/drain/Done targeted |
| C32 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/embed.go` | `3897535ff94f2450c166c3e2a34bfc9dad6d0ce9cc494e64462d490c832f2699` | full |
| C33 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/011-delegation.sql` | `2f06a87748f79e1405e63655a0b00364bf5391ee95ab1b7a764767ff34b5886d` | full |
| C34 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/013-groups.sql` | `26f23f3bae8d6db44c8d9df0510f77278854ac0de679c90a7a3e22a6bd89f2a1` | full |
| W01 | `src/modules/huhubot/api.ts` | `ff921139bdd82f2c6e2b83892fc499489ccef93183e7f827fe6709ec4697a401` | MemoryItem/eight reserved methods targeted |
| W02 | `contracts/hap/v0.1/methods.json` | `d110ecaca8f535c69c81d9ec39f2815ae82eb8c6f97dabe57074ba5246f2465b` | eight memory entries via Python read/JSON |
| W03 | `contracts/hap/v0.1/schema.json` | `a4daa358204d607614ddd15f62aeede4f0e161fe31498cee55c43dc7540de534` | memory correct/auto/propose params via Python read/JSON |
| W04 | `contracts/hap/v0.1/generate.mjs` | `7499c603ed15eb2b899913a9e745ba9929e75906d244f7af46b21addc264cfe4` | input/implemented set/actual six output targets targeted |
