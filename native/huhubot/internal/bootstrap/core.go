// Package bootstrap explicitly assembles concrete infrastructure and narrow application services.
package bootstrap

import (
	"context"
	"database/sql"
	"errors"
	blobstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/credentials"
	engineanthropic "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/anthropic"
	enginechat "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	enginecommon "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	engineresponses "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/responses"
	readbridge "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/hostbridge/read"
	writebridge "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/hostbridge/write"
	portablefile "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/portable"
	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	collabstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/collaboration"
	effectsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/effects"
	eventsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/events"
	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	globalmemorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/globalmemory"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	groupstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	memorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	portablesql "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/portable"
	purgestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/purge"
	recoverystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/recovery"
	usagestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	approvalsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/approvals"
	contextapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	grantsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	assistantapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	delegateapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
	messagesapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/messages"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	groupapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/group"
	portableapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	purgeapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/purge"
	eventsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/events"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	recoveryapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/recovery"
	globalapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/global"
	memoryapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/private"
	brokerapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	collabtools "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/collaboration-tools"
	reconcileapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/reconcile"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"sync"
	"time"
)

// modelRuntime is a private composition lifetime, separate from the public
// Engine port. Done acknowledges real requests and settlement, not cancellation.
type modelRuntime interface {
	Stop()
	Done() <-chan struct{}
	Close() error
}

// Failed Registry construction leaves driver ownership with this caller.
// Request cancellation for all of them before waiting for actual completion.
func stopModelRuntimes(runtimes ...modelRuntime) error {
	for _, runtime := range runtimes {
		runtime.Stop()
	}
	for _, runtime := range runtimes {
		<-runtime.Done()
	}
	var err error
	for _, runtime := range runtimes {
		err = errors.Join(err, runtime.Close())
	}
	return err
}

type Core struct {
	stopAdmission func()
	executions    *executionstore.Store
	effects       *effectsstore.Store
	API           *api.Facade
	// Portable is assembled here so transports can opt into the concrete
	// profile/artifact implementation without importing SQL adapters.
	Portable    portableapp.API
	Credentials api.CredentialRegistration
	provider    api.CredentialProvider
	executor    *executorapp.Executor
	store       *base.Store
	profile     *profile.Handle
	once        sync.Once
	closed      chan struct{}
	recovery    *recoverystore.Store
	policy      *usagestore.Store
	stopErr     error
	closeErr    error
	tooling     *brokerapp.Service
	models      modelRuntime
	assistants  *assistantapp.Service
	memory      *memorystore.Store
}

type Options struct {
	ExecutionLimits  api.ExecutionLimits
	Budget           api.BudgetPolicy
	Usage            api.AgentUsagePort
	Probe            api.ModelProbePort
	Engine           api.Engine
	ExecutorPaused   bool
	NoteWriter       api.NoteWritePort
	ApprovalLifetime time.Duration
	EngineVersion    string
}

func Open(ctx context.Context, root, locator string) (*Core, error) {
	return OpenWithOptions(ctx, root, locator, Options{})
}
func OpenWithOptions(ctx context.Context, root, locator string, options Options) (*Core, error) {
	if !api.ValidExecutionLimits(options.ExecutionLimits) {
		return nil, api.Invalid("INVALID_EXECUTION_LIMITS")
	}

	h, err := profile.Acquire(root, locator)
	if err != nil {
		return nil, err
	}
	store, err := base.OpenWithBackup(ctx, h, func(ctx context.Context, snapshot *sql.DB, dir string) ([]base.BackupBlob, error) {
		source, e := blobstore.ReadOnlySource(h.Directory)
		if e != nil {
			return nil, e
		}
		return effectsstore.CompleteMigrationBackup(ctx, snapshot, source, dir)
	})
	if err != nil {
		_ = h.Close()
		return nil, err
	}
	blobs, err := blobstore.New(h.Directory)
	if err != nil {
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}

	host := api.NewHostService()
	accessStore := grantsstore.New(store)
	grants := grantsapp.New(accessStore, time.Now)
	accessContext := contextapp.New(accessStore, readbridge.New(host))
	service := api.NewService(store, host)
	catalog := assistantstore.New(store)
	if err = catalog.StartSession(ctx); err != nil {
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	provider, err := credentials.NewProvider(credentials.Options{Catalog: catalog})
	if err != nil {
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	metadata, err := store.ReadMetadata(ctx)
	if err != nil {
		_ = provider.Close()
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	engine, probe, engineVersion := options.Engine, options.Probe, options.EngineVersion
	var engineVersionForProtocol func(string) (string, error)
	var models modelRuntime
	if engine == nil || probe == nil {
		driver := enginechat.NewDriver()
		responses, e := engineresponses.NewDriver()
		if e != nil {
			cleanup := stopModelRuntimes(driver)
			_ = provider.Close()
			_ = store.Close()
			_ = h.Close()
			return nil, errors.Join(e, cleanup)
		}
		anthropic, e := engineanthropic.NewDriver()
		if e != nil {
			cleanup := stopModelRuntimes(driver, responses)
			_ = provider.Close()
			_ = store.Close()
			_ = h.Close()
			return nil, errors.Join(e, cleanup)
		}
		registry, e := enginecommon.NewRegistry(driver, responses, anthropic)
		if e != nil {
			cleanup := stopModelRuntimes(driver, responses, anthropic)
			_ = provider.Close()
			_ = store.Close()
			_ = h.Close()
			return nil, errors.Join(e, cleanup)
		}
		models = registry
		if probe == nil {
			probe = registry
		}
		if engine == nil {
			// Only this closure knows the verified Profile. Neither Run/CP input
			// nor the adapter can select another Profile or mutate credentials.
			resolve := func(c context.Context, ref string) ([]byte, api.CredentialStatus, error) {
				return provider.Resolve(c, metadata.ProfileID, ref)
			}
			production := enginecommon.NewEngine(registry, resolve)
			engine, models, engineVersion = production, production, enginecommon.EngineVersion
			engineVersionForProtocol = registry.EngineVersionForProtocol
		}
	}
	var memory *memorystore.Store
	closeModels := func() {
		if memory != nil {
			memory.StopAdmission()
			<-memory.Done()
		}
		if models != nil {
			_ = stopModelRuntimes(models)
		}
	}
	executions := executionstore.New(store, catalog, accessStore)
	effects := effectsstore.New(store, catalog, accessStore)
	executions.SetControl(effects)
	policy := usagestore.New(store, accessStore, options.ExecutionLimits, options.Budget)
	executions.SetTreeControl(policy)
	memory = memorystore.New(store, catalog, accessStore, policy)
	globalMemoryStore := globalmemorystore.New(store, memory, time.Now)
	memory.SetGlobalProposalReader(globalMemoryStore)
	globalMemory := globalapp.NewOwnerCommands(globalMemoryStore)
	globalTool := globalapp.NewToolProposer(globalMemoryStore)
	accessStore.SetMemory(memory)
	executions.SetMemory(memory)
	executions.SetMemoryUsage(memory)
	executions.SetContextAccess(accessContext)
	groupsStore := groupstore.New(store, executions, catalog, policy, accessStore)
	groupsStore.SetCanceler(effects)
	accessStore.SetGroups(groupsStore)
	executions.SetGroupPublisher(groupsStore)
	policy.SetTerminalCleanup(executions.ReleaseTerminalPinsInTx)
	effects.SetWaitPolicy(policy)
	collaborations := collabstore.New(store, catalog, executions, accessStore, policy)
	collaborations.SetContext(accessContext)
	collaborations.SetCanceler(effects)
	delegates := delegateapp.New(collaborations)
	messages := messagesapp.New(collaborations)

	noteWriter := options.NoteWriter
	if noteWriter == nil {
		noteWriter = writebridge.New(host, store)
	}
	tooling := brokerapp.New(effects, blobs, host, accessContext, noteWriter, brokerapp.Options{ApprovalLifetime: options.ApprovalLifetime, EngineVersion: engineVersion, EngineVersionForProtocol: engineVersionForProtocol})
	tooling.SetCollaboration(collabtools.New(delegates, messages, store))
	tooling.SetGlobalProposer(globalTool)
	tooling.SetAttempts(policy)
	tooling.SetWaitPublisher(effects)
	if inspector, ok := engine.(api.EngineCheckpointInspector); ok {
		tooling.SetCheckpointInspector(inspector)
	}
	recovery := recoverystore.New(store, executions, accessStore, accessContext, tooling)
	recovery.SetMemory(memory)
	executions.SetRecovery(recovery)
	effects.SetRecovery(recovery)
	if _, err = tooling.Collect(ctx); err != nil {
		closeModels()
		_ = provider.Close()
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	usage := options.Usage
	if usage == nil {
		usage = executions
		catalog.SetUsageReader(executions)
	}
	assistants, err := assistantapp.New(ctx, catalog, assistantapp.Options{Usage: usage, Probe: probe, Credentials: provider})
	if err != nil {
		closeModels()
		_ = provider.Close()
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	var executor *executorapp.Executor
	memories := memoryapp.New(memory, func() {
		if executor != nil {
			executor.Wake()
		}
	})
	conversation := directapp.New(executions, accessContext, func() {
		if executor != nil {
			executor.Wake()
		}
	})
	groups := groupapp.New(groupsStore, func() {
		if executor != nil {
			executor.Wake()
		}
	})
	conversation.SetGroups(groups, groupsStore)
	conversation.SetMemoryHistory(accessStore)
	executor, err = executorapp.New(ctx, executions, engine, accessContext, conversation, tooling)
	if err != nil {
		assistants.StopProbes()
		<-assistants.ProbeDone()
		closeModels()
		_ = provider.Close()
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	if err = recovery.InspectPending(ctx); err != nil {
		assistants.StopProbes()
		tooling.StopInspections()
		if models != nil {
			models.Stop()
		}
		executor.Stop()
		<-executor.Done()
		<-tooling.InspectionsDone()
		<-assistants.ProbeDone()
		closeModels()
		_ = provider.Close()
		_ = store.Close()
		_ = h.Close()
		return nil, err
	}
	groupsStore.SetControl(executor)
	collaborations.SetWake(executor.Wake)
	collaborations.SetCancel(executor.CancelRun)
	effects.SetCancelCallback(executor.CancelRun)
	eventsStore := eventsstore.New(store, accessStore)
	eventsStore.SetGlobalProposalReader(globalMemoryStore)
	purgeAPI := purgeapp.NewAPI(purgeapp.New(purgestore.New(store)))
	portableAPI := portableapp.NewService(store, portablefile.NewArtifactStore(h.Directory), portablesql.New(store))
	core := &Core{stopAdmission: func() { collaborations.StopAdmission(); recovery.StopAdmission() }, memory: memory, models: models, assistants: assistants, executions: executions, effects: effects, closed: make(chan struct{}), recovery: recovery, policy: policy, Portable: portableAPI, API: &api.Facade{Memory: memories, GlobalMemory: globalMemory, Recovery: recoveryapp.New(recovery, executor.Wake), Groups: groups, Effects: reconcileapp.New(effects, host, store), Collaboration: delegates, Messages: messages, Service: service, Host: host, Assistant: assistants, Grants: grants, Context: accessContext, Conversation: conversation, Events: eventsapp.New(eventsStore), Approvals: approvalsapp.New(effects, time.Now, executor.Wake, executor.CancelRun), Profile: purgeAPI}, store: store, profile: h, provider: provider, Credentials: credentials.NewRegistration(provider, catalog), executor: executor, tooling: tooling}
	purgeAPI.SetAfterDelete(func() { _ = core.RequestStop() })
	service.SetShutdownHook(core.RequestStop)
	if !options.ExecutorPaused {
		executor.Start()
	}
	return core, nil
}

// RequestStop synchronously closes process admission and requests cancellation.
// The single drain publishes the durable fence before releasing any resource.
// An accepted shutdown acknowledgment means stop was requested, not drained.
func (c *Core) RequestStop() error {
	c.once.Do(func() {
		c.memory.StopAdmission()
		c.stopAdmission()
		c.executions.StopAdmission()
		c.effects.StopAdmission()
		c.policy.StopAdmission()
		c.assistants.StopProbes()
		if c.models != nil {
			c.models.Stop()
		}
		if service, ok := c.API.Service.(interface{ MarkStopping() }); ok {
			service.MarkStopping()
		}
		c.tooling.StopInspections()
		c.executor.Stop()
		go c.drain()
	})
	return c.stopErr
}
func (c *Core) drain() {
	// A transient SQL failure cannot reopen this process's admission gates or
	// consume the sole shutdown attempt. Keep ownership while publishing Stop.
	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		err := c.recovery.Stop(ctx)
		cancel()
		if err == nil {
			break
		}
		time.Sleep(25 * time.Millisecond)
	}
	<-c.executor.Done()
	<-c.tooling.InspectionsDone()
	<-c.assistants.ProbeDone()
	<-c.memory.Done()
	// The trusted Engine may have returned while an actual HTTP producer is
	// still draining. Its original bound Settle continues to use this database.
	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		n, e := c.policy.PendingProducers(ctx)
		cancel()
		if e == nil && n == 0 {
			break
		}
		time.Sleep(25 * time.Millisecond)
	}
	if c.models != nil {
		<-c.models.Done()
	}
	gcCtx, gcCancel := context.WithTimeout(context.Background(), time.Second)
	_, _ = c.tooling.Collect(gcCtx)
	gcCancel()
	c.closeErr = c.stopErr
	if c.models != nil {
		if err := c.models.Close(); c.closeErr == nil {
			c.closeErr = err
		}
	}
	if err := c.provider.Close(); c.closeErr == nil {
		c.closeErr = err
	}
	if err := c.store.Close(); c.closeErr == nil {
		c.closeErr = err
	}
	if err := c.profile.Close(); c.closeErr == nil {
		c.closeErr = err
	}
	close(c.closed)
}

// Done signals actual cleanup, including producer drain and Profile unlock.
func (c *Core) Done() <-chan struct{} { return c.closed }
func (c *Core) WaitClosed(ctx context.Context) error {
	select {
	case <-c.closed:
		return c.closeErr
	case <-ctx.Done():
		return ctx.Err()
	}
}
func (c *Core) Close() error {
	_ = c.RequestStop()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if e := c.WaitClosed(ctx); e == context.DeadlineExceeded {
		return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "EXECUTOR_STOP_TIMEOUT"}
	} else {
		return e
	}
}
