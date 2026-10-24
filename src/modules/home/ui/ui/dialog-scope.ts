import { Scope, type App } from 'obsidian';
const dialogs = new WeakMap<App, Set<() => void>>();
const owners = new WeakMap<App, Map<unknown, Set<() => void>>>();
/** Native hotkey scopes keep a prompt's Escape from reaching a parent Modal. */
export function ownDialog(app: App | undefined, cancel: () => void, owner?: unknown, captureEscape = true): () => void {
	if (!app?.keymap) return () => {};
	let active = dialogs.get(app);
	if (!active) {
		active = new Set();
		dialogs.set(app, active);
	}
	active.add(cancel);
	if (owner !== undefined) {
		const map = owners.get(app) ?? new Map<unknown, Set<() => void>>();
		const set = map.get(owner) ?? new Set<() => void>();
		set.add(cancel); map.set(owner, set); owners.set(app, map);
	}
	const scope = captureEscape ? new Scope(app.scope) : undefined;
	scope?.register([], 'Escape', () => {
		cancel();
		return false;
	});
	if (scope) app.keymap.pushScope(scope);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		if (scope) app.keymap.popScope(scope);
		active.delete(cancel);
		const owned = owners.get(app)?.get(owner);
		owned?.delete(cancel);
		if (owned?.size === 0) owners.get(app)?.delete(owner);
	};
}
export function closeDashboardDialogs(app: App): void {
	for (const cancel of [...(dialogs.get(app) ?? [])]) cancel();
	dialogs.delete(app);
	owners.delete(app);
}
