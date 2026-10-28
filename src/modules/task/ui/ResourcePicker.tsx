import { useEffect, useState } from 'react';
import { useOwnerDocument } from '../../../ui/react/contexts';
import type { TaskResource, TaskResources, TaskResourceResolution } from '../api';
import { resourceKey } from '../core/resources';
import { t } from '../../../shared/i18n';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Choice } from '../../../ui/components/huhu/Choice';
export function ResourcePicker({
	resources,
	value,
	onChange,
	disabled,
}: {
	resources: TaskResources;
	value: TaskResource[];
	onChange(this: void, value: TaskResource[]): void;
	disabled: boolean;
}) {
	const win = useOwnerDocument().defaultView;
	const [text, setText] = useState(''),
		[kind, setKind] = useState<TaskResource['kind']>('file');
	const [results, setResults] = useState<readonly TaskResourceResolution[]>([]),
		[selected, setSelected] = useState<readonly TaskResourceResolution[]>([]),
		[error, setError] = useState('');
	const [expanded, setExpanded] = useState(false);
	useEffect(() => {
		let active = true;
		void Promise.all(value.map((resource) => resources.resolve(resource)))
			.then((rows) => {
				if (active) setSelected(rows);
			})
			.catch(() => {
				if (active) setError(t('task.providerUnavailable'));
			});
		return () => {
			active = false;
		};
	}, [resources, value]);
	useEffect(() => {
		let active = true;
		if (!expanded || !win) return;
		const timer = win.setTimeout(() => {
			void resources
				.search(text, kind)
				.then((rows) => {
					if (active) {
						setResults(rows);
						setError('');
					}
				})
				.catch(() => {
					if (active) setError(t('task.providerUnavailable'));
				});
		}, 150);
		return () => {
			active = false;
			win.clearTimeout(timer);
		};
	}, [resources, text, kind, expanded, win]);
	return (
		<section className="grid gap-2" aria-label={t('task.relations')}>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">{t('task.relations')}</span>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={disabled}
					onClick={() => setExpanded(!expanded)}
				>
					{t('task.addRelation')}
				</Button>
			</div>
			<div className="flex flex-wrap gap-2">
				{value.map((resource) => {
					const resolved = selected.find((row) => resourceKey(row.resource) === resourceKey(resource));
					return (
						<div
							key={resourceKey(resource)}
							className="flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs"
						>
							<span className="truncate">
								{resolved?.label ?? (resource.kind === 'archive' ? resource.id : resource.path)}
							</span>
							{resolved?.status !== 'available' && (
								<span className="text-destructive">
									{t(resolved?.status === 'missing' ? 'task.missing' : 'task.providerUnavailable')}
								</span>
							)}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								disabled={disabled}
								aria-label={t('task.removeRelation')}
								onClick={() =>
									onChange(value.filter((item) => resourceKey(item) !== resourceKey(resource)))
								}
							>
								×
							</Button>
						</div>
					);
				})}
			</div>
			{expanded && (
				<div className="grid gap-2 rounded-md border p-2">
					<Choice
						label={t('task.relations')}
						value={kind}
						options={(['file', 'folder', 'archive'] as const).map(
							(key) => [key, t(`task.${key}`)] as const,
						)}
						onChange={(value) => setKind(value as TaskResource['kind'])}
						disabled={disabled}
					/>
					<Input
						value={text}
						onChange={(event) => setText(event.currentTarget.value)}
						placeholder={t('task.relationSearch')}
						aria-label={t('task.relationSearch')}
						disabled={disabled}
					/>
					<div className="grid max-h-40 gap-1 overflow-auto">
						{results.map((row) => (
							<Button
								className="h-auto justify-start whitespace-normal text-left"
								type="button"
								size="sm"
								variant="ghost"
								key={resourceKey(row.resource)}
								disabled={
									disabled || value.some((item) => resourceKey(item) === resourceKey(row.resource))
								}
								onClick={() => onChange([...value, row.resource])}
							>
								{row.label}
								<span className="ml-2 text-xs text-muted-foreground">{row.path}</span>
							</Button>
						))}
					</div>
				</div>
			)}
			{error && (
				<p role="status" className="text-sm text-destructive">
					{error}
				</p>
			)}
		</section>
	);
}
