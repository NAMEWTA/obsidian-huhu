import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PI_ARTIFACT_PROFILES_BROTLI_BASE64 } from './pi-artifact-profiles.generated';

describe('pi artifact profiles compressed asset', () => {
	it('decodes to exactly the JSON source of truth', () => {
		const source = readFileSync(new URL('./pi-artifact-profiles.json', import.meta.url), 'utf8');
		const decoded = brotliDecompressSync(Buffer.from(PI_ARTIFACT_PROFILES_BROTLI_BASE64, 'base64')).toString(
			'utf8',
		);
		expect(JSON.parse(decoded)).toEqual(JSON.parse(source));
	});
	it('generator --check passes', () => {
		const script = fileURLToPath(new URL('../../../../../../scripts/generate-pi-artifact-profiles.mjs', import.meta.url));
		expect(execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' })).toContain('matches');
	});
});
