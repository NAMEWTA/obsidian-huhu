import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ComponentProps,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * What a view may ask of the card it is drawn in: icon buttons in the title bar and entries in its menu. A view
 * rendered without a card (a widget another module mounts on its own surface) gets neither, and `WidgetActions`
 * then draws its buttons inline above the content.
 */
export interface WidgetMenuEntry {
	id: string;
	label: string;
	icon?: ReactNode;
	destructive?: boolean;
	disabled?: boolean;
	onSelect(this: void): void;
}

/** The entries one view registered: the signature decides when the card re-renders; `read` is always the latest. */
export interface RegisteredMenu {
	signature: string;
	read(this: void): readonly WidgetMenuEntry[];
}

export interface WidgetFrameValue {
	/** The element in the title bar that holds the view's own buttons; `null` until the bar is mounted. */
	actionsHost: HTMLElement | null;
	registerMenu(this: void, owner: object, menu: RegisteredMenu): void;
	unregisterMenu(this: void, owner: object): void;
}

export const WidgetFrameContext = createContext<WidgetFrameValue | null>(null);

/** The title-bar slot of the card around the caller, for views that portal their own controls (sections). */
export function useWidgetActionsHost(): HTMLElement | null {
	return useContext(WidgetFrameContext)?.actionsHost ?? null;
}

/**
 * Icon buttons for the title bar of the card around the caller: at most two, the rest belong in `useWidgetMenu`.
 * Rendered in place of the card's slot, so events and context stay with the caller.
 */
export function WidgetActions({ children, ...rest }: { children: ReactNode } & ComponentProps<'div'>) {
	const frame = useContext(WidgetFrameContext);
	if (!frame)
		return (
			<div data-slot="widget-actions-inline" className="mb-1 flex items-center justify-end gap-1" {...rest}>
				{children}
			</div>
		);
	return frame.actionsHost ? createPortal(children, frame.actionsHost) : null;
}

const signatureOf = (entries: readonly WidgetMenuEntry[]) =>
	entries.map((entry) => `${entry.id}\u0000${entry.label}\u0000${entry.disabled ? 1 : 0}${entry.destructive ? 1 : 0}`).join('\u0001');

/**
 * Entries for the ⋯ menu of the card around the caller, shown above the size and move groups. The card re-renders
 * only when ids, labels or flags change; handlers and icons are read fresh when the menu opens.
 */
export function useWidgetMenu(entries: readonly WidgetMenuEntry[]): void {
	const frame = useContext(WidgetFrameContext),
		[owner] = useState(() => ({})),
		latest = useRef(entries),
		signature = useMemo(() => signatureOf(entries), [entries]);
	useEffect(() => {
		latest.current = entries;
	});
	const register = frame?.registerMenu,
		unregister = frame?.unregisterMenu;
	useEffect(() => {
		register?.(owner, { signature, read: () => latest.current });
		return () => unregister?.(owner);
	}, [register, unregister, owner, signature]);
}
