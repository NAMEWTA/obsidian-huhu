// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads, src/renderer.ts (reading dialogs)
import { createElement as h } from 'react';
import { t } from '../../../../shared/i18n';
import type { BookInfo, ReadingService } from '../../platform/reading/reading-service';
import { openRecordDialog } from '../dialogs/open-record-dialog';
import { EndReadingPanel } from './ReadingDialogs';
export function openEndReadingModal(
	doc: Document,
	service: ReadingService,
	book: BookInfo,
	elapsedSeconds: number,
	onDone: () => void,
): void {
	openRecordDialog(doc, t('reading.title'), 'dashboard-reading-end-modal', (close) =>
		h(EndReadingPanel, { service, book, elapsed: elapsedSeconds, close, done: onDone }),
	);
}
