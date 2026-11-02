import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SecretProtector } from '../../src/host/desktop/secret-protector';
import { OperationLedger } from '../../src/modules/browser/services/operation-ledger';
import { DesktopBrowserPersistence } from '../../src/modules/browser/platform/desktop/persistence/browser-persistence';

/** Deterministic process-shared stand-in for the OS protector, confined to temporary test data. */
export function fixtureProtector(): SecretProtector {
	const key = Buffer.alloc(32, 7);
	return {
		status: async () => 'available',
		protect: async (text, purpose) => {
			const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(Buffer.from(purpose));
			return Buffer.concat([iv, cipher.update(text), cipher.final(), cipher.getAuthTag()]).toString('base64');
		},
		unprotect: async (text, purpose) => {
			const raw = Buffer.from(text, 'base64'), cipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
			cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(raw.subarray(-16));
			return Buffer.concat([cipher.update(raw.subarray(12, -16)), cipher.final()]).toString('utf8');
		},
	};
}
export const fixtureScope = { principal: 'agent' as const, issuerId: 'process-run', authorityId: 'process-lease', spaceId: 'process-space', epoch: 1 };
export const fixturePayload = { kind: 'submit' };
export async function increment(root: string): Promise<number> {
	const filename = path.join(root, 'effect-count');
	let count = 0; try { count = Number(await fs.readFile(filename, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
	const file = await fs.open(filename, 'w', 0o600);
	try { await file.writeFile(String(++count)); await file.sync(); } finally { await file.close(); }
	return count;
}
if (process.env.HUHU_LEDGER_TEST_PROCESS === '1') {
	void (async () => {
		const root = process.argv[2]!, phase = process.argv[3]!;
		const storage = new DesktopBrowserPersistence({ root, protector: fixtureProtector() }); await storage.initialize();
		const ledger = new OperationLedger(storage, () => 1000), ticket = await ledger.prepare('process-request', fixtureScope, fixturePayload);
		// An IPC listener keeps the blocked child alive until the parent delivers SIGKILL.
		process.on('message', () => undefined);
		const stop = async (stage: string) => { process.send?.({ stage, ticket }); await new Promise<void>(() => undefined); };
		if (phase === 'prepared') await stop('prepared');
		await ledger.execute(ticket.id, fixturePayload, () => {}, async () => {
			if (phase === 'intent') await stop('intent');
			const count = await increment(root);
			if (phase === 'effect') await stop('effect');
			return { count };
		});
		await stop('completed');
	})().catch(error => { process.send?.({ error: error instanceof Error ? error.message : 'fixture_failed' }); process.exitCode = 1; });
}
