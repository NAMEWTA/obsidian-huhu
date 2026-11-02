//go:build windows

package stdio

import (
	"context"
	"golang.org/x/sys/windows"
	"io"
	"os"
	"runtime"
	"sync"
	"time"
)

var cancelSynchronousIO = windows.NewLazySystemDLL("kernel32.dll").NewProc("CancelSynchronousIo")

type windowsOutput struct {
	handle windows.Handle
	once   sync.Once
	mu     sync.Mutex
	closed bool
}

func prepareOutput(output io.WriteCloser) (io.WriteCloser, error) {
	file, ok := output.(*os.File)
	if !ok {
		return output, nil
	}
	kind, e := windows.GetFileType(windows.Handle(file.Fd()))
	if e != nil {
		return nil, e
	}
	if kind != windows.FILE_TYPE_PIPE {
		return output, nil
	}
	var duplicate windows.Handle
	if e = windows.DuplicateHandle(windows.CurrentProcess(), windows.Handle(file.Fd()), windows.CurrentProcess(), &duplicate, 0, false, windows.DUPLICATE_SAME_ACCESS); e != nil {
		return nil, e
	}
	return &windowsOutput{handle: duplicate}, nil
}
func (w *windowsOutput) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	var e error
	w.once.Do(func() { w.closed = true; e = windows.CloseHandle(w.handle) })
	return e
}
func (w *windowsOutput) Write(p []byte) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), WriteTimeout)
	defer cancel()
	return w.WriteContext(ctx, p)
}
func (w *windowsOutput) WriteContext(ctx context.Context, p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.closed {
		return 0, os.ErrClosed
	}
	if e := ctx.Err(); e != nil {
		return 0, e
	}
	type result struct {
		n int
		e error
	}
	ready := make(chan windows.Handle, 1)
	done := make(chan result, 1)
	acknowledged := make(chan struct{})
	defer close(acknowledged)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		thread, e := windows.OpenThread(windows.THREAD_TERMINATE, false, windows.GetCurrentThreadId())
		if e != nil {
			ready <- 0
			done <- result{e: e}
			<-acknowledged
			return
		}
		ready <- thread
		var n uint32
		e = windows.WriteFile(w.handle, p, &n, nil)
		done <- result{int(n), e}
		<-acknowledged
		// The controller closes the real thread handle only after Write has stopped.
	}()
	thread := <-ready
	defer windows.CloseHandle(thread)
	select {
	case r := <-done:
		return r.n, r.e
	case <-ctx.Done():
	}
	// Cancellation can race the entry into synchronous WriteFile. Retry until the
	// OS operation has actually stopped; never release a permit over a live write.
	hardStop := time.NewTimer(time.Second)
	defer hardStop.Stop()
	ticker := time.NewTicker(time.Millisecond)
	defer ticker.Stop()
	for {
		if thread != 0 {
			_, _, _ = cancelSynchronousIO.Call(uintptr(thread))
		}
		select {
		case r := <-done:
			return r.n, ctx.Err()
		case <-ticker.C:
		case <-hardStop.C:
			// A synchronous operation which the OS refuses to stop cannot safely outlive
			// its delivery permit. Fail-stop this dedicated Runner rather than release
			// authorization over a live write or keep revocation blocked indefinitely.
			os.Exit(1)
		}
	}
}
