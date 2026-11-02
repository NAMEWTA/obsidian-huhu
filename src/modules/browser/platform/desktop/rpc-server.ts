import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setTimeout as nodeSetTimeout, clearTimeout as nodeClearTimeout } from 'node:timers';
import { AgentBrowserError } from '../../core/contracts';
import { envelopeSchema, PROTOCOL_LIMITS } from '../../core/protocol';
import type {
	BrowserConnectionScope,
	BrowserRpcConnection,
	BrowserRpcServer,
	RpcHandler,
	RpcResponseGuard,
} from '../../core/rpc';
import { atomicPrivateFile, privateDirectory, readPrivateFile, isMissing } from './persistence/private-files';

interface Credential {
	token: string;
	file: string;
	serialized: string;
}
export function createBrowserRpcServer(options: {
	directory: string;
	assertOwner: () => Promise<void>;
	handler: RpcHandler;
	register: (id: string, scope: BrowserConnectionScope) => void;
	guardResponse?: RpcResponseGuard;
}): BrowserRpcServer {
	const bootId = randomUUID(),
		tokens = new Map<string, Credential>(),
		creations = new Set<Promise<string>>();
	let server: (Server & { closeAllConnections?: () => void }) | undefined,
		endpoint = '',
		closed = false,
		pending: Promise<void> | undefined,
		active = 0,
		reservations = 0;
	const secretEqual = (a: string, b: string) => {
		const left = Buffer.from(a),
			right = Buffer.from(b);
		return left.length === right.length && timingSafeEqual(left, right);
	};
	const reply = (res: ServerResponse, status: number, value: unknown) => {
		if (res.destroyed || res.writableEnded) return;
		const data = JSON.stringify(value);
		res.writeHead(status, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
		});
		res.end(data);
	};
	const handle = async (req: IncomingMessage, res: ServerResponse) => {
		if (
			closed ||
			req.method !== 'POST' ||
			req.url !== '/rpc' ||
			'origin' in req.headers ||
			(req.headers['sec-fetch-site'] !== undefined && req.headers['sec-fetch-site'] !== 'none') ||
			req.headers.host !== new URL(endpoint).host ||
			!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']))
		) {
			reply(res, 403, { error: { code: 'transport_rejected' } });
			return;
		}
		if (active >= PROTOCOL_LIMITS.inFlight) {
			reply(res, 429, { error: { code: 'request_quota' } });
			return;
		}
		const authorization = req.headers.authorization ?? '',
			token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
		const match = [...tokens].find(([, credential]) => secretEqual(credential.token, token));
		if (!match) {
			reply(res, 401, { error: { code: 'connection_invalid' } });
			return;
		}
		active++;
		let dispatched = false,
			released = false;
		const release = () => {
			if (!released) {
				released = true;
				active--;
			}
		};
		try {
			await options.assertOwner();
			const chunks: Buffer[] = [];
			let size = 0;
			for await (const chunk of req) {
				const data = typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
				size += data.length;
				if (size > PROTOCOL_LIMITS.requestBytes) throw new AgentBrowserError('request_too_large');
				chunks.push(data);
			}
			let value: unknown;
			try {
				value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
			} catch {
				throw new AgentBrowserError('invalid_request');
			}
			const parsed = envelopeSchema.safeParse(value);
			if (!parsed.success) throw new AgentBrowserError('invalid_request');
			const envelope = parsed.data;
			if (envelope.bootId !== bootId) throw new AgentBrowserError('boot_changed');
			const remaining = envelope.deadlineAtMs - Date.now();
			if (remaining <= 0 || remaining > PROTOCOL_LIMITS.deadlineMs) throw new AgentBrowserError('deadline_invalid');
			const acceptedAt = performance.now(), remainingMs = () => Math.max(0, remaining - (performance.now() - acceptedAt));
			let timeout: ReturnType<typeof nodeSetTimeout> | undefined;
			try {
				dispatched = true;
				const work = Promise.resolve().then(() => options.handler(envelope.method, envelope.params, match[0], remainingMs));
				void work.finally(release).catch(() => undefined);
				const result = await Promise.race([
					work,
					new Promise<never>((_, reject) => {
						timeout = nodeSetTimeout(() => reject(new AgentBrowserError('outcome_unknown')), remaining);
					}),
				]);
				await options.assertOwner();
				if (closed || tokens.get(match[0]) !== match[1]) throw new AgentBrowserError('connection_invalid');
				const guarded = options.guardResponse
					? options.guardResponse(envelope.method, envelope.params, match[0], result)
					: result;
				const body = { protocolVersion: 2, requestId: envelope.requestId, result: guarded ?? null };
				if (Buffer.byteLength(JSON.stringify(body)) > PROTOCOL_LIMITS.responseBytes)
					throw new AgentBrowserError('response_too_large');
				reply(res, 200, body);
			} finally {
				if (timeout) nodeClearTimeout(timeout);
			}
		} catch (error) {
			reply(res, 400, { error: { code: error instanceof AgentBrowserError ? error.code : 'operation_failed' } });
		} finally {
			if (!dispatched) release();
		}
	};
	const start = async () => {
		await options.assertOwner();
		await privateDirectory(options.directory);
		if (closed) throw new AgentBrowserError('workspace_closing');
		server = createServer((req, res) => {
			void handle(req, res);
		});
		server.requestTimeout = 10_000;
		server.headersTimeout = 5000;
		await new Promise<void>((resolve, reject) => {
			server!.once('error', reject);
			server!.listen({ host: '127.0.0.1', port: 0, exclusive: true }, resolve);
		});
		const address = server.address();
		if (!address || typeof address === 'string') throw new AgentBrowserError('bridge_unavailable');
		endpoint = `http://127.0.0.1:${address.port}/rpc`;
		server.unref();
	};
	const removeOwned = async (credential: Credential) => {
		try {
			await options.assertOwner();
			const content = await readPrivateFile(credential.file, 16 * 1024);
			if (content.toString('utf8') !== credential.serialized) return;
			await options.assertOwner();
			await fs.unlink(credential.file);
		} catch (error) {
			if (!isMissing(error)) return;
		}
	};
	return {
		create(scope) {
			if (closed) return Promise.reject(new AgentBrowserError('workspace_closing'));
			if (tokens.size + reservations >= 32) return Promise.reject(new AgentBrowserError('connection_quota'));
			reservations++;
			const creation = (async () => {
				pending ??= start();
				await pending;
				await options.assertOwner();
				if (closed) throw new AgentBrowserError('workspace_closing');
				const id = randomUUID(),
					token = randomBytes(32).toString('base64url'),
					file = path.join(options.directory, `${id}.json`);
				const descriptor: BrowserRpcConnection = {
					protocolVersion: 2,
					bootId,
					endpoint,
					token,
					spaceId: scope.spaceId,
					runId: scope.grant.run.id,
					capability: scope.grant.capability,
				};
				const credential = { token, file, serialized: JSON.stringify(descriptor) };
				try {
					await atomicPrivateFile(file, credential.serialized, true);
					await options.assertOwner();
					if (closed) throw new AgentBrowserError('workspace_closing');
					options.register(id, scope);
					tokens.set(id, credential);
					return file;
				} catch (error) {
					await removeOwned(credential);
					throw error;
				}
			})();
			creations.add(creation);
			void creation
				.finally(() => {
					reservations--;
					creations.delete(creation);
				})
				.catch(() => undefined);
			return creation;
		},
		async dispose() {
			closed = true;
			await pending?.catch(() => undefined);
			await Promise.allSettled([...creations]);
			server?.closeAllConnections?.();
			if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()));
			for (const credential of tokens.values()) await removeOwned(credential);
			tokens.clear();
		},
	};
}
