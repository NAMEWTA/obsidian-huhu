import { SyncEngine } from '../src/modules/home/platform/board/sync';
import { memoryVault } from './fixtures/memory-vault';
import type { DashboardSettings } from '../src/modules/home/core/board/types/index';
import { strict as assert } from 'node:assert';
import { parse, serialize, extractCardParts } from '../src/modules/home/core/board/parser/index';
import { moveDashboardCard, memoCardText } from '../src/modules/home/platform/board/card-move';

const initial = parse(`---
columns:
  - name: 记录
    type: memo
  - name: 清单
    type: todo
  - name: 便签
    type: sticky
---
## 记录
### 想法
id: memo-1
color: aabbcc
第一条想法
第二条 [[笔记]]
## 清单
### 事项
id: todo-1
type: task
- [x] 完成事项
    - [ ] 子任务 \u23f0 2026-09-15 09:00
## 便签
`);
const snapshot = serialize(initial);
const find = (data: typeof initial, id: string) => data.columns.flatMap((c) => c.cards).find((c) => c.id === id)!;
for (const id of ['memo-1', 'todo-1']) {
	const moved = moveDashboardCard(initial, id, '便签', 0);
	assert.equal(find(moved, id).type, id === 'memo-1' ? 'generic' : 'task');
	assert.equal(find(moved, id).column, '便签');
	assert.equal(moved.columns.flatMap((c) => c.cards).filter((c) => c.id === id).length, 1);
	assert.equal(find(parse(serialize(moved)), id).type, find(moved, id).type);
}
const memo = moveDashboardCard(initial, 'todo-1', '记录', 0);
assert.equal(find(memo, 'todo-1').type, 'generic');
assert.match(memoCardText(find(memo, 'todo-1')), /- \[x\] 完成事项/);
const restoredMemo = parse(serialize(memo));
assert.equal(find(restoredMemo, 'todo-1').type, 'generic');
assert.match(memoCardText(find(restoredMemo, 'todo-1')), /子任务/);
const taskAgain = moveDashboardCard(restoredMemo, 'todo-1', '清单', 0);
assert.equal(find(taskAgain, 'todo-1').tasks[0]?.checked, true);
assert.equal(find(taskAgain, 'todo-1').tasks[0]?.children?.[0]?.reminder, '2026-09-15 09:00');
const todo = moveDashboardCard(initial, 'memo-1', '清单', 0);
assert.equal(find(todo, 'memo-1').type, 'task');
assert.equal(find(todo, 'memo-1').tasks.length, 2);
assert.equal(find(todo, 'memo-1').color, '#aabbcc');
assert.ok(find(todo, 'memo-1').tasks.some((t) => t.text.includes('[[笔记]]')));
assert.equal(moveDashboardCard(initial, 'memo-1', '不存在', 0), initial);
assert.equal(moveDashboardCard(initial, 'missing', '便签', 0), initial);
assert.equal(moveDashboardCard(initial, 'memo-1', '便签', NaN), initial);
assert.equal(serialize(initial), snapshot, 'input is not mutated');
const nested = extractCardParts('- [ ] A\n    - [ ] B\n        - [x] C\n    - [ ] D');
assert.equal(nested.tasks[0]?.children?.[0]?.children?.[0]?.text, 'C');
assert.equal(nested.tasks[0]?.children?.[1]?.text, 'D');
for (const sectionType of ['projects', 'notes']) {
	const noteData = {
		...initial,
		columns: [
			...initial.columns,
			{
				name: '笔记区',
				sectionType,
				color: '#fff',
				cards: [
					{
						...find(initial, 'memo-1'),
						id: 'note-1',
						column: '笔记区',
						type: 'project' as const,
						wikiLink: '原笔记',
						coverImage: 'cover.png',
						docs: [{ path: '附件', children: [{ path: '附件子项' }] }],
					},
				],
			},
		],
	};
	const stickyNote = moveDashboardCard(noteData, 'note-1', '便签', 0);
	const persisted = find(parse(serialize(stickyNote)), 'note-1');
	assert.equal(persisted.type, 'project');
	assert.equal(persisted.noteStyle, sectionType === 'notes' ? 'plain' : 'cover');
	assert.equal(persisted.coverImage, 'cover.png');
	assert.equal(persisted.wikiLink, '原笔记');
	const memoNote = find(parse(serialize(moveDashboardCard(noteData, 'note-1', '记录', 0))), 'note-1');
	assert.equal(memoNote.type, 'generic');
	assert.match(memoCardText(memoNote), /原笔记/);
	assert.equal(memoNote.docs[0]?.children?.[0]?.path, '附件子项');
	const todoNote = find(parse(serialize(moveDashboardCard(noteData, 'note-1', '清单', 0))), 'note-1');
	assert.equal(todoNote.type, 'task');
	assert.ok(todoNote.tasks.some((t) => t.text === '[[原笔记]]'));
	assert.ok(todoNote.tasks.some((t) => t.children?.[0]?.text === '[[附件子项]]'));
}
process.stdout.write('verify-card-move: note appearance and linked documents OK\n');
process.stdout.write('verify-card-move: move, conversion, content retention and persistence OK\n');

async function verifySync(): Promise<void> {
	const previousWindow = globalThis.window;
	globalThis.window = { setTimeout, clearTimeout } as unknown as Window & typeof globalThis;
	// Exercise legacy card editing after the one-time widget migration. The
	// migration itself has a real multi-file vault fixture in widget-migration.test.ts.
	let disk = serialize({ ...initial, widgetMigration: 1 });
	let writes = 0;
	const boardPath = '.huhu/dashboards/test-board.md';
	const { app, contents, adapter } = memoryVault({ [boardPath]: disk });
	const transformFile = adapter.process;
	adapter.process = async (path, transform) => {
		const text = await transformFile(path, transform);
		disk = contents.get(boardPath)!;
		writes++;
		return text;
	};
	const sync = new SyncEngine(app, { dashboardFile: '.huhu/dashboards/test-board' } as DashboardSettings);
	await sync.init();
	await sync.moveCard('todo-1', '记录', 0);
	await new Promise<void>((resolve) => setImmediate(resolve));
	assert.equal(find(parse(disk), 'todo-1').type, 'generic');
	assert.equal(parse(disk).columns.find((c) => c.name === '清单')?.cards.length, 0);
	const parts = extractCardParts(memoCardText(find(sync.getData()!, 'todo-1')).replace('完成事项', '已修改事项'));
	await sync.updateMemoCard('todo-1', {
		body: parts.cleanBody,
		blockquote: parts.blockquote,
		tasks: parts.tasks,
		docs: parts.docs,
	});
	await sync.moveCard('todo-1', '清单', 0);
	await new Promise<void>((resolve) => setImmediate(resolve));
	assert.equal(find(parse(disk), 'todo-1').tasks[0]?.text, '已修改事项');
	assert.equal(find(parse(disk), 'todo-1').tasks[0]?.checked, true);
	const before = writes;
	await sync.moveCard('todo-1', '不存在', 0);
	await new Promise<void>((resolve) => setImmediate(resolve));
	assert.equal(writes, before);
	await sync.close();
	globalThis.window = previousWindow;
	process.stdout.write('verify-card-move: sync write, edit and reload integration OK\n');
}
void verifySync().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
