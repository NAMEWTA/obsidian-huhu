import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Label } from '../../../ui/components/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import { useT } from '../../../ui/react/hooks';
import { SafeError, validateMasterPassword, type SafeErrorCode } from '../core/model';
import type { SafeService } from '../services/safe-service';

const errorKeys: Record<SafeErrorCode, string> = {
	'invalid-format': 'safe.error.invalid-container',
	'invalid-entry': 'safe.error.invalid-entry',
	'invalid-relation': 'safe.error.invalid-relation',
	'invalid-password': 'safe.error.invalid-password',
	'too-large': 'safe.error.too-large',
	'unlock-failed': 'safe.error.authentication',
	'crypto-unavailable': 'safe.error.unavailable',
	storage: 'safe.error.io',
	conflict: 'safe.error.conflict',
	'conflict-unsaved': 'safe.error.conflict-unpreserved',
	missing: 'safe.error.missing',
	exists: 'safe.error.exists',
	changed: 'safe.error.changed',
	'export-target': 'safe.error.invalid-export-path',
	canceled: 'safe.error.cancelled',
	locked: 'safe.error.locked',
	'stale-entry': 'safe.error.stale-entry',
	'not-found': 'safe.error.stale-entry',
	'invalid-url': 'safe.error.invalid-url',
	clipboard: 'safe.error.clipboard',
};

/** Never render exception messages, input values or host errors in notices. */
export function safeErrorKey(error: unknown): string {
	if (error instanceof SafeError) return errorKeys[error.code] ?? 'safe.error.unknown';
	if (typeof error === 'string' && Object.hasOwn(errorKeys, error)) return errorKeys[error as SafeErrorCode];
	return 'safe.error.unknown';
}

/** Secret values live in the input property, never in an HTML value/defaultValue attribute. */
export function SecretInput({ value, ...props }: Omit<ComponentProps<typeof Input>, 'value' | 'defaultValue'> & { value: string }) {
	const ref = useRef<HTMLInputElement>(null);
	useLayoutEffect(() => {
		if (ref.current && ref.current.value !== value) ref.current.value = value;
	}, [value]);
	useLayoutEffect(() => {
		const input = ref.current;
		return () => { if (input) input.value = ''; };
	}, []);
	return <Input {...props} ref={ref} type={props.type ?? 'password'} autoComplete="off" autoCapitalize="off" spellCheck={false} />;
}

/** Every UI completion is tied to the mounted session, including file dialog completions. */
export function useSafeAction(service: SafeService) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const working = useRef(false);
	const mounted = useRef(true);
	const [epoch] = useState(() => service.store.getState().generation);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const current = () => mounted.current && service.store.getState().generation === epoch;
	const run = async (action: () => Promise<void>, done?: () => void): Promise<void> => {
		if (working.current || !current()) return;
		working.current = true;
		setBusy(true);
		setError('');
		try {
			await action();
			if (current()) done?.();
		} catch (cause) {
			if (current()) setError(safeErrorKey(cause));
		} finally {
			working.current = false;
			if (current()) setBusy(false);
		}
	};
	return { busy, error, setError, current, run };
}

export function SafeErrorMessage({ error }: { error: string }) {
	const t = useT();
	return error ? <p role="alert" className="text-sm text-destructive">{t(error)}</p> : null;
}

/** Dialog titles name the dialog; they take the foreground colour, whatever colour a theme gives headings. */
export const DIALOG_TITLE_CLASS = 'text-base text-foreground';

export function ChangePasswordDialog({ service, onClose }: { service: SafeService; onClose: () => void }) {
	const t = useT();
	const id = useId();
	const [oldPassword, setOldPassword] = useState('');
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const action = useSafeAction(service);
	const submit = () => {
		if (password !== confirmation) { action.setError('safe.passwordMismatch'); return; }
		void action.run(async () => {
			validateMasterPassword(password);
			await service.changePassword(oldPassword, password);
		}, onClose);
	};
	return <Dialog open onOpenChange={open => { if (!open && !action.busy) onClose(); }}>
		<DialogContent showCloseButton={!action.busy} onPointerDownCapture={() => service.touch()} onKeyDownCapture={() => service.touch()}>
			<DialogHeader className="gap-1"><DialogTitle className={DIALOG_TITLE_CLASS}>{t('safe.changeTitle')}</DialogTitle><DialogDescription className="text-xs">{t('safe.changeDescription')}</DialogDescription></DialogHeader>
			<form className="grid gap-3" onSubmit={event => { event.preventDefault(); submit(); }} aria-busy={action.busy}>
				<div className="grid gap-1.5"><Label htmlFor={`${id}-current`}>{t('safe.currentPassword')}</Label><SecretInput id={`${id}-current`} value={oldPassword} onChange={event => setOldPassword(event.currentTarget.value)} required disabled={action.busy} autoFocus /></div>
				<div className="grid gap-1.5"><Label htmlFor={`${id}-new`}>{t('safe.newPassword')}</Label><SecretInput id={`${id}-new`} value={password} onChange={event => setPassword(event.currentTarget.value)} aria-describedby={`${id}-hint`} required disabled={action.busy} /></div>
				<div className="grid gap-1.5"><Label htmlFor={`${id}-confirm`}>{t('safe.confirmPassword')}</Label><SecretInput id={`${id}-confirm`} value={confirmation} onChange={event => setConfirmation(event.currentTarget.value)} required disabled={action.busy} /></div>
				<p id={`${id}-hint`} className="text-xs text-muted-foreground">{t('safe.masterHint')} {t('safe.oldBackups')}</p>
				<SafeErrorMessage error={action.error} />
				<DialogFooter><Button type="button" variant="outline" disabled={action.busy} onClick={onClose}>{t('safe.cancel')}</Button><Button type="submit" disabled={action.busy}>{t(action.busy ? 'safe.busy' : 'safe.changePassword')}</Button></DialogFooter>
			</form>
		</DialogContent>
	</Dialog>;
}
