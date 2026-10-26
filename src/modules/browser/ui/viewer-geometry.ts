/** Map only the visible, letterboxed image into the frame's CSS coordinate system. */
export function framePoint(
	rect: { left: number; top: number; width: number; height: number },
	frame: { cssWidth: number; cssHeight: number },
	x: number,
	y: number,
): { x: number; y: number } | undefined {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return;
	if (
		![rect.width, rect.height, frame.cssWidth, frame.cssHeight].every(
			(value) => Number.isFinite(value) && value > 0,
		)
	)
		return;
	const scale = Math.min(rect.width / frame.cssWidth, rect.height / frame.cssHeight);
	const left = rect.left + (rect.width - frame.cssWidth * scale) / 2;
	const top = rect.top + (rect.height - frame.cssHeight * scale) / 2;
	const point = { x: (x - left) / scale, y: (y - top) / scale };
	if (point.x < 0 || point.y < 0 || point.x >= frame.cssWidth || point.y >= frame.cssHeight) return;
	return point;
}

/** One decoder and one replacement frame, including while a decoder is awaiting an image. */
export function latestFramePresenter<T>(options: {
	present(frame: T, signal: AbortSignal): Promise<void>;
	ack(frame: T): void;
	error(reason: unknown): void;
}) {
	let disposed = false;
	let pending: T | undefined;
	let running = false;
	const controller = new AbortController();
	const flush = async () => {
		if (running) return;
		running = true;
		try {
			while (!disposed && pending !== undefined) {
				const frame = pending;
				pending = undefined;
				try {
					await options.present(frame, controller.signal);
				} catch (reason) {
					if (!disposed) options.error(reason);
				} finally {
					options.ack(frame);
				}
			}
		} finally {
			running = false;
		}
	};
	return {
		enqueue(frame: T) {
			if (disposed) {
				options.ack(frame);
				return;
			}
			if (pending !== undefined) options.ack(pending);
			pending = frame;
			void flush();
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			controller.abort();
			if (pending !== undefined) options.ack(pending);
			pending = undefined;
		},
	};
}

const windowIds = new WeakMap<Document, string>();
export function windowIdentity(document: Document): string {
	let id = windowIds.get(document);
	if (!id) {
		id = crypto.randomUUID();
		windowIds.set(document, id);
	}
	return id;
}
