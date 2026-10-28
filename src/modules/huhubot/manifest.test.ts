import { expect, it } from 'vitest';
import { MODULE_IDS } from '../../app/contracts/module';
import { huhubotManifest } from './manifest';

it('registers Bot as a desktop on-demand module', () => {
	expect(MODULE_IDS).toContain('huhubot');
	expect(huhubotManifest).toMatchObject({ id: 'huhubot', activation: 'on-demand', platforms: { desktop: true, mobile: false } });
});
