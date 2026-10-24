import { t } from '../../../../shared/i18n';
import { redactDiagnostic } from '../../../../shared/diagnostics/redact';

export type BoardOpenStage = 'path' | 'index' | 'create' | 'read';
/** Preserve the failed boundary and a redacted cause without printing an absolute vault path. */
export class BoardOpenError extends Error {
	readonly code = 'home.board.openFailed';
	constructor(
		readonly stage: BoardOpenStage,
		path: string,
		cause: unknown,
	) {
		const relative = path.replaceAll('\\', '/');
		const label = relative.startsWith('.huhu/') ? relative : t('home.board.invalidPath');
		super(t('home.board.openFailed', { stage: t(`home.board.stage.${stage}`), path: label }), {
			cause: redactDiagnostic(cause),
		});
		this.name = 'BoardOpenError';
	}
}
