import { useT } from '../../../ui/react/hooks';

const explained = new Set([
	'unsupported_url',
	'human_lease_expired',
	'frame_stale',
	'input_sequence_stale',
	'request_expired',
	'control_superseded',
	'run_revoked',
	'user_run_grant_required',
	'runtime_unavailable',
	'space_create_failed',
	'workspace_owned_elsewhere',
	'cleanup_pending',
	'catalog_unavailable',

	'control_revoked',
	'stale_viewer_input',
	'browser_stale_request',
	'outcome_unknown',
	'ephemeral_consent_required',
	'key_unavailable',
	'weak_provider',
	'unsupported_cookie',
	'unsupported_storage',
	'verification_failed',
	'file_too_large',
	'file_scope_mismatch',
	'identity_locked',
	'clipboard_unavailable',
	'browser_profile_version_missing',
	'browser_profile_version_downgrade',
	'browser_profile_version_invalid',
	'browser_profile_version_changed',
	'browser_profile_path_invalid',
	'material_target_unavailable',
	'material_target_busy',
	'browser_disabled',
	'personal_space_forbidden',
]);
export function BrowserActionError({ code }: { code?: string }) {
	const t = useT();
	if (!code) return null;
	return (
		<p role="alert" className="break-words px-3 py-2 text-sm text-destructive">
			{explained.has(code) ? t(`browser.v2.failure.${code}`) : t('browser.v2.error')}
		</p>
	);
}

export function actionError(reason: unknown): string {
	return reason instanceof Error ? reason.message : 'operation_failed';
}
