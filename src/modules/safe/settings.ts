import { defineSettings, f } from '../../shared/settings/schema';
import { DEFAULT_IDLE_CUSTOM_MINUTES, DEFAULT_IDLE_PRESET, IDLE_PRESETS, MAX_IDLE_MINUTES, MIN_IDLE_MINUTES } from './core/policy';

/**
 * Settings namespace `safe`. The lock rules follow the vault; the list/card choice is a per-device convenience.
 * Closing Obsidian and unloading the plugin always lock and are deliberately not settings.
 */
export const safeSettings = defineSettings({
	idlePreset: f.enum(IDLE_PRESETS, { default: DEFAULT_IDLE_PRESET }),
	idleCustomMinutes: f.number({ default: DEFAULT_IDLE_CUSTOM_MINUTES, min: MIN_IDLE_MINUTES, max: MAX_IDLE_MINUTES, integer: true }),
	lockOnSwitch: f.boolean({ default: false }),
	lockOnClose: f.boolean({ default: false }),
	viewMode: f.enum(['list', 'cards'] as const, { default: 'list', scope: 'device' }),
});

export type SafeSettings = ReturnType<typeof safeSettings.defaults>;
