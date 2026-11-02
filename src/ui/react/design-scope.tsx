import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import type { ExternalToast } from 'sonner';
import { Toaster, toast } from '../components/sonner';
import { cn } from '../lib/utils';
import { PortalContainerContext, useOwnerDocument } from './contexts';

type Notice = (message: ReactNode, options?: Omit<ExternalToast, 'toasterId'>) => string | number | undefined;
const NoticeContext = createContext<Notice | null>(null);

/** Route transient feedback to the owning content region; persistent errors belong in the page. */
export function useDesignNotice(): Notice {
	const notice = useContext(NoticeContext);
	if (!notice) throw new Error('Content notices require DesignScope');
	return notice;
}

function NoticeOutlet({ id }: { id: string }) {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	return <div ref={setContainer} className="huhu-design-notices">
		{container && <Toaster id={id} container={container} position="top-center" visibleToasts={1} expand />}
	</div>;
}

/** A product content region and its overlays, never a shell containing unrelated surfaces.
 * Nested HuhuProviders retain their own portal ownership. CSS stops at nested .huhu-ui roots.
 * Apply at a module's content leaf; do not wrap Browser or its integration entry points.
 */
export function DesignScope({ children, className, ...props }: ComponentProps<'div'>) {
	const doc = useOwnerDocument();
	const id = `huhu-content-${useId()}`;
	const active = useRef(true);
	const notice = useCallback<Notice>((message, options) => {
		if (!active.current) return;
		return toast(message, { ...options, id: options?.id === undefined ? undefined : `${id}:${options.id}`, toasterId: id });
	}, [id]);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
			for (const item of toast.getToasts()) if ('toasterId' in item && item.toasterId === id) toast.dismiss(item.id);
		};
	}, [id]);
	const [lease] = useState(() => {
		let portal: HTMLElement | null = null;
		return {
			getSnapshot: () => portal,
			subscribe(owner: Document, notify: () => void) {
				const element = owner.createElement('div');
				element.className = 'huhu-ui huhu-design huhu-portal-root';
				owner.body.append(element);
				portal = element;
				notify();
				return () => element.remove();
			},
		};
	});
	const portal = useSyncExternalStore(
		useCallback((notify) => lease.subscribe(doc, notify), [doc, lease]),
		lease.getSnapshot,
		() => null,
	);
	if (!portal) return null;
	return (
		<PortalContainerContext.Provider value={portal}>
			<NoticeContext.Provider value={notice}>
				<div {...props} className={cn('huhu-ui huhu-design', className)}><NoticeOutlet id={id} />{children}</div>
			</NoticeContext.Provider>
		</PortalContainerContext.Provider>
	);
}
