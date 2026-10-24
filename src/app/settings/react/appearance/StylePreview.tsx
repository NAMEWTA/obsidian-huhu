import { useEffect, useRef, useState } from 'react';
import type { App } from 'obsidian';
import { useLanguage, useOwnerWindow, useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import { SegmentedControl } from '../../../../ui/components/huhu/SegmentedControl';
import type { ThemeSettings } from '../../../../theme/settings';
import { mountStylePreview, PREVIEW_DOCUMENT } from './preview-document';

/** Isolated real Reading content. Preview controls never persist settings or change the host mode. */
export function StylePreview({ app, settings }: { app: App; settings: ThemeSettings }) {
	const t = useT();
	const language = useLanguage();
	const owner = useOwnerWindow();
	const frame = useRef<HTMLIFrameElement>(null);
	const [mode, setMode] = useState<'light' | 'dark'>(() => owner.document.body.classList.contains('theme-dark') ? 'dark' : 'light');
	const [narrow, setNarrow] = useState(false);
	const [revision, setRevision] = useState(0);
	useEffect(() => {
		const ref = app.workspace.on('css-change', () => setRevision((value) => value + 1));
		return () => app.workspace.offref(ref);
	}, [app]);
	useEffect(() => {
		const target = frame.current?.contentDocument;
		if (!target) return;
		return mountStylePreview({ app, source: owner.document, target, settings, mode, narrow, language, t });
	}, [app, owner, settings, mode, narrow, language, t, revision]);
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<SegmentedControl
					ariaLabel={t('appearance.previewMode')}
					value={mode}
					onChange={setMode}
					options={(['light', 'dark'] as const).map((value) => ({ value, label: t(`appearance.mode.${value}`) }))}
				/>
				<Button variant="outline" size="sm" aria-pressed={narrow} onClick={() => setNarrow((value) => !value)}>{t('appearance.previewNarrow')}</Button>
			</div>
			<iframe
				ref={frame}
				title={t('appearance.previewTitle')}
				lang={language}
				sandbox="allow-same-origin"
				srcDoc={PREVIEW_DOCUMENT}
				onLoad={() => setRevision((value) => value + 1)}
				className={`mx-auto block h-[560px] max-w-full rounded-lg border border-border bg-background ${narrow ? 'w-80' : 'w-full'}`}
			/>
			<p className="text-xs text-muted-foreground">{t('appearance.previewDesc')}</p>
		</div>
	);
}
