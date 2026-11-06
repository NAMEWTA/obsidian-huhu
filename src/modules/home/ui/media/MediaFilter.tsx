import { DateField, parseDate } from '../../../../ui/components/huhu/date';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/media-section.ts
import type { App } from 'obsidian';
import { Popover, PopoverAnchor, PopoverContent } from '../../../../ui/components/popover';
import { useDashboardAppearance } from '../theme/ThemeBridge';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import { Badge } from '../../../../ui/components/badge';
import { Choice, IconButton } from '../board/controls';
import { X } from 'lucide-react';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';

export interface MediaFilterValue {
	property: 'created' | 'modified';
	start: string;
	end: string;
	folders: string[];
	tags: string[];
}
export const emptyMediaFilter: MediaFilterValue = { property: 'modified', start: '', end: '', folders: [], tags: [] };
export const normalizeMediaFolder = (path: string) => path.trim().replace(/^\/+|\/+$/g, '');
export function MediaFilter({
	app,
	anchor,
	value,
	update,
	tags,
	close,
}: {
	app: App;
	anchor: HTMLElement;
	value: MediaFilterValue;
	update: (value: MediaFilterValue) => void;
	tags?: string[];
	close: () => void;
}) {
	const popup = useDashboardAppearance();
	const remove = (path: string) => update({ ...value, folders: value.folders.filter((f) => f !== path) });
	const row = 'grid gap-1.5';
	const label = 'text-xs text-muted-foreground';
	return (
		<Popover
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<PopoverAnchor virtualRef={{ current: anchor }} />
			<PopoverContent
				ref={popup}
				className="huhu-dashboard-root grid max-h-[70vh] w-80 max-w-[calc(100vw-1rem)] gap-3 overflow-y-auto p-4"
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					anchor.focus();
				}}
			>
				{tags && (
					<div className={row}>
						<div className={label}>{t('media.filterTags')}</div>
						<div className="flex flex-wrap gap-1.5">
							{tags.map((tag) => {
								const on = value.tags.includes(tag);
								return (
									<Button
										key={tag}
										variant={on ? 'primary' : 'secondary'}
										size="sm"
										className="max-w-full"
										aria-pressed={on}
										onClick={() =>
											update({
												...value,
												tags: on ? value.tags.filter((v) => v !== tag) : [...value.tags, tag],
											})
										}
									>
										#{tag}
									</Button>
								);
							})}
						</div>
					</div>
				)}
				<div className={row}>
					<div className={label}>{t('library.filterProperty')}</div>
					<Choice
						label={t('library.filterProperty')}
						className="w-full data-[size=sm]:h-[var(--hu-ctl-h)]"
						value={value.property}
						onChange={(property) =>
							update({ ...value, property: property as MediaFilterValue['property'] })
						}
						options={[
							{ value: 'created', label: t('library.created') },
							{ value: 'modified', label: t('library.modified') },
						]}
					/>
				</div>
				<div className={row}>
					<div className={label}>{t('library.filterDateRange')}</div>
					<div className="flex flex-wrap gap-1.5">
						<DateField
							label={t('media.filterFrom')}
							value={parseDate(value.start)}
							onChange={(day) => update({ ...value, start: day ?? '' })}
						/>
						<DateField
							label={t('media.filterTo')}
							value={parseDate(value.end)}
							onChange={(day) => update({ ...value, end: day ?? '' })}
						/>
					</div>
				</div>
				<div className={row}>
					<div className={label}>{t('media.filterFolder')}</div>
					<div className="flex flex-wrap gap-1.5">
						{value.folders.length ? (
							value.folders.map((path) => (
								<Badge key={path} variant="neutral" className="max-w-full gap-0.5 pr-0.5">
									<span className="truncate">{path}</span>
									<IconButton
										label={t('media.removeFilter', { name: path })}
										className="size-4"
										onClick={() => remove(path)}
									>
										<X />
									</IconButton>
								</Badge>
							))
						) : (
							<span className={label}>{t('folder.noFolders')}</span>
						)}
					</div>
					{/* The field stays empty: a folder chosen here becomes a chip. */}
					<VaultPathField
						app={app}
						kind="folder"
						create={false}
						allowCreate={false}
						label={t('media.filterFolder')}
						placeholder={t('media.filterFolderPlaceholder')}
						value=""
						onChange={(path) => {
							const folder = normalizeMediaFolder(path);
							if (folder && !value.folders.some((f) => f.toLowerCase() === folder.toLowerCase()))
								update({ ...value, folders: [...value.folders, folder] });
						}}
					/>
					<div className={label}>{t('media.filterFolderHint')}</div>
				</div>
				<Button
					variant="secondary"
					onClick={() => {
						update(emptyMediaFilter);
						close();
					}}
				>
					{t('media.clearFilters')}
				</Button>
			</PopoverContent>
		</Popover>
	);
}
