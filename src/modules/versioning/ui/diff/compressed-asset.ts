import { gunzipSync, strFromU8 } from 'fflate';

/** Standard gzip transport for trusted build assets; failures propagate to the caller. */
export function decodeAsset(encoded: string): string {
	return strFromU8(gunzipSync(Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))));
}
