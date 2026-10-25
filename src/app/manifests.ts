import type { ModuleManifest } from './contracts/module';
import { agentManifest } from '../modules/agent/manifest';
import { archivesManifest } from '../modules/archives/manifest';
import { automationsManifest } from '../modules/automations/manifest';
import { browserManifest } from '../modules/browser/manifest';
import { commentsManifest } from '../modules/comments/manifest';
import { homeManifest } from '../modules/home/manifest';
import { iconsManifest } from '../modules/icons/manifest';
import { navigatorManifest } from '../modules/navigator/manifest';
import { notificationsManifest } from '../modules/notifications/manifest';
import { versioningManifest } from '../modules/versioning/manifest';
import { safeManifest } from '../modules/safe/manifest';

/** Every module HUHU ships. Manifests are data only; module code loads through `manifest.load()`. */
export const MANIFESTS: readonly ModuleManifest[] = [
	browserManifest,
	homeManifest,
	commentsManifest,
	navigatorManifest,
	archivesManifest,
	agentManifest,
	iconsManifest,
	notificationsManifest,
	automationsManifest,
	versioningManifest,
	safeManifest,
];
