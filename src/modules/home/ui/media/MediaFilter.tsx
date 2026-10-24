// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/media-section.ts
import { p1Classes } from '../theme/p1-classes';
import type { App } from 'obsidian';
import { Popover, PopoverAnchor, PopoverContent } from '../../../../ui/components/popover';
import { useDashboardAppearance } from '../theme/ThemeBridge';
import { t } from '../../../../shared/i18n';
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
	return (
		<>
			<Popover
				open
				onOpenChange={(open) => {
					if (!open) close();
				}}
			>
				<PopoverAnchor virtualRef={{ current: anchor }} />
				<PopoverContent
					ref={popup}
					className={`huhu-dashboard-root p-4 ${p1Classes('dashboard-library-filter-popup')}`}
				>
					{tags && (
						<div className={p1Classes('dashboard-library-quickfilter-row')}>
							<div className={p1Classes('dashboard-library-quickfilter-label')}>
								{t('media.filterTags')}
							</div>
							<div className={p1Classes('dashboard-library-filter-chips')}>
								{tags.map((tag) => (
									<div
										key={tag}
										className={p1Classes(
											`dashboard-library-filter-chip${value.tags.includes(tag) ? ' selected' : ''}`,
										)}
										role="button"
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												e.currentTarget.click();
											}
										}}
										onClick={() =>
											update({
												...value,
												tags: value.tags.includes(tag)
													? value.tags.filter((v) => v !== tag)
													: [...value.tags, tag],
											})
										}
									>
										#{tag}
									</div>
								))}
							</div>
						</div>
					)}
					<div className={p1Classes('dashboard-library-quickfilter-row')}>
						<div className={p1Classes('dashboard-library-quickfilter-label')}>
							{t('library.filterProperty')}
						</div>
						<select
							className={p1Classes('dashboard-library-filter-popup-prop')}
							value={value.property}
							onChange={(e) =>
								update({ ...value, property: e.currentTarget.value as MediaFilterValue['property'] })
							}
						>
							<option value="created">{t('library.created')}</option>
							<option value="modified">{t('library.modified')}</option>
						</select>
					</div>
					<div className={p1Classes('dashboard-library-quickfilter-row')}>
						<div className={p1Classes('dashboard-library-quickfilter-label')}>
							{t('library.filterDateRange')}
						</div>
						<div className={p1Classes('dashboard-media-filter-dates')}>
							<input
								className={p1Classes('dashboard-media-filter-date')}
								type="date"
								value={value.start}
								onChange={(e) => update({ ...value, start: e.currentTarget.value })}
							/>
							<input
								className={p1Classes('dashboard-media-filter-date')}
								type="date"
								value={value.end}
								onChange={(e) => update({ ...value, end: e.currentTarget.value })}
							/>
						</div>
					</div>
					<div className={p1Classes('dashboard-library-quickfilter-row')}>
						<div className={p1Classes('dashboard-library-quickfilter-label')}>
							{t('media.filterFolder')}
						</div>
						<div className={p1Classes('dashboard-alltasks-exclude-chips')}>
							{value.folders.length ? (
								value.folders.map((path) => (
									<div key={path} className={p1Classes('dashboard-alltasks-exclude-chip')}>
										<span>{path}</span>
										<button
											type="button"
											data-hit-control
											aria-label={t('common.delete')}
											className={p1Classes('dashboard-alltasks-exclude-chip-x')}
											onClick={() => remove(path)}
										>
											×
										</button>
									</div>
								))
							) : (
								<div className={p1Classes('dashboard-library-filter-empty')}>
									{t('folder.noFolders')}
								</div>
							)}
						</div>
						<div className={p1Classes('dashboard-media-folder-input-row')}>
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
						</div>
						<div className={p1Classes('dashboard-library-config-hint')}>{t('media.filterFolderHint')}</div>
					</div>
					<button
						className={p1Classes('dashboard-library-filter-popup-clear')}
						onClick={() => {
							update(emptyMediaFilter);
							close();
						}}
					>
						{t('reminder.clearReminder')}
					</button>
				</PopoverContent>
			</Popover>
		</>
	);
}
