import { bundledMain } from './electron-main';

export interface SecretProtector {
	status(): Promise<'available' | 'unavailable' | 'weak-provider'>;
	protect(value: string, purpose: string): Promise<string>;
	unprotect(value: string, purpose: string): Promise<string>;
}
export class SecretProtectionError extends Error {
	constructor(readonly code: 'key_unavailable' | 'weak_provider' | 'secret_invalid') { super(code); }
}
interface Bridge { status(): 'available' | 'unavailable' | 'weak-provider'; seal(value: string): string; open(value: string): string }
const SOURCE = String.raw`const {safeStorage}=require('electron');
exports.status=()=>{
 if(!safeStorage.isEncryptionAvailable())return 'unavailable';
 if(process.platform==='linux'){
  if(typeof safeStorage.getSelectedStorageBackend!=='function')return 'unavailable';
  const backend=safeStorage.getSelectedStorageBackend();
  if(backend==='basic_text')return 'weak-provider';
  if(!backend||backend==='unknown')return 'unavailable';
 }
 return 'available';
};
exports.seal=value=>safeStorage.encryptString(value).toString('base64');
exports.open=value=>safeStorage.decryptString(Buffer.from(value,'base64'));`;

/** Only random data keys and their purpose binding cross this host boundary. No weak/plaintext fallback. */
export function createSecretProtector(win: Window): SecretProtector {
	let bridge: Bridge | undefined;
	try { bridge = bundledMain<Bridge>(win, SOURCE); } catch { /* Explicit unavailable state. */ }
	const status = async () => { try { return bridge?.status() ?? 'unavailable'; } catch { return 'unavailable' as const; } };
	const check = async () => {
		const state = await status();
		if (state !== 'available') throw new SecretProtectionError(state === 'weak-provider' ? 'weak_provider' : 'key_unavailable');
	};
	return {
		status,
		async protect(value, purpose) {
			await check();
			if (!purpose || purpose.length > 4096 || value.length > 65536) throw new SecretProtectionError('secret_invalid');
			return bridge!.seal(JSON.stringify({ purpose, value }));
		},
		async unprotect(value, purpose) {
			await check();
			if (!purpose || purpose.length > 4096 || value.length > 262144 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
				throw new SecretProtectionError('secret_invalid');
			try {
				const raw = JSON.parse(bridge!.open(value)) as { purpose?: unknown; value?: unknown };
				if (raw.purpose !== purpose || typeof raw.value !== 'string') throw new Error();
				return raw.value;
			} catch { throw new SecretProtectionError('secret_invalid'); }
		},
	};
}
