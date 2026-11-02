// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/tab-bar/tab-bar-surface.tsx
import { useEffect, useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../../../ui/components/dropdown-menu';
import { Button } from '../../../../ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { AgentController } from '../../services/controller';
import { Omnibox } from './Omnibox';
export function NewTabMenu({
	controller,
	groupId,
	open: controlled,
	onOpenChange,
}: {
	controller: AgentController;
	groupId?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const t = useT(),
		doc = useOwnerDocument(),
		[local, setLocal] = useState(false),
		open = controlled ?? local;
	const setOpen = onOpenChange ?? setLocal;
	const trigger = useRef<HTMLButtonElement>(null), content = useRef<HTMLDivElement>(null);
	const menuId = useId();
	const origin = useRef<{ tabId?: string; spaceId?: string; interrupted: boolean } | undefined>(undefined);
	useEffect(() => {
		if (!open) return;
		origin.current = { tabId: controller.workspace.active?.id, spaceId: controller.spaces?.store.getState().records.selectedSpaceId, interrupted: false };
		const interrupt = (event: Event) => {
			const target = event.target as Node | null;
			if (event.type === 'focusin' && (target === doc.body || (target as Element | null)?.hasAttribute?.('data-radix-focus-guard'))) return;
			// Child autoFocus can run before the parent content ref is assigned.
			const inside = (target as Element | null)?.closest?.('[data-new-tab-menu]')?.getAttribute('data-new-tab-menu') === menuId;
			if (!inside && !content.current?.contains(target) && !trigger.current?.contains(target) && origin.current) origin.current.interrupted = true;
		};
		const blur = () => { if (origin.current) origin.current.interrupted = true; };
		doc.addEventListener('pointerdown', interrupt, true);
		doc.addEventListener('focusin', interrupt, true);
		doc.defaultView?.addEventListener('blur', blur);
		return () => {
			doc.removeEventListener('pointerdown', interrupt, true);
			doc.removeEventListener('focusin', interrupt, true);
			doc.defaultView?.removeEventListener('blur', blur);
		};
	}, [open, controller, doc, menuId]);
	return (
		<DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							ref={trigger}
							variant="ghost"
							size="icon-xs"
							className="ml-2 my-auto size-8 shrink-0 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground pointer-coarse:size-11"
							aria-label={t('agent.workspace.newTab')}
						>
							<Plus className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>{t('agent.workspace.newTab')} · Ctrl Shift N</TooltipContent>
			</Tooltip>
			<DropdownMenuContent
				ref={content}
				data-new-tab-menu={menuId}
				align="start"
				sideOffset={6}
				collisionPadding={8}
				className="w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-[11px] border-border/80 p-1 shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					const previous = origin.current;
					// Service owns successful foreground focus. Radix may only return to this menu's original trigger.
					if (previous && !previous.interrupted && doc.hasFocus() && trigger.current?.isConnected
						&& previous.tabId === controller.workspace.active?.id
						&& previous.spaceId === controller.spaces?.store.getState().records.selectedSpaceId) trigger.current.focus();
				}}
				onKeyDown={(event) => {
					if (event.key !== 'Escape') event.stopPropagation();
				}}
			>
				<Omnibox controller={controller} groupId={groupId} onDone={() => setOpen(false)} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
