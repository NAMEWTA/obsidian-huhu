//go:build !linux && !darwin && !windows

package credentials

import "os/exec"

func configureWorkerProcess(cmd *exec.Cmd) func() func() {
	return func() func() { return func() {} }
}
