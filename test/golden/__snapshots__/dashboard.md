=== template ===
---
dashboard: true
quickActions:
  - name: "Projects"
    icon: "file-text"
    type: file
    target: "projects/index.md"
  - name: "Journal"
    icon: "file-text"
    type: file
    target: "journal/index.md"
  - name: "Reading List"
    icon: "file-text"
    type: file
    target: "reading/index.md"
columns:
  - name: "Memo"
    color: "#f59e0b"
    type: memo
  - name: "Todo"
    color: "#6366f1"
    type: todo
  - name: "Projects"
    color: "#10b981"
    type: projects
---

## Memo

### 2025-05-13 memo
id: card-t1e8pi
type: generic
Today I started building the Obsidian dashboard plugin. The glassmorphism UI looks great.

### 2025-05-12 memo
id: card-qwjjuf
type: generic
Read an interesting article about productivity systems. Key insight: small consistent habits beat big sporadic efforts.

## Todo

### 待办清单
id: card-o5qy9
type: task
due: 2025-05-20
- [ ] Review dashboard plugin code
- [ ] Write documentation
- [ ] Test on mobile device
- [ ] Fix dark mode colors

### Weekly review
id: card-t88x5v
type: task
- [x] Check project status
- [ ] Update roadmap
- [ ] Clean up old notes

## Projects

### Obsidian Dashboard
id: card-ykvown
type: project
progress: 60%
- [[obsidian-dashboard/README.md]]
- [[obsidian-dashboard/src/main.ts]]

### Personal Website
id: card-c6s9g5
type: project
progress: 30%
- [[personal-website/index.md]]
- [[personal-website/design.md]]

### Learning Rust
id: card-nq6by8
type: project
progress: 15%
- [[rust-learning/notes.md]]

=== default ===
---
dashboard: true
widgets: [{"memberId":"home:calendar:default","provider":"home","kind":"calendar","instanceId":"default"},{"memberId":"home:clock:default","provider":"home","kind":"clock","instanceId":"default","weather":{"cityName":"Shanghai","latitude":31.23,"longitude":121.47}},{"memberId":"home:pomodoro:default","provider":"home","kind":"pomodoro","instanceId":"default"},{"memberId":"home:usage:default","provider":"home","kind":"usage","instanceId":"default"},{"memberId":"home:quick-actions:default","provider":"home","kind":"quick-actions","instanceId":"default"},{"memberId":"task:tasks:default","provider":"task","kind":"tasks","instanceId":"default"}]
grid: {"v":2,"lg":[{"i":"widget:calendar","x":0,"y":0,"w":6,"h":4},{"i":"widget:clock","x":0,"y":4,"w":6,"h":2},{"i":"widget:pomodoro","x":6,"y":4,"w":3,"h":2},{"i":"widget:usage","x":9,"y":4,"w":3,"h":2},{"i":"widget:quickActions","x":6,"y":10,"w":6,"h":2},{"i":"widget:task:tasks:default","x":6,"y":0,"w":6,"h":4},{"i":"section:收件箱","x":0,"y":10,"w":6,"h":2},{"i":"section:项目","x":0,"y":6,"w":12,"h":4}]}
columns:
  - name: "收件箱"
    color: "#f59e0b"
    type: memo
  - name: "项目"
    color: "#10b981"
    type: projects
---

## 收件箱

## 项目
