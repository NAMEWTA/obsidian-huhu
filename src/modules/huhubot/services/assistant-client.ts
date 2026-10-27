import type { BotClient, BotMethodMap, CallOptions, ModelBindingDraft } from '../api';

type Params<M extends keyof BotMethodMap> = Omit<BotMethodMap[M]['params'], 'profileId'>;

/** Bot/model application facade bound to the opened local Profile.
 * Commands keep the caller's intent keys and revision unchanged. Conflicts and unavailable
 * adapters propagate from the common BotClient; this facade never retries a write.
 */
export class AssistantClient {
	constructor(private readonly bot: BotClient) {}
	get profileId(): string { return this.bot.hello.profile.profileId; }
	listAgents(query: Params<'agents.list'> = {}, options?: CallOptions) {
		return this.bot.agents.list({ ...query, profileId: this.profileId }, options);
	}
	getAgent(id: string, options?: CallOptions) {
		return this.bot.agents.get({ profileId: this.profileId, id }, options);
	}
	createAgent(command: Params<'agents.create'>, options?: CallOptions) {
		return this.bot.agents.create({ ...command, profileId: this.profileId }, options);
	}
	updateAgent(command: Params<'agents.update'>, options?: CallOptions) {
		return this.bot.agents.update({ ...command, profileId: this.profileId }, options);
	}
	disableAgent(command: Params<'agents.disable'>, options?: CallOptions) {
		return this.bot.agents.disable({ ...command, profileId: this.profileId }, options);
	}
	previewDeleteAgent(id: string, options?: CallOptions) {
		return this.bot.agents.deletePreview({ profileId: this.profileId, id }, options);
	}
	deleteAgent(command: Params<'agents.delete'>, options?: CallOptions) {
		return this.bot.agents.delete({ ...command, profileId: this.profileId }, options);
	}
	listModels(query: Params<'models.list'> = {}, options?: CallOptions) {
		return this.bot.models.list({ ...query, profileId: this.profileId }, options);
	}
	testModel(model: ModelBindingDraft, options?: CallOptions) {
		return this.bot.models.test({ profileId: this.profileId, model }, options);
	}
	bindModel(command: Params<'models.bind'>, options?: CallOptions) {
		return this.bot.models.bind({ ...command, profileId: this.profileId }, options);
	}
}
