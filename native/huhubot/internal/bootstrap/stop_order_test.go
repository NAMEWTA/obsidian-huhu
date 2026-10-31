package bootstrap

import (
	"go/ast"
	"go/parser"
	"go/token"
	"testing"
)

// models.Stop cancels in-flight model calls and every StopAdmission fails new
// dispatches. A worker whose Engine returns because of either must already see
// Executor cancellation; otherwise it finalizes a shutdown interruption as a
// terminal run failure and restart recovery never sees the run.
func TestRequestStopCancelsExecutorBeforeClosingItsDependencies(t *testing.T) {
	file, err := parser.ParseFile(token.NewFileSet(), "core.go", nil, 0)
	if err != nil {
		t.Fatal(err)
	}
	var calls []string
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Name.Name != "RequestStop" || fn.Recv == nil {
			continue
		}
		ast.Inspect(fn.Body, func(n ast.Node) bool {
			call, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}
			if sel, ok := call.Fun.(*ast.SelectorExpr); ok {
				if owner, ok := sel.X.(*ast.SelectorExpr); ok {
					calls = append(calls, owner.Sel.Name+"."+sel.Sel.Name)
				} else if c, ok := sel.X.(*ast.Ident); ok && c.Name == "c" {
					calls = append(calls, sel.Sel.Name)
				}
			}
			return true
		})
	}
	executor, gates := -1, 0
	for i, call := range calls {
		switch call {
		case "executor.Stop":
			if executor < 0 {
				executor = i
			}
		case "memory.StopAdmission", "stopAdmission", "executions.StopAdmission", "effects.StopAdmission", "policy.StopAdmission", "assistants.StopProbes", "models.Stop", "tooling.StopInspections":
			gates++
			if executor < 0 {
				t.Fatalf("%s runs before executor.Stop in RequestStop: %v", call, calls)
			}
		}
	}
	if executor < 0 || gates != 8 {
		t.Fatalf("RequestStop shape changed (executor at %d, %d gates): %v", executor, gates, calls)
	}
}
