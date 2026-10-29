import { t } from '../../../../shared/i18n';
import type { NativeSessionSummary } from '../desktop/server/agent-data-client';

type SourceIdentity = Pick<
	NativeSessionSummary,
	'key' | 'agentId' | 'accountKey' | 'sessionId' | 'transcriptPath' | 'sourceRef'
>;

/** The opaque index key alone cannot identify one selected native source. */
export function sameHistorySource(left: SourceIdentity, right: SourceIdentity): boolean {
	return (
		!!left.key &&
		!!left.agentId &&
		!!left.accountKey &&
		!!left.sessionId &&
		!!left.transcriptPath &&
		!!left.sourceRef &&
		left.key === right.key &&
		left.agentId === right.agentId &&
		left.accountKey === right.accountKey &&
		left.sessionId === right.sessionId &&
		left.transcriptPath === right.transcriptPath &&
		left.sourceRef === right.sourceRef
	);
}

export class HistorySourceChangedError extends Error {
	readonly code = 'HISTORY_SOURCE_CHANGED';
	constructor() {
		super(t('agent.historyUI.source.changed'));
		this.name = 'HistorySourceChangedError';
	}
}
