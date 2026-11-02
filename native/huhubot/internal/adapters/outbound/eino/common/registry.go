package common

import (
	"context"
	"errors"
	"reflect"
	"sync"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type registeredDriver struct {
	identity ProtocolIdentity
	driver   ProtocolDriver
}

// Registry is immutable after construction. A successful constructor transfers
// lifecycle ownership; on error the caller still owns and must drain drivers.
type Registry struct {
	byProtocol map[string]registeredDriver
	ordered    []registeredDriver
	mu         sync.Mutex
	stopping   bool
	wg         sync.WaitGroup
	done       chan struct{}
}

func NewRegistry(drivers ...ProtocolDriver) (*Registry, error) {
	if len(drivers) == 0 {
		return nil, Fault("MODEL_REGISTRY_INVALID")
	}
	r := &Registry{byProtocol: map[string]registeredDriver{}, done: make(chan struct{})}
	for _, d := range drivers {
		if d == nil {
			return nil, Fault("MODEL_REGISTRY_INVALID")
		}
		v := reflect.ValueOf(d)
		switch v.Kind() {
		case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
			if v.IsNil() {
				return nil, Fault("MODEL_REGISTRY_INVALID")
			}
		}
		id := d.Identity()
		valid := id == (ProtocolIdentity{Protocol: ChatProtocol, EngineVersion: EngineVersion}) || id == (ProtocolIdentity{Protocol: ResponsesProtocol, EngineVersion: ResponsesEngineVersion, StateFormat: ResponsesStateFormat}) || id == (ProtocolIdentity{Protocol: AnthropicProtocol, EngineVersion: AnthropicEngineVersion, StateFormat: AnthropicStateFormat})
		if !valid || r.byProtocol[id.Protocol].driver != nil {
			return nil, Fault("MODEL_REGISTRY_INVALID")
		}
		entry := registeredDriver{identity: id, driver: d}
		r.byProtocol[id.Protocol] = entry
		r.ordered = append(r.ordered, entry)
	}
	return r, nil
}

func (r *Registry) driverFor(protocol string) (registeredDriver, error) {
	if r == nil {
		return registeredDriver{}, Fault("ADAPTER_NOT_ASSEMBLED")
	}
	d, ok := r.byProtocol[protocol]
	if !ok {
		return registeredDriver{}, Fault("ADAPTER_NOT_ASSEMBLED")
	}
	return d, nil
}
func (r *Registry) Identity(protocol string) (ProtocolIdentity, error) {
	d, err := r.driverFor(protocol)
	return d.identity, err
}
func (r *Registry) EngineVersionForProtocol(protocol string) (string, error) {
	id, err := r.Identity(protocol)
	return id.EngineVersion, err
}
func (r *Registry) SupportsProtocol(protocol string) bool {
	_, err := r.driverFor(protocol)
	return err == nil
}
func (r *Registry) Probe(ctx context.Context, model api.ModelBindingDraft, secret []byte) ([]string, error) {
	r.mu.Lock()
	if r.stopping {
		r.mu.Unlock()
		return nil, api.Denied("SERVICE_STOPPING")
	}
	r.wg.Add(1)
	r.mu.Unlock()
	defer r.wg.Done()
	d, err := r.driverFor(model.Protocol)
	if err != nil {
		return nil, err
	}
	return d.driver.Probe(ctx, model, secret)
}
func (r *Registry) Stop() {
	r.mu.Lock()
	if r.stopping {
		r.mu.Unlock()
		return
	}
	r.stopping = true
	r.mu.Unlock()
	for _, d := range r.ordered {
		d.driver.Stop()
	}
	go func() {
		r.wg.Wait()
		for _, d := range r.ordered {
			<-d.driver.Done()
		}
		close(r.done)
	}()
}
func (r *Registry) Done() <-chan struct{} { return r.done }
func (r *Registry) Close() error {
	select {
	case <-r.done:
	default:
		return Fault("MODEL_PRODUCER_NOT_ENDED")
	}
	var errs []error
	for _, d := range r.ordered {
		if err := d.driver.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}
