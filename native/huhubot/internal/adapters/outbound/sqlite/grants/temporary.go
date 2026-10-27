package grants

import (
	"context"
	"database/sql"
	"encoding/json"
	"reflect"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type temporaryProof struct {
	snapshot api.TaskConfigSnapshot
	hash     string
}

func taskDraft(s api.TaskConfigSnapshot) api.TaskConfigDraft {
	a := s.Agent
	d := api.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: a.AllowedCollaborationTargets}
	if a.Model != nil {
		m := a.Model.ModelBindingDraft
		d.Model = &m
	}
	return api.TaskConfigDraft{SponsorAgentID: s.SponsorAgentID, Draft: d}
}

// temporaryInTx derives its proof exclusively from the immutable DB snapshot
// and actual parent. A wire/model supplied recipient or hash cannot create it.
func temporaryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput) (temporaryProof, error) {
	var proof temporaryProof
	var body, parent, subject, profile, principal string
	e := tx.QueryRowContext(ctx, "SELECT c.config_json,r.parent_run_id,r.agent_id,c.profile_id,c.principal_id FROM execution_runs r JOIN task_config_snapshots c ON c.snapshot_id=r.task_config_id AND c.subject_id=r.agent_id WHERE r.run_id=?", in.TaskID).Scan(&body, &parent, &subject, &profile, &principal)
	if e != nil {
		return proof, e
	}
	if profile != in.ProfileID || principal != id.PrincipalID() || json.Unmarshal([]byte(body), &proof.snapshot) != nil || proof.snapshot.Kind != "temporary" || proof.snapshot.SubjectID != subject || proof.snapshot.Agent.ID != subject || proof.snapshot.Agent.Model == nil {
		return proof, api.Denied("TEMPORARY_CONFIG_INVALID")
	}
	if parent == "" {
		parent, e = replyParentInTx(ctx, tx, id, in.ProfileID, in.TaskID)
		if e != nil {
			return proof, e
		}
		if parent == "" {
			return proof, api.Denied("TEMPORARY_SPONSOR_MISMATCH")
		}
	}
	var parentAgent, parentConfig sql.NullString
	if e = tx.QueryRowContext(ctx, "SELECT r.agent_id,c.config_json FROM execution_runs r LEFT JOIN task_config_snapshots c ON c.snapshot_id=r.task_config_id WHERE r.run_id=?", parent).Scan(&parentAgent, &parentConfig); e != nil {
		return proof, e
	}
	sponsor := parentAgent.String
	if parentConfig.Valid {
		var p api.TaskConfigSnapshot
		if json.Unmarshal([]byte(parentConfig.String), &p) != nil {
			return proof, fault("CONFLICT", "PARENT_CONFIG_INVALID")
		}
		if p.Kind == "temporary" {
			sponsor = p.SponsorAgentID
		}
	}
	if proof.snapshot.SponsorAgentID != sponsor {
		return proof, api.Denied("TEMPORARY_SPONSOR_MISMATCH")
	}
	proof.hash = api.CanonicalTaskConfigHash(taskDraft(proof.snapshot))
	m := proof.snapshot.Agent.Model
	expected := api.GrantRecipient{AgentID: subject, ModelBindingRevision: "1", ProviderID: m.ProviderID, ModelID: m.ModelID, Protocol: m.Protocol, Endpoint: m.Endpoint, SubjectKind: "temporary", SponsorAgentID: sponsor, ConfigurationHash: proof.hash}
	if !reflect.DeepEqual(expected, in.Recipient) {
		return proof, api.Denied("TEMPORARY_CONFIG_CHANGED")
	}
	return proof, nil
}

func (s *Store) materializeGrantInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, g api.Grant, required bool) (api.Grant, error) {
	if in.Recipient.SubjectKind != "temporary" {
		return g, nil
	}
	p, e := temporaryInTx(ctx, tx, id, in)
	if e != nil {
		return g, e
	}
	if required {
		var hash, snapshot, recipient string
		if e = tx.QueryRowContext(ctx, "SELECT configuration_hash,snapshot_id,recipient_json FROM access_delegation_grants WHERE child_run_id=? AND grant_id=?", in.TaskID, g.ID).Scan(&hash, &snapshot, &recipient); e != nil {
			return g, api.Denied("TEMPORARY_MAPPING_MISSING")
		}
		var template api.GrantRecipient
		if hash != p.hash || snapshot != p.snapshot.ID || json.Unmarshal([]byte(recipient), &template) != nil {
			return g, api.Denied("TEMPORARY_MAPPING_CHANGED")
		}
		found := false
		for _, r := range g.Recipients {
			if reflect.DeepEqual(r, template) {
				found = true
			}
		}
		if !found {
			return g, api.Denied("TEMPORARY_MAPPING_CHANGED")
		}
	}
	recipients := []api.GrantRecipient{}
	for _, r := range g.Recipients {
		expected := in.Recipient
		expected.AgentID = p.snapshot.SponsorAgentID
		if !reflect.DeepEqual(r, expected) {
			continue
		}
		r.AgentID = in.Recipient.AgentID
		recipients = append(recipients, r)
	}
	g.Recipients = recipients
	return g, nil
}

func (s *Store) recordTemporaryGrantInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, g api.Grant, parent string) error {
	p, e := temporaryInTx(ctx, tx, id, in)
	if e != nil {
		return e
	}
	template := in.Recipient
	template.AgentID = p.snapshot.SponsorAgentID
	found := false
	for _, r := range g.Recipients {
		if reflect.DeepEqual(r, template) {
			found = true
		}
	}
	if !found {
		return api.Denied("TEMPORARY_RECIPIENT_NOT_GRANTED")
	}
	body, _ := json.Marshal(template)
	_, e = tx.ExecContext(ctx, "INSERT INTO access_delegation_grants(child_run_id,grant_id,parent_task_id,recipient_json,configuration_hash,snapshot_id) VALUES(?,?,?,?,?,?)", in.TaskID, g.ID, parent, string(body), p.hash, p.snapshot.ID)
	return e
}
