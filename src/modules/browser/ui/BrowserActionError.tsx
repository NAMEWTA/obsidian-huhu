import { useT } from '../../../ui/react/hooks';

const explained = new Set([
	'control_unconfirmed',
	'execution_identity_invalid',
	'fresh_observation_required',
	'unsupported_url',
	'human_lease_expired',
	'frame_stale',
	'input_sequence_stale',
	'request_expired',
	'control_superseded',
	'browser_control_unsettled',
	'run_revoked',
	'user_run_grant_required',
	'runtime_unavailable',
	'browser_runtime_capability_missing',
	'space_create_failed',
	'space_stopping',
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
	'file_publication_unknown',
	'file_scope_mismatch',
	'identity_locked',
	'identity_refresh_unavailable',
	'identity_corrupt',
	'identity_missing',
	'source_changed',
	'source_unavailable',
	'source_grant_invalid',
	'browser_identity_readback_invalid',
	'context_mismatch',
	'clipboard_unavailable',
	'browser_profile_version_missing',
	'browser_profile_version_downgrade',
	'browser_profile_version_invalid',
	'browser_profile_version_changed',
	'browser_profile_path_invalid',
	'material_target_unavailable',
	'material_target_busy',
	'material_delivery_unknown',
	'material_target_timeout',
	'material_cancelled',
	'browser_stale_ref',
	'observation_stale',
	'capture_unavailable',
	'capture_quota',
	'material_too_large',
	'material_target_missing',
	'browser_frame_transform_unsupported',
	'browser_frame_owner_missing',
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
	const code = reason instanceof Error ? reason.message : '';
	return /^[a-z][a-z0-9_]{1,100}$/.test(code) ? code : 'operation_failed';
}
