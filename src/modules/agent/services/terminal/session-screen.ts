import type { Terminal } from '@xterm/headless';
import { NATIVE_OUTPUT_LIMITS } from '../../../../shared/native/host';
import {
	DEFAULT_SCREEN_PROFILE,
	screenGridAllowed,
	screenMarkEqual,
	type ScreenBuffer,
	type ScreenCell,
	type ScreenEffect,
	type ScreenLink,
	type ScreenBufferHeader,
	type ScreenFrame,
	type ScreenGeometryResult,
	type ScreenGrid,
	type ScreenMark,
	type ScreenOperation,
	type ScreenPatch,
	type ScreenProfile,
	type ScreenReadRequest,
	type ScreenReadResult,
	type ScreenSink,
	type ScreenSnapshot,
	type ScreenStream,
	type ScreenUsage,
	type ScreenViewLease,
} from '../../core/terminal/frames-screen';
import { XtermScreenSource } from './session-screen-xterm';

function stringBytes(value: string): number {
	let size = 2;
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code === 34 || code === 92) size += 2;
		else if (code < 32) size += code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
		else if (code < 128) size++;
		else if (code < 2048) size += 2;
		else if (
			code >= 0xd800 &&
			code <= 0xdbff &&
			value.charCodeAt(i + 1) >= 0xdc00 &&
			value.charCodeAt(i + 1) <= 0xdfff
		) {
			size += 4;
			i++;
		} else size += code >= 0xd800 && code <= 0xdfff ? 6 : 3;
	}
	return size;
}
/** Exact JSON payload cost without constructing an unbounded JSON/string/UTF8 copy first. */
function encodedBytes(value: unknown): number {
	if (typeof value === 'string') return stringBytes(value);
	if (typeof value === 'number' || typeof value === 'boolean') return String(value).length;
	if (value === null) return 4;
	if (Array.isArray(value))
		return (
			2 +
			Math.max(0, value.length - 1) +
			value.reduce((sum: number, item: unknown) => sum + encodedBytes(item), 0)
		);
	if (value && typeof value === 'object') {
		let size = 2,
			count = 0;
		for (const [key, item] of Object.entries(value))
			if (item !== undefined) {
				size += stringBytes(key) + 1 + encodedBytes(item) + (count++ ? 1 : 0);
			}
		return size;
	}
	return 4;
}
function immutable<T>(value: T): T {
	if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
	for (const child of Object.values(value)) immutable(child);
	return Object.freeze(value);
}
const header = ({ rows: _rows, ...value }: ScreenBuffer): ScreenBufferHeader => value;
interface Observer {
	readonly sink: ScreenSink;
	readonly queue: ScreenFrame[];
	bytes: number;
	inFlight?: ScreenMark;
	inFlightBytes: number;
	resyncPending: boolean;
	disposed: boolean;
	draining: boolean;
	needsResync: boolean;
}
interface Job {
	run(done: () => void): void;
	bytes: number;
}
interface View {
	readonly lease: ScreenViewLease;
	visible: boolean;
	focused: boolean;
	revision: number;
	bytes: number;
}
export interface LegacyScreenReservation {
	capture(): boolean;
	captured(): void;
	ready(): void;
	dispose(): void;
}
interface ReadToken {
	readonly id: string;
	readonly snapshot: ScreenSnapshot;
	readonly buffer: 'normal' | 'alternate';
	readonly expires: number;
}

/** Shared only for allocation admission; TerminalSessions remains the sole runtime owner. */
export class SessionScreenBudget {
	private readonly allocations = new Map<object, number>();
	reserve(owner: object, bytes: number, limit: number): boolean {
		let total = bytes;
		for (const [key, size] of this.allocations) if (key !== owner) total += size;
		if (!Number.isSafeInteger(total) || total > limit) return false;
		this.allocations.set(owner, bytes);
		return true;
	}
	release(owner: object): void {
		this.allocations.delete(owner);
	}
	get bytes(): number {
		let value = 0;
		for (const size of this.allocations.values()) value += size;
		return value;
	}
}

/** Orders all authority mutations. Display observers never own parse credit or native I/O. */
export class SessionScreen {
	readonly profile: Readonly<ScreenProfile>;
	private readonly source: XtermScreenSource;
	private readonly jobs: Job[] = [];
	private readonly observers = new Set<Observer>();
	private readonly legacy = new Map<object, number>();
	private readonly views = new Map<string, View>();
	private readonly reads = new Map<string, ReadToken>();
	private readonly journal: ScreenPatch[] = [];
	private current: ScreenSnapshot;
	private sequence = 0;
	private nextToken = 0;
	private pendingRaw = 0;
	private journalBytes = 0;
	private busy = false;
	private disposed = false;
	private failure?: string;
	private sizeOwner?: View;
	private output: ScreenSnapshot['output'] = 'complete';
	private quarantine?: Uint8Array;
	private quarantineLength = 0;
	private localQuarantine: string | undefined;
	private activeReserve = 0;
	private abandoned = false;
	private readonly requests = new Set<() => void>();
	private geometryRevision = 0;
	private nativeGeometry?: ScreenSnapshot['nativeGeometry'];
	constructor(
		private readonly runtimeId: string,
		private readonly model: Terminal,
		private readonly onLimit: (reason: string) => void,
		profile: ScreenProfile = DEFAULT_SCREEN_PROFILE,
		private readonly budget = new SessionScreenBudget(),
		private readonly budgetOwner: object = {},
	) {
		this.profile = Object.freeze({ ...profile });
		if (!screenGridAllowed({ cols: model.cols, rows: model.rows }, model.options.scrollback ?? 0, this.profile))
			throw new Error('Screen geometry exceeds resource limits');
		this.source = new XtermScreenSource(
			model,
			this.profile,
			(reason) => this.limit(reason),
			(bytes) => this.account(this.activeReserve + bytes),
		);
		this.current = this.source.capture(this.mark, this.output);
		if (!this.account()) {
			this.source.dispose();
			this.budget.release(this.budgetOwner);
			throw new Error('Screen allocation exceeds resource limits');
		}
	}
	get mark(): ScreenMark {
		return Object.freeze({ runtimeId: this.runtimeId, contentSequence: this.sequence });
	}
	private id(): string {
		if (this.nextToken >= Number.MAX_SAFE_INTEGER) throw new Error('Screen token identity exhausted');
		return String(++this.nextToken);
	}
	private limit(reason: string): void {
		if (this.failure || this.disposed) return;
		this.failure = reason;
		this.output = 'unknown';
		this.current = Object.freeze({ ...this.current, output: 'unknown' });
		try {
			this.onLimit(reason);
		} catch {
			/* Resource failure remains isolated to this runtime. */
		}
		for (const observer of this.observers) this.resyncObserver(observer, 'resource-limit');
	}
	private projectionBytes(snapshot: ScreenSnapshot): number {
		return (
			2048 +
			snapshot.links.reduce(
				(sum, link) => sum + 96 + (link.key.length + link.uri.length + (link.oscId?.length ?? 0)) * 2,
				0,
			) +
			snapshot.buffers.reduce(
				(sum, buffer) =>
					sum +
					buffer.rows.reduce(
						(size, row) =>
							size + 96 + row.cells.reduce((bytes, cell) => bytes + 96 + cell.chars.length * 2, 0),
						0,
					),
				0,
			)
		);
	}
	private account(reserve = 0): boolean {
		const use = this.source.usage(),
			p = this.profile,
			projection = this.projectionBytes(this.current);
		const pinned = [...new Set([...this.reads.values()].map((value) => value.snapshot))].reduce(
			(sum, value) => sum + this.projectionBytes(value),
			0,
		);
		const viewBase =
			projection * 6 + use.modelBytes * 2 + use.markers * 128 + use.linkUnits * 4 + p.maxFrameBytes * 4 + 16384;
		const viewBytes = [...this.views.values()].reduce(
			(sum, view) => sum + Math.max(view.bytes, viewBase + reserve * 8),
			0,
		);
		const bytes =
			(this.jobs.length + this.requests.size) * 512 +
			viewBytes +
			use.modelBytes +
			projection * 2 +
			pinned +
			Math.max(this.pendingRaw * 3, NATIVE_OUTPUT_LIMITS.sessionUnacknowledgedBytes * 4) +
			this.journalBytes * 2 +
			[...this.legacy.values()].reduce((sum, bytes) => sum + bytes, 0) +
			this.observers.size * (p.maxObserverBytes * 2 + 65536) +
			reserve;
		const accepted =
			use.modelCells <= p.maxModelCells &&
			use.modelBytes + reserve <= p.maxModelBytes &&
			use.combiningUnits <= p.maxCombiningUnits &&
			use.maxCellUnits <= p.maxCellUnits &&
			use.parserUnits <= p.maxParserUnits &&
			use.links <= p.maxLinks &&
			use.linkUnits <= p.maxLinkUnits &&
			use.markers <= p.maxMarkers &&
			projection <= p.maxSnapshotBytes &&
			bytes <= p.maxRuntimeBytes &&
			this.budget.reserve(this.budgetOwner, bytes, p.maxAgentBytes);
		if (accepted && reserve === 0)
			for (const view of this.views.values()) view.bytes = Math.max(view.bytes, viewBase);
		return accepted;
	}
	private admitModel(reserve: number): boolean {
		if (this.account(reserve)) return true;
		// Read/journal/observer retention yields to the single authority; it never blocks parsed ACK.
		for (const id of this.reads.keys()) {
			this.reads.delete(id);
			if (this.account(reserve)) return true;
		}
		while (this.journal.length) {
			this.journalBytes -= encodedBytes(this.journal.shift()!);
			if (this.account(reserve)) return true;
		}
		for (const observer of this.observers) if (observer.bytes) this.resyncObserver(observer, 'pressure');
		return this.account(reserve);
	}
	/** Legacy serializer admission shares the same runtime/Agent allocation owner as parsed screens. */
	registerLegacy(): LegacyScreenReservation | undefined {
		if (this.disposed || this.observers.size + this.legacy.size >= this.profile.maxObservers) return;
		const owner = {},
			base = this.profile.maxObserverBytes * 3 + 65536;
		let initial = 0,
			released = false;
		this.legacy.set(owner, base);
		if (!this.account()) {
			this.legacy.delete(owner);
			return;
		}
		const set = (bytes: number) => {
			if (!released) {
				this.legacy.set(owner, bytes);
				this.account();
			}
		};
		return {
			capture: () => {
				if (released || this.disposed) return false;
				const estimate = this.legacySnapshotBytes();
				if (estimate === undefined) return false;
				this.legacy.set(owner, base + estimate * 4);
				if (!this.account()) {
					this.legacy.set(owner, base);
					return false;
				}
				initial = estimate;
				return true;
			},
			captured: () => set(base + initial),
			ready: () => set(base),
			dispose: () => {
				if (released) return;
				released = true;
				this.legacy.delete(owner);
				this.account();
			},
		};
	}
	private legacySnapshotBytes(): number | undefined {
		// Count possible SGR/OSC expansion before SerializeAddon constructs any result string.
		// Both buffers, per-row controls and every style/link transition are deliberately overcounted.
		const links = new Map(this.current.links.map((link) => [link.key, link]));
		let bytes = 4096;
		for (const buffer of this.current.buffers)
			for (const row of buffer.rows) {
				bytes += 512;
				let prior: ScreenCell | undefined, lastLink: string | undefined;
				for (const cell of row.cells) {
					bytes += cell.chars.length * 4 + 8;
					if (
						!prior ||
						prior.fg !== cell.fg ||
						prior.bg !== cell.bg ||
						prior.extended?.ext !== cell.extended?.ext ||
						prior.extended?.underlineColor !== cell.extended?.underlineColor ||
						prior.extended?.underlineStyle !== cell.extended?.underlineStyle ||
						prior.extended?.underlineVariantOffset !== cell.extended?.underlineVariantOffset
					)
						bytes += 512;
					if (lastLink !== cell.linkKey) {
						const link = cell.linkKey ? links.get(cell.linkKey) : undefined;
						bytes += 256 + (link ? (link.uri.length + (link.oscId?.length ?? 0)) * 16 : 0);
					}
					if (bytes > this.profile.maxSnapshotBytes) return;
					prior = cell;
					lastLink = cell.linkKey;
				}
			}
		return bytes;
	}
	/** Explicit display abandonment is not parsed credit or a process-scope cleanup receipt. */
	abandon(): void {
		if (!this.failure || this.abandoned || this.disposed) return;
		this.abandoned = true;
		this.quarantine = undefined;
		this.quarantineLength = 0;
		this.localQuarantine = undefined;
		this.pendingRaw = 0;
		this.output = 'truncated';
		this.current = Object.freeze({ ...this.current, output: 'truncated' });
		this.account();
	}
	private query<T>(closed: T, capacity: T, run: (resolve: (value: T) => void) => void): Promise<T> {
		if (this.disposed) return Promise.resolve(closed);
		if (this.requests.size >= this.profile.maxReadTokens + this.profile.maxObservers)
			return Promise.resolve(capacity);
		return new Promise((resolve) => {
			let completed = false;
			const finish = (value: T) => {
				if (completed) return;
				completed = true;
				this.requests.delete(cancel);
				resolve(value);
			};
			const cancel = () => finish(closed);
			this.requests.add(cancel);
			this.barrier(() => {
				if (!completed) {
					try {
						run(finish);
					} catch {
						finish(capacity);
					}
				}
			});
		});
	}
	/** Captured raw byte credit is retained until all decoded slices have actually parsed. */
	receive(
		raw: Uint8Array,
		decode: (bytes: Uint8Array) => string,
		acknowledged: () => void,
		after: (text: string) => void,
	): void {
		if (this.disposed || this.abandoned) return;
		const size = raw.byteLength;
		this.pendingRaw += size;
		if (this.failure) {
			this.isolate(raw);
			return;
		}
		if (
			this.jobs.length >= this.profile.maxReadTokens + this.profile.maxObservers * 4 + 32 ||
			size > NATIVE_OUTPUT_LIMITS.chunkBytes ||
			this.pendingRaw > this.profile.maxPendingRawBytes ||
			!this.account()
		) {
			this.limit('native-output-admission');
			this.isolate(raw);
			return;
		}
		const owned = raw.slice();
		this.enqueueText(() => decode(owned), size, acknowledged, after, owned);
	}
	write(
		text: string,
		acknowledged: () => void = () => undefined,
		rawBytes = 0,
		after: () => void = () => undefined,
	): void {
		if (this.disposed || this.failure) return;
		if (this.jobs.length >= this.profile.maxReadTokens + this.profile.maxObservers * 4 + 32) {
			this.limit('transaction-capacity');
			return;
		}
		const bytes = rawBytes || text.length * 2;
		if (bytes > this.profile.maxPendingRawBytes) {
			this.limit('local-output-admission');
			return;
		}
		this.pendingRaw += bytes;
		if (this.pendingRaw > this.profile.maxPendingRawBytes || !this.account()) this.limit('local-output-admission');
		this.enqueueText(
			() => text,
			bytes,
			acknowledged,
			() => after(),
		);
	}
	private isolate(raw: Uint8Array): void {
		if (this.abandoned || this.disposed) return;
		this.quarantine ??= new Uint8Array(this.profile.maxPendingRawBytes);
		const room = this.quarantine.length - this.quarantineLength;
		const count = Math.min(room, raw.byteLength);
		this.quarantine.set(raw.subarray(0, count), this.quarantineLength);
		this.quarantineLength += count;
		// A transport which violates the admitted byte-credit bound cannot be retained indefinitely.
		// Its already explicit resource fault remains unknown; no parse credit or completion is fabricated.
		if (count !== raw.byteLength) this.failure = 'native-output-credit-violation';
	}
	private enqueueText(
		decode: () => string,
		bytes: number,
		acknowledged: () => void,
		after: (text: string) => void,
		raw?: Uint8Array,
	): void {
		let text: string | undefined,
			offset = 0;
		const quarantine = () => {
			if (this.abandoned) return;
			if (raw) this.isolate(raw);
			else if (text && !this.localQuarantine) this.localQuarantine = text;
		};
		const run = (done: () => void) => {
			if (this.failure) {
				quarantine();
				done();
				return;
			}
			text ??= decode();
			const batch = Math.max(
				2,
				Math.min(
					this.profile.parseBatchBytes,
					Math.floor(this.profile.maxModelBytes / (4 * (this.model.cols * 128 + 256))),
				),
			);
			const end = Math.min(text.length, offset + batch);
			let stop = end < text.length && end > offset && /[\uD800-\uDBFF]/.test(text[end - 1]!) ? end - 1 : end;
			const before = this.source.usage();
			const admission = (length: number) => {
				this.activeReserve = length * (this.model.cols * 128 + 256) + before.parserUnits * 8;
				return (
					before.parserUnits + length * 8 <= this.profile.maxParserUnits &&
					before.maxCellUnits + length * 2 <= this.profile.maxCellUnits &&
					before.combiningUnits + length * 2 <= this.profile.maxCombiningUnits &&
					before.linkUnits + before.parserUnits + length * 2 <= this.profile.maxLinkUnits &&
					before.links + Math.ceil(length / 4) + 1 <= this.profile.maxLinks &&
					before.markers + length * 2 + 2 <= this.profile.maxMarkers &&
					this.admitModel(this.activeReserve)
				);
			};
			while (!admission(stop - offset)) {
				if (stop - offset <= 2) {
					this.limit('parse-admission');
					quarantine();
					done();
					return;
				}
				stop = offset + Math.max(1, Math.floor((stop - offset) / 2));
				if (stop < text.length && /[\uD800-\uDBFF]/.test(text[stop - 1]!)) stop--;
			}
			const chunk = text.slice(offset, stop);
			this.source.beginParse();
			this.model.write(chunk, () => {
				if (this.disposed) {
					done();
					return;
				}
				if (this.failure) {
					quarantine();
					done();
					return;
				}
				offset = stop;
				const final = offset >= text!.length;
				if (final) {
					this.pendingRaw -= bytes;
					acknowledged();
					after(text!);
				}
				this.activeReserve = 0;
				this.commit();
				if (!final) this.jobs.unshift({ run, bytes: 0 });
				done();
			});
		};
		this.enqueue({ run, bytes });
	}

	mutate(
		run: () => void,
		reason?: 'resize' | 'reset' | 'clear',
		after?: () => void,
		reserve = 0,
		rejected?: () => void,
	): void {
		this.enqueue({
			bytes: 0,
			run: (done) => {
				if (this.failure) {
					done();
					return;
				}
				if (this.admitModel(reserve)) {
					run();
					this.commit(reason);
					after?.();
				} else rejected?.();
				done();
			},
		});
	}
	barrier(run: () => void): void {
		this.enqueue({
			bytes: 0,
			run: (done) => {
				run();
				done();
			},
		});
	}
	settled(): Promise<void> {
		if (this.disposed) return Promise.resolve();
		return new Promise((resolve) => this.barrier(resolve));
	}
	setOutput(output: ScreenSnapshot['output']): void {
		this.output = output;
	}
	finalize(
		tail: () => string,
		parsedTail: (text: string) => void,
		notice: string,
		output: ScreenSnapshot['output'],
		after: () => void,
	): void {
		this.enqueue({
			bytes: 0,
			run: (done) => {
				const later = this.jobs.splice(0);
				this.output = this.failure ? (this.abandoned ? 'truncated' : 'unknown') : output;
				const text = tail();
				if (text) this.write(text, undefined, 0, () => parsedTail(text));
				this.write(notice);
				this.barrier(after);
				this.jobs.push(...later);
				done();
			},
		});
	}
	private enqueue(job: Job): void {
		if (this.disposed) return;
		this.jobs.push(job);
		this.drain();
	}
	private drain(): void {
		if (this.busy || this.disposed) return;
		const job = this.jobs.shift();
		if (!job) return;
		this.busy = true;
		try {
			job.run(() => {
				this.busy = false;
				this.drain();
			});
		} catch (error) {
			this.busy = false;
			this.limit(error instanceof Error ? error.message : 'model-failure');
			this.drain();
		}
	}
	private commit(reason?: 'resize' | 'reset' | 'clear'): void {
		if (this.disposed || this.failure) return;
		try {
			if (++this.sequence >= Number.MAX_SAFE_INTEGER) {
				this.limit('sequence-exhausted');
				return;
			}
			const next = this.source.capture(this.mark, this.output),
				structure = this.source.takeStructure(),
				effects = this.source.takeEffects(),
				selectedReason = this.source.takeReset() ? 'reset' : reason;
			const operations: ScreenOperation[] = [];
			for (const buffer of next.buffers) {
				const old = this.current.buffers.find((value) => value.name === buffer.name)!;
				const edits = structure.filter((value) => value.buffer === buffer.name);
				const keys = old.rows.map((row) => row.key);
				let replayable = true;
				for (const edit of edits) {
					if (
						(edit.kind === 'trim-start' && edit.count > keys.length) ||
						(edit.kind === 'delete-rows' && (edit.index < 0 || edit.index + edit.count > keys.length)) ||
						(edit.kind === 'insert-rows' && (edit.index < 0 || edit.index > keys.length))
					) {
						replayable = false;
						break;
					}
					if (edit.kind === 'trim-start') keys.splice(0, edit.count);
					else if (edit.kind === 'delete-rows') keys.splice(edit.index, edit.count);
					else if (edit.kind === 'insert-rows')
						keys.splice(
							edit.index,
							0,
							...buffer.rows.slice(edit.index, edit.index + edit.keys.length).map((row) => row.key),
						);
				}
				const compatible =
					replayable &&
					keys.slice(0, buffer.rows.length).every((key, index) => key === buffer.rows[index]?.key);
				const replace = selectedReason !== undefined || !compatible;
				if (replace)
					operations.push({
						kind: 'replace-buffer',
						buffer: buffer.name,
						reason: selectedReason ?? 'buffer-replaced',
						keys: buffer.rows.map((row) => row.key),
					});
				else {
					for (const edit of edits)
						operations.push(
							edit.kind === 'insert-rows'
								? {
										...edit,
										keys: buffer.rows
											.slice(edit.index, edit.index + edit.keys.length)
											.map((row) => row.key),
									}
								: edit,
						);
					if (buffer.rows.length < keys.length)
						operations.push({ kind: 'truncate-end', buffer: buffer.name, length: buffer.rows.length });
					if (buffer.rows.length > keys.length)
						operations.push({
							kind: 'insert-rows',
							buffer: buffer.name,
							index: keys.length,
							keys: buffer.rows.slice(keys.length).map((row) => row.key),
						});
				}
				const oldByKey = new Map(old.rows.map((row) => [row.key, row]));
				for (let row = 0; row < buffer.rows.length; row++) {
					const value = buffer.rows[row]!,
						before = replace ? undefined : oldByKey.get(value.key);
					if (value === before) continue;
					operations.push({
						kind: 'row',
						buffer: buffer.name,
						index: row,
						key: value.key,
						isWrapped: value.isWrapped,
					});
					for (let col = 0; col < value.cells.length;) {
						if (before?.cells[col] === value.cells[col]) {
							col++;
							continue;
						}
						const start = col++;
						while (col < value.cells.length && before?.cells[col] !== value.cells[col] && col - start < 64)
							col++;
						operations.push({
							kind: 'cells',
							buffer: buffer.name,
							row,
							start,
							cells: value.cells.slice(start, col),
						});
					}
				}
			}
			const patch: ScreenPatch = immutable({
				kind: 'patch',
				from: this.current.at,
				to: next.at,
				geometry: next.geometry,
				active: next.active,
				buffers: next.buffers.map(header),
				state: next.state,
				links: next.links,
				operations: Object.freeze(operations),
				effects: Object.freeze([...effects]),
				output: next.output,
				...(this.nativeGeometry ? { nativeGeometry: this.nativeGeometry } : {}),
			});
			this.current = this.nativeGeometry ? Object.freeze({ ...next, nativeGeometry: this.nativeGeometry }) : next;
			const bytes = encodedBytes(patch);
			this.journal.push(patch);
			this.journalBytes += bytes;
			while (
				this.journal.length > this.profile.maxJournalFrames ||
				this.journalBytes > this.profile.maxJournalBytes
			)
				this.journalBytes -= encodedBytes(this.journal.shift()!);
			if (!this.account()) {
				this.limit('model-capacity');
				return;
			}
			const frames = this.patchFrames(patch);
			for (const observer of this.observers) for (const frame of frames) this.deliver(observer, frame);
		} catch (error) {
			this.limit(error instanceof Error ? error.message : 'projection-failure');
		}
	}
	open(options: Readonly<{ after?: ScreenMark }>, sink: ScreenSink): ScreenStream {
		const afterMark = options.after ? { ...options.after } : undefined;
		const observer: Observer = {
			sink,
			queue: [],
			bytes: 0,
			disposed: false,
			draining: false,
			inFlightBytes: 0,
			resyncPending: false,
			needsResync: false,
		};
		const stream: ScreenStream = {
			runtimeId: this.runtimeId,
			applied: (mark) => {
				if (observer.inFlight && screenMarkEqual(observer.inFlight, mark)) {
					observer.inFlight = undefined;
					observer.inFlightBytes = 0;
					this.pump(observer);
				}
			},
			resync: () => {
				if (observer.disposed || observer.resyncPending || this.disposed) return;
				observer.resyncPending = true;
				this.barrier(() => {
					observer.resyncPending = false;
					this.snapshot(observer);
				});
			},
			dispose: () => {
				observer.disposed = true;
				observer.queue.length = 0;
				observer.bytes = 0;
				this.observers.delete(observer);
			},
		};
		if (this.disposed || this.observers.size + this.legacy.size >= this.profile.maxObservers) {
			sink({ kind: 'resync-required', at: this.mark, reason: this.disposed ? 'disposed' : 'pressure' });
			return stream;
		}
		this.observers.add(observer);
		if (!this.account()) {
			this.observers.delete(observer);
			this.resyncObserver(observer, 'pressure');
			observer.disposed = true;
			return stream;
		}
		this.barrier(() => {
			if (observer.disposed) return;
			const after = afterMark;
			if (after?.runtimeId === this.runtimeId && after.contentSequence <= this.sequence) {
				const retained = this.journal.filter((patch) => patch.to.contentSequence > after.contentSequence);
				if (!retained.length && screenMarkEqual(after, this.mark)) return;
				if (retained[0] && screenMarkEqual(retained[0].from, after)) {
					for (const patch of retained)
						for (const frame of this.patchFrames(patch)) this.deliver(observer, frame);
					return;
				}
			}
			this.snapshot(observer);
		});
		return stream;
	}
	private cells(
		start: number,
		cells: readonly ScreenCell[],
		make: (start: number, cells: readonly ScreenCell[]) => ScreenFrame,
	): ScreenFrame[] {
		const frames: ScreenFrame[] = [];
		let offset = 0;
		while (offset < cells.length) {
			let length = Math.min(64, cells.length - offset);
			while (
				length > 1 &&
				encodedBytes(make(start + offset, cells.slice(offset, offset + length))) > this.profile.maxFrameBytes
			)
				length = Math.max(1, Math.floor(length / 2));
			frames.push(make(start + offset, cells.slice(offset, offset + length)));
			offset += length;
		}
		return frames;
	}
	private patchFrames(patch: ScreenPatch): ScreenFrame[] {
		if (encodedBytes(patch) <= this.profile.maxFrameBytes) return [patch];
		const { operations, effects, links, ...metadata } = patch;
		const patchId = `${this.runtimeId}:${patch.to.contentSequence}`,
			headerValue = immutable(metadata);
		const result: Array<Extract<ScreenFrame, { kind: 'patch-part' }>> = [];
		let ops: ScreenOperation[] = [],
			fx: ScreenEffect[] = [],
			ls: ScreenSnapshot['links'][number][] = [];
		const make = () => ({
			kind: 'patch-part' as const,
			patchId,
			index: result.length,
			count: 999999,
			header: headerValue,
			operations: ops,
			effects: fx,
			links: ls,
		});
		const flush = () => {
			if (!ops.length && !fx.length && !ls.length) return;
			result.push(make());
			ops = [];
			fx = [];
			ls = [];
		};
		const add = (category: 'op' | 'effect' | 'link', value: ScreenOperation | ScreenEffect | ScreenLink): void => {
			const target = category === 'op' ? ops : category === 'effect' ? fx : ls;
			(target as Array<ScreenOperation | ScreenEffect | ScreenLink>).push(value);
			if (
				encodedBytes(make()) > this.profile.maxFrameBytes &&
				target.length + ops.length + fx.length + ls.length > 2
			) {
				target.pop();
				flush();
				add(category, value);
			}
		};
		for (const link of links) add('link', link);
		for (const op of operations) {
			if (op.kind === 'cells') {
				let offset = 0;
				while (offset < op.cells.length) {
					let count = Math.min(64, op.cells.length - offset);
					let value: ScreenOperation = {
						...op,
						start: op.start + offset,
						cells: op.cells.slice(offset, offset + count),
					};
					while (
						count > 1 &&
						encodedBytes({ ...make(), operations: [value], effects: [], links: [] }) >
							this.profile.maxFrameBytes
					) {
						count = Math.floor(count / 2);
						value = { ...op, start: op.start + offset, cells: op.cells.slice(offset, offset + count) };
					}
					add('op', value);
					offset += count;
				}
			} else if ((op.kind === 'replace-buffer' || op.kind === 'insert-rows') && op.keys.length > 128) {
				if (op.kind === 'replace-buffer') add('op', { ...op, keys: [] });
				for (let offset = 0; offset < op.keys.length; offset += 128)
					add('op', {
						kind: 'insert-rows',
						buffer: op.buffer,
						index: (op.kind === 'insert-rows' ? op.index : 0) + offset,
						keys: op.keys.slice(offset, offset + 128),
					});
			} else add('op', op);
		}
		for (const effect of effects) add('effect', effect);
		flush();
		return result.map((part, index) => immutable({ ...part, index, count: result.length }));
	}
	private snapshot(observer: Observer): void {
		if (observer.disposed) return;
		observer.needsResync = false;
		observer.queue.length = 0;
		observer.bytes = 0;
		observer.inFlight = undefined;
		observer.inFlightBytes = 0;
		const snapshot = this.current,
			snapshotId = this.id(),
			{ buffers, links, ...rest } = snapshot;
		this.deliver(observer, {
			kind: 'snapshot-begin',
			snapshotId,
			header: { ...rest, buffers: buffers.map(header) },
		});
		for (const link of links) {
			if (observer.needsResync) return;
			this.deliver(observer, { kind: 'snapshot-links', snapshotId, links: [link] });
		}
		for (const buffer of buffers)
			for (let index = 0; index < buffer.rows.length; index++) {
				if (observer.needsResync) return;
				const row = buffer.rows[index]!;
				for (const frame of this.cells(0, row.cells, (start, cells) => ({
					kind: 'snapshot-row',
					snapshotId,
					buffer: buffer.name,
					index,
					key: row.key,
					isWrapped: row.isWrapped,
					start,
					cells,
				})))
					this.deliver(observer, frame);
			}
		this.deliver(observer, { kind: 'snapshot-end', snapshotId, at: snapshot.at });
	}

	private deliver(observer: Observer, frame: ScreenFrame): void {
		if (observer.disposed || observer.needsResync) return;
		const bytes = encodedBytes(frame);
		if (
			bytes > this.profile.maxFrameBytes ||
			observer.bytes + observer.inFlightBytes + bytes > this.profile.maxObserverBytes
		) {
			this.resyncObserver(observer, 'pressure');
			return;
		}
		observer.queue.push(immutable(frame));
		observer.bytes += bytes;
		this.pump(observer);
	}
	private resyncObserver(
		observer: Observer,
		reason: Extract<ScreenFrame, { kind: 'resync-required' }>['reason'],
	): void {
		if (observer.disposed || observer.needsResync) return;
		observer.needsResync = true;
		observer.queue.length = 0;
		observer.bytes = 0;
		observer.inFlight = undefined;
		observer.inFlightBytes = 0;
		try {
			observer.sink({ kind: 'resync-required', at: this.mark, reason });
		} catch {
			observer.disposed = true;
			this.observers.delete(observer);
		}
	}
	private pump(observer: Observer): void {
		if (observer.draining || observer.inFlight || observer.disposed) return;
		observer.draining = true;
		try {
			while (observer.queue.length && !observer.inFlight && !observer.disposed) {
				const frame = observer.queue.shift()!;
				observer.bytes -= encodedBytes(frame);
				if (frame.kind === 'patch') observer.inFlight = frame.to;
				else if (frame.kind === 'patch-part' && frame.index === frame.count - 1)
					observer.inFlight = frame.header.to;
				else if (frame.kind === 'snapshot-end') observer.inFlight = frame.at;
				if (observer.inFlight) observer.inFlightBytes = encodedBytes(frame);
				observer.sink(frame);
			}
		} catch {
			observer.disposed = true;
			observer.queue.length = 0;
			observer.bytes = 0;
			this.observers.delete(observer);
		} finally {
			observer.draining = false;
		}
	}
	geometryReserve(grid: ScreenGrid, scrollback = this.model.options.scrollback ?? 0): number {
		return (
			grid.cols *
				(this.model.buffer.normal.length * Math.max(1, Math.ceil(this.model.cols / grid.cols)) +
					this.model.buffer.alternate.length +
					grid.rows * 2) *
				160 +
			(scrollback + grid.rows * 2) * 8
		);
	}
	registerView(viewId: string): ScreenViewLease {
		if (this.disposed || !viewId || viewId.length > 256 || this.views.size >= this.profile.maxObservers)
			throw new Error('Screen view capacity exceeded');
		const lease = Object.freeze({ runtimeId: this.runtimeId, viewId, leaseId: this.id() });
		this.views.set(lease.leaseId, { lease, visible: false, focused: false, revision: 0, bytes: 0 });
		if (!this.account()) {
			this.views.delete(lease.leaseId);
			throw new Error('Screen view allocation exceeds resource limits');
		}
		return lease;
	}
	private view(lease: ScreenViewLease): View | undefined {
		const value = this.views.get(lease.leaseId);
		return value?.lease === lease ? value : undefined;
	}
	setViewVisible(lease: ScreenViewLease, visible: boolean): void {
		const view = this.view(lease);
		if (!view) return;
		if (view.visible !== visible) view.revision++;
		view.visible = visible;
		if (!visible) {
			view.focused = false;
			if (this.sizeOwner === view) this.sizeOwner = undefined;
		}
	}
	setViewFocused(lease: ScreenViewLease, focused: boolean): boolean {
		const view = this.view(lease);
		if (!view || !view.visible || this.disposed) return false;
		if (view.focused !== focused || (focused && this.sizeOwner !== view)) view.revision++;
		view.focused = focused;
		if (focused) {
			if (this.sizeOwner && this.sizeOwner !== view) {
				this.sizeOwner.focused = false;
				this.sizeOwner.revision++;
			}
			this.sizeOwner = view;
		} else if (this.sizeOwner === view) this.sizeOwner = undefined;
		return this.sizeOwner === view;
	}
	unregisterView(lease: ScreenViewLease): void {
		const view = this.view(lease);
		if (!view) return;
		if (this.sizeOwner === view) this.sizeOwner = undefined;
		this.views.delete(lease.leaseId);
		this.account();
	}
	/** A legacy non-view resize is available only while no view owns this runtime. */
	legacySizeAllowed(): boolean {
		return this.views.size === 0;
	}
	observeNativeGeometry(op: number): (value: NonNullable<ScreenSnapshot['nativeGeometry']>) => void {
		const revision = ++this.geometryRevision;
		const update = (value: NonNullable<ScreenSnapshot['nativeGeometry']>) =>
			this.barrier(() => {
				if (this.disposed || revision !== this.geometryRevision || value.op !== op) return;
				this.nativeGeometry = Object.freeze({ ...value });
				this.commit();
			});
		update({ op, state: 'requested' });
		return update;
	}
	requestSize(
		lease: ScreenViewLease,
		grid: ScreenGrid,
		native: () => 'requested' | 'unsupported' | 'unknown',
	): Promise<ScreenGeometryResult> {
		const target = { ...grid },
			revision = this.view(lease)?.revision;
		return this.query<ScreenGeometryResult>(
			{ status: 'rejected', reason: 'disposed' },
			{ status: 'rejected', reason: 'resource-limit' },
			(resolve) => {
				const view = this.view(lease);
				if (!view || view.revision !== revision || this.sizeOwner !== view || !view.visible || !view.focused) {
					resolve({ status: 'rejected', reason: 'not-owner' });
					return;
				}
				if (!screenGridAllowed(target, this.model.options.scrollback ?? 0, this.profile)) {
					resolve({ status: 'rejected', reason: 'invalid-grid' });
					return;
				}
				const reserve = this.geometryReserve(target);
				if (this.failure || !this.admitModel(reserve)) {
					resolve({ status: 'rejected', reason: 'resource-limit' });
					return;
				}
				this.model.resize(target.cols, target.rows);
				this.commit('resize');
				resolve({ status: 'accepted', at: this.mark, geometry: target, native: native() });
			},
		);
	}
	read(request: ScreenReadRequest): Promise<ScreenReadResult> {
		const input = { ...request };
		if (this.disposed) return Promise.resolve({ status: 'rejected', reason: 'disposed' });
		return this.query<ScreenReadResult>(
			{ status: 'rejected', reason: 'disposed' },
			{ status: 'rejected', reason: 'resource-limit' },
			(resolve) => {
				const now = Date.now();
				for (const [id, token] of this.reads) if (token.expires <= now) this.reads.delete(id);
				if (input.expectedRuntimeId !== this.runtimeId) {
					resolve({ status: 'resync-required', reason: 'stale-runtime' });
					return;
				}
				const maxBytes = input.maxBytes ?? this.profile.maxReadBytes,
					maxRows = input.maxRows ?? this.profile.maxReadRows;
				if (
					!Number.isSafeInteger(maxBytes) ||
					maxBytes < 4 ||
					maxBytes > this.profile.maxReadBytes ||
					!Number.isSafeInteger(maxRows) ||
					maxRows < 1 ||
					maxRows > this.profile.maxReadRows
				) {
					resolve({ status: 'rejected', reason: 'invalid-limit' });
					return;
				}
				if (input.cursor && input.cursor.length > 128) {
					resolve({ status: 'resync-required', reason: 'expired-cursor' });
					return;
				}
				const position = input.cursor?.split('/');
				let token = position ? this.reads.get(position[0]!) : undefined;
				let row = position ? Number(position[1]) : 0,
					offset = position ? Number(position[2]) : 0;
				if (
					input.cursor &&
					(!token ||
						position?.length !== 3 ||
						!Number.isSafeInteger(row) ||
						row < 0 ||
						!Number.isSafeInteger(offset) ||
						offset < 0)
				) {
					resolve({ status: 'resync-required', reason: 'expired-cursor' });
					return;
				}
				if (!token) {
					if (this.reads.size >= this.profile.maxReadTokens) {
						resolve({ status: 'rejected', reason: 'resource-limit' });
						return;
					}
					const id = this.id();
					token = {
						id,
						snapshot: this.current,
						buffer: input.buffer ?? this.current.active,
						expires: now + this.profile.readTtlMs,
					};
					this.reads.set(id, token);
					if (!this.account()) {
						this.reads.delete(id);
						resolve({ status: 'rejected', reason: 'resource-limit' });
						return;
					}
				}
				const startRow = row,
					startOffset = offset,
					buffer = token.snapshot.buffers.find((value) => value.name === token.buffer)!;
				if (row > buffer.rows.length) {
					resolve({ status: 'resync-required', reason: 'expired-cursor' });
					return;
				}
				let text = '',
					used = 0,
					rows = 0;
				while (row < buffer.rows.length && rows < maxRows) {
					const cells = buffer.rows[row]!.cells;
					let length = 0,
						lastNonSpace = 0;
					for (const cell of cells)
						if (cell.width) {
							const chars = cell.chars || ' ';
							const end = chars.search(/ *$/);
							if (end) lastNonSpace = length + end;
							length += chars.length;
						}
					let at = 0,
						consumed = offset;
					characters: for (const cell of cells) {
						if (!cell.width || at >= lastNonSpace || used >= maxBytes) continue;
						for (const char of cell.chars || ' ') {
							const next = at + char.length;
							if (at >= lastNonSpace) break;
							if (next > offset) {
								const cp = char.codePointAt(0)!;
								const size = cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4;
								if (used + size > maxBytes) break characters;
								text += char;
								used += size;
								consumed = next;
							}
							at = next;
						}
						if (used >= maxBytes || at < consumed) break;
					}
					offset = consumed;
					if (consumed < lastNonSpace) break;
					if (row + 1 < buffer.rows.length && used === maxBytes) break;
					row++;
					offset = 0;
					rows++;
					if (row < buffer.rows.length) {
						text += '\n';
						used++;
					}
				}
				const truncated = row < buffer.rows.length;
				resolve({
					status: 'ok',
					at: token.snapshot.at,
					buffer: token.buffer,
					range: { startRow, startOffset, endRow: row, endOffset: offset },
					text,
					truncated,
					...(truncated ? { nextCursor: `${token.id}/${row}/${offset}` } : {}),
					output: token.snapshot.output,
				});
			},
		);
	}
	usage(): Readonly<ScreenUsage> {
		return Object.freeze({
			...this.source.usage(),
			status: this.failure ? 'resource-limit' : 'ok',
			...(this.failure ? { reason: this.failure } : {}),
			pendingRawBytes: this.pendingRaw,
			projectionBytes: this.projectionBytes(this.current),
			snapshotBytes: [...new Set([...this.reads.values()].map((value) => value.snapshot))].reduce(
				(sum, value) => sum + this.projectionBytes(value),
				0,
			),
			journalBytes: this.journalBytes,
			observerBytes:
				[...this.observers].reduce((sum, value) => sum + value.bytes + value.inFlightBytes, 0) +
				[...this.legacy.values()].reduce((sum, bytes) => sum + bytes, 0),
			observers: this.observers.size + this.legacy.size,
			readTokens: this.reads.size,
		});
	}
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		for (const cancel of [...this.requests]) cancel();
		this.quarantine = undefined;
		this.quarantineLength = 0;
		this.localQuarantine = undefined;
		this.pendingRaw = 0;
		for (const observer of this.observers) {
			observer.disposed = true;
			observer.queue.length = 0;
		}
		this.observers.clear();
		this.legacy.clear();
		this.views.clear();
		this.reads.clear();
		this.jobs.length = 0;
		this.journal.length = 0;
		this.source.dispose();
		this.budget.release(this.budgetOwner);
	}
}
