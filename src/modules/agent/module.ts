import { messages as nativeStrings } from '../../shared/i18n/lazy/native';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { registerMessages } from '../../shared/i18n/index';
import { AUTOMATION_AGENT_RUNTIME, AUTOMATION_INVOCATIONS } from '../automations/api';
import {
	AGENT_DIRECTORY,
	AGENT_DISPATCH,
	AGENT_PROMPT_RUNNER,
	AGENT_SESSIONS,
	AGENT_SKILLS,
	AGENT_SKILL_CATALOG,
	AGENT_WORKBENCH,
	AGENT_USAGE,
	AGENT_QUICK_COMMANDS,
} from './api';
import { messages } from './i18n';
import { messages as automationStrings } from '../../shared/i18n/lazy/automation';
import { messages as commonStrings } from '../../shared/i18n/lazy/common';
import type { AgentController } from './services/controller';
import type { SpaceService } from './services/spaces/space-service';
import { createAgentDispatch } from './services/prompt-port';
import { quickCommandsPort } from './services/quick-commands-port';
import { sessionMaterialPort } from './services/session-material';
import { agentWorkbench } from './services/workbench';
import { agentSettings } from './settings';
import { AgentSkillDirectory } from './services/skills';
import { createSkillCatalog } from './services/skill-catalog';
import type { SkillManager } from './services/skill-manager';
import type { App } from 'obsidian';
import type { SharedWorkspaceOwner } from '../../app/contracts/shared-workspace';

registerMessages(automationStrings);
registerMessages(commonStrings);
registerMessages(messages);
registerMessages(nativeStrings);


/** App-created owner; Agent borrows its exact SpaceService and WorkspaceStore when enabled. */
export async function createSharedWorkspaceOwner(
	app: App,
	report: (error: unknown) => void,
	recovery?: import('../../shared/storage/recovery-contracts').RecoveryAccess,
): Promise<SharedWorkspaceOwner> {
	// Never open the records while a recovery operation is replacing them (or after it failed).
	await recovery?.settled();
	const [
		{ createDesktopSpacePorts },
		{ SpaceService },
		{ createSpaceWorkspaceStore },
		{ vaultIdentity },
		{ privateVaultStorage },
	] = await Promise.all([
		import('./platform/desktop/spaces/ports'),
		import('./services/spaces/space-service'),
		import('./services/workspace-store'),
		import('../../host/obsidian/storage/device-id'),
		import('../../host/obsidian/storage/private-storage'),
	]);
	const win = app.workspace.containerEl.win;
	const identity = vaultIdentity(app);
	const ports = createDesktopSpacePorts({
		vaultRoot: (app.vault.adapter as { getBasePath?: () => string }).getBasePath?.() ?? '',
		vaultId: identity.vaultId,
		deviceId: identity.deviceId,
		win,
	});
	const spaces = new SpaceService({
		...ports,
		storage: privateVaultStorage(app),
		instanceId: crypto.randomUUID(),
		report,
	});
	const workspaceStore = createSpaceWorkspaceStore(spaces, win, report);
	// Agent writes through this one SpaceService/store, so one owner gates it.
	const registered = recovery
		? await (await import('./services/migrations/entry')).registerSpaceOwner(recovery, identity.deviceId, spaces, workspaceStore)
		: undefined;
	const recoveryOwner = registered?.owner;
	const unregister = registered?.unregister;
	return {
		ready: Promise.all([spaces.ready, workspaceStore.ready]).then(() => undefined),
		spaces,
		workspaceStore,
		setSpaceChooser(chooser) {
			spaces.setSpaceChooser(chooser as import('./core/space/ports').SpaceChooser | undefined);
		},
		recoveryOwner,
		dispose: () => {
			unregister?.();
			return workspaceStore.dispose();
		},
	};
}

/**
 * Agent module: terminal sessions (shells, coding agents, presets) on the native helper, native history,
 * usage, the automation runtime and agent material. Everything is created per activation and ended on
 * dispose; turning the module off ends every terminal.
 */
export default function createAgentModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('agent', agentSettings);
	let controller: AgentController | undefined;
	let sharedWorkspace: SharedWorkspaceOwner | undefined;
	let dispatch: ReturnType<typeof createAgentDispatch> | undefined;
	let skills: AgentSkillDirectory | undefined;
	let skillManager: SkillManager | undefined;
	let skillManagerLoading: Promise<SkillManager> | undefined;
	let closed = false;
	let unregisterRecovery: Array<() => void> = [];
	/** The skills manager is created on first use (the settings page or a skill listing); nothing scans until `refresh` is called. */
	const ensureSkillManager = async (): Promise<SkillManager | undefined> => {
		if (!context.env.desktop || closed) return undefined;
		skillManagerLoading ??= import('./services/skill-manager').then(({ SkillManager: Manager }) => {
			skillManager ??= new Manager({
				extraDirectories: () => settings.get().skillDirectories,
				load: async () =>
					(await import('./platform/desktop/skills/host-ops')).createHostSkillOps(context.app, settings),
			});
			return skillManager;
		});
		const created = await skillManagerLoading;
		return closed ? undefined : created;
	};
	const skillCatalog = createSkillCatalog(ensureSkillManager, async (dir) =>
		(await import('./platform/desktop/skills/skill-fs')).readSkillDoc(dir),
	);
	const migrationLifetime = new AbortController();
	return {
		/** Read after `activate()`. */
		get services() {
			const current = controller;
			return skills
				? [
						[AGENT_SKILLS, skills] as const,
						[AGENT_SKILL_CATALOG, skillCatalog] as const,
						...(current
							? [
									[
										AUTOMATION_AGENT_RUNTIME,
										{
											listAgents: () => current.runtime.listAgents(),
											listSpaces: () => current.spaceChoices(),
											boundCwd: (spaceId: string | undefined, cwd: string) =>
												current.runtime.boundCwd(spaceId, cwd),
											listSessions: async (cwd: string) => {
												await current.prepare();
												return current.runtime.listSessions(cwd);
											},
											start: async (...args: Parameters<typeof current.runtime.start>) => {
												await current.prepare();
												return current.runtime.start(...args);
											},
											startScript: async (
												...args: Parameters<typeof current.runtime.startScript>
											) => {
												await current.prepare();
												return current.runtime.startScript(...args);
											},
											stop: (id: string) => current.runtime.stop(id),
											open: (id: string) => current.runtime.open(id),
										},
									] as const,
									[AGENT_SESSIONS, sessionMaterialPort(current)] as const,
									[AGENT_WORKBENCH, agentWorkbench(current)] as const,
									[AGENT_USAGE, current.workspaceUsage] as const,
									[
										AGENT_PROMPT_RUNNER,
										{
											run: async (...args: Parameters<typeof current.prompts.run>) => {
												await current.prepare();
												return current.prompts.run(...args);
											},
											open: (id: string) => current.prompts.open(id),
											close: (id: string) => current.prompts.close(id),
										},
									] as const,
									[
										AGENT_DIRECTORY,
										{
											list: () => current.runtime.listAgents(),
											spaces: () => current.spaceChoices(),
										},
									] as const,
									[
										AGENT_DISPATCH,
										{
											dispatch: async (
												...args: Parameters<NonNullable<typeof dispatch>['dispatch']>
											) => {
												await current.prepare();
												return dispatch!.dispatch(...args);
											},
										},
									] as const,
									[AGENT_QUICK_COMMANDS, quickCommandsPort(current, settings)] as const,
								]
							: []),
					]
				: [];
		},
		pages: {
			terminal: async () => {
				await controller?.prepareWorkbench();
				return (await import('./ui/workbench-page')).createAgentPage(() => controller);
			},
		},
		settingsPage: async () => {
			await controller?.prepare();
			await ensureSkillManager();
			return (await import('./ui/settings-page')).agentSettingsPage(
				() => controller,
				settings,
				context.env.desktop,
				() => skillManager,
				async () => {
					const recovery = context.recovery;
					return recovery
						? (await import('./services/backup/entry')).loadBackupActions(context.app, recovery)
						: undefined;
				},
			);
		},
		async activate() {
			closed = false;
			skills = new AgentSkillDirectory(context.app.vault.adapter, settings, context.env.desktop);
			// Portable discovery never imports the terminal controller or its desktop dependency tree.
			if (!context.env.desktop) return;
			const { AgentController } = await import('./services/controller');
			sharedWorkspace = context.sharedWorkspace ?? (await context.ensureSharedWorkspace?.());
			controller = new AgentController(
				context,
				settings,
				{
					confirm: async (app, message) =>
						(await import('./ui/terminal/confirm')).confirmAction(app, message, migrationLifetime.signal),
					selectSpace: async (request) =>
						(await import('./ui/create/SpacePicker')).pickSpace(
							context.app,
							request,
							migrationLifetime.signal,
							(controller?.spaces ?? sharedWorkspace?.spaces) as SpaceService | undefined,
						),
				},
				sharedWorkspace,
			);
			// Failed metadata remains visible in the workbench; it must not disable the terminal or erase data.
			await controller.workspace.persistence.ready.catch(() => {});
			if (context.recovery)
				unregisterRecovery = await (
					await import('./services/migrations/entry')
				).registerLiveOwners(context.recovery, context.app, controller);
			controller.registerCommands();
			const current = controller;
			dispatch = createAgentDispatch({
				agents: () => current.runtime.listAgents(),
				invocations: () => context.services.peek(AUTOMATION_INVOCATIONS),
				spaces: {
					has: (spaceId) => current.spaces.list().some((space) => space.id === spaceId),
					choose: async (signal) =>
						(await current.spaces.requireSpace(undefined, { interactive: true, signal }))?.id,
				},
				clock: context.app.workspace.containerEl.win,
			});
		},
		async dispose() {
			migrationLifetime.abort();
			skills?.dispose();
			skills = undefined;
			closed = true;
			skillManager?.dispose();
			skillManager = undefined;
			skillManagerLoading = undefined;
			dispatch?.dispose();
			dispatch = undefined;
			const current = controller;
			controller = undefined;
			for (const off of unregisterRecovery) off();
			unregisterRecovery = [];
			try {
				await current?.dispose();
			} finally {
				sharedWorkspace?.setSpaceChooser?.(undefined);
				sharedWorkspace = undefined;
			}
		},
	};
}
