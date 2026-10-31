=== .huhu/automation/definitions/Bound-backup-1-script/操作.md ===
---
huhu-type: automation
huhu-id: auto-0000-0001-script
id: auto-0000-0001-script
name: Bound backup
enabled: false
deviceId: device-a
revision: 1
channels:
  - in-app
  - system
notifyOn: always
graceMinutes: 60
createdAt: 1790000000000
updatedAt: 1790000000000
action: script
cwd: ""
shell: bash
spaceId: a1b2c3d4-0000-4000-8000-000000000002
schedule: once
at: 2026-10-10T02:00:00.000Z
---

<!-- huhu:script -->
echo ok
<!-- /huhu:script -->

=== .huhu/automation/definitions/Bound-summary-01-agent/操作.md ===
---
huhu-type: automation
huhu-id: auto-0000-0001-agent
id: auto-0000-0001-agent
name: Bound summary
enabled: true
deviceId: device-a
revision: 3
channels:
  - in-app
notifyOn: failure
graceMinutes: 720
createdAt: 1790000000000
updatedAt: 1790000500000
action: agent
agentId: codex
cwd: ""
sessionMode: fresh
spaceId: a1b2c3d4-0000-4000-8000-000000000001
schedule: recurring
repeat: 0 9 * * 1-5
start: 2026-10-01T13:00:00.000Z
timezone: Asia/Shanghai
---

<!-- huhu:prompt -->
Summarize.
<!-- /huhu:prompt -->

=== read back ===
{
	"definitions": [
		{
			"name": "Bound summary",
			"enabled": true,
			"deviceId": "device-a",
			"revision": 3,
			"graceMinutes": 720,
			"channels": [
				"in-app"
			],
			"notifyOn": "failure",
			"createdAt": 1790000000000,
			"updatedAt": 1790000500000,
			"id": "auto-0000-0001-agent",
			"action": {
				"kind": "agent",
				"agentId": "codex",
				"cwd": "",
				"prompt": "Summarize.",
				"sessionMode": "fresh",
				"spaceId": "a1b2c3d4-0000-4000-8000-000000000001"
			},
			"schedule": {
				"kind": "recurring",
				"expression": "0 9 * * 1-5",
				"start": 1790859600000,
				"timezone": "Asia/Shanghai"
			}
		},
		{
			"name": "Bound backup",
			"enabled": false,
			"deviceId": "device-a",
			"revision": 1,
			"graceMinutes": 60,
			"channels": [
				"in-app",
				"system"
			],
			"notifyOn": "always",
			"createdAt": 1790000000000,
			"updatedAt": 1790000000000,
			"id": "auto-0000-0001-script",
			"action": {
				"kind": "script",
				"script": "echo ok",
				"cwd": "",
				"shell": "bash",
				"spaceId": "a1b2c3d4-0000-4000-8000-000000000002"
			},
			"schedule": {
				"kind": "once",
				"at": 1791597600000
			}
		}
	]
}
