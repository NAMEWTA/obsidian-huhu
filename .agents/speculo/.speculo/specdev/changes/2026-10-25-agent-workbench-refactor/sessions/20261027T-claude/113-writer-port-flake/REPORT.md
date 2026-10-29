<!-- Saved by Lead from implementer reply (Sonnet 5.5). -->
The 4 `port-in-use` flakes in `workspace-service-spaces.test.ts` are fixed in the tests. Production lease semantics are unchanged. tsc and eslint on the source files are clean, and 20 full runs of the affected tests passed.

**Cause.** `writerPort(deviceId, root)` in `writer-owner.ts` hashes device plus directory dev/ino into the range 16384–65535. The collision is therefore host-dependent, not random. The port is the cross-window single-writer lease, and a foreign process holding it fails closed as `OWNER_CONFLICT:port-in-use`. That is intended, so I left it alone.

**Seam.** `createWriterOwner(directories, listener, portFor = writerPort)` and `createDesktopSpacePorts({ ..., writerPort? })` now take an optional port provider. Production never passes it, so the default is still the hash.

**Test helper.** `freeWriterPorts()` in the new `free-writer-port.fixture.ts` asks the OS for a free loopback port. It keeps the port stable per device and directory, so a second instance on the same directory still contends for the same port. `writer-owner.fixture.ts` (the forked child process) takes an optional 6th argv with the port.

**Where the helper is used.**
- Used in six test files: `workspace-service-spaces`, `workspace-service-native`, `workspace-service-launch-failures`, `workspace-service-stop-native`, `control-native`, `control-panels-native`, plus `control-coordination-native`.
- In `workspace-service-spaces.test.ts`, the competing-process test passes the fixture's own lease port to its forked children, so the `port-in-use` assertion still tests real contention.
- I did not touch `controller-managed-runtimes.test.ts`, `ports.test.ts` or `writer-owner.test.ts`, which use the default hash, or `controller.ts` and `module.ts`, which are production.
- Those three still use the hashed port, so they are exposed to the same flake, though I haven't seen them fail.

**Occupied-port test.** I added "a foreign process holding the hashed writer port cannot fail the fixture". It listens on the would-be hashed port, then checks the fixture's lease port is a different one and that `spaces.create` succeeds. It passes.

**Results**
- `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`: no errors.
- `pnpm exec eslint` on the four source files (`free-writer-port.fixture.ts`, `ports.ts`, `writer-owner.ts`, `writer-owner.fixture.ts`) with `--max-warnings 0`: clean. The `*.test.ts` files are on the eslint ignore list, so only the sources were linted.
- Vitest loop, 20 iterations (`done 20`, last exit 0). Each iteration ran `workspace-service-spaces`, `workspace-service-native`, `workspace-service-launch-failures`, `workspace-service-stop-native`, all of `src/modules/agent/services/control`, and all of `src/modules/agent/platform/desktop/spaces`. No failures.

**Remaining risk.** The helper probes a port by listening on 0 and closing it, so a very small window exists where another process could take that port before the lease binds. The OS rarely hands a just-freed port out again.

**Option not taken.** Having production probe a few candidate ports with an identity handshake would be a semantic change. I did not make it, because the current behavior is documented as fail-closed.

Changed paths, all under `src/modules/agent/`:
- `platform/desktop/spaces/writer-owner.ts`
- `platform/desktop/spaces/ports.ts`
- `platform/desktop/spaces/writer-owner.fixture.ts`
- `platform/desktop/spaces/free-writer-port.fixture.ts` (new)
- `services/workspace-service-spaces.test.ts`
- `services/workspace-service-native.test.ts`
- `services/workspace-service-launch-failures.test.ts`
- `services/workspace-service-stop-native.test.ts`
- `services/control/control-native.test.ts`
- `services/control/control-panels-native.test.ts`
- `services/control/control-coordination-native.test.ts`

SOURCE STOPPED