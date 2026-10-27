package grants

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/access/grants"
)

// SelectInTx chooses actual, current user Grants for the exact recipient. It
// never adds recipients or operations to a Grant. An ancestor task restriction
// can survive only through a durable delegation edge recorded by DeriveChild.
func (s *Store) SelectInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ancestor string, ops []string) ([]string, error) {
	if len(in.Sources)+len(in.Scopes) == 0 {
		return []string{}, nil
	}
	maintenance, e := s.maintenanceGrantsInTx(ctx, tx, id, in, ops)
	if e != nil {
		return nil, e
	}
	rows, e := tx.QueryContext(ctx, "SELECT "+grantColumns+" FROM access_grants WHERE profile_id=? AND principal_id=? AND (session_id='' OR session_id=?) AND (task_id='' OR task_id=? OR task_id=? OR grant_id IN(SELECT grant_id FROM access_delegation_grants WHERE child_run_id=?)) ORDER BY grant_id", in.ProfileID, id.PrincipalID(), in.SessionID, in.TaskID, ancestor, ancestor)
	if e != nil {
		return nil, e
	}
	gs := []api.Grant{}
	for rows.Next() {
		stored, x := scanGrant(rows)
		if x != nil {
			rows.Close()
			return nil, x
		}
		g, x := stored.decode()
		if x != nil {
			rows.Close()
			return nil, x
		}
		gs = append(gs, g)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, e
	}
	seenGrants := map[string]bool{}
	for _, g := range gs {
		seenGrants[g.ID] = true
	}
	for key := range maintenance {
		if seenGrants[key] {
			continue
		}
		g, e := read(ctx, tx, in.ProfileID, id.PrincipalID(), key)
		if e != nil {
			return nil, e
		}
		gs = append(gs, g)
	}
	// Only a previously persisted mapping on the actual parent can carry a
	// task-bound Grant to the next hop. The parent was reauthorized by DeriveChild
	// in this transaction; this changes the request scope, never the stored Grant.
	inherited := map[string]bool{}
	if ancestor != "" {
		rows, e := tx.QueryContext(ctx, "SELECT grant_id FROM access_delegation_grants WHERE child_run_id=?", ancestor)
		if e != nil {
			return nil, e
		}
		for rows.Next() {
			var key string
			if e = rows.Scan(&key); e != nil {
				rows.Close()
				return nil, e
			}
			inherited[key] = true
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
	}
	for i, g := range gs {
		if maintenance[g.ID] {
			g.TaskID = in.TaskID
		}
		mapped, e := s.materializeGrantInTx(ctx, tx, id, in, g, false)
		if e != nil {
			return nil, e
		}
		if mapped.TaskID != "" && mapped.TaskID != in.TaskID && inherited[mapped.ID] {
			mapped.TaskID = ancestor
		}
		gs[i] = mapped
	}
	selected := []string{}
	seen := map[string]bool{}
	cover := func(workspace string, scopes []policy.ResourceScope) error {
		for _, op := range ops {
			found := false
			for _, g := range gs {
				requestTask := in.TaskID
				if ancestor != "" && g.TaskID == ancestor {
					requestTask = ancestor
				}
				p, x := grantPolicy(g, id.PrincipalID())
				if x != nil {
					return x
				}
				if policy.Authorize(p, policy.Request{PrincipalID: id.PrincipalID(), WorkspaceID: workspace, SessionID: in.SessionID, TaskID: requestTask, Operation: op, Recipient: policyRecipient(in.Recipient), Scopes: scopes}, s.now()) != "" {
					continue
				}
				found = true
				if !seen[g.ID] {
					seen[g.ID] = true
					selected = append(selected, g.ID)
				}
				break
			}
			if !found {
				return api.Denied("RECIPIENT_NOT_GRANTED")
			}
		}
		return nil
	}
	for _, source := range in.Sources {
		scopes := []policy.ResourceScope{{Kind: "source", ResourceID: source.ResourceID}}
		for _, p := range in.Scopes {
			if access.ScopeIncludes(p, source) {
				scopes = append(scopes, policy.ResourceScope{Kind: p.Kind, ResourceID: p.ResourceID})
			}
		}
		if e = cover(source.WorkspaceID, scopes); e != nil {
			return nil, e
		}
	}
	for _, scope := range in.Scopes {
		if e = cover(scope.WorkspaceID, []policy.ResourceScope{{Kind: scope.Kind, ResourceID: scope.ResourceID}}); e != nil {
			return nil, e
		}
	}
	if len(selected) > 64 {
		return nil, fault("RESOURCE_LIMIT", "CONTEXT_GRANTS_LIMIT")
	}
	return selected, nil
}

func (s *Store) DeriveChildInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, parent, child api.RunAccessInput) (api.RunAccessInput, error) {
	childCtx := ctx
	if previous, e := replyParentInTx(ctx, tx, id, child.ProfileID, child.TaskID); e != nil {
		return child, e
	} else if previous != "" {
		if previous != parent.TaskID {
			return child, api.Denied("PARENT_SCOPE_CHANGED")
		}
		ctx = context.WithValue(ctx, historicalTaskLineage{}, true)
	}
	if e := s.CheckInTx(ctx, tx, id, parent, []string{"read", "send", "delegate"}); e != nil {
		return child, e
	}
	group, e := groupaccess.DeriveBindingInTx(ctx, tx, id, parent, child)
	if e != nil {
		return child, e
	}
	child.Group = group
	child.ParentScope = &api.AccessScope{Sources: parent.Sources, Scopes: parent.Scopes, GrantIDs: parent.GrantIDs}
	if e := access.Validate(child); e != nil {
		return child, e
	}
	ids, e := s.SelectInTx(ctx, tx, id, child, parent.TaskID, []string{"read", "send"})
	if e != nil {
		return child, e
	}
	child.GrantIDs = ids
	for _, grantID := range ids {
		g, e := read(ctx, tx, child.ProfileID, id.PrincipalID(), grantID)
		if e != nil {
			return child, e
		}
		if g.TaskID != "" {
			if child.Recipient.SubjectKind != "temporary" {
				if _, e = tx.ExecContext(ctx, "INSERT INTO access_delegation_grants(child_run_id,grant_id,parent_task_id) VALUES(?,?,?)", child.TaskID, grantID, parent.TaskID); e != nil {
					return child, e
				}
			}
		}
		if child.Recipient.SubjectKind == "temporary" {
			if e = s.recordTemporaryGrantInTx(ctx, tx, id, child, g, parent.TaskID); e != nil {
				return child, e
			}
		}
	}
	return child, s.CheckInTx(childCtx, tx, id, child, []string{"read", "send"})
}

type lineageDepth struct{}

func (s *Store) delegatedInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string) (map[string]bool, error) {
	var parentID, scopeJSON string
	e := tx.QueryRowContext(ctx, "SELECT parent_run_id,parent_scope_json FROM execution_runs WHERE run_id=?", in.TaskID).Scan(&parentID, &scopeJSON)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	retryEdge := false
	if parentID == "" {
		parentID, e = replyParentInTx(ctx, tx, id, in.ProfileID, in.TaskID)
		if e != nil {
			return nil, e
		}
		retryEdge = parentID != ""
		if retryEdge {
			ctx = context.WithValue(ctx, historicalTaskLineage{}, true)
		}
	}
	if parentID == "" {
		return nil, nil
	}
	depth, _ := ctx.Value(lineageDepth{}).(int)
	if !retryEdge {
		if depth >= 3 {
			return nil, api.Denied("DELEGATION_DEPTH_LIMIT")
		}
		ctx = context.WithValue(ctx, lineageDepth{}, depth+1)
	}
	_, parent, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: in.ProfileID, ID: parentID})
	if e != nil {
		return nil, e
	}
	var bound api.AccessScope
	if json.Unmarshal([]byte(scopeJSON), &bound) != nil {
		return nil, fault("CONFLICT", "PARENT_SCOPE_INVALID")
	}
	if in.ParentScope == nil || !reflect.DeepEqual(in.ParentScope, &bound) {
		return nil, api.Denied("PARENT_SCOPE_CHANGED")
	}
	check := parent
	check.ParentScope = &api.AccessScope{Sources: parent.Sources, Scopes: parent.Scopes, GrantIDs: parent.GrantIDs}
	check.Sources = bound.Sources
	check.Scopes = bound.Scopes
	if !access.InParent(check) {
		return nil, api.Denied("PARENT_SCOPE_CHANGED")
	}
	parent.Sources = bound.Sources
	parent.Scopes = bound.Scopes
	parent.GrantIDs = bound.GrantIDs
	parentOps := []string{"read"}
	for _, op := range ops {
		if op != "read" {
			parentOps = []string{"read", "send", "delegate"}
			break
		}
	}
	// The durable tree has depth <=3. Each recursive call re-reads the next
	// ancestor's current Grants and recipient; no prior allow result is reused.
	if e = s.CheckInTx(ctx, tx, id, parent, parentOps); e != nil {
		return nil, e
	}
	rows, e := tx.QueryContext(ctx, "SELECT grant_id,parent_task_id FROM access_delegation_grants WHERE child_run_id=?", in.TaskID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	allowed := map[string]bool{}
	for rows.Next() {
		var grantID, task string
		if e = rows.Scan(&grantID, &task); e != nil {
			return nil, e
		}
		if task != parentID {
			return nil, api.Denied("PARENT_SCOPE_CHANGED")
		}
		allowed[grantID] = true
	}
	return allowed, rows.Err()
}
