import { NATIVE_INPUT_LIMITS, type NativeInputOptions, type NativeInputSubmission, type NativeResizeSubmission } from '../../../src/shared/native/input';

interface LegacyShape {
	input?(sid: number, data: string | Uint8Array): unknown;
	resize?(sid: number, cols: number, rows: number): unknown;
}

/**
 * Every capability the current helper always provides, with inert behaviour. Spread it first into a mock helper or
 * session port, then override what the test observes. Submissions delegate to the mock's own `input`/`resize`, so
 * tests that watch those calls keep working.
 */
export const CURRENT_NATIVE = {
	inputAdmission: 1 as const,
	outputAbandon: 1 as const,
	replySettlement: 1 as const,
	localControl: 1 as const,
	editorTransactions: 1 as const,
	inputLimits: NATIVE_INPUT_LIMITS,
	abandonOutput(_sid: number): void {},
	editorBinding(_sid: number) { return undefined; },
	prepareControl(): never { throw new Error('mock helper has no local control lane'); },
	reply(this: LegacyShape, sid: number, data: string | Uint8Array): void { this.input?.(sid, data); },
	submitInput(this: LegacyShape, sid: number, data: string | Uint8Array, _options?: NativeInputOptions): NativeInputSubmission {
		this.input?.(sid, data);
		return { op: 1, queued: Promise.resolve({ op: 1, state: 'queued' as const }), finished: Promise.resolve({ op: 1, state: 'written' as const }), cancel() {} };
	},
	submitResize(this: LegacyShape, sid: number, cols: number, rows: number, _options?: NativeInputOptions): NativeResizeSubmission {
		this.resize?.(sid, cols, rows);
		return { op: 1, queued: Promise.resolve({ op: 1, state: 'queued' as const }), finished: Promise.resolve({ op: 1, state: 'applied' as const }), cancel() {} };
	},
};

/** A current helper confirms the reply stream after the numeric exit; mocks that report an exit must do the same. */
export function settledExit(events: { exit(sid: number, code: number | null, signal: string | null): void; replySettled?(sid: number): void }, sid: number, code: number | null, signal: string | null): void {
	events.exit(sid, code, signal);
	events.replySettled?.(sid);
}
