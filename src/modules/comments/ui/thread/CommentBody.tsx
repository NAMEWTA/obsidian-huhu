// Adapted from jonaas-dev/obsidian-margin-comments f727e38 (MIT), Copyright (c) 2026 jonaas-dev: src/ui/render-comment-body.ts, src/ui/thread-card.ts
import type { App } from 'obsidian';
import { useCallback, useState } from 'react';
import { Button } from '../../../../ui/components/button';
import { MarkdownContent } from '../../../../ui/components/huhu/MarkdownContent';
import { useT } from '../../../../ui/react/hooks';

export function CommentBody({ app, path, text, onEdit }: { app: App; path: string; text: string; onEdit?: () => void }) {
	const [expanded, setExpanded] = useState(false);
	const [long, setLong] = useState(false);
	const rendered = useCallback((element: HTMLElement) => setLong(element.scrollHeight > 150), []);
	const t = useT();
	return <><MarkdownContent app={app} path={path} text={text} onRendered={rendered}
		className={expanded ? '' : 'max-h-[150px] overflow-hidden'} onDoubleClick={onEdit} />
		{long && <Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>{t(expanded ? 'editor.comments.lessText' : 'editor.comments.moreText')}</Button>}</>;
}
