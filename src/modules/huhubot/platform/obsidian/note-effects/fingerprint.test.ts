import { expect, it } from 'vitest';
import vectors from '../../../../../../contracts/hap/v0.1/fixtures/effect-fingerprint.json';
import type { HostInvoke } from '../../../api';
import { noteFingerprint } from './fingerprint';

it('matches every frozen Go effect fingerprint including Unicode, control bytes and original execution lease', async () => {
	expect(vectors.cases).toHaveLength(4);
	for (const vector of vectors.cases) {
		const command = structuredClone(vector.command) as HostInvoke;
		expect(await noteFingerprint(command), vector.name).toBe(vector.fingerprint);
		command.fingerprint = 'not part of the signed fields';
		expect(await noteFingerprint(command), vector.name).toBe(vector.fingerprint);
	}
});
