//go:build windows

package credentials

import (
	"errors"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// winJob is filled only after Start. Cancel can run before AssignProcessToJobObject.
type winJob struct {
	mu  sync.Mutex
	job windows.Handle
}

func (j *winJob) terminate() {
	j.mu.Lock()
	defer j.mu.Unlock()
	if j.job != 0 {
		_ = windows.TerminateJobObject(j.job, 1)
	}
}

func (j *winJob) close() {
	j.mu.Lock()
	handle := j.job
	j.job = 0
	j.mu.Unlock()
	if handle != 0 {
		_ = windows.CloseHandle(handle)
	}
}

// configureWorkerProcess detaches the worker from the parent console and, when
// the runner allows it, places the process in a job that dies with the handle.
// A nested job is often rejected on a GitHub-hosted runner. That failure falls
// back to Process.Kill and does not fail the credential operation.
func configureWorkerProcess(cmd *exec.Cmd) func() func() {
	box := &winJob{}
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: windows.DETACHED_PROCESS | windows.CREATE_NEW_PROCESS_GROUP,
		HideWindow:    true,
	}
	cmd.Cancel = func() error {
		if cmd.Process == nil {
			return os.ErrProcessDone
		}
		box.terminate()
		err := cmd.Process.Kill()
		if err == nil || errors.Is(err, os.ErrProcessDone) {
			return err
		}
		// TerminateJobObject already ran when the job exists. A second
		// TerminateProcess can fail once Windows has torn the process down.
		box.mu.Lock()
		assigned := box.job != 0
		box.mu.Unlock()
		if assigned {
			return nil
		}
		return err
	}
	return func() func() {
		job, err := windows.CreateJobObject(nil, nil)
		if err != nil {
			return func() {}
		}
		info := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{}
		info.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
		if _, err = windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation, uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info))); err != nil {
			_ = windows.CloseHandle(job)
			return func() {}
		}
		process, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(cmd.Process.Pid))
		if err != nil {
			_ = windows.CloseHandle(job)
			return func() {}
		}
		assignErr := windows.AssignProcessToJobObject(job, process)
		_ = windows.CloseHandle(process)
		if assignErr != nil {
			_ = windows.CloseHandle(job)
			return func() {}
		}
		box.mu.Lock()
		box.job = job
		box.mu.Unlock()
		return box.close
	}
}
