import type { HealthCheck, HealthIssueCode } from '../../health/api';
import { MAX_CONTAINER_BYTES } from '../core/model';
/** Metadata/ciphertext access only: this port deliberately has no decrypt, unlock or write operation. */
export interface SafeHealthSource {
	state(): 'loading' | 'absent' | 'locked' | 'unlocked' | 'error';
	stat(): Promise<{ size: number } | null>;
	read(): Promise<string | null>;
}
export function createSafeHealthScan(source: SafeHealthSource): HealthCheck {
	const access = (): 'locked' | 'unavailable' | 'allowed' => {
		const state = source.state();
		return state === 'locked' ? 'locked' : state === 'loading' || state === 'error' ? 'unavailable' : 'allowed';
	};
	const permission: HealthCheck['permission'] = async signal => { signal.throwIfAborted(); return access(); };
	return { permission, async *scan(context) {
		context.signal.throwIfAborted();
		const allowed = access();
		if (allowed !== 'allowed') { yield { checked: 0, status: allowed }; return; }
		if (Math.min(context.batchSize, context.remainingItems) <= 0) return;
		const metadata = await source.stat();
		context.signal.throwIfAborted();
		const afterStat = access();
		if (afterStat !== 'allowed') { yield { checked: 0, status: afterStat }; return; }
		let code: HealthIssueCode | undefined;
		if (!metadata) code = 'missing';
		else if (!Number.isSafeInteger(metadata.size) || metadata.size < 0) code = 'unparseable';
		else if (metadata.size > MAX_CONTAINER_BYTES) code = 'budget-exceeded';
		else {
			const raw = await source.read();
			context.signal.throwIfAborted();
			const afterRead = access();
			if (afterRead !== 'allowed') { yield { checked: 0, status: afterRead }; return; }
			if (raw === null) code = 'missing';
			else if (new TextEncoder().encode(raw).byteLength > MAX_CONTAINER_BYTES) code = 'budget-exceeded';
			else {
				try {
					const value: unknown = JSON.parse(raw);
					if (!value || typeof value !== 'object' || !('format' in value) || value.format !== 'huhu-safe' || !('version' in value)) code = 'unparseable';
					else if (value.version !== 1) code = 'unsupported-version';
				} catch { code = 'unparseable'; }
			}
		}
		yield { checked: 1, total: 1, ...(code === 'budget-exceeded' ? { status: 'incomplete' as const } : {}),
			issues: code ? [{ code, severity: code === 'missing' || code === 'budget-exceeded' ? 'warning' : 'error', count: 1 }] : [] };
	} };
}
