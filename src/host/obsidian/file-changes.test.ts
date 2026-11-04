import { afterEach, expect, test, vi } from 'vitest';
import { TFile, TFolder, type App } from 'obsidian';
import { DomainEvents } from '../../shared/events/domain-events';
import { FILE_CHANGES, FileChanges, type FileChangeBatch } from './file-changes';

class Source {
	private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
	on(name: string, handler: (...args: unknown[]) => void) {
		const set = this.listeners.get(name) ?? new Set();
		this.listeners.set(name, set); set.add(handler);
		return { name, handler };
	}
	offref(ref: { name: string; handler: (...args: unknown[]) => void }) { this.listeners.get(ref.name)?.delete(ref.handler); }
	emit(name: string, ...args: unknown[]) { for (const handler of this.listeners.get(name) ?? []) handler(...args); }
	get size() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
const file = (path: string) => Object.assign(new TFile(), { path, extension: path.split('.').pop(), stat: { mtime: 1, size: 1 } });
const folder = (path: string) => Object.assign(new TFolder(), { path, children: [] });
function setup(options = {}) {
	vi.useFakeTimers();
	const vault = new Source(), metadataCache = new Source(), events = new DomainEvents(), batches: FileChangeBatch[] = [];
	events.on(FILE_CHANGES, batch => { batches.push(batch); });
	const adapter = new FileChanges({ vault, metadataCache } as unknown as App, events, options, {
		set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>), now: Date.now,
	});
	return { vault, metadataCache, events, batches, adapter };
}
afterEach(() => { vi.useRealTimers(); });

test('publishes raw changes, metadata readiness, directory moves and md to non-md renames separately', () => {
	const f = setup();
	f.vault.emit('modify', file('root/a.md'));
	f.metadataCache.emit('changed', file('root/a.md'));
	f.vault.emit('rename', file('out/a.txt'), 'root/a.md');
	f.vault.emit('rename', folder('out/folder'), 'root/folder');
	vi.advanceTimersByTime(40);
	expect(f.batches).toEqual([{ rescan: false, changes: [
		{ kind: 'modify', path: 'root/a.md', folder: false },
		{ kind: 'metadata', path: 'root/a.md', folder: false },
		{ kind: 'rename', path: 'out/a.txt', oldPath: 'root/a.md', folder: false },
		{ kind: 'rename', path: 'out/folder', oldPath: 'root/folder', folder: true },
	] }]);
	f.adapter.dispose();
});

test('coalesces modify storms with a maximum wait and preserves delete/recreate order', () => {
	const f = setup({ debounceMs: 40, maxWaitMs: 100 });
	for (let i = 0; i < 5; i++) { f.vault.emit('modify', file('a.md')); vi.advanceTimersByTime(20); }
	expect(f.batches).toHaveLength(1);
	expect(f.batches[0]!.changes).toEqual([{ kind: 'modify', path: 'a.md', folder: false }]);
	f.vault.emit('create', file('a.md'));
	f.vault.emit('delete', file('a.md'));
	f.vault.emit('create', file('a.md'));
	f.adapter.flush();
	expect(f.batches[1]!.changes.map(change => change.kind)).toEqual(['delete', 'create']);
	f.adapter.dispose();
});

test('overflow stays bounded and delivers a conservative rescan instead of incomplete detail', () => {
	const f = setup({ capacity: 2 });
	for (let i = 0; i < 1000; i++) f.vault.emit('modify', file(`${i}.md`));
	f.adapter.flush();
	expect(f.batches).toEqual([{ changes: [], rescan: true }]);
	f.vault.emit('create', file('fresh.md'));
	f.adapter.flush();
	expect(f.batches[1]!.changes).toHaveLength(1);
	f.adapter.dispose();
});

test('dispose unregisters both event sources and cancels pending or late delivery', () => {
	const f = setup();
	expect(f.vault.size).toBe(4);
	expect(f.metadataCache.size).toBe(1);
	f.vault.emit('create', file('a.md'));
	f.adapter.dispose(); f.adapter.dispose();
	f.vault.emit('modify', file('a.md'));
	f.metadataCache.emit('changed', file('a.md'));
	vi.runAllTimers(); f.adapter.flush();
	expect(f.batches).toEqual([]);
	expect(f.vault.size + f.metadataCache.size).toBe(0);
	expect(vi.getTimerCount()).toBe(0);
});

test('partial host subscription failure releases listeners already acquired', () => {
	const vault = new Source(), metadataCache = new Source(), events = new DomainEvents();
	const on = vault.on.bind(vault);
	vault.on = (name, handler) => { if (name === 'modify') throw new Error('host failure'); return on(name, handler); };
	expect(() => new FileChanges({ vault, metadataCache } as unknown as App, events)).toThrow('host failure');
	expect(vault.size + metadataCache.size).toBe(0);
});
