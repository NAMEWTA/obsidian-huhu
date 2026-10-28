FILE huhu/档案/企业档案/Example/基本信息.md
---
huhu-type: archive-record
huhu-id: company-001
name: "Example"
region: ""
website: ""
aliases: []
phones: []
emails: []
tags: []
huhu-format-version: 2
huhu-archive-type-id: type-company
huhu-schema-revision: r-92a3f73d47c7309b9d1b72a0a58183715c004858
huhu-created-at: null
huhu-updated-at: 2026-10-27T00:00:00.000Z
huhu-state: active
huhu-migration-id: migration-company-001
huhu-migration-relations: []
huhu-migration-supersedes: []
---

# Example

## Notes

<!-- huhu:notes -->
Original company notes
<!-- /huhu:notes -->

![source attachment](source.pdf)

<!-- huhu:field notes -->
Original company notes
<!-- /huhu:field notes -->


FILE huhu/档案/迁移记录/migration-company-001.md
---
huhu-type: archive-migration
huhu-format-version: 2
plan:
  migrationId: migration-company-001
  operationId: migration-company-001
  root: huhu/档案
  ownerId: company-001
  kind: company
  ownerPath: huhu/档案/企业档案/Example/基本信息.md
  sourceHash: ec41b022d923a067c324e08d4ab77217f7a2b86360d5da9b7089e5bc3437710b
  supersedes: []
  backupPath: huhu/档案/迁移恢复/migration-company-001/原始.md
  type:
    typeId: type-company
    label: Companies
    folder: 企业档案
    titleFieldId: name
    fields:
      - fieldId: name
        storageKey: name
        label: Name
        codec: text
      - fieldId: region
        storageKey: region
        label: Current region
        codec: text
      - fieldId: website
        storageKey: website
        label: Website
        codec: text
      - fieldId: aliases
        storageKey: aliases
        label: Aliases
        codec: string-list
      - fieldId: phones
        storageKey: phones
        label: Phone numbers
        codec: string-list
      - fieldId: emails
        storageKey: emails
        label: Email addresses
        codec: string-list
      - fieldId: tags
        storageKey: tags
        label: Tags
        codec: string-list
      - fieldId: notes
        storageKey: legacy-notes
        label: notes
        codec: markdown
    revisionId: r-92a3f73d47c7309b9d1b72a0a58183715c004858
    parentRevisionIds: []
    displayVersion: 1
    contentHash: e305b6cb639c157f3ed44b149baffd1cdd3cb2a1282171e8bbc7e0065eacf10f
  owner:
    path: huhu/档案/企业档案/Example/基本信息.md
    raw: |
      ---
      huhu-type: archive-record
      huhu-id: company-001
      name: "Example"
      region: ""
      website: ""
      aliases: []
      phones: []
      emails: []
      tags: []
      huhu-format-version: 2
      huhu-archive-type-id: type-company
      huhu-schema-revision: r-92a3f73d47c7309b9d1b72a0a58183715c004858
      huhu-created-at: null
      huhu-updated-at: 2026-10-27T00:00:00.000Z
      huhu-state: active
      huhu-migration-id: migration-company-001
      huhu-migration-relations: []
      huhu-migration-supersedes: []
      ---

      # Example

      ## Notes

      <!-- huhu:notes -->
      Original company notes
      <!-- /huhu:notes -->

      ![source attachment](source.pdf)

      <!-- huhu:field notes -->
      Original company notes
      <!-- /huhu:field notes -->
    hash: aeaac7faa71f5794f8b299758d66f142b01b85271f5dc19641b38cfe6411c655
  relations: []
  dependencies:
    - path: huhu/档案/档案定义/类型/type-company/修订/r-92a3f73d47c7309b9d1b72a0a58183715c004858.md
      hash: 31b0d86d6c0a501c612623a7ca9eb123a5c2ef8e14ec648b79a8b5a7d1b6c3c6
    - path: huhu/档案/档案定义/类型/type-company/当前.md
      hash: 9e73ae135095b12db86c77fc1417844c2e8ff056a25966c5dd0e9ac96b5f009d
  hash: 30bedb423b593a0aeee0ff697c8f91470fc4843eafeaf7244472fed1f17690e1
---


FILE huhu/档案/迁移恢复/migration-company-001/原始.md
---
huhu-type: company
huhu-id: company-001
name: Example
region: ""
website: ""
aliases: []
phones: []
emails: []
tags: []
---

# Example

## Notes

<!-- huhu:notes -->
Original company notes
<!-- /huhu:notes -->

![source attachment](source.pdf)


FILE huhu/档案/迁移记录/migration-company-001-完成.md
---
huhu-type: archive-migration-complete
huhu-format-version: 2
huhu-plan-hash: 30bedb423b593a0aeee0ff697c8f91470fc4843eafeaf7244472fed1f17690e1
huhu-migration-id: migration-company-001
---
