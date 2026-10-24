import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root = pathToFileURL(process.cwd() + '/');
const { SyncEngine } = await import(new URL('src/modules/home/platform/board/sync.ts', root));
const { parse, serialize } = await import(new URL('src/modules/home/core/board/parser/index.ts', root));
const { generateDefaultMarkdown } = await import(new URL('src/modules/home/core/board/parser/default-document.ts', root));
const { memoryVault } = await import(new URL('scripts/fixtures/memory-vault.ts', root));
globalThis.window = globalThis;
const boardPath = '.huhu/dashboards/Board.md';
// The board's own fields stand in for the old banner: the local edit is the first quick action's name, the external edit is the
// first quick-action order key.
const original = parse(generateDefaultMarkdown());
original.quickActionOrder = ['ORIGINAL-AUTHOR'];
let disk = serialize(original);
const backup = new Map();
let entering, release;
const entered = new Promise((r) => (entering = r)),
	gate = new Promise((r) => (release = r));
let hold = true;
const fixture = memoryVault({ [boardPath]: disk });
const app = fixture.app, file = fixture.file(boardPath);
const write = fixture.adapter.write;
fixture.adapter.write = async (p, text) => {
	if (p === boardPath) disk = text;
	else {
		if (hold) { hold = false; entering(); await gate; }
		backup.set(p, text);
	}
	await write(p, text);
};
app.vault.modify = async (file, text) => { disk = text; await write(file.path, text); fixture.emit('modify', file); };
const engine = new SyncEngine(app, { dashboardFile: '.huhu/dashboards/Board' });
await engine.init();
const setLocal = (target, name) =>
	target.replaceData({ ...target.getData(), quickActions: [{ name, icon: 'file-text', type: 'file', target: 'x.md' }] });
const oldAuthor = parse(disk).quickActionOrder?.[0];
const update = setLocal(engine, 'LOCAL-QUOTE-CHANGE');
const rejected = assert.rejects(update);
await entered;
const outside = parse(disk);
outside.quickActionOrder = ['EXTERNAL-AUTHOR-CHANGE'];
await app.vault.modify(file, serialize(outside));
release();
await rejected;
await engine.writeQueue;
await new Promise((r) => setTimeout(r, 350));
assert.equal(parse(disk).quickActionOrder?.[0], 'EXTERNAL-AUTHOR-CHANGE');
assert.equal(engine.getData().quickActions[0]?.name, 'LOCAL-QUOTE-CHANGE');
const recovery = JSON.parse([...backup.entries()].find(([name]) => name.includes('/conflicts/'))[1]);
assert.ok(recovery.local.includes('LOCAL-QUOTE-CHANGE'));
assert.ok(recovery.remote.includes('EXTERNAL-AUTHOR-CHANGE'));
assert.ok(recovery.base.includes(oldAuthor));
// Further local edits while blocked update the protected recovery copy.
await assert.rejects(setLocal(engine, 'LATER-LOCAL-EDIT'));
assert.ok(
	JSON.parse([...backup.entries()].find(([name]) => name.includes('/conflicts/'))[1]).local.includes(
		'LATER-LOCAL-EDIT',
	),
);
await engine.reloadFromDisk();
assert.equal(engine.getData().quickActionOrder?.[0], 'EXTERNAL-AUTHOR-CHANGE');
await setLocal(engine, 'AFTER-REVIEW');
assert.equal(parse(disk).quickActions[0]?.name, 'AFTER-REVIEW');
assert.equal(parse(disk).quickActionOrder?.[0], 'EXTERNAL-AUTHOR-CHANGE');
// Backup failure must retain local edits even when an external modify event arrives.
const writeBackup = app.vault.adapter.write;
app.vault.adapter.write = async () => {
	throw Error('backup unavailable');
};
await assert.rejects(setLocal(engine, 'RETRY-AFTER-BACKUP-FAILURE'), /backup unavailable/);
const changed = parse(disk);
changed.quickActionOrder = ['SECOND-EXTERNAL-EDIT'];
await app.vault.modify(file, serialize(changed));
await new Promise((r) => setTimeout(r, 350));
assert.equal(engine.getData().quickActions[0]?.name, 'RETRY-AFTER-BACKUP-FAILURE');
assert.equal(parse(disk).quickActionOrder?.[0], 'SECOND-EXTERNAL-EDIT');
app.vault.adapter.write = writeBackup;
await assert.rejects(setLocal(engine, 'RETRY-AFTER-BACKUP-FAILURE'));
assert.ok(
	[...backup.values()].some(
		(text) => text.includes('RETRY-AFTER-BACKUP-FAILURE') && text.includes('SECOND-EXTERNAL-EDIT'),
	),
);
await engine.reloadFromDisk();
await setLocal(engine, 'RECOVERED');
assert.equal(parse(disk).quickActions[0]?.name, 'RECOVERED');
engine.destroy();
console.log('Dashboard conflict: external file and local recovery preserved; reload resumes safe writes');
