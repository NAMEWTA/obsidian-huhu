import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '../../../../../contracts/hap/v0.1/schema.json';
import type {
	BotErrorData,
	BotMethod,
	BotMethodMap,
	HapCancelNotification,
	MemoryBody,
	MemoryItem,
	MemoryObject,
	MemorySettings,
	ExecutionContextView,
} from '../../api';

export class HapProtocolError extends Error {
	constructor(readonly reason: string) {
		super(`HAP protocol error: ${reason}`);
		this.name = 'HapProtocolError';
	}
}

type MethodPart = 'params' | 'result';
const definitions = new Set(
	Object.keys(schema.$defs).filter((key) => key.endsWith('.params') || key.endsWith('.result')),
);
const MAX_METHOD_VALIDATORS = definitions.size;

const encoder = new TextEncoder();
const MEMORY_OBJECT_BYTES = 245760;
const MEMORY_PAGE_BYTES = 262144;
const memoryMethods = new Set<BotMethod>([
	'memory.list',
	'memory.get',
	'memory.pin',
	'memory.correct',
	'memory.forget',
	'memory.setAutoMaintenance',
	'memory.proposeGlobal',
	'memory.resolveGlobal',
]);
const positiveDecimals = new Set([
	'revision',
	'namespaceRevision',
	'expectedRevision',
	'candidateRevision',
	'targetRevision',
	'runRevision',
	'commandEpoch',
	'hostLeaseEpoch',
]);
// Match Go strings.TrimSpace, including NEL but excluding the BOM preserved as content.
const blank = /^\p{White_Space}*$/u;
const byteLength = (text: string): number => encoder.encode(text).length;

function scalarString(text: string): boolean {
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		if (code >= 0xdc00 && code <= 0xdfff) return false;
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = text.charCodeAt(++index);
			if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
		}
	}
	return true;
}

/** Only reached after the finite, closed Memory schema: this is not a general JSON walker. */
function memoryStrings(value: unknown, field = ''): boolean {
	if (typeof value === 'string') {
		if (!scalarString(value)) return false;
		const bytes = byteLength(value);
		if (field === 'commandId' || field === 'idempotencyKey') return bytes <= 128 && !blank.test(value);
		if (field === 'id' || field.endsWith('Id') || field === 'namespace' || field === 'scopeResourceIds')
			return bytes <= 512 && !blank.test(value);
		if (
			(field === 'text' && bytes > 65536) ||
			(field === 'query' && bytes > 1024) ||
			((field === 'cursor' || field === 'nextCursor') && bytes > 2048)
		)
			return false;
		if (
			positiveDecimals.has(field) &&
			(value === '0' || value.length > 19 || (value.length === 19 && value > '9223372036854775807'))
		)
			return false;
		return true;
	}
	if (Array.isArray(value)) return value.every((entry) => memoryStrings(entry, field));
	if (value && typeof value === 'object')
		return Object.entries(value).every(([key, entry]) => memoryStrings(entry, key));
	return true;
}

/** Count the decoded Go DTO, not raw wire padding or JavaScript's different HTML escaping. */
function memoryEncodedBytes(value: unknown): number {
	const json = JSON.stringify(value, function (this: Record<string, unknown>, key: string, entry: unknown): unknown {
		// Required strings cannot be empty after schema validation. Text is a Go pointer in context entries.
		if (entry === '' && key !== 'text') return undefined;
		if (this.representation !== undefined && this.state !== undefined) {
			if ((key === 'sourceRefs' || key === 'sourceSpans') && Array.isArray(entry) && entry.length === 0)
				return undefined;
			if ((key === 'partial' && entry === false) || ((key === 'partIndex' || key === 'partCount') && entry === 0))
				return undefined;
		}
		return entry;
	});
	return byteLength(
		json.replace(
			/[<>&\u2028\u2029]/g,
			(character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
		),
	);
}

function memoryBody(body: MemoryBody): boolean {
	return (
		!blank.test(body.text) &&
		body.sourceRefs.length + body.sourceScopes.length <= 32 &&
		(body.creatorKind === 'user' ? body.provenance === 'user' : body.provenance !== 'user' && !!body.creatorAgentId)
	);
}

function memoryItem(item: MemoryItem): boolean {
	return item.state === 'forgotten' || memoryBody(item.body);
}

function memorySettings(settings: MemorySettings): boolean {
	return (
		settings.namespace.kind === 'agent' &&
		(settings.eligible || (!!settings.reason && !blank.test(settings.reason) && byteLength(settings.reason) <= 512))
	);
}

function memoryContext(context: ExecutionContextView): boolean {
	if (context.namespace.kind === 'global') return false;
	if (context.state === 'pending' || context.state === 'legacy_untracked') return !!context.reason;
	return context.entries.every((entry) => {
		if (entry.state === 'redacted') return !!entry.reason;
		if (entry.kind === 'attachment') return true;
		// Source spans/hash describe the original object. Only the rendered display slice is comparable here.
		return (
			entry.text !== undefined &&
			byteLength(entry.text) <= 4096 &&
			!!entry.displaySlice &&
			entry.displaySlice.end - entry.displaySlice.start === byteLength(entry.text) &&
			(entry.partIndex ?? 0) < (entry.partCount ?? 0)
		);
	});
}

function memoryObject(object: MemoryObject): boolean {
	switch (object.kind) {
		case 'item':
			return memoryItem(object.item);
		case 'settings':
			return memorySettings(object.settings);
		case 'candidate':
			return !('body' in object.candidate) || memoryBody(object.candidate.body);
		case 'job':
			return object.job.admission !== 'bound' || !!object.job.run;
		case 'context':
			return memoryContext(object.context);
		case 'proposal':
			// Pending create/update previews retain their fixed body so an owner
			// can inspect exactly what will be committed. Delete previews may be
			// metadata-only, and terminal proposals are deliberately body-free so
			// they cannot re-enter recall or physical delivery.
			if (object.proposal.state !== 'pending') return !object.proposal.body;
			return (object.proposal.operation === 'delete' || !!object.proposal.body) && (!object.proposal.body || memoryBody(object.proposal.body));
	}
}

function memorySemantics(method: BotMethod, part: MethodPart, value: unknown): boolean {
	if (!memoryStrings(value)) return false;
	if (part === 'params') {
		if (memoryEncodedBytes(value) > MEMORY_OBJECT_BYTES) return false;
		if (method === 'memory.list' || method === 'memory.get') {
			const query = value as BotMethodMap['memory.list']['params'] | BotMethodMap['memory.get']['params'];
			if (query.namespace.kind === 'global' && query.namespace.id !== query.profileId) return false;
		}
		if (method === 'memory.correct' || method === 'memory.proposeGlobal') {
			const command = value as
				BotMethodMap['memory.correct']['params'] | BotMethodMap['memory.proposeGlobal']['params'];
			if ('text' in command && blank.test(command.text)) return false;
		}
		if (method === 'memory.setAutoMaintenance')
			return (value as BotMethodMap['memory.setAutoMaintenance']['params']).namespace.kind === 'agent';
		return true;
	}
	if (method === 'memory.list') {
		const page = value as BotMethodMap['memory.list']['result'];
		return (
			memoryEncodedBytes(page) <= MEMORY_PAGE_BYTES &&
			(!page.settings || memorySettings(page.settings)) &&
			page.items.every(
				(object) =>
					memoryEncodedBytes(object) <= MEMORY_OBJECT_BYTES &&
					memoryObject(object) &&
					(object.kind !== 'context' || object.context.entries.length === 0),
			)
		);
	}
	if (method === 'memory.get') {
		const object = value as MemoryObject;
		return (
			memoryEncodedBytes(object) <= (object.kind === 'context' ? MEMORY_PAGE_BYTES : MEMORY_OBJECT_BYTES) &&
			memoryObject(object)
		);
	}
	if (memoryEncodedBytes(value) > MEMORY_OBJECT_BYTES) return false;
	if (method === 'memory.pin' || method === 'memory.correct' || method === 'memory.forget') {
		const item = value as MemoryItem;
		return memoryItem(item) && (method !== 'memory.forget' || item.state === 'forgotten');
	}
	if (method === 'memory.setAutoMaintenance') return memorySettings(value as MemorySettings);
	if (method === 'memory.proposeGlobal') {
		const proposal = value as BotMethodMap['memory.proposeGlobal']['result'];
		return memoryObject({ kind: 'proposal', proposal });
	}
	return true;
}

/** One fixed version contract; only requested method parts are compiled, without changing input data. */
export class MethodValidation {
	private engine?: Ajv2020;
	private errorValidator?: ValidateFunction;
	private cancelValidator?: ValidateFunction;
	private readonly validators = new Map<string, ValidateFunction>();

	get compiledCount(): number {
		return this.validators.size;
	}

	validate<M extends BotMethod, P extends MethodPart>(
		method: M,
		part: P,
		value: unknown,
	): value is BotMethodMap[M][P] {
		const key = `${method}.${part}`;
		if (!definitions.has(key)) return false;
		let validate = this.validators.get(key);
		if (!validate) {
			if (this.validators.size >= MAX_METHOD_VALIDATORS)
				throw new HapProtocolError('METHOD_VALIDATOR_LIMIT');
			validate = this.schemaEngine().getSchema(`${schema.$id}#/$defs/${key}`);
			if (!validate) throw new HapProtocolError('METHOD_SCHEMA_MISSING');
			this.validators.set(key, validate);
		}
		return validate(value) && (!memoryMethods.has(method) || memorySemantics(method, part, value));
	}
	/** One additional fixed validator, shared with the codec; method cache remains capped by this version’s static schema. */
	validateErrorData(value: unknown): value is BotErrorData {
		this.errorValidator ??= this.schemaEngine().getSchema(`${schema.$id}#/$defs/BotErrorData`);
		if (!this.errorValidator) throw new HapProtocolError('ERROR_SCHEMA_MISSING');
		return this.errorValidator(value);
	}
	/** One fixed control notification; it is not a callable Bot business method. */
	validateCancelNotification(value: unknown): value is HapCancelNotification {
		this.cancelValidator ??= this.schemaEngine().getSchema(`${schema.$id}#/$defs/HapCancelNotification`);
		if (!this.cancelValidator) throw new HapProtocolError('CANCEL_SCHEMA_MISSING');
		return this.cancelValidator(value);
	}
	private schemaEngine(): Ajv2020 {
		if (!this.engine) {
			this.engine = new Ajv2020({
				allErrors: false,
				strict: true,
				strictTypes: false,
				strictRequired: false,
				validateFormats: true,
				coerceTypes: false,
				removeAdditional: false,
				useDefaults: false,
				ownProperties: true,
			});
			addFormats(this.engine, { mode: 'full', formats: ['date-time'] });
			this.engine.addSchema(schema);
		}
		return this.engine;
	}
}

export const methodValidation = new MethodValidation();
