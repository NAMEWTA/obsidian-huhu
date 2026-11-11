// Adapted from jonaas-dev/obsidian-margin-comments f727e38 (MIT), Copyright (c) 2026 jonaas-dev: src/ui/render-comment-body.ts
import { Component, MarkdownRenderer, type App } from 'obsidian';
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export function MarkdownContent({ app, path, text, className, onRendered, onDoubleClick }: {
	app: App;
	path: string;
	text: string;
	className?: string;
	onRendered?: (element: HTMLElement) => void;
	onDoubleClick?: () => void;
}) {
	const target = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const host = target.current;
		if (!host) return;
		const content = host.ownerDocument.createElement('div');
		host.replaceChildren(content);
		const owner = new Component();
		owner.load();
		let alive = true;
		void MarkdownRenderer.render(app, text, content, path, owner).then(() => {
			if (alive) onRendered?.(content);
		}, () => {
			if (alive) {
				content.textContent = text;
				onRendered?.(content);
			}
		});
		const onLink = (event: MouseEvent) => {
			const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a.internal-link');
			const href = link?.getAttribute('data-href') ?? link?.getAttribute('href');
			if (!href) return;
			event.preventDefault();
			event.stopPropagation();
			void app.workspace.openLinkText(href, path, event.ctrlKey || event.metaKey)
				.catch((error: unknown) => console.warn('[HUHU Markdown link]', error));
		};
		content.addEventListener('click', onLink);
		return () => {
			alive = false;
			content.removeEventListener('click', onLink);
			owner.unload();
			content.remove();
		};
	}, [app, path, text, onRendered]);
	return <div ref={target} className={cn('huhu-native markdown-rendered min-w-0 break-words text-sm', className)} onDoubleClick={onDoubleClick} />;
}
