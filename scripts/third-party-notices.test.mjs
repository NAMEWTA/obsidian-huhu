import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { buildDistributedGraphs } from './third-party-notices.mjs';
import { VERSIONING_PARSE_WORKER_ENTRY, VERSIONING_WORKER_ENTRY } from './versioning-worker.mjs';

test('NOTICE enumerates the real highlighter and parser entry graphs independently of main.js', async () => {
 const main = { metafile: { inputs: {}, outputs: {} } };
 const graphs = await buildDistributedGraphs({ buildMain: async () => main });
 assert.equal(graphs[0], main);
 const entries = graphs.slice(1).flatMap((graph) => Object.values(graph.metafile.outputs).map((output) => output.entryPoint));
 assert(entries.some((entry) => entry === VERSIONING_PARSE_WORKER_ENTRY), 'parser program must be enumerated as a distributed entry');
 assert(entries.some((entry) => path.resolve(entry) === VERSIONING_WORKER_ENTRY), 'official highlighter program must also be enumerated');
 assert.equal(graphs.length, 3);
 assert(graphs.slice(1).every((graph) => graph.outputFiles[0].contents.length > 0));
});
