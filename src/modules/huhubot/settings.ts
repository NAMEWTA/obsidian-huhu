import { defineSettings, f } from '../../shared/settings/schema';

/** Device-local managed Runner installation settings. Secrets never live here. */
export const huhubotSettings = defineSettings({
	binaryPath: f.string({ default: '', scope: 'device', max: 4096 }),
	workingDirectory: f.string({ default: '', scope: 'device', max: 4096 }),
	profileRoot: f.string({ default: '', scope: 'device', max: 4096 }),
});

export type HuhuBotSettings = ReturnType<typeof huhubotSettings.defaults>;
