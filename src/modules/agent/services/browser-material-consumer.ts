import { BROWSER_MATERIAL_DELIVERY_UNKNOWN, type BrowserMaterialConsumer } from '../../browser/api';
import { MaterialDeliveryError } from './session-material';
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
		async deliver(targetId, material, source) {
			const session = eligible().find((item) => item.id === targetId);
			if (!session?.agentId) throw new Error('material_target_unavailable');
			const abort = new AbortController(), cancel = () => abort.abort();
			const signals = [signal, source?.signal].filter((item): item is AbortSignal => !!item);
			for (const item of signals) { if (item.aborted) abort.abort(); item.addEventListener('abort', cancel, { once: true }); }
			const validate = () => { if (abort.signal.aborted) throw new Error('material_cancelled'); source?.validate?.(); };
			let prepared: Awaited<ReturnType<BrowserMaterialFiles['prepare']>> | undefined;
			try {
				validate();
				prepared = await files.prepare(material, abort.signal);
				validate();
				if (signal.aborted || controller.sessions.get(targetId) !== session || !eligible().includes(session))
					throw new Error('material_target_unavailable');
				await controller.materials.attachMaterial(
					targetId,
					{
						title: `${t('agent.browserMaterial.untrusted')}\n${material.title.slice(0, 200)}`,
						text: prepared.preview,
						source: material.source ? JSON.stringify(material.source) : undefined,
						files: prepared.files,
					},
					{ agentId: session.agentId, signal: abort.signal, reveal: false, validate: () => { validate(); if (controller.sessions.get(targetId) !== session || !eligible().includes(session)) throw new Error('material_target_unavailable'); } },
				);
			} catch (error) {
				if (error instanceof MaterialDeliveryError && error.code === 'unknown') throw new Error(BROWSER_MATERIAL_DELIVERY_UNKNOWN);
				await prepared?.release();
				if (error instanceof MaterialDeliveryError) throw new Error(error.code === 'timeout' ? 'material_target_timeout' : error.code === 'cancelled' ? 'material_cancelled' : error.code === 'busy' ? 'material_target_busy' : 'material_target_unavailable');
				throw error;
			} finally { for (const item of signals) item.removeEventListener('abort', cancel); }
		},
	};
}
