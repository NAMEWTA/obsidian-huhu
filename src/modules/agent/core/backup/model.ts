import type { BackupManifest, SectionKind } from './format';

/** Stable machine-readable outcomes. The UI maps each code to a localized sentence; no message text lives here. */
export type BackupErrorCode =
	| 'busy'
	| 'quiesce-failed'
	| 'drain-failed'
	| 'source-invalid'
	| 'source-unavailable'
	| 'source-drift'
	| 'preflight-failed'
	| 'package-invalid'
	| 'write-failed'
	| 'adopt-failed'
	| 'recovery-pending'
	| 'unrecoverable'
	| 'partial-import'
	| 'unexpected';

export class BackupError extends Error {
	constructor(
		readonly code: BackupErrorCode,
		readonly detail: Readonly<Record<string, unknown>> = {},
		options?: { cause?: unknown },
	) {
		super(code, options);
		this.name = 'BackupError';
	}
}

export type ProblemCode =
	| 'adopt-device-required'
	| 'adopt-device-unknown'
	| 'device-collision'
	| 'section-invalid'
	| 'identity-collision'
	| 'definition-collision'
	| 'records-needs-desktop'
	| 'directory-missing'
	| 'target-unreadable'
	| 'settings-owner-missing'
	| 'nothing-selected';
/** Blocks the import. `subject` is an opaque id, name or relative path for display; it is never acted on. */
export interface Problem {
	readonly code: ProblemCode;
	readonly section?: SectionKind;
	readonly device?: string | null;
	readonly subject?: string;
}

export type WarningCode =
	| 'permission-raise-skipped'
	| 'directory-reauthorize'
	| 'space-archived-missing-directory'
	| 'automations-disabled'
	| 'runs-demoted'
	| 'settings-damaged-replaced'
	| 'other-device-settings-skipped';
export interface Warning {
	readonly code: WarningCode;
	readonly subject?: string;
	readonly count?: number;
}

export type SectionAction = 'create' | 'replace-empty' | 'merge' | 'unchanged' | 'archive';
export interface SectionOutcome {
	readonly section: SectionKind;
	/** Target device id (the restore adopts the chosen source device as this one); null for shared definitions. */
	readonly device: string | null;
	readonly path: string;
	readonly action: SectionAction;
	readonly count?: number;
}

export interface PlanView {
	readonly adoptDevice?: string;
	readonly problems: readonly Problem[];
	readonly warnings: readonly Warning[];
	readonly outcomes: readonly SectionOutcome[];
	readonly batches: number;
	/** True when every selected collection already holds exactly the package content. */
	readonly unchanged: boolean;
	readonly disabledAutomations: ReadonlyArray<{ readonly id: string; readonly name: string }>;
	/** Spaces whose external directory needs a fresh authorization on this machine. */
	readonly reauthorize: ReadonlyArray<{ readonly spaceId: string; readonly name: string; readonly path: string }>;
}

export interface PackageView {
	readonly createdAt: number;
	readonly vaultName: string;
	readonly sourceDevice: string;
	readonly devices: readonly string[];
	readonly manifest: BackupManifest;
	readonly digest: string;
}

export interface ImportOptions {
	/** The source device whose data becomes this device's. Required unless the package has this device's id. */
	readonly adoptDevice?: string;
	/** Other source devices restored as archives under their own device id. Default: none. */
	readonly includeDevices?: readonly string[];
	readonly skipSections?: readonly SectionKind[];
	/** Spaces whose vault directory is missing here are imported as archived instead of refusing the import. */
	readonly archiveMissingDirectories?: boolean;
}

/** What the settings page keeps from the last import, so the follow-up work survives a restart. */
export interface ImportReport {
	readonly format: 1;
	readonly packageDigest: string;
	readonly finishedAt: number;
	readonly status: 'done' | 'partial' | 'failed';
	readonly batches: ReadonlyArray<{ readonly key: string; readonly status: 'done' | 'pending' }>;
	readonly errorCode?: string;
	readonly disabledAutomations: ReadonlyArray<{ readonly id: string; readonly name: string }>;
	readonly reauthorize: PlanView['reauthorize'];
	readonly warnings: readonly Warning[];
}
