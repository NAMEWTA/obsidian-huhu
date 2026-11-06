// Layout adapted from yeshimei/bz d76a0870329403247917a00c43019e203a2560a4 (MIT): src/password-vault/render.ts (platDetailShellHtml/acctCardHtml), ui.ts.
// Copyright (c) 2026 叫我包仔
// Changes: HUHU React controls, stable account identity/relations, property-only secrets and existing service actions.
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Label } from '../../../ui/components/label';
import { useT } from '../../../ui/react/hooks';
import type { SafeCredential, SafeEntry } from '../core/model';
import { entryLabel } from '../core/model';
import { AccountRelationLinks } from './AccountRelations';
import { SecretInput } from './SafeDialogs';
import type { EntryActions } from './EntryList';
import './workspace-i18n';

export function AccountDetail({
	entry,
	account,
	entries,
	actions,
	onBack,
	onNavigate,
	onEdit,
}: {
	entry: SafeEntry;
	account: SafeCredential;
	entries: SafeEntry[];
	actions: EntryActions;
	onBack: () => void;
	onNavigate: (entryId: string, credentialId: string) => void;
	onEdit: () => void;
}) {
	const t = useT();
	const control = 'h-auto min-h-11 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]';
	const id = useId();
	const [revealed, setRevealed] = useState(false);
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		heading.current?.focus();
	}, []);
	return (
		<section
			data-safe-detail
			role="region"
			aria-label={t('safe.workspace.details')}
			className="flex min-h-0 min-w-0 flex-col "
		>
			<div
				data-safe-detail-scroll
				className="grid min-h-0 min-w-0 flex-1 auto-rows-min grid-cols-1 gap-5 overflow-y-auto scrollbar-sleek [overflow-wrap:anywhere]"
			>
				<div className="hidden">
					<Button variant="secondary" className={`${control} @4xl:hidden`} onClick={onBack}>
						{t('safe.backToRecords')}
					</Button>
				</div>
				<h2
					ref={heading}
					tabIndex={-1}
					className="m-0 min-w-0 flex-1 text-base font-semibold [overflow-wrap:anywhere]"
				>
					{entryLabel(entry) || t('safe.unnamedEntry')}
				</h2>
				<dl className="m-0 grid min-w-0 grid-cols-1 gap-1 text-sm">
					{[
						[t('safe.urlField'), entry.url],
						[t('safe.usernameField'), account.username],
						[t('safe.phoneField'), account.phone],
						[t('safe.emailField'), account.email],
						[t('safe.workspace.id'), account.id],
						[t('safe.tags'), entry.tags.join(' · ')],
					].map(([label, value]) => (
						<div key={label} className="min-w-0">
							<dt className="text-xs text-muted-foreground">{label}</dt>
							<dd className="m-0 whitespace-pre-wrap">{value || t('safe.optional')}</dd>
						</div>
					))}
				</dl>
				<div className="grid min-w-0 grid-cols-1 gap-2">
					<Label htmlFor={id}>{t('safe.passwordField')}</Label>
					<SecretInput id={id} value={account.password} type={revealed ? 'text' : 'password'} readOnly />
					<Button className={control} variant="secondary" onClick={() => setRevealed((value) => !value)}>
						{t(revealed ? 'safe.hidePassword' : 'safe.showPassword')}
					</Button>
				</div>
				{entry.notes && (
					<div className="min-w-0">
						<h3 className="m-0 text-sm font-medium">{t('safe.entryNotesField')}</h3>
						<p
							tabIndex={0}
							className="m-0 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm scrollbar-sleek"
						>
							{entry.notes}
						</p>
					</div>
				)}
				{account.notes && (
					<div className="min-w-0">
						<h3 className="m-0 text-sm font-medium">{t('safe.accountNotesField')}</h3>
						<p
							tabIndex={0}
							className="m-0 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm scrollbar-sleek"
						>
							{account.notes}
						</p>
					</div>
				)}
				<AccountRelationLinks entries={entries} entry={entry} credential={account} onNavigate={onNavigate} />
			</div>
			<div
				data-safe-detail-actions
				className="mt-5 flex min-h-0 shrink-0 flex-wrap gap-2 border-t border-[var(--hu-line)] pt-4"
			>
				<Button
					className={control}
					disabled={actions.busy || !account.password}
					onClick={() => actions.copy(account.password, 'password')}
				>
					{t('safe.copyPassword')}
				</Button>
				<Button
					className={control}
					variant="secondary"
					disabled={actions.busy || !account.username}
					onClick={() => actions.copy(account.username, 'username')}
				>
					{t('safe.copyUsername')}
				</Button>
				{entry.url && (
					<Button
						className={control}
						variant="secondary"
						disabled={actions.busy}
						onClick={() => actions.openUrl(entry.url)}
					>
						{t('safe.openWebsite')}
					</Button>
				)}
				<Button className={control} variant="secondary" disabled={actions.busy} onClick={onEdit}>
					{t('safe.workspace.edit')}
				</Button>
			</div>
		</section>
	);
}
