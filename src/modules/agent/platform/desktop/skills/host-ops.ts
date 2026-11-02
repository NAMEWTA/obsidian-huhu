import os from 'node:os';
import type { App } from 'obsidian';
import type { SettingsHandle } from '../../../../../shared/settings/store';
import { deviceId } from '../../../../../host/obsidian/storage/device-id';
import { getAgent } from '../../../core/launch/catalog';
import type { TerminalSettings } from '../../../core/terminal/settings';
import type { SkillOps } from '../../../core/skills/library';
import { accountEnv } from '../agents/accounts';
import { accountPaths, systemAccountPaths } from '../agents/system-homes';
import { openPath } from '../files';
import { getLanguage } from '../../../../../shared/i18n';
import { createSkillOps } from './ops';
import { materializePackagedSkills } from './packaged';
import { trashFolder } from './trash';

/** The skills manager's disk access for this vault: real homes for system accounts, managed homes for named ones. */
export function createHostSkillOps(app: App, settings: Pick<SettingsHandle<TerminalSettings>, 'get'>): SkillOps {
	const vault = (): string | undefined => {
		const adapter = app.vault.adapter as { getBasePath?: () => string };
		return typeof adapter.getBasePath === 'function' ? adapter.getBasePath() : undefined;
	};
	return createSkillOps({
		home: os.homedir(),
		vault,
		trash: trashFolder,
		open: openPath,
		packaged: () => materializePackagedSkills(vault(), getLanguage() === 'zh' ? 'zh' : 'en'),
		async agentPaths(agent) {
			const account = settings.get().agents.agents[agent].accountId;
			if (account === '') return systemAccountPaths();
			return accountPaths(await accountEnv(getAgent(agent), account, vault() ?? '', deviceId(app)));
		},
	});
}
