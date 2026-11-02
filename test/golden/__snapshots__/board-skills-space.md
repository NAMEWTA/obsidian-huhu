---
custom: keep # author
skills:
  - id: legacy
    label: Legacy
    agentId: codex
    skillName: review
    promptTemplate: "{{input}}"
    directSend: false
    destination:
      kind: fresh
      cwd: ""
  - id: bound
    label: Bound
    agentId: codex
    skillName: review
    promptTemplate: "{{input}}"
    directSend: false
    destination:
      kind: fresh
      cwd: ""
      spaceId: a1b2c3d4-0000-4000-8000-000000000001
---

<!-- My notes -->
