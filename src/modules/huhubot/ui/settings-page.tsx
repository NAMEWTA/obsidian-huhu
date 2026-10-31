import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import type { SettingsHandle } from '../../../shared/settings/store';
import { useT } from '../../../ui/react/hooks';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Checkbox } from '../../../ui/components/checkbox';
import { Label } from '../../../ui/components/label';
import { SettingsRow } from '../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import type { BotRuntimeAccess, BudgetSettings, BudgetPolicy } from '../api';
import type { HuhuBotSettings } from '../settings';
import { commandMeta } from '../services/workbench/workbench-client';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

/** Installation settings contain no secrets. Credentials use the private registration channel. */
export function huhubotSettingsPage(settings: SettingsHandle<HuhuBotSettings>, runtime: BotRuntimeAccess) {
	return function HuhuBotSettingsPage() {
		const t = useT(),
			id = useId();
		const rowClass =
			'flex-col items-stretch [&>div]:w-full [&>div]:min-w-0 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:[&>div]:w-auto';
		const value = useSyncExternalStore(
			(listener) => settings.subscribe(listener),
			() => settings.get(),
		);
		const [busy, setBusy] = useState(false),
			[error, setError] = useState<string>();
		const [connected, setConnected] = useState(runtime.client?.state === 'ready');
		const [secret, setSecret] = useState(''),
			[mode, setMode] = useState<'protected' | 'session-memory'>('protected');
		const [reference, setReference] = useState(''),
			[credentialState, setCredentialState] = useState('');
		const [budget, setBudget] = useState<BudgetSettings>();
		const [budgetLoading, setBudgetLoading] = useState(false),
			[budgetRead, setBudgetRead] = useState(0),
			[reloadBudget, setReloadBudget] = useState(false);
		const [policy, setPolicy] = useState<BudgetPolicy>({
			rootTokenLimit: '0',
			profileTokenLimit: '0',
			maintenanceTokenLimit: '0',
			paused: true,
		});
		useEffect(() => {
			const client = runtime.client;
			if (!connected || !client || client.state !== 'ready') return;
			setBudget(undefined);
			setBudgetLoading(true);
			let alive = true;
			const controller = new AbortController();
			const off = client.onClose(() => {
				if (alive) {
					setBudget(undefined);
					setBudgetLoading(false);
					setReloadBudget(false);
					setConnected(false);
				}
			});
			void client.collaboration
				.budget({ profileId: client.hello.profile.profileId }, { signal: controller.signal })
				.then((value) => {
					if (alive && runtime.client === client && client.state === 'ready') {
						setBudget(value);
						setPolicy(value.policy);
					}
				})
				.catch(() => {
					if (alive) setError(t('huhubot.settings.failed'));
				})
				.finally(() => {
					if (alive) setBudgetLoading(false);
				});
			return () => {
				alive = false;
				controller.abort();
				off();
			};
		}, [connected, budgetRead, t]);
		const save = <K extends keyof HuhuBotSettings>(key: K, next: HuhuBotSettings[K]) => {
			void settings
				.update((draft) => {
					draft[key] = next;
				})
				.catch(() => toast.error(t('settings.writeFailed')));
		};
		const connect = async () => {
			setBudget(undefined);
			setBusy(true);
			setError(undefined);
			try {
				await runtime.connect();
				setConnected(true);
			} catch {
				setError(t('huhubot.settings.connectFailed'));
			} finally {
				setBusy(false);
			}
		};
		const register = async () => {
			const bytes = new TextEncoder().encode(secret);
			setSecret('');
			setBusy(true);
			setError(undefined);
			setReference('');
			try {
				const result = await runtime.registerCredential(bytes, mode);
				if (result.state !== 'available') {
					setCredentialState(t('huhubot.settings.credentialFailed'));
					return;
				}
				setReference(result.credentialRef);
				setCredentialState(
					t(result.mode === 'session-memory' ? 'huhubot.settings.memoryOnly' : 'huhubot.settings.protected'),
				);
			} catch {
				setError(t('huhubot.settings.credentialFailed'));
			} finally {
				bytes.fill(0);
				setBusy(false);
			}
		};
		const configure = async () => {
			const client = runtime.client;
			if (!client || !budget) return;
			setBusy(true);
			setError(undefined);
			try {
				const result = await client.collaboration.configureBudget({
					...commandMeta(client),
					expectedRevision: budget.revision,
					policy,
				});
				setBudget(result);
				setPolicy(result.policy);
				toast.success(t('huhubot.settings.budgetSaved'));
			} catch {
				setError(t('huhubot.settings.failed'));
			} finally {
				setBusy(false);
			}
		};
		return (
			<div className="@container space-y-8">
				<SettingsSection title={t('huhubot.settings.runner')} description={t('huhubot.settings.runnerDesc')}>
					<SettingsRow
						className={rowClass}
						label={t('huhubot.settings.binaryPath')}
						description={t('huhubot.settings.binaryPathDesc')}
						control={
							<Input
								aria-label={t('huhubot.settings.binaryPath')}
								value={value.binaryPath}
								onChange={(event) => save('binaryPath', event.currentTarget.value)}
							/>
						}
					/>
					<SettingsRow
						className={rowClass}
						label={t('huhubot.settings.workingDirectory')}
						description={t('huhubot.settings.workingDirectoryDesc')}
						control={
							<Input
								aria-label={t('huhubot.settings.workingDirectory')}
								value={value.workingDirectory}
								onChange={(event) => save('workingDirectory', event.currentTarget.value)}
							/>
						}
					/>
					<SettingsRow
						className={rowClass}
						label={t('huhubot.settings.profileRoot')}
						description={t('huhubot.settings.profileRootDesc')}
						control={
							<Input
								aria-label={t('huhubot.settings.profileRoot')}
								value={value.profileRoot}
								onChange={(event) => save('profileRoot', event.currentTarget.value)}
							/>
						}
					/>
					<p className="text-xs text-muted-foreground">{t('huhubot.settings.restartHint')}</p>
					<Button disabled={busy || connected} onClick={() => void connect()}>
						{t(connected ? 'huhubot.settings.connected' : 'huhubot.settings.connect')}
					</Button>
				</SettingsSection>
				{connected && (
					<>
						<SettingsSection
							title={t('huhubot.settings.credentials')}
							description={t('huhubot.settings.secretBoundary')}
						>
							<div className="grid gap-2">
								<Label htmlFor={`${id}-secret`}>{t('huhubot.settings.apiKey')}</Label>
								<Input
									id={`${id}-secret`}
									type="password"
									disabled={busy}
									autoComplete="off"
									value={secret}
									onChange={(event) => setSecret(event.currentTarget.value)}
								/>
								<Label htmlFor={`${id}-mode`}>{t('huhubot.settings.storage')}</Label>
								<select
									disabled={busy}
									id={`${id}-mode`}
									className="min-h-11 rounded-md border border-input bg-background px-2"
									value={mode}
									onChange={(event) => setMode(event.currentTarget.value as typeof mode)}
								>
									<option value="protected">{t('huhubot.settings.protected')}</option>
									<option value="session-memory">{t('huhubot.settings.memoryOnly')}</option>
								</select>
								<Button disabled={busy || !secret} onClick={() => void register()}>
									{t('huhubot.settings.register')}
								</Button>
								{credentialState && (
									<p role="status" className="text-xs">
										{credentialState}
									</p>
								)}
								{reference && (
									<>
										<Label htmlFor={`${id}-reference`}>{t('huhubot.settings.reference')}</Label>
										<Input id={`${id}-reference`} readOnly value={reference} />
									</>
								)}
							</div>
						</SettingsSection>
						<SettingsSection
							title={t('huhubot.settings.budget')}
							description={t('huhubot.settings.budgetDesc')}
						>
							{(['rootTokenLimit', 'profileTokenLimit', 'maintenanceTokenLimit'] as const).map((key) => (
								<SettingsRow
									className={rowClass}
									key={key}
									label={t(`huhubot.settings.${key}`)}
									control={
										<Input
											aria-label={t(`huhubot.settings.${key}`)}
											inputMode="numeric"
											disabled={busy || !budget}
											value={policy[key]}
											onChange={(event) => {
												const next = event.currentTarget.value;
												setPolicy((current) => ({ ...current, [key]: next }));
											}}
										/>
									}
								/>
							))}
							<label className="flex min-h-11 items-center gap-2 text-sm">
								<Checkbox
									aria-label={t('huhubot.settings.paused')}
									checked={policy.paused}
									disabled={busy || !budget}
									onCheckedChange={(checked) =>
										setPolicy((current) => ({ ...current, paused: checked === true }))
									}
								/>
								{t('huhubot.settings.paused')}
							</label>
							<div className="flex flex-wrap gap-2">
								<Button
									disabled={
										busy ||
										!budget ||
										[
											policy.rootTokenLimit,
											policy.profileTokenLimit,
											policy.maintenanceTokenLimit,
										].some((value) => !/^(0|[1-9][0-9]{0,17})$/.test(value))
									}
									onClick={() => void configure()}
								>
									{t('huhubot.settings.saveBudget')}
								</Button>
								<Button
									variant="outline"
									className="h-auto min-h-9 max-w-full whitespace-normal py-2"
									disabled={busy || budgetLoading}
									onClick={() => {
										if (budget) setReloadBudget(true);
										else {
											setError(undefined);
											setBudgetRead((value) => value + 1);
										}
									}}
								>
									{t(budget ? 'huhubot.common.reloadSaved' : 'huhubot.common.refresh')}
								</Button>
							</div>
						</SettingsSection>
					</>
				)}
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<UnsavedChangesDialog
					open={connected && reloadBudget}
					onCancel={() => setReloadBudget(false)}
					onDiscard={() => {
						setReloadBudget(false);
						setError(undefined);
						setBudgetRead((value) => value + 1);
					}}
				/>
			</div>
		);
	};
}
