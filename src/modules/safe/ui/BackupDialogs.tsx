import { useEffect, useId, useState, type ReactNode } from 'react';
import { Button } from '../../../ui/components/button';
import { Checkbox } from '../../../ui/components/checkbox';
import { Label } from '../../../ui/components/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';
import type { MergeSummary } from '../core/merge';
import { mergeChangesAnything } from '../core/merge';
import type { SafeService } from '../services/safe-service';
import { DIALOG_TITLE_CLASS, SafeErrorMessage, SecretInput, useSafeAction } from './SafeDialogs';

/** The result of a merge import, line by line; zero lines are left out. */
export function MergeSummaryList({ summary }: { summary: MergeSummary }) {
	const t = useT();
	const lines = [
		summary.addedEntries > 0 && t('safe.import.added', { count: summary.addedEntries }),
		summary.mergedEntries > 0 && t('safe.import.merged', { count: summary.mergedEntries, added: summary.addedCredentials, updated: summary.updatedCredentials }),
		summary.skippedEntries > 0 && t('safe.import.skipped', { count: summary.skippedEntries }),
		summary.skippedCredentials > 0 && t('safe.import.skippedAccounts', { count: summary.skippedCredentials }),
		summary.skippedTrashed > 0 && t('safe.import.skippedTrashed', { count: summary.skippedTrashed }),
	].filter((line): line is string => typeof line === 'string');
	return <ul className="m-0 grid list-disc gap-0.5 pl-5 text-[13px] text-foreground">
		{lines.length ? lines.map(line => <li key={line}>{line}</li>) : <li>{t('safe.import.nothing')}</li>}
	</ul>;
}

/** Choose a backup file and enter the master password it was made with. The password never outlives the form. */
function BackupPicker({ service, busy, onChoose, onSubmit, submitLabel, password, setPassword, selected, error }: {
	service: SafeService;
	busy: boolean;
	onChoose: (raw: string) => void;
	onSubmit: () => void;
	submitLabel: string;
	password: string;
	setPassword: (value: string) => void;
	selected: boolean;
	error: ReactNode;
}) {
	const t = useT();
	const win = useOwnerWindow();
	const id = useId();
	const action = useSafeAction(service);
	const choose = () => action.run(async () => {
		const raw = await service.pickBackup(win);
		if (action.current() && raw !== null) onChoose(raw);
	});
	return <form className="grid gap-3" onSubmit={event => { event.preventDefault(); onSubmit(); }} aria-busy={busy || action.busy}>
		<div className="flex items-center gap-2">
			<Button type="button" size="sm" variant="outline" disabled={busy || action.busy} onClick={() => { void choose(); }}>{t('safe.chooseBackup')}</Button>
			{selected && <span role="status" className="text-xs text-muted-foreground">{t('safe.backupSelected')}</span>}
		</div>
		<div className="grid gap-1.5">
			<Label htmlFor={`${id}-password`}>{t('safe.backupPassword')}</Label>
			<SecretInput id={`${id}-password`} className="h-8" value={password} onChange={event => setPassword(event.currentTarget.value)} required disabled={busy || action.busy || !selected} />
		</div>
		<SafeErrorMessage error={action.error} />
		{error}
		<DialogFooter className="gap-2">
			<Button type="submit" size="sm" disabled={busy || action.busy || !selected || !password}>{submitLabel}</Button>
		</DialogFooter>
	</form>;
}

/**
 * Merge a backup into the unlocked safe. Step 1 authenticates the backup and previews the result; step 2 writes it
 * after keeping an encrypted copy of the current safe; step 3 reports what was added, merged and skipped.
 */
export function ImportDialog({ service, onClose, onImported }: { service: SafeService; onClose: () => void; onImported: (summary: MergeSummary) => void }) {
	const t = useT();
	const [raw, setRaw] = useState<string | null>(null);
	const [password, setPassword] = useState('');
	const [verified, setVerified] = useState<{ token: string; entryCount: number; summary: MergeSummary } | null>(null);
	const [result, setResult] = useState<MergeSummary | null>(null);
	const action = useSafeAction(service);
	useEffect(() => () => service.cancelImport(), [service]);
	const verify = () => action.run(async () => {
		if (raw === null) return;
		const prepared = await service.prepareImport(raw, password);
		if (action.current()) { setVerified(prepared); setRaw(null); setPassword(''); }
	});
	const commit = () => action.run(async () => {
		if (!verified) return;
		const summary = await service.commitImport(verified.token);
		if (action.current()) { setResult(summary); setVerified(null); onImported(summary); }
	});
	const title = result ? 'safe.import.doneTitle' : 'safe.import.title';
	return <Dialog open onOpenChange={open => { if (!open && !action.busy) onClose(); }}>
		<DialogContent className="gap-3 p-5" showCloseButton={!action.busy} onPointerDownCapture={() => service.touch()} onKeyDownCapture={() => service.touch()}>
			<DialogHeader className="gap-1">
				<DialogTitle className={DIALOG_TITLE_CLASS}>{t(title)}</DialogTitle>
				<DialogDescription className="text-xs">{t(result ? 'safe.import.doneDescription' : verified ? 'safe.import.confirmDescription' : 'safe.import.description')}</DialogDescription>
			</DialogHeader>
			{result ? <>
				<MergeSummaryList summary={result} />
				<DialogFooter><Button size="sm" onClick={onClose}>{t('safe.done')}</Button></DialogFooter>
			</> : verified ? <>
				<p className="m-0 text-[13px] text-muted-foreground">{t('safe.import.backupHolds', { count: verified.entryCount })}</p>
				<MergeSummaryList summary={verified.summary} />
				<p className="m-0 text-xs text-muted-foreground">{t('safe.import.rules')}</p>
				<SafeErrorMessage error={action.error} />
				<DialogFooter className="gap-2">
					<Button size="sm" variant="outline" disabled={action.busy} onClick={onClose}>{t('safe.cancel')}</Button>
					<Button size="sm" disabled={action.busy || !mergeChangesAnything(verified.summary)} onClick={() => { void commit(); }}>{t(action.busy ? 'safe.busy' : 'safe.import.run')}</Button>
				</DialogFooter>
			</> : <BackupPicker service={service} busy={action.busy} selected={raw !== null} password={password} setPassword={setPassword}
				onChoose={value => { setRaw(value); setPassword(''); }} onSubmit={() => { void verify(); }}
				submitLabel={t(action.busy ? 'safe.busy' : 'safe.verifyBackup')} error={<SafeErrorMessage error={action.error} />} />}
		</DialogContent>
	</Dialog>;
}

/**
 * Replace the whole safe with a backup. This is the dangerous variant: the backup is authenticated first, and the
 * final button stays disabled until the replacement is confirmed in the dialog itself.
 */
export function RestoreDialog({ service, onClose }: { service: SafeService; onClose: () => void }) {
	const t = useT();
	const id = useId();
	const [raw, setRaw] = useState<string | null>(null);
	const [password, setPassword] = useState('');
	const [verified, setVerified] = useState<{ token: string; entryCount: number } | null>(null);
	const [confirmed, setConfirmed] = useState(false);
	const action = useSafeAction(service);
	useEffect(() => () => service.cancelRestore(), [service]);
	const verify = () => action.run(async () => {
		if (raw === null) return;
		const result = await service.prepareRestore(raw, password);
		if (action.current()) { setVerified(result); setRaw(null); setPassword(''); }
	});
	return <Dialog open onOpenChange={open => { if (!open && !action.busy) onClose(); }}>
		<DialogContent className="gap-3 p-5" showCloseButton={!action.busy} onPointerDownCapture={() => service.touch()} onKeyDownCapture={() => service.touch()}>
			<DialogHeader className="gap-1">
				<DialogTitle className={DIALOG_TITLE_CLASS}>{t(verified ? 'safe.replaceTitle' : 'safe.restoreTitle')}</DialogTitle>
				<DialogDescription className="text-xs">{verified ? t('safe.replaceDescription', { count: verified.entryCount }) : t('safe.restoreDescription')}</DialogDescription>
			</DialogHeader>
			{verified ? <>
				<div className="flex items-start gap-2">
					<Checkbox id={`${id}-confirm`} checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={action.busy} />
					<Label htmlFor={`${id}-confirm`} className="text-[13px] leading-snug font-normal">{t('safe.replaceConfirm')}</Label>
				</div>
				<SafeErrorMessage error={action.error} />
				<DialogFooter className="gap-2">
					<Button size="sm" variant="outline" disabled={action.busy} onClick={onClose}>{t('safe.cancel')}</Button>
					<Button size="sm" variant="destructive" disabled={action.busy || !confirmed} onClick={() => { void action.run(() => service.commitRestore(verified.token), onClose); }}>{t(action.busy ? 'safe.busy' : 'safe.replace')}</Button>
				</DialogFooter>
			</> : <BackupPicker service={service} busy={action.busy} selected={raw !== null} password={password} setPassword={setPassword}
				onChoose={value => { setRaw(value); setPassword(''); }} onSubmit={() => { void verify(); }}
				submitLabel={t(action.busy ? 'safe.busy' : 'safe.verifyBackup')} error={<SafeErrorMessage error={action.error} />} />}
		</DialogContent>
	</Dialog>;
}
