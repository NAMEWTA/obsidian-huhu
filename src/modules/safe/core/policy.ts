/** How long the safe may stay unlocked without activity. `custom` uses `idleCustomMinutes`. */
export const IDLE_PRESETS = ['5', '20', '60', 'custom', 'never'] as const;
export type IdlePreset = (typeof IDLE_PRESETS)[number];

export const DEFAULT_IDLE_PRESET: IdlePreset = '20';
export const DEFAULT_IDLE_CUSTOM_MINUTES = 30;
export const MIN_IDLE_MINUTES = 1;
/** One week; also keeps the delay far below the timer limit of 2^31 milliseconds. */
export const MAX_IDLE_MINUTES = 7 * 24 * 60;

/** The user's choices, as stored in the `safe` settings namespace. */
export interface LockSettings {
	idlePreset: IdlePreset;
	idleCustomMinutes: number;
	lockOnSwitch: boolean;
	lockOnClose: boolean;
}

/**
 * The rules the session follows. Closing Obsidian, disabling the module and unloading the plugin always lock and
 * are deliberately not part of the policy.
 */
export interface LockPolicy {
	/** Milliseconds without activity before locking, or null for never. */
	idleMs: number | null;
	/** Lock when the safe page is hidden: another workbench page or tab is shown, or the window is hidden. */
	lockOnSwitch: boolean;
	/** Lock when a safe page is closed. */
	lockOnClose: boolean;
}

export const DEFAULT_LOCK_SETTINGS: LockSettings = { idlePreset: DEFAULT_IDLE_PRESET, idleCustomMinutes: DEFAULT_IDLE_CUSTOM_MINUTES, lockOnSwitch: false, lockOnClose: false };

/** The effective idle time in whole minutes, or null for never. */
export function idleMinutes(settings: Pick<LockSettings, 'idlePreset' | 'idleCustomMinutes'>): number | null {
	if (settings.idlePreset === 'never') return null;
	const minutes = settings.idlePreset === 'custom' ? settings.idleCustomMinutes : Number(settings.idlePreset);
	return Number.isFinite(minutes) ? Math.min(MAX_IDLE_MINUTES, Math.max(MIN_IDLE_MINUTES, Math.round(minutes))) : Number(DEFAULT_IDLE_PRESET);
}

export function lockPolicyOf(settings: LockSettings): LockPolicy {
	const minutes = idleMinutes(settings);
	return { idleMs: minutes === null ? null : minutes * 60 * 1000, lockOnSwitch: settings.lockOnSwitch, lockOnClose: settings.lockOnClose };
}

export const DEFAULT_LOCK_POLICY: LockPolicy = lockPolicyOf(DEFAULT_LOCK_SETTINGS);

export function sameLockPolicy(a: LockPolicy, b: LockPolicy): boolean {
	return a.idleMs === b.idleMs && a.lockOnSwitch === b.lockOnSwitch && a.lockOnClose === b.lockOnClose;
}
