/** Module-lifetime UI drafts. Settings category unmounts do not cancel or publish them; explicit discard and module disposal clear them. */
export class ArchiveDraftOwner {
	private values = new Map<string, unknown>();
	private listeners = new Map<string, Set<() => void>>();
	private active = true;
	get<T>(key: string, initial: T): T {
		if (!this.active) return initial;
		return this.values.has(key) ? this.values.get(key) as T : initial;
	}
	seed<T>(key: string, initial: T): void {
		if (this.active && !this.values.has(key)) this.values.set(key, initial);
	}
	set<T>(key: string, initial: T, update: T | ((value: T) => T)): void {
		if (!this.active) return;
		const previous = this.get(key, initial);
		const next = typeof update === 'function' ? (update as (value: T) => T)(previous) : update;
		if (Object.is(previous, next)) return;
		this.values.set(key, next);
		for (const listener of this.listeners.get(key) ?? []) listener();
	}
	subscribe(key: string, listener: () => void): () => void {
		const listeners = this.listeners.get(key) ?? new Set<() => void>();
		this.listeners.set(key, listeners); listeners.add(listener);
		return () => { listeners.delete(listener); if (!listeners.size) this.listeners.delete(key); };
	}
	clearScope(scope: string): void {
		for (const key of [...this.values.keys()]) if (key.startsWith(scope + '/')) {
			this.values.delete(key);
			for (const listener of this.listeners.get(key) ?? []) listener();
		}
	}
	dispose(): void {
		this.active = false; this.values.clear(); this.listeners.clear();
	}
}
