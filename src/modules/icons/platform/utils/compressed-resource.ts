import { gunzipSync, strFromU8 } from 'fflate';

/** fflate 0.8.3 (MIT): https://github.com/101arrowz/fflate/tree/v0.8.3
 * Decode standard gzip only when the existing resource import is evaluated. */
export function decodeResource(encoded: string): string {
	return strFromU8(gunzipSync(Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))));
}
