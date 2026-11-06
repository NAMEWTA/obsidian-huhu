import {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
	useLayoutEffect,
	useRef,
	useSyncExternalStore,
	type ContextType,
	type CSSProperties,
	type ReactNode,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from 'react';
import { useOwnerDocument } from './contexts';
interface Entry {
	id: symbol;
	parent: symbol | null;
	content: HTMLElement | null;
	source: HTMLElement | null;
	region: HTMLElement | null;
	ownerRegion: HTMLElement | null;
	ownerParent: Entry | null;
	sourceCaptured: boolean;
}
interface Stack {
	entries: Entry[];
	version: number;
	listeners: Set<() => void>;
	contents: Set<Entry>;
	pendingRestores: Map<HTMLElement, () => void>;
}
const stacks = new WeakMap<Document, Stack>();
// Radix may defer an outside pointerdown until after its child modal has unmounted.
// Keep the original event's owner chain, rather than consulting the later DOM/top layer.
const pointerOwners = new WeakMap<Event, { doc: Document; origin: symbol; lowerOwners: ReadonlySet<symbol> }>();
const Context = createContext<{
	entry: Entry;
	layer: number;
	setContent: (node: HTMLElement | null) => void;
	captureSource: () => void;
	prepareFocus: () => void;
} | null>(null);
function stackFor(doc: Document): Stack {
	let stack = stacks.get(doc);
	if (!stack) {
		stack = { entries: [], version: 0, listeners: new Set(), contents: new Set(), pendingRestores: new Map() };
		stacks.set(doc, stack);
	}
	return stack;
}
function notify(stack: Stack) {
	stack.version++;
	for (const listener of stack.listeners) listener();
}
/** Each Document has one ordered modal stack; nested modals always follow their parent. */
export function ModalLayer({ open, children, modal = true }: { open: boolean; children: ReactNode; modal?: boolean }) {
	const doc = useOwnerDocument();
	const parent = useContext(Context);
	const stack = stackFor(doc);
	const ref = useRef<Entry | null>(null);
	if (!ref.current)
		ref.current = {
			id: Symbol('modal'),
			parent: parent?.entry.id ?? null,
			content: null,
			source: null,
			region: null,
			ownerRegion: null,
			ownerParent: null,
			sourceCaptured: false,
		};
	const entry = ref.current;
	entry.ownerParent = parent?.entry ?? null;
	const ownerAnchor = useCallback(
		(node: HTMLTemplateElement | null) => {
			// Retain the logical owner after a conditional Dialog unmounts. A destroyed page disconnects it.
			if (node) entry.ownerRegion = node.closest<HTMLElement>('.huhu-ui');
		},
		[entry],
	);
	useSyncExternalStore(
		(listener) => {
			stack.listeners.add(listener);
			return () => stack.listeners.delete(listener);
		},
		() => stack.version,
		() => stack.version,
	);
	useLayoutEffect(() => {
		if (!open || !modal) return;
		entry.parent = parent?.entry.id ?? null;
		const child = stack.entries.findIndex((item) => item.parent === entry.id);
		if (child >= 0) stack.entries.splice(child, 0, entry);
		else stack.entries.push(entry);
		notify(stack);
		return () => {
			const index = stack.entries.indexOf(entry);
			if (index >= 0) stack.entries.splice(index, 1);
			notify(stack);
		};
	}, [doc, entry, open, modal, stack, parent?.entry.id]);
	useLayoutEffect(
		() => () => {
			queueMicrotask(() => {
				const owner = owningRegion(entry);
				if (owner && (owner.ownerDocument !== doc || !liveOwner(owner))) stack.pendingRestores.get(owner)?.();
			});
		},
		[doc, entry, stack],
	);
	const index = stack.entries.indexOf(entry);
	const layer = index < 0 ? (parent?.layer ?? 30) + 10 : 40 + index * 10;
	const setContent = useCallback(
		(node: HTMLElement | null) => {
			if (entry.content === node) return;
			entry.content = node;
			if (node) stack.contents.add(entry);
			else stack.contents.delete(entry);
			notify(stack);
		},
		[entry, stack],
	);
	const captureSource = useCallback(() => {
		entry.source = doc.activeElement as HTMLElement | null;
		entry.region = entry.source?.closest<HTMLElement>('.huhu-ui') ?? null;
		entry.sourceCaptured = true;
	}, [doc, entry]);
	const prepareFocus = useCallback(() => {
		if (!entry.sourceCaptured) {
			entry.source = doc.activeElement as HTMLElement | null;
			entry.region = entry.source?.closest<HTMLElement>('.huhu-ui') ?? null;
		}
		entry.sourceCaptured = false;
	}, [doc, entry]);
	const value = useMemo(
		() => ({ entry, layer, setContent, captureSource, prepareFocus }),
		[entry, layer, setContent, captureSource, prepareFocus],
	);
	return (
		<Context.Provider value={modal ? value : parent}>
			<template ref={ownerAnchor} />
			{children}
		</Context.Provider>
	);
}

export function useModalOpener(): () => void {
	const context = useContext(Context);
	return () => context?.captureSource();
}
type FloatingOwnerValue = { entry: Entry | null; layer: number };
const FloatingContext = createContext<FloatingOwnerValue | null>(null);
function logicalLayer(modal: ContextType<typeof Context>, floating: FloatingOwnerValue | null): FloatingOwnerValue {
	if (modal && (!floating || floating.entry !== modal.entry || floating.layer < modal.layer))
		return { entry: modal.entry, layer: modal.layer };
	return floating ?? { entry: null, layer: 30 };
}
/** A retained React root can live inside a modal owned by another root. Only its physical owner grants that modal's layer. */
export function FloatingOwner({ children }: { children: ReactNode }) {
	const doc = useOwnerDocument();
	const modal = useContext(Context),
		inherited = useContext(FloatingContext),
		stack = stackFor(doc);
	const [anchor, setAnchor] = useState<HTMLTemplateElement | null>(null);
	useSyncExternalStore(
		(listener) => {
			stack.listeners.add(listener);
			return () => stack.listeners.delete(listener);
		},
		() => stack.version,
		() => stack.version,
	);
	const logical = logicalLayer(modal, inherited);
	const physical =
		anchor?.isConnected && anchor.ownerDocument === doc && anchor.parentElement && liveOwner(anchor.parentElement)
			? [...stack.entries]
					.reverse()
					.find(
						(entry) =>
							entry.content?.ownerDocument === doc && entry.content.contains(anchor) && liveOwner(entry.content),
					)
			: undefined;
	const physicalLayer = physical ? 40 + stack.entries.indexOf(physical) * 10 : 30;
	const value =
		physical && (physical !== logical.entry || physicalLayer > logical.layer)
			? { entry: physical, layer: physicalLayer }
			: logical;
	return (
		<FloatingContext.Provider value={value}>
			<template ref={setAnchor} />
			{children}
		</FloatingContext.Provider>
	);
}
export function useOverlayStyle(style?: CSSProperties, offset = 0): CSSProperties {
	const base = logicalLayer(useContext(Context), useContext(FloatingContext));
	return { ...style, '--hu-overlay-layer': base.layer + offset, zIndex: base.layer + offset } as CSSProperties;
}
export function FloatingLayer({ children }: { children: ReactNode }) {
	const base = logicalLayer(useContext(Context), useContext(FloatingContext));
	return <FloatingContext.Provider value={{ ...base, layer: base.layer + 1 }}>{children}</FloatingContext.Provider>;
}
export function useToastLayer(): number {
	const doc = useOwnerDocument();
	const stack = stackFor(doc);
	useSyncExternalStore(
		(listener) => {
			stack.listeners.add(listener);
			return () => stack.listeners.delete(listener);
		},
		() => stack.version,
		() => stack.version,
	);
	return 40 + stack.entries.length * 10 + 5;
}
const focusSelector =
	'button,a[href],input,textarea,select,summary,[tabindex],[contenteditable="true"],audio[controls],video[controls]';
/** Shared F6/restore predicate; Radix still owns Tab and the modal focus trap. */
function available(node: HTMLElement): boolean {
	return visibleAncestors(node, true);
}
/** Owner lifetime is independent of Radix hiding its live page behind a modal. */
function liveOwner(node: HTMLElement): boolean {
	return visibleAncestors(node, false);
}
function visibleAncestors(node: HTMLElement, checkAriaHidden: boolean): boolean {
	if (!node.isConnected || node.matches(':disabled,[aria-disabled="true"],input[type="hidden"]')) return false;
	const win = node.ownerDocument.defaultView;
	if (!win) return false;
	for (let current: Element | null = node; current; current = current.parentElement) {
		if (
			current.hasAttribute('hidden') ||
			current.hasAttribute('inert') ||
			(checkAriaHidden && current.getAttribute('aria-hidden') === 'true') ||
			current.getAttribute('aria-disabled') === 'true' ||
			(current.tagName === 'FIELDSET' && current.hasAttribute('disabled'))
		)
			return false;
		const style = win.getComputedStyle(current);
		if (
			style.display === 'none' ||
			style.visibility === 'hidden' ||
			style.visibility === 'collapse' ||
			style.opacity === '0'
		)
			return false;
	}
	return true;
}
function focusable(container: HTMLElement | null): HTMLElement[] {
	return container
		? [...container.querySelectorAll<HTMLElement>(focusSelector)].filter(
				(node) => node.tabIndex >= 0 && available(node),
			)
		: [];
}
function focusRegion(region: HTMLElement | null): void {
	if (
		!region ||
		!available(region) ||
		region.ownerDocument.defaultView?.getComputedStyle(region).display === 'contents'
	)
		return;
	if (!region.hasAttribute('tabindex')) region.tabIndex = -1;
	region.focus({ preventScroll: true });
}
/** Focus a named region inside the current leaf or navigation Sheet. */
export function focusAvailableInRegion(region: HTMLElement): void {
	const target = focusable(region)[0];
	if (target) target.focus({ preventScroll: true });
	else focusRegion(region);
}
/** Restore inside the surviving modal/region, ignoring hidden or disabled sources. */
export function restoreFocus(doc: Document, source: HTMLElement | null, preferredRegion: HTMLElement | null): void {
	const stack = stackFor(doc);
	if (preferredRegion && (preferredRegion.ownerDocument !== doc || !liveOwner(preferredRegion))) return;
	if (preferredRegion) stack.pendingRestores.get(preferredRegion)?.();
	const closing = preferredRegion
		? [...stack.contents]
				.filter(
					(entry) =>
						entry.content?.isConnected &&
						entry.content.dataset.state === 'closed' &&
						owningRegion(entry) === preferredRegion,
				)
				.map((entry) => entry.content!)
		: [];
	if (!preferredRegion || !closing.length) {
		restoreNow(doc, source, preferredRegion);
		return;
	}
	// Radix's guarded FocusScope contract emits this event even after its node detaches.
	// A closing child may still hide the parent's opener until its own Presence exits.
	const activeAtRequest = doc.activeElement;
	const topAtRequest = stack.entries.at(-1);
	let remaining = closing.length;
	let cancelled = false;
	const detach: Array<() => void> = [];
	const cleanup = () => {
		cancelled = true;
		for (const remove of detach) remove();
		if (stack.pendingRestores.get(preferredRegion) === cleanup) stack.pendingRestores.delete(preferredRegion);
	};
	const finished = () => {
		if (--remaining) return;
		queueMicrotask(() => {
			if (cancelled) return;
			const active = doc.activeElement as HTMLElement | null;
			const top = stack.entries.at(-1);
			const newIntent =
				active &&
				active !== activeAtRequest &&
				active !== doc.body &&
				active !== doc.documentElement &&
				available(active) &&
				!closing.some((node) => node.contains(active));
			cleanup();
			if (
				preferredRegion.ownerDocument !== doc ||
				!liveOwner(preferredRegion) ||
				(top && top !== topAtRequest) ||
				newIntent
			)
				return;
			restoreNow(doc, source, preferredRegion);
		});
	};
	for (const node of closing) {
		node.addEventListener('focusScope.autoFocusOnUnmount', finished, { once: true });
		detach.push(() => node.removeEventListener('focusScope.autoFocusOnUnmount', finished));
	}
	stack.pendingRestores.set(preferredRegion, cleanup);
}
function restoreNow(doc: Document, source: HTMLElement | null, preferredRegion: HTMLElement | null): void {
	if (
		source &&
		source !== doc.body &&
		source !== doc.documentElement &&
		source.ownerDocument === doc &&
		available(source)
	) {
		source.focus({ preventScroll: true });
		return;
	}
	const top = stackFor(doc).entries.at(-1)?.content;
	if (top) {
		const target = focusable(top)[0];
		if (target) target.focus({ preventScroll: true });
		else focusRegion(top);
		return;
	}
	const regions = new Set([preferredRegion, ...doc.querySelectorAll<HTMLElement>('.huhu-ui')]);
	for (const region of regions) {
		if (!region || !available(region)) continue;
		const target = focusable(region)[0];
		if (target) {
			target.focus({ preventScroll: true });
			return;
		}
		if (doc.defaultView?.getComputedStyle(region).display === 'contents') continue;
		focusRegion(region);
		return;
	}
}
/** A portal anchor inherits its logical parent's page; a page anchor never crosses into another owner. */
function owningRegion(entry: Entry): HTMLElement | null {
	const region = entry.ownerRegion;
	if (region && region.ownerDocument.defaultView?.getComputedStyle(region).display !== 'contents') return region;
	return (entry.ownerParent && owningRegion(entry.ownerParent)) || region;
}
export function useModalContent() {
	const context = useContext(Context);
	const doc = useOwnerDocument();
	const setContent = context?.setContent;
	const ref = useCallback((node: HTMLElement | null) => setContent?.(node), [setContent]);
	return {
		ref,
		onPointerDownCapture: (event: ReactPointerEvent<HTMLElement>) => {
			if (!context) return;
			const ownerDocument = event.currentTarget.ownerDocument;
			// Only the event's physical Document contributes owners; later adoption cannot rewrite this snapshot.
			const lowerOwners = new Set<symbol>();
			for (let owner: Entry | null = context.entry; owner; owner = owner.ownerParent)
				if (owner.content?.ownerDocument === ownerDocument) lowerOwners.add(owner.id);
			// Independent React roots share the Document's modal order, not React context.
			const ordered = stackFor(ownerDocument).entries;
			const index = ordered.indexOf(context.entry);
			for (const owner of ordered.slice(0, Math.max(0, index)))
				if (owner.content?.ownerDocument === ownerDocument) lowerOwners.add(owner.id);
			pointerOwners.set(event.nativeEvent, { doc: ownerDocument, origin: context.entry.id, lowerOwners });
		},
		onPointerDownOutside: (event: Event & { detail: { originalEvent: PointerEvent } }) => {
			const owner = pointerOwners.get(event.detail.originalEvent);
			if (context && owner && owner.origin !== context.entry.id && owner.lowerOwners.has(context.entry.id))
				event.preventDefault();
		},
		onOpenAutoFocus: () => {
			context?.prepareFocus();
		},
		onKeyDownCapture: (event: ReactKeyboardEvent<HTMLElement>) => {
			if (!context || event.key !== 'F6' || event.nativeEvent.isComposing) return;
			event.preventDefault();
			event.stopPropagation();
			const top = stackFor(doc).entries.at(-1)?.content ?? event.currentTarget;
			const items = focusable(top);
			const current = items.indexOf(doc.activeElement as HTMLElement);
			const next = (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
			if (items.length) items[next]?.focus({ preventScroll: true });
			else focusRegion(top);
		},
		onCloseAutoFocus: (event: Event) => {
			if (!context) return;
			event.preventDefault();
			const entry = context?.entry;
			queueMicrotask(() => {
				if (entry?.parent && !stackFor(doc).entries.some((item) => item.id === entry.parent)) return;
				const owner = owningRegion(entry);
				if (owner && !liveOwner(owner)) return;
				restoreFocus(doc, entry.source, owner ?? entry.region);
			});
		},
	};
}
