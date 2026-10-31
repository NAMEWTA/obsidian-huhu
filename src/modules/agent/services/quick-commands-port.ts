import type { SettingsHandle } from '../../../shared/settings/store';
import type { AgentQuickCommands } from '../api';
import type { TerminalSettings } from '../core/terminal/settings';
import type { AgentController } from './controller';
import { ManagedLaunchError } from './launch/managed-errors';
import { t } from '../../../shared/i18n';
import { SpaceError } from '../core/space/errors';
import { spaceErrorMessage } from './spaces/messages';

/** The saved terminal quick commands for other modules; running goes through the controller like the terminal's own menu. */
export function quickCommandsPort(
	controller: Pick<AgentController, 'runQuickCommand'>,
	settings: Pick<SettingsHandle<TerminalSettings>, 'get' | 'subscribe'>,
): AgentQuickCommands {
	return {
		list: () =>
			settings.get().quickCommands.map((command) => ({
				id: command.id,
				name: command.name,
				type: command.type,
				scope: command.scope,
				...(command.type === 'agent' ? { agentId: command.agentId } : {}),
				...(command.spaceId ? { spaceId: command.spaceId } : {}),
			})),
		subscribe: (listener) => settings.subscribe(listener),
		async run(id, options) {
			const command = settings.get().quickCommands.find((item) => item.id === id);
			if (!command) throw new Error('missing');
			try {
				await controller.runQuickCommand(command, undefined, { spaceId: options?.spaceId });
			} catch (error) {
				// Other modules show the message: a gone Space reads as a sentence, not as an error code.
				if (error instanceof ManagedLaunchError) throw new Error(t(error.failure.messageKey), { cause: error });
				throw error instanceof SpaceError ? new Error(spaceErrorMessage(error), { cause: error }) : error;
			}
		},
	};
}
