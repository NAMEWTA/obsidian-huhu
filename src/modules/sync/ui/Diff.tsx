import { useEffect, useState } from 'react';
import { t } from '../../../shared/i18n/index';
import type { SyncService } from '../services/sync-service';

export function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** A unified diff, loaded when shown. */
export function Diff({
	service,
	path,
	staged,
	commit,
}: {
	service: SyncService;
	path: string;
	staged?: boolean;
	commit?: string;
}) {
	const [text, setText] = useState<string | null>(null);
	useEffect(() => {
		let live = true;
		service.diff(path, { staged, commit }).then(
			(value) => live && setText(value),
			(error: unknown) => live && setText(describeError(error)),
		);
		return () => {
			live = false;
		};
	}, [service, path, staged, commit]);
	if (text === null) return <p className="p-3 text-xs text-muted-foreground">{t('sync.loading')}</p>;
	if (!text.trim()) return <p className="p-3 text-xs text-muted-foreground">{t('sync.noDiff')}</p>;
	return (
		<pre className="max-h-80 overflow-auto bg-muted/40 p-3 font-mono text-xs">
			{text.split('\n').map((line, index) => (
				<span
					key={index}
					className={
						line.startsWith('@@')
							? 'text-status-info'
							: line.startsWith('+') && !line.startsWith('+++')
								? 'text-status-success'
								: line.startsWith('-') && !line.startsWith('---')
									? 'text-destructive'
									: undefined
					}
				>
					{line}
					{'\n'}
				</span>
			))}
		</pre>
	);
}
