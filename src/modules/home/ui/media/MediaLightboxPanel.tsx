// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/media-section.ts
import type { App } from 'obsidian';
import { type ContentFile } from '../../../../host/obsidian/storage/content-files';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { t } from '../../../../shared/i18n';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { resolveVaultImage } from './image-resource';
import { MediaUnavailable, MediaVideo } from './MediaViews';
import type { MediaTagHooks } from './media-lightbox-modal';
import { MediaTagEditor } from './MediaTagEditor';
import { useFocusReturn } from './use-focus-return';
export function MediaLightboxPanel({
	app,
	files,
	index,
	kind,
	tagHooks,
	show,
}: {
	app: App;
	files: ContentFile[];
	index: number;
	kind: 'image' | 'video';
	tagHooks?: MediaTagHooks;
	show: (index: number) => void;
	close: () => void;
}) {
	const [editing, setEditing] = useState(false);
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const [, refresh] = useState(0);
	const focus = useFocusReturn();
	const file = files[index];
	const src = file ? resolveVaultImage(app, file.path) : null;
	const failed = failedSrc === src;
	if (!file) return <MediaUnavailable name="" missing />;
	return (
		<div className="grid gap-3">
			{editing && tagHooks && (
				<MediaTagEditor
					name={file.basename}
					path={file.path}
					current={tagHooks.getTags(file)}
					known={tagHooks.getAllTags()}
					onClose={() => {
						focus.restore();
						setEditing(false);
					}}
					onSave={(tags) => {
						tagHooks.onTagsChange(file, tags);
						refresh((n) => n + 1);
						focus.restore();
						setEditing(false);
					}}
				/>
			)}
			<div className="flex min-h-40 max-h-[60vh] items-center justify-center overflow-hidden rounded-md bg-muted">
				{!src || failed ? (
					<div className="h-40 w-full">
						<MediaUnavailable name={file.basename} missing={!src} />
					</div>
				) : kind === 'image' ? (
					<img
						className="block max-h-[60vh] max-w-full object-contain"
						src={src}
						alt={file.basename}
						onError={() => setFailedSrc(src)}
					/>
				) : (
					<MediaVideo
						key={src}
						src={src}
						className="block max-h-[60vh] max-w-full object-contain"
						play
						onError={() => setFailedSrc(src)}
					/>
				)}
			</div>
			<div role="group" aria-label={t('media.lightboxNav')} className="flex items-center justify-between gap-2">
				<Button
					variant="secondary"
					size="icon-md"
					aria-label={t('home.p1.previous')}
					disabled={index <= 0}
					onClick={() => show(index - 1)}
				>
					<ChevronLeft />
				</Button>
				<div role="status" className="min-w-0 text-center text-sm text-foreground [overflow-wrap:anywhere]">
					{file.basename} ({index + 1} / {files.length})
				</div>
				<Button
					variant="secondary"
					size="icon-md"
					aria-label={t('home.p1.next')}
					disabled={index >= files.length - 1}
					onClick={() => show(index + 1)}
				>
					<ChevronRight />
				</Button>
			</div>
			{tagHooks && (
				<div className="flex flex-wrap items-center justify-center gap-1.5">
					{tagHooks.getTags(file).map((tag) => (
						<Badge key={tag} variant="neutral" className="max-w-40">
							<span className="truncate">{tag}</span>
						</Badge>
					))}
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							focus.remember();
							setEditing(true);
						}}
					>
						<Plus />
						{t('media.editTags')}
					</Button>
				</div>
			)}
		</div>
	);
}
