package broker

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"io"
)

func (s *Service) SetCheckpointInspector(i api.EngineCheckpointInspector) { s.inspector = i }

// InspectRecovery opens and holds the original immutable Artifact without an
// execution claim. Compatibility is checked by the pure Engine port; no tool,
// approval dispatch or model call is available through this operation.
func (s *Service) InspectRecovery(ctx context.Context, q api.RecoveryInspection) error {
	s.inspectionMu.Lock()
	if s.inspectionStopping {
		s.inspectionMu.Unlock()
		return api.Denied("SERVICE_STOPPING")
	}
	s.inspectionWG.Add(1)
	s.inspectionMu.Unlock()
	defer s.inspectionWG.Done()
	p := q.Position
	if p.Phase == "application" && p.CompletedResult != nil {
		return nil
	}
	if p.Phase != "continuation" && p.Phase != "resume" {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_MISSING")
	}
	if p.Continuation == nil || p.Phase == "resume" && p.Decision == nil {
		return fault("RECOVERY_BLOCKED", "RECOVERY_POSITION_INVALID")
	}
	a := p.Continuation.Checkpoint
	expected, e := s.metadataForAgent(q.Config.Agent)
	if e != nil {
		if unavailableCheckpointIdentity(e) {
			return fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
		}
		return e
	}
	if a.RunID != q.Run.ID || a.Metadata != expected {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
	}
	references, ok := s.repo.(interface {
		InspectCheckpointReference(context.Context, api.RecoveryInspection) error
	})
	if !ok {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_INSPECTION_NOT_ASSEMBLED")
	}
	if e := references.InspectCheckpointReference(ctx, q); e != nil {
		return e
	}
	if p.Phase == "continuation" && p.Continuation.Kind == "" && p.Continuation.Decision == "approved" {
		loader, ok := s.repo.(interface {
			ReadInspectionEffect(context.Context, api.RecoveryInspection) (Effect, error)
		})
		if !ok {
			return fault("RECOVERY_BLOCKED", "CHECKPOINT_INSPECTION_NOT_ASSEMBLED")
		}
		effect, e := loader.ReadInspectionEffect(ctx, q)
		if e != nil {
			return e
		}
		switch effect.State {
		case "committed", "reconciled", "failed_no_effect", "rejected":
		case "awaiting_approval":
			current, e := s.host.CurrentLease(ctx)
			if e != nil {
				return e
			}
			if s.target == nil || !sameLease(effect.Lease, current) || !hasCapability(current) || effect.Preview.Tool != Descriptor {
				return fault("RECOVERY_BLOCKED", "TOOL_CAPABILITY_CHANGED")
			}
			if e = s.target.Check(ctx, effect.Preview, current); e != nil {
				return e
			}
		default:
			return fault("RECOVERY_BLOCKED", "EFFECT_RECONCILIATION_REQUIRED")
		}
	}
	reader, e := s.blobs.Open(ctx, a)
	if e != nil {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_INVALID")
	}
	defer reader.Close()
	if s.inspector == nil {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_INSPECTION_NOT_ASSEMBLED")
	}
	if e = s.inspector.InspectCheckpoint(ctx, api.CheckpointInspection{Run: q.Run, Intent: q.Intent, Config: q.Config, Position: p, Checkpoint: a, Reader: reader, Memory: q.Memory, ShortTerm: q.ShortTerm}); e != nil {
		return e
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	// The immutable blob is already digest-verified by Open. Finish the complete
	// stream while its hold is still live, even if the semantic reader stopped early.
	if _, e = io.Copy(io.Discard, reader); e != nil {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_INVALID")
	}
	return reader.Close()
}

var _ api.RecoveryInspector = (*Service)(nil)

func (s *Service) StopInspections() {
	s.inspectionStopOnce.Do(func() {
		s.inspectionMu.Lock()
		s.inspectionStopping = true
		s.inspectionMu.Unlock()
		go func() { s.inspectionWG.Wait(); close(s.inspectionDone) }()
	})
}
func (s *Service) InspectionsDone() <-chan struct{} { return s.inspectionDone }
