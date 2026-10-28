import { ManagedLaunchError, managedFailure } from './managed-errors';
import type { ForegroundIntent } from './foreground-intent';
import { Modal, Notice, Platform, type App } from 'obsidian';
import { getAgent } from '../../core/launch/catalog';
import { launchArgs, needsYoloConfirmation } from '../../core/launch/flags';
import type { AgentId, AgentSettings } from '../../core/launch/types';
import type { VaultSession } from '../../core/history/types';
import { accountEnv, restoredAccountReference } from '../../platform/desktop/agents/accounts';
import { accountArgs } from '../../platform/desktop/agents/account-args';
import { deviceId } from '../../../../host/obsidian/storage/device-id';
import { resolveCli } from '../../platform/desktop/agents/resolver';
import { canonicalVaultCwd } from '../../platform/desktop/history/canonical-cwd';
import { checkAccountTranscript } from '../../platform/desktop/agents/transcript';
import { resumeArgs } from '../../platform/desktop/history/scope';
import { t } from '../../../../shared/i18n/index';

/** A session to start: the program, its arguments, directory and environment. */
export interface LaunchRequest {
	file: string;
	args: string[];
	cwd: string;
	env: Record<string, string>;
	title: string;
	agentId?: AgentId;
}

export interface LaunchHost {
	/** Recovered login-shell PATH, resolved after business admission. */
	path?: string;
	interactive?: boolean;
	managed?: boolean;
	intent?: ForegroundIntent;
	/** Supplied only for a committed Space; legacy history keeps the Vault-only check. */
	validateCwd?: (cwd: string) => Promise<void>;
	app: App;
	getVaultPath: () => string | undefined;
	getAgentSettings: () => AgentSettings;
	saveAgentSettings: (settings: AgentSettings) => Promise<void>;
	/** Create the session and show it in the workbench. */
	start: (request: LaunchRequest) => Promise<void>;
}

export async function launchAgent(
	host: LaunchHost,
	agentId: AgentId,
	options: { cwd?: string; accountId?: string } = {},
): Promise<void> {
	const settings = host.getAgentSettings();
	const entry = settings.agents[agentId];
	if (!entry?.enabled) {
		if (host.managed) throw new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'provider-disabled'));
		new Notice(t('agent.agentOff', { title: getAgent(agentId).title }));
		return;
	}

	if (!await confirmLaunchPermissions(host, agentId)) return;

	const agent = getAgent(agentId);
	const command = resolveCli(agent.detectCommand, entry.cliPath, host.path ?? '');
	if (!command) {
		if (host.managed) throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'program-missing'));
		new Notice(`${t('agent.cliMissing', { title: agent.title })} ${agent.installDocsUrl}`);
		return;
	}

	const cwd = host.getVaultPath();
	if (!cwd) {
		new Notice(t('agent.vaultMissing'));
		return;
	}

	let env: Record<string, string>;
	try { env = await accountEnv(agent, options.accountId ?? entry.accountId, cwd, deviceId(host.app), true); }
	catch (cause) { if (host.managed) throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'account-unavailable')); throw cause; }
	await host.start({
		file: command,
		args: accountArgs(agentId, launchArgs(settings, agentId), env),
		agentId,
		cwd: options.cwd ?? cwd,
		env: { ...entry.env, ...env },
		title: agent.title,
	});
}

export async function resumeAgent(host: LaunchHost, session: VaultSession): Promise<void> {
	if (!Platform.isDesktop) throw new Error(t('agent.sessionMissing'));
	const vault = host.getVaultPath();
	if (!vault) throw new Error(t('agent.vaultMissing'));
	if (host.validateCwd) await host.validateCwd(session.cwd);
	else await canonicalVaultCwd(vault, session.cwd);
	const settings = host.getAgentSettings();
	const entry = settings.agents[session.agentId];
	const agent = getAgent(session.agentId);
	const { env, transcriptPath } = await restoredAccountReference(
		agent,
		session.env,
		vault,
		deviceId(host.app),
		session.transcriptPath,
	);
	await checkAccountTranscript(vault, env, transcriptPath);
	if (!entry?.enabled) {
		if (host.managed) throw new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'provider-disabled'));
		new Notice(t('agent.agentOff', { title: agent.title }));
		return;
	}

	if (!await confirmLaunchPermissions(host, session.agentId)) return;

	const command = resolveCli(agent.detectCommand, entry.cliPath, host.path ?? '');
	if (!command) {
		if (host.managed) throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'program-missing'));
		new Notice(t('agent.cliMissing', { title: agent.title }));
		return;
	}

	await host.start({
		file: command,
		agentId: session.agentId,
		args: resumeArgs(
			session.agentId,
			session.agentId === 'pi' ? transcriptPath || '' : session.sessionId,
			accountArgs(session.agentId, launchArgs(settings, session.agentId), env),
		),
		cwd: session.cwd,
		env: { ...entry.env, ...env },
		title: session.title || agent.title,
	});
}

/**
 * Every resume precondition that needs neither a record nor a process: platform, account/device reference,
 * transcript, provider enablement and program. Throws; it never shows a notice, prompts or starts anything.
 */
export async function verifyResume(host: LaunchHost, session: VaultSession): Promise<void> {
	if (!Platform.isDesktop) throw new Error(t('agent.sessionMissing'));
	const vault = host.getVaultPath();
	if (!vault) throw new Error(t('agent.vaultMissing'));
	const entry = host.getAgentSettings().agents[session.agentId];
	const agent = getAgent(session.agentId);
	const { env, transcriptPath } = await restoredAccountReference(
		agent,
		session.env,
		vault,
		deviceId(host.app),
		session.transcriptPath,
	);
	await checkAccountTranscript(vault, env, transcriptPath);
	if (!entry?.enabled) throw new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'provider-disabled'), 'none');
	if (!resolveCli(agent.detectCommand, entry.cliPath, host.path ?? ''))
		throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'program-missing'), 'none');
}

export async function confirmLaunchPermissions(host: LaunchHost, agentId: AgentId): Promise<boolean> {
	const settings = host.getAgentSettings();
	if (!needsYoloConfirmation(settings, agentId)) return true;
	if (host.interactive === false) throw new ManagedLaunchError(managedFailure('AGENT_BLOCKED', 'permission-confirmation-required'));
	if (!await confirmYolo(host.app, host.intent)) return false;
	settings.yoloAcknowledgedAgents = [...(settings.yoloAcknowledgedAgents ?? []), agentId];
	await host.saveAgentSettings(settings);
	return true;
}

function confirmYolo(app: App, intent?: ForegroundIntent): Promise<boolean> {
	return new Promise((resolve) => {
		let release: (() => void) | undefined;
		const modal = new YoloConfirmModal(app, accepted => { release?.(); resolve(accepted); });
		release = intent?.allowWithin?.(modal.containerEl);
		try { modal.open(); } catch (error) { release?.(); throw error; }
	});
}

class YoloConfirmModal extends Modal {
	private settled = false;

	constructor(
		app: App,
		private readonly choose: (accepted: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: t('agent.yoloTitle') });
		contentEl.createEl('p', {
			text: t('agent.yoloDescription'),
		});
		const row = contentEl.createDiv({ cls: 'modal-button-container' });
		const cancel = row.createEl('button', { text: t('common.cancel') });
		const ok = row.createEl('button', { text: t('common.confirm'), cls: 'mod-warning' });
		cancel.addEventListener('click', () => this.finish(false));
		ok.addEventListener('click', () => this.finish(true));
	}

	onClose(): void {
		this.finish(false, true);
	}

	private finish(accepted: boolean, fromClose = false): void {
		if (this.settled) return;
		this.settled = true;
		this.choose(accepted);
		if (!fromClose) this.close();
	}
}
