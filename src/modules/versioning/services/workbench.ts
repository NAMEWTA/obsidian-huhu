import { t } from '../../../shared/i18n/index';
import type { SyncStatusRow, SyncWorkbench } from '../api';
import type { SyncService } from './sync-service';

/** Status rows: a run in progress, conflicts, a failed last run, automatic sync paused after failures, unpushed commits. */
export function syncStatus(service: SyncService | undefined): SyncStatusRow[] {
	const snapshot = service?.snapshot;
	if (!snapshot || snapshot.phase !== 'ready') return [];
	const rows: SyncStatusRow[] = [];
	if (snapshot.running && snapshot.running !== 'refresh')
		rows.push({ id: 'running', kind: 'running', label: t('sync.status.running', { action: t(`sync.action.${snapshot.running}`) }), section: 'changes' });
	const conflicts = snapshot.status?.conflicted.length ?? 0;
	if (snapshot.operation || conflicts) rows.push({ id: 'conflict', kind: 'error', label: t('sync.status.conflict', { count: conflicts }), section: 'changes' });
	else if (snapshot.last && !snapshot.last.ok) rows.push({ id: 'failed', kind: 'error', label: t('sync.status.failed'), section: 'changes' });
	if (snapshot.device.paused === 'failures') rows.push({ id: 'paused', kind: 'error', label: t('sync.status.pausedFailures'), section: 'changes' });
	if (snapshot.device.restoreHold) rows.push({ id: 'restore-hold', kind: 'info', label: t('sync.status.restoreHold'), section: 'changes' });
	const ahead = snapshot.status?.ahead ?? 0;
	if (ahead && !snapshot.running) rows.push({ id: 'ahead', kind: 'info', label: t('sync.status.ahead', { count: ahead }), section: 'changes' });
	return rows;
}

/** The `sync.workbench` service. */
export function syncWorkbench(service: () => SyncService | undefined, subscribe: (listener: () => void) => () => void): SyncWorkbench {
	return {
		title: () => t('workbench.sync'),
		status: () => syncStatus(service()),
		subscribe,
	};
}
