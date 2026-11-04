import { BELONGING_TYPE_ID, type BelongingsCommands, type BelongingsQueryResult } from '../../api';
import type { ArchiveRuntime } from './runtime';
import { EntityCommands } from './entities';
import { DefinitionCommands } from './definitions';
import { BELONGING, BELONGING_TEMPLATE } from '../../core/belongings/preset';
import { defaultForms } from '../../core/schema/presets';
import { equal } from '../../core/schema/value';
import { parseBelonging } from '../../core/belongings/lifecycle';
import { belongingStatistics, belongingMonthlyTrend, belongingAnnualReport } from '../../core/belongings/statistics';
import { ArchiveError } from '../../core/schema/model';
export function belongingToday(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export class BelongingsService implements BelongingsCommands {
	constructor(private readonly runtime: ArchiveRuntime, private readonly entities: EntityCommands) {}
	async install(signal?: AbortSignal): Promise<{ installed: boolean; preserved: boolean }> {
		await this.runtime.command({}, (_input, context) => this.runtime.bootstrap(context), signal);
		const definitions = new DefinitionCommands(this.runtime);
		const existing = this.runtime.index.definition(BELONGING_TYPE_ID);
		if (this.runtime.index.revisions(BELONGING_TYPE_ID).length && (!existing || !equal(existing.definition, BELONGING))) return { installed: false, preserved: true };
		let installed = false;
		for (const definition of [BELONGING, ...defaultForms(BELONGING), BELONGING_TEMPLATE]) {
			if (this.runtime.index.revisions(definition.id).length) continue;
			await definitions.publish({ operationId: `preset-${definition.id}-v1`, definition, expectedHeads: [] }, signal);
			installed = true;
		}
		return { installed, preserved: !!existing };
	}
	transition: BelongingsCommands['transition'] = (input, signal) => this.entities.transitionBelonging(input, signal);
	undo: BelongingsCommands['undo'] = (input, signal) => this.entities.undoBelonging(input, signal);
	async query(options: { asOf?: string; year?: number } = {}): Promise<BelongingsQueryResult> {
		await this.runtime.ensureLoaded();
		const context = this.runtime.context();
		await this.runtime.flushEvents();
		this.runtime.assert(context, true);
		const items = this.runtime.index.allEntities().filter(entity => entity.typeId === BELONGING_TYPE_ID && entity.lifecycle === 'active').map(entity => {
			if (this.runtime.index.entitiesById(entity.id).length !== 1) throw new ArchiveError('duplicate-id');
			return parseBelonging(entity);
		});
		const statistics = belongingStatistics(items, options.asOf ?? belongingToday());
		return { items, statistics, ...(options.year !== undefined ? { monthly: belongingMonthlyTrend(items, options.year), report: belongingAnnualReport(items, options.year, options.asOf ?? belongingToday()) } : {}) };
	}
}
