import type { ModuleManifest } from '../../app/contracts/module';
import { COMMENTS_DOCUMENT_CHANGES, COMMENTS_INDEX, COMMENTS_PANEL } from './api';

export const commentsManifest: ModuleManifest = {
	id: 'comments',
	order: 30,
	icon: 'highlighter',
	titleKey: 'modules.highlights',
	descriptionKey: 'modules.editorDesc',
	platforms: { desktop: true, mobile: true },
	defaultEnabled: true,
	activation: 'startup',
	provides: [COMMENTS_PANEL, COMMENTS_INDEX, COMMENTS_DOCUMENT_CHANGES],
	load: () => import('./module'),
};
