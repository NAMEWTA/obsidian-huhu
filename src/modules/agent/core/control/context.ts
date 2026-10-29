import type { PhysicalDirectory } from '../space/model';
import type { ManagedCreateResult, ManagedRuntimeRef } from '../workspace/managed-runtime';

/** Local monotonic deadline captured once, before admission awaits; never a cross-process timestamp. */
export interface ControlExecutionContext {
	readonly signal: AbortSignal;
	readonly deadline: number;
}

/** Business scope only; transport authentication and generated wire remain separate owners. */
export interface ControlScope {
	readonly vaultId: string;
	readonly deviceId: string;
	readonly instanceId: string;
	readonly rootPath: string;
	readonly physicalRoot: Readonly<PhysicalDirectory>;
}

/** A bounded observation channel; its failure cannot revoke an admitted launch. */
export type ManagedReservedObserver = (target: Readonly<ManagedRuntimeRef>) => void | Promise<void>;

/** Local, single-use capability captured before any control scope/admission await. */
export interface CapturedManagedCreate {
	readonly observationError?: Error;
	execute(onReserved?: ManagedReservedObserver): Promise<ManagedCreateResult>;
	/** Only an unused capture is released; execute transfers ownership synchronously. */
	dispose(): void;
}
