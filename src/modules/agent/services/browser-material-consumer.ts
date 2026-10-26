import type { BrowserMaterialConsumer } from '../../browser/api';
import { t } from '../../../shared/i18n';
import type { AgentController } from './controller';
import type { BrowserMaterialFiles } from '../platform/desktop/browser-material';

/** Browser gathers already-active consumers. This contribution never starts an Agent or submits its input. */
export function browserMaterialConsumer(
	controller: Pick<AgentController, 'sessions' | 'materials'>,
	files: BrowserMaterialFiles,
	signal: AbortSignal,
): BrowserMaterialConsumer {
	const eligible = () =>
		signal.aborted
			? []
			: controller.sessions
					.list()
					.filter(
						(session) =>
							session.agentId && session.running && !session.automated && session.activity !== 'running',
					);
	return {
		id: 'agent-sessions',
		targets: async () => eligible().map((session) => ({ id: session.id, label: session.title })),
		async deliver(targetId, material) {
			const session = eligible().find((item) => item.id === targetId);
			if (!session?.agentId) throw new Error('material_target_unavailable');
			const prepared = await files.prepare(material.image, signal);
			try {
				if (signal.aborted || controller.sessions.get(targetId) !== session || !eligible().includes(session))
					throw new Error('material_target_unavailable');
				await controller.materials.attachMaterial(
					targetId,
					{
						title: material.title.slice(0, 200),
						text: `${t('agent.browserMaterial.untrusted')}\n\n${material.text.slice(0, 128 * 1024)}`,
						files: prepared.files,
					},
					{ agentId: session.agentId, signal },
				);
			} catch (error) {
				await prepared.release();
				throw error;
			}
		},
	};
}
