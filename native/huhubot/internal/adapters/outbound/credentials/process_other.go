//go:build !linux && !darwin

package credentials

import "os/exec"

func configureWorkerProcess(cmd *exec.Cmd) {}
