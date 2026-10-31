/**
 * Serialized presentation lifecycle adapted from Orca v1.4.217
 * terminal-structural-replay-coordinator.ts (MIT, Lovecast Inc., 2026).
 * HUHU's headless session is authoritative; hidden views retain no raw ANSI tail.
 */
import {
	DEFAULT_SCREEN_PROFILE,
	SCREEN_ENGINE,
	screenGridAllowed,
	screenMarkEqual,
	type ScreenBuffer,
	type ScreenBufferName,
	type ScreenFrame,
	type ScreenMark,
	type ScreenPatch,
	type ScreenProfile,
	type ScreenRow,
	type ScreenSnapshot,
	type ScreenSnapshotHeader,
	type ScreenStream,
} from '../../core/terminal/frames-screen';

export interface TerminalPresentationPort {
	open(options: Readonly<{ after?: ScreenMark }>, sink: (frame: ScreenFrame) => void): ScreenStream;
	installSnapshot(snapshot: ScreenSnapshot): void;
	applyPatch(patch: ScreenPatch): void;
	error(error: unknown): void;
	status?(status: 'ready' | 'resync' | 'resource-limit' | 'unavailable'): void;
}
interface SnapshotAssembly {
	id: string;
	header: ScreenSnapshotHeader;
	buffers: Map<ScreenBufferName, ScreenRow[]>;
	links: ScreenSnapshot['links'][number][];
	bytes: number;
}
interface PatchAssembly {
	id: string;
	count: number;
	next: number;
	header: Omit<ScreenPatch, 'operations' | 'effects' | 'links'>;
	operations: ScreenPatch['operations'][number][];
	effects: ScreenPatch['effects'][number][];
	links: ScreenPatch['links'][number][];
	bytes: number;
}

/** Only complete bounded parsed commits are applied; no display parser or asynchronous VT queue exists. */
export class TerminalPresentation {
	private visible = false;
	private disposed = false;
	private generation = 0;
	private stream?: ScreenStream;
	private mark?: ScreenMark;
	private snapshot?: SnapshotAssembly;
	private patch?: PatchAssembly;
	private recovery = false;
	private failed = false;
	private actions: Array<() => void> = [];
	constructor(
		private readonly port: TerminalPresentationPort,
		private readonly profile: Readonly<ScreenProfile> = DEFAULT_SCREEN_PROFILE,
	) {}
	setVisible(visible: boolean): void {
		if (this.disposed || this.visible === visible) return;
		this.visible = visible;
		this.invalidate();
		if (visible) {
			this.failed = false;
			this.recovery = false;
			this.open();
		}
	}
	private invalidate(): void {
		this.generation++;
		this.stream?.dispose();
		this.stream = undefined;
		this.snapshot = undefined;
		this.patch = undefined;
		this.mark = undefined;
		this.actions = [];
	}
	private open(): void {
		const generation = this.generation;
		try {
			// A may deliver the entire initial snapshot before returning this stream.
			const stream = this.port.open({}, (frame) => {
				if (this.current(generation)) this.receive(frame, generation);
			});
			if (!this.current(generation)) stream.dispose();
			else this.stream = stream;
		} catch (error) {
			this.stop(error, 'unavailable');
		}
	}
	private current(generation: number): boolean {
		return this.visible && !this.disposed && !this.failed && generation === this.generation;
	}
	private stop(error: unknown, status: 'resource-limit' | 'unavailable'): void {
		this.failed = true;
		this.invalidate();
		this.port.status?.(status);
		this.port.error(error);
	}
	private recover(generation: number): void {
		this.snapshot = undefined;
		this.patch = undefined;
		this.port.status?.('resync');
		if (this.recovery) {
			this.stop(new Error('Screen resync did not restore continuity'), 'unavailable');
			return;
		}
		this.recovery = true;
		queueMicrotask(() => {
			if (this.current(generation)) {
				try {
					this.stream?.resync();
				} catch (error) {
					this.stop(error, 'unavailable');
				}
			}
		});
	}
	private acknowledge(mark: ScreenMark, generation: number): void {
		this.mark = { ...mark };
		this.port.status?.('ready');
		const actions = this.actions.splice(0);
		for (const run of actions) run();
		// Defer even for synchronous open delivery, and fence an old subscription's receipt.
		queueMicrotask(() => {
			if (this.current(generation)) {
				try {
					this.stream?.applied(mark);
				} catch (error) {
					this.stop(error, 'unavailable');
				}
			}
		});
	}
	private bytes(frame: ScreenFrame): number {
		const bytes = new TextEncoder().encode(JSON.stringify(frame)).byteLength;
		if (bytes > this.profile.maxFrameBytes) throw new Error('Screen frame exceeds limit');
		return bytes;
	}
	private receive(frame: ScreenFrame, generation: number): void {
		try {
			const bytes = this.bytes(frame);
			if (frame.kind === 'resync-required') {
				if (
					frame.reason === 'resource-limit' ||
					frame.reason === 'disposed' ||
					frame.reason === 'stale-runtime'
				)
					this.stop(
						new Error(`Screen ${frame.reason}`),
						frame.reason === 'resource-limit' ? 'resource-limit' : 'unavailable',
					);
				else this.recover(generation);
				return;
			}
			if (frame.kind === 'snapshot-begin') {
				const h = frame.header;
				if (
					this.snapshot ||
					this.patch ||
					h.version !== 1 ||
					h.engine !== SCREEN_ENGINE ||
					!screenGridAllowed(h.geometry, 0, this.profile) ||
					h.buffers.length !== 2 ||
					!h.at.runtimeId
				)
					throw new Error('Invalid screen snapshot header');
				const buffers = new Map<ScreenBufferName, ScreenRow[]>();
				let cells = 0;
				for (const header of h.buffers) {
					if (
						buffers.has(header.name) ||
						!['normal', 'alternate'].includes(header.name) ||
						!Number.isSafeInteger(header.length) ||
						header.length < 0 ||
						header.length > this.profile.maxScrollback + h.geometry.rows
					)
						throw new Error('Invalid screen snapshot buffer');
					cells += header.length * h.geometry.cols;
					buffers.set(header.name, []);
				}
				if (cells > this.profile.maxModelCells) throw new Error('Screen snapshot exceeds model limit');
				this.snapshot = { id: frame.snapshotId, header: h, buffers, links: [], bytes };
				return;
			}
			if (frame.kind === 'snapshot-links' || frame.kind === 'snapshot-row' || frame.kind === 'snapshot-end') {
				const a = this.snapshot;
				if (!a || a.id !== frame.snapshotId) {
					this.recover(generation);
					return;
				}
				a.bytes += bytes;
				if (a.bytes > this.profile.maxSnapshotBytes) throw new Error('Screen snapshot exceeds limit');
				if (frame.kind === 'snapshot-links') {
					if (a.links.length + frame.links.length > this.profile.maxLinks)
						throw new Error('Screen links exceed limit');
					a.links.push(...frame.links);
					return;
				}
				if (frame.kind === 'snapshot-row') {
					const rows = a.buffers.get(frame.buffer),
						header = a.header.buffers.find((value) => value.name === frame.buffer);
					if (
						!rows ||
						!header ||
						!Number.isSafeInteger(frame.index) ||
						frame.index < 0 ||
						frame.index >= header.length ||
						frame.index > rows.length ||
						!Number.isSafeInteger(frame.start) ||
						frame.start < 0 ||
						frame.start + frame.cells.length > a.header.geometry.cols ||
						!frame.cells.length
					)
						throw new Error('Invalid snapshot row fragment');
					const row = rows[frame.index];
					if (!row) {
						if (frame.start !== 0) throw new Error('Missing snapshot row prefix');
						rows.push({ key: frame.key, isWrapped: frame.isWrapped, cells: [...frame.cells] });
					} else {
						if (
							row.key !== frame.key ||
							row.isWrapped !== frame.isWrapped ||
							row.cells.length !== frame.start
						)
							throw new Error('Discontinuous snapshot row');
						rows[frame.index] = { ...row, cells: [...row.cells, ...frame.cells] };
					}
					return;
				}
				if (!screenMarkEqual(frame.at, a.header.at)) throw new Error('Snapshot watermark mismatch');
				const buffers: ScreenBuffer[] = a.header.buffers.map((header) => {
					const rows = a.buffers.get(header.name)!;
					if (
						rows.length !== header.length ||
						rows.some((row) => row.cells.length !== a.header.geometry.cols)
					)
						throw new Error('Incomplete snapshot');
					return { ...header, rows };
				});
				this.port.installSnapshot({ ...a.header, buffers, links: a.links });
				this.snapshot = undefined;
				this.acknowledge(frame.at, generation);
				return;
			}
			if (this.snapshot) {
				this.recover(generation);
				return;
			}
			if (frame.kind === 'patch-part') {
				if (
					!Number.isSafeInteger(frame.count) ||
					frame.count < 1 ||
					frame.count > this.profile.maxSnapshotBytes ||
					!Number.isSafeInteger(frame.index) ||
					frame.index < 0 ||
					frame.index >= frame.count
				)
					throw new Error('Invalid screen patch parts');
				if (!this.patch) {
					if (frame.index !== 0) {
						this.recover(generation);
						return;
					}
					this.patch = {
						id: frame.patchId,
						count: frame.count,
						next: 0,
						header: frame.header,
						operations: [],
						effects: [],
						links: [],
						bytes: 0,
					};
				}
				const p = this.patch;
				if (
					p.id !== frame.patchId ||
					p.count !== frame.count ||
					p.next !== frame.index ||
					JSON.stringify(p.header) !== JSON.stringify(frame.header)
				) {
					this.recover(generation);
					return;
				}
				p.bytes += bytes;
				if (p.bytes > this.profile.maxSnapshotBytes) throw new Error('Screen patch exceeds limit');
				p.operations.push(...frame.operations);
				p.effects.push(...frame.effects);
				p.links.push(...frame.links);
				p.next++;
				if (p.next === p.count) {
					this.patch = undefined;
					this.commit(
						{ ...p.header, operations: p.operations, effects: p.effects, links: p.links },
						generation,
					);
				}
				return;
			}
			if (this.patch) {
				this.recover(generation);
				return;
			}
			this.commit(frame, generation);
		} catch (error) {
			this.stop(error, error instanceof Error && /limit/.test(error.message) ? 'resource-limit' : 'unavailable');
		}
	}
	private commit(patch: ScreenPatch, generation: number): void {
		if (!this.mark || !screenMarkEqual(this.mark, patch.from)) {
			this.recover(generation);
			return;
		}
		this.port.applyPatch(patch);
		this.recovery = false;
		this.acknowledge(patch.to, generation);
	}
	/** Navigation actions wait for the current complete parsed commit. */
	afterParsed(run: () => void): void {
		if (!this.visible || this.disposed || this.failed) return;
		if (this.snapshot || this.patch || !this.mark) {
			if (this.actions.length >= this.profile.maxJournalFrames)
				this.stop(new Error('Screen action limit'), 'resource-limit');
			else this.actions.push(run);
		} else run();
	}
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.visible = false;
		this.invalidate();
	}
}
