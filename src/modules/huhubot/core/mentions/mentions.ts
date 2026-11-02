import type { Agent, Session } from '../../api';

/** Local editor metadata, never a second wire DTO. Offsets are UTF-16 code units in draft.text. */
export interface MentionToken { agentId: string; label: string; start: number; end: number }
export interface MentionDraft { text: string; mentions: readonly MentionToken[] }
type MentionAgent = Pick<Agent, 'id' | 'name' | 'enabled'>;
export interface MentionChoice { agentId: string; name: string; ambiguous: boolean; identityLabel: string }
export type MentionResolution = { valid: true; targetAgentIds: string[] } | {
	valid: false; reason: 'MENTION_TOKEN_INVALID' | 'MENTION_UNKNOWN_AGENT' | 'MENTION_AGENT_DISABLED' | 'MENTION_NOT_MEMBER'; invalidAgentIds: string[];
};
export class MentionError extends Error {
	constructor(readonly reason = 'MENTION_TOKEN_INVALID') { super(reason); this.name = 'MentionError'; }
}

function boundary(text: string, offset: number): boolean {
	if (!Number.isInteger(offset) || offset < 0 || offset > text.length) return false;
	const left = text.charCodeAt(offset - 1), right = text.charCodeAt(offset);
	return !(left >= 0xd800 && left <= 0xdbff && right >= 0xdc00 && right <= 0xdfff);
}
function ordered(draft: MentionDraft): MentionToken[] | undefined {
	const tokens = [...draft.mentions].sort((a, b) => a.start - b.start);
	let end = 0;
	for (const token of tokens) {
		if (!token.agentId || !token.label || !boundary(draft.text, token.start) || !boundary(draft.text, token.end) ||
			token.start < end || token.end <= token.start || draft.text.slice(token.start, token.end) !== `@${token.label}`) return undefined;
		end = token.end;
	}
	return tokens;
}

/** Suggestions are identities to select explicitly. No name, including a unique name, is a routing instruction. */
export function mentionChoices(agents: readonly MentionAgent[], memberIds: readonly string[], query = ''): MentionChoice[] {
	const members = new Set(memberIds), names = new Map<string, number>(), search = query.toLowerCase();
	const available = agents.filter(agent => agent.enabled && members.has(agent.id));
	for (const agent of available) names.set(agent.name, (names.get(agent.name) ?? 0) + 1);
	return available.filter(agent => agent.name.toLowerCase().includes(search) || agent.id.toLowerCase().includes(search)).map(agent => {
		const ambiguous = (names.get(agent.name) ?? 0) > 1;
		return { agentId: agent.id, name: agent.name, ambiguous, identityLabel: ambiguous ? `${agent.name} (${agent.id})` : agent.name };
	});
}

/** Called only after a user picks a candidate. Replacing a selected token is an explicit edit, not text inference. */
export function selectMention(draft: MentionDraft, start: number, end: number, agent: Pick<Agent, 'id' | 'name'>): MentionDraft {
	const tokens = ordered(draft);
	if (!tokens || !agent.id || !agent.name || !boundary(draft.text, start) || !boundary(draft.text, end) || end < start) throw new MentionError();
	// Do not split an existing atomic token by inserting at its middle or by selecting only part of it.
	if (tokens.some(token => (start > token.start && start < token.end) || (end > token.start && end < token.end))) throw new MentionError();
	const label = `@${agent.name}`, shift = label.length - (end - start);
	const mentions = tokens.filter(token => token.end <= start || token.start >= end).map(token =>
		token.start >= end ? { ...token, start: token.start + shift, end: token.end + shift } : { ...token });
	mentions.push({ agentId: agent.id, label: agent.name, start, end: start + label.length });
	mentions.sort((a, b) => a.start - b.start);
	return { text: draft.text.slice(0, start) + label + draft.text.slice(end), mentions };
}

/** Current directory/member snapshots provide early feedback; the server still owns CAS and authorization. */
export function resolveMentionTargets(draft: MentionDraft, session: Pick<Session, 'memberIds'>, agents: readonly Pick<Agent, 'id' | 'enabled'>[]): MentionResolution {
	const tokens = ordered(draft);
	if (!tokens) return { valid: false, reason: 'MENTION_TOKEN_INVALID', invalidAgentIds: [] };
	const targets = [...new Set(tokens.map(token => token.agentId))], members = new Set(session.memberIds);
	const reasons = new Map<string, Exclude<MentionResolution, { valid: true }>['reason']>();
	for (const id of targets) {
		const matches = agents.filter(agent => agent.id === id);
		if (matches.length !== 1) reasons.set(id, 'MENTION_UNKNOWN_AGENT');
		else if (!matches[0]!.enabled) reasons.set(id, 'MENTION_AGENT_DISABLED');
		else if (!members.has(id)) reasons.set(id, 'MENTION_NOT_MEMBER');
	}
	const reason = reasons.values().next().value;
	if (reason) return { valid: false, reason, invalidAgentIds: [...reasons.keys()] };
	return { valid: true, targetAgentIds: targets };
}
