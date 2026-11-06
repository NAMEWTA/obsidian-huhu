import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// Same normalized source pins as scripts/fixtures/iconic/upstream-1.1.10.json.
const hashes = {
	'lucide-keywords.json': '23096d2ee6c639647339662e8ddd0b396cd05999fe0d49f8fe4eac254d7b3baf',
	'emojis.json': 'b776bf3d122e48e7ce0356eaa42af3cd09cfa82feeb095a14161b06f266c20a2',
};

export function encodeIconicResource(name, source) {
	if (!hashes[name] || createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex') !== hashes[name])
		throw Error(`Unknown Iconic resource source: ${name}`);
	const value = JSON.parse(source);
	const compressed = gzipSync(JSON.stringify(value), { level: 9 });
	compressed[9] = 3; // Stable gzip OS metadata across Node/zlib platforms.
	return compressed.toString('base64');
}

/** Transport only: original Iconic JSON files remain the physical build inputs. */
export const iconicResources = {
	name: 'huhu-iconic-resources',
	setup(build) {
		build.onLoad(
			{ filter: /[\\/]icons[\\/]core[\\/]res[\\/](lucide-keywords|emojis)\.json$/ },
			async ({ path: file }) => {
				const source = await readFile(file, 'utf8');
				const encoded = encodeIconicResource(path.basename(file), source);
				return {
					loader: 'js',
					resolveDir: path.dirname(file),
					contents: `import {decodeResource} from '../../platform/utils/compressed-resource';export default JSON.parse(decodeResource(${JSON.stringify(encoded)}));`,
				};
			},
		);
	},
};
