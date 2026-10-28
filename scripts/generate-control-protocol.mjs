// Generate the deliberately finite local-control contract; unknown schema constructs fail closed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { build as bundle } from 'esbuild';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
	const at = args.indexOf(name);
	return at < 0 ? fallback : args[at + 1];
};
for (const arg of args.filter((_, i) => i === 0 || !['--schema', '--out-dir'].includes(args[i - 1])))
	if (!['--schema', '--out-dir', '--check'].includes(arg)) throw new Error('Unknown generator argument: ' + arg);
const input = flag('--schema', path.join(repo, 'src/shared/native/control-schema.json'));
const output = flag('--out-dir', repo);
const descriptor = JSON.parse(fs.readFileSync(input, 'utf8'));
const exact = (value, keys, label) => {
	if (
		!value ||
		typeof value !== 'object' ||
		Array.isArray(value) ||
		Object.keys(value).some((key) => !keys.includes(key))
	)
		throw new Error('Unsupported ' + label + ' construct');
};
exact(
	descriptor,
	[
		'descriptorVersion',
		'protocolVersion',
		'helperProtocol',
		'capability',
		'limits',
		'errorExits',
		'phases',
		'effects',
		'env',
		'schemas',
		'messages',
		'operations',
		'editor',
	],
	'descriptor',
);
if (descriptor.descriptorVersion !== 1 || descriptor.protocolVersion !== 1 || descriptor.helperProtocol !== 3)
	throw new Error('Unsupported descriptor version');
const schemaKeys = [
	'type',
	'ref',
	'const',
	'enum',
	'minLength',
	'maxLength',
	'maxUtf8Bytes',
	'pattern',
	'minimum',
	'maximum',
	'properties',
	'required',
	'additionalProperties',
	'oneOf',
];
function check(schema) {
	exact(schema, schemaKeys, 'schema');
	if (schema.oneOf) {
		if (
			Object.keys(schema).length !== 1 ||
			!Array.isArray(schema.oneOf) ||
			!schema.oneOf.length ||
			schema.oneOf.length > 8
		)
			throw new Error('Invalid finite oneOf');
		schema.oneOf.forEach(check);
		return;
	}
	if (schema.ref) {
		if (Object.keys(schema).length !== 1 || !Object.hasOwn(descriptor.schemas, schema.ref))
			throw new Error('Unknown schema reference');
		return;
	}
	if ('const' in schema) {
		if (Object.keys(schema).length !== 1 || !['string', 'number', 'boolean'].includes(typeof schema.const))
			throw new Error('Invalid const');
		return;
	}
	if (schema.enum) {
		if (
			Object.keys(schema).length !== 1 ||
			!schema.enum.length ||
			schema.enum.some((x) => typeof x !== 'string') ||
			new Set(schema.enum).size !== schema.enum.length
		)
			throw new Error('Invalid enum');
		return;
	}
	const allowed = {
		object: ['type', 'properties', 'required', 'additionalProperties'],
		string: ['type', 'minLength', 'maxLength', 'maxUtf8Bytes', 'pattern'],
		integer: ['type', 'minimum', 'maximum'],
		number: ['type', 'minimum', 'maximum'],
		boolean: ['type'],
		json: ['type'],
		'json-object': ['type'],
		operation: ['type'],
	}[schema.type];
	if (!allowed || Object.keys(schema).some((key) => !allowed.includes(key)))
		throw new Error('Unsupported schema type/keyword');
	if (schema.type === 'object') {
		if (
			schema.additionalProperties !== false ||
			!schema.properties ||
			!Array.isArray(schema.required) ||
			schema.required.some((key) => !Object.hasOwn(schema.properties, key))
		)
			throw new Error('Object requires exact properties');
		Object.values(schema.properties).forEach(check);
	}
	if (schema.pattern && !['ascii-id', 'decimal', 'hex256'].includes(schema.pattern))
		throw new Error('Unsupported schema pattern');
	for (const key of ['minLength', 'maxLength', 'maxUtf8Bytes', 'minimum', 'maximum'])
		if (key in schema && (typeof schema[key] !== 'number' || !Number.isFinite(schema[key])))
			throw new Error('Invalid schema bound');
	for (const key of ['minLength', 'maxLength', 'maxUtf8Bytes'])
		if (key in schema && (!Number.isSafeInteger(schema[key]) || schema[key] < 0))
			throw new Error('Invalid string bound');
}
Object.values(descriptor.schemas).forEach(check);
exact(descriptor.editor, ['version', 'purpose', 'capability', 'env', 'limits', 'binary', 'messages'], 'editor');
const editor = descriptor.editor;
if (
	editor.version !== 1 ||
	editor.purpose !== 'huhu-editor' ||
	editor.capability !== 'editorTransactions' ||
	editor.env !== 'HUHU_EDITOR_CAPABILITY_FILE'
)
	throw new Error('Invalid editor purpose/version');
const directions = ['node-to-native', 'native-to-node', 'app-to-native', 'native-to-app'];
for (const [name, message] of Object.entries(editor.messages)) {
	exact(message, ['schema', 'directions', 'budget'], 'editor message');
	check(message.schema);
	if (
		!name.startsWith('editor-') ||
		message.schema.properties.type.const !== name ||
		!['metadata', 'receipt', 'lifecycle'].includes(message.budget) ||
		!Array.isArray(message.directions) ||
		!message.directions.length ||
		new Set(message.directions).size !== message.directions.length ||
		message.directions.some((direction) => !directions.includes(direction))
	)
		throw new Error('Invalid editor message');
}
for (const [key, n] of Object.entries({ ...editor.limits, ...editor.binary }))
	if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid editor bound: ' + key);
if (
	editor.limits.lifecyclePoolBytes !== editor.limits.lifecycleFrames * (editor.limits.lifecycleBytes + 5) ||
	editor.limits.operationReceiptPoolBytes !==
		128 * editor.limits.operationReceiptStates * (editor.limits.receiptBytes + 5) ||
	editor.limits.bodyBytes !== 256 * 1024 ||
	editor.limits.fragmentBytes !== 16 * 1024 ||
	editor.binary.helperInputPartKind !== 4
)
	throw new Error('Invalid editor shared reservation profile');
if (
	editor.binary.helperInputPartHeaderBytes !== 13 ||
	editor.binary.appMetadataKind !== 1 ||
	editor.binary.appBodyKind !== 2 ||
	editor.binary.appFrameHeaderBytes !== 5 ||
	editor.binary.appPartHeaderBytes !== 9
)
	throw new Error('Unsupported editor binary layout');
for (const [name, message] of Object.entries(descriptor.messages)) {
	exact(message, ['schema', 'budget'], 'message');
	check(message.schema);
	if (
		message.schema.properties.type.const !== name ||
		!['scope', 'registration', 'request', 'response', 'stage', 'small'].includes(message.budget)
	)
		throw new Error('Invalid message class');
}
for (const operation of Object.values(descriptor.operations)) {
	exact(operation, ['params', 'target', 'transport', 'available', 'description', 'readOnly'], 'operation');
	check(operation.params);
	if (
		!['ordinary', 'query', 'stop'].includes(operation.transport) ||
		typeof operation.available !== 'boolean' ||
		typeof operation.readOnly !== 'boolean' ||
		typeof operation.description !== 'string' ||
		!Array.isArray(operation.target) ||
		operation.target.some((key) => !Object.hasOwn(descriptor.schemas.target.properties, key))
	)
		throw new Error('Invalid operation');
}
for (const [key, n] of Object.entries(descriptor.limits))
	if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid limit: ' + key);
for (const n of Object.values(descriptor.errorExits))
	if (!Number.isInteger(n) || n <= 0 || n > 255) throw new Error('Invalid error exit');

const wrapperCosts = {};
for (const [name, message] of Object.entries(descriptor.messages)) {
	const field = { request: 'request', response: 'response', scope: 'scope', stage: 'progress' }[message.budget];
	if (!field) continue;
	const properties = message.schema.properties;
	let bytes = 2,
		nodes = 1;
	for (const [key, schema] of Object.entries(properties)) {
		bytes += Buffer.byteLength(JSON.stringify(key)) + 2;
		nodes++;
		if (key === field) continue;
		if ('const' in schema) bytes += Buffer.byteLength(JSON.stringify(schema.const));
		else if (schema.type === 'string' && schema.pattern === 'ascii-id') bytes += schema.maxLength + 2;
		else throw new Error('Unbounded wrapper field');
		nodes++;
	}
	if (
		bytes > descriptor.limits.wrapperBytes ||
		nodes > descriptor.limits.wrapperNodes ||
		descriptor.limits.wrapperDepth < 1
	)
		throw new Error('Fixed wrapper exceeds reserve');
	wrapperCosts[name] = { bytes, nodes, depth: 1 };
}

const json = JSON.stringify(descriptor);
if (Buffer.byteLength(json) > descriptor.limits.schemaBytes) throw new Error('Offline schema capacity');
const names = {
	target: 'ControlTarget',
	physicalRoot: 'ControlPhysicalRoot',
	scope: 'ControlScope',
	error: 'ControlError',
	request: 'ControlRequest',
	response: 'ControlResponse',
	progress: 'ControlProgress',
	auth: 'ControlAuth',
	locator: 'ControlLocator',
};
for (const key of Object.keys(descriptor.schemas))
	if (!names[key])
		names[key] = (key.startsWith('editor') ? 'Native' : 'Control') + key[0].toUpperCase() + key.slice(1);
const title = (name) =>
	name
		.split('-')
		.map((x) => x[0].toUpperCase() + x.slice(1))
		.join('');
function type(schema) {
	if (schema.oneOf) return schema.oneOf.map(type).join(' | ');
	if (schema.ref) return names[schema.ref];
	if ('const' in schema) return JSON.stringify(schema.const);
	if (schema.enum) return schema.enum.map(JSON.stringify).join(' | ');
	if (schema.type === 'object')
		return (
			'{ ' +
			Object.entries(schema.properties)
				.map(
					([key, value]) =>
						'readonly ' +
						JSON.stringify(key) +
						(schema.required.includes(key) ? '' : '?') +
						': ' +
						type(value),
				)
				.join('; ') +
			' }'
		);
	return {
		string: 'string',
		integer: 'number',
		number: 'number',
		boolean: 'boolean',
		json: 'ControlJson',
		'json-object': 'Readonly<{ [key: string]: ControlJson }>',
		operation: 'ControlOperation',
	}[schema.type];
}
const tsSource = [
	'// Generated by scripts/generate-control-protocol.mjs; edit control-schema.json only.',
	'export type ControlJson = null | boolean | number | string | readonly ControlJson[] | { readonly [key: string]: ControlJson };',
	'export const CONTROL_PROTOCOL = 1 as const;',
	'export const EDITOR_VERSION = 1 as const;',
	'export const EDITOR_PURPOSE = "huhu-editor" as const;',
	'export const EDITOR_CAPABILITY_ENV = "HUHU_EDITOR_CAPABILITY_FILE" as const;',
	'export const EDITOR_LIMITS = Object.freeze(' + JSON.stringify(editor.limits) + ');',
	'export const EDITOR_BINARY = Object.freeze(' + JSON.stringify(editor.binary) + ');',
	'export const EDITOR_MESSAGE_TYPES = ' + JSON.stringify(Object.keys(editor.messages)) + ' as const;',
	'export type EditorMessageType = typeof EDITOR_MESSAGE_TYPES[number];',
	'export type EditorDirection = ' + directions.map(JSON.stringify).join(' | ') + ';',
	'export const CONTROL_WRAPPER_COSTS = Object.freeze(' + JSON.stringify(wrapperCosts) + ');',
	'export const CONTROL_LIMITS = Object.freeze(' + JSON.stringify(descriptor.limits) + ');',
	'export const CONTROL_ERROR_EXITS = Object.freeze(' + JSON.stringify(descriptor.errorExits) + ');',
	'export type ControlErrorCode = keyof typeof CONTROL_ERROR_EXITS;',
	'export const CONTROL_WAIT_STATES = ' + JSON.stringify(descriptor.schemas.waitState.enum) + ' as const;',
	'export const CONTROL_ENV = Object.freeze(' + JSON.stringify(descriptor.env) + ');',
	'export const CONTROL_OPERATION_NAMES = ' + JSON.stringify(Object.keys(descriptor.operations)) + ' as const;',
	'export type ControlOperation = typeof CONTROL_OPERATION_NAMES[number];',
	'export const CONTROL_MESSAGE_TYPES = ' + JSON.stringify(Object.keys(descriptor.messages)) + ' as const;',
	'export type ControlMessageType = typeof CONTROL_MESSAGE_TYPES[number];',
	...Object.entries(descriptor.schemas).map(
		([name, schema]) => 'export type ' + names[name] + ' = ' + type(schema) + ';',
	),
	...Object.entries(descriptor.messages).map(
		([name, message]) => 'export type ' + title(name) + 'Message = ' + type(message.schema) + ';',
	),
	...Object.entries(editor.messages).map(
		([name, message]) => 'export type ' + title(name) + 'Message = ' + type(message.schema) + ';',
	),
	'export type EditorMessage = ' +
		Object.keys(editor.messages)
			.map((name) => title(name) + 'Message')
			.join(' | ') +
		';',
	'export type ControlMessage = ' +
		Object.keys(descriptor.messages)
			.map((name) => title(name) + 'Message')
			.join(' | ') +
		';',
	'export interface ControlSchema { readonly oneOf?: readonly ControlSchema[]; readonly ref?: string; readonly const?: string | number | boolean; readonly enum?: readonly string[]; readonly type?: string; readonly minLength?: number; readonly maxLength?: number; readonly maxUtf8Bytes?: number; readonly pattern?: string; readonly minimum?: number; readonly maximum?: number; readonly properties?: Readonly<Record<string, ControlSchema>>; readonly required?: readonly string[]; readonly additionalProperties?: false }',
	'export interface EditorDescriptor { readonly version: 1; readonly purpose: "huhu-editor"; readonly capability: "editorTransactions"; readonly env: typeof EDITOR_CAPABILITY_ENV; readonly limits: typeof EDITOR_LIMITS; readonly binary: typeof EDITOR_BINARY; readonly messages: Readonly<Record<EditorMessageType,{readonly schema:ControlSchema;readonly directions:readonly EditorDirection[];readonly budget:"metadata"|"receipt"|"lifecycle"}>> }',
	'export interface ControlOperationDescriptor { readonly params: ControlSchema; readonly target: readonly string[]; readonly transport: "ordinary" | "query" | "stop"; readonly available: boolean; readonly readOnly: boolean; readonly description: string }',
	'export interface ControlDescriptor { readonly descriptorVersion: number; readonly protocolVersion: number; readonly helperProtocol: number; readonly capability: Readonly<{localControl: 1}>; readonly limits: typeof CONTROL_LIMITS; readonly errorExits: typeof CONTROL_ERROR_EXITS; readonly phases: readonly string[]; readonly effects: readonly string[]; readonly env: typeof CONTROL_ENV; readonly editor: EditorDescriptor; readonly schemas: Readonly<Record<string,ControlSchema>>; readonly messages: Readonly<Record<ControlMessageType,{readonly schema:ControlSchema;readonly budget:string}>>; readonly operations: Readonly<Record<ControlOperation,ControlOperationDescriptor>> }',
	'function freeze<T>(value: T): T { if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }',
	'let cached: ControlDescriptor | undefined;',
	'/** The descriptor object is created only on explicit control use, never on legacy frame discrimination. */',
	'export function controlDescriptor(): ControlDescriptor { return cached ??= freeze<ControlDescriptor>(' +
		json +
		'); }',
	'export function editorDescriptor(): EditorDescriptor { return controlDescriptor().editor; }',
	'',
].join('\n');
// Bundle the real pure implementation, substituting only this generation's descriptor to avoid embedding itself.
const embedded = await bundle({
	absWorkingDir: repo,
	stdin: {
		contents: `export { parseEditorMessage, encodeEditorMessage, parseEditorCapability, encodeEditorCapability, parseEditorLaunch, encodeEditorLaunch, ControlProtocolError } from './control-wire';
export { editorBodyBytes, encodeEditorAppPart, parseEditorAppPart, NativeEditorError } from './input';
export { EDITOR_VERSION, EDITOR_PURPOSE, EDITOR_CAPABILITY_ENV, EDITOR_BINARY, EDITOR_LIMITS } from './control-wire.generated';`,
		resolveDir: path.join(repo, 'src/shared/native'),
		sourcefile: 'editor-codec-entry.ts',
		loader: 'ts',
	},
	bundle: true,
	write: false,
	platform: 'neutral',
	format: 'iife',
	globalName: 'HuhuEditorCodec',
	target: 'es2021',
	sourcemap: false,
	minify: true,
	legalComments: 'inline',
	plugins: [
		{
			name: 'fresh-canonical',
			setup(build) {
				build.onLoad({ filter: /control-wire\.generated\.ts$/ }, () => ({ contents: tsSource, loader: 'ts' }));
			},
		},
	],
});
const embeddedSource = embedded.outputFiles[0].text;
// Formatting is part of the deterministic generated bytes, using the repository's pinned tool/config.
const prettierOptions = {
	...(await prettier.resolveConfig(path.join(repo, 'src/shared/native/control-wire.generated.ts'), {
		editorconfig: true,
	})),
	parser: 'typescript',
};
const ts = await prettier.format(tsSource, prettierOptions);
// Separate file so the ~48KB embedded codec is only loaded on explicit editor use, not with the control wire.
const editorCodecTs = await prettier.format(
	'// Generated by scripts/generate-control-protocol.mjs; edit control-schema.json only.\n' +
		'/** Exact Node-free production codec for the generated string extension; initialize only on explicit editor use. */\n' +
		'export function editorEmbeddedCodecSource(): string { return ' +
		JSON.stringify(embeddedSource) +
		'; }\n',
	prettierOptions,
);
const rust = [
	'// Generated by scripts/generate-control-protocol.mjs; edit control-schema.json only.',
	'pub const PROTOCOL_VERSION: u64 = 1;',
	'pub const EDITOR_VERSION: u64 = 1;',
	'pub const EDITOR_MESSAGE_TYPES: &[&str] = &[' + Object.keys(editor.messages).map(JSON.stringify).join(',') + '];',
	...Object.entries({ ...editor.limits, ...editor.binary }).map(
		([key, n]) =>
			'pub const EDITOR_' + key.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase() + ': usize = ' + n + ';',
	),
	'pub const WAIT_STATES: &[&str] = &[' + descriptor.schemas.waitState.enum.map(JSON.stringify).join(',') + '];',
	'pub fn read_only(operation: &str) -> bool { matches!(operation, ' +
		Object.entries(descriptor.operations)
			.filter(([, op]) => op.readOnly)
			.map(([name]) => JSON.stringify(name))
			.join(' | ') +
		') }',
	'pub const DESCRIPTOR_JSON: &str = r###"' + json + '"###;',
	'pub const MESSAGE_TYPES: &[&str] = &[' + Object.keys(descriptor.messages).map(JSON.stringify).join(',') + '];',
	'pub fn error_exit(code: &str) -> i32 { match code { ' +
		Object.entries(descriptor.errorExits)
			.map(([key, n]) => JSON.stringify(key) + ' => ' + n + ',')
			.join('') +
		' _ => 8 } }',
	...Object.entries(descriptor.limits).map(
		([key, n]) => 'pub const ' + key.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase() + ': usize = ' + n + ';',
	),
	'',
].join('\n');
for (const [name, content] of [
	['src/shared/native/control-wire.generated.ts', ts],
	['src/shared/native/control-wire-editor-codec.generated.ts', editorCodecTs],
	['native/pty-server/src/control/wire_generated.rs', rust],
]) {
	const file = path.join(output, name);
	if (args.includes('--check')) {
		if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content)
			throw new Error('Generated control protocol differs: ' + name);
	} else {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
	}
}
console.log(args.includes('--check') ? 'control protocol generated bytes match' : 'control protocol generated');
