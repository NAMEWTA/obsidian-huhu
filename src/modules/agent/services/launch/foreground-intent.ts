/** A short-lived display permission, independent of launch/approval permission. */
export interface ForegroundIntent {
	valid(): boolean;
	dispose(): void;
	/** One synchronous focus inside the original leaf; independent of legacy valid/dispose. */
	commitFocus?(element: HTMLElement, focus: () => void): boolean;
	/** Owned confirmation dialogs may move focus without granting a new foreground target. */
	allowWithin?(element: HTMLElement): () => void;
}

export interface ForegroundScope {
	readonly document: Document;
	readonly window: Window;
	readonly container?: HTMLElement;
	isCurrent(): boolean;
	onTargetChange(listener: () => void): () => void;
}

/** User activity can revoke display permission while the launch itself keeps running. */
export function captureForegroundIntent(scope: ForegroundScope): ForegroundIntent {
	let current = true;
	let released = false;
	let consumed = false;
	const anchor = scope.document.activeElement;
	const allowed = new Set<HTMLElement>();
	const inside = (target: EventTarget | null) =>
		!!target && [...allowed].some((root) => root === target || root.contains(target as Node));
	const revoke = () => {
		current = false;
	};
	const activity = (event: Event) => {
		if (!inside(event.target)) revoke();
	};
	const focus = (event: Event) => {
		if (event.target !== anchor && !inside(event.target)) revoke();
	};
	scope.document.addEventListener('pointerdown', activity, true);
	scope.document.addEventListener('keydown', activity, true);
	scope.document.addEventListener('focusin', focus, true);
	scope.window.addEventListener('blur', revoke);
	const offTarget = scope.onTargetChange(revoke);
	const dispose = () => {
		if (released) return;
		released = true;
		scope.document.removeEventListener('pointerdown', activity, true);
		scope.document.removeEventListener('keydown', activity, true);
		scope.document.removeEventListener('focusin', focus, true);
		scope.window.removeEventListener('blur', revoke);
		offTarget();
		allowed.clear();
	};
	return {
		valid: () => current && scope.isCurrent(),
		allowWithin: (element) => {
			allowed.add(element);
			return () => {
				allowed.delete(element);
			};
		},
		dispose,
		commitFocus(element, focusTarget) {
			if (
				released ||
				consumed ||
				!current ||
				!scope.isCurrent() ||
				!scope.container ||
				element.ownerDocument !== scope.document ||
				scope.document.defaultView !== scope.window ||
				!element.isConnected ||
				!scope.container.isConnected ||
				!scope.container.contains(element)
			)
				return false;
			consumed = true;
			dispose();
			focusTarget();
			return true;
		},
	};
}
