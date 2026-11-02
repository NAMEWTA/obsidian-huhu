// Package guard serializes managed artifact publication with destructive data
// operations. Durable SQLite admission fences remain the recovery authority.
package guard

import "context"

type Gate struct{ token chan struct{} }

func New() *Gate { return &Gate{token: make(chan struct{}, 1)} }
func (g *Gate) Run(ctx context.Context, fn func(context.Context) error) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case g.token <- struct{}{}:
	}
	defer func() { <-g.token }()
	if err := ctx.Err(); err != nil {
		return err
	}
	return fn(ctx)
}
