import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { registerMessages } from '../../shared/i18n/index';
import { AUTOMATION_AGENT_RUNTIME, AUTOMATION_INVOCATIONS } from '../automations/api';
import { BROWSER_MATERIAL_CONSUMERS, type BrowserMaterialConsumer } from '../browser/api';
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
import { createAgentDispatch } from './services/prompt-port';
import { quickCommandsPort } from './services/quick-commands-port';
import { sessionMaterialPort } from './services/session-material';
import { agentWorkbench } from './services/workbench';
import { agentSettings } from './settings';
import { AgentSkillDirectory } from './services/skills';
import { createSkillCatalog } from './services/skill-catalog';
import type { SkillManager } from './services/skill-manager';
import { browserMaterialConsumer } from './services/browser-material-consumer';
import type { BrowserMaterialFiles } from './platform/desktop/browser-material';

registerMessages(automationStrings);
registerMessages(commonStrings);
registerMessages(messages);

/**
 * Agent module: terminal sessions (shells, coding agents, presets) on the native helper, native history,
 * usage, the automation runtime and agent material. Everything is created per activation and ended on
 * dispose; turning the module off ends every terminal.
 */
export default function createAgentModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('agent', agentSettings);
	let controller: AgentController | undefined;
	let dispatch: ReturnType<typeof createAgentDispatch> | undefined;
	let skills: AgentSkillDirectory | undefined;
	let skillManager: SkillManager | undefined;
	let skillManagerLoading: Promise<SkillManager> | undefined;
	let closed = false;
	let materialFiles: BrowserMaterialFiles | undefined;
	let materialConsumer: BrowserMaterialConsumer | undefined;
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
	let releaseMigration: (() => void) | undefined;
	return {
		get contributions() {
			return materialConsumer ? [[BROWSER_MATERIAL_CONSUMERS, materialConsumer] as const] : [];
		},
		/** Read after `activate()`. */
		get services() {
			const current = controller;
			return skills
				? [
						[AGENT_SKILLS, skills] as const,
						[AGENT_SKILL_CATALOG, skillCatalog] as const,
						...(current
							? [
									[AUTOMATION_AGENT_RUNTIME, current.runtime] as const,
									[AGENT_SESSIONS, sessionMaterialPort(current)] as const,

									[AGENT_WORKBENCH, agentWorkbench(current)] as const,
									[AGENT_USAGE, current.workspaceUsage] as const,
									[AGENT_PROMPT_RUNNER, current.prompts] as const,
									[AGENT_DIRECTORY, { list: () => current.runtime.listAgents() }] as const,
									[AGENT_DISPATCH, dispatch!] as const,
									[AGENT_QUICK_COMMANDS, quickCommandsPort(current, settings)] as const,
								]
							: []),
					]
				: [];
		},
		pages: {
			terminal: async () => (await import('./ui/workbench-page')).createAgentPage(() => controller),
		},
		settingsPage: async () => {
			await ensureSkillManager();
			return (await import('./ui/settings-page')).agentSettingsPage(
				() => controller,
				settings,
				context.env.desktop,
				() => skillManager,
			);
		},
		async activate() {
			closed = false;
			skills = new AgentSkillDirectory(context.app.vault.adapter, settings, context.env.desktop);
			// Portable discovery never imports the terminal controller or its desktop dependency tree.
			if (!context.env.desktop) return;
			const { prepareAccounts } = await import('./platform/desktop/agents/prepare-accounts');
			releaseMigration = await prepareAccounts(context.app, context.manifest.dir ?? '', async (options) =>
				(await import('./ui/terminal/legacy-account-choice')).chooseLegacyAccount(
					context.app,
					options,
					migrationLifetime.signal,
				),
			);
			if (migrationLifetime.signal.aborted) {
				releaseMigration();
				releaseMigration = undefined;
				return;
			}
			const { AgentController } = await import('./services/controller');
			controller = new AgentController(context, settings, {
				confirm: async (app, message) =>
					(await import('./ui/terminal/confirm')).confirmAction(app, message, migrationLifetime.signal),
			});
			await controller.workspace.persistence.ready;
			controller.registerCommands();
			const current = controller;
			if (current.vaultPath()) {
				const { BrowserMaterialFiles: Files } = await import('./platform/desktop/browser-material');
				materialFiles = new Files(current.vaultPath()!);
				materialConsumer = browserMaterialConsumer(current, materialFiles, migrationLifetime.signal);
			}
			dispatch = createAgentDispatch({
				agents: () => current.runtime.listAgents(),
				invocations: () => context.services.peek(AUTOMATION_INVOCATIONS),
				cwd: () => current.vaultPath() ?? '',
				clock: context.app.workspace.containerEl.win,
			});
		},
		async dispose() {
			migrationLifetime.abort();
			materialConsumer = undefined;
			releaseMigration?.();
			releaseMigration = undefined;
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
			await current?.dispose();
			await materialFiles?.dispose();
			materialFiles = undefined;
		},
	};
}
