import type { AgentState } from '../workspace/model';
import type { ActivityBlocking, ActivityMark, ActivityReason, ManagedRuntimeRef } from '../workspace/managed-runtime';
import type { ControlExecutionContext } from './context';
import type { ControlWaitState } from '../../../../shared/native/control-wire';
import type { NativeInputFinishedResult } from '../../../../shared/native/input';

export type CoordinationState = ControlWaitState;

export interface ActivityWaitBaseline {
	readonly at: Readonly<ActivityMark>;
	readonly source?: Readonly<{ bindingId: string; programEpoch: string }>;
	readonly initialState: AgentState;
	readonly initialWorking: boolean;
}
export interface ActivityWaitOptions {
	readonly state: CoordinationState;
	readonly context: Readonly<ControlExecutionContext>;
	/** Resume observation of the original runtime/source/watermark, without resending input. */
	readonly after?: Readonly<ActivityWaitBaseline>;
	/** Reserve the listener before input; activate only after the input owner confirms submission. */
	readonly afterInput?: boolean;
}
export interface ActivityWaitResult {
	readonly status: 'matched' | 'timeout' | 'cancelled' | 'unavailable';
	readonly condition: CoordinationState;
	readonly baseline: Readonly<ActivityWaitBaseline>;
	readonly at: Readonly<ActivityMark>;
	readonly state: AgentState;
	readonly blocking: ActivityBlocking;
	readonly source: Readonly<{ health: 'current' | 'unknown' | 'unavailable'; reason?: ActivityReason }>;
	readonly observedAt: number;
	readonly reason?: ActivityReason | 'source-changed' | 'stale-runtime';
}
export interface PreparedActivityWait {
	readonly baseline: Readonly<ActivityWaitBaseline>;
	readonly finished: Promise<Readonly<ActivityWaitResult>>;
	/** Enables matching after a confirmed input receipt; keeps only the latest observed snapshot. */
	activate(): void;
	/** Ends this observer only. It never stops the runtime or cancels/repeats an input. */
	dispose(): void;
}

export type TerminalWrittenInput = Readonly<
	Extract<NativeInputFinishedResult, { state: 'written' }> & { runtimeId: string }
>;

export interface TerminalWaitOutcome {
	readonly target: Readonly<ManagedRuntimeRef>;
	readonly phase: 'input-submitted' | 'state-matched' | 'failed';
	readonly effect: 'none' | 'completed';
	readonly wait: Readonly<ActivityWaitResult>;
	/** Existing native PTY receipt only; never an adapter or task completion claim. */
	readonly input?: TerminalWrittenInput;
	readonly error?: 'WAIT_TIMEOUT' | 'WAIT_CANCELLED' | 'SOURCE_UNAVAILABLE';
}

export class CoordinationError extends Error {
	constructor(readonly code: 'INVALID_ARGUMENT' | 'CAPACITY_EXCEEDED' | 'STALE_RUNTIME') {
		super(code);
		this.name = 'CoordinationError';
	}
}
