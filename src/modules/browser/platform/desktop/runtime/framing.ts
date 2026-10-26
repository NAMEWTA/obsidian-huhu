import type { Writable } from 'node:stream';
const LIMIT = 16 * 1024 * 1024;
export class JsonFrames {
	private pending = Buffer.alloc(0);
	push(bytes: Uint8Array, receive: (value: Record<string, unknown>) => void): void {
		this.pending = Buffer.concat([this.pending, bytes]);
		while (this.pending.length >= 4) {
			const length = this.pending.readUInt32BE(0);
			if (!length || length > LIMIT) throw new Error('browser_frame_limit');
			if (this.pending.length < length + 4) break;
			const value: unknown = JSON.parse(this.pending.subarray(4, length + 4).toString('utf8'));
			this.pending = this.pending.subarray(length + 4);
			if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('browser_invalid_frame');
			receive(value as Record<string, unknown>);
		}
		if (this.pending.length > LIMIT + 4) throw new Error('browser_frame_limit');
	}
}
export function writeJsonFrame(output: Writable, value: unknown): void {
	const body = Buffer.from(JSON.stringify(value));
	if (!body.length || body.length > LIMIT || output.writableLength > 2 * 1024 * 1024)
		throw new Error('browser_transport_backpressure');
	const header = Buffer.allocUnsafe(4);
	header.writeUInt32BE(body.length);
	output.write(Buffer.concat([header, body]));
}
