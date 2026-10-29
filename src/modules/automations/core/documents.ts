import { AUTOMATION_DEFINITIONS_ROOT } from '../../../shared/storage/vault-layout';
import {
	collectionDocument as doc,
	documentName,
	type DocumentCollectionCodec,
} from '../../../shared/storage/document-collection';
import { parseDocumentValue } from '../../../shared/storage/document-repository';
import { isDefinition } from '../../../shared/automation/metadata';
import type { AutomationDefinition } from '../../../shared/automation/types';
import { actionDefinition, decodeAction, encodeAction } from './actions/registry';
import { systemTimeZone } from './schedule';

export interface AutomationDefinitionsRepository {
	list(): Promise<AutomationDefinition[]>;
	save(definition: AutomationDefinition): Promise<void>;
	remove(definition: AutomationDefinition): Promise<void>;
}
export interface DefinitionCollection {
	definitions: AutomationDefinition[];
}
const root = AUTOMATION_DEFINITIONS_ROOT;
export const automationDocuments: DocumentCollectionCodec<DefinitionCollection> = {
	root,
	managedProperties: [
		'id',
		'name',
		'enabled',
		'deviceId',
		'revision',
		'graceMinutes',
		'channels',
		'notifyOn',
		'createdAt',
		'updatedAt',
		'action',
		'schedule',
		'agentId',
		'cwd',
		'shell',
		'sessionMode',
		'session',
		'cardId',
		'path',
		'command',
		'url',
		'at',
		'repeat',
		'start',
		'timezone',
		'extraArgs',
		'spaceId',
		'precheck',
		'templateId',
		'linkPath',
		'linkLine',
	],
	empty: () => ({ definitions: [] }),
	encode: ({ definitions }) =>
		definitions.map((definition) => {
			if (definition.removedAction) return structuredClone(definition.removedAction);
			const { action, schedule, link, source: _source, ...metadata } = definition;
			const stored = encodeAction(action);
			const document = doc(
				definition.id,
				`${root}/${documentName(definition.name)}-${definition.id.slice(-8)}/操作.md`,
				'automation',
				{
					...metadata,
					action: action.kind,
					...stored.properties,
					schedule: schedule.kind,
					...(schedule.kind === 'once' ? { at: new Date(schedule.at).toISOString() } : {}),
					...(schedule.kind === 'recurring'
						? {
								repeat: schedule.expression,
								start: new Date(schedule.start).toISOString(),
								timezone: schedule.timezone ?? systemTimeZone(),
							}
						: {}),
					...(link
						? { linkPath: link.path, ...(link.line !== undefined ? { linkLine: link.line } : {}) }
						: {}),
				},
			);
			document.sections = { [stored.section]: stored.text };
			return document;
		}),
	decode: (documents) => ({
		definitions: documents
			.filter((d) => d.properties['huhu-type'] === 'automation')
			.map((document) => {
				const p = document.properties;
				const removed = p.action === 'browser-workflow';
				// A removed action keeps its document untouched and shows as a read-only reminder.
				const kind = removed ? 'notify' : String(p.action);
				if (!actionDefinition(kind)) throw new Error(`Invalid action: ${document.path}`);
				const action = decodeAction(kind as AutomationDefinition['action']['kind'], p, document.sections);
				const definition = {
					...(removed ? { removedAction: structuredClone(document) } : {}),
					name: p.name,
					enabled: p.enabled,
					deviceId: p.deviceId,
					revision: p.revision,
					graceMinutes: p.graceMinutes,
					channels: p.channels,
					notifyOn: p.notifyOn,
					createdAt: p.createdAt,
					updatedAt: p.updatedAt,
					...(p.precheck !== undefined ? { precheck: p.precheck } : {}),
					...(p.templateId !== undefined ? { templateId: p.templateId } : {}),
					...(typeof p.linkPath === 'string'
						? {
								link: {
									path: p.linkPath,
									...(typeof p.linkLine === 'number' ? { line: p.linkLine } : {}),
								},
							}
						: {}),
					id: document.id,
					action,
					schedule:
						p.schedule === 'manual'
							? { kind: 'manual' }
							: p.schedule === 'once'
								? { kind: 'once', at: Date.parse(String(p.at)) }
								: {
										kind: 'recurring',
										expression: p.repeat,
										start: Date.parse(String(p.start)),
										timezone: p.timezone,
									},
				};
				if (!isDefinition(definition)) throw new Error(`Invalid automation: ${document.path}`);
				return definition;
			}),
	}),
};

/** The repository's own reader applied to one document: undefined when it decodes to exactly one definition. */
export function checkAutomationDocument(path: string, text: string): string | undefined {
	try {
		const value = parseDocumentValue(text);
		const id = value.properties['huhu-id'];
		if (typeof id !== 'string' || !id) return 'no-id';
		return automationDocuments.decode([{ ...value, id, path }]).definitions.length === 1
			? undefined
			: 'not-a-definition';
	} catch (error) {
		return error instanceof Error ? error.message.slice(0, 80) : 'unreadable';
	}
}
